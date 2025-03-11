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

    // 현재 사용자 세션과 ID 가져오기
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

    // Step 1: projects 테이블에 새 프로젝트 생성
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([{ name: newProjectName, created_by: userId, oder_num: 0 }])
      .select(); // 삽입된 데이터 반환
    if (projectError) {
      console.error("프로젝트 추가 에러:", projectError);
      return;
    }

    // 새 프로젝트 정보 추출
    const newProject = projectData[0];
    const projectId = newProject.id;

    // Step 2: pages 테이블에 기본 페이지 생성 (예: Home Page)
    const { error: pageError } = await supabase
      .from("pages")
      .insert([{ project_id: projectId, title: "Home", slug: "home" }]);
    if (pageError) {
      console.error("기본 페이지 생성 에러:", pageError);
      // 필요시 프로젝트 생성 롤백 고려
    }

    // Step 3: project_users 테이블에 프로젝트 소유자 기록 추가
    const { error: puError } = await supabase
      .from("project_users")
      .insert([{ project_id: projectId, user_id: userId, role: "owner" }]);
    if (puError) {
      console.error("프로젝트 사용자 추가 에러:", puError);
    }

    // (선택적) Step 4: pages에 기본 템플릿 요소(elements) 생성 - 생략

    // 상태 업데이트: 새 프로젝트를 목록에 추가
    setProjects((prev) => [...prev, newProject]);
    setNewProjectName("");
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      console.error("프로젝트 삭제 에러:", error);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleProject = async (project: any) => {
    //const url = project ? `https://${project}.localhost:5137` : `/builder/${project}`; // 기본 경로
    const url = `/builder/${project.id}`
    navigate(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };



  return (
    <div>
      <div>
        <button onClick={handleLogout}>로그아웃</button>
        <main>
          <h2>Projects List</h2>
          <form onSubmit={handleAddProject}>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="프로젝트 이름 입력"
              required
            />
            <button type="submit">프로젝트 추가</button>
          </form>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <button onClick={() => handleProject(project)}>{project.name}</button> - {project.updated_at}
                <button onClick={() => handleDeleteProject(project.id)}>삭제</button>
              </li>
            ))}
          </ul>
        </main>
        <aside>left-sidebar</aside>
        <nav>header</nav>
        <footer>footer</footer>
        <Project />
      </div>
    </div>
  );
}

export default Dashboard;
