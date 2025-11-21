/**
 * Layouts Store - Zustand Store for Layout Management
 *
 * Layout/Slot System의 핵심 상태 관리
 * Factory Pattern으로 액션을 분리하여 코드 재사용성 향상
 */

import { create } from "zustand";
import type { StateCreator } from "zustand";
import type {
  Layout,
  LayoutCreate,
  LayoutUpdate,
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
import { useStore } from "./elements";

// ============================================
// Store Type
// ============================================

type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;

// ============================================
// Store Slice Creator
// ============================================

export const createLayoutsSlice: StateCreator<LayoutsStore> = (set, get) => {
  // Factory 함수로 액션 생성
  const fetchLayouts = createFetchLayoutsAction(set);
  const createLayout = createCreateLayoutAction(set, get);
  const updateLayout = createUpdateLayoutAction(set, get);
  const deleteLayout = createDeleteLayoutAction(set, get);
  const duplicateLayout = createDuplicateLayoutAction(set, get);
  const setCurrentLayout = createSetCurrentLayoutAction(set);
  const getLayoutById = createGetLayoutByIdAction(get);

  // getLayoutSlots는 elements store에 의존하므로 특별 처리
  const getLayoutSlots = (layoutId: string): SlotInfo[] => {
    const getElements = () => useStore.getState().elements;
    return createGetLayoutSlotsAction(get, getElements)(layoutId);
  };

  const validateLayoutDelete = createValidateLayoutDeleteAction();

  return {
    // ============================================
    // State
    // ============================================
    layouts: [],
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
// ============================================

export const useLayoutsStore = create<LayoutsStore>(createLayoutsSlice);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

/**
 * 현재 선택된 Layout 가져오기
 */
export const useCurrentLayout = (): Layout | undefined => {
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);
  const layouts = useLayoutsStore((state) => state.layouts);
  return layouts.find((l) => l.id === currentLayoutId);
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
