/**
 * Fill Values Jotai Hook
 *
 * Color Picker Phase 1: fills 값을 구독하는 래퍼 훅
 * - Jotai atoms를 직접 구독하여 fine-grained reactivity 제공
 * - 컴포넌트는 이 훅을 통해 fills 데이터만 구독
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { useAtomValue, useSetAtom } from 'jotai';
import type { FillItem, ColorInputMode } from '../../../../types/builder/fill.types';
import {
  fillsAtom,
  activeFillIndexAtom,
  activeFillAtom,
  colorInputModeAtom,
} from '../atoms/fillAtoms';

export interface FillValues {
  fills: FillItem[];
  activeFillIndex: number;
  activeFill: FillItem | null;
  colorInputMode: ColorInputMode;
  setActiveFillIndex: (index: number) => void;
  setColorInputMode: (mode: ColorInputMode) => void;
}

export function useFillValuesJotai(): FillValues {
  const fills = useAtomValue(fillsAtom);
  const activeFillIndex = useAtomValue(activeFillIndexAtom);
  const activeFill = useAtomValue(activeFillAtom);
  const colorInputMode = useAtomValue(colorInputModeAtom);
  const setActiveFillIndex = useSetAtom(activeFillIndexAtom);
  const setColorInputMode = useSetAtom(colorInputModeAtom);

  return {
    fills,
    activeFillIndex,
    activeFill,
    colorInputMode,
    setActiveFillIndex,
    setColorInputMode,
  };
}
