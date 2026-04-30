/**
 * Layout Store Actions - Factory Pattern
 *
 * 각 액션을 독립적인 팩토리 함수로 분리하여
 * 테스트 용이성과 코드 재사용성을 높임
 *
 * ✅ IndexedDB 사용 (Supabase 대신)
 */

import type { StateCreator } from "zustand";
import { getDB } from "../../../lib/db";
import type {
  Layout,
  LayoutCreate,
  LayoutUpdate,
  SlotInfo,
  LayoutsStoreState,
  LayoutsStoreActions,
} from "../../../types/builder/layout.types";
import type { Element, Page } from "../../../types/builder/unified.types";
import { getDefaultProps } from "../../../types/builder/unified.types";
import { selectCanonicalDocument } from "../elements";
import { getLiveElementsState } from "../rootStoreAccess";
import type { FrameNode } from "@composition/shared";

// Type aliases for set/get
type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;
type SetState = Parameters<StateCreator<LayoutsStore>>[0];
type GetState = Parameters<StateCreator<LayoutsStore>>[1];

function sortLayouts(layouts: Layout[]): Layout[] {
  return [...layouts].sort((a, b) => {
    const orderDiff = (a.order_num || 0) - (b.order_num || 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

function mergeFetchResultWithConcurrentLocalChanges(
  fetchedLayouts: Layout[],
  layoutsAtFetchStart: Layout[],
  currentLayouts: Layout[],
  projectId: string,
): Layout[] {
  const startById = new Map(
    layoutsAtFetchStart.map((layout) => [layout.id, layout]),
  );
  const currentById = new Map(
    currentLayouts.map((layout) => [layout.id, layout]),
  );
  const mergedById = new Map<string, Layout>();

  for (const fetchedLayout of fetchedLayouts) {
    const startedWithLayout = startById.get(fetchedLayout.id);
    const currentLayout = currentById.get(fetchedLayout.id);

    if (currentLayout && currentLayout !== startedWithLayout) {
      mergedById.set(fetchedLayout.id, currentLayout);
      continue;
    }

    mergedById.set(fetchedLayout.id, fetchedLayout);
  }

  for (const currentLayout of currentLayouts) {
    if (currentLayout.project_id !== projectId) continue;
    if (mergedById.has(currentLayout.id)) continue;

    const startedWithLayout = startById.get(currentLayout.id);
    if (currentLayout !== startedWithLayout) {
      mergedById.set(currentLayout.id, currentLayout);
    }
  }

  for (const startedLayout of layoutsAtFetchStart) {
    if (startedLayout.project_id !== projectId) continue;
    if (!currentById.has(startedLayout.id)) {
      mergedById.delete(startedLayout.id);
    }
  }

  return sortLayouts(Array.from(mergedById.values()));
}

function frameMatchesLegacyLayoutId(
  frame: FrameNode,
  layoutId: string,
): boolean {
  const metadata = frame.metadata as { layoutId?: string } | undefined;
  return (
    frame.id === layoutId ||
    frame.id === `layout-${layoutId}` ||
    metadata?.layoutId === layoutId
  );
}

function collectFrameSlotNames(frame: FrameNode): string[] {
  if (Array.isArray(frame.slot)) {
    return frame.slot;
  }

  const slotNames: string[] = [];
  const visit = (nodes: readonly unknown[]) => {
    for (const node of nodes) {
      const candidate = node as {
        type?: string;
        placeholder?: boolean;
        metadata?: { slotName?: string };
        name?: string;
        children?: readonly unknown[];
      };
      if (candidate.type === "frame" && candidate.placeholder === true) {
        const slotName = candidate.metadata?.slotName ?? candidate.name;
        if (slotName) {
          slotNames.push(slotName);
        }
      }
      if (candidate.children) {
        visit(candidate.children);
      }
    }
  };

  visit(frame.children ?? []);
  return slotNames;
}

// ============================================
// CRUD Actions
// ============================================

/**
 * 프로젝트의 모든 Layout을 가져오는 액션
 * ⭐ Layout/Slot System: order_num === 0인 레이아웃 우선 선택 (Pages 탭과 동일 패턴)
 */
export const createFetchLayoutsAction =
  (set: SetState, get: GetState) =>
  async (projectId: string): Promise<void> => {
    const layoutsAtFetchStart = get().layouts;
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();
      const data = await (
        db as unknown as {
          layouts: { getByProject: (projectId: string) => Promise<Layout[]> };
        }
      ).layouts.getByProject(projectId);

      const sortedData = sortLayouts(data || []);
      const currentLayouts = get().layouts;
      const nextLayouts = mergeFetchResultWithConcurrentLocalChanges(
        sortedData,
        layoutsAtFetchStart,
        currentLayouts,
        projectId,
      );

      // P3-B: selectedReusableFrameId (canonical) 우선, currentLayoutId fallback
      // ADR-903 P3-B 안전망 #4 — dev-only migration 경고 logging
      const { selectedReusableFrameId, currentLayoutId } = get();
      if (
        process.env.NODE_ENV === "development" &&
        currentLayoutId !== null &&
        selectedReusableFrameId === null
      ) {
        console.warn(
          "[ADR-903 P3-B] currentLayoutId 직접 접근 감지. " +
            "selectedReusableFrameId 로 마이그레이션 필요. " +
            "P3-D 완료 후 currentLayoutId 참조 제거 예정.",
        );
      }

      // P3-B: selectedReusableFrameId 우선 사용
      const activeFrameId = selectedReusableFrameId ?? currentLayoutId;

      // 저장된 id가 실제 레이아웃 목록에 있는지 확인
      const isCurrentLayoutValid =
        activeFrameId && nextLayouts.some((l) => l.id === activeFrameId);

      // 자동 선택 조건: 레이아웃이 있고 (선택된 게 없거나 유효하지 않으면)
      const shouldAutoSelect = nextLayouts.length > 0 && !isCurrentLayoutValid;

      // ⭐ order_num === 0인 Layout 우선 선택, 없으면 첫 번째 선택 (Pages 탭과 동일)
      const defaultLayout =
        nextLayouts.find((l) => l.order_num === 0) || nextLayouts[0];
      const newFrameId = shouldAutoSelect
        ? (defaultLayout?.id ?? null)
        : isCurrentLayoutValid
          ? activeFrameId
          : null;

      set({
        layouts: nextLayouts,
        isLoading: false,
        // P3-B: 양쪽 동기화 (backward-compat)
        selectedReusableFrameId: newFrameId,
        currentLayoutId: newFrameId,
      });
    } catch (error) {
      console.error("❌ Layout 목록 조회 실패:", error);
      set({ error: error as Error, isLoading: false });
    }
  };

/**
 * 새 Layout을 생성하는 액션
 * ⭐ Layout/Slot System: Layout 생성 시 body 요소도 함께 생성
 */
export const createCreateLayoutAction =
  (set: SetState, get: GetState) =>
  async (data: LayoutCreate): Promise<Layout> => {
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();
      const newLayout: Layout = {
        id: crypto.randomUUID(),
        name: data.name,
        project_id: data.project_id,
        description: data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (
        db as unknown as {
          layouts: { insert: (layout: Layout) => Promise<Layout> };
        }
      ).layouts.insert(newLayout);

      // ⭐ Layout/Slot System: Layout용 body 요소 생성
      const bodyElement: Element = {
        id: crypto.randomUUID(),
        type: "body",
        props: getDefaultProps("body") as Element["props"],
        parent_id: null,
        page_id: null, // Layout 요소는 page_id 없음
        layout_id: newLayout.id, // Layout ID 설정
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.elements.insert(bodyElement);

      // ⭐ Layout/Slot System: body 요소를 elements 스토어에도 추가
      const { mergeElements } = getLiveElementsState();
      mergeElements([bodyElement]);

      // 메모리 상태 업데이트
      const { layouts } = get();
      set({
        layouts: [...layouts, newLayout],
        selectedReusableFrameId: newLayout.id,
        currentLayoutId: newLayout.id,
        isLoading: false,
      });

      return newLayout;
    } catch (error) {
      console.error("❌ Layout 생성 실패:", error);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  };

/**
 * Layout을 업데이트하는 액션
 */
export const createUpdateLayoutAction =
  (set: SetState, get: GetState) =>
  async (id: string, updates: LayoutUpdate): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();
      await (
        db as unknown as {
          layouts: {
            update: (id: string, updates: LayoutUpdate) => Promise<Layout>;
          };
        }
      ).layouts.update(id, updates);

      // 메모리 상태 업데이트
      const { layouts } = get();
      set({
        layouts: layouts.map((layout) =>
          layout.id === id
            ? { ...layout, ...updates, updated_at: new Date().toISOString() }
            : layout,
        ),
        isLoading: false,
      });
    } catch (error) {
      console.error("❌ Layout 업데이트 실패:", error);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  };

/**
 * Layout을 삭제하는 액션
 * ⭐ Layout 삭제 시 관련 데이터도 정리:
 * 1. Layout을 사용하는 Page들의 layout_id를 null로 설정
 * 2. Layout의 모든 elements 삭제
 */
export const createDeleteLayoutAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();

      // ADR-903 P3-D-3: canonical document 가드.
      // canonical tree 에 해당 reusable frame 이 존재할 때만 cascade 실행.
      // (frame 미존재 = stale layout 또는 이미 detach 된 노드 → cascade skip)
      const elementsStateForGuard = getLiveElementsState();
      const layoutsForGuard = get().layouts;
      const canonicalDoc = selectCanonicalDocument(
        elementsStateForGuard,
        elementsStateForGuard.pages,
        layoutsForGuard,
      );
      const frameExists = canonicalDoc.children.some(
        (n): n is FrameNode =>
          n.type === "frame" &&
          n.reusable === true &&
          frameMatchesLegacyLayoutId(n, id),
      );

      // 1. ⭐ Layout을 사용하는 Page들의 layout_id를 null로 설정.
      // canonical frame projection 이 없어서 element cascade 를 skip 하더라도,
      // 삭제되는 layout row 를 가리키는 page ref 는 orphan 으로 남기지 않는다.
      const allPages = await db.pages.getAll();
      const pagesUsingLayout = allPages.filter(
        (p) => (p as Page & { layout_id?: string }).layout_id === id,
      );

      if (pagesUsingLayout.length > 0) {
        await Promise.all(
          pagesUsingLayout.map((page) =>
            db.pages.update(page.id, { layout_id: null }),
          ),
        );

        // 메모리 상태의 pages도 업데이트
        const { pages, setPages } = getLiveElementsState();
        const updatedPages = pages.map((p) =>
          pagesUsingLayout.some((up) => up.id === p.id)
            ? { ...p, layout_id: null }
            : p,
        );
        setPages(updatedPages);
      }

      if (frameExists) {
        // 2. ⭐ Layout의 모든 elements 삭제
        // P3-D 과도기: layout_id 기반 DB 로딩 cascade 유지 (P3-E 에서 canonical descendants 기반으로 전환)
        const allElements = await db.elements.getAll();
        const layoutElements = allElements.filter((el) => el.layout_id === id);

        if (layoutElements.length > 0) {
          await Promise.all(
            layoutElements.map((el) => db.elements.delete(el.id)),
          );

          // 메모리 상태의 elements도 업데이트
          const { removeElements } = getLiveElementsState();
          await removeElements(layoutElements.map((el) => el.id));
        }
      }

      // 3. Layout 삭제 (frame 존재 여부와 무관하게 항상 진행 — stale layout row 정리)
      await (
        db as unknown as { layouts: { delete: (id: string) => Promise<void> } }
      ).layouts.delete(id);

      // 메모리 상태 업데이트
      const { layouts, selectedReusableFrameId, currentLayoutId } = get();
      const nextFrameId =
        (selectedReusableFrameId ?? currentLayoutId) === id
          ? null
          : (selectedReusableFrameId ?? currentLayoutId);
      set({
        layouts: layouts.filter((layout) => layout.id !== id),
        // P3-B: 양쪽 동기화 — 삭제된 frame이면 선택 해제
        selectedReusableFrameId: nextFrameId,
        // @deprecated backward-compat
        currentLayoutId: nextFrameId,
        isLoading: false,
      });
    } catch (error) {
      console.error("❌ Layout 삭제 실패:", error);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  };

/**
 * Layout을 복제하는 액션
 */
export const createDuplicateLayoutAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<Layout> => {
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();

      // 1. 원본 Layout 가져오기
      const { layouts } = get();
      const originalLayout = layouts.find((l) => l.id === id);

      if (!originalLayout) {
        throw new Error(`Layout not found: ${id}`);
      }

      // 2. 새 Layout 생성 (이름에 " (Copy)" 추가)
      const newLayout: Layout = {
        id: crypto.randomUUID(),
        name: `${originalLayout.name} (Copy)`,
        project_id: originalLayout.project_id,
        description: originalLayout.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (
        db as unknown as {
          layouts: { insert: (layout: Layout) => Promise<Layout> };
        }
      ).layouts.insert(newLayout);

      // 3. 원본 Layout의 elements 복제 (IndexedDB에서 가져오기)
      const allElements = await db.elements.getAll();
      const originalElements = allElements.filter((el) => el.layout_id === id);

      if (originalElements && originalElements.length > 0) {
        // ID 매핑 (원본 ID → 새 ID)
        const idMap = new Map<string, string>();

        // 새 ID 생성
        originalElements.forEach((el) => {
          idMap.set(el.id, crypto.randomUUID());
        });

        // Elements 복제 (새 ID와 새 layout_id 사용)
        const newElements = originalElements.map((el) => ({
          ...el,
          id: idMap.get(el.id)!,
          layout_id: newLayout.id,
          parent_id: el.parent_id ? idMap.get(el.parent_id) || null : null,
          page_id: null, // Layout element는 page_id 없음
        }));

        await db.elements.insertMany(newElements as Element[]);

        // 복제 직후 Frames 탭/Skia authoring surface 에 새 body/slot 이 즉시
        // 보이도록 DB write-through 와 메모리 store 를 같은 턴에 동기화한다.
        const { mergeElements } = getLiveElementsState();
        mergeElements(newElements as Element[]);
      }

      // 4. 메모리 상태 업데이트
      set({
        layouts: [...get().layouts, newLayout],
        isLoading: false,
      });

      return newLayout;
    } catch (error) {
      console.error("❌ Layout 복제 실패:", error);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  };

// ============================================
// Selection Actions
// ============================================

/**
 * 현재 편집 중인 Layout 설정
 *
 * P3-B: selectedReusableFrameId (canonical) + currentLayoutId (backward-compat) 양쪽 동기화.
 */
export const createSetCurrentLayoutAction =
  (set: SetState) =>
  (layoutId: string | null): void => {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[ADR-903 P3-B] setCurrentLayout 호출 감지. " +
          "P3-D 완료 후 selectedReusableFrameId 직접 설정으로 교체 예정.",
      );
    }
    // P3-B: 양쪽 동기화
    set({ selectedReusableFrameId: layoutId, currentLayoutId: layoutId });
  };

// ============================================
// Utility Actions
// ============================================

/**
 * ID로 Layout 조회
 */
export const createGetLayoutByIdAction =
  (get: GetState) =>
  (id: string): Layout | undefined => {
    const { layouts } = get();
    return layouts.find((layout) => layout.id === id);
  };

/**
 * Layout의 모든 Slot 정보 조회
 *
 * ADR-903 P3-D-3: canonical document 의 FrameNode.slot 직접 조회.
 * `getElements` 파라미터는 호환성 유지를 위해 시그니처에 남기되 사용하지 않는다.
 * (P3-E 에서 시그니처 정리 예정)
 */
export const createGetLayoutSlotsAction =
  (get: GetState, _getElements: () => Element[]) =>
  (layoutId: string): SlotInfo[] => {
    const elementsState = getLiveElementsState();
    const { pages } = elementsState;
    const { layouts } = get();
    const doc = selectCanonicalDocument(elementsState, pages, layouts);

    const frame = doc.children.find(
      (n): n is FrameNode =>
        n.type === "frame" &&
        n.reusable === true &&
        frameMatchesLegacyLayoutId(n, layoutId),
    );

    if (!frame) {
      return [];
    }

    const slotNames = collectFrameSlotNames(frame);
    if (slotNames.length === 0) {
      return [];
    }

    return slotNames.map((slotName) => ({
      name: slotName,
      displayName: slotName,
      required: false,
      description: undefined,
      // canonical 경로는 elementId 미사용 — slot 채우기는 descendants 로 표현 (composition-document.types.ts:215)
      elementId: "",
    }));
  };

/**
 * Layout 삭제 전 유효성 검사
 * - 이 Layout을 사용하는 Page가 있는지 확인
 */
export const createValidateLayoutDeleteAction =
  () =>
  async (
    id: string,
  ): Promise<{ canDelete: boolean; usedByPages: string[] }> => {
    try {
      const db = await getDB();
      const allPages = await db.pages.getAll();
      const pagesUsingLayout = allPages.filter(
        (p) => (p as Page & { layout_id?: string }).layout_id === id,
      );

      const pageIds = pagesUsingLayout.map((p) => p.id);

      return {
        canDelete: pageIds.length === 0,
        usedByPages: pageIds,
      };
    } catch (error) {
      console.error("❌ Layout 삭제 유효성 검사 실패:", error);
      return { canDelete: false, usedByPages: [] };
    }
  };
