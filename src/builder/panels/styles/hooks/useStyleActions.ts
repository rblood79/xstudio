/**
 * useStyleActions - 스타일 업데이트 액션 훅
 *
 * Inspector state의 updateInlineStyle, updateInlineStyles를 래핑하여 제공
 */

import { useCallback } from 'react';
import { useInspectorState } from '../../../inspector/hooks/useInspectorState';

export function useStyleActions() {
  const { updateInlineStyle, updateInlineStyles } = useInspectorState();

  /**
   * 단일 스타일 속성 업데이트
   */
  const updateStyle = useCallback(
    (property: string, value: string) => {
      updateInlineStyle(property, value);
    },
    [updateInlineStyle]
  );

  /**
   * 여러 스타일 속성 일괄 업데이트
   */
  const updateStyles = useCallback(
    (styles: Record<string, string>) => {
      updateInlineStyles(styles);
    },
    [updateInlineStyles]
  );

  /**
   * Vertical alignment 버튼 선택 핸들러
   */
  const handleVerticalAlignment = useCallback(
    (value: string) => {
      const alignItemsMap: Record<string, string> = {
        'align-vertical-start': 'flex-start',
        'align-vertical-center': 'center',
        'align-vertical-end': 'flex-end',
      };

      updateInlineStyles({
        display: 'flex',
        alignItems: alignItemsMap[value] || 'flex-start',
      });
    },
    [updateInlineStyles]
  );

  /**
   * Horizontal alignment 버튼 선택 핸들러
   */
  const handleHorizontalAlignment = useCallback(
    (value: string) => {
      const justifyContentMap: Record<string, string> = {
        'align-horizontal-start': 'flex-start',
        'align-horizontal-center': 'center',
        'align-horizontal-end': 'flex-end',
      };

      updateInlineStyles({
        display: 'flex',
        justifyContent: justifyContentMap[value] || 'flex-start',
      });
    },
    [updateInlineStyles]
  );

  /**
   * Flex direction 버튼 선택 핸들러
   */
  const handleFlexDirection = useCallback(
    (value: string) => {
      if (value === 'reset') {
        // Remove flex-direction (or set to default)
        updateInlineStyle('flexDirection', '');
      } else if (value === 'row') {
        updateInlineStyles({
          display: 'flex',
          flexDirection: 'row',
        });
      } else if (value === 'column') {
        updateInlineStyles({
          display: 'flex',
          flexDirection: 'column',
        });
      }
    },
    [updateInlineStyle, updateInlineStyles]
  );

  /**
   * Flex alignment (3x3 grid) 버튼 선택 핸들러
   */
  const handleFlexAlignment = useCallback(
    (value: string, currentFlexDirection: string) => {
      // Map button position to horizontal and vertical alignment values
      const positionMap: Record<
        string,
        { horizontal: string; vertical: string }
      > = {
        leftTop: { horizontal: 'flex-start', vertical: 'flex-start' },
        centerTop: { horizontal: 'center', vertical: 'flex-start' },
        rightTop: { horizontal: 'flex-end', vertical: 'flex-start' },
        leftCenter: { horizontal: 'flex-start', vertical: 'center' },
        centerCenter: { horizontal: 'center', vertical: 'center' },
        rightCenter: { horizontal: 'flex-end', vertical: 'center' },
        leftBottom: { horizontal: 'flex-start', vertical: 'flex-end' },
        centerBottom: { horizontal: 'center', vertical: 'flex-end' },
        rightBottom: { horizontal: 'flex-end', vertical: 'flex-end' },
      };

      const position = positionMap[value];
      if (position) {
        // For row: horizontal = justifyContent, vertical = alignItems
        // For column: horizontal = alignItems, vertical = justifyContent
        if (currentFlexDirection === 'column') {
          updateInlineStyles({
            display: 'flex',
            justifyContent: position.vertical,
            alignItems: position.horizontal,
          });
        } else {
          // row or default
          updateInlineStyles({
            display: 'flex',
            justifyContent: position.horizontal,
            alignItems: position.vertical,
          });
        }
      }
    },
    [updateInlineStyles]
  );

  /**
   * Justify content spacing 버튼 선택 핸들러
   */
  const handleJustifyContentSpacing = useCallback(
    (value: string) => {
      updateInlineStyles({
        display: 'flex',
        justifyContent: value, // space-around, space-between, space-evenly
      });
    },
    [updateInlineStyles]
  );

  return {
    // 기본 액션
    updateStyle,
    updateStyles,

    // 특수 핸들러
    handleVerticalAlignment,
    handleHorizontalAlignment,
    handleFlexDirection,
    handleFlexAlignment,
    handleJustifyContentSpacing,
  };
}
