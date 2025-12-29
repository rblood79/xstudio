/**
 * Canvas Store (Direct Zustand Access)
 *
 * 🚀 Phase 10 B2.4: postMessage 없이 직접 스토어 접근
 *
 * WebGL Canvas는 이 스토어를 통해 Builder 상태에 직접 접근합니다.
 * 기존 iframe + postMessage 패턴을 대체합니다.
 *
 * ⚠️ 그리드 설정은 canvasSettings.ts (Single Source of Truth)에서 관리
 * 이 스토어는 뷰포트/편집 상태만 관리
 *
 * @since 2025-12-11 Phase 10 B2.4
 * @moved 2024-12-29 workspace/canvas/store/ → builder/stores/
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useStore } from '.';

// ============================================
// Types
// ============================================

interface CanvasState {
  // 캔버스 뷰포트 상태
  zoom: number;
  panX: number;
  panY: number;

  // 편집 상태
  isEditing: boolean;
  editingElementId: string | null;

  // 액션
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setEditing: (isEditing: boolean, elementId?: string | null) => void;
  resetView: () => void;
}

// ============================================
// Store
// ============================================

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector((set) => ({
    // Initial State
    zoom: 1,
    panX: 0,
    panY: 0,
    isEditing: false,
    editingElementId: null,

    // Actions
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

    setPan: (x, y) => set({ panX: x, panY: y }),

    setEditing: (isEditing, elementId = null) =>
      set({ isEditing, editingElementId: elementId }),

    resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  }))
);

// ============================================
// Grid Settings (from canvasSettings.ts - Single Source of Truth)
// ============================================

/**
 * 그리드 설정 가져오기 (canvasSettings.ts에서)
 * canvasStore에서 중복 제거, canvasSettings.ts를 Single Source of Truth로 사용
 */
export function useCanvasGridSettings() {
  const showGrid = useStore((state) => state.showGrid);
  const snapToGrid = useStore((state) => state.snapToGrid);
  const gridSize = useStore((state) => state.gridSize);

  return { showGrid, snapToGrid, gridSize };
}

/**
 * 그리드 설정 변경 (canvasSettings.ts로 위임)
 */
export function useCanvasSetGridSettings() {
  const setShowGrid = useStore((state) => state.setShowGrid);
  const setSnapToGrid = useStore((state) => state.setSnapToGrid);
  const setGridSize = useStore((state) => state.setGridSize);

  return { setShowGrid, setSnapToGrid, setGridSize };
}

// ============================================
// Selectors (Direct Builder Store Access)
// ============================================

/**
 * Builder 스토어에서 현재 페이지 요소들 가져오기
 * postMessage 없이 직접 접근
 */
export function useCanvasElements() {
  const currentPageId = useStore((state) => state.currentPageId);
  const elements = useStore((state) => state.elements);

  return elements.filter(
    (el) => el.page_id === currentPageId && !el.deleted
  );
}

/**
 * Builder 스토어에서 선택된 요소 가져오기
 */
export function useCanvasSelectedElement() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const elements = useStore((state) => state.elements);

  if (!selectedElementId) return null;
  return elements.find((el) => el.id === selectedElementId) || null;
}

/**
 * Builder 스토어에서 선택된 요소 ID들 가져오기 (다중 선택)
 */
export function useCanvasSelectedElementIds() {
  return useStore((state) => state.selectedElementIds);
}

/**
 * Builder 스토어의 updateElementProps 직접 접근
 */
export function useCanvasUpdateElement() {
  return useStore((state) => state.updateElementProps);
}

/**
 * Builder 스토어의 setSelectedElement 직접 접근
 */
export function useCanvasSetSelectedElement() {
  return useStore((state) => state.setSelectedElement);
}

// ============================================
// Migration Helpers
// ============================================

/**
 * @deprecated postMessage 기반 시스템에서 마이그레이션 중
 * WebGL Canvas는 useCanvasElements()를 사용하세요
 */
export function getElementsFromStore() {
  console.warn(
    '[DEPRECATED] getElementsFromStore() is deprecated. Use useCanvasElements() hook instead.'
  );
  return useStore.getState().elements;
}

export default useCanvasStore;
