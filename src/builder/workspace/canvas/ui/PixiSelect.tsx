/**
 * Pixi Select
 *
 * 🚀 Phase 6.3: @pixi/ui Select 래퍼
 *
 * @pixi/ui의 Select 컴포넌트를 xstudio Element 시스템과 통합
 * 드롭다운 선택 UI를 제공합니다.
 *
 * @since 2025-12-13 Phase 6.3
 */

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { Select } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiSelectProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================
// Style Conversion
// ============================================

interface SelectLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  paddingLeft: number;
  paddingRight: number;
}

function convertToSelectStyle(style: CSSStyle | undefined): SelectLayoutStyle {
  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 200),
    height: parseCSSSize(style?.height, undefined, 36),
    backgroundColor: cssColorToHex(style?.backgroundColor, 0xffffff),
    borderColor: cssColorToHex(style?.borderColor, 0xd1d5db),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 1),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 6),
    textColor: cssColorToHex(style?.color, 0x000000),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    paddingLeft: parseCSSSize(style?.paddingLeft || style?.padding, undefined, 12),
    paddingRight: parseCSSSize(style?.paddingRight || style?.padding, undefined, 12),
  };
}

function parseSelectOptions(props: Record<string, unknown> | undefined): SelectOption[] {
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
// Graphics Creation
// ============================================

/**
 * Select 버튼 배경 생성
 */
function createSelectBackground(
  width: number,
  height: number,
  backgroundColor: number,
  borderColor: number,
  borderWidth: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();

  // 배경
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color: backgroundColor, alpha: 1 });

  // 테두리
  g.roundRect(0, 0, width, height, borderRadius);
  g.stroke({ width: borderWidth, color: borderColor, alpha: 1 });

  return g;
}

/**
 * 드롭다운 화살표 생성
 */
function createDropdownArrow(height: number, color: number): Graphics {
  const g = new Graphics();
  const arrowSize = 6;
  const centerY = height / 2;

  // 삼각형 화살표
  g.moveTo(0, centerY - arrowSize / 2);
  g.lineTo(arrowSize, centerY - arrowSize / 2);
  g.lineTo(arrowSize / 2, centerY + arrowSize / 2);
  g.closePath();
  g.fill({ color, alpha: 1 });

  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiSelect
 *
 * @pixi/ui의 Select를 사용하여 드롭다운 렌더링
 *
 * @example
 * <PixiSelect
 *   element={selectElement}
 *   onChange={(id, value) => handleValueChange(id, value)}
 * />
 */
export const PixiSelect = memo(function PixiSelect({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiSelectProps) {
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const selectRef = useRef<Select | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Select 스타일
  const layoutStyle = useMemo(() => convertToSelectStyle(style), [style]);

  // 옵션들
  const options = useMemo(() => parseSelectOptions(props), [props]);

  // 선택된 값
  const selectedValue = useMemo(
    () => String(props?.value || props?.selectedValue || props?.defaultValue || ''),
    [props?.value, props?.selectedValue, props?.defaultValue]
  );

  // 이벤트 핸들러
  const handleChange = useCallback(
    (_index: number, value: string) => {
      onChange?.(element.id, value);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Select 생성 및 관리
  useEffect(() => {
    if (!app?.stage || options.length === 0) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 텍스트 스타일
    const textStyle = new TextStyle({
      fontSize: layoutStyle.fontSize,
      fontFamily: layoutStyle.fontFamily,
      fill: layoutStyle.textColor,
    });

    // 아이템 생성 함수
    const createItem = (label: string, isButton: boolean = false): Container => {
      const itemContainer = new Container();

      // 배경
      const bg = createSelectBackground(
        layoutStyle.width,
        layoutStyle.height,
        isButton ? layoutStyle.backgroundColor : 0xf9fafb,
        layoutStyle.borderColor,
        isButton ? layoutStyle.borderWidth : 0,
        isButton ? layoutStyle.borderRadius : 0
      );
      itemContainer.addChild(bg);

      // 텍스트
      const text = new Text({ text: label, style: textStyle });
      text.x = layoutStyle.paddingLeft;
      text.y = (layoutStyle.height - text.height) / 2;
      itemContainer.addChild(text);

      // 버튼인 경우 화살표 추가
      if (isButton) {
        const arrow = createDropdownArrow(layoutStyle.height, layoutStyle.textColor);
        arrow.x = layoutStyle.width - layoutStyle.paddingRight - 6;
        itemContainer.addChild(arrow);
      }

      return itemContainer;
    };

    // 선택된 라벨 찾기
    const selectedOption = options.find((opt) => opt.value === selectedValue);
    const selectedLabel = selectedOption?.label || options[0]?.label || 'Select...';

    // @pixi/ui Select 생성
    const select = new Select({
      closedBG: createSelectBackground(
        layoutStyle.width,
        layoutStyle.height,
        layoutStyle.backgroundColor,
        layoutStyle.borderColor,
        layoutStyle.borderWidth,
        layoutStyle.borderRadius
      ),
      openBG: createSelectBackground(
        layoutStyle.width,
        layoutStyle.height * (options.length + 1),
        layoutStyle.backgroundColor,
        layoutStyle.borderColor,
        layoutStyle.borderWidth,
        layoutStyle.borderRadius
      ),
      textStyle,
      items: {
        items: options.map((opt) => opt.label),
        backgroundColor: 0xf9fafb,
        hoverColor: 0xe5e7eb,
        width: layoutStyle.width,
        height: layoutStyle.height,
        textOffset: [layoutStyle.paddingLeft, 0],
      },
      scrollBox: {
        width: layoutStyle.width,
        height: layoutStyle.height * Math.min(options.length, 5),
      },
    });

    // 초기 값 설정
    const selectedIndex = options.findIndex((opt) => opt.value === selectedValue);
    if (selectedIndex >= 0) {
      select.value = selectedIndex;
    }

    // 이벤트 연결
    select.onSelect.connect(handleChange);

    // 컨테이너에 추가
    container.addChild(select);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    selectRef.current = select;

    return () => {
      select.onSelect.disconnectAll();
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      selectRef.current = null;
    };
  }, [app, layoutStyle, options, selectedValue, handleClick, handleChange]);

  // 선택 표시
  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 선택 표시 제거
    const existingSelection = containerRef.current.getChildByName('selection');
    if (existingSelection) {
      containerRef.current.removeChild(existingSelection);
      existingSelection.destroy();
    }

    // 선택 상태이면 테두리 추가
    if (isSelected) {
      const selection = new Graphics();
      selection.name = 'selection';
      selection.roundRect(-4, -4, layoutStyle.width + 8, layoutStyle.height + 8, 4);
      selection.stroke({ width: 2, color: 0x3b82f6, alpha: 1 });
      containerRef.current.addChildAt(selection, 0);
    }
  }, [isSelected, layoutStyle.width, layoutStyle.height]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiSelect;
