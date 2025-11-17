import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { projectsApi, pagesApi, elementsApi, type Project } from '../services/api';
import { getDB } from '../lib/db';
import { ElementProps } from '../types/integrations/supabase.types';
import { ElementUtils } from '../utils/element/elementUtils';
import { Button, TextField } from '../builder/components/list';
import { useAsyncQuery } from '../builder/hooks/useAsyncQuery';
import { useAsyncMutation } from '../builder/hooks/useAsyncMutation';
import {
  SquarePlus,
  Cloud,
  HardDrive,
  // ⚠️ IndexedDB 전용 모드 - Sync/Download 아이콘 불필요
  // Download,
  // Upload,
  Settings,
} from "lucide-react";
import {
  mergeProjects,
  getStorageBadge,
  getAvailableActions,
  formatRelativeTime,
} from '../utils/projectMerger';
// ⚠️ IndexedDB 전용 모드 - projectSync 비활성화
// import {
//   syncProjectToCloud,
//   downloadProjectFromCloud,
// } from '../utils/projectSync';
import { useSettingsStore } from '../stores/settingsStore';
import { SettingsPanel } from './SettingsPanel';
import type { ProjectListItem, ProjectFilter } from '../types/dashboard.types';
import "./index.css";

interface CreateProjectRequest {
  name: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [newProjectName, setNewProjectName] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [mergedProjects, setMergedProjects] = useState<ProjectListItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // 설정 가져오기
  const projectCreation = useSettingsStore((state) => state.projectCreation);

  // Fetch cloud projects with useAsyncQuery
  const cloudProjectsQuery = useAsyncQuery<Project>(
    async () => await projectsApi.fetchProjects()
  );

  // Load and merge local + cloud projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // 1. IndexedDB에서 로컬 프로젝트 로드
        const db = await getDB();
        const localProjects = await db.projects.getAll();

        console.log('[Dashboard] 로컬 프로젝트 로드:', localProjects.length);

        // 2. 클라우드 프로젝트 (이미 useAsyncQuery로 로드됨)
        const cloudProjects = cloudProjectsQuery.data || [];

        console.log('[Dashboard] 클라우드 프로젝트:', cloudProjects.length);

        // 3. 병합
        const merged = mergeProjects(localProjects, cloudProjects);
        setMergedProjects(merged);

