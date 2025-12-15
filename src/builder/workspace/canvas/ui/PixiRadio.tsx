/**
 * Pixi Radio
 *
 * 🚀 Phase 11 B2.4: Graphics 기반 RadioGroup
 *
 * Graphics를 사용하여 직접 라디오 버튼을 그립니다.
 * - PixiButton과 동일한 패턴 (명령형 Graphics)
 * - options가 없으면 기본 placeholder 표시
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

export interface PixiRadioProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, selectedValue: string) => void;
  onClick?: (elementId: string) => void;
}

interface RadioOption {
  value: string;
  label: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_RADIO_SIZE = 20;
const DEFAULT_PRIMARY_COLOR = 0x3b82f6; // blue-500
const DEFAULT_BORDER_COLOR = 0xd1d5db; // gray-300
const DEFAULT_TEXT_COLOR = 0x374151; // gray-700
const DEFAULT_GAP = 12;
const LABEL_GAP = 8;

// 기본 옵션 (options가 없을 때 placeholder로 표시)
const DEFAULT_OPTIONS: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

// ============================================
// Helper Functions
// ============================================

function parseRadioOptions(props: Record<string, unknown> | undefined): RadioOption[] {
  if (!props) return DEFAULT_OPTIONS;

  if (Array.isArray(props.options) && props.options.length > 0) {
    return props.options.map((opt: unknown, index: number) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      if (typeof opt === 'object' && opt !== null) {
        const optObj = opt as Record<string, unknown>;
        return {
          value: String(optObj.value || optObj.id || index),
          label: String(optObj.label || optObj.name || optObj.value || ''),
        };
      }
      return { value: String(index), label: String(opt) };
    });
  }

  return DEFAULT_OPTIONS;
}

// ============================================
// Sub-Component: RadioItem
// ============================================

interface RadioItemProps {
  option: RadioOption;
  isOptionSelected: boolean;
  x: number;
  y: number;
  radioSize: number;
  primaryColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  onSelect: (value: string) => void;
}

const RadioItem = memo(function RadioItem({
  option,
  isOptionSelected,
  x,
  y,
  radioSize,
  primaryColor,
  textColor,
  fontSize,
  fontFamily,
  onSelect,
}: RadioItemProps) {
  const borderColor = isOptionSelected ? primaryColor : DEFAULT_BORDER_COLOR;
  const backgroundColor = isOptionSelected ? primaryColor : 0xffffff;

  // 라디오 원 그리기
  const drawRadio = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const radius = radioSize / 2;
      const centerX = radius;
      const centerY = radius;

      // 외부 원 (배경)
      g.circle(centerX, centerY, radius);
      g.fill({ color: backgroundColor, alpha: 1 });

      // 테두리
      g.circle(centerX, centerY, radius);
      g.stroke({ width: 2, color: borderColor, alpha: 1 });

      // 내부 dot (선택된 경우)
      if (isOptionSelected) {
        const dotRadius = radioSize * 0.2;
        g.circle(centerX, centerY, dotRadius);
        g.fill({ color: 0xffffff, alpha: 1 });
      }
    },
    [radioSize, backgroundColor, borderColor, isOptionSelected]
  );

  // 텍스트 스타일
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily,
        fontSize,
        fill: textColor,
      }),
    [fontFamily, fontSize, textColor]
  );

  // 클릭 핸들러
  const handlePointerDown = useCallback(() => {
    onSelect(option.value);
  }, [option.value, onSelect]);

  return (
    <pixiContainer x={x} y={y}>
      {/* 라디오 원 */}
      <pixiGraphics
        draw={drawRadio}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />

      {/* 라벨 텍스트 */}
      <pixiText
        text={option.label}
        style={textStyle}
        x={radioSize + LABEL_GAP}
        y={(radioSize - fontSize) / 2}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />
    </pixiContainer>
  );
});

// ============================================
// Main Component
// ============================================

export const PixiRadio = memo(function PixiRadio({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiRadioProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 라디오 옵션
  const options = useMemo(() => parseRadioOptions(props), [props]);

  // 선택된 값
  const selectedValue = useMemo(() => {
    return String(props?.value || props?.selectedValue || props?.defaultValue || '');
  }, [props]);

  // 방향
  const isHorizontal = useMemo(() => {
    const flexDirection = (style as Record<string, unknown>)?.flexDirection;
    return flexDirection === 'row';
  }, [style]);

  // 스타일
  const radioSize = DEFAULT_RADIO_SIZE;
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  const fontSize = parseCSSSize(style?.fontSize, undefined, 14);
  const fontFamily = style?.fontFamily || 'Pretendard, sans-serif';

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handleOptionSelect = useCallback(
    (optionValue: string) => {
      onClick?.(element.id);
      onChange?.(element.id, optionValue);
    },
    [element.id, onClick, onChange]
  );

  return (
    <pixiContainer
      x={posX}
      y={posY}
      eventMode="static"
      onPointerDown={handleClick}
    >
      {options.map((option, index) => {
        const isOptionSelected = option.value === selectedValue;

        // 위치 계산
        const itemX = isHorizontal ? index * 120 : 0;
        const itemY = isHorizontal ? 0 : index * (radioSize + DEFAULT_GAP);

        return (
          <RadioItem
            key={option.value}
            option={option}
            isOptionSelected={isOptionSelected}
            x={itemX}
            y={itemY}
            radioSize={radioSize}
            primaryColor={primaryColor}
            textColor={textColor}
            fontSize={fontSize}
            fontFamily={fontFamily}
            onSelect={handleOptionSelect}
          />
        );
      })}
    </pixiContainer>
  );
});

export default PixiRadio;
