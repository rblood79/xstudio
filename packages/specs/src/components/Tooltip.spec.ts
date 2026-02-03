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
}

/** size별 maxWidth */
const SIZE_MAX_WIDTH: Record<string, number> = {
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
      const maxWidth = SIZE_MAX_WIDTH[sizeName] ?? 150;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: size.borderRadius as unknown as number,
          fill: variant.background,
        },
        // 텍스트
        {
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.children || props.text || '',
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: variant.text,
          align: 'left' as const,
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
