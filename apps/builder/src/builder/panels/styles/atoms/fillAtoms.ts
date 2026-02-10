/**
 * Fill Atoms - Jotai 기반 Fill 상태 관리
 *
 * Color Picker Phase 1: Fill 시스템의 fine-grained reactivity
 * - selectedElementAtom에서 fills 배열 추출
 * - activeFillIndex, activeFill 파생 atom
 * - colorInputMode atom
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { FillItem, ColorInputMode } from '../../../../types/builder/fill.types';
import { selectedElementAtom } from './styleAtoms';

// ============================================
// Fill Atoms
// ============================================

/**
 * 선택된 요소의 fills 배열 (파생)
 * Zustand 브릿지를 통해 동기화된 selectedElementAtom에서 fills 추출
 */
export const fillsAtom = selectAtom(
  selectedElementAtom,
  (element) => (element as (typeof element) & { fills?: FillItem[] })?.fills ?? [],
  (a, b) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    return a.every((fill, i) => {
      const other = b[i];
      return fill.id === other.id
        && fill.enabled === other.enabled
        && fill.opacity === other.opacity
        && fill.type === other.type
        && (fill.type === 'color' && other.type === 'color'
          ? fill.color === other.color
          : fill === other);
    });
  }
);

/**
 * 현재 편집 중인 fill 인덱스
 */
export const activeFillIndexAtom = atom<number>(0);

/**
 * 현재 편집 중인 fill (파생)
 * fills[activeFillIndex] 또는 null
 */
export const activeFillAtom = atom<FillItem | null>((get) => {
  const fills = get(fillsAtom);
  const index = get(activeFillIndexAtom);
  return fills[index] ?? null;
});

/**
 * 색상 입력 모드 (HEX, RGBA, HSL, HSB, CSS)
 */
export const colorInputModeAtom = atom<ColorInputMode>('hex');
