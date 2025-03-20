import React, { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useStore } from '@nanostores/react';
import { supabase } from "../env/supabase.client";
import 'remixicon/fonts/remixicon.css';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import "./builder.css";
import { elementsStore, setElements, addElement, setSelectedElement, selectedElementIdStore, updateElementProps, Element } from './stores/elements';

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const elements = useStore(elementsStore);
    const selectedElementId = useStore(selectedElementIdStore);
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
    const lastSentElementId = useRef<string | null>(null);

    interface Page {
        id: string;
        title: string;
        project_id: string;
        slug: string;
    }

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

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            fetchElements(pages[0].id);
        }
    }, [pages, selectedPageId]);

    const fetchElements = async (pageId: string) => {
        window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
        setSelectedPageId(pageId);
        setSelectedElement(null);
        const { data, error } = await supabase
            .from("elements")
            .select("*")
            .eq("page_id", pageId);
        if (error) {
            console.error("요소 조회 에러:", error);
        } else {
            setElements(data);
        }
    };

    const sendElementSelectedMessage = (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe?.contentDocument) {
            const element = iframe.contentDocument.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
            if (element) {
                const selectedElement = elements.find(el => el.id === elementId);
                const rect = element.getBoundingClientRect();
                //const iframeRect = iframe.getBoundingClientRect();
                //console.log("Raw rect from iframe:", rect);
                //console.log("iframeRect:", iframeRect);
                const adjustedRect = {
                    //top: rect.top + iframeRect.top + window.scrollY, // iframe 상단 보정
                    //left: rect.left + iframeRect.left + window.scrollX, // iframe 왼쪽 보정
                    top: rect.top + window.scrollY, // iframe 상단 보정
                    left: rect.left + window.scrollX, // iframe 왼쪽 보정
                    width: rect.width,
                    height: rect.height
                };
                //console.log("Adjusted rect:", adjustedRect);
                const message = {
                    type: "ELEMENT_SELECTED",
                    elementId,
                    payload: {
                        rect: adjustedRect,
                        tag: selectedElement?.tag || "Unknown",
                        props
                    },
                    source: "builder"
                };
                if (lastSentElementId.current !== elementId) {
                    //console.log("Sending ELEMENT_SELECTED from Builder to parent:", { elementId, rect: adjustedRect });
                    window.postMessage(message, window.location.origin);
                    iframe.contentWindow?.postMessage(message, window.location.origin);
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
        const newElement: Element = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: args[0], // 전달된 tag 사용
            props: {
                ...(args[1] ? { text: args[1] } : {}), // args[1]이 있는 경우에만 text 추가
                style: {}
            },
            parent_id: selectedElementId || null,
        };
        // ...existing code...
        const { data, error } = await supabase
            .from("elements")
            .insert([newElement])
            .select();
    
        if (error) {
            console.error("요소 추가 에러:", error);
        } else if (data) {
            addElement(data[0]);
            requestAnimationFrame(() => {
                setSelectedElement(data[0].id, data[0].props);
                sendElementSelectedMessage(data[0].id, data[0].props);
            });
        }
    };

    const handleDeleteSelectedElement = async () => {
        if (!selectedElementId) {
            alert("선택된 element가 없습니다.");
            return;
        }
        const { error } = await supabase
            .from("elements")
            .delete()
            .eq("id", selectedElementId);
        if (error) {
            console.error("요소 삭제 에러:", error);
        } else {
            setElements(elements.filter(el => el.id !== selectedElementId));
            setSelectedElement(null);
        }
    };

    const renderElementsList = (parentId: string | null = null): React.ReactNode => {
        return (
            <>
                {elements
                    .filter((el) => el.parent_id === parentId)
                    .map((el) => (
                        <div
                            key={el.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElement(el.id, el.props);
                                requestAnimationFrame(() => sendElementSelectedMessage(el.id, el.props));
                            }}
                            className="element"
                            style={{
                                outline: selectedElementId === el.id ? "1px solid var(--color-sky-500)" : undefined,
                            }}
                        >
                            <div>
                                <span>{el.tag}</span>
                                <button
                                    onClick={async () => {
                                        const { error } = await supabase
                                            .from("elements")
                                            .delete()
                                            .eq("id", el.id);
                                        if (error) {
                                            console.error("요소 삭제 에러:", error);
                                        } else {
                                            setElements(elements.filter((e) => e.id !== el.id));
                                        }
                                    }}>del</button>
                            </div>
                            {renderElementsList(el.id)}
                        </div>
                    ))}
            </>
        );
    };

    useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, window.location.origin);
        }
    }, [elements]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                console.warn("Received message from untrusted origin:", event.origin);
                return;
            }
            //console.log("Builder received message:", event.data);
            if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
                setSelectedElement(event.data.elementId, event.data.payload?.props);
            }
            if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
                const props = event.data.payload.props as Record<string, string | number | boolean | React.CSSProperties>;
                updateElementProps(event.data.elementId, props);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div className="app">
            <div className="contents">
                <main>
                    <div className="bg">
                        <div className="workspace">
                            <iframe
                                id="previewFrame"
                                src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                                style={{ width: "100%", height: "100%", border: "none" }}
                                onLoad={() => {
                                    const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
                                    if (iframe?.contentWindow) {
                                        iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, window.location.origin);
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
                            <button><i className="ri-function-fill" /></button>
                            <button><i className="ri-file-add-line" /></button>
                            <button><i className="ri-add-box-line" /></button>
                            <button><i className="ri-dropdown-list" /></button>
                            <button><i className="ri-attachment-2" /></button>
                            <button><i className="ri-image-add-line" /></button>
                            <button><i className="ri-database-2-line" /></button>
                        </div>
                        <div className="sidebar_group">
                            <button><i className="ri-team-line" /></button>
                            <button><i className="ri-settings-line" /></button>
                        </div>
                    </div>
                    <div className="sidebar_pages">
                        <h3>Pages</h3>
                        <div>
                            <div>
                                <button
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
                                        if (error) {
                                            console.error("페이지 생성 에러:", error);
                                        } else {
                                            if (data) {
                                                setPages((prevPages) => [...prevPages, ...data]);
                                            }
                                        }
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                            <div className="elements">
                                {pages.map((page) => (
                                    <div key={page.id} className="element">
                                        <span
                                            style={{ cursor: "pointer" }}
                                            onClick={() => fetchElements(page.id)}
                                        >
                                            {page.title}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase
                                                    .from("pages")
                                                    .delete()
                                                    .eq("id", page.id);
                                                if (error) {
                                                    console.error("페이지 삭제 에러:", error);
                                                } else {
                                                    setPages((prevPages) =>
                                                        prevPages.filter((p) => p.id !== page.id)
                                                    );
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="sidebar_elements">
                        <h3>Elements Node</h3>
                        <div>
                            <button onClick={() => handleAddElement("div", "")}>+ DIV</button>
                            <button onClick={() => handleAddElement("section","")}>+ SECTION</button>
                            <button onClick={() => handleAddElement("button", "btn")}>+ BUTTON</button>
                            <button onClick={handleDeleteSelectedElement}>del elm</button>
                        </div>
                        <div className="elements">
                            {renderElementsList()}
                        </div>
                    </div>
                </aside>
                <aside className="inspector">
                    <Inspector />
                </aside>
                <nav className="header">
                    <div className="header_contents header_left">
                        <button>
                            <i
                                className="button ri-menu-line"
                            />
                        </button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen_size">
                        <button>1920</button>
                        <button><i
                            className="button ri-smartphone-fill"
                        /></button>

                        <button><i
                            className="button ri-computer-fill"
                        /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button>
                            <i
                                className="button ri-eye-2-line"
                            />
                        </button>
                        <button>
                            <i
                                className="button ri-play-fill"
                            />
                        </button>
                        <button>
                            Publish
                        </button>
                    </div>
                </nav>

                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;