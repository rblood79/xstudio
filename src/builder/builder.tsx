import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router";
import { supabase } from "../env/supabase.client";
import { Icon, Menu, Play, Eye, Smartphone, Monitor, LayoutGrid, FilePlus2, SquarePlus, LibraryBig, Database, Users, Settings, CirclePlus, Trash, Palette, WandSparkles, Undo, Redo } from 'lucide-react';
import { layoutGridMoveVertical } from '@lucide/lab';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import "./builder.css";
import { useStore } from './stores/elements';

interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
}

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null); // iframe 참조

    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const { setElements, addElement, setSelectedElement, updateElementProps, undo, redo } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
    const lastSentElementId = useRef<string | null>(null);
    const [iconProps] = React.useState({ color: "#171717", stroke: 1.5, size: 21 });

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from("pages")
                .select("*")
                .eq("project_id", projectId);
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
            .eq("page_id", pageId);
        if (error) console.error("요소 조회 에러:", error);
        else {
            setElements(data);
        }
    }, [setSelectedPageId, setSelectedElement, setElements]);

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
        const newElement = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: args[0],
            props: { ...(args[1] ? { text: args[1] } : {}), style: {} },
            parent_id: selectedElementId || null,
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

    const handleUndo = async () => {
        undo();
        const updatedElements = useStore.getState().elements;
        try {
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
            } else {
                console.warn("iframe contentWindow not available during undo");
            }
        } catch (error) {
            console.error("Undo error:", error);
        }
    };

    const handleRedo = async () => {
        redo();
        const updatedElements = useStore.getState().elements;
        try {
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
            } else {
                console.warn("iframe contentWindow not available during redo");
            }
        } catch (error) {
            console.error("Redo error:", error);
        }
    };

    const renderTree = <T extends { id: string; parent_id?: string | null }>(
        items: T[],
        getLabel: (item: T) => string,
        onClick: (item: T) => void,
        onDelete: (item: T) => Promise<void>,
        parentId: string | null = null
    ): React.ReactNode => {
        const filteredItems = items.filter((item) => item.parent_id === parentId || (parentId === null && item.parent_id === undefined));
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
                        className="element flex flex-col"
                        style={{
                            background: selectedElementId === item.id || selectedPageId === item.id ? "var(--color-gray-200)" : undefined,
                        }}
                    >
                        <div className="elementItem flex-1 flex justify-between items-center text-sm">
                            <span>{getLabel(item)}</span>
                            <button
                                className="iconButton"
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
                            <button ><LayoutGrid color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><FilePlus2 color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><Icon iconNode={layoutGridMoveVertical} color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><Database color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        </div>
                        <div className="sidebar_group">
                            <button ><Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                            <button ><Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        </div>
                    </div>
                    <div className="sidebar_content">
                        <div className="sidebar_pages">
                            <div className="relative">
                                <h3>Pages</h3>
                                <button
                                    className="iconButton absolute right-0 top-0"
                                    onClick={async () => {
                                        const title = prompt("Enter page title:");
                                        const slug = prompt("Enter page slug:");
                                        if (!title || !slug) {
                                            alert("Title and slug are required.");
                                            return;
                                        }
                                        const newPage = { title, project_id: projectId, slug };
                                        const { data, error } = await supabase
                                            .from("pages")
                                            .insert([newPage])
                                            .select();
                                        if (error) console.error("페이지 생성 에러:", error);
                                        else if (data) setPages((prevPages) => [...prevPages, ...data]);
                                    }}
                                >
                                    <CirclePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </button>
                            </div>
                            <div className="elements">
                                {pages.length === 0 ? (
                                    <p>No pages available</p>
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
                                    <p>No elements available</p>
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
                                            else setElements(elements.filter((e) => e.id !== el.id));
                                        }
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="sidebar_components">
                        <button onClick={() => handleAddElement("div", "")}>+ DIV</button>
                        <button onClick={() => handleAddElement("section", "")}>+ SECTION</button>
                        <button onClick={() => handleAddElement("button", "btn")}>+ BUTTON</button>
                        <button onClick={() => handleAddElement("table", "")}>+ TABLE</button>
                        <button onClick={handleUndo} className="undoRedoButton"><Undo color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button onClick={handleRedo} className="undoRedoButton"><Redo color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </aside>
                <aside className="inspector"><Inspector /></aside>

                <nav className="header bg-gray-600 text-neutral-100 flex flex-row justify-between items-center">
                    <div className="header_contents header_left">
                        <button><Menu color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen">
                        <button>767</button>
                        <button><Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button><Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button><Eye color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button><Play color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button>Publish</button>
                    </div>
                </nav>

                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;