/**
 * Pixi Button
 *
 * 🚀 Phase 11 B2.4: @pixi/ui FancyButton 기반 Button
 *
 * @pixi/ui의 FancyButton을 명령형으로 생성하여 Container에 추가
 * - JSX 방식은 @pixi/react v8에서 제한적이므로 useEffect로 직접 생성
 *
 * @see https://pixijs.io/ui/storybook/?path=/story/fancybutton--simple
 * @see https://github.com/pixijs/ui/blob/main/src/FancyButton.ts
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-14 P8: useEffect 명령형 FancyButton 생성
 */

import { memo, useCallback, useRef, useEffect } from 'react';
import { Container as PixiContainer, Graphics as PixiGraphicsClass, Text as PixiText, TextStyle, CanvasTextMetrics } from 'pixi.js';
import { FancyButton } from '@pixi/ui';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Constants (CSS 브라우저 기본값 기반)
// ============================================

/**
 * HTML Button 기본 패딩 (브라우저 기본값 참고)
 * Chrome/Safari: 약 1px 6px ~ 2px 6px
 * 여기서는 좀 더 여유있는 패딩 사용
 */
const DEFAULT_PADDING_X = 16; // 좌우 패딩
const DEFAULT_PADDING_Y = 8;  // 상하 패딩

/**
 * 최소 버튼 크기 (너무 작아지는 것 방지)
 */
const MIN_BUTTON_WIDTH = 32;
const MIN_BUTTON_HEIGHT = 24;

// ============================================
// Types
// ============================================

export interface PixiButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

/**
 * CSS 스타일에서 버튼 레이아웃 정보 추출
 *
 * width/height가 'auto' 또는 undefined일 때 텍스트 크기 기반으로 계산
 *
 * HTML/CSS 버튼 크기 계산 공식:
 * - width = paddingLeft + borderLeft + textWidth + borderRight + paddingRight
 * - height = paddingTop + borderTop + lineHeight + borderBottom + paddingBottom
 */
function getButtonLayout(style: CSSStyle | undefined, buttonText: string) {
  const fontSize = parseCSSSize(style?.fontSize, undefined, 14);
  const fontFamily = style?.fontFamily || 'Pretendard, sans-serif';

  // 패딩 추출 (CSS padding 값 사용, 없으면 기본값)
  const paddingTop = parseCSSSize(style?.paddingTop, undefined, DEFAULT_PADDING_Y);
  const paddingRight = parseCSSSize(style?.paddingRight, undefined, DEFAULT_PADDING_X);
  const paddingBottom = parseCSSSize(style?.paddingBottom, undefined, DEFAULT_PADDING_Y);
  const paddingLeft = parseCSSSize(style?.paddingLeft, undefined, DEFAULT_PADDING_X);

  // 테두리 너비 (있으면 사용)
  const borderWidth = parseCSSSize(style?.borderWidth, undefined, 0);

  // width/height가 'auto'인지 확인
  const isWidthAuto = style?.width === 'auto' || style?.width === undefined;
  const isHeightAuto = style?.height === 'auto' || style?.height === undefined;

  let width: number;
  let height: number;

  if (isWidthAuto || isHeightAuto) {
    // TextStyle 생성하여 텍스트 크기 측정
    const textStyle = new TextStyle({
      fontSize,
      fontFamily,
    });

    // CanvasTextMetrics로 텍스트 크기 측정
    const metrics = CanvasTextMetrics.measureText(buttonText, textStyle);
    const textWidth = metrics.width;
    const textHeight = metrics.height;

    // auto일 때 콘텐츠 기반 크기 계산
    if (isWidthAuto) {
      width = paddingLeft + borderWidth + textWidth + borderWidth + paddingRight;
      width = Math.max(width, MIN_BUTTON_WIDTH);
    } else {
      width = parseCSSSize(style?.width, undefined, 120);
    }

    if (isHeightAuto) {
      height = paddingTop + borderWidth + textHeight + borderWidth + paddingBottom;
      height = Math.max(height, MIN_BUTTON_HEIGHT);
    } else {
      height = parseCSSSize(style?.height, undefined, 40);
    }
  } else {
    width = parseCSSSize(style?.width, undefined, 120);
    height = parseCSSSize(style?.height, undefined, 40);
  }

  return {
    left: parseCSSSize(style?.left, undefined, 0),
    top: parseCSSSize(style?.top, undefined, 0),
    width,
    height,
    backgroundColor: cssColorToHex(style?.backgroundColor, 0x3b82f6),
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    textColor: cssColorToHex(style?.color, 0xffffff),
    fontSize,
    fontFamily,
    // 패딩 정보도 반환 (FancyButton padding 설정용)
    paddingX: (paddingLeft + paddingRight) / 2,
    paddingY: (paddingTop + paddingBottom) / 2,
  };
}

