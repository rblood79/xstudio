import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Key } from "react-aria-components";

import { useStore } from "../stores";
import { historyManager } from "../stores/history";
import type { Element } from "../../types/core/store.types";

// 패널 등록 (side effect import - registerAllPanels() 자동 실행)
import "../panels";

import { BuilderHeader, Breakpoint } from "./BuilderHeader";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderWorkflow } from "./BuilderWorkflow";
import { BuilderViewport } from "./BuilderViewport";
import SelectionOverlay from "../overlay";
import { Workspace } from "../workspace";
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
import { PanelSlot, BottomPanelSlot } from "../layout";
import { ToastContainer, CommandPalette } from "../components";

import {
  useErrorHandler,
  usePageManager,
  usePageLoader,
  useAdjacentPagePreload,
  useAutoRecovery,
  useToast,
  useIframeMessenger,
  useThemeManager,
  useValidation,
  useThemeMessenger,
  useGlobalKeyboardShortcuts,
} from "@/builder/hooks";
// import { projectsApi, type Project } from "../../services/api";  // Supabase 동기화는 대시보드에서만 처리
import type { Project } from "../../services/api";
import { useUnifiedThemeStore } from "../../stores/themeStore";
import { useUiStore } from "../../stores/uiStore";
import { getDB } from "../../lib/db";
import { useEditModeStore } from "../stores/editMode";
import { useLayoutsStore } from "../stores/layouts";
import { useDataTableStore } from "../stores/datatable";
import { useDataStore } from "../stores/data";

import { MessageService } from "../../utils/messaging";
import { getValueByPath, upsertData, appendData, mergeData, safeJsonParse } from "../../utils/dataHelpers";

