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
import { useStore } from "../elements";

// Type aliases for set/get
type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;
type SetState = Parameters<StateCreator<LayoutsStore>>[0];
type GetState = Parameters<StateCreator<LayoutsStore>>[1];

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
    set({ isLoading: true, error: null });

    try {
      const db = await getDB();
      const data = await (db as unknown as { layouts: { getByProject: (projectId: string) => Promise<Layout[]> } }).layouts.getByProject(projectId);

      // Sort by order_num first, then by name
      const sortedData = (data || []).sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });

      // ⭐ Layout/Slot System: 저장된 currentLayoutId가 유효한지 검증
      const { currentLayoutId } = get();

      // 저장된 currentLayoutId가 실제 레이아웃 목록에 있는지 확인
      const isCurrentLayoutValid = currentLayoutId && sortedData.some((l) => l.id === currentLayoutId);

      // 자동 선택 조건: 레이아웃이 있고 (선택된 게 없거나 유효하지 않으면)
      const shouldAutoSelect = sortedData.length > 0 && !isCurrentLayoutValid;

      // ⭐ order_num === 0인 Layout 우선 선택, 없으면 첫 번째 선택 (Pages 탭과 동일)
      const defaultLayout = sortedData.find((l) => l.order_num === 0) || sortedData[0];
      const newCurrentLayoutId = shouldAutoSelect ? defaultLayout?.id : (isCurrentLayoutValid ? currentLayoutId : null);

      set({
        layouts: sortedData,
        isLoading: false,
        currentLayoutId: newCurrentLayoutId,
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

      await (db as unknown as { layouts: { insert: (layout: Layout) => Promise<Layout> } }).layouts.insert(newLayout);

      // ⭐ Layout/Slot System: Layout용 body 요소 생성
      const bodyElement: Element = {
        id: crypto.randomUUID(),
        tag: "body",
        props: {} as Element["props"],
        parent_id: null,
        page_id: null, // Layout 요소는 page_id 없음
        layout_id: newLayout.id, // Layout ID 설정
        order_num: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.elements.insert(bodyElement);

      // ⭐ Layout/Slot System: body 요소를 elements 스토어에도 추가
      const { elements, setElements } = useStore.getState();
      setElements([...elements, bodyElement]);

      // 메모리 상태 업데이트
      const { layouts } = get();
      set({
        layouts: [...layouts, newLayout],
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
      await (db as unknown as { layouts: { update: (id: string, updates: LayoutUpdate) => Promise<Layout> } }).layouts.update(id, updates);

      // 메모리 상태 업데이트
      const { layouts } = get();
      set({
        layouts: layouts.map((layout) =>
          layout.id === id ? { ...layout, ...updates, updated_at: new Date().toISOString() } : layout
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

      // 1. ⭐ Layout을 사용하는 Page들의 layout_id를 null로 설정
      const allPages = await db.pages.getAll();
      const pagesUsingLayout = allPages.filter(
        (p) => (p as Page & { layout_id?: string }).layout_id === id
      );

      if (pagesUsingLayout.length > 0) {
        await Promise.all(
          pagesUsingLayout.map((page) =>
            db.pages.update(page.id, { layout_id: null })
          )
        );

        // 메모리 상태의 pages도 업데이트
        const { pages, setPages } = useStore.getState();
        const updatedPages = pages.map((p) =>
          pagesUsingLayout.some((up) => up.id === p.id)
            ? { ...p, layout_id: null }
            : p
        );
        setPages(updatedPages);
      }

      // 2. ⭐ Layout의 모든 elements 삭제
      const allElements = await db.elements.getAll();
      const layoutElements = allElements.filter((el) => el.layout_id === id);

      if (layoutElements.length > 0) {
        await Promise.all(
          layoutElements.map((el) => db.elements.delete(el.id))
        );

        // 메모리 상태의 elements도 업데이트
        const { elements, setElements } = useStore.getState();
        const filteredElements = elements.filter((el) => el.layout_id !== id);
        setElements(filteredElements);
      }

      // 3. Layout 삭제
      await (db as unknown as { layouts: { delete: (id: string) => Promise<void> } }).layouts.delete(id);

      // 메모리 상태 업데이트
      const { layouts, currentLayoutId } = get();
      set({
        layouts: layouts.filter((layout) => layout.id !== id),
        // 삭제된 Layout이 현재 선택된 Layout이면 선택 해제
        currentLayoutId: currentLayoutId === id ? null : currentLayoutId,
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

      await (db as unknown as { layouts: { insert: (layout: Layout) => Promise<Layout> } }).layouts.insert(newLayout);

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
 */
export const createSetCurrentLayoutAction =
  (set: SetState) =>
  (layoutId: string | null): void => {
    set({ currentLayoutId: layoutId });
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
 * (실시간 조회 - elements store에서 가져옴)
 */
export const createGetLayoutSlotsAction =
  (get: GetState, getElements: () => Element[]) =>
  (layoutId: string): SlotInfo[] => {
    const elements = getElements();

    // Layout에 속한 Slot 요소들 필터링
    const slotElements = elements.filter(
      (el) => el.layout_id === layoutId && el.tag === "Slot"
    );

    return slotElements.map((el) => {
      const slotName = (el.props as { name?: string }).name;
      return {
        // 이름 없는 Slot은 elementId를 접미사로 사용하여 고유성 보장
        name: slotName || `slot_${el.id.slice(0, 8)}`,
        displayName: slotName || "unnamed",
        required: (el.props as { required?: boolean }).required || false,
        description: (el.props as { description?: string }).description,
        elementId: el.id,
      };
    });
  };

/**
 * Layout 삭제 전 유효성 검사
 * - 이 Layout을 사용하는 Page가 있는지 확인
 */
export const createValidateLayoutDeleteAction =
  () =>
  async (
    id: string
  ): Promise<{ canDelete: boolean; usedByPages: string[] }> => {
    try {
      const db = await getDB();
      const allPages = await db.pages.getAll();
      const pagesUsingLayout = allPages.filter((p) => (p as Page & { layout_id?: string }).layout_id === id);

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
