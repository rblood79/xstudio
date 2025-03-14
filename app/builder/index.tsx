import React, { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { supabase } from "../env/supabase.client";
import { Workspace } from "./features/workspace/index";
import { RiMenuLine, RiSmartphoneFill, RiMacbookFill, RiComputerFill, RiFunctionFill, RiFileAddLine, RiAttachment2, RiDropdownList, RiImageAddLine, RiAddBoxLine, RiDatabase2Line, RiTeamLine, RiSettingsLine, RiEye2Line, RiPlayFill } from "@remixicon/react";

import "./builder.css";
interface BuilderProps {
    projectId: string | undefined;
}

function Builder({ projectId }: BuilderProps) {
    const navigate = useNavigate();
    const [pages, setPages] = useState<any[]>([]);
    const [elements, setElements] = useState<any[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    // 새롭게 선택된 element의 id 상태 추가
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
    }, [pages]);

    const fetchElements = async (pageId: string) => {
        setSelectedPageId(pageId);
        setSelectedElementId(null); // 페이지 전환 시 선택된 element 초기화
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
        const newElement: any = {
            page_id: selectedPageId,
            tag: "div",
            props: { style: {} },
            parent_id: selectedElementId ? selectedElementId : null, // parent_id를 명시적으로 null 처리
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
            // 삭제 시 DB의 cascade 옵션에 의해 자식 요소들도 함께 삭제됨
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

    const handleDeleteProject = async (id: string) => {
        const { error } = await supabase.from("pages").delete().eq("id", id);
        if (error) {
            console.error("페이지 삭제 에러:", error);
        } else {
            setPages((prev) => prev.filter((p) => p.id !== id));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const renderElement = (el: any): React.ReactNode => {
        const children = elements.filter((child) => child.parent_id === el.id);
        return React.createElement(
            el.tag,
            {
                ...el.props,
                key: el.id,
                "attr-id": el.id,
                onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                },
                style: {
                    outline: selectedElementId === el.id ? "1px solid blue" : undefined,
                    ...el.props.style,
                },
            },
            <>
                <span>ID: {el.id}</span>
                {children.map(child => renderElement(child))}
            </>
        );
    };

    const renderElementsTree = (): React.ReactNode => {
        return elements.filter((el) => !el.parent_id).map(el => renderElement(el));
    };

    // 기존: 요소를 계층구조로 렌더링하는 함수 (ul-li 구조)
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
                                <span>
                                    {el.tag}
                                </span>
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

    // iframe에 요소 데이터를 전달하는 useEffect 추가
    useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
        }
    }, [elements]);

    // 부모와 iframe 간 통신을 위한 메시지 수신 처리 (예: iframe에서 element 선택 시)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // 필요시 event.origin 검증 추가
            if (event.data.type === "ELEMENT_SELECTED") {
                setSelectedElementId(event.data.elementId);
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
                        {/*<div className="workspace">
                            {elements.length === 0 ? (
                                "No elements available"
                            ) : (
                                renderElementsTree()
                            )}
                        </div>*/}

                        <div className="workspace">
                            {/* iframe을 통해 preview.tsx와 통신 */}
                            <iframe
                                id="previewFrame"
                                src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                                style={{ width: "100%", height: "100%", border: "none" }}
                            />
                            <div className="workspace_overlay">

                            </div>
                        </div>
                    </div>
                </main>
                <aside className="sidebar">
                    <div className="sidebar_nav">
                        <div className="sidebar_group">
                            <button>
                                <RiFunctionFill
                                    size={21}
                                    color="#171717"
                                    className="ri-function-fill"
                                />
                            </button>

                            <button>
                                <RiFileAddLine
                                    size={21}
                                    color="#171717"
                                    className="ri-file-add-line"
                                />
                            </button>
                            <button>
                                <RiAddBoxLine
                                    size={21}
                                    color="#171717"
                                    className="ri-add-box-line"
                                />
                            </button>
                            <button>
                                <RiDropdownList
                                    size={21}
                                    color="#171717"
                                    className="ri-dropdown-list"
                                />
                            </button>
                            <button>
                                <RiAttachment2
                                    size={21}
                                    color="#171717"
                                    className="ri-attachment-2"
                                />
                            </button>
                            <button>
                                <RiImageAddLine
                                    size={21}
                                    color="#171717"
                                    className="ri-image-add-line"
                                />
                            </button>
                            <button>
                                <RiDatabase2Line
                                    size={21}
                                    color="#171717"
                                    className="ri-database-2-line"
                                />
                            </button>


                        </div>

                        <div className="sidebar_group">
                            <button>
                                <RiTeamLine
                                    size={21}
                                    color="#171717"
                                    className="ri-team-line"
                                />
                            </button>
                            <button>
                                <RiSettingsLine
                                    size={21}
                                    color="#171717"
                                    className="ri-settings-line"
                                />
                            </button>
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

                        {/* 기존 flat 리스트 대신 계층구조 리스트로 교체 */}
                        <div className="elements">
                            {renderElementsList()}
                        </div>
                    </div>
                </aside>
                <aside className="inspector">inspector</aside>

                <nav className="header">
                    <div className="header_contents header_left">
                        <button>
                            <RiMenuLine
                                size={21}
                                color="#171717"
                                className="button ri-menu-line"
                            />
                        </button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen_size">
                        <button>1920</button>
                        <button><RiSmartphoneFill
                            size={21}
                            color="#171717"
                            className="button ri-smartphone-fill"
                        /></button>

                        <button><RiComputerFill
                            size={21}
                            color="#171717"
                            className="button ri-computer-fill"
                        /></button>
                    </div>
                    <div className="header_contents header_right">
                        <button>
                            <RiEye2Line
                                size={21}
                                color="#171717"
                                className="button ri-eye-2-line"
                            />
                        </button>
                        <button>
                            <RiPlayFill
                                size={21}
                                color="#171717"
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

