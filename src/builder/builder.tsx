import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router";
import { supabase } from "../env/supabase.client";
import { Icon, Menu, Play, Eye, Smartphone, Monitor, LayoutGrid, FilePlus2, SquarePlus, LibraryBig, Database, Users, Settings, CirclePlus, Trash, Palette, WandSparkles, Undo, Redo } from 'lucide-react';
import { layoutGridMoveVertical } from '@lucide/lab';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import "./builder.css";
import { useStore } from './stores/elements';
import { debounce } from 'lodash';

interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
}

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null); // iframe 참조

    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const historyIndex = useStore((state) => state.historyIndex);
    const history = useStore((state) => state.history);
    const { setElements, addElement, setSelectedElement, updateElementProps, undo, redo, loadPageElements } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
    const lastSentElementId = useRef<string | null>(null);
    const [iconProps] = React.useState({ color: "#171717", stroke: 1.5, size: 21 });

    // 진행 중 여부를 추적하는 플래그
    let isProcessing = false;

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from("pages")
                .select("*")
                .eq("project_id", projectId)
                .order('order_num', { ascending: true });
            if (error) {
                console.error("프로젝트 조회 에러:", error);
            } else {
                setPages(data);
            }
        };
        if (projectId) fetchProjects();
    }, [projectId]);

    const fetchElements = useCallback(async (pageId: string) => {
        window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
        setSelectedPageId(pageId);
        setSelectedElement(null);
        const { data, error } = await supabase
            .from("elements")
            .select("*")
            .eq("page_id", pageId)
            .order('order_num', { ascending: true });
        if (error) console.error("요소 조회 에러:", error);
        else {
            loadPageElements(data);
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: data || [] },
                    window.location.origin
                );
            }
        }
    }, [setSelectedPageId, setSelectedElement, loadPageElements]);

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            fetchElements(pages[0].id);
        }
    }, [pages, selectedPageId, fetchElements]);

    const sendElementSelectedMessage = (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument) {
            const element = iframe.contentDocument.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
            if (element) {
                const selectedElement = elements.find((el) => el.id === elementId);
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                const adjustedRect = {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: parseFloat(computedStyle.width) || rect.width,
                    height: parseFloat(computedStyle.height) || rect.height,
                };
                const message = {
                    type: "ELEMENT_SELECTED",
                    elementId,
                    payload: { rect: adjustedRect, tag: selectedElement?.tag || "Unknown", props },
                    source: "builder",
                };
                if (lastSentElementId.current !== elementId) {
                    window.postMessage(message, window.location.origin);
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage(message, window.location.origin);
                    } else {
                        console.warn("iframe contentWindow not available for element selection:", elementId);
                    }
                    lastSentElementId.current = elementId;
                }
            } else {
                console.warn("Element not found in iframe for ID:", elementId);
            }
        }
    };

    const handleAddElement = async (...args: [string, string]) => {
        if (!selectedPageId) {
            alert("먼저 페이지를 선택하세요.");
            return;
        }

        // Get max order_num from existing elements
        const maxOrderNum = elements.reduce((max, el) =>
            Math.max(max, el.order_num || 0), 0);

        const newElement = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: args[0],
            props: { ...(args[1] ? { text: args[1] } : {}), style: {} },
            parent_id: selectedElementId || null,
            order_num: maxOrderNum + 1, // Add order_num to new elements
        };

        const { data, error } = await supabase
            .from("elements")
            .insert([newElement])
            .select();
        if (error) console.error("요소 추가 에러:", error);
        else if (data) {
            addElement(data[0]);
            requestAnimationFrame(() => {
                setSelectedElement(data[0].id, data[0].props);
                sendElementSelectedMessage(data[0].id, data[0].props);
            });
        }
    };

    const handleUndo = debounce(async () => {
        if (isProcessing) return; // 진행 중이면 실행 중단
        isProcessing = true;

        try {
            // 1. Zustand 상태 변경
            undo();
            await new Promise((resolve) => setTimeout(resolve, 0)); // 상태 반영 대기
            const updatedElements = useStore.getState().elements;

            // 2. Supabase에 업데이트
            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

            // 3. iframe에 메시지 전송
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            } else {
                console.warn("iframe contentWindow not available during undo");
            }
        } catch (error) {
            console.error("Undo error:", error);
        } finally {
            isProcessing = false; // 작업 완료 후 플래그 해제
        }
    }, 300); // 300ms 디바운싱

    const handleRedo = debounce(async () => {
        if (isProcessing) return; // 진행 중이면 실행 중단
        isProcessing = true;

        try {
            // 1. Zustand 상태 변경
            redo();
            await new Promise((resolve) => setTimeout(resolve, 0)); // 상태 반영 대기
            const updatedElements = useStore.getState().elements;

            // 2. Supabase에 업데이트
            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

            // 3. iframe에 메시지 전송
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            } else {
                console.warn("iframe contentWindow not available during redo");
            }
        } catch (error) {
            console.error("Redo error:", error);
        } finally {
            isProcessing = false; // 작업 완료 후 플래그 해제
        }
    }, 300); // 300ms 디바운싱

    const renderTree = <T extends { id: string; parent_id?: string | null; order_num?: number }>(
        items: T[],
        getLabel: (item: T) => string,
        onClick: (item: T) => void,
        onDelete: (item: T) => Promise<void>,
        parentId: string | null = null
    ): React.ReactNode => {
        const filteredItems = items
            .filter((item) => item.parent_id === parentId || (parentId === null && item.parent_id === undefined))
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        if (filteredItems.length === 0) return null;
        return (
            <>
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(item);
                        }}
                        className="element"
                        style={{
                            background: selectedElementId === item.id || selectedPageId === item.id ? "var(--color-gray-200)" : undefined,
                        }}
                    >
                        <div className="elementItem">
                            <span>{getLabel(item)}</span>
                            <button
                                className="iconButton"
                                aria-label={`Delete ${getLabel(item)}`}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    await onDelete(item);
                                }}
                            >
                                <Trash color={'var(--color-gray-500)'} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                        </div>
                        {renderTree(items, getLabel, onClick, onDelete, item.id)}
                    </div>
                ))}
            </>
        );
    };

    useEffect(() => {
        const iframe = iframeRef.current;
        const sendUpdateElements = () => {
            if (!iframe) {
                console.warn("iframe not found");
                return;
            }
            if (!iframe.contentWindow) {
                console.warn("iframe contentWindow not accessible");
                return;
            }
            if (elements.length > 0) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements },
                    window.location.origin
                );
            }
        };

        if (iframe?.contentDocument?.readyState === "complete") {
            sendUpdateElements();
        } else {
            iframe?.addEventListener("load", sendUpdateElements);
            return () => iframe?.removeEventListener("load", sendUpdateElements);
        }
    }, [elements]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                console.warn("Received message from untrusted origin:", event.origin);
                return;
            }
            if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
                setSelectedElement(event.data.elementId, event.data.payload?.props);
            }
            if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
                updateElementProps(event.data.elementId, event.data.payload.props);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [setSelectedElement, updateElementProps]);

    const handleAddPage = async () => {
        const title = prompt("Enter page title:");
        const slug = prompt("Enter page slug:");
        if (!title || !slug) {
            alert("Title and slug are required.");
            return;
        }

        // 현재 페이지들의 order_num 값을 정렬하여 가져옴
        const sortedPages = [...pages].sort((a, b) =>
            (a.order_num || 0) - (b.order_num || 0)
        );

        // 새 페이지의 order_num 계산
        let newOrderNum;
        if (sortedPages.length === 0) {
            newOrderNum = 1000; // 첫 페이지
        } else {
            const lastPage = sortedPages[sortedPages.length - 1];
            newOrderNum = (lastPage.order_num || 0) + 1000; // 간격을 1000으로 설정
        }

        const newPage = {
            title,
            project_id: projectId,
            slug,
            order_num: newOrderNum
        };

        const { data, error } = await supabase
            .from("pages")
            .insert([newPage])
            .select();

        if (error) console.error("페이지 생성 에러:", error);
        else if (data) setPages((prevPages) => [...prevPages, ...data]);
    };

    return (
        <div className="app">
            <div className="contents">
                <main>
                    <div className="bg">
                        <div className="workspace">
                            <iframe
                                ref={iframeRef}
                                id="previewFrame"
                                src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                                style={{ width: "100%", height: "100%", border: "none" }}
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                onLoad={() => {
                                    const iframe = iframeRef.current;
                                    if (iframe?.contentWindow && elements.length > 0) {
                                        iframe.contentWindow.postMessage(
                                            { type: "UPDATE_ELEMENTS", elements },
                                            window.location.origin
                                        );
                                    } else {
                                        console.warn("iframe contentWindow not available on load");
                                    }
                                }}
                            />
                            <SelectionOverlay />
                        </div>
                    </div>
                </main>
                <aside className="sidebar">
                    <div className="sidebar_nav">
                        <div className="sidebar_group">
                            <button aria-label="Layout Grid"><LayoutGrid color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Add File"><FilePlus2 color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Add Square"><SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Move Grid"><Icon iconNode={layoutGridMoveVertical} color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Library"><LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Database"><Database color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Palette"><Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Magic Wand"><WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        </div>
                        <div className="sidebar_group">
                            <button aria-label="Users"><Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button aria-label="Settings"><Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        </div>
                    </div>
                    <div className="sidebar_content">
                        <div className="sidebar_pages">
                            <h3>Pages</h3>
                            <button
                                className="iconButton absolute right-0 top-0"
                                aria-label="Add Page"
                                onClick={handleAddPage}
                            >
                                <CirclePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <div className="elements">
                                {pages.length === 0 ? (
                                    <p className="no_element">No pages available</p>
                                ) : (
                                    renderTree(
                                        pages,
                                        (page) => page.title,
                                        (page) => fetchElements(page.id),
                                        async (page) => {
                                            const { error } = await supabase.from("pages").delete().eq("id", page.id);
                                            if (error) console.error("페이지 삭제 에러:", error);
                                            else setPages((prev) => prev.filter((p) => p.id !== page.id));
                                        }
                                    )
                                )}
                            </div>
                        </div>
                        <div className="sidebar_elements">
                            <h3>Elements</h3>
                            <div className="elements">
                                {elements.length === 0 ? (
                                    <p className="no_element">No element available</p>
                                ) : (
                                    renderTree(
                                        elements,
                                        (el) => el.tag,
                                        (el) => {
                                            setSelectedElement(el.id, el.props);
                                            requestAnimationFrame(() => sendElementSelectedMessage(el.id, el.props));
                                        },
                                        async (el) => {
                                            const { error } = await supabase.from("elements").delete().eq("id", el.id);
                                            if (error) console.error("요소 삭제 에러:", error);
                                            else {
                                                if (el.id === selectedElementId) {
                                                    setSelectedElement(null);
                                                    window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
                                                }
                                                setElements(elements.filter((e) => e.id !== el.id));
                                            }
                                        }
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="sidebar_components">
                        <button aria-label="Add Div" onClick={() => handleAddElement("div", "")}>+ DIV</button>
                        <button aria-label="Add Section" onClick={() => handleAddElement("section", "")}>+ SECTION</button>
                        <button aria-label="Add Button" onClick={() => handleAddElement("button", "btn")}>+ BUTTON</button>
                        <button aria-label="Add Table" onClick={() => handleAddElement("table", "")}>+ TABLE</button>

                    </div>
                </aside>
                <aside className="inspector"><Inspector /></aside>

                <nav className="header ">
                    <div className="header_contents header_left">
                        <button aria-label="Menu"><Menu color={'#fff'} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen">
                        <span>{historyIndex + 1}/{history.length}</span>
                        <button aria-label="Screen Width 767">767</button>
                        <button aria-label="Mobile View"><Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Desktop View"><Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button
                            aria-label="Undo"
                            onClick={handleUndo}
                            disabled={historyIndex < 0}
                            className={historyIndex < 0 ? "disabled" : ""}
                        >
                            <Undo color={historyIndex < 0 ? "#999" : iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        <button
                            aria-label="Redo"
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className={historyIndex >= history.length - 1 ? "disabled" : ""}
                        >
                            <Redo color={historyIndex >= history.length - 1 ? "#999" : iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        <button aria-label="Preview"><Eye color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Play"><Play color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Publish" className="publish">Publish</button>
                    </div>
                </nav>

                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;