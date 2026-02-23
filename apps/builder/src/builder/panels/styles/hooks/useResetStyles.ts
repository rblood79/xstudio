/**
 * useResetStyles - 경량 스타일 리셋 훅
 *
 * 🚀 Phase 4.2c: 래퍼 컴포넌트 최적화
 * - 섹션 래퍼 (TransformSection 등)는 resetStyles만 필요
 * - useStyleActions의 useCopyPaste 훅 오버헤드 제거
 * - 안정적인 함수 참조 반환 (useCallback + 빈 deps)
 *
 * 🚀 Body 기본값 보존: Reset 시 컴포넌트 기본값으로 복원
 */

import { useCallback } from 'react';
import { useStore } from '../../../stores';
import { getDefaultProps } from '../../../../types/builder/unified.types';

/**
 * resetStyles 함수만 반환하는 경량 훅
 * Section 래퍼 컴포넌트용
 *
 * Reset 시 컴포넌트의 기본 스타일 값으로 복원 (완전 삭제가 아님)
 */
export function useResetStyles() {
  const resetStyles = useCallback((properties: string[]) => {
    const state = useStore.getState();
    const selectedId = state.selectedElementId;
    if (!selectedId) return;

    const element = state.elementsMap.get(selectedId);
    if (!element) return;

    // 컴포넌트 기본값 가져오기
    const tag = element.tag;
    const defaultProps = getDefaultProps(tag);
    const defaultStyle = (defaultProps?.style || {}) as Record<string, string>;
    const currentStyle = ((element.props?.style as Record<string, string>) || {});

    // 실제로 변경이 필요한 속성만 포함 (dirty check)
    const resetObj: Record<string, string> = {};
    properties.forEach((prop) => {
      const resetValue = defaultStyle[prop] ?? '';
      const currentValue = currentStyle[prop] ?? '';
      if (currentValue !== resetValue) {
        resetObj[prop] = resetValue;
      }
    });

    // 변경할 속성이 없으면 히스토리 기록 없이 조기 반환
    if (Object.keys(resetObj).length === 0) return;

    state.updateSelectedStyles(resetObj);
  }, []);

  return resetStyles;
}
