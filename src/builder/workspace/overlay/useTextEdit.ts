/**
 * useTextEdit Hook
 *
 * 🚀 Phase 10 B1.5: 텍스트 편집 상태 관리
 *
 * @since 2025-12-11 Phase 10 B1.5
 */

import { useState, useCallback, useMemo } from 'react';
import { useStore } from '../../stores';
import type { Element } from '../../../types/core/store.types';
import type { TextStyleConfig } from './TextEditOverlay';

// ============================================
// Types
// ============================================

export interface TextEditState {
  /** 편집 중인 요소 ID */
  elementId: string | null;
  /** 현재 텍스트 값 */
  value: string;
  /** 위치 (캔버스 좌표) */
  position: { x: number; y: number };
  /** 크기 */
  size: { width: number; height: number };
  /** 스타일 */
  style: TextStyleConfig;
}

export interface UseTextEditReturn {
  /** 편집 상태 */
  editState: TextEditState | null;
  /** 편집 시작 */
  startEdit: (elementId: string) => void;
  /** 텍스트 변경 */
  updateText: (elementId: string, newValue: string) => void;
  /** 편집 완료 (저장) */
  completeEdit: (elementId: string) => void;
  /** 편집 취소 */
  cancelEdit: (elementId: string) => void;
  /** 편집 중 여부 */
  isEditing: boolean;
}

// ============================================
// Text Element Tags
// ============================================

const TEXT_ELEMENT_TAGS = new Set([
  'Text',
  'Heading',
  'Label',
  'Paragraph',
  'Link',
  'Button', // 버튼의 텍스트도 편집 가능
]);

// ============================================
// Helper Functions
// ============================================

/**
 * 요소에서 텍스트 추출
 */
function extractText(element: Element): string {
  const props = element.props as Record<string, unknown> | undefined;
  return String(props?.children || props?.text || props?.label || '');
}

/**
 * 요소 스타일에서 텍스트 스타일 추출
 */
function extractTextStyle(element: Element): TextStyleConfig {
  const style = element.props?.style as Record<string, unknown> | undefined;

  return {
    fontFamily: String(style?.fontFamily || 'Pretendard, sans-serif'),
    fontSize: Number(style?.fontSize) || 16,
    fontWeight: style?.fontWeight as string | number | undefined,
    color: String(style?.color || '#000000'),
    textAlign: (style?.textAlign as 'left' | 'center' | 'right') || 'left',
    lineHeight: style?.lineHeight as number | string | undefined,
    padding: Number(style?.padding || style?.paddingLeft || 0),
  };
}

/**
 * 요소 위치 추출
 */
function extractPosition(element: Element): { x: number; y: number } {
  const style = element.props?.style as Record<string, unknown> | undefined;
  return {
    x: Number(style?.left) || 0,
    y: Number(style?.top) || 0,
  };
}

/**
 * 요소 크기 추출
 */
function extractSize(element: Element): { width: number; height: number } {
  const style = element.props?.style as Record<string, unknown> | undefined;
  return {
    width: Number(style?.width) || 100,
    height: Number(style?.height) || 50,
  };
}

// ============================================
// Hook
// ============================================

export function useTextEdit(): UseTextEditReturn {
  const elements = useStore((state) => state.elements);
  const updateElementProps = useStore((state) => state.updateElementProps);

  const [editState, setEditState] = useState<TextEditState | null>(null);
  const [originalValue, setOriginalValue] = useState<string>('');

  // 편집 시작
  const startEdit = useCallback(
    (elementId: string) => {
      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      // 텍스트 요소만 편집 가능
      if (!TEXT_ELEMENT_TAGS.has(element.tag)) {
        console.warn(`[useTextEdit] Element ${element.tag} is not a text element`);
        return;
      }

      const text = extractText(element);
      setOriginalValue(text);

      setEditState({
        elementId,
        value: text,
        position: extractPosition(element),
        size: extractSize(element),
        style: extractTextStyle(element),
      });
    },
    [elements]
  );

  // 텍스트 변경 (실시간)
  const updateText = useCallback(
    (elementId: string, newValue: string) => {
      setEditState((prev) => {
        if (!prev || prev.elementId !== elementId) return prev;
        return { ...prev, value: newValue };
      });
    },
    []
  );

  // 편집 완료 (저장)
  const completeEdit = useCallback(
    (elementId: string) => {
      if (!editState || editState.elementId !== elementId) return;

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      // props에 텍스트 업데이트
      const props = element.props as Record<string, unknown> | undefined;
      const updatedProps: Record<string, unknown> = { ...props };

      // 텍스트 속성 결정 (children, text, label 중 하나)
      if ('children' in (props || {})) {
        updatedProps.children = editState.value;
      } else if ('text' in (props || {})) {
        updatedProps.text = editState.value;
      } else if ('label' in (props || {})) {
        updatedProps.label = editState.value;
      } else {
        // 기본값: children
        updatedProps.children = editState.value;
      }

      updateElementProps(elementId, updatedProps);
      setEditState(null);
      setOriginalValue('');
    },
    [editState, elements, updateElementProps]
  );

  // 편집 취소
  const cancelEdit = useCallback(
    (elementId: string) => {
      if (!editState || editState.elementId !== elementId) return;

      // 원래 값으로 복원 (실제로는 저장하지 않았으므로 그냥 닫기만 함)
      setEditState(null);
      setOriginalValue('');
    },
    [editState]
  );

  // 편집 중 여부
  const isEditing = editState !== null;

  return {
    editState,
    startEdit,
    updateText,
    completeEdit,
    cancelEdit,
    isEditing,
  };
}

export default useTextEdit;