export const BuilderCore: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectInfo, setProjectInfo] = useState<Project | null>(null);

  // Feature Flag: WebGL Canvas 사용 여부
  const useWebGL = isWebGLCanvas();

  // Store 상태
  // 🚀 최적화: elements 구독 제거 - 필요할 때 getState()로 읽기
  const currentPageId = useStore((state) => state.currentPageId);
  // const selectedElementId = useStore((state) => state.selectedElementId);  // 사용하지 않음
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const historyInfo = useStore((state) => state.historyInfo);

  // UI 설정 (글로벌 uiStore에서 가져옴 - Phase 1)
  const themeMode = useUiStore((state) => state.themeMode);
  const setHistoryInfo = useStore((state) => state.setHistoryInfo);
  const viewMode = useStore((state) => state.viewMode);
  const toggleViewMode = useStore((state) => state.toggleViewMode);

  // 히스토리 정보 업데이트 (구독 기반)
  useEffect(() => {
    const updateHistoryInfo = () => {
      const info = historyManager.getCurrentPageHistory();
      setHistoryInfo(info);
    };

    updateHistoryInfo();
    const unsubscribe = historyManager.subscribe(updateHistoryInfo);
    return unsubscribe;
  }, [setHistoryInfo]);

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

  // Undo/Redo 조건
  const canUndo = historyInfo.canUndo;
  const canRedo = historyInfo.canRedo;

  // 새로운 히스토리 시스템의 Undo/Redo 핸들러
  const handleUndo = useCallback(async () => {
    const { undo } = useStore.getState();
    await undo(); // ✅ async/await 추가 - 완료 대기
  }, []);

  const handleRedo = useCallback(async () => {
    const { redo } = useStore.getState();
    await redo(); // ✅ async/await 추가 - 완료 대기
  }, []);

  // 훅 사용
  const { error, isLoading, setError, setIsLoading, handleError, clearError } =
    useErrorHandler();
  // const { handleAddElement } = useElementCreator();  // 사용하지 않음
  const {
    handleIframeLoad,
    handleMessage,
    // iframeUndo, iframeRedo는 사용하지 않음
    sendElementsToIframe,  // 🚀 elements 동기화용
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

  // 🚀 Phase 5: 페이지 Lazy Loading 통합
  const { isLoading: isPageLoading, stats: pageLoaderStats } = usePageLoader();
  // 인접 페이지 프리로드 (백그라운드)
  useAdjacentPagePreload();

  // 🚀 Phase 7: Toast 알림
  const { toasts, showToast, dismissToast } = useToast();

  // 🚀 Phase 7: 전역 키보드 단축키 (Undo/Redo, Zoom)
  useGlobalKeyboardShortcuts();

  // 🚀 Phase 7: 자동 복구 통합
  const { stats: recoveryStats } = useAutoRecovery({
    onRecovery: useCallback((reason: string) => {
      showToast('info', `성능 자동 복구 완료: ${reason}`, 8000);
    }, [showToast]),
    onWarning: useCallback((metrics: { healthScore: number }) => {
      showToast('warning', `성능 경고: Health ${metrics.healthScore}%`, 5000);
    }, [showToast]),
  });

  // Dev 모드에서 복구 통계 로깅 (필요 시 구현)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _recoveryStatsForDebug = recoveryStats;

  // Dev 모드에서 페이지 로더 통계 로깅 (필요 시 구현)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _pageLoaderStatsForDebug = pageLoaderStats;

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
          const db = await getDB();
          const layoutElements = await db.elements.getByLayout(currentLayoutId);

          // 기존 요소들과 병합
          const { elements, setElements } = useStore.getState();
          const otherElements = elements.filter((el) => el.layout_id !== currentLayoutId);
          const mergedElements = [...otherElements, ...layoutElements];
          setElements(mergedElements);


          // ⭐ Layouts 목록도 로드 (LayoutsTab이 마운트되기 전에 필요)
          const { fetchLayouts } = useLayoutsStore.getState();
          await fetchLayouts(projectId);

          // ⭐ DataStore 초기화 (Variables, DataTables, ApiEndpoints, Transformers)
          await useDataStore.getState().initializeForProject(projectId);
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
  // order_num 검증 (dev 모드 전용) - 페이지 변경 시에만 실행
  useEffect(() => {
    if (!currentPageId) return;
    // 🚀 최적화: getState()로 elements 읽기 (구독 제거)
    const elements = useStore.getState().elements;
    if (elements.length > 0) {
      validateOrderNumbers(elements);
    }
  }, [currentPageId, validateOrderNumbers]);

  // 🚀 최적화: store.subscribe로 elements 변경 감지 → iframe 동기화
  // useIframeMessenger에서 elements 구독 제거 후, BuilderCore에서 직접 동기화
  // 🚀 Phase 11: WebGL-only 모드에서는 iframeReadyState='not_initialized'로 반환되어
  //    이 구독이 자동으로 스킵됨 (~3ms/변경 절감)
  const lastSentElementsRef = useRef<Element[]>([]);
  const lastSentEditModeRef = useRef<string>('page');

  useEffect(() => {
    // iframe이 준비되지 않았으면 구독하지 않음 (WebGL-only 모드 포함)
    if (iframeReadyState !== 'ready') return;

    const unsubscribe = useStore.subscribe((state, prevState) => {
      // elements가 변경되었는지 확인 (참조 비교)
      if (state.elements === prevState.elements) return;

      // editMode 가져오기
      const editMode = useEditModeStore.getState().mode;
      const currentLayoutId = useLayoutsStore.getState().currentLayoutId;

      // editMode에 따라 필터링
      let filteredElements = state.elements;
      if (editMode === 'layout' && currentLayoutId) {
        filteredElements = state.elements.filter(el => el.layout_id === currentLayoutId);
      }

      // 변경 확인 (editMode도 포함)
      const editModeChanged = lastSentEditModeRef.current !== editMode;
      const elementsChanged = lastSentElementsRef.current !== filteredElements;

      if (!editModeChanged && !elementsChanged) return;

      // 전송
      lastSentElementsRef.current = filteredElements;
      lastSentEditModeRef.current = editMode;
      sendElementsToIframe(filteredElements);
    });

    return () => {
      unsubscribe();
    };
  }, [iframeReadyState, sendElementsToIframe]);

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

  // ===== Data Panel Integration Message Handlers (Phase 5) =====
  useEffect(() => {
    const handleDataMessage = async (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case "LOAD_DATA_TABLE":
          await handleLoadDataTable(payload);
          break;
        case "SYNC_COMPONENT":
          await handleSyncComponent(payload);
          break;
        case "SAVE_TO_DATA_TABLE":
          await handleSaveToDataTable(payload);
          break;
      }
    };

    /**
     * DataTable 로드 핸들러
     */
    async function handleLoadDataTable(payload: {
      dataTableName: string;
      forceRefresh?: boolean;
      cacheTTL?: number;
      targetVariable?: string;
    }) {
      const { dataTableName, forceRefresh } = payload;
      const { dataTables, loadDataTable, refreshDataTable } = useDataTableStore.getState();

      // DataTable을 이름으로 검색
      let targetDataTableId: string | null = null;
      dataTables.forEach((config, id) => {
        if (config.name === dataTableName) {
          targetDataTableId = id;
        }
      });

      if (!targetDataTableId) {
        console.warn(`[BuilderCore] DataTable '${dataTableName}' not found`);
        return;
      }

      // DataTable 로드 또는 새로고침
      if (forceRefresh) {
        await refreshDataTable(targetDataTableId);
      } else {
        await loadDataTable(targetDataTableId);
      }


      // TODO: Canvas iframe에 업데이트된 데이터 전송
      // sendDataTablesToIframe();
    }

    /**
     * 컴포넌트 동기화 핸들러
     */
    async function handleSyncComponent(payload: {
      sourceId: string;
      targetId: string;
      syncMode: "replace" | "merge" | "append";
      dataPath?: string;
    }) {
      const { sourceId, targetId, syncMode, dataPath } = payload;
      const { elements, updateElementProps } = useStore.getState();

      // 소스 컴포넌트 찾기 (customId 또는 id)
      const sourceElement = elements.find(
        (el) => el.customId === sourceId || el.id === sourceId
      );

      if (!sourceElement) {
        console.warn(`[BuilderCore] Source element '${sourceId}' not found`);
        return;
      }

      // 타겟 컴포넌트 찾기
      const targetElement = elements.find(
        (el) => el.customId === targetId || el.id === targetId
      );

      if (!targetElement) {
        console.warn(`[BuilderCore] Target element '${targetId}' not found`);
        return;
      }

      // 소스에서 데이터 추출 (selectedKeys, value 등)
      const sourceProps = sourceElement.props as Record<string, unknown>;
      let sourceData = sourceProps.selectedKeys || sourceProps.value || sourceProps.items;

      // dataPath가 있으면 경로로 값 추출
      if (dataPath && sourceData) {
        sourceData = getValueByPath(sourceData, dataPath);
      }

      // syncMode에 따라 타겟 업데이트
      const targetProps = targetElement.props as Record<string, unknown>;
      const targetValue = targetProps.value || targetProps.items || [];
      let newValue: unknown;

      switch (syncMode) {
        case "replace":
          newValue = sourceData;
          break;
        case "merge":
          if (typeof targetValue === 'object' && !Array.isArray(targetValue)) {
            newValue = mergeData(
              targetValue as Record<string, unknown>,
              sourceData
            );
          } else {
            newValue = sourceData;
          }
          break;
        case "append":
          if (Array.isArray(targetValue)) {
            newValue = appendData(
              targetValue as Record<string, unknown>[],
              sourceData
            );
          } else {
            newValue = sourceData;
          }
          break;
        default:
          newValue = sourceData;
      }

      // 타겟 엘리먼트 업데이트
      await updateElementProps(targetElement.id, { value: newValue });

    }

    /**
     * DataTable에 데이터 저장 핸들러
     */
    async function handleSaveToDataTable(payload: {
      dataTableName: string;
      source: "response" | "variable" | "static";
      sourcePath?: string;
      saveMode: "replace" | "merge" | "append" | "upsert";
      keyField?: string;
      transform?: string;
    }) {
      const { dataTableName, source, sourcePath, saveMode, keyField, transform } = payload;
      const { dataTables, dataTableStates } = useDataTableStore.getState();

      // DataTable을 이름으로 검색
      let targetDataTableId: string | null = null;
      let targetConfig = null;
      dataTables.forEach((config, id) => {
        if (config.name === dataTableName) {
          targetDataTableId = id;
          targetConfig = config;
        }
      });

      if (!targetDataTableId || !targetConfig) {
        console.warn(`[BuilderCore] DataTable '${dataTableName}' not found`);
        return;
      }

      // 소스에서 데이터 가져오기
      let data: unknown;
      switch (source) {
        case "response":
          // 마지막 API 응답에서 가져오기 (현재는 상태에서 가져옴)
          // TODO: lastApiResponse 상태 관리 필요 - 현재 미구현
          data = undefined;
          break;
        case "variable":
          // 변수에서 가져오기
          if (sourcePath) {
            data = getValueByPath(useStore.getState(), sourcePath);
          }
          break;
        case "static":
          // 정적 값 파싱
          data = safeJsonParse(sourcePath || "[]", []);
          break;
      }

      // Transform 적용 (선택사항)
      if (transform) {
        try {
          const transformFn = new Function("data", `return ${transform}`);
          data = transformFn(data);
        } catch (err) {
          console.warn("[BuilderCore] Transform failed:", err);
        }
      }

      // 현재 DataTable 데이터
      const currentState = dataTableStates.get(targetDataTableId);
      const currentData = currentState?.data || [];
      let newData: Record<string, unknown>[];

      // saveMode에 따라 DataTable 업데이트
      switch (saveMode) {
        case "replace":
          newData = Array.isArray(data) ? data as Record<string, unknown>[] : [data as Record<string, unknown>];
          break;
        case "merge":
          newData = currentData.map((item, i) => ({
            ...item,
            ...(Array.isArray(data) ? (data as Record<string, unknown>[])[i] : data as Record<string, unknown>)
          }));
          break;
        case "append":
          newData = appendData(currentData, data);
          break;
        case "upsert":
          newData = upsertData(currentData, data, keyField || "id");
          break;
        default:
          newData = currentData;
      }

      // DataTable 상태 업데이트 (직접 상태 업데이트)
      useDataTableStore.setState((state) => {
        const newDataTableStates = new Map(state.dataTableStates);
        const existingState = newDataTableStates.get(targetDataTableId!);

        if (existingState) {
          newDataTableStates.set(targetDataTableId!, {
            ...existingState,
            data: newData,
            lastLoadedAt: Date.now(),
          });
        }

        return { dataTableStates: newDataTableStates };
      });

    }

    window.addEventListener("message", handleDataMessage);

    return () => {
      window.removeEventListener("message", handleDataMessage);
    };
  }, []); // 의존성 없음 - 핸들러 내부에서 최신 상태 직접 접근

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
  }, []);

  const handlePlay = useCallback(() => {
  }, []);

  const handlePublish = useCallback(() => {
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
        // 🚀 Phase 11: WebGL-only 모드에서는 iframe clearOverlay 스킵
        const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
        if (!isWebGLOnly) {
          MessageService.clearOverlay();
        }
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

      {/* 로딩 표시 (초기화 또는 페이지 로딩) */}
      {(isLoading || isPageLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            {isLoading ? 'Initializing...' : 'Loading page...'}
          </div>
        </div>
      )}

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
        viewMode={viewMode}
        onViewModeToggle={toggleViewMode}
      />

      {viewMode === 'canvas' ? (
        useWebGL ? (
          /* WebGL Canvas (Phase 10) */
          <Workspace
            breakpoint={breakpoint}
            breakpoints={breakpoints}
            fallbackCanvas={
              <BuilderCanvas
                projectId={projectId}
                breakpoint={new Set(Array.from(breakpoint).map(String))}
                breakpoints={breakpoints}
                onIframeLoad={handleIframeLoad}
                onMessage={handleMessage}
              >
                <SelectionOverlay />
              </BuilderCanvas>
            }
          />
        ) : (
          /* iframe Canvas (기존) */
          <BuilderCanvas
            projectId={projectId}
            breakpoint={new Set(Array.from(breakpoint).map(String))}
            breakpoints={breakpoints}
            onIframeLoad={handleIframeLoad}
            onMessage={handleMessage}
          >
            <SelectionOverlay />
          </BuilderCanvas>
        )
      ) : (
        <BuilderWorkflow />
      )}

      <aside className="sidebar">
        <PanelSlot side="left" />
      </aside>

      <aside className="inspector">
        <PanelSlot side="right" />
      </aside>

      {/* Bottom Panel (Monitor, etc.) */}
      <BottomPanelSlot />

      {/* 🚀 Phase 7: Toast 알림 컨테이너 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 🚀 Phase 7: 커맨드 팔레트 (Cmd+K) */}
      <CommandPalette />
    </BuilderViewport>
  );
};