        console.log('[Dashboard] 병합 완료:', merged.length);
      } catch (error) {
        console.error('[Dashboard] 프로젝트 로드 실패:', error);
      }
    };

    if (!cloudProjectsQuery.isLoading) {
      loadProjects();
    }
  }, [cloudProjectsQuery.data, cloudProjectsQuery.isLoading]);

  // Create project mutation
  const createProjectMutation = useAsyncMutation<Project, CreateProjectRequest>(
    async ({ name }) => {
      const db = await getDB();
      const user = await projectsApi.getCurrentUser();

      // 프로젝트 생성 모드에 따라 처리
      let newProject: Project;

      if (projectCreation === 'local') {
        // 1️⃣ 로컬(IndexedDB)에만 생성
        newProject = {
          id: ElementUtils.generateId(),
          name: name.trim(),
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await db.projects.insert(newProject);
        console.log('[Dashboard] 로컬 프로젝트 생성:', newProject.id);
      } else if (projectCreation === 'cloud') {
        // 2️⃣ 클라우드(Supabase)에만 생성
        newProject = await projectsApi.createProject({
          name: name.trim(),
          created_by: user.id
        });
        console.log('[Dashboard] 클라우드 프로젝트 생성:', newProject.id);
      } else {
        // 3️⃣ 양쪽 모두 생성 (both)
        newProject = await projectsApi.createProject({
          name: name.trim(),
          created_by: user.id
        });
        await db.projects.insert(newProject);
        console.log('[Dashboard] 로컬+클라우드 프로젝트 생성:', newProject.id);
      }

      // 기본 페이지 생성
      const homePageId = ElementUtils.generateId();
      const homePage = {
        id: homePageId,
        project_id: newProject.id,
        name: "Home", // Store uses 'name'
        slug: "/",
        parent_id: null,
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 기본 body 요소 생성
      const bodyElement = {
        id: ElementUtils.generateId(),
        tag: 'body',
        props: {} as ElementProps,
        parent_id: null,
        page_id: homePageId,
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 설정에 따라 저장
      if (projectCreation === 'local') {
        // 로컬에만 저장
        await db.pages.insert(homePage);
        await db.elements.insert(bodyElement);
      } else if (projectCreation === 'cloud') {
        // 클라우드에만 저장
        await pagesApi.createPage({
          id: homePageId,
          project_id: newProject.id,
          title: "Home", // API uses 'title'
          slug: "/",
          order_num: 0
        });
        await elementsApi.createElement(bodyElement);
      } else {
        // 양쪽 모두 저장
        await db.pages.insert(homePage);
        await db.elements.insert(bodyElement);
        await pagesApi.createPage({
          id: homePageId,
          project_id: newProject.id,
          title: "Home",
          slug: "/",
          order_num: 0
        });
        await elementsApi.createElement(bodyElement);
      }

      return newProject;
    },
    {
      onSuccess: (newProject) => {
        cloudProjectsQuery.reload(); // 목록 갱신
        setNewProjectName("");
        navigate(`/builder/${newProject.id}`);
      },
    }
  );

  // Delete project mutation
  const deleteProjectMutation = useAsyncMutation<void, string>(
    async (id) => {
      await projectsApi.deleteProject(id);

      // IndexedDB에서도 삭제
      const db = await getDB();
      await db.projects.delete(id);

      console.log('[Dashboard] 프로젝트 삭제:', id);
    },
    {
      onSuccess: () => {
        cloudProjectsQuery.reload(); // 목록 갱신
      },
    }
  );

  // ⚠️ IndexedDB 전용 모드 - Sync/Download 기능 비활성화
  // const syncProjectMutation = useAsyncMutation<void, string>(
  //   async (projectId) => {
  //     await syncProjectToCloud(projectId);
  //     console.log('[Dashboard] 프로젝트 동기화 완료:', projectId);
  //   },
  //   {
  //     onSuccess: () => {
  //       cloudProjectsQuery.reload();
  //     },
  //   }
  // );

  // const downloadProjectMutation = useAsyncMutation<void, string>(
  //   async (projectId) => {
  //     await downloadProjectFromCloud(projectId);
  //     console.log('[Dashboard] 프로젝트 다운로드 완료:', projectId);
  //   },
  //   {
  //     onSuccess: () => {
  //       cloudProjectsQuery.reload();
  //     },
  //   }
  // );

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      alert("프로젝트 이름을 입력해주세요.");
      return;
    }

    try {
      await createProjectMutation.execute({ name: newProjectName });
    } catch (err) {
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
      console.error("프로젝트 삭제 에러:", err);
    }
  };

  // 필터링된 프로젝트 목록
  const filteredProjects = mergedProjects.filter((project) => {
    if (filter === 'local') return project.storage.local;
    if (filter === 'cloud') return project.storage.cloud;
    return true; // 'all'
  });

  const loading = cloudProjectsQuery.isLoading || createProjectMutation.isLoading || deleteProjectMutation.isLoading;
  const error = cloudProjectsQuery.error || createProjectMutation.error || deleteProjectMutation.error;

  if (cloudProjectsQuery.isLoading && mergedProjects.length === 0) {
    return (
      <div className="dashboard">
        <div className="loading">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

  // 필터별 개수
  const counts = {
    all: mergedProjects.length,
    local: mergedProjects.filter((p) => p.storage.local).length,
    cloud: mergedProjects.filter((p) => p.storage.cloud).length,
  };

  return (
    <div className="dashboard">
      <header className="header">
        <h1>XStudio Dashboard</h1>

        {/* 필터 버튼 + Settings */}
        <div className="filters">
          <Button
            variant={filter === 'all' ? 'primary' : 'default'}
            size="sm"
            onPress={() => setFilter('all')}
          >
            All ({counts.all})
          </Button>
          <Button
            variant={filter === 'local' ? 'primary' : 'default'}
            size="sm"
            onPress={() => setFilter('local')}
          >
            <HardDrive size={14} /> Local ({counts.local})
          </Button>
          <Button
            variant={filter === 'cloud' ? 'primary' : 'default'}
            size="sm"
            onPress={() => setFilter('cloud')}
          >
            <Cloud size={14} /> Cloud ({counts.cloud})
          </Button>

          {/* Settings 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setShowSettings(true)}
            aria-label="Open settings"
          >
            <Settings size={16} />
          </Button>
        </div>
      </header>

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
          {filteredProjects.map((project) => {
            const badge = getStorageBadge(project);
            const actions = getAvailableActions(project);

            return (
              <div key={project.id} className="project-card">
                <div className="icon">
                  <SquarePlus size={16} color="var(--color-primary-600)" />
                </div>
                <div className="content">
                  <h3 className="title">{project.name}</h3>

                  {/* 저장 위치 뱃지 */}
                  <div className="badges">
                    <span className={`badge ${badge.className}`}>
                      {badge.icon} {badge.label}
                    </span>
                  </div>

                  <p className="description">
                    {formatRelativeTime(project.lastModified)}
                  </p>

                  {/* 동기화 정보 */}
                  {project.sync.lastSyncAt && (
                    <p className="sync-info">
                      Last sync: {formatRelativeTime(project.sync.lastSyncAt)}
                    </p>
                  )}
                </div>

                <div className="project-actions">
                  {/* Open 버튼 */}
                  {actions.canOpen && (
                    <Button
                      onPress={() => navigate(`/builder/${project.id}`)}
                      isDisabled={loading}
                      children="Open"
                      variant="primary"
                      size="sm"
                    />
                  )}

                  {/* ⚠️ 동기화 기능 비활성화 (IndexedDB 전용 모드)
                      Sync와 Download 버튼은 Supabase에 의존하므로 제거됨
                      파일 내보내기/가져오기를 사용하여 백업 가능
                  */}

                  {/* Theme 버튼 */}
                  <Button
                    onPress={() => navigate(`/theme/${project.id}`)}
                    isDisabled={loading}
                    children="Theme"
                    variant="default"
                    size="sm"
                  />

                  {/* Delete 버튼 */}
                  <Button
                    onPress={() => handleDeleteProject(project.id)}
                    isDisabled={loading}
                    children="Del"
                    variant="ghost"
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 빈 상태 */}
        {filteredProjects.length === 0 && !loading && (
          <div className="empty-state">
            <p>프로젝트가 없습니다.</p>
            <p>위에서 새 프로젝트를 만들어보세요!</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>XStudio - Local-first Web Builder</p>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default Dashboard;
