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
import { getCheckboxSizePreset } from '../utils/cssVariableReader';
import { drawBox } from '../utils';

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
  // 체크박스 박스 크기는 props.size 또는 DEFAULT_SIZE (width는 전체 컴포넌트 영역)
  // 🚀 CSS 변수에서 동적으로 읽어옴
  const sizePreset = useMemo(() => {
    const size = props?.size ? String(props.size) : 'md';
    return getCheckboxSizePreset(size);
  }, [props?.size]);

  const boxSize = sizePreset.boxSize;

  const borderRadius = parseCSSSize(style?.borderRadius, undefined, DEFAULT_BORDER_RADIUS);
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const borderColor = isChecked ? primaryColor : DEFAULT_BORDER_COLOR;
  const backgroundColor = isChecked ? primaryColor : 0xffffff;
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  // fontSize도 CSS 변수 프리셋에서 가져옴 (style에 명시적 값이 없으면)
  const fontSize = parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 체크박스 박스 그리기
  // 🚀 Border-Box v2: drawBox 유틸리티 사용
  const drawCheckboxBox = useCallback(
    (g: PixiGraphics) => {
      // Border-Box v2: drawBox 유틸리티로 배경 + 테두리 그리기
      drawBox(g, {
        width: boxSize,
        height: boxSize,
        backgroundColor,
        backgroundAlpha: 1,
        borderRadius,
        border: {
          width: 2,
          color: borderColor,
          alpha: 1,
          style: 'solid',
          radius: borderRadius,
        },
      });

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

  // 전체 히트 영역 (박스 + gap + 텍스트 영역)
  // 텍스트 너비는 대략 fontSize * 글자수로 추정, 최소 50px 확보
  const estimatedTextWidth = labelText ? Math.max(labelText.length * fontSize * 0.6, 50) : 0;
  const hitAreaWidth = boxSize + (labelText ? 8 + estimatedTextWidth : 0);
  const hitAreaHeight = Math.max(boxSize, fontSize + 4);

  // 수직 중앙 정렬을 위한 오프셋
  const boxOffsetY = (hitAreaHeight - boxSize) / 2;
  const textOffsetY = (hitAreaHeight - fontSize) / 2;

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, hitAreaWidth, hitAreaHeight);
      g.fill({ color: 0xffffff, alpha: 0 }); // 완전 투명
    },
    [hitAreaWidth, hitAreaHeight]
  );

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 투명 히트 영역 (전체 클릭 가능) */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />

      {/* 체크박스 박스 (시각적 요소만) - 수직 중앙 정렬 */}
      <pixiGraphics
        draw={drawCheckboxBox}
        y={boxOffsetY}
        eventMode="none"
      />

      {/* 라벨 텍스트 (시각적 요소만) - 수직 중앙 정렬 */}
      {labelText && (
        <pixiText
          text={labelText}
          style={textStyle}
          x={boxSize + 8}
          y={textOffsetY}
          eventMode="none"
        />
      )}
    </pixiContainer>
  );
});

export default PixiCheckbox;
