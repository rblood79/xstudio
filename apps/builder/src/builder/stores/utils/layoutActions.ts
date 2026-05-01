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
import type { Element } from "../../../types/builder/unified.types";
import { selectCanonicalDocument } from "../elements";
import { getLiveElementsState } from "../rootStoreAccess";
import { mergeElementsCanonicalPrimary } from "../../../adapters/canonical/canonicalMutations";
import {
  applyDeleteReusableFrameCanonicalPrimary,
  createFrameBodyElement,
  duplicateReusableFrameElementsCanonicalPrimary,
  getPageIdsUsingFrameMirror,
} from "../../../adapters/canonical/frameLayoutCascade";
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

      const { selectedReusableFrameId } = get();
      const activeFrameId = selectedReusableFrameId;

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
        selectedReusableFrameId: newFrameId,
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
      const bodyElement = createFrameBodyElement(newLayout.id);

      await db.elements.insert(bodyElement);

      const { layouts } = get();
      set({
        layouts: [...layouts, newLayout],
        selectedReusableFrameId: newLayout.id,
        isLoading: false,
      });

      // ⭐ Layout/Slot System: body 요소를 elements 스토어에도 추가
      // layouts state 갱신 후 canonical merge 를 호출해야 새 reusable frame
      // shell 이 canonical document 에 함께 반영된다.
      mergeElementsCanonicalPrimary([bodyElement]);

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
 * 1. Layout을 사용하는 Page들의 legacy layout binding을 null로 설정
 * 2. Layout의 모든 elements 삭제
 */
export const createDeleteLayoutAction =
  (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();

      const layoutsForGuard = get().layouts;

      const { setPages, setElements } = getLiveElementsState();
      await applyDeleteReusableFrameCanonicalPrimary({
        frameId: id,
        layouts: layoutsForGuard,
        getElementsState: getLiveElementsState,
        setPages,
        setElements,
      });

      // Layout 삭제 (frame 존재 여부와 무관하게 항상 진행 — stale layout row 정리)
      await (
        db as unknown as { layouts: { delete: (id: string) => Promise<void> } }
      ).layouts.delete(id);

      // 메모리 상태 업데이트
      const { layouts, selectedReusableFrameId } = get();
      const nextFrameId =
        selectedReusableFrameId === id ? null : selectedReusableFrameId;
      set({
        layouts: layouts.filter((layout) => layout.id !== id),
        selectedReusableFrameId: nextFrameId,
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

      set({
        layouts: [...get().layouts, newLayout],
      });

      // 3. 원본 reusable frame subtree 복제.
      await duplicateReusableFrameElementsCanonicalPrimary({
        sourceFrameId: id,
        targetFrameId: newLayout.id,
      });

      // 4. 메모리 상태 업데이트
      set({
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
 */
export const createSetCurrentLayoutAction =
  (set: SetState) =>
  (layoutId: string | null): void => {
    set({ selectedReusableFrameId: layoutId });
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
      const pageIds = await getPageIdsUsingFrameMirror(id);

      return {
        canDelete: pageIds.length === 0,
        usedByPages: pageIds,
      };
    } catch (error) {
      console.error("❌ Layout 삭제 유효성 검사 실패:", error);
      return { canDelete: false, usedByPages: [] };
    }
  };
