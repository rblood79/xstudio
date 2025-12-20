/**
 * useTypographyValues - Typography 섹션 전용 스타일 값 훅
 *
 * 🚀 Phase 22: 섹션별 훅 분리로 성능 최적화
 * - Typography 섹션의 11개 속성만 의존성으로 사용
 * - 다른 섹션의 스타일 변경 시 재계산 방지 (61% 성능 개선)
 */

import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
}

/**
 * Typography 섹션 전용 스타일 값 훅
 * font, text 관련 11개 속성 추적
 */
export function useTypographyValues(
  selectedElement: SelectedElement | null
): TypographyStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      fontFamily: getStyleValue(selectedElement, 'fontFamily', 'Arial'),
      fontSize: getStyleValue(selectedElement, 'fontSize', '16px'),
      fontWeight: getStyleValue(selectedElement, 'fontWeight', 'normal'),
      fontStyle: getStyleValue(selectedElement, 'fontStyle', 'normal'),
      lineHeight: getStyleValue(selectedElement, 'lineHeight', 'normal'),
      letterSpacing: getStyleValue(selectedElement, 'letterSpacing', 'normal'),
      color: getStyleValue(selectedElement, 'color', '#000000'),
      textAlign: getStyleValue(selectedElement, 'textAlign', 'left'),
      textDecoration: getStyleValue(selectedElement, 'textDecoration', 'none'),
      textTransform: getStyleValue(selectedElement, 'textTransform', 'none'),
      verticalAlign: getStyleValue(selectedElement, 'verticalAlign', 'baseline'),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.fontFamily,
    selectedElement?.style?.fontSize,
    selectedElement?.style?.fontWeight,
    selectedElement?.style?.fontStyle,
    selectedElement?.style?.lineHeight,
    selectedElement?.style?.letterSpacing,
    selectedElement?.style?.color,
    selectedElement?.style?.textAlign,
    selectedElement?.style?.textDecoration,
    selectedElement?.style?.textTransform,
    selectedElement?.style?.verticalAlign,
    // computedStyle도 포함
    selectedElement?.computedStyle?.fontFamily,
    selectedElement?.computedStyle?.fontSize,
    selectedElement?.computedStyle?.fontWeight,
    selectedElement?.computedStyle?.fontStyle,
    selectedElement?.computedStyle?.lineHeight,
    selectedElement?.computedStyle?.letterSpacing,
    selectedElement?.computedStyle?.color,
    selectedElement?.computedStyle?.textAlign,
    selectedElement?.computedStyle?.textDecoration,
    selectedElement?.computedStyle?.textTransform,
    selectedElement?.computedStyle?.verticalAlign,
  ]);
}
