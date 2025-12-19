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

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';
import { drawCircle } from '../utils';
import { useStore } from '../../../stores';
import { getRadioSizePreset, getLabelStylePreset } from '../utils/cssVariableReader';

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

// 🚀 Phase 0: CSS 동기화 - 하드코딩된 상수 대신 getRadioSizePreset() 사용
const DEFAULT_PRIMARY_COLOR = 0x3b82f6; // blue-500
const DEFAULT_BORDER_COLOR = 0xd1d5db; // gray-300
const DEFAULT_TEXT_COLOR = 0x374151; // gray-700
const LABEL_GAP = 8;

// 기본 옵션 (options가 없을 때 placeholder로 표시)
const DEFAULT_OPTIONS: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * props.options에서 라디오 옵션 파싱
 */
function parseRadioOptionsFromProps(props: Record<string, unknown> | undefined): RadioOption[] | null {
  if (!props) return null;

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

  return null;
}

/**
 * 자식 Radio 요소들에서 옵션 파싱
 */
function parseRadioOptionsFromChildren(childRadios: Element[]): RadioOption[] | null {
  if (childRadios.length === 0) return null;

  return childRadios
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((radio, index) => {
      const props = radio.props as Record<string, unknown> | undefined;
      return {
        value: String(props?.value || props?.id || radio.id || index),
        label: String(props?.children || props?.label || props?.text || `Option ${index + 1}`),
      };
    });
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
  // 🚀 Border-Box v2: drawCircle 유틸리티 사용
  const drawRadio = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const radius = radioSize / 2;
      const centerX = radius;
      const centerY = radius;

      // Border-Box v2: drawCircle 유틸리티로 배경 + 테두리 그리기
      drawCircle(g, {
        x: centerX,
        y: centerY,
        radius,
        backgroundColor,
        backgroundAlpha: 1,
        border: {
          width: 2,
          color: borderColor,
          alpha: 1,
        },
      });

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
  onChange,
  onClick,
}: PixiRadioProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Store에서 자식 Radio 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childRadios = useMemo(() => {
    return elements.filter(
      (el) => el.parent_id === element.id && el.tag === 'Radio'
    );
  }, [elements, element.id]);

  // 라디오 옵션: 자식 Radio 요소들 > props.options > 기본값
  const options = useMemo(() => {
    // 1. 자식 Radio 요소들이 있으면 사용
    const fromChildren = parseRadioOptionsFromChildren(childRadios);
    if (fromChildren) return fromChildren;

    // 2. props.options가 있으면 사용
    const fromProps = parseRadioOptionsFromProps(props);
    if (fromProps) return fromProps;

    // 3. 기본값
    return DEFAULT_OPTIONS;
  }, [childRadios, props]);

  // 선택된 값: RadioGroup props > 자식 Radio의 isSelected > 없음
  const selectedValue = useMemo(() => {
    // 1. RadioGroup의 value/selectedValue 우선
    if (props?.value || props?.selectedValue || props?.defaultValue) {
      return String(props.value || props.selectedValue || props.defaultValue);
    }

    // 2. 자식 Radio 중 isSelected/checked가 true인 항목 찾기
    const selectedChild = childRadios.find((radio) => {
      const radioProps = radio.props as Record<string, unknown> | undefined;
      return Boolean(radioProps?.isSelected || radioProps?.checked || radioProps?.defaultSelected);
    });

    if (selectedChild) {
      const radioProps = selectedChild.props as Record<string, unknown> | undefined;
      return String(radioProps?.value || selectedChild.id);
    }

    return '';
  }, [props, childRadios]);

  // RadioGroup 라벨
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

  // 🚀 Phase 0: CSS 동기화 - size prop에서 사이즈 프리셋 적용
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const sizePreset = useMemo(() => getRadioSizePreset(size), [size]);
  // 🚀 Phase 19: .react-aria-Label 클래스에서 스타일 읽기
  const labelPreset = useMemo(() => getLabelStylePreset(size), [size]);

  // 스타일 (CSS 사이즈 프리셋 적용)
  const radioSize = sizePreset.radioSize;
  const gap = sizePreset.gap;
  const primaryColor = cssColorToHex(style?.backgroundColor, DEFAULT_PRIMARY_COLOR);
  const textColor = cssColorToHex(style?.color, DEFAULT_TEXT_COLOR);
  const fontSize = parseCSSSize(style?.fontSize, undefined, labelPreset.fontSize);
  const fontFamily = labelPreset.fontFamily;

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 라벨이 있으면 옵션들의 Y 오프셋 추가
  const labelHeight = groupLabel ? labelPreset.fontSize + 8 : 0;

  // 🚀 Phase 19: 전체 그룹 크기 계산 (hitArea용)
  const groupDimensions = useMemo(() => {
    const optionCount = options.length;
    const optionWidth = 120; // 각 옵션의 대략적인 너비
    const optionHeight = radioSize + gap;

    if (isHorizontal) {
      return {
        width: optionCount * optionWidth,
        height: labelHeight + radioSize,
      };
    }
    return {
      width: optionWidth,
      height: labelHeight + optionCount * optionHeight,
    };
  }, [options.length, radioSize, gap, labelHeight, isHorizontal]);

  // 🚀 Phase 19: 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, groupDimensions.width, groupDimensions.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [groupDimensions]
  );

  // 라벨 텍스트 스타일 - 🚀 Phase 19: .react-aria-Label 클래스에서 스타일 읽기
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: labelPreset.fontFamily,
        fontSize: labelPreset.fontSize,
        fontWeight: labelPreset.fontWeight,
        fill: labelPreset.color,
      }),
    [labelPreset]
  );

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
    <pixiContainer x={posX} y={posY}>
      {/* RadioGroup 라벨 */}
      {groupLabel && (
        <pixiText
          text={groupLabel}
          style={labelTextStyle}
          x={0}
          y={0}
          eventMode="none"
        />
      )}

      {/* Radio 옵션들 */}
      {options.map((option, index) => {
        const isOptionSelected = option.value === selectedValue;

        // 위치 계산 (라벨이 있으면 Y 오프셋 추가)
        // 🚀 Phase 0: CSS 사이즈 프리셋의 gap 값 사용
        const itemX = isHorizontal ? index * 120 : 0;
        const itemY = labelHeight + (isHorizontal ? 0 : index * (radioSize + gap));

        return (
          <RadioItem
            key={`${option.value}-${index}`}
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

      {/* 🚀 Phase 19: 투명 히트 영역 (그룹 전체 선택용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiRadio;
