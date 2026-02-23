/**
 * Tooltip Component Spec
 *
 * Material Design 3 기반 툴팁 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Tooltip Props
 */
export interface TooltipProps {
  variant?: 'primary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  showArrow?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** size별 maxWidth */
export const TOOLTIP_MAX_WIDTH: Record<string, number> = {
  sm: 120,
  md: 150,
  lg: 200,
};

/**
 * Tooltip Component Spec
 *
 * height: 0 = auto
 * overlay: tooltip (포털, 포커스 트랩 없음)
 */
export const TooltipSpec: ComponentSpec<TooltipProps> = {
  name: 'Tooltip',
  description: 'Material Design 3 기반 툴팁 컴포넌트',
  element: 'div',

  defaultVariant: 'surface',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'tooltip',
    hasBackdrop: false,
    closeOnEscape: true,
    trapFocus: false,
    pixiLayer: 'overlay',
  },

  variants: {
    primary: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary}' as TokenRef,
      backgroundPressed: '{color.primary}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 10,
      paddingY: 6,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const sizeName = props.size ?? 'md';
      const maxWidth = TOOLTIP_MAX_WIDTH[sizeName] ?? 150;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;

      // 사용자 스타일 padding 우선, 없으면 spec 기본값
      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 텍스트
        {
          type: 'text' as const,
          x: paddingX,
          y: 0,
          text: props.children || props.text || '',
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
          maxWidth,
        },
      ];

      // Phase F: Arrow indicator (placement 기반)
      // showArrow가 명시적으로 true일 때만 렌더링
      // 삼각형 Path가 없으므로 2개 Line으로 V자 화살표 근사
      if (props.showArrow === true) {
        const arrowSize = 6;
        const placement = props.placement ?? 'top';
        // height=0은 auto 크기를 의미하므로, 렌더링 시점 컨테이너 높이를 알 수 없음
        // 대표적인 툴팁 높이(24px)를 fallback으로 사용하여 bottom/top placement 구분
        const approxHeight = 24;
        const centerX = maxWidth / 2;

        if (placement === 'top') {
          // tooltip이 위에 위치 → arrow는 아래 가장자리
          shapes.push(
            { type: 'line' as const, x1: centerX - arrowSize, y1: approxHeight, x2: centerX, y2: approxHeight + arrowSize, stroke: bgColor, strokeWidth: 2 },
            { type: 'line' as const, x1: centerX + arrowSize, y1: approxHeight, x2: centerX, y2: approxHeight + arrowSize, stroke: bgColor, strokeWidth: 2 },
          );
        } else if (placement === 'bottom') {
          // tooltip이 아래에 위치 → arrow는 위 가장자리
          shapes.push(
            { type: 'line' as const, x1: centerX - arrowSize, y1: 0, x2: centerX, y2: -arrowSize, stroke: bgColor, strokeWidth: 2 },
            { type: 'line' as const, x1: centerX + arrowSize, y1: 0, x2: centerX, y2: -arrowSize, stroke: bgColor, strokeWidth: 2 },
          );
        } else if (placement === 'right') {
          // tooltip이 오른쪽에 위치 → arrow는 왼쪽 가장자리
          const midY = approxHeight / 2;
          shapes.push(
            { type: 'line' as const, x1: 0, y1: midY - arrowSize, x2: -arrowSize, y2: midY, stroke: bgColor, strokeWidth: 2 },
            { type: 'line' as const, x1: 0, y1: midY + arrowSize, x2: -arrowSize, y2: midY, stroke: bgColor, strokeWidth: 2 },
          );
        } else {
          // placement === 'left': tooltip이 왼쪽에 위치 → arrow는 오른쪽 가장자리
          const midY = approxHeight / 2;
          shapes.push(
            { type: 'line' as const, x1: maxWidth, y1: midY - arrowSize, x2: maxWidth + arrowSize, y2: midY, stroke: bgColor, strokeWidth: 2 },
            { type: 'line' as const, x1: maxWidth, y1: midY + arrowSize, x2: maxWidth + arrowSize, y2: midY, stroke: bgColor, strokeWidth: 2 },
          );
        }
      }

      return shapes;
    },

    react: (props) => ({
      'data-placement': props.placement || 'top',
      role: 'tooltip',
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
