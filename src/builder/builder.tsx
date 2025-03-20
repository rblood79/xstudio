import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { supabase } from "../env/supabase.client";
import 'remixicon/fonts/remixicon.css';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import "./builder.css";

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();

    interface Page {
        id: string;
        title: string;
        project_id: string;
        slug: string;
    }

    const [pages, setPages] = useState<Page[]>([]);
    interface Element {
        id: string;
        tag: string;
        props: {
            style: React.CSSProperties;
            [key: string]: unknown;
        };
        parent_id: string | null;
        page_id: string;
    }

    const [elements, setElements] = useState<Element[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

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
                console.log("프로젝트 조회 결과:", data);
            }
        };
        if (projectId) {
            fetchProjects();
        }
    }, [projectId]);

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            fetchElements(pages[0].id);
        }
    }, [pages, selectedPageId]);

    const fetchElements = async (pageId: string) => {
        window.postMessage({ type: "CLEAR_OVERLAY" }, "*");
        setSelectedPageId(pageId);
        setSelectedElementId(null);
        const { data, error } = await supabase
            .from("elements")
            .select("*")
            .eq("page_id", pageId);
        if (error) {
            console.error("요소 조회 에러:", error);
        } else {
            setElements(data);
            console.log("요소 조회 결과:", data);
        }
    };

    const handleAddDivElement = async () => {
        if (!selectedPageId) {
            alert("먼저 페이지를 선택하세요.");
            return;
        }
        const newElement: Element = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: "div",
            props: { style: {} },
            parent_id: selectedElementId ? selectedElementId : null,
        };

        const { data, error } = await supabase
            .from("elements")
            .insert([newElement])
            .select();

        if (error) {
            console.error("요소 추가 에러:", error);
        } else if (data) {
            setElements((prev) => [...prev, data[0]]);
            console.log("새 DIV 요소 추가:", data[0]);
            setTimeout(() => {
                const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
                if (iframe && iframe.contentDocument) {
                    const newElem = iframe.contentDocument.querySelector(
                        `[data-element-id="${data[0].id}"]`
                    ) as HTMLElement | null;
                    if (newElem) {
                        const rect = newElem.getBoundingClientRect();
                        window.postMessage({
                            type: "ELEMENT_SELECTED",
                            elementId: data[0].id,
                            payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }
                        }, "*");
                    }
                }
            }, 0);
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
            if (selectedPageId) {
                const { data, error } = await supabase
                    .from("elements")
                    .select("*")
                    .eq("page_id", selectedPageId);
                if (error) {
                    console.error("요소 조회 에러:", error);
                } else {
                    setElements(data);
                }
            }
            setSelectedElementId(null);
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
                                setSelectedElementId(el.id);
                            }}
                            className="element"
                            style={{
                                outline:
                                    selectedElementId === el.id
                                        ? "1px solid blue"
                                        : undefined,
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
                                            setElements((prev) =>
                                                prev.filter((e) => e.id !== el.id)
                                            );
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
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
        }
    }, [elements]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === "ELEMENT_SELECTED") {
                setSelectedElementId(event.data.elementId);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
        const handleRequest = (event: MessageEvent) => {
            if (event.data.type === "REQUEST_UPDATE") {
                const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
                }
            }
        };
        window.addEventListener("message", handleRequest);
        return () => window.removeEventListener("message", handleRequest);
    }, [elements]);

    useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow && selectedElementId) {
            iframe.contentWindow.postMessage(
                { type: "ELEMENT_SELECTED", elementId: selectedElementId },
                "*"
            );
        }
    }, [selectedElementId]);

    // 추가: UPDATE_ELEMENT_PROPS 메시지 처리
    useEffect(() => {
        const handlePropUpdate = (event: MessageEvent) => {
            if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
                const { elementId, payload } = event.data;
                setElements((prevElements) =>
                    prevElements.map((el) =>
                        el.id === elementId ? { ...el, props: payload.props } : el
                    )
                );
            }
        };
        window.addEventListener("message", handlePropUpdate);
        return () => window.removeEventListener("message", handlePropUpdate);
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
                                    if (iframe && iframe.contentWindow) {
                                        iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
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
                            <button onClick={handleAddDivElement}>add elm</button>
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
                        <button><i className="button ri-menu-line" /></button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen_size">
                        <button>1920</button>
                        <button><i className="button ri-smartphone-fill" /></button>
                        <button><i className="button ri-computer-fill" /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button><i className="button ri-eye-2-line" /></button>
                        <button><i className="button ri-play-fill" /></button>
                        <button>Publish</button>
                    </div>
                </nav>
                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;