/**
 * Pixi Radio
 *
 * 🚀 Phase 11 B2.4: @pixi/layout 기반 RadioGroup
 *
 * @pixi/layout의 LayoutContainer를 사용하여 CSS 스타일 직접 적용
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-11 - @pixi/layout LayoutContainer 기반으로 리팩토링
 * @updated 2025-12-13 P5: pixiContainer 래퍼로 이벤트 처리 (GitHub #126 workaround)
 */

// @pixi/layout 컴포넌트 extend (JSX 사용 전 필수)
import '../pixiSetup';
// @pixi/layout React 타입 선언
import '@pixi/layout/react';

import { memo, useCallback, useMemo } from 'react';
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
// Style Conversion
// ============================================

function convertToRadioLayout(style: CSSStyle | undefined, isItemSelected: boolean) {
  const size = 20;
  const primaryColor = cssColorToHex(style?.backgroundColor, 0x3b82f6);

  return {
    circle: {
      width: size,
      height: size,
      backgroundColor: isItemSelected ? primaryColor : 0xffffff,
      borderRadius: size / 2, // 원형
      borderWidth: 2,
      borderColor: isItemSelected ? primaryColor : 0xd1d5db,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    dot: {
      width: size * 0.4,
      height: size * 0.4,
      backgroundColor: 0xffffff,
      borderRadius: (size * 0.4) / 2,
    },
    label: {
      fill: cssColorToHex(style?.color, 0x000000),
      fontSize: parseCSSSize(style?.fontSize, undefined, 14),
      fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    },
  };
}

function parseRadioOptions(props: Record<string, unknown> | undefined): RadioOption[] {
  if (!props) return [];

  if (Array.isArray(props.options)) {
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

  return [];
}

// ============================================
// Component
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

  // 위치
  const position = useMemo(() => ({
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
  }), [style]);

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  const handleOptionClick = useCallback((optionValue: string) => {
    onChange?.(element.id, optionValue);
  }, [element.id, onChange]);

  // P5 Workaround: pixiContainer로 이벤트 처리 (GitHub #126)
  return (
    <pixiContainer
      x={position.x}
      y={position.y}
      eventMode="static"
      onPointerDown={handleClick}
    >
      <layoutContainer
        layout={{
          flexDirection: isHorizontal ? 'row' : 'column',
          gap: 12,
        }}
      >
        {options.map((option) => {
          const isOptionSelected = option.value === selectedValue;
          const layoutStyles = convertToRadioLayout(style, isOptionSelected);

          return (
            <pixiContainer
              key={option.value}
              eventMode="static"
              cursor="pointer"
              onPointerDown={() => handleOptionClick(option.value)}
            >
              <layoutContainer
                layout={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* 라디오 원 */}
                <layoutContainer
                  layout={{
                    width: layoutStyles.circle.width,
                    height: layoutStyles.circle.height,
                    backgroundColor: layoutStyles.circle.backgroundColor,
                    borderRadius: layoutStyles.circle.borderRadius,
                    borderWidth: layoutStyles.circle.borderWidth,
                    borderColor: layoutStyles.circle.borderColor,
                    justifyContent: layoutStyles.circle.justifyContent,
                    alignItems: layoutStyles.circle.alignItems,
                  }}
                >
                  {/* 내부 dot */}
                  {isOptionSelected && (
                    <layoutContainer
                      layout={{
                        width: layoutStyles.dot.width,
                        height: layoutStyles.dot.height,
                        backgroundColor: layoutStyles.dot.backgroundColor,
                        borderRadius: layoutStyles.dot.borderRadius,
                      }}
                    />
                  )}
                </layoutContainer>

                {/* 라벨 */}
                <layoutText
                  text={option.label}
                  style={{
                    fill: layoutStyles.label.fill,
                    fontSize: layoutStyles.label.fontSize,
                    fontFamily: layoutStyles.label.fontFamily,
                  }}
                  layout={true}
                />
              </layoutContainer>
            </pixiContainer>
          );
        })}

      </layoutContainer>
    </pixiContainer>
  );
});

export default PixiRadio;
