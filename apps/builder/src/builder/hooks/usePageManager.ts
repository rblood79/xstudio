import { startTransition, useState, useRef, useCallback } from "react";
import { useListData } from "react-stately";
import { Element } from "../../types/core/store.types";
import { type Page as ApiPage } from "../../services/api/PagesApiService";
import { type Page, getDefaultProps } from "../../types/builder/unified.types";
import { getDB } from "../../lib/db";
import { useStore } from "../stores";
import { selectCanonicalDocument } from "../stores/elements";
import { selectCanonicalReusableFrames } from "../../adapters/canonical";
import { runLegacyToCanonicalMigration } from "../../lib/db/migration";
import { useLayoutsStore } from "../stores/layouts";
import { useViewportSyncStore } from "../workspace/canvas/stores";
import type { ElementProps } from "../../types/integrations/supabase.types";
import { ElementUtils } from "../../utils/element/elementUtils";
import { applyCollectionItemsMigration } from "@composition/shared";
import { enqueuePagePersistence } from "../utils/pagePersistenceQueue";
import { scheduleNextFrame } from "../utils/scheduleTask";

const PAGE_STACK_GAP = 80;

/**
 * API 응답 타입 (에러를 throw하지 않고 return)
 */
export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * ⭐ Nested Routes & Slug System: 페이지 생성 파라미터
 */
export interface AddPageParams {
  projectId: string;
  title: string;
  slug: string;
  layoutId?: string | null;
  parentId?: string | null;
}

export interface UsePageManagerReturn {
  pages: ApiPage[];
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  isCreatingPage: boolean;
  fetchElements: (pageId: string) => Promise<ApiResult<Element[]>>;
  addPage: (projectId: string) => Promise<ApiResult<ApiPage>>;
  addPageWithParams: (params: AddPageParams) => Promise<ApiResult<ApiPage>>;
  initializeProject: (projectId: string) => Promise<ApiResult<ApiPage[]>>;
  /** 🚀 Phase 5: 페이지가 로드되지 않았으면 로드 */
  loadPageIfNeeded: (pageId: string) => Promise<void>;
  // 직접 접근 (필요시)
  pageList: ReturnType<typeof useListData<ApiPage>>;
}

export interface UsePageManagerProps {
  requestAutoSelectAfterUpdate?: (elementId: string) => void;
}

/**
 * usePageManager - React Stately useListData 기반 페이지 관리
 *
 * wrapper 함수 불필요: 모든 함수가 에러를 return으로 처리
 * useCallback 사용: fetchElements, initializeProject는 메모이제이션됨 (무한 재렌더 방지)
 *
 * @param props - requestAutoSelectAfterUpdate 함수 (iframe messenger에서)
 * @example
 * ```tsx
 * const { requestAutoSelectAfterUpdate } = useIframeMessenger();
 * const { pages, selectedPageId, fetchElements, addPage, initializeProject } = usePageManager({ requestAutoSelectAfterUpdate });
 *
 * // wrapper 없이 직접 사용
 * const result = await fetchElements(pageId);
 * if (!result.success) {
 *   console.error('에러:', result.error);
 * }
 * ```
 */
