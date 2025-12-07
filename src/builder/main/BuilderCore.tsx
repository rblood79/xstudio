import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Key } from "react-aria-components";

import { useStore } from "../stores";
import { historyManager } from "../stores/history";

// 패널 등록 (side effect import - registerAllPanels() 자동 실행)
import "../panels";

import { BuilderHeader, Breakpoint } from "./BuilderHeader";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderViewport } from "./BuilderViewport";
import SelectionOverlay from "../overlay";
import Grid from "../grid";
import { PanelSlot, BottomPanelSlot } from "../layout";
import { InspectorSync } from "../inspector/InspectorSync";

import { useErrorHandler } from "../hooks/useErrorHandler";
// import { useElementCreator } from "../hooks/useElementCreator";  // 사용하지 않음
import { usePageManager } from "../hooks/usePageManager";
import { useIframeMessenger } from "../hooks/useIframeMessenger";
import { useThemeManager } from "../hooks/useThemeManager";
import { useValidation } from "../hooks/useValidation";
import { useThemeMessenger } from "../hooks/useThemeMessenger";
// import { projectsApi, type Project } from "../../services/api";  // Supabase 동기화는 대시보드에서만 처리
import type { Project } from "../../services/api";
import { useUnifiedThemeStore } from "../../stores/themeStore";
import { getDB } from "../../lib/db";
import { useEditModeStore } from "../stores/editMode";
import { useLayoutsStore } from "../stores/layouts";

import { MessageService } from "../../utils/messaging";

