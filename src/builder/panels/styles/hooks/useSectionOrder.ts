/**
 * useSectionOrder - 섹션 순서 관리 훅
 *
 * Zustand + persist로 localStorage에 저장
 * React Aria GridList의 useDragAndDrop와 통합
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SectionOrderState {
  // State
  sectionOrder: string[];

  // Actions
  setSectionOrder: (order: string[]) => void;
  resetOrder: () => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
}

const DEFAULT_ORDER = ['transform', 'layout', 'appearance', 'typography'];

export const useSectionOrder = create<SectionOrderState>()(
  persist(
    (set) => ({
      // Initial order
      sectionOrder: DEFAULT_ORDER,

      // Set custom order
      setSectionOrder: (order: string[]) => set({ sectionOrder: order }),

      // Reset to default order
      resetOrder: () => set({ sectionOrder: DEFAULT_ORDER }),

      // Move a section from one index to another
      moveSection: (fromIndex: number, toIndex: number) =>
        set((state) => {
          const newOrder = [...state.sectionOrder];
          const [movedItem] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, movedItem);
          return { sectionOrder: newOrder };
        }),
    }),
    {
      name: 'styles-panel-order', // localStorage key
    }
  )
);
