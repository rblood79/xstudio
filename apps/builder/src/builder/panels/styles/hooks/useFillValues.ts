/**
 * useFillValues - Fill 섹션 전용 Zustand 훅
 *
 * ADR-067 Phase 5: Jotai 제거
 * - fills: element.props.fills 직접 구독
 * - activeFillIndex / colorInputMode: 스타일 패널 UI 전용 zustand store
 */

import { useMemo } from "react";
import { create } from "zustand";
import { useStore } from "../../../stores";
import type {
  FillItem,
  ColorInputMode,
} from "../../../../types/builder/fill.types";
import { ensureFills } from "../utils/fillMigration";

interface FillUIState {
  activeFillIndex: number;
  colorInputMode: ColorInputMode;
  setActiveFillIndex: (index: number) => void;
  setColorInputMode: (mode: ColorInputMode) => void;
}

export const useFillUIStore = create<FillUIState>((set) => ({
  activeFillIndex: 0,
  colorInputMode: "hex",
  setActiveFillIndex: (index) => set({ activeFillIndex: index }),
  setColorInputMode: (mode) => set({ colorInputMode: mode }),
}));

export interface FillValues {
  fills: FillItem[];
  activeFillIndex: number;
  activeFill: FillItem | null;
  colorInputMode: ColorInputMode;
  setActiveFillIndex: (index: number) => void;
  setColorInputMode: (mode: ColorInputMode) => void;
}

export function useFillValues(): FillValues {
  const selectedId = useStore((s) => s.selectedElementId);
  const rawFills = useStore((s) => {
    if (!selectedId) return undefined;
    const el = s.elementsMap.get(selectedId) as
      | { fills?: FillItem[]; props?: { style?: Record<string, unknown> } }
      | undefined;
    return el?.fills;
  });
  const backgroundColor = useStore((s) => {
    if (!selectedId) return undefined;
    const el = s.elementsMap.get(selectedId) as
      | { props?: { style?: { backgroundColor?: string } } }
      | undefined;
    return el?.props?.style?.backgroundColor;
  });
  const activeFillIndex = useFillUIStore((s) => s.activeFillIndex);
  const colorInputMode = useFillUIStore((s) => s.colorInputMode);
  const setActiveFillIndex = useFillUIStore((s) => s.setActiveFillIndex);
  const setColorInputMode = useFillUIStore((s) => s.setColorInputMode);

  const fillsList = useMemo(
    () => ensureFills(rawFills, backgroundColor),
    [rawFills, backgroundColor],
  );
  const activeFill = fillsList[activeFillIndex] ?? null;

  return {
    fills: fillsList,
    activeFillIndex,
    activeFill,
    colorInputMode,
    setActiveFillIndex,
    setColorInputMode,
  };
}
