import React, { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { useStore } from '@nanostores/react';
import { supabase } from "../env/supabase.client";
import { Icon, Menu, Play, Eye, Smartphone, Monitor, LayoutGrid, FilePlus2, SquarePlus, LibraryBig, Database, Users, Settings, CirclePlus, Trash, Palette, WandSparkles } from 'lucide-react';
import { layoutGridMoveVertical } from '@lucide/lab';
//import 'remixicon/fonts/remixicon.css';
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

    const [iconProps] = React.useState({ color: "#171717", stroke: 1.5, size: 21 });

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
                const computedStyle = window.getComputedStyle(element);
                // 새롭게 모든 computedStyle을 평범한 객체로 변환

                /*const computedStyleObj: Record<string, string> = {};
                for (let i = 0; i < computedStyle.length; i++) {
                    const key = computedStyle[i];
                    computedStyleObj[key] = computedStyle.getPropertyValue(key);
                }*/

                const adjustedRect = {
                    top: rect.top + window.scrollY, // 위치는 그대로 사용
                    left: rect.left + window.scrollX, // 위치는 그대로 사용
                    width: parseFloat(computedStyle.width) || rect.width, // getComputedStyle 우선
                    height: parseFloat(computedStyle.height) || rect.height, // getComputedStyle 우선
                };

                // 기존 props와 computedStyleObj를 병합
                //const mergedProps = { ...computedStyleObj, ...props };

                const message = {
                    type: "ELEMENT_SELECTED",
                    elementId,
                    payload: {
                        rect: adjustedRect,
                        tag: selectedElement?.tag || "Unknown",
                        props
                        //props: mergedProps
                    },
                    source: "builder"
                };
                if (lastSentElementId.current !== elementId) {
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

    /*const handleDeleteSelectedElement = async () => {
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
    };*/

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
                                    className="iconButton "
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
                                    }}>
                                    <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </button>
                            </div>
                            {renderElementsList(el.id)}
                        </div>
                    ))}
            </>
        );
    };

    /*useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, window.location.origin);
        }
    }, [elements]);*/

    useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe?.contentWindow && elements.length > 0) {
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
                            <button>
                                <LayoutGrid color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <FilePlus2 color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <Icon iconNode={layoutGridMoveVertical} color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <Database color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                            <WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                        </div>
                        <div className="sidebar_group">
                            <button>
                                <Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                            <button>
                                <Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                        </div>
                    </div>
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
                                    if (error) {
                                        console.error("페이지 생성 에러:", error);
                                    } else {
                                        if (data) {
                                            setPages((prevPages) => [...prevPages, ...data]);
                                        }
                                    }
                                }}
                            >
                                <CirclePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </button>
                        </div>
                        <div>
                            <div className="elements">
                                {pages.map((page) => (
                                    <div key={page.id} className="element flex flex-row justify-between">
                                        <span
                                            className="flex-1 flex items-center text-sm pl-2.5"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => fetchElements(page.id)}
                                        >
                                            {page.title}
                                        </span>
                                        <button
                                            className="iconButton"
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
                                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
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
                            <button onClick={() => handleAddElement("section", "")}>+ SECTION</button>
                            <button onClick={() => handleAddElement("button", "btn")}>+ BUTTON</button>
                            <button onClick={() => handleAddElement("table", "")}>+ TABLE</button>
                        </div>
                        <div className="elements">
                            {renderElementsList()}
                        </div>
                    </div>
                </aside>
                <aside className="inspector">
                    <Inspector />
                </aside>
                <nav className="header bg-gray-600 text-neutral-100 flex flex-row justify-between">
                    <div className="header_contents header_left">
                        <button>
                            <Menu color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen_size">
                        <button>1920</button>
                        <button>
                            <Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>

                        <button>
                            <Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                    </div>
                    <div className="header_contents header_right">
                        <button>
                            <Eye color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        <button>
                            <Play color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
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