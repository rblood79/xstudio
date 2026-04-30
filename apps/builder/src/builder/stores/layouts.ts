/**
 * Layouts Store - Zustand Store for Layout Management
 *
 * Layout/Slot System의 핵심 상태 관리
 * Factory Pattern으로 액션을 분리하여 코드 재사용성 향상
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StateCreator } from "zustand";
import type {
  Layout,
  SlotInfo,
  LayoutsStoreState,
  LayoutsStoreActions,
} from "../../types/builder/layout.types";
import {
  createFetchLayoutsAction,
  createCreateLayoutAction,
  createUpdateLayoutAction,
  createDeleteLayoutAction,
  createDuplicateLayoutAction,
  createSetCurrentLayoutAction,
  createGetLayoutByIdAction,
  createGetLayoutSlotsAction,
  createValidateLayoutDeleteAction,
} from "./utils/layoutActions";
import { getLiveElementsState } from "./rootStoreAccess";

// ============================================
// Store Type
// ============================================

type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;

// ============================================
// Store Slice Creator
// ============================================

export const createLayoutsSlice: StateCreator<LayoutsStore> = (set, get) => {
  // Factory 함수로 액션 생성
  // ⭐ Layout/Slot System: fetchLayouts에 get 추가 (자동 선택용)
  const fetchLayouts = createFetchLayoutsAction(set, get);
  const createLayout = createCreateLayoutAction(set, get);
  const updateLayout = createUpdateLayoutAction(set, get);
  const deleteLayout = createDeleteLayoutAction(set, get);
  const duplicateLayout = createDuplicateLayoutAction(set, get);
  const setCurrentLayout = createSetCurrentLayoutAction(set);
  const getLayoutById = createGetLayoutByIdAction(get);

  // getLayoutSlots는 elements store에 의존하므로 특별 처리
  const getLayoutSlots = (layoutId: string): SlotInfo[] => {
    const getElements = () => getLiveElementsState().elements;
    return createGetLayoutSlotsAction(get, getElements)(layoutId);
  };

  const validateLayoutDelete = createValidateLayoutDeleteAction();

  return {
    // ============================================
    // State
    // ============================================
    layouts: [],
    // P3-B: selectedReusableFrameId (canonical semantics) + currentLayoutId (backward-compat alias)
    selectedReusableFrameId: null,
    currentLayoutId: null,
    isLoading: false,
    error: null,

    // ============================================
    // Actions
    // ============================================

    // CRUD
    fetchLayouts,
    createLayout,
    updateLayout,
    deleteLayout,
    duplicateLayout,

    // Selection
    setCurrentLayout,

    // Utilities
    getLayoutById,
    getLayoutSlots,
    validateLayoutDelete,
  };
};

// ============================================
// Store Instance
// P3-B: persist — selectedReusableFrameId (canonical) + currentLayoutId (backward-compat)
// 새로고침 후 양쪽 모두 복원하여 selectedReusableFrameId 초기화 방지 (안전망 #6)
// ============================================

export const useLayoutsStore = create<LayoutsStore>()(
  persist(createLayoutsSlice, {
    name: "composition-layouts",
    // P3-B: selectedReusableFrameId 저장. currentLayoutId는 backward-compat 유지.
    partialize: (state) => ({
      selectedReusableFrameId: state.selectedReusableFrameId,
      // @deprecated — P3-D 완료 후 제거
      currentLayoutId: state.currentLayoutId,
    }),
  }),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

/**
 * 현재 선택된 reusable frame id (canonical semantics).
 * P3-B: `currentLayoutId` → `selectedReusableFrameId` rename.
 */
export const useSelectedReusableFrameId = (): string | null => {
  return useLayoutsStore((state) => state.selectedReusableFrameId);
};

/**
 * 현재 선택된 Layout 가져오기
 *
 * @deprecated P3-B: `useSelectedReusableFrameId()` 사용 권장.
 * backward-compat — P3-D 완료 후 제거 예정.
 */
export const useCurrentLayout = (): Layout | undefined => {
  // P3-B: selectedReusableFrameId 우선, legacy currentLayoutId fallback
  const frameId = useLayoutsStore(
    (state) => state.selectedReusableFrameId ?? state.currentLayoutId,
  );
  const layouts = useLayoutsStore((state) => state.layouts);
  return layouts.find((l) => l.id === frameId);
};

/**
 * Layout 목록 가져오기
 */
export const useLayouts = (): Layout[] => {
  return useLayoutsStore((state) => state.layouts);
};

/**
 * Layout 로딩 상태 가져오기
 */
export const useLayoutsLoading = (): boolean => {
  return useLayoutsStore((state) => state.isLoading);
};

/**
 * Layout 에러 상태 가져오기
 */
export const useLayoutsError = (): Error | null => {
  return useLayoutsStore((state) => state.error);
};
