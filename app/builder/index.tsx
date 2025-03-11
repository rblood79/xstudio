import { useState, useEffect } from "react"; // 변경: React 훅 임포트 추가
import { useNavigate } from "@remix-run/react";
import { supabase } from "../supabaseClient";
import { Workspace } from "./features/workspace/index";

interface BuilderProps {
    projectId: string | undefined;
}

function Builder({ projectId }: BuilderProps) {
    const [pages, setPages] = useState<any[]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from("pages")
                .select('*')
                .eq('project_id', projectId);
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
    }, [projectId]); // dependency 배열에 projectId 추가

    return (
        <div>
            <div>
                <main>
                    main{projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    <Workspace />
                </main>
                <aside>
                    <div>navigation</div>

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
                                            .select(); // 새로 생성된 데이터 반환
                                        if (error) {
                                            console.error("페이지 생성 에러:", error);
                                        } else {
                                            if (data) {
                                                setPages(prevPages => [...prevPages, ...data]);
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
                                        {page.title}
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase
                                                    .from("pages")
                                                    .delete()
                                                    .eq("id", page.id);
                                                if (error) {
                                                    console.error("페이지 삭제 에러:", error);
                                                } else {
                                                    setPages(prevPages => prevPages.filter(p => p.id !== page.id));
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

                    <div>elements</div>
                </aside>
                <aside>inspector</aside>
                <nav>header</nav>
                <footer>footer</footer>
            </div>
        </div>
    );
}

export default Builder;