export const usePageManager = ({
  requestAutoSelectAfterUpdate,
}: UsePageManagerProps = {}): UsePageManagerReturn => {
  // 1. pages 관리: useListData (append/remove 자동)
  const pageList = useListData<ApiPage>({
    initialItems: [],
    getKey: (page) => page.id,
  });

  // 2. selectedPageId: 단순 state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  // 3. 중복 초기화 방지
  const initializingRef = useRef<string | null>(null);
  const creatingPageRef = useRef(false);
  const pendingActivationFrameRef = useRef<number | null>(null);
  const pendingActivationPageIdRef = useRef<string | null>(null);

  const pages = useStore((state) => state.pages);
  const lazyLoadingEnabled = useStore((state) => state.lazyLoadingEnabled);

  const cancelPendingActivation = useCallback(() => {
    const taskId = pendingActivationFrameRef.current;
    if (taskId === null) return;

    if (typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(taskId);
    } else {
      clearTimeout(taskId);
    }

    pendingActivationFrameRef.current = null;
    pendingActivationPageIdRef.current = null;
  }, []);

  const schedulePageActivation = useCallback(
    (pageId: string, elementId?: string | null) => {
      cancelPendingActivation();
      pendingActivationPageIdRef.current = pageId;

      pendingActivationFrameRef.current = scheduleNextFrame(() => {
        pendingActivationFrameRef.current = null;

        if (pendingActivationPageIdRef.current !== pageId) {
          return;
        }

        pendingActivationPageIdRef.current = null;
        startTransition(() => {
          useStore.getState().activatePage(pageId, elementId);
        });
      });
    },
    [cancelPendingActivation],
  );

  const runWithPageCreationLock = useCallback(
    async <T>(
      createPage: () => Promise<ApiResult<T>>,
    ): Promise<ApiResult<T>> => {
      if (creatingPageRef.current) {
        return {
          success: false,
          error: new Error("페이지 생성이 이미 진행 중입니다"),
        };
      }

      creatingPageRef.current = true;
      setIsCreatingPage(true);

      try {
        return await createPage();
      } finally {
        creatingPageRef.current = false;
        setIsCreatingPage(false);
      }
    },
    [],
  );

  const computeNextPagePosition = useCallback(() => {
    const { pagePositions } = useStore.getState();
    const canvasSize = useViewportSyncStore.getState().canvasSize;
    let maxX = 0;

    for (const pos of Object.values(pagePositions)) {
      const endX = pos.x + canvasSize.width + PAGE_STACK_GAP;
      if (endX > maxX) {
        maxX = endX;
      }
    }

    return { x: maxX, y: 0 };
  }, []);

  /**
   * fetchElements - 페이지 요소 로드
   * useCallback으로 래핑하여 불필요한 재생성 방지
   *
   * NOTE: Zustand의 setCurrentPageId는 안정적인 함수 참조이므로 dependency에서 제외 가능
   *
   * @returns ApiResult (성공 시 data, 실패 시 error)
   */
  const fetchElements = useCallback(
    async (pageId: string): Promise<ApiResult<Element[]>> => {
      if (!pageId) {
        return { success: false, error: new Error("pageId is required") };
      }

      try {
        // ADR-040 Phase 6: pageElementsSnapshot O(1) 조회 (elements.filter 배열 순회 제거)
        const { elements, pages, pageElementsSnapshot } = useStore.getState();
        const existingPageElements = pageElementsSnapshot[pageId] ?? [];
        let mergedElements = elements;
        let loadedPageElements = existingPageElements;

        if (existingPageElements.length === 0) {
          // IndexedDB에서 페이지 요소 로드 (빠름! 10-50ms)
          const db = await getDB();
          const elementsData = await db.elements.getByPage(pageId);

          // ⭐ Layout/Slot System: 페이지에 적용된 Layout의 요소들도 함께 로드
          const currentPage = pages.find((p) => p.id === pageId);
          const allElements = [...elementsData];

          if (currentPage?.layout_id) {
            const layoutElements = await db.elements.getByLayout(
              currentPage.layout_id,
            );
            console.log(
              `📥 [fetchElements] Layout ${currentPage.layout_id.slice(0, 8)} 요소 ${layoutElements.length}개 함께 로드`,
            );
            // Layout 요소들 추가 (중복 제거)
            const existingIds = new Set(allElements.map((el) => el.id));
            layoutElements.forEach((el) => {
              if (!existingIds.has(el.id)) {
                allElements.push(el);
              }
            });
          }

          // 기존 요소와 병합 (중복 제거)
          const mergedMap = new Map<string, Element>();
          elements.forEach((el) => mergedMap.set(el.id, el));
          allElements.forEach((el) => mergedMap.set(el.id, el));
          mergedElements = Array.from(mergedMap.values());
          loadedPageElements = elementsData;

          useStore.getState().mergeElements(allElements);
        }

        setSelectedPageId(pageId);

        const bodyElement = loadedPageElements.find((el) => el.order_num === 0);

        // mergeElements 전에 auto-select 예약 — race condition 방지
        if (bodyElement && requestAutoSelectAfterUpdate) {
          requestAutoSelectAfterUpdate(bodyElement.id);
        }

        if (bodyElement) {
          useStore.getState().setSelectedElement(bodyElement.id);
        }

        return { success: true, data: mergedElements };
      } catch (error) {
        console.error("요소 로드 에러:", error);
        return { success: false, error: error as Error };
      }
    },
    [requestAutoSelectAfterUpdate],
  );

  /**
   * addPage - 새 페이지 추가
   *
   * @returns ApiResult (성공 시 data, 실패 시 error)
   */
  const addPage = async (projectId: string): Promise<ApiResult<ApiPage>> => {
    return runWithPageCreationLock(async () => {
      try {
        // Zustand store의 pages를 사용하여 최대 order_num을 찾기
        const currentPages = useStore.getState().pages;

        // 현재 페이지들의 최대 order_num을 찾아서 +1
        const maxOrderNum = currentPages.reduce(
          (max, page) => Math.max(max, page.order_num || 0),
          -1,
        );
        const nextOrderNum = maxOrderNum + 1;

        const newPageData: Page = {
          id: ElementUtils.generateId(),
          project_id: projectId,
          title: `Page ${nextOrderNum + 1}`,
          slug: `/page-${nextOrderNum + 1}`,
          parent_id: null,
          order_num: nextOrderNum,
          layout_id: null, // ⭐ Layout/Slot System: 페이지 생성 시 layout_id 초기화
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 새 페이지에 기본 body 요소 생성
        const bodyElement: Element = {
          id: ElementUtils.generateId(),
          tag: "body",
          props: getDefaultProps("body") as ElementProps,
          parent_id: null,
          page_id: newPageData.id,
          order_num: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newPage = newPageData;

        setSelectedPageId(newPage.id);

        const nextPosition = computeNextPagePosition();

        useStore
          .getState()
          .appendPageShell(newPage, bodyElement, nextPosition, {
            activate: false,
          });

        schedulePageActivation(newPage.id, bodyElement.id);
        enqueuePagePersistence(async () => {
          const persistenceDb = await getDB();
          if (persistenceDb.pages.insertWithBody) {
            await persistenceDb.pages.insertWithBody(newPageData, bodyElement);
          } else {
            await persistenceDb.pages.insert(newPageData);
            await persistenceDb.elements.insert(bodyElement);
          }
        });

        console.log("✅ 페이지 추가 완료:", newPage.title);
        return { success: true, data: newPage };
      } catch (error) {
        console.error("페이지 생성 에러:", error);
        return { success: false, error: error as Error };
      }
    });
  };

  /**
   * addPageWithParams - 파라미터를 받아서 새 페이지 추가
   * ⭐ Nested Routes & Slug System: title, slug, layoutId, parentId를 지정하여 생성
   *
   * @returns ApiResult (성공 시 data, 실패 시 error)
   */
  const addPageWithParams = async (
    params: AddPageParams,
  ): Promise<ApiResult<ApiPage>> => {
    const { projectId, title, slug, layoutId = null, parentId = null } = params;

    return runWithPageCreationLock(async () => {
      try {
        // Zustand store의 pages를 사용하여 최대 order_num을 찾기
        const currentPages = useStore.getState().pages;

        // 현재 페이지들의 최대 order_num을 찾아서 +1
        const maxOrderNum = currentPages.reduce(
          (max, page) => Math.max(max, page.order_num || 0),
          -1,
        );
        const nextOrderNum = maxOrderNum + 1;

        const newPageData: Page = {
          id: ElementUtils.generateId(),
          project_id: projectId,
          title: title,
          slug: slug,
          parent_id: parentId,
          order_num: nextOrderNum,
          layout_id: layoutId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 새 페이지에 기본 body 요소 생성
        const bodyElement: Element = {
          id: ElementUtils.generateId(),
          tag: "body",
          props: getDefaultProps("body") as ElementProps,
          parent_id: null,
          page_id: newPageData.id,
          order_num: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newPage = newPageData;

        setSelectedPageId(newPage.id);

        if (!layoutId) {
          const nextPosition = computeNextPagePosition();
          useStore
            .getState()
            .appendPageShell(newPage, bodyElement, nextPosition, {
              activate: false,
            });
          schedulePageActivation(newPage.id, bodyElement.id);
          enqueuePagePersistence(async () => {
            const persistenceDb = await getDB();
            if (persistenceDb.pages.insertWithBody) {
              await persistenceDb.pages.insertWithBody(
                newPageData,
                bodyElement,
              );
            } else {
              await persistenceDb.pages.insert(newPageData);
              await persistenceDb.elements.insert(bodyElement);
            }
          });
        } else {
          cancelPendingActivation();
          const { setCurrentPageId, setPages } = useStore.getState();
          setCurrentPageId(newPage.id);
          setPages([...currentPages, newPage]);
          enqueuePagePersistence(async () => {
            const persistenceDb = await getDB();
            await persistenceDb.pages.insert(newPageData);
            await persistenceDb.elements.insert(bodyElement);
            await fetchElements(newPage.id);
          });
        }

        console.log(
          "✅ 페이지 추가 완료 (with params):",
          newPage.title,
          "slug:",
          newPage.slug,
        );
        return { success: true, data: newPage };
      } catch (error) {
        console.error("페이지 생성 에러 (with params):", error);
        return { success: false, error: error as Error };
      }
    });
  };

  /**
   * initializeProject - 프로젝트 초기화
   * useCallback으로 래핑하여 불필요한 재생성 방지
   *
   * NOTE: pageList는 useListData의 결과로 매 렌더마다 새 객체를 반환하므로
   *       dependency에 포함하면 무한 루프 발생. 함수 내에서 직접 접근.
   *       Zustand 함수들(setPages, setCurrentPageId)은 안정적이므로 제외 가능.
   *
   * @returns ApiResult (성공 시 data, 실패 시 error)
   */
  const initializeProject = useCallback(
    async (projectId: string): Promise<ApiResult<ApiPage[]>> => {
      // 중복 호출 방지: 같은 프로젝트가 이미 초기화 중이면 스킵
      if (initializingRef.current === projectId) {
        return {
          success: false,
          error: new Error("프로젝트가 이미 초기화 중입니다"),
        };
      }

      try {
        initializingRef.current = projectId;

        // 1. IndexedDB에서 프로젝트의 페이지들 로드
        const db = await getDB();
        const allPages = await db.pages.getAll();
        const projectPages = allPages.filter((p) => p.project_id === projectId);

        // 2. 기존 페이지 제거 후 새로 추가
        const existingKeys = pageList.items.map((p) => p.id);
        if (existingKeys.length > 0) {
          pageList.remove(...existingKeys);
        }

        // IndexedDB Page를 ApiPage로 변환
        const apiPages: ApiPage[] = projectPages.map((p) => ({
          id: p.id,
          project_id: p.project_id,
          title: p.title || "Untitled",
          slug: p.slug,
          parent_id: p.parent_id ?? null,
          order_num: p.order_num ?? 0,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
        }));

        apiPages.forEach((page) => pageList.append(page));

        // 3. Zustand store에도 저장 (NodesPanel이 접근할 수 있도록)
        // ApiPage → store Page 변환 (title → name)
        // ⭐ Layout/Slot System: layout_id도 함께 저장
        const storePages = apiPages.map((p) => {
          // IndexedDB의 원본 페이지에서 layout_id 가져오기
          const originalPage = projectPages.find((pp) => pp.id === p.id);
          return {
            id: p.id,
            title: p.title,
            slug: p.slug,
            project_id: p.project_id,
            parent_id: p.parent_id ?? null,
            order_num: p.order_num,
            layout_id:
              (originalPage as { layout_id?: string | null })?.layout_id ||
              null,
          };
        });
        const {
          setPages,
          initializePagePositions,
          setLazyLoadingEnabled,
          pageLayoutDirection,
        } = useStore.getState();
        setPages(storePages);

        // 🆕 Multi-page: 페이지 위치 초기화 (현재 방향 + canvasSize 기반)
        const currentCanvasSize = useViewportSyncStore.getState().canvasSize;
        initializePagePositions(
          storePages,
          currentCanvasSize.width,
          currentCanvasSize.height,
          PAGE_STACK_GAP,
          pageLayoutDirection,
        );

        // 🚀 Pencil 방식: 전체 페이지 요소를 한 번에 로드 (Lazy Loading 비활성화)
        setLazyLoadingEnabled(false);

        const pageIdSet = new Set(projectPages.map((p) => p.id));
        const allElements = await db.elements.getAll();
        const pageElements = allElements.filter(
          (el) => el.page_id && pageIdSet.has(el.page_id),
        );

        // ADR-903 P3-D-4 Phase C: canonical reusable FrameNode 기반 layout elements 추출.
        // db.elements.getByLayout 호출 없이 이미 로드된 allElements 를 layout_id 매칭으로 필터링.
        const canonicalDoc = selectCanonicalDocument(
          useStore.getState(),
          storePages,
          useLayoutsStore.getState().layouts,
        );
        const reusableFrames = selectCanonicalReusableFrames(canonicalDoc);
        const layoutIdSet = new Set(reusableFrames.map((f) => f.id));
        const layoutElements = allElements.filter(
          (el) => el.layout_id != null && layoutIdSet.has(el.layout_id),
        );

        const mergedMap = new Map<string, Element>();
        pageElements.forEach((el) => mergedMap.set(el.id, el));
        layoutElements.forEach((el) => mergedMap.set(el.id, el));
        const rawMerged = Array.from(mergedMap.values());

        // ADR-076 P5: Select/ComboBox/ListBox legacy child → items[] 마이그레이션
        // ListBox 는 부모 단위 원자 판정 (Field 자식 보유 부모는 템플릿 모드 유지).
        const { migratedElements: mergedElements, orphanIds } =
          applyCollectionItemsMigration(rawMerged);

        useStore.getState().hydrateProjectSnapshot(mergedElements);

        // ADR-903 P3-E E-4: migration 진입 조건 (dry-run, DB 무변경).
        // hydrate 직후 store 상태에서 canonical document 빌드 후
        // legacy → composition-1.0 변환 정합성을 dry-run 으로 측정.
        // 실제 elements.updateMany / meta.set 은 E-6 (write-through) 단계.
        const metaRecord = await db.meta.get(projectId);
        if (!metaRecord || metaRecord.schemaVersion === "legacy") {
          const migrationCanonicalDoc = selectCanonicalDocument(
            useStore.getState(),
            storePages,
            useLayoutsStore.getState().layouts,
          );
          const migrationResult = await runLegacyToCanonicalMigration(
            db,
            projectId,
            { canonicalDoc: migrationCanonicalDoc },
          );
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[ADR-903 P3-E E-4] migration dry-run: status=${migrationResult.status}, transformations=${migrationResult.transformations.length}, errors=${migrationResult.errors.length}`,
            );
          }
        }

        // IDB 영속 정리: orphan 된 SelectItem/ComboBoxItem/ListBoxItem(+subtree) 행 제거
        // (undo 스택 미오염)
        if (orphanIds.length > 0) {
          void db.elements.deleteMany(orphanIds).catch((err) => {
            console.warn(
              "[ADR-076] Collection items orphan cleanup failed:",
              err,
            );
          });
        }

        // 4. order_num이 0인 페이지(Home)를 우선 선택, 없으면 첫 번째 페이지 선택
        if (apiPages.length > 0) {
          const homePage = apiPages.find((p) => p.order_num === 0);
          const pageToSelect = homePage || apiPages[0];

          const { setCurrentPageId, setSelectedElement } = useStore.getState();
          setCurrentPageId(pageToSelect.id);
          setSelectedPageId(pageToSelect.id);

          const bodyElement = mergedElements.find(
            (el) => el.page_id === pageToSelect.id && el.order_num === 0,
          );
          if (bodyElement) {
            if (requestAutoSelectAfterUpdate) {
              requestAutoSelectAfterUpdate(bodyElement.id);
            }
            setSelectedElement(bodyElement.id);
          }
        }

        initializingRef.current = null;
        return { success: true, data: apiPages };
      } catch (error) {
        console.error("프로젝트 초기화 에러:", error);
        initializingRef.current = null;
        return { success: false, error: error as Error };
      }
    },
    [pageList, requestAutoSelectAfterUpdate],
  );

  /**
   * loadPageIfNeeded - 페이지가 로드되지 않았으면 로드
   * 🚀 Phase 5: Lazy Loading 통합
   *
   * @param pageId - 로드할 페이지 ID
   */
  const loadPageIfNeeded = useCallback(
    async (pageId: string): Promise<void> => {
      if (!pageId) return;
      if (!lazyLoadingEnabled) return;

      const { isPageLoaded, lazyLoadPageElements } = useStore.getState();
      // 이미 로드됨 - 스킵
      if (isPageLoaded(pageId)) {
        console.log(
          `📦 [loadPageIfNeeded] Page already loaded: ${pageId.slice(0, 8)}`,
        );
        return;
      }

      // Lazy Load 실행
      console.log(`🔄 [loadPageIfNeeded] Loading page: ${pageId.slice(0, 8)}`);
      await lazyLoadPageElements(pageId);
    },
    [lazyLoadingEnabled],
  );

  return {
    pages,
    selectedPageId,
    setSelectedPageId,
    isCreatingPage,
    fetchElements,
    addPage,
    addPageWithParams,
    initializeProject,
    loadPageIfNeeded,
    pageList, // 직접 접근 (필요시)
  };
};
