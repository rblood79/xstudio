/**
 * Pixi FancyButton
 *
 * 🚀 Phase 6.5: @pixi/ui FancyButton 래퍼
 *
 * @pixi/ui의 FancyButton 컴포넌트를 xstudio Element 시스템과 통합
 * 다양한 상태(hover, pressed, disabled)와 아이콘을 지원합니다.
 *
 * @since 2025-12-13 Phase 6.5
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { FancyButton } from '@pixi/ui';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

export interface PixiFancyButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface FancyButtonLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  hoverColor: number;
  pressedColor: number;
  disabledColor: number;
  textColor: number;
  fontSize: number;
  fontFamily: string;
  borderRadius: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

function convertToFancyButtonStyle(style: CSSStyle | undefined): FancyButtonLayoutStyle {
  const bgColor = cssColorToHex(style?.backgroundColor, 0x3b82f6);

  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 120),
    height: parseCSSSize(style?.height, undefined, 40),
    backgroundColor: bgColor,
    hoverColor: adjustColor(bgColor, 0.9), // 약간 어둡게
    pressedColor: adjustColor(bgColor, 0.8), // 더 어둡게
    disabledColor: 0xcccccc,
    textColor: cssColorToHex(style?.color, 0xffffff),
    fontSize: parseCSSSize(style?.fontSize, undefined, 14),
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 8),
    paddingLeft: parseCSSSize(style?.paddingLeft || style?.padding, undefined, 16),
    paddingRight: parseCSSSize(style?.paddingRight || style?.padding, undefined, 16),
    paddingTop: parseCSSSize(style?.paddingTop || style?.padding, undefined, 8),
    paddingBottom: parseCSSSize(style?.paddingBottom || style?.padding, undefined, 8),
  };
}

/**
 * 색상 밝기 조절
 */
function adjustColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

// ============================================
// Graphics Creation
// ============================================

/**
 * FancyButton 상태별 배경 생성
 */
function createButtonBackground(
  width: number,
  height: number,
  color: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color, alpha: 1 });
  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiFancyButton
 *
 * @pixi/ui의 FancyButton을 사용하여 인터랙티브 버튼 렌더링
 * hover, pressed, disabled 상태를 지원합니다.
 *
 * @example
 * <PixiFancyButton
 *   element={fancyButtonElement}
 *   onClick={(id) => handleClick(id)}
 * />
 */
export const PixiFancyButton = memo(function PixiFancyButton({
  element,
  isSelected,
  onClick,
}: PixiFancyButtonProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<pixiContainer | null>(null);
  const buttonRef = useRef<FancyButton | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // FancyButton 스타일
  const layoutStyle = useMemo(() => convertToFancyButtonStyle(style), [style]);

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || 'FancyButton');
  }, [props?.children, props?.text, props?.label]);

  // disabled 상태
  const isDisabled = useMemo(() => Boolean(props?.disabled), [props?.disabled]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick?.(element.id);
    }
  }, [element.id, onClick, isDisabled]);

  // FancyButton 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;

    // 텍스트 스타일
    const textStyle = new TextStyle({
      fontSize: layoutStyle.fontSize,
      fontFamily: layoutStyle.fontFamily,
      fill: layoutStyle.textColor,
    });

    // 상태별 배경 생성
    const defaultBg = createButtonBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderRadius
    );
    const hoverBg = createButtonBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.hoverColor,
      layoutStyle.borderRadius
    );
    const pressedBg = createButtonBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.pressedColor,
      layoutStyle.borderRadius
    );
    const disabledBg = createButtonBackground(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.disabledColor,
      layoutStyle.borderRadius
    );

    // 텍스트 생성
    const text = new Text({ text: buttonText, style: textStyle });

    // @pixi/ui FancyButton 생성
    const fancyButton = new FancyButton({
      defaultView: defaultBg,
      hoverView: hoverBg,
      pressedView: pressedBg,
      disabledView: disabledBg,
      text,
      padding: layoutStyle.paddingTop,
    });

    // 크기 설정
    fancyButton.width = layoutStyle.width;
    fancyButton.height = layoutStyle.height;

    // disabled 상태 설정
    fancyButton.enabled = !isDisabled;

    // 이벤트 연결
    fancyButton.onPress.connect(handleClick);

    // 컨테이너에 추가
    container.addChild(fancyButton);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    buttonRef.current = fancyButton;

    return () => {
      fancyButton.onPress.disconnectAll();
      app.stage.removeChild(container);
      container.destroy({ children: true });
      containerRef.current = null;
      buttonRef.current = null;
    };
  }, [app, layoutStyle, buttonText, handleClick, isDisabled]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiFancyButton;
