/**
 * Pixi Checkbox
 *
 * 🚀 Phase 11 B2.4: @pixi/ui CheckBox 래퍼
 *
 * xstudio Element를 @pixi/ui CheckBox로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 11 B2.4
 */

import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { CheckBox as PixiUICheckBox } from '@pixi/ui';
import { Graphics, Text, TextStyle, Container as PixiContainer } from 'pixi.js';
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

interface CheckboxStyle {
  size: number;
  backgroundColor: number;
  checkedColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
  checkColor: number;
  labelColor: number;
  fontSize: number;
  fontFamily: string;
  gap: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 스타일을 Checkbox 스타일로 변환
 */
function convertToCheckboxStyle(style: CSSStyle | undefined): CheckboxStyle {
  return {
    size: parseCSSSize(style?.width, undefined, 20),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    checkedColor: cssColorToHex(style?.backgroundColor, 0x3b82f6),
    borderColor: cssColorToHex(style?.borderColor, 0xd1d5db),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 2),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 4),
    checkColor: 0xffffff,
    labelColor: cssColorToHex(style?.color, 0x000000),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    gap: 8,
  };
}

/**
 * 체크박스 배경 Graphics 생성
 */
function createCheckboxBackground(
  style: CheckboxStyle,
  checked: boolean
): Graphics {
  const graphics = new Graphics();

  const bgColor = checked ? style.checkedColor : style.backgroundColor;

  if (style.borderRadius > 0) {
    graphics.roundRect(0, 0, style.size, style.size, style.borderRadius);
  } else {
    graphics.rect(0, 0, style.size, style.size);
  }
  graphics.fill({ color: bgColor });

  // Border
  if (style.borderWidth > 0) {
    if (style.borderRadius > 0) {
      graphics.roundRect(0, 0, style.size, style.size, style.borderRadius);
    } else {
      graphics.rect(0, 0, style.size, style.size);
    }
    graphics.stroke({ width: style.borderWidth, color: style.borderColor });
  }

  // Checkmark
  if (checked) {
    const padding = style.size * 0.25;
    const checkSize = style.size - padding * 2;

    graphics.moveTo(padding, style.size / 2);
    graphics.lineTo(padding + checkSize * 0.35, style.size - padding);
    graphics.lineTo(style.size - padding, padding);
    graphics.stroke({ width: 2, color: style.checkColor });
  }

  return graphics;
}

// ============================================
// Component
// ============================================

/**
 * PixiCheckbox
 *
 * @pixi/ui CheckBox를 사용하여 체크박스를 렌더링합니다.
 *
 * @example
 * <PixiCheckbox element={checkboxElement} onChange={handleChange} />
 */
export const PixiCheckbox = memo(function PixiCheckbox({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiCheckboxProps) {
  const containerRef = useRef<PixiContainer | null>(null);
  const checkboxRef = useRef<PixiUICheckBox | null>(null);

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

  // 체크박스 스타일
  const checkboxStyle = useMemo(() => {
    return convertToCheckboxStyle(style);
  }, [style]);

  // 위치 계산
  const position = useMemo(() => {
    return {
      x: parseCSSSize(style?.left, undefined, 0),
      y: parseCSSSize(style?.top, undefined, 0),
    };
  }, [style]);

  // 체크박스 생성/업데이트
  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 체크박스 제거
    if (checkboxRef.current) {
      containerRef.current.removeChild(checkboxRef.current.view);
      checkboxRef.current = null;
    }

    // Graphics 생성
    const uncheckedView = createCheckboxBackground(checkboxStyle, false);
    const checkedView = createCheckboxBackground(checkboxStyle, true);

    // CheckBox 생성
    const checkbox = new PixiUICheckBox({
      checked: isChecked,
      style: {
        unchecked: uncheckedView,
        checked: checkedView,
      },
    });

    // 체크 상태 변경 이벤트
    checkbox.onChange.connect((checked: boolean) => {
      onChange?.(element.id, checked);
    });

    // 컨테이너에 추가
    containerRef.current.addChild(checkbox.view);
    checkboxRef.current = checkbox;

    // 라벨 텍스트 추가
    if (labelText) {
      const textStyle = new TextStyle({
        fontFamily: checkboxStyle.fontFamily,
        fontSize: checkboxStyle.fontSize,
        fill: checkboxStyle.labelColor,
      });

      const text = new Text({ text: labelText, style: textStyle });
      text.x = checkboxStyle.size + checkboxStyle.gap;
      text.y = (checkboxStyle.size - text.height) / 2;
      containerRef.current.addChild(text);
    }

    return () => {
      if (checkboxRef.current && containerRef.current) {
        containerRef.current.removeChildren();
        checkboxRef.current = null;
      }
    };
  }, [checkboxStyle, isChecked, labelText, element.id, onChange]);

  // 선택 하이라이트 그리기
  const drawSelection = useCallback(
    (g: Graphics) => {
      if (!isSelected) {
        g.clear();
        return;
      }
      g.clear();
      const totalWidth = labelText
        ? checkboxStyle.size + checkboxStyle.gap + labelText.length * checkboxStyle.fontSize * 0.6
        : checkboxStyle.size;
      g.rect(-2, -2, totalWidth + 4, checkboxStyle.size + 4);
      g.stroke({ width: 2, color: 0x3b82f6 });
    },
    [isSelected, checkboxStyle, labelText]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  return (
    <pixiContainer
      x={position.x}
      y={position.y}
      eventMode="static"
      onPointerDown={handleClick}
      ref={(container: PixiContainer | null) => {
        containerRef.current = container;
      }}
    >
      <pixiGraphics draw={drawSelection} />
    </pixiContainer>
  );
});

export default PixiCheckbox;
