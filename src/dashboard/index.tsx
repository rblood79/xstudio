import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  projectsApi,
  pagesApi,
  elementsApi,
  type Project,
} from "../services/api";
import { getDB } from "../lib/db";
import { ElementProps } from "../types/integrations/supabase.types";
import { ElementUtils } from "../utils/element/elementUtils";
import { Button, TextField } from "../shared/components/list";
import { useAsyncQuery } from "../builder/hooks/useAsyncQuery";
import { useAsyncMutation } from "../builder/hooks/useAsyncMutation";
import {
  SquarePlus,
  Cloud,
  HardDrive,
  Download,
  SwatchBook,
  Settings,
  Plus,
  Package,
  CloudAlert,
  CloudUpload,
  Trash,
} from "lucide-react";
import {
  mergeProjects,
  getStorageBadge,
  getAvailableActions,
  formatRelativeTime,
} from "../utils/projectMerger";
import {
  syncProjectToCloud,
  downloadProjectFromCloud,
} from "../utils/projectSync";
import { historyIndexedDB } from "../builder/stores/history/historyIndexedDB";
import { useSettingsStore } from "../stores/settingsStore";
import { SettingsPanel } from "./SettingsPanel";
import type { ProjectListItem, ProjectFilter } from "../types/dashboard.types";
import "./index.css";

interface CreateProjectRequest {
  name: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [newProjectName, setNewProjectName] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
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
        const localProjectsRaw = await db.projects.getAll();

        // 타입 변환: src/lib/db/types.ts의 Project → src/services/api/ProjectsApiService.ts의 Project
        const localProjects: Project[] = localProjectsRaw.map((p) => ({
          id: p.id,
          name: p.name,
          created_by: p.created_by || "", // optional → required
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
        }));

        console.log("[Dashboard] 로컬 프로젝트 로드:", localProjects.length);

        // 2. 클라우드 프로젝트 (이미 useAsyncQuery로 로드됨)
        const cloudProjects = cloudProjectsQuery.data || [];

        console.log("[Dashboard] 클라우드 프로젝트:", cloudProjects.length);

        // 3. 병합
        const merged = mergeProjects(localProjects, cloudProjects);
        setMergedProjects(merged);

