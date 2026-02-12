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
    shapes: (props, variant, size, _state = 'default') => {
      const sizeName = props.size ?? 'md';
      const maxWidth = TOOLTIP_MAX_WIDTH[sizeName] ?? 150;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;

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
