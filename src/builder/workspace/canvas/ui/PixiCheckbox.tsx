/**
 * Pixi Checkbox
 *
 * 🚀 Phase 11 B2.4: Graphics 기반 Checkbox
 *
 * Graphics를 사용하여 직접 체크박스를 그립니다.
 * - PixiButton과 동일한 패턴 (명령형 Graphics)
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-15 P10: Graphics 기반으로 리팩토링
 */

import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiCheckboxProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, checked: boolean) => void;
  onClick?: (elementId: string) => void;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SIZE = 20;
const DEFAULT_BORDER_RADIUS = 4;
const DEFAULT_PRIMARY_COLOR = 0x3b82f6; // blue-500
const DEFAULT_BORDER_COLOR = 0xd1d5db; // gray-300
const DEFAULT_TEXT_COLOR = 0x374151; // gray-700

// ============================================
// Component
// ============================================

export const PixiCheckbox = memo(function PixiCheckbox({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiCheckboxProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 체크 상태
  const isChecked = useMemo(() => {
    return Boolean(props?.isSelected || props?.checked || props?.defaultSelected);
  }, [props]);

  // 라벨 텍스트
  const labelText = useMemo(() => {
    return String(props?.children || props?.label || props?.text || '');
  }, [props]);

  // 스타일 계산
  const boxSize = parseCSSSize(style?.width, undefined, DEFAULT_SIZE);
  const borderRadius = parseCSSSize(style?.borderRadius, undefined, DEFAULT_BORDER_RADIUS);
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const borderColor = isChecked ? primaryColor : DEFAULT_BORDER_COLOR;
  const backgroundColor = isChecked ? primaryColor : 0xffffff;
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  const fontSize = parseCSSSize(style?.fontSize, undefined, 14);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 체크박스 박스 그리기
  const drawBox = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 배경
      g.roundRect(0, 0, boxSize, boxSize, borderRadius);
      g.fill({ color: backgroundColor, alpha: 1 });

      // 테두리
      g.roundRect(0, 0, boxSize, boxSize, borderRadius);
      g.stroke({ width: 2, color: borderColor, alpha: 1 });

      // 체크마크 (체크된 경우)
      if (isChecked) {
        const checkPadding = boxSize * 0.2;
        const checkStartX = checkPadding;
        const checkStartY = boxSize * 0.5;
        const checkMidX = boxSize * 0.4;
        const checkMidY = boxSize - checkPadding;
        const checkEndX = boxSize - checkPadding;
        const checkEndY = checkPadding;

        g.setStrokeStyle({ width: 2.5, color: 0xffffff, cap: 'round', join: 'round' });
        g.moveTo(checkStartX, checkStartY);
        g.lineTo(checkMidX, checkMidY);
        g.lineTo(checkEndX, checkEndY);
        g.stroke();
      }
    },
    [boxSize, borderRadius, backgroundColor, borderColor, isChecked]
  );

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
        fontSize,
        fill: textColor,
      }),
    [style?.fontFamily, fontSize, textColor]
  );

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    onClick?.(element.id);
    onChange?.(element.id, !isChecked);
  }, [element.id, onClick, onChange, isChecked]);

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 체크박스 박스 */}
      <pixiGraphics
        draw={drawBox}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />

      {/* 라벨 텍스트 */}
      {labelText && (
        <pixiText
          text={labelText}
          style={textStyle}
          x={boxSize + 8}
          y={(boxSize - fontSize) / 2}
          eventMode="static"
          cursor="pointer"
          onPointerDown={handlePointerDown}
        />
      )}
    </pixiContainer>
  );
});

export default PixiCheckbox;
