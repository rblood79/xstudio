/**
 * useResetStyles - 경량 스타일 리셋 훅
 *
 * 🚀 Phase 4.2c: 래퍼 컴포넌트 최적화
 * - 섹션 래퍼 (TransformSection 등)는 resetStyles만 필요
 * - useStyleActions의 useCopyPaste 훅 오버헤드 제거
 * - 안정적인 함수 참조 반환 (useCallback + 빈 deps)
 */

import { useCallback } from 'react';
import { useStore } from '../../../stores';

/**
 * resetStyles 함수만 반환하는 경량 훅
 * Section 래퍼 컴포넌트용
 */
export function useResetStyles() {
  const resetStyles = useCallback((properties: string[]) => {
    const resetObj: Record<string, string> = {};
    properties.forEach((prop) => (resetObj[prop] = ''));
    useStore.getState().updateSelectedStyles(resetObj);
  }, []);

  return resetStyles;
}
