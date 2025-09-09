import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { projectsApi, pagesApi, elementsApi, type Project } from '../services/api';
import { ElementProps } from '../types/supabase';
import "./index.css";

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const projectsData = await projectsApi.fetchProjects();
        setProjects(projectsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '프로젝트를 불러오는데 실패했습니다.');
        console.error("프로젝트 조회 에러:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      setError("프로젝트 이름을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 현재 사용자 정보 가져오기
      const user = await projectsApi.getCurrentUser();

      // 프로젝트 생성
      const newProject = await projectsApi.createProject({
        name: newProjectName.trim(),
        created_by: user.id
      });

      // 기본 페이지 생성
      const homePage = await pagesApi.createPage({
        project_id: newProject.id,
        title: "Home",
        slug: "home"
      });

      // 기본 body 요소 생성
      const bodyElement = {
        id: crypto.randomUUID(),
        tag: 'body',
        props: {} as ElementProps,
        parent_id: null,
        page_id: homePage.id,
        order_num: 0,
      };

      await elementsApi.createElement(bodyElement);

      // 프로젝트 목록 업데이트
      setProjects(prev => [newProject, ...prev]);
      setNewProjectName("");

      // 빌더 페이지로 이동
      navigate(`/builder/${newProject.id}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.');
      console.error("프로젝트 생성 에러:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await projectsApi.deleteProject(id);
      setProjects(prev => prev.filter(project => project.id !== id));

    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 삭제에 실패했습니다.');
      console.error("프로젝트 삭제 에러:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="dashboard">
        <div className="loading">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>XStudio Dashboard</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleAddProject} className="add-project-form">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="새 프로젝트 이름"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newProjectName.trim()}>
          {loading ? '생성 중...' : '프로젝트 추가'}
        </button>
      </form>

      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <h3>{project.name}</h3>
            <p>생성일: {new Date(project.created_at).toLocaleDateString()}</p>
            <div className="project-actions">
              <button
                onClick={() => navigate(`/builder/${project.id}`)}
                disabled={loading}
              >
                편집
              </button>
              <button
                onClick={() => handleDeleteProject(project.id)}
                disabled={loading}
                className="delete-btn"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
