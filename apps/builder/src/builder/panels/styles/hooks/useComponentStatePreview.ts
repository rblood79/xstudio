/**
 * Component State Preview Store — ADR-067 Phase 6
 * Replaces Jotai previewComponentStateAtom with Zustand store
 */

import { create } from "zustand";
import type { ComponentState } from "@composition/specs";

export interface PreviewComponentState {
  elementId: string;
  state: ComponentState;
}

interface Store {
  preview: PreviewComponentState | null;
  setPreview: (value: PreviewComponentState | null) => void;
}

export const useComponentStatePreviewStore = create<Store>((set) => ({
  preview: null,
  setPreview: (value) => set({ preview: value }),
}));
