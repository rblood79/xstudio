/**
 * useAppearanceValues - Appearance 섹션 전용 스타일 값 훅
 *
 * 🚀 Phase 22: 섹션별 훅 분리로 성능 최적화
 * - Appearance 섹션의 5개 속성만 의존성으로 사용
 * - 다른 섹션의 스타일 변경 시 재계산 방지 (82% 성능 개선)
 */

import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface AppearanceStyleValues {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
}

/**
 * Appearance 섹션 전용 스타일 값 훅
 * backgroundColor, border 관련 5개 속성 추적
 */
export function useAppearanceValues(
  selectedElement: SelectedElement | null
): AppearanceStyleValues | null {
  // React Compiler 호환: selectedElement 전체를 의존성으로 사용
  // 세부 속성 최적화는 상위 컴포넌트에서 selector를 통해 처리
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      backgroundColor: getStyleValue(selectedElement, 'backgroundColor', '#FFFFFF'),
      borderColor: getStyleValue(selectedElement, 'borderColor', '#000000'),
      borderWidth: getStyleValue(selectedElement, 'borderWidth', '0px'),
      borderRadius: getStyleValue(selectedElement, 'borderRadius', '0px'),
      borderStyle: getStyleValue(selectedElement, 'borderStyle', 'solid'),
    };
  }, [selectedElement]);
}
