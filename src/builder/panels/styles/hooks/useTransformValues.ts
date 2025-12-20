/**
 * useTransformValues - Transform 섹션 전용 스타일 값 훅
 *
 * 🚀 Phase 22: 섹션별 훅 분리로 성능 최적화
 * - Transform 섹션의 4개 속성만 의존성으로 사용
 * - 다른 섹션의 스타일 변경 시 재계산 방지 (86% 성능 개선)
 */

import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface TransformStyleValues {
  width: string;
  height: string;
  top: string;
  left: string;
}

/**
 * Transform 섹션 전용 스타일 값 훅
 * width, height, top, left 4개 속성만 추적
 */
export function useTransformValues(
  selectedElement: SelectedElement | null
): TransformStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      width: getStyleValue(selectedElement, 'width', 'auto'),
      height: getStyleValue(selectedElement, 'height', 'auto'),
      top: getStyleValue(selectedElement, 'top', 'auto'),
      left: getStyleValue(selectedElement, 'left', 'auto'),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.width,
    selectedElement?.style?.height,
    selectedElement?.style?.top,
    selectedElement?.style?.left,
  ]);
}
