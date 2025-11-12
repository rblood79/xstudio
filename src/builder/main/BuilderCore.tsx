import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Key } from "react-aria-components";

import { useStore } from "../stores";
import { Element } from "../../types/core/store.types"; // 훅들이 기대하는 Element 타입
import { historyManager } from "../stores/history";

import { BuilderHeader, Breakpoint } from "./BuilderHeader";
import { BuilderWorkspace } from "./BuilderWorkspace";
import { BuilderViewport } from "./BuilderViewport";
import Inspector from "../inspector";
import Sidebar from "../sidebar";
import SelectionOverlay from "../overlay";
import Grid from "../grid";
import { PanelSlot } from "../layout";

import { useErrorHandler } from "../hooks/useErrorHandler";
import { useElementCreator } from "../hooks/useElementCreator";
import { usePageManager } from "../hooks/usePageManager";
import { useIframeMessenger } from "../hooks/useIframeMessenger";
import { useThemeManager } from "../hooks/useThemeManager";
import { useValidation } from "../hooks/useValidation";
import { memoryMonitor } from "../stores/memoryMonitor";
import { Monitor } from "../monitor"; // BuilderFooter 컴포넌트 임포트
import { projectsApi, type Project } from "../../services/api";

import "./index.css";
import { MessageService } from "../../utils/messaging";

