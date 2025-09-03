import { useNavigate } from 'react-router';
import { supabase } from "../env/supabase.client";
import { useState, useEffect } from "react";

import "./index.css";

function Dashboard() {
  const navigate = useNavigate();
  interface Project {
    id: string;
    name: string;
    created_by: string;
    updated_at: string;
  }

  const [projects, setProjects] = useState<Project[]>([]);
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
      .insert([{ name: newProjectName, created_by: userId }])
      .select(); // 삽입된 데이터 반환
    if (projectError) {
      console.error("프로젝트 추가 에러:", projectError);
      return;
    }

    // 새 프로젝트 정보 추출
    const newProject = projectData[0];
    const projectId = newProject.id;

    // Step 2: pages 테이블에 기본 페이지 생성 (예: Home Page)
    const { data: pageData, error: pageError } = await supabase
      .from("pages")
      .insert([{ project_id: projectId, title: "Home", slug: "home" }])
      .select(); // 삽입된 데이터 반환
    if (pageError) {
      console.error("기본 페이지 생성 에러:", pageError);
      // 필요시 프로젝트 생성 롤백 고려
      return;
    }

    // Step 3: Home 페이지에 기본 body 요소 생성
    const homePageId = pageData[0].id;
    const bodyElement = {
      tag: 'body',
      props: { style: {} },
      page_id: homePageId,
      parent_id: null, // 최상위 요소
      order_num: 0
    };

    const { error: bodyError } = await supabase
      .from("elements")
      .insert([bodyElement]);
    if (bodyError) {
      console.error("기본 body 요소 생성 에러:", bodyError);
    }

    // Step 4: project_users 테이블에 프로젝트 소유자 기록 추가
    const { error: puError } = await supabase
      .from("project_users")
      .insert([{ project_id: projectId, user_id: userId, role: "owner" }]);
    if (puError) {
      console.error("프로젝트 사용자 추가 에러:", puError);
    }

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

  const handleProject = async (project: Project) => {
    // 변경: project.name을 쿼리 파라미터에 추가
    const url = `/builder/${encodeURIComponent(project.id)}?name=${encodeURIComponent(project.name)}`;
    navigate(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };



  return (
    <div id="app">
      <div className='contents'>


        <main className='main'>
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

          <section className='projects'>
            {projects.map((project) => (
              <div key={project.id} className='project-item'>
                <div>{project.name}</div>
                <div>{project.updated_at}</div>
                <button className='open-builder' onClick={() => handleProject(project)}>빌더 열기</button>
                <button className='close-builder' onClick={() => handleDeleteProject(project.id)}>삭제</button>
              </div>
            ))}
          </section>
        </main>
        <aside className='left-sidebar'>left-sidebar</aside>
        <nav className='header'>header<button onClick={handleLogout}>로그아웃</button></nav>
        <footer className='footer'>footer</footer>
      </div>
    </div>
  );
}

export default Dashboard;