        console.log("[Dashboard] 병합 완료:", merged.length);
      } catch (error) {
        console.error("[Dashboard] 프로젝트 로드 실패:", error);
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

      if (projectCreation === "local") {
        // 1️⃣ 로컬(IndexedDB)에만 생성
        newProject = {
          id: ElementUtils.generateId(),
          name: name.trim(),
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await db.projects.insert(newProject);
        console.log("[Dashboard] 로컬 프로젝트 생성:", newProject.id);
      } else if (projectCreation === "cloud") {
        // 2️⃣ 클라우드(Supabase)에만 생성
        newProject = await projectsApi.createProject({
          name: name.trim(),
          created_by: user.id,
        });
        console.log("[Dashboard] 클라우드 프로젝트 생성:", newProject.id);
      } else {
        // 3️⃣ 양쪽 모두 생성 (both)
        newProject = await projectsApi.createProject({
          name: name.trim(),
          created_by: user.id,
        });
        await db.projects.insert(newProject);
        console.log("[Dashboard] 로컬+클라우드 프로젝트 생성:", newProject.id);
      }

      // 기본 페이지 생성
      const homePageId = ElementUtils.generateId();
      const homePage = {
        id: homePageId,
        project_id: newProject.id,
        title: "Home", // Page 타입은 'title' 사용
        slug: "/",
        parent_id: null,
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 기본 body 요소 생성
      const bodyElement = {
        id: ElementUtils.generateId(),
        tag: "body",
        props: {} as ElementProps,
        parent_id: null,
        page_id: homePageId,
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 설정에 따라 저장
      if (projectCreation === "local") {
        // 로컬에만 저장
        await db.pages.insert(homePage);
        await db.elements.insert(bodyElement);
      } else if (projectCreation === "cloud") {
        // 클라우드에만 저장
        await pagesApi.createPage({
          id: homePageId,
          project_id: newProject.id,
          title: "Home", // API uses 'title'
          slug: "/",
          order_num: 0,
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
          order_num: 0,
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
      // 필터에 따라 삭제 범위 결정
      let deleteLocation: "local" | "cloud" | "both";

      if (filter === "local") {
        deleteLocation = "local";
        console.log("[Dashboard] 로컬 프로젝트만 삭제:", id);
      } else if (filter === "cloud") {
        deleteLocation = "cloud";
        console.log("[Dashboard] 클라우드 프로젝트만 삭제:", id);
      } else {
        deleteLocation = "both";
        console.log("[Dashboard] 로컬 + 클라우드 프로젝트 삭제:", id);
      }

      // 로컬 삭제 (local 또는 both)
      if (deleteLocation === "local" || deleteLocation === "both") {
        const db = await getDB();

        // 1. 프로젝트의 모든 페이지 찾기
        const pages = await db.pages.getByProject(id);
        console.log("[Dashboard] 삭제할 페이지:", pages.length);

        // 2. 각 페이지의 요소들과 히스토리 삭제
        for (const page of pages) {
          const elements = await db.elements.getByPage(page.id);
          console.log(
            "[Dashboard] 페이지",
            page.title,
            "의 요소:",
            elements.length
          );

          for (const element of elements) {
            await db.elements.delete(element.id);
          }

          // 페이지의 히스토리 삭제 (xstudio IndexedDB)
          await db.history.clear(page.id);

          // 페이지의 히스토리 삭제 (xstudio-history IndexedDB)
          await historyIndexedDB.clearPageHistory(page.id);
        }

        // 3. 페이지 삭제
        for (const page of pages) {
          await db.pages.delete(page.id);
        }
        console.log("[Dashboard] 페이지 및 히스토리 삭제 완료");

        // 4. 프로젝트의 디자인 토큰 삭제
        const tokens = await db.designTokens.getByProject(id);
        console.log("[Dashboard] 삭제할 디자인 토큰:", tokens.length);

        for (const token of tokens) {
          await db.designTokens.delete(token.id);
        }

        // 4-1. 프로젝트의 디자인 테마 삭제
        const themes = await db.themes.getByProject(id);
        console.log("[Dashboard] 삭제할 디자인 테마:", themes.length);

        for (const theme of themes) {
          await db.themes.delete(theme.id as string);
        }

        // ⭐ 5. Layout/Slot System: 프로젝트의 레이아웃과 레이아웃 요소 삭제
        const layouts = await db.layouts.getByProject(id);
        console.log("[Dashboard] 삭제할 레이아웃:", layouts.length);

        for (const layout of layouts) {
          // 레이아웃의 요소들 삭제 (layout_id로 조회)
          const layoutElements = await db.elements.getByLayout(layout.id);
          console.log(
            "[Dashboard] 레이아웃",
            layout.name,
            "의 요소:",
            layoutElements.length
          );

          for (const element of layoutElements) {
            await db.elements.delete(element.id);
          }

          // 레이아웃 삭제
          await db.layouts.delete(layout.id);
        }

        // 6. Data Panel 테이블들 삭제 (data_tables, api_endpoints, variables, transformers)
        const dataTables = await db.data_tables.getByProject(id);
        for (const dataTable of dataTables) {
          await db.data_tables.delete(dataTable.id);
        }
        console.log(`[Dashboard] DataTables ${dataTables.length}개 삭제 완료`);

        const apiEndpoints = await db.api_endpoints.getByProject(id);
        for (const endpoint of apiEndpoints) {
          await db.api_endpoints.delete(endpoint.id);
        }
        console.log(
          `[Dashboard] API Endpoints ${apiEndpoints.length}개 삭제 완료`
        );

        const variables = await db.variables.getByProject(id);
        for (const variable of variables) {
          await db.variables.delete(variable.id);
        }
        console.log(`[Dashboard] Variables ${variables.length}개 삭제 완료`);

        const transformers = await db.transformers.getByProject(id);
        for (const transformer of transformers) {
          await db.transformers.delete(transformer.id);
        }
        console.log(
          `[Dashboard] Transformers ${transformers.length}개 삭제 완료`
        );

        // 7. 프로젝트 삭제 (IndexedDB)
        await db.projects.delete(id);
        console.log("✅ [Dashboard] 로컬 프로젝트 삭제 완료");
      }

      // 클라우드 삭제 (cloud 또는 both)
      if (deleteLocation === "cloud" || deleteLocation === "both") {
        try {
          await projectsApi.deleteProject(id);
          console.log("✅ [Dashboard] 클라우드 프로젝트 삭제 완료");
        } catch (error) {
          console.warn(
            "[Dashboard] Supabase 삭제 실패 (프로젝트가 클라우드에 없을 수 있음):",
            error
          );
        }
      }

      console.log(`✅ [Dashboard] 프로젝트 삭제 완료 (${deleteLocation}):`, id);
    },
    {
      onSuccess: () => {
        cloudProjectsQuery.reload(); // 목록 갱신
      },
    }
  );

  // Sync project mutation (local → cloud)
  const syncProjectMutation = useAsyncMutation<void, string>(
    async (projectId) => {
      await syncProjectToCloud(projectId);
      console.log("[Dashboard] 프로젝트 동기화 완료:", projectId);
    },
    {
      onSuccess: () => {
        cloudProjectsQuery.reload(); // 목록 갱신
      },
    }
  );

  // Download project mutation (cloud → local)
  const downloadProjectMutation = useAsyncMutation<void, string>(
    async (projectId) => {
      await downloadProjectFromCloud(projectId);
      console.log("[Dashboard] 프로젝트 다운로드 완료:", projectId);
    },
    {
      onSuccess: () => {
        // 로컬 프로젝트가 추가되었으므로 목록 갱신
        cloudProjectsQuery.reload();
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
      console.error("프로젝트 생성 에러:", err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) {
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
    if (filter === "local") return project.storage.local;
    if (filter === "cloud") return project.storage.cloud;
    return true; // 'all'
  });

  const loading =
    cloudProjectsQuery.isLoading ||
    createProjectMutation.isLoading ||
    deleteProjectMutation.isLoading ||
    syncProjectMutation.isLoading ||
    downloadProjectMutation.isLoading;
  const error =
    cloudProjectsQuery.error ||
    createProjectMutation.error ||
    deleteProjectMutation.error ||
    syncProjectMutation.error ||
    downloadProjectMutation.error;

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
        <div className="filter">
          <Button
            variant={filter === "all" ? "primary" : "default"}
            size="sm"
            onPress={() => setFilter("all")}
          >
            All ({counts.all})
          </Button>
          <Button
            variant={filter === "local" ? "primary" : "default"}
            size="sm"
            onPress={() => setFilter("local")}
          >
            <HardDrive size={14} /> Local ({counts.local})
          </Button>
          <Button
            variant={filter === "cloud" ? "primary" : "default"}
            size="sm"
            onPress={() => setFilter("cloud")}
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

      {error && <div className="error-message">{error.message}</div>}

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
            size="sm"
            className="add-project-button"
            isDisabled={loading || !newProjectName.trim()}
            children={
              createProjectMutation.isLoading ? (
                "Creating..."
              ) : (
                <Plus size={16} />
              )
            }
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
                      children={<Package size={16} />}
                      variant="primary"
                      size="sm"
                    />
                  )}

                  {/* Sync 버튼 */}
                  {actions.canSync && (
                    <Button
                      onPress={async () => {
                        try {
                          await syncProjectMutation.execute(project.id);
                          alert(
                            "✅ 동기화 완료! 프로젝트가 클라우드에 업로드되었습니다."
                          );
                        } catch (err) {
                          console.error("[Dashboard] Sync 에러:", err);
                          alert("❌ 동기화 실패: " + (err as Error).message);
                        }
                      }}
                      isDisabled={loading}
                      children={
                        syncProjectMutation.isLoading ? (
                          <CloudAlert size={16} />
                        ) : (
                          <CloudUpload size={16} />
                        )
                      }
                    />
                  )}

                  {/* Download 버튼 */}
                  {actions.canDownload && (
                    <Button
                      onPress={async () => {
                        try {
                          await downloadProjectMutation.execute(project.id);
                          alert(
                            "✅ 다운로드 완료! 프로젝트가 로컬에 저장되었습니다."
                          );
                        } catch (err) {
                          console.error("[Dashboard] Download 에러:", err);
                          alert("❌ 다운로드 실패: " + (err as Error).message);
                        }
                      }}
                      isDisabled={loading}
                      variant="secondary"
                      size="sm"
                    >
                      <Download size={14} />{" "}
                      {downloadProjectMutation.isLoading
                        ? "Downloading..."
                        : "Download"}
                    </Button>
                  )}

                  {/* Theme 버튼 */}
                  <Button
                    onPress={() => navigate(`/theme/${project.id}`)}
                    isDisabled={loading}
                    children={<SwatchBook size={16} />}
                    variant="default"
                    size="sm"
                  />

                  {/* Delete 버튼 */}
                  <Button
                    onPress={() => handleDeleteProject(project.id)}
                    isDisabled={loading}
                    children={<Trash size={16} />}
                    variant="default"
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
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default Dashboard;
