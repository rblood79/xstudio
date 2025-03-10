import { useNavigate } from "@remix-run/react";
import { supabase } from "../supabaseClient";
import Project from "./projects/projects";
import { useState, useEffect } from "react";

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) {
        console.error("프로젝트 조회 에러:", error);
      } else {
        setProjects(data);
      }
    };
    fetchProjects();
  }, []);

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 현재 사용자 ID 가져오기
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      console.error("세션 조회 에러:", sessionError);
      return;
    }
    const userId = sessionData.session.user.id;

    if (!newProjectName.trim()) {
      console.error("프로젝트 이름이 비어 있습니다.");
      return;
    }

    const { data, error: projectError } = await supabase
      .from("projects")
      .insert([{ name: newProjectName, created_by: userId }])
      .select(); // 추가: 삽입된 데이터를 반환받음

    if (projectError) {
      console.error("프로젝트 추가 에러:", projectError);
    } else if (data) {
      setProjects(prev => [...prev, data[0]]); // 새 프로젝트를 상태에 추가
      setNewProjectName("");
    }
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("프로젝트 삭제 에러:", error);
    } else {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div>
      <div>
        <main>main</main>
        <aside>sidebar</aside>
        <nav>header</nav>
        <footer>footer</footer>
        <h1>dashboard Page</h1>
        <Project />
        <div>
          <h2>Projects List</h2>
          <form onSubmit={handleAddProject}>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="프로젝트 이름 입력"
              required
            />
            <button type="submit">프로젝트 추가</button>
          </form>
          <ul>
            {projects.map(project => (
              <li key={project.id}>
                {project.name}-{project.updated_at}
                <button onClick={() => handleDeleteProject(project.id)}>삭제</button>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleLogout}>로그아웃</button>
      </div>
    </div>
  );
}

export default Dashboard;