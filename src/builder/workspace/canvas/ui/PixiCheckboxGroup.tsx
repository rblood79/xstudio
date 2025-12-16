/**
 * Pixi CheckboxGroup
 *
 * 🚀 Phase 11 B2.4: Graphics 기반 CheckboxGroup
 *
 * Graphics를 사용하여 직접 체크박스 그룹을 그립니다.
 * - PixiRadio(RadioGroup)와 동일한 패턴
 * - options가 없으면 기본 placeholder 표시
 * - 그룹 라벨 지원
 *
 * @since 2025-12-15
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { drawBox } from '../utils';
import { useStore } from '../../../stores';

// ============================================
// Types
// ============================================

export interface PixiCheckboxGroupProps {
  element: Element;
  isSelected?: boolean;
  onChange?: (elementId: string, selectedValues: string[]) => void;
  onClick?: (elementId: string) => void;
}

interface CheckboxOption {
  value: string;
  label: string;
  checked?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_CHECKBOX_SIZE = 20;
const DEFAULT_BORDER_RADIUS = 4;
const DEFAULT_PRIMARY_COLOR = 0x3b82f6; // blue-500
const DEFAULT_BORDER_COLOR = 0xd1d5db; // gray-300
const DEFAULT_TEXT_COLOR = 0x374151; // gray-700
const DEFAULT_GAP = 12;
const LABEL_GAP = 8;

// 기본 옵션 (options가 없을 때 placeholder로 표시)
const DEFAULT_OPTIONS: CheckboxOption[] = [
  { value: 'option1', label: 'Option 1', checked: false },
  { value: 'option2', label: 'Option 2', checked: false },
];

// ============================================
// Helper Functions
// ============================================

/**
 * props.options에서 체크박스 옵션 파싱
 */
function parseCheckboxOptionsFromProps(props: Record<string, unknown> | undefined): CheckboxOption[] | null {
  if (!props) return null;

  if (Array.isArray(props.options) && props.options.length > 0) {
    return props.options.map((opt: unknown, index: number) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt, checked: false };
      }
      if (typeof opt === 'object' && opt !== null) {
        const optObj = opt as Record<string, unknown>;
        return {
          value: String(optObj.value || optObj.id || index),
          label: String(optObj.label || optObj.name || optObj.value || ''),
          checked: Boolean(optObj.checked || optObj.isSelected || optObj.defaultSelected),
        };
      }
      return { value: String(index), label: String(opt), checked: false };
    });
  }

  return null;
}

/**
 * 자식 Checkbox 요소들에서 옵션 파싱
 */
function parseCheckboxOptionsFromChildren(childCheckboxes: Element[]): CheckboxOption[] | null {
  if (childCheckboxes.length === 0) return null;

  return childCheckboxes
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((checkbox, index) => {
      const props = checkbox.props as Record<string, unknown> | undefined;
      return {
        value: String(props?.value || props?.id || checkbox.id || index),
        label: String(props?.children || props?.label || props?.text || `Option ${index + 1}`),
        checked: Boolean(props?.isSelected || props?.checked || props?.defaultSelected),
      };
    });
}

// ============================================
// Sub-Component: CheckboxItem
// ============================================

interface CheckboxItemProps {
  option: CheckboxOption;
  isOptionChecked: boolean;
  x: number;
  y: number;
  checkboxSize: number;
  borderRadius: number;
  primaryColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  onToggle: (value: string) => void;
}

