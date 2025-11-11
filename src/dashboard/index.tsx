import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { projectsApi, pagesApi, type Project } from '../services/api';
import { ElementProps } from '../types/supabase';
import { ElementUtils } from '../utils/elementUtils';
import { Button, TextField } from '../builder/components/list';
import { useAsyncQuery } from '../builder/hooks/useAsyncQuery';
import { useAsyncMutation } from '../builder/hooks/useAsyncMutation';
import {
  SquarePlus,
} from "lucide-react";
import "./index.css";

interface CreateProjectRequest {
  name: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [newProjectName, setNewProjectName] = useState("");

  // Fetch projects with useAsyncQuery
  const projectsQuery = useAsyncQuery<Project>(
    async () => await projectsApi.fetchProjects()
  );

  // Create project mutation
  const createProjectMutation = useAsyncMutation<Project, CreateProjectRequest>(
    async ({ name }) => {
      // 현재 사용자 정보 가져오기
      const user = await projectsApi.getCurrentUser();

      // 프로젝트 생성
      const newProject = await projectsApi.createProject({
        name: name.trim(),
        created_by: user.id
      });

      // 기본 페이지 생성
      const homePage = await pagesApi.createPage({
        project_id: newProject.id,
        title: "Home",
        slug: "/",
        order_num: 0
      });

      // 기본 body 요소 생성
      const bodyElement = {
        id: ElementUtils.generateId(),
        tag: 'body',
        props: {} as ElementProps,
        parent_id: null,
        page_id: homePage.id,
        order_num: 0,
      };

      await ElementUtils.createElement(bodyElement);

      return newProject;
    },
    {
      onSuccess: (newProject) => {
        projectsQuery.reload(); // 목록 갱신
        setNewProjectName("");
        navigate(`/builder/${newProject.id}`);
      },
    }
  );

  // Delete project mutation
  const deleteProjectMutation = useAsyncMutation<void, string>(
    async (id) => {
      await projectsApi.deleteProject(id);
    },
    {
      onSuccess: () => {
        projectsQuery.reload(); // 목록 갱신
      },
    }
  );

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      alert("프로젝트 이름을 입력해주세요.");
      return;
    }

    try {
      await createProjectMutation.execute({ name: newProjectName });
    } catch (err) {
      // 에러는 createProjectMutation.error에 자동 저장됨
      console.error("프로젝트 생성 에러:", err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteProjectMutation.execute(id);
    } catch (err) {
      // 에러는 deleteProjectMutation.error에 자동 저장됨
      console.error("프로젝트 삭제 에러:", err);
    }
  };

  const projects = projectsQuery.data || [];
  const loading = projectsQuery.isLoading || createProjectMutation.isLoading || deleteProjectMutation.isLoading;
  const error = projectsQuery.error || createProjectMutation.error || deleteProjectMutation.error;

  if (projectsQuery.isLoading && projects.length === 0) {
    return (
      <div className="dashboard">
        <div className="loading">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="header"><h1>XStudio Dashboard</h1></header>


      {error && (
        <div className="error-message">
          {error.message}
        </div>
      )}
      <main className="main">
        <form onSubmit={handleAddProject} className="add-project-form">
          <TextField
            type="text"
            value={newProjectName}
            onChange={(value) => setNewProjectName(value)}
            placeholder="New Project"
            isDisabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isDisabled={loading || !newProjectName.trim()}
            children={createProjectMutation.isLoading ? 'Creating...' : 'Add Project'}
          />
        </form>

        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div className="icon">
                <SquarePlus size={16} color="var(--color-primary-600)" />
              </div>
              <div className="content">
                <h3 className="title">{project.name}</h3>
                <p className="description">생성일: {new Date(project.created_at).toLocaleDateString()}</p>
              </div>
              <div className="project-actions">
                <Button
                  onPress={() => navigate(`/builder/${project.id}`)}
                  isDisabled={loading}
                  children="Edit"
                  variant="primary"
                />
                <Button
                  onPress={() => navigate(`/theme/${project.id}`)}
                  isDisabled={loading}
                  children="Theme"
                  variant="primary"
                />
                <Button
                  onPress={() => handleDeleteProject(project.id)}
                  isDisabled={loading}
                  children="Del"
                  variant="ghost"
                />
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="footer">
        <p>footer</p>
      </footer>
    </div>
  );
}

export default Dashboard;
