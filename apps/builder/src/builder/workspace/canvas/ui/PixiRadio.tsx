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
import { getRadioSizePreset, getLabelStylePreset, getVariantColors } from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

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
const DEFAULT_BORDER_COLOR = 0xd1d5db; // fallback gray-300
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
  radioSize: number;
  primaryColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  itemWidth: number;
  onSelect: (value: string) => void;
}

const RadioItem = memo(function RadioItem({
  option,
  isOptionSelected,
  radioSize,
  primaryColor,
  textColor,
  fontSize,
  fontFamily,
  itemWidth,
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
    <pixiContainer
      layout={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: LABEL_GAP,
        width: itemWidth,
      }}
    >
      <pixiContainer layout={{ width: radioSize, height: radioSize }}>
        {/* 라디오 원 */}
        <pixiGraphics
          draw={drawRadio}
          eventMode="static"
          cursor="pointer"
          onPointerDown={handlePointerDown}
        />
      </pixiContainer>

      {/* 라벨 텍스트 */}
      <pixiText
        text={option.label}
        style={textStyle}
        layout={{ isLeaf: true }}
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

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // variant에 따른 색상 (default, primary, secondary, tertiary, error, surface)
  const variant = useMemo(() => {
    return String(props?.variant || 'default');
  }, [props?.variant]);

  const variantColors = useMemo(() => {
    return getVariantColors(variant, themeColors);
  }, [variant, themeColors]);

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
  // 🚀 테마 색상 사용 (inline style 오버라이드 지원)
  const primaryColor = cssColorToHex(style?.backgroundColor, variantColors.bg);
  const textColor = cssColorToHex(style?.color, variantColors.text);
  const fontSize = parseCSSSize(style?.fontSize, undefined, labelPreset.fontSize);
  const fontFamily = labelPreset.fontFamily;

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 라벨이 있으면 옵션들의 Y 오프셋 추가
  const labelHeight = groupLabel ? labelPreset.fontSize + 8 : 0;
  const itemWidth = 120;
  const itemsLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    gap: isHorizontal ? 0 : gap,
  }), [isHorizontal, gap]);

  // 🚀 Phase 19: 전체 그룹 크기 계산 (hitArea용)
  const groupDimensions = useMemo(() => {
    const optionCount = options.length;
    const optionHeight = radioSize + gap;

    if (isHorizontal) {
      return {
        width: optionCount * itemWidth,
        height: labelHeight + radioSize,
      };
    }
    return {
      width: itemWidth,
      height: labelHeight + optionCount * optionHeight,
    };
  }, [options.length, radioSize, gap, labelHeight, isHorizontal, itemWidth]);

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
        fontWeight: labelPreset.fontWeight as import('pixi.js').TextStyleFontWeight,
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
      <pixiContainer x={0} y={labelHeight} layout={itemsLayout}>
        {options.map((option, index) => {
          const isOptionSelected = option.value === selectedValue;

          return (
            <RadioItem
              key={`${option.value}-${index}`}
              option={option}
              isOptionSelected={isOptionSelected}
              radioSize={radioSize}
              primaryColor={primaryColor}
              textColor={textColor}
              fontSize={fontSize}
              fontFamily={fontFamily}
              itemWidth={itemWidth}
              onSelect={handleOptionSelect}
            />
          );
        })}
      </pixiContainer>

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
