import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router";
import { supabase } from "../env/supabase.client";
import { Menu, Eye, Smartphone, Monitor, Undo, Redo, Play } from 'lucide-react';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import Sidebar from "./sidebar";
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
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const { addElement, setSelectedElement, updateElementProps, undo, redo, loadPageElements } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
    const [iconProps] = React.useState({ color: "#171717", stroke: 1, size: 21 });

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
            loadPageElements(data, pageId);
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

    const handleAddElement = async (...args: [string, string]) => {
        if (!selectedPageId) {
            alert("먼저 페이지를 선택하세요.");
            return;
        }

        const maxOrderNum = elements.reduce((max, el) =>
            Math.max(max, el.order_num || 0), 0);

        const newElement = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: args[0],
            props: { ...(args[1] ? { text: args[1] } : {}), style: {} },
            parent_id: selectedElementId || null,
            order_num: maxOrderNum + 1,
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
            });
        }
    };

    const handleUndo = debounce(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            undo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error("Undo error:", error);
        } finally {
            isProcessing = false;
        }
    }, 300);

    const handleRedo = debounce(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            redo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error("Redo error:", error);
        } finally {
            isProcessing = false;
        }
    }, 300);

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

        const sortedPages = [...pages].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        const newOrderNum = sortedPages.length === 0 ? 1000 : (sortedPages[sortedPages.length - 1].order_num || 0) + 1000;

        const newPage = {
            title,
            project_id: projectId,
            slug,
            order_num: newOrderNum,
        };

        const { data: pageData, error: pageError } = await supabase
            .from("pages")
            .insert([newPage])
            .select();

        if (pageError) {
            console.error("페이지 생성 에러:", pageError);
            return;
        }

        if (pageData) {
            const createdPage = pageData[0];

            const bodyElement = {
                id: crypto.randomUUID(),
                page_id: createdPage.id,
                parent_id: null,
                tag: "body",
                props: { style: { margin: 0 } },
                order_num: 0,
            };

            const { data: elementData, error: elementError } = await supabase
                .from("elements")
                .insert([bodyElement])
                .select();

            if (elementError) {
                console.error("Body 요소 생성 에러:", elementError);
                return;
            }

            setPages((prevPages) => [...prevPages, createdPage]);
            if (elementData) {
                addElement(elementData[0]);
                fetchElements(createdPage.id);
            }
        }
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

                <Sidebar
                    pages={pages}
                    setPages={setPages}
                    handleAddPage={handleAddPage}
                    handleAddElement={handleAddElement}
                    fetchElements={fetchElements}
                    selectedPageId={selectedPageId}
                />


                <aside className="inspector"><Inspector /></aside>

                <nav className="header">
                    <div className="header_contents header_left">
                        <button aria-label="Menu"><Menu color={'#fff'} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen">
                        <span>
                            {currentPageId && pageHistories[currentPageId]
                                ? `${pageHistories[currentPageId].historyIndex + 1}/${pageHistories[currentPageId].history.length}`
                                : '0/0'
                            }
                        </span>
                        <button aria-label="Screen Width 767">767</button>
                        <button aria-label="Mobile View"><Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Desktop View"><Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button
                            aria-label="Undo"
                            onClick={handleUndo}
                            disabled={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0}
                            className={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0 ? "disabled" : ""}
                        >
                            <Undo
                                color={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0
                                    ? "#999"
                                    : iconProps.color
                                }
                                strokeWidth={iconProps.stroke}
                                size={iconProps.size}
                            />
                        </button>
                        <button
                            aria-label="Redo"
                            onClick={handleRedo}
                            disabled={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1}
                            className={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1 ? "disabled" : ""}
                        >
                            <Redo
                                color={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1
                                    ? "#999"
                                    : iconProps.color
                                }
                                strokeWidth={iconProps.stroke}
                                size={iconProps.size}
                            />
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