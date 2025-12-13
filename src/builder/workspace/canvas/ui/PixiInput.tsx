/**
 * Pixi Input
 *
 * 🚀 Phase 6.2: @pixi/ui Input 래퍼
 *
 * @pixi/ui의 Input 컴포넌트를 xstudio Element 시스템과 통합
 * 텍스트 입력을 위해 HTML input 오버레이를 사용합니다.
 *
 * @since 2025-12-13 Phase 6.2
 */

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { Input } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiInputProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface InputLayoutStyle {
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

function convertToInputStyle(style: CSSStyle | undefined): InputLayoutStyle {
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

// ============================================
// Graphics Creation
// ============================================

/**
 * 입력 필드 배경 생성
 */
function createInputBackground(
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

// ============================================
// Component
// ============================================

/**
 * PixiInput
 *
 * @pixi/ui의 Input을 사용하여 텍스트 입력 필드 렌더링
 *
 * @example
 * <PixiInput
 *   element={inputElement}
 *   onChange={(id, value) => handleValueChange(id, value)}
 * />
 */
export const PixiInput = memo(function PixiInput({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiInputProps) {
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const inputRef = useRef<Input | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 입력 스타일
  const layoutStyle = useMemo(() => convertToInputStyle(style), [style]);

  // 입력 값과 placeholder
  const value = useMemo(() => String(props?.value || props?.defaultValue || ''), [props?.value, props?.defaultValue]);
  const placeholder = useMemo(() => String(props?.placeholder || ''), [props?.placeholder]);

  // 이벤트 핸들러
  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(element.id, newValue);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Input 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'text';
    container.on('pointerdown', handleClick);

    // 배경 그래픽 생성
    const bg = createInputBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderColor,
      layoutStyle.borderWidth,
      layoutStyle.borderRadius
    );

    // 텍스트 스타일
    const textStyle = new TextStyle({
      fontSize: layoutStyle.fontSize,
      fontFamily: layoutStyle.fontFamily,
      fill: layoutStyle.textColor,
    });

    // @pixi/ui Input 생성
    const input = new Input({
      bg,
      textStyle,
      placeholder,
      value,
      padding: [0, layoutStyle.paddingRight, 0, layoutStyle.paddingLeft],
    });

    // 크기 설정
    input.width = layoutStyle.width;
    input.height = layoutStyle.height;

    // 이벤트 연결
    input.onEnter.connect(handleChange);
    input.onChange.connect(handleChange);

    // 컨테이너에 추가
    container.addChild(input);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    inputRef.current = input;

    return () => {
      input.onEnter.disconnectAll();
      input.onChange.disconnectAll();
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      inputRef.current = null;
    };
  }, [app, layoutStyle, placeholder, handleClick, handleChange]);

  // 값 동기화
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

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

export default PixiInput;
