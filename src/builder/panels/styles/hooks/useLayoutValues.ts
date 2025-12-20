/**
 * useLayoutValues - Layout 섹션 전용 스타일 값 훅
 *
 * 🚀 Phase 22: 섹션별 훅 분리로 성능 최적화
 * - Layout 섹션의 속성만 의존성으로 사용
 * - 다른 섹션의 스타일 변경 시 재계산 방지
 */

import { useMemo } from 'react';
import type { SelectedElement } from '../../../inspector/types';
import { getStyleValue } from './useStyleValues';

export interface LayoutStyleValues {
  display: string;
  flexDirection: string;
  flexWrap: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

/**
 * Layout 섹션 전용 스타일 값 훅
 * display, flex 관련, gap, padding, margin 속성 추적
 */
export function useLayoutValues(
  selectedElement: SelectedElement | null
): LayoutStyleValues | null {
  return useMemo(() => {
    if (!selectedElement) return null;

    return {
      display: getStyleValue(selectedElement, 'display', 'block'),
      flexDirection: getStyleValue(selectedElement, 'flexDirection', 'row'),
      flexWrap: getStyleValue(selectedElement, 'flexWrap', 'nowrap'),
      alignItems: getStyleValue(selectedElement, 'alignItems', ''),
      justifyContent: getStyleValue(selectedElement, 'justifyContent', ''),
      gap: getStyleValue(selectedElement, 'gap', '0px'),
      padding: getStyleValue(selectedElement, 'padding', '0px'),
      paddingTop: getStyleValue(selectedElement, 'paddingTop', ''),
      paddingRight: getStyleValue(selectedElement, 'paddingRight', ''),
      paddingBottom: getStyleValue(selectedElement, 'paddingBottom', ''),
      paddingLeft: getStyleValue(selectedElement, 'paddingLeft', ''),
      margin: getStyleValue(selectedElement, 'margin', '0px'),
      marginTop: getStyleValue(selectedElement, 'marginTop', ''),
      marginRight: getStyleValue(selectedElement, 'marginRight', ''),
      marginBottom: getStyleValue(selectedElement, 'marginBottom', ''),
      marginLeft: getStyleValue(selectedElement, 'marginLeft', ''),
    };
  }, [
    selectedElement?.id,
    selectedElement?.style?.display,
    selectedElement?.style?.flexDirection,
    selectedElement?.style?.flexWrap,
    selectedElement?.style?.alignItems,
    selectedElement?.style?.justifyContent,
    selectedElement?.style?.gap,
    selectedElement?.style?.padding,
    selectedElement?.style?.paddingTop,
    selectedElement?.style?.paddingRight,
    selectedElement?.style?.paddingBottom,
    selectedElement?.style?.paddingLeft,
    selectedElement?.style?.margin,
    selectedElement?.style?.marginTop,
    selectedElement?.style?.marginRight,
    selectedElement?.style?.marginBottom,
    selectedElement?.style?.marginLeft,
    // computedStyle도 포함 (padding/margin은 computed 사용 가능)
    selectedElement?.computedStyle?.gap,
    selectedElement?.computedStyle?.padding,
    selectedElement?.computedStyle?.margin,
  ]);
}