const CheckboxItem = memo(function CheckboxItem({
  option,
  isOptionChecked,
  x,
  y,
  checkboxSize,
  borderRadius,
  primaryColor,
  textColor,
  fontSize,
  fontFamily,
  onToggle,
}: CheckboxItemProps) {
  const borderColor = isOptionChecked ? primaryColor : DEFAULT_BORDER_COLOR;
  const backgroundColor = isOptionChecked ? primaryColor : 0xffffff;

  // 체크박스 그리기
  const drawCheckbox = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Border-Box v2: drawBox 유틸리티로 배경 + 테두리 그리기
      drawBox(g, {
        width: checkboxSize,
        height: checkboxSize,
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
      if (isOptionChecked) {
        const checkPadding = checkboxSize * 0.2;
        const checkStartX = checkPadding;
        const checkStartY = checkboxSize * 0.5;
        const checkMidX = checkboxSize * 0.4;
        const checkMidY = checkboxSize - checkPadding;
        const checkEndX = checkboxSize - checkPadding;
        const checkEndY = checkPadding;

        g.setStrokeStyle({ width: 2.5, color: 0xffffff, cap: 'round', join: 'round' });
        g.moveTo(checkStartX, checkStartY);
        g.lineTo(checkMidX, checkMidY);
        g.lineTo(checkEndX, checkEndY);
        g.stroke();
      }
    },
    [checkboxSize, borderRadius, backgroundColor, borderColor, isOptionChecked]
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
    onToggle(option.value);
  }, [option.value, onToggle]);

  return (
    <pixiContainer x={x} y={y}>
      {/* 체크박스 */}
      <pixiGraphics
        draw={drawCheckbox}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handlePointerDown}
      />

      {/* 라벨 텍스트 */}
      <pixiText
        text={option.label}
        style={textStyle}
        x={checkboxSize + LABEL_GAP}
        y={(checkboxSize - fontSize) / 2}
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

export const PixiCheckboxGroup = memo(function PixiCheckboxGroup({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiCheckboxGroupProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Store에서 자식 Checkbox 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childCheckboxes = useMemo(() => {
    return elements.filter(
      (el) => el.parent_id === element.id && (el.tag === 'Checkbox' || el.tag === 'CheckBox')
    );
  }, [elements, element.id]);

  // 체크박스 옵션: 자식 Checkbox 요소들 > props.options > 기본값
  const options = useMemo(() => {
    // 1. 자식 Checkbox 요소들이 있으면 사용
    const fromChildren = parseCheckboxOptionsFromChildren(childCheckboxes);
    if (fromChildren) return fromChildren;

    // 2. props.options가 있으면 사용
    const fromProps = parseCheckboxOptionsFromProps(props);
    if (fromProps) return fromProps;

    // 3. 기본값
    return DEFAULT_OPTIONS;
  }, [childCheckboxes, props]);

  // 선택된 값들: CheckboxGroup props > 자식 Checkbox의 isSelected > 없음
  const selectedValues = useMemo(() => {
    // 1. CheckboxGroup의 value/selectedValues가 배열이면 사용
    const values = props?.value || props?.selectedValues || props?.defaultValue;
    if (Array.isArray(values) && values.length > 0) {
      return values.map(String);
    }

    // 2. 자식 Checkbox 중 isSelected/checked가 true인 항목들 찾기
    const selectedFromChildren = childCheckboxes
      .filter((checkbox) => {
        const checkboxProps = checkbox.props as Record<string, unknown> | undefined;
        return Boolean(checkboxProps?.isSelected || checkboxProps?.checked || checkboxProps?.defaultSelected);
      })
      .map((checkbox) => {
        const checkboxProps = checkbox.props as Record<string, unknown> | undefined;
        return String(checkboxProps?.value || checkbox.id);
      });

    if (selectedFromChildren.length > 0) {
      return selectedFromChildren;
    }

    // 3. options에서 checked가 true인 항목들 (props.options 사용 시)
    return options.filter((opt) => opt.checked).map((opt) => opt.value);
  }, [props, childCheckboxes, options]);

  // CheckboxGroup 라벨
  const groupLabel = useMemo(() => {
    return String(props?.label || props?.children || props?.text || '');
  }, [props]);

  // 방향: props.orientation > style.flexDirection
  const isHorizontal = useMemo(() => {
    // 1. orientation prop 확인 (vertical/horizontal)
    const orientation = props?.orientation;
    if (orientation === 'horizontal') return true;
    if (orientation === 'vertical') return false;

    // 2. style.flexDirection 확인 (row/column)
    const flexDirection = (style as Record<string, unknown>)?.flexDirection;
    return flexDirection === 'row';
  }, [props?.orientation, style]);

  // 스타일
  const checkboxSize = DEFAULT_CHECKBOX_SIZE;
  const borderRadius = DEFAULT_BORDER_RADIUS;
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  const fontSize = parseCSSSize(style?.fontSize, undefined, 14);
  const fontFamily = style?.fontFamily || 'Pretendard, sans-serif';

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 라벨이 있으면 옵션들의 Y 오프셋 추가
  const labelHeight = groupLabel ? fontSize + 8 : 0;

  // 라벨 텍스트 스타일
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily,
        fontSize,
        fontWeight: 'bold',
        fill: textColor,
      }),
    [fontFamily, fontSize, textColor]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handleOptionToggle = useCallback(
    (optionValue: string) => {
      onClick?.(element.id);

      // 토글 로직: 이미 선택되어 있으면 제거, 아니면 추가
      const newSelectedValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];

      onChange?.(element.id, newSelectedValues);
    },
    [element.id, onClick, onChange, selectedValues]
  );

  return (
    <pixiContainer
      x={posX}
      y={posY}
      eventMode="static"
      onPointerDown={handleClick}
    >
      {/* CheckboxGroup 라벨 */}
      {groupLabel && (
        <pixiText
          text={groupLabel}
          style={labelTextStyle}
          x={0}
          y={0}
          eventMode="none"
        />
      )}

      {/* Checkbox 옵션들 */}
      {options.map((option, index) => {
        const isOptionChecked = selectedValues.includes(option.value);

        // 위치 계산 (라벨이 있으면 Y 오프셋 추가)
        const itemX = isHorizontal ? index * 120 : 0;
        const itemY = labelHeight + (isHorizontal ? 0 : index * (checkboxSize + DEFAULT_GAP));

        return (
          <CheckboxItem
            key={option.value}
            option={option}
            isOptionChecked={isOptionChecked}
            x={itemX}
            y={itemY}
            checkboxSize={checkboxSize}
            borderRadius={borderRadius}
            primaryColor={primaryColor}
            textColor={textColor}
            fontSize={fontSize}
            fontFamily={fontFamily}
            onToggle={handleOptionToggle}
          />
        );
      })}
    </pixiContainer>
  );
});

export default PixiCheckboxGroup;
