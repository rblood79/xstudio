/**
 * useSectionCollapse - 섹션 접기/펴기 상태 관리 훅
 *
 * Zustand + persist로 localStorage에 저장
 * 키보드 단축키:
 * - Alt/Option + S: 전체 펼침/접기
 * - Alt/Option + Shift + S: Focus Mode 토글
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SectionCollapseState {
  // State
  collapsedSections: Set<string>;
  focusMode: boolean; // Focus Mode: 한 번에 한 섹션만 펼침
  activeFocusSection: string | null; // Focus Mode에서 현재 활성 섹션

  // Actions
  toggleSection: (sectionId: string) => void;
  isCollapsed: (sectionId: string) => boolean;
  expandAll: () => void;
  collapseAll: () => void;
  toggleFocusMode: () => void;
  setFocusSection: (sectionId: string) => void;
}

export const useSectionCollapse = create<SectionCollapseState>()(
  persist(
    (set, get) => ({
      // Initial state: all sections expanded
      collapsedSections: new Set<string>(),
      focusMode: false,
      activeFocusSection: null,

      // Toggle a single section
      toggleSection: (sectionId: string) =>
        set((state) => {
          if (state.focusMode) {
            // Focus Mode: 클릭한 섹션으로 전환
            return { activeFocusSection: sectionId };
          } else {
            // Normal Mode: 토글
            const newSet = new Set(state.collapsedSections);
            if (newSet.has(sectionId)) {
              newSet.delete(sectionId);
            } else {
              newSet.add(sectionId);
            }
            return { collapsedSections: newSet };
          }
        }),

      // Check if a section is collapsed
      isCollapsed: (sectionId: string) => {
        const state = get();
        if (state.focusMode) {
          // Focus Mode: activeFocusSection이 아니면 접힘
          return state.activeFocusSection !== sectionId;
        } else {
          // Normal Mode: collapsedSections에 있으면 접힘
          return state.collapsedSections.has(sectionId);
        }
      },

      // Expand all sections
      expandAll: () => set({ collapsedSections: new Set() }),

      // Collapse all sections
      collapseAll: () =>
        set({
          collapsedSections: new Set([
            'transform',
            'layout',
            'appearance',
            'typography',
          ]),
        }),

      // Toggle Focus Mode
      toggleFocusMode: () =>
        set((state) => {
          const newFocusMode = !state.focusMode;
          return {
            focusMode: newFocusMode,
            // Focus Mode 활성화 시 첫 번째 섹션만 펼침
            activeFocusSection: newFocusMode ? 'transform' : null,
          };
        }),

      // Set active focus section
      setFocusSection: (sectionId: string) =>
        set((state) => {
          if (!state.focusMode) return state;
          return { activeFocusSection: sectionId };
        }),
    }),
    {
      name: 'styles-panel-collapse', // localStorage key
      // Custom serialization for Set
      partialize: (state) => ({
        collapsedSections: Array.from(state.collapsedSections),
        focusMode: state.focusMode,
        activeFocusSection: state.activeFocusSection,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        collapsedSections: new Set(persistedState?.collapsedSections || []),
        focusMode: persistedState?.focusMode || false,
        activeFocusSection: persistedState?.activeFocusSection || null,
      }),
    }
  )
);
