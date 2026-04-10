import { create } from "zustand";

export interface CompareModeState {
  /** Compare mode 활성화 여부 (Preview + Skia 분할) */
  isCompareMode: boolean;
  /** Compare mode 토글 */
  toggleCompareMode: () => void;
  /** Compare mode 설정 */
  setCompareMode: (enabled: boolean) => void;
}

export const useCompareModeStore = create<CompareModeState>()((set) => ({
  // 초기값: Skia only (false)
  isCompareMode: false,

  toggleCompareMode: () => {
    set((state) => ({ isCompareMode: !state.isCompareMode }));
  },

  setCompareMode: (enabled) => {
    set({ isCompareMode: enabled });
  },
}));
