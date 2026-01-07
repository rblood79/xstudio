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
// 🚀 Phase 8: parseCSSSize 제거
import { getVariantColors } from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

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

function convertToFancyButtonStyle(style: CSSStyle | undefined, themeDefaultColor: number): FancyButtonLayoutStyle {
  // Extract RGB from backgroundColor
  const bgColor = (() => {
    const bg = style?.backgroundColor;
    if (!bg) return themeDefaultColor;
    if (typeof bg === 'number') return bg;
    if (typeof bg === 'string') {
      if (bg.startsWith('#')) {
        return parseInt(bg.slice(1), 16);
      }
    }
    return themeDefaultColor;
  })();

  // Extract RGB from color
  const textColor = (() => {
    const col = style?.color;
    if (!col) return 0xffffff;
    if (typeof col === 'number') return col;
    if (typeof col === 'string') {
      if (col.startsWith('#')) {
        return parseInt(col.slice(1), 16);
      }
    }
    return 0xffffff;
  })();

  // 🚀 Phase 8: parseCSSSize 제거 - fallback 값 직접 사용
  return {
    x: typeof style?.left === 'number' ? style.left : 0,
    y: typeof style?.top === 'number' ? style.top : 0,
    width: typeof style?.width === 'number' ? style.width : 120,
    height: typeof style?.height === 'number' ? style.height : 40,
    backgroundColor: bgColor,
    hoverColor: adjustColor(bgColor, 0.9), // 약간 어둡게
    pressedColor: adjustColor(bgColor, 0.8), // 더 어둡게
    disabledColor: 0xcccccc,
    textColor: textColor,
    fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 14,
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : 8,
    paddingLeft: typeof (style?.paddingLeft || style?.padding) === 'number' ? (style?.paddingLeft || style?.padding) as number : 16,
    paddingRight: typeof (style?.paddingRight || style?.padding) === 'number' ? (style?.paddingRight || style?.padding) as number : 16,
    paddingTop: typeof (style?.paddingTop || style?.padding) === 'number' ? (style?.paddingTop || style?.padding) as number : 8,
    paddingBottom: typeof (style?.paddingBottom || style?.padding) === 'number' ? (style?.paddingBottom || style?.padding) as number : 8,
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
  onClick,
}: PixiFancyButtonProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const buttonRef = useRef<FancyButton | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // FancyButton 스타일 (테마 색상 적용)
  const layoutStyle = useMemo(() => convertToFancyButtonStyle(style, variantColors.bg), [style, variantColors.bg]);

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

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      // 이벤트 연결 해제
      try {
        fancyButton.onPress.disconnectAll();
      } catch {
        // ignore
      }

      // Stage에서 제거
      try {
        app.stage.removeChild(container);
      } catch {
        // ignore
      }

      // Graphics 객체 명시적 destroy (GPU 리소스 해제)
      try {
        defaultBg.destroy(true);
        hoverBg.destroy(true);
        pressedBg.destroy(true);
        disabledBg.destroy(true);
        text.destroy(true);
      } catch {
        // CanvasTextSystem race condition - 무시
      }

      // FancyButton 및 Container destroy
      try {
        if (!fancyButton.destroyed) {
          fancyButton.destroy({ children: true });
        }
        if (!container.destroyed) {
          container.destroy({ children: true });
        }
      } catch {
        // ignore
      }

      containerRef.current = null;
      buttonRef.current = null;
    };
  }, [app, layoutStyle, buttonText, handleClick, isDisabled]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiFancyButton;