/**
 * 버튼 배경 Graphics 생성
 */
function createButtonGraphics(
  width: number,
  height: number,
  backgroundColor: number,
  borderRadius: number
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();
  graphics.roundRect(0, 0, width, height, borderRadius);
  graphics.fill({ color: backgroundColor });
  return graphics;
}

// ============================================
// Component
// ============================================

/**
 * PixiButton
 *
 * @pixi/ui FancyButton을 명령형으로 생성
 *
 * @example
 * <PixiButton element={buttonElement} onClick={handleClick} />
 */
export const PixiButton = memo(function PixiButton({
  element,
  isSelected,
  onClick,
}: PixiButtonProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 버튼 텍스트
  const buttonText = String(props?.children || props?.text || props?.label || 'Button');

  // 레이아웃 스타일 (buttonText 필요 - auto 크기 계산용)
  const layout = getButtonLayout(style, buttonText);

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);
  const buttonRef = useRef<FancyButton | null>(null);

  // FancyButton 생성 및 업데이트
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 기존 버튼 제거
    if (buttonRef.current) {
      container.removeChild(buttonRef.current);
      buttonRef.current.destroy();
      buttonRef.current = null;
    }

    // 배경 Graphics 생성
    const defaultView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.backgroundColor,
      layout.borderRadius
    );

    const hoverColor = Math.min(layout.backgroundColor + 0x202020, 0xffffff);
    const hoverView = createButtonGraphics(
      layout.width,
      layout.height,
      hoverColor,
      layout.borderRadius
    );

    const pressedColor = Math.max(layout.backgroundColor - 0x202020, 0x000000);
    const pressedView = createButtonGraphics(
      layout.width,
      layout.height,
      pressedColor,
      layout.borderRadius
    );

    // TextStyle 및 Text 객체 생성 (FancyButton은 textStyle을 직접 받지 않음)
    console.log('[PixiButton] fontSize:', layout.fontSize);
    const textStyle = new TextStyle({
      fill: layout.textColor,
      fontSize: layout.fontSize,
      fontFamily: layout.fontFamily,
      align: 'center',
    });

    const textView = new PixiText({
      text: buttonText,
      style: textStyle,
    });

    // FancyButton 생성 (text에 PixiText 객체 전달)
    const button = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      text: textView,
      anchor: 0.5,
    });

    // 버튼 위치 조정 (anchor 0.5이므로 중앙 기준)
    button.x = layout.width / 2;
    button.y = layout.height / 2;

    // 클릭 이벤트
    button.onPress.connect(() => {
      console.log('[PixiButton] onPress:', element.id);
      onClick?.(element.id);
    });

    // Container에 추가
    container.addChild(button);
    buttonRef.current = button;

    // Cleanup
    return () => {
      if (buttonRef.current && container.children.includes(buttonRef.current)) {
        container.removeChild(buttonRef.current);
        buttonRef.current.destroy();
        buttonRef.current = null;
      }
    };
  }, [
    layout.width,
    layout.height,
    layout.backgroundColor,
    layout.borderRadius,
    layout.textColor,
    layout.fontSize,
    layout.fontFamily,
    buttonText,
    element.id,
    onClick,
  ]);

  // 선택 테두리 Graphics draw
  const drawSelection = useCallback((g: PixiGraphicsClass) => {
    g.clear();
    if (isSelected) {
      g.roundRect(-2, -2, layout.width + 4, layout.height + 4, layout.borderRadius + 2);
      g.stroke({ color: 0x3b82f6, width: 2 });
    }
  }, [isSelected, layout.width, layout.height, layout.borderRadius]);

  return (
    <pixiContainer
      x={layout.left}
      y={layout.top}
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* FancyButton은 useEffect에서 명령형으로 추가됨 */}

      {/* 선택 테두리 */}
      {isSelected && (
        <pixiGraphics draw={drawSelection} />
      )}
    </pixiContainer>
  );
});

export default PixiButton;
