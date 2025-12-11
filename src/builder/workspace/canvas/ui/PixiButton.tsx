/**
 * Pixi Button
 *
 * 🚀 Phase 11 B2.4: @pixi/ui Button 래퍼
 *
 * xstudio Element를 @pixi/ui Button으로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 11 B2.4
 */

import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button as PixiUIButton } from '@pixi/ui';
import { Graphics, Text, TextStyle, Container as PixiContainer } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface ButtonStyle {
  width: number;
  height: number;
  backgroundColor: number;
  hoverColor: number;
  pressedColor: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 스타일을 Button 스타일로 변환
 */
function convertToButtonStyle(style: CSSStyle | undefined, props: Record<string, unknown> | undefined): ButtonStyle {
  const backgroundColor = cssColorToHex(style?.backgroundColor, 0x3b82f6);

  // 호버/프레스 색상 (배경색 기반으로 자동 계산)
  const hoverColor = adjustBrightness(backgroundColor, -20);
  const pressedColor = adjustBrightness(backgroundColor, -40);

  return {
    width: parseCSSSize(style?.width, undefined, 120),
    height: parseCSSSize(style?.height, undefined, 40),
    backgroundColor,
    hoverColor,
    pressedColor,
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    borderWidth: parseCSSSize(style?.borderWidth, undefined, 0),
    borderColor: cssColorToHex(style?.borderColor, 0x000000),
    textColor: cssColorToHex(style?.color, 0xffffff),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
  };
}

/**
 * 색상 밝기 조절
 */
function adjustBrightness(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
}

/**
 * 버튼 배경 Graphics 생성
 */
function createButtonGraphics(
  style: ButtonStyle,
  state: 'default' | 'hover' | 'pressed'
): Graphics {
  const graphics = new Graphics();

  const color =
    state === 'pressed' ? style.pressedColor :
    state === 'hover' ? style.hoverColor :
    style.backgroundColor;

  if (style.borderRadius > 0) {
    graphics.roundRect(0, 0, style.width, style.height, style.borderRadius);
  } else {
    graphics.rect(0, 0, style.width, style.height);
  }
  graphics.fill({ color });

  if (style.borderWidth > 0) {
    if (style.borderRadius > 0) {
      graphics.roundRect(0, 0, style.width, style.height, style.borderRadius);
    } else {
      graphics.rect(0, 0, style.width, style.height);
    }
    graphics.stroke({ width: style.borderWidth, color: style.borderColor });
  }

  return graphics;
}

// ============================================
// Component
// ============================================

/**
 * PixiButton
 *
 * @pixi/ui Button을 사용하여 인터랙티브 버튼을 렌더링합니다.
 *
 * @example
 * <PixiButton element={buttonElement} onClick={handleClick} />
 */
export const PixiButton = memo(function PixiButton({
  element,
  isSelected,
  onClick,
}: PixiButtonProps) {
  const containerRef = useRef<PixiContainer | null>(null);
  const buttonRef = useRef<PixiUIButton | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || 'Button');
  }, [props]);

  // 버튼 스타일
  const buttonStyle = useMemo(() => {
    return convertToButtonStyle(style, props);
  }, [style, props]);

  // 위치 계산
  const position = useMemo(() => {
    return {
      x: parseCSSSize(style?.left, undefined, 0),
      y: parseCSSSize(style?.top, undefined, 0),
    };
  }, [style]);

  // 버튼 생성/업데이트
  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 버튼 제거
    if (buttonRef.current) {
      containerRef.current.removeChild(buttonRef.current.view);
      buttonRef.current = null;
    }

    // Graphics 생성
    const defaultView = createButtonGraphics(buttonStyle, 'default');
    const hoverView = createButtonGraphics(buttonStyle, 'hover');
    const pressedView = createButtonGraphics(buttonStyle, 'pressed');

    // Button 생성
    const button = new PixiUIButton({
      defaultView,
      hoverView,
      pressedView,
    });

    // 텍스트 추가
    const textStyle = new TextStyle({
      fontFamily: buttonStyle.fontFamily,
      fontSize: buttonStyle.fontSize,
      fill: buttonStyle.textColor,
      align: 'center',
    });

    const text = new Text({ text: buttonText, style: textStyle });
    text.anchor.set(0.5);
    text.x = buttonStyle.width / 2;
    text.y = buttonStyle.height / 2;
    button.view.addChild(text);

    // 클릭 이벤트
    button.onPress.connect(() => {
      onClick?.(element.id);
    });

    // 컨테이너에 추가
    containerRef.current.addChild(button.view);
    buttonRef.current = button;

    return () => {
      if (buttonRef.current && containerRef.current) {
        containerRef.current.removeChild(buttonRef.current.view);
        buttonRef.current = null;
      }
    };
  }, [buttonStyle, buttonText, element.id, onClick]);

  // 선택 하이라이트 그리기
  const drawSelection = useCallback(
    (g: Graphics) => {
      if (!isSelected) {
        g.clear();
        return;
      }
      g.clear();
      g.rect(-2, -2, buttonStyle.width + 4, buttonStyle.height + 4);
      g.stroke({ width: 2, color: 0x3b82f6 });
    },
    [isSelected, buttonStyle]
  );

  return (
    <pixiContainer
      x={position.x}
      y={position.y}
      ref={(container: PixiContainer | null) => {
        containerRef.current = container;
      }}
    >
      <pixiGraphics draw={drawSelection} />
    </pixiContainer>
  );
});

export default PixiButton;
