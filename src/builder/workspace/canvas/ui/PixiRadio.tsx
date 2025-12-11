/**
 * Pixi Radio
 *
 * 🚀 Phase 11 B2.4: @pixi/ui RadioGroup 래퍼
 *
 * xstudio Element를 @pixi/ui RadioGroup으로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 11 B2.4
 */

import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { RadioGroup as PixiUIRadioGroup } from '@pixi/ui';
import { Graphics, Text, TextStyle, Container as PixiContainer } from 'pixi.js';
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

interface RadioStyle {
  size: number;
  backgroundColor: number;
  selectedColor: number;
  borderColor: number;
  borderWidth: number;
  dotColor: number;
  labelColor: number;
  fontSize: number;
  fontFamily: string;
  gap: number;
  itemGap: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 스타일을 Radio 스타일로 변환
 */
function convertToRadioStyle(style: CSSStyle | undefined): RadioStyle {
  return {
    size: 20,
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    selectedColor: cssColorToHex(style?.backgroundColor, 0x3b82f6),
    borderColor: cssColorToHex(style?.borderColor, 0xd1d5db),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 2),
    dotColor: 0xffffff,
    labelColor: cssColorToHex(style?.color, 0x000000),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    gap: 8, // 라디오 버튼과 라벨 사이 간격
    itemGap: 16, // 라디오 아이템 사이 간격
  };
}

/**
 * 라디오 버튼 Graphics 생성
 */
function createRadioGraphics(
  style: RadioStyle,
  selected: boolean
): Graphics {
  const graphics = new Graphics();
  const radius = style.size / 2;

  // 외부 원
  graphics.circle(radius, radius, radius);
  graphics.fill({ color: selected ? style.selectedColor : style.backgroundColor });

  // Border
  if (style.borderWidth > 0) {
    graphics.circle(radius, radius, radius);
    graphics.stroke({ width: style.borderWidth, color: style.borderColor });
  }

  // 내부 dot (선택됨)
  if (selected) {
    const dotRadius = radius * 0.4;
    graphics.circle(radius, radius, dotRadius);
    graphics.fill({ color: style.dotColor });
  }

  return graphics;
}

/**
 * 라디오 옵션 파싱
 */
function parseRadioOptions(props: Record<string, unknown> | undefined): RadioOption[] {
  if (!props) return [];

  // options 배열이 있는 경우
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

  // children에서 파싱 (Radio 자식 요소)
  if (Array.isArray(props.children)) {
    return props.children.map((child: unknown, index: number) => {
      if (typeof child === 'object' && child !== null) {
        const childObj = child as Record<string, unknown>;
        return {
          value: String(childObj.value || index),
          label: String(childObj.label || childObj.children || ''),
        };
      }
      return { value: String(index), label: String(child) };
    });
  }

  return [];
}

// ============================================
// Component
// ============================================

/**
 * PixiRadio
 *
 * @pixi/ui RadioGroup을 사용하여 라디오 버튼 그룹을 렌더링합니다.
 *
 * @example
 * <PixiRadio element={radioGroupElement} onChange={handleChange} />
 */
export const PixiRadio = memo(function PixiRadio({
  element,
  isSelected,
  onChange,
  onClick,
}: PixiRadioProps) {
  const containerRef = useRef<PixiContainer | null>(null);
  const radioGroupRef = useRef<PixiUIRadioGroup | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 라디오 옵션
  const options = useMemo(() => {
    return parseRadioOptions(props);
  }, [props]);

  // 선택된 값
  const selectedValue = useMemo(() => {
    return String(props?.value || props?.selectedValue || props?.defaultValue || '');
  }, [props]);

  // 라디오 스타일
  const radioStyle = useMemo(() => {
    return convertToRadioStyle(style);
  }, [style]);

  // 위치 계산
  const position = useMemo(() => {
    return {
      x: parseCSSSize(style?.left, undefined, 0),
      y: parseCSSSize(style?.top, undefined, 0),
    };
  }, [style]);

  // 방향
  const orientation = useMemo(() => {
    const flexDirection = (style as Record<string, unknown>)?.flexDirection;
    return flexDirection === 'row' ? 'horizontal' : 'vertical';
  }, [style]);

  // 라디오 그룹 생성/업데이트
  useEffect(() => {
    if (!containerRef.current || options.length === 0) return;

    // 기존 컨텐츠 제거
    if (containerRef.current.children.length > 1) {
      while (containerRef.current.children.length > 1) {
        containerRef.current.removeChildAt(1);
      }
    }

    // 각 라디오 아이템 생성
    const items: PixiContainer[] = [];
    let currentX = 0;
    let currentY = 0;

    options.forEach((option, index) => {
      const isOptionSelected = option.value === selectedValue;

      // 라디오 아이템 컨테이너
      const itemContainer = new PixiContainer();

      // 라디오 버튼 그래픽
      const radioGraphics = createRadioGraphics(radioStyle, isOptionSelected);
      itemContainer.addChild(radioGraphics);

      // 라벨 텍스트
      const textStyle = new TextStyle({
        fontFamily: radioStyle.fontFamily,
        fontSize: radioStyle.fontSize,
        fill: radioStyle.labelColor,
      });

      const labelText = new Text({ text: option.label, style: textStyle });
      labelText.x = radioStyle.size + radioStyle.gap;
      labelText.y = (radioStyle.size - labelText.height) / 2;
      itemContainer.addChild(labelText);

      // 위치 설정
      if (orientation === 'horizontal') {
        itemContainer.x = currentX;
        currentX += radioStyle.size + radioStyle.gap + labelText.width + radioStyle.itemGap;
      } else {
        itemContainer.y = currentY;
        currentY += radioStyle.size + radioStyle.itemGap;
      }

      // 인터랙션
      itemContainer.eventMode = 'static';
      itemContainer.cursor = 'pointer';
      itemContainer.on('pointerdown', () => {
        onChange?.(element.id, option.value);
      });

      items.push(itemContainer);
      containerRef.current?.addChild(itemContainer);
    });

    return () => {
      if (containerRef.current) {
        while (containerRef.current.children.length > 1) {
          containerRef.current.removeChildAt(1);
        }
      }
    };
  }, [options, selectedValue, radioStyle, orientation, element.id, onChange]);

  // 선택 하이라이트 그리기
  const drawSelection = useCallback(
    (g: Graphics) => {
      if (!isSelected) {
        g.clear();
        return;
      }
      g.clear();

      // 전체 영역 계산
      let totalWidth = 0;
      let totalHeight = 0;

      if (orientation === 'horizontal') {
        options.forEach((opt) => {
          totalWidth += radioStyle.size + radioStyle.gap + opt.label.length * radioStyle.fontSize * 0.6 + radioStyle.itemGap;
        });
        totalHeight = radioStyle.size;
      } else {
        totalWidth = Math.max(...options.map((opt) =>
          radioStyle.size + radioStyle.gap + opt.label.length * radioStyle.fontSize * 0.6
        ));
        totalHeight = options.length * (radioStyle.size + radioStyle.itemGap) - radioStyle.itemGap;
      }

      g.rect(-2, -2, totalWidth + 4, totalHeight + 4);
      g.stroke({ width: 2, color: 0x3b82f6 });
    },
    [isSelected, radioStyle, options, orientation]
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

export default PixiRadio;