export const BuilderCore: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectInfo, setProjectInfo] = useState<Project | null>(null);

  // Store 상태
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  // const selectedElementId = useStore((state) => state.selectedElementId);  // 사용하지 않음
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const showOverlay = useStore((state) => state.showOverlay);
  const themeMode = useStore((state) => state.themeMode);
  const uiScale = useStore((state) => state.uiScale);
  const historyInfo = useStore((state) => state.historyInfo);
  const setHistoryInfo = useStore((state) => state.setHistoryInfo);

  // 히스토리 정보 업데이트
  // 성능 최적화: elements 의존성 제거 (currentPageId만 필요)
  // 히스토리 정보는 handleUndo/handleRedo에서 수동으로 업데이트
  useEffect(() => {
    if (currentPageId) {
      const info = historyManager.getCurrentPageHistory();
      setHistoryInfo(info);
    }
  }, [currentPageId, setHistoryInfo]);

  // Theme Mode 적용 (Builder UI 전용 - Preview와 분리)
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark') => {
      document.documentElement.setAttribute('data-builder-theme', theme);
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
  const handleUndo = useCallback(async () => {
    const { undo } = useStore.getState();
    await undo(); // ✅ async/await 추가 - 완료 대기

    // 히스토리 정보 업데이트 (undo 완료 후)
    const info = historyManager.getCurrentPageHistory();
    setHistoryInfo(info);
  }, [setHistoryInfo]);

  const handleRedo = useCallback(async () => {
    const { redo } = useStore.getState();
    await redo(); // ✅ async/await 추가 - 완료 대기

    // 히스토리 정보 업데이트 (redo 완료 후)
    const info = historyManager.getCurrentPageHistory();
    setHistoryInfo(info);
  }, [setHistoryInfo]);

  // 훅 사용
  const { error, isLoading, setError, setIsLoading, handleError, clearError } =
    useErrorHandler();
  // const { handleAddElement } = useElementCreator();  // 사용하지 않음
  const {
    handleIframeLoad,
    handleMessage,
    // iframeUndo, iframeRedo는 사용하지 않음
    // sendElementsToIframe는 사용하지 않음
    // updateElementProps는 제거됨
    iframeReadyState,
    requestAutoSelectAfterUpdate,
  } = useIframeMessenger();
  const {
    pages,
    // selectedPageId,  // 사용하지 않음
    fetchElements,
    // addPage,  // 사용하지 않음
    initializeProject,
    // pageList,  // 사용하지 않음
  } = usePageManager({ requestAutoSelectAfterUpdate });
  const { applyThemeTokens, loadProjectTheme } = useThemeManager();
  const { validateOrderNumbers } = useValidation();
  const { sendThemeTokens } = useThemeMessenger();

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

  // 프로젝트 정보 가져오기 (IndexedDB만 조회 - Supabase 동기화는 대시보드에서 처리)
  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (!projectId) return;

      try {
        const db = await getDB();
        const localProject = await db.projects.getById(projectId);
        if (localProject) {
          setProjectInfo(localProject as Project);
        } else {
          console.warn("[BuilderCore] 프로젝트를 찾을 수 없음:", projectId);
        }
      } catch (error) {
        console.error("[BuilderCore] 프로젝트 정보 로드 실패:", error);
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

      setIsLoading(true);
      const result = await initializeProject(projectId);

      if (!result.success) {
        setError(result.error?.message || "프로젝트 초기화 실패");
        isInitializing.current = false;
        return;
      }

      // ⭐ Layout/Slot System: editMode가 'layout'이면 Layout 요소도 로드
      // (새로고침 시 editMode와 currentLayoutId가 localStorage에서 복원됨)
      const editMode = useEditModeStore.getState().mode;
      const currentLayoutId = useLayoutsStore.getState().currentLayoutId;

      if (editMode === 'layout' && currentLayoutId) {
        try {
          console.log(`🏗️ [BuilderCore] Layout 모드 복원 - Layout ${currentLayoutId.slice(0, 8)} 요소 로드`);
          const db = await getDB();
          const layoutElements = await db.elements.getByLayout(currentLayoutId);

          // 기존 요소들과 병합
          const { elements, setElements } = useStore.getState();
          const otherElements = elements.filter((el) => el.layout_id !== currentLayoutId);
          const mergedElements = [...otherElements, ...layoutElements];
          setElements(mergedElements, { skipHistory: true });

          console.log(`🏗️ [BuilderCore] Layout 요소 ${layoutElements.length}개 로드 완료`);

          // ⭐ Layouts 목록도 로드 (LayoutsTab이 마운트되기 전에 필요)
          const { fetchLayouts } = useLayoutsStore.getState();
          await fetchLayouts(projectId);
        } catch (error) {
          console.error('[BuilderCore] Layout 요소 로드 실패:', error);
        }
      }

      setIsLoading(false);

      // ✅ 테마 로드 (비동기 처리 - 완료 기다리지 않음)
      // iframe ready 시 subscribe가 자동으로 전송 처리
      loadProjectTheme(projectId);

      // Preview iframe에 초기 테마 토큰 전송
      // iframe이 준비되면 자동으로 전송되도록 별도 useEffect 사용

      initializedProjectId.current = projectId;
      isInitializing.current = false;
    };

    initialize();

    // 컴포넌트 언마운트 시 정리
    return () => {
      MessageService.clearIframeCache();
    };
  }, [projectId, initializeProject, setIsLoading, setError, loadProjectTheme]);

  // 🔧 FIX: 프리뷰 요소 전송은 PREVIEW_READY 핸들러에서 처리
  // (BuilderCore에서 중복 전송하지 않음 - useIframeMessenger.ts:178-201 참고)

  // 테마 토큰 적용
  useEffect(() => {
    applyThemeTokens();
  }, [applyThemeTokens]);

  // Preview iframe에 테마 토큰 전송 (초기 로드 + 토큰 변경 시)
  // ✅ 개선: dynamic import 제거, useThemeMessenger 사용
  // ✅ sendThemeTokens를 Ref에 저장하여 최신 함수 참조
  const sendThemeTokensRef = React.useRef(sendThemeTokens);
  React.useEffect(() => {
    sendThemeTokensRef.current = sendThemeTokens;
  }, [sendThemeTokens]);

  useEffect(() => {
    if (iframeReadyState !== 'ready') return;

    // 즉시 전송 (이미 로드된 경우)
    const { tokens } = useUnifiedThemeStore.getState();
    if (tokens.length > 0) {
      sendThemeTokensRef.current(tokens);
    }

    // 토큰 변경 구독 (전체 store 구독 방식)
    // ⚠️ Selector 방식이 아닌 전체 상태 구독으로 변경 (타이밍 이슈 방지)
    let prevTokensLength = tokens.length;
    const unsubscribe = useUnifiedThemeStore.subscribe((state) => {
      const currentTokensLength = state.tokens.length;

      if (currentTokensLength > 0 && prevTokensLength !== currentTokensLength) {
        sendThemeTokensRef.current(state.tokens);
        prevTokensLength = currentTokensLength;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [iframeReadyState]); // ✅ sendThemeTokens 의존성 제거 (subscribe 재등록 방지)

  // Phase 4.2 최적화: setTimeout 제거, useEffect batching 활용
  // order_num 검증 (dev 모드 전용)
  useEffect(() => {
    if (elements.length > 0) {
      // React의 자연스러운 batching으로 reorderElements 후 실행됨
      validateOrderNumbers(elements);
    }
  }, [elements, validateOrderNumbers]);

  // NAVIGATE_TO_PAGE 메시지 수신 (Preview iframe에서)
  useEffect(() => {
    const handleNavigateMessage = async (event: MessageEvent) => {
      // 메시지 출처 검증 (보안)
      if (event.data?.type !== "NAVIGATE_TO_PAGE") return;

      const { path } = event.data.payload as { path: string; replace?: boolean };

      // 경로 정규화: 항상 "/"로 시작하도록 통일
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // pages 배열에서 slug 기반으로 pageId 조회
      // slug와 path 모두 "/"로 시작하는 형식으로 통일하여 비교
      const targetPage = pages.find((p) => {
        const pageSlug = p.slug || '/';
        // slug도 정규화 (DB에 "/" 없이 저장된 경우 대비)
        const normalizedSlug = pageSlug.startsWith('/') ? pageSlug : `/${pageSlug}`;
        return normalizedSlug === normalizedPath;
      });

      if (targetPage) {
        console.log("[BuilderCore] Navigating to:", targetPage.name, normalizedPath);
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

  // 페이지 추가 핸들러 (사용하지 않음 - 주석 처리)
  // const handleAddPage = useCallback(async () => {
  //   if (!projectId) return;
  //   const addElement = useStore.getState().addElement as (
  //     element: Element
  //   ) => void;
  //   const result = await addPage(projectId, addElement);
  //   if (!result.success) {
  //     handleError(result.error || new Error("페이지 생성 실패"), "페이지 생성");
  //   }
  // }, [projectId, addPage, handleError]);

  // 요소 추가 핸들러 (사용하지 않음 - 주석 처리)
  // const handleAddElementWrapper = useCallback(
  //   async (tag: string, parentId?: string) => {
  //     if (!currentPageId) return;
  //     try {
  //       const addElement = useStore.getState().addElement as (
  //         element: Element
  //       ) => void;
  //       await handleAddElement(
  //         tag,
  //         currentPageId,
  //         parentId || selectedElementId,
  //         elements,
  //         addElement,
  //         sendElementsToIframe
  //       );
  //     } catch (error) {
  //       handleError(error, "요소 생성");
  //     }
  //   },
  //   [
  //     currentPageId,
  //     selectedElementId,
  //     elements,
  //     handleAddElement,
  //     sendElementsToIframe,
  //     handleError,
  //   ]
  // );

  // 요소 로드 핸들러 (사용하지 않음 - 주석 처리)
  // const fetchElementsWrapper = useCallback(
  //   async (pageId: string) => {
  //     const result = await fetchElements(pageId);
  //     if (!result.success) {
  //       handleError(result.error || new Error("요소 로드 실패"), "요소 로드");
  //     }
  //   },
  //   [fetchElements, handleError]
  // );

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
    <BuilderViewport>
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

      {/* Inspector 상태 동기화 (항상 마운트) */}
      <InspectorSync />

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

      <BuilderCanvas
        projectId={projectId}
        breakpoint={new Set(Array.from(breakpoint).map(String))}
        breakpoints={breakpoints}
        onIframeLoad={handleIframeLoad}
        onMessage={handleMessage}
      >
        <Grid />
        {showOverlay && <SelectionOverlay />}
      </BuilderCanvas>

      <aside className="sidebar">
        <PanelSlot side="left" />
      </aside>

      <aside className="inspector">
        <PanelSlot side="right" />
      </aside>

      {/* Bottom Panel (Monitor, etc.) */}
      <BottomPanelSlot />
    </BuilderViewport>
  );
};