export const BuilderCore: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectInfo, setProjectInfo] = useState<Project | null>(null);

  // Store 상태
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const showOverlay = useStore((state) => state.showOverlay);
  const themeMode = useStore((state) => state.themeMode);
  const uiScale = useStore((state) => state.uiScale);
  const historyInfo = useStore((state) => state.historyInfo);
  const setHistoryInfo = useStore((state) => state.setHistoryInfo);

  // 히스토리 정보 업데이트
  useEffect(() => {
    if (currentPageId) {
      const info = historyManager.getCurrentPageHistory();
      setHistoryInfo(info);
    }
  }, [currentPageId, elements, setHistoryInfo]);

  // Theme Mode 적용 (전역)
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark') => {
      document.documentElement.setAttribute('data-theme', theme);
    };

    if (themeMode === 'auto') {
      // 시스템 테마 감지
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      // 초기 테마 적용
      handleChange(mediaQuery);

      // 시스템 테마 변경 리스너
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      // 명시적인 테마 적용
      applyTheme(themeMode);
    }
  }, [themeMode]);

  // UI Scale 적용 (Builder UI만, Preview iframe 제외)
  useEffect(() => {
    // .app은 display: contents이므로 .contents에 직접 적용
    const builderContents = document.querySelector('.app .contents') as HTMLElement;
    if (builderContents) {
      builderContents.style.fontSize = `${uiScale}%`;
    }
  }, [uiScale]);

  // Undo/Redo 조건
  const canUndo = historyInfo.canUndo;
  const canRedo = historyInfo.canRedo;

  // 새로운 히스토리 시스템의 Undo/Redo 핸들러
  const handleUndo = useCallback(() => {
    const { undo } = useStore.getState();
    undo();

    // 히스토리 정보 업데이트
    const info = historyManager.getCurrentPageHistory();
    setHistoryInfo(info);
  }, [setHistoryInfo]);

  const handleRedo = useCallback(() => {
    const { redo } = useStore.getState();
    redo();

    // 히스토리 정보 업데이트
    const info = historyManager.getCurrentPageHistory();
    setHistoryInfo(info);
  }, [setHistoryInfo]);

  // 훅 사용
  const { error, isLoading, setError, setIsLoading, handleError, clearError } =
    useErrorHandler();
  const { handleAddElement } = useElementCreator();
  const {
    pages,
    selectedPageId,
    fetchElements,
    addPage,
    initializeProject,
    pageList,
  } = usePageManager();
  const {
    handleIframeLoad,
    handleMessage,
    // iframeUndo, iframeRedo는 사용하지 않음
    sendElementsToIframe,
    // updateElementProps는 제거됨
    iframeReadyState,
  } = useIframeMessenger();
  const { applyThemeTokens, loadProjectTheme } = useThemeManager();
  const { validateOrderNumbers } = useValidation();

  // Local 상태
  const [breakpoint, setBreakpoint] = useState<Set<Key>>(() => {
    // 로컬 스토리지에서 저장된 breakpoint 복원
    const savedBreakpoint = localStorage.getItem("builder-breakpoint");
    if (savedBreakpoint) {
      try {
        return new Set<Key>([savedBreakpoint]);
      } catch (error) {
        console.warn("Failed to parse saved breakpoint:", error);
        return new Set<Key>(["screen"]);
      }
    }
    return new Set<Key>(["screen"]);
  });

  const [breakpoints] = useState<Breakpoint[]>([
    { id: "screen", label: "Screen", max_width: "100%", max_height: "100%" },
    { id: "desktop", label: "Desktop", max_width: 1280, max_height: 1080 },
    { id: "tablet", label: "Tablet", max_width: 1024, max_height: 800 },
    { id: "mobile", label: "Mobile", max_width: 390, max_height: 844 },
  ]);

  // breakpoint 변경 시 로컬 스토리지에 저장
  const handleBreakpointChange = useCallback((value: Key) => {
    const newBreakpoint = new Set<Key>([value]);
    setBreakpoint(newBreakpoint);
    localStorage.setItem("builder-breakpoint", String(value));
    console.log("[BuilderCore] Breakpoint changed:", value);
  }, []);

  // 프로젝트 정보 가져오기
  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (projectId) {
        try {
          const projects = await projectsApi.fetchProjects();
          const project = projects.find((p) => p.id === projectId);
          if (project) {
            setProjectInfo(project);
          }
        } catch (error) {
          console.error("프로젝트 정보 로드 실패:", error);
        }
      }
    };

    fetchProjectInfo();
  }, [projectId]);

  // 프로젝트 초기화 (중복 실행 방지)
  const isInitializing = useRef(false);
  const initializedProjectId = useRef<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // 중복 실행 방지: 이미 초기화 중이거나 같은 프로젝트가 초기화되었으면 스킵
      if (!projectId || isInitializing.current || initializedProjectId.current === projectId) {
        return;
      }

      isInitializing.current = true;
      console.log('🚀 프로젝트 초기화 시작:', projectId);

      setIsLoading(true);
      const result = await initializeProject(projectId);

      if (!result.success) {
        setError(result.error?.message || "프로젝트 초기화 실패");
        isInitializing.current = false;
        return;
      }

      setIsLoading(false);
      loadProjectTheme(projectId);
      initializedProjectId.current = projectId;
      isInitializing.current = false;

      console.log('✅ 프로젝트 초기화 완료:', projectId);

      // 메모리 모니터링 시작 (개발 모드에서만)
      if (import.meta.env.DEV) {
        memoryMonitor.startMonitoring(10000); // 10초마다 모니터링
      }
    };

    initialize();

    // 컴포넌트 언마운트 시 메모리 모니터링 중지
    return () => {
      if (import.meta.env.DEV) {
        memoryMonitor.stopMonitoring();
      }
    };
  }, [projectId, initializeProject, setIsLoading, setError, loadProjectTheme]);

  // 프로젝트 초기화 후 프리뷰에 요소 전송 (중복 전송 방지)
  // ⚠️ 최적화: elements 배열 전체가 아닌 구조 변경만 감지 (선택 변경 시 재전송 방지)
  const elementStructure = React.useMemo(
    () => elements.map((el) => `${el.id}:${el.tag}:${el.parent_id}`).join(","),
    [elements]
  );

  useEffect(() => {
    if (projectId && elements.length > 0 && iframeReadyState === "ready") {
      // 중복 전송 방지를 위한 디바운싱
      const timeoutId = setTimeout(() => {
        console.log("🚀 프로젝트 초기화 후 프리뷰 전송:", {
          projectId,
          elementCount: elements.length,
          elementIds: elements.map((el) => el.id),
        });
        sendElementsToIframe(elements);
      }, 100); // 100ms 디바운싱

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, elementStructure, iframeReadyState, sendElementsToIframe]);

  // 테마 토큰 적용
  useEffect(() => {
    applyThemeTokens();
  }, [applyThemeTokens]);

  // order_num 검증 (reorderElements 완료 후 실행하도록 지연)
  useEffect(() => {
    if (elements.length > 0) {
      // reorderElements(50ms)가 완료될 시간을 주기 위해 충분히 지연
      const timer = setTimeout(() => {
        validateOrderNumbers(elements);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [elements, validateOrderNumbers]);

  // NAVIGATE_TO_PAGE 메시지 수신 (Preview iframe에서)
  useEffect(() => {
    const handleNavigateMessage = async (event: MessageEvent) => {
      // 메시지 출처 검증 (보안)
      if (event.data?.type !== "NAVIGATE_TO_PAGE") return;

      const { path } = event.data.payload as { path: string; replace?: boolean };
      console.log("[BuilderCore] Received NAVIGATE_TO_PAGE:", path);

      // pages 배열에서 slug 기반으로 pageId 조회
      const targetPage = pages.find((p) => p.slug === path);

      if (targetPage) {
        console.log("[BuilderCore] Navigating to page:", targetPage.title, targetPage.id);
        // 페이지 elements 로드
        const result = await fetchElements(targetPage.id);
        if (!result.success) {
          handleError(result.error || new Error("페이지 로드 실패"), "페이지 이동");
        }
      } else {
        console.warn(`[BuilderCore] Page not found for path: ${path}`);
        // 페이지를 찾지 못한 경우 사용자에게 알림
        handleError(new Error(`페이지를 찾을 수 없습니다: ${path}`), "페이지 이동");
      }
    };

    window.addEventListener("message", handleNavigateMessage);

    return () => {
      window.removeEventListener("message", handleNavigateMessage);
    };
  }, [pages, fetchElements, handleError]);

  // 페이지 추가 핸들러
  const handleAddPage = useCallback(async () => {
    if (!projectId) return;

    // 타입 변환을 통해 호환성 확보
    const addElement = useStore.getState().addElement as (
      element: Element
    ) => void;

    const result = await addPage(projectId, addElement);
    if (!result.success) {
      handleError(result.error || new Error("페이지 생성 실패"), "페이지 생성");
    }
  }, [projectId, addPage, handleError]);

  // 요소 추가 핸들러
  const handleAddElementWrapper = useCallback(
    async (tag: string, parentId?: string) => {
      if (!currentPageId) return;
      try {
        // 타입 변환을 통해 호환성 확보
        const addElement = useStore.getState().addElement as (
          element: Element
        ) => void;
        await handleAddElement(
          tag,
          currentPageId,
          parentId || selectedElementId, // parentId가 있으면 사용, 없으면 selectedElementId 사용
          elements,
          addElement,
          sendElementsToIframe
        );
      } catch (error) {
        handleError(error, "요소 생성");
      }
    },
    [
      currentPageId,
      selectedElementId,
      elements,
      handleAddElement,
      sendElementsToIframe,
      handleError,
    ]
  );

  // 요소 로드 핸들러
  const fetchElementsWrapper = useCallback(
    async (pageId: string) => {
      const result = await fetchElements(pageId);
      if (!result.success) {
        handleError(result.error || new Error("요소 로드 실패"), "요소 로드");
      }
    },
    [fetchElements, handleError]
  );

  // 프리뷰 관련 핸들러들
  const handlePreview = useCallback(() => {
    console.log("Preview clicked");
  }, []);

  const handlePlay = useCallback(() => {
    console.log("Play clicked");
  }, []);

  const handlePublish = useCallback(() => {
    console.log("Publish clicked");
  }, []);

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // UI 요소들을 클릭한 경우는 무시
      if (
        target.closest(".selection-overlay") ||
        target.closest(".sidebar") ||
        target.closest(".inspector") ||
        target.closest(".header") ||
        target.closest(".footer") ||
        target.closest("#previewFrame")
      ) {
        return;
      }

      // workspace나 bg 클래스를 가진 요소를 클릭했을 때만 선택 해제
      const isWorkspaceBackground =
        target.classList.contains("workspace") ||
        target.classList.contains("bg");
      if (isWorkspaceBackground) {
        setSelectedElement(null);
        MessageService.clearOverlay();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setSelectedElement]);

  return (
    <div className="app">
      {/* 에러 표시 */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      <BuilderViewport>
        <BuilderHeader
          projectId={projectId}
          projectName={projectInfo?.name}
          breakpoint={breakpoint}
          breakpoints={breakpoints}
          onBreakpointChange={handleBreakpointChange}
          historyInfo={{
            current: historyInfo.currentIndex + 1,
            total: historyInfo.totalEntries,
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPreview={handlePreview}
          onPlay={handlePlay}
          onPublish={handlePublish}
        />

        <BuilderWorkspace
          projectId={projectId}
          breakpoint={new Set(Array.from(breakpoint).map(String))}
          breakpoints={breakpoints}
          onIframeLoad={handleIframeLoad}
          onMessage={handleMessage}
        >
          <Grid />
          {showOverlay && <SelectionOverlay />}
        </BuilderWorkspace>

        <Sidebar
          pages={pages}
          pageList={pageList}
          handleAddPage={handleAddPage}
          handleAddElement={handleAddElementWrapper}
          fetchElements={fetchElementsWrapper}
          selectedPageId={selectedPageId}
        />

        <aside className="inspector">
          <PanelSlot side="right" />
        </aside>

        {/* 기존 footer 태그를 BuilderFooter 컴포넌트로 대체 */}
        <footer className="footer">
          <Monitor />
        </footer>
      </BuilderViewport>
    </div>
  );
};
