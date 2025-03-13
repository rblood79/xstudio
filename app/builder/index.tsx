import React, { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { supabase } from "../supabaseClient";
import { Workspace } from "./features/workspace/index";

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

    const fetchElements = async (pageId: string) => {
        setSelectedPageId(pageId);
        console.log("pageId:", pageId);
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
            props: {
                style: {}
            },
            // 선택된 element가 있다면 parent_id로 할당
            ...(selectedElementId && { parent_id: selectedElementId }),
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
                    border: selectedElementId === el.id ? "1px solid blue" : undefined,
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

    // 추가: 요소를 계층구조로 렌더링하는 함수
    const renderElementsList = (parentId: string | null = null): React.ReactNode => {
        return (
            <ul>
                {elements
                    .filter((el) => el.parent_id === parentId)
                    .map((el) => (
                        <li
                            key={el.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(el.id);
                            }}
                            style={{
                                border:
                                    selectedElementId === el.id
                                        ? "1px solid blue"
                                        : undefined,
                            }}
                        >
                            {el.tag}-{el.id}
                            {renderElementsList(el.id)}
                        </li>
                    ))}
            </ul>
        );
    };

    return (
        <div>
            <div>
                <main>
                    <div>
                        {elements.length === 0 ? (
                            "No elements available"
                        ) : (
                            renderElementsTree()
                        )}
                    </div>
                </main>
                <aside className="sidebar">
                    <div className="sidebar_nav">navigation</div>
                    <div>
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
                            <ul>
                                {pages.map((page) => (
                                    <li key={page.id}>
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
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div>
                        <button onClick={handleAddDivElement}>add elm</button>
                        <button onClick={handleDeleteSelectedElement}>del elm</button>
                    </div>

                    {/* 기존 flat 리스트 대신 계층구조 리스트로 교체 */}
                    <div>
                        {renderElementsList()}
                    </div>
                </aside>
                <aside className="inspector">inspector</aside>
                <nav className="header">
                    header {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                </nav>
                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;
