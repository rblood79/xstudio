/**
 * Badge Component Spec
 *
 * Material Design 3 기반 배지 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Badge Props
 */
export interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  isDot?: boolean;
  isPulsing?: boolean;
  isLoading?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Badge Component Spec
 */
export const BadgeSpec: ComponentSpec<BadgeProps> = {
  name: 'Badge',
  description: 'Material Design 3 기반 배지 컴포넌트',
  element: 'span',

  defaultVariant: 'primary',
  defaultSize: 'sm',

  variants: {
    primary: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary}' as TokenRef,
      backgroundPressed: '{color.primary}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
    },
    secondary: {
      background: '{color.secondary}' as TokenRef,
      backgroundHover: '{color.secondary}' as TokenRef,
      backgroundPressed: '{color.secondary}' as TokenRef,
      text: '{color.on-secondary}' as TokenRef,
    },
    tertiary: {
      background: '{color.tertiary}' as TokenRef,
      backgroundHover: '{color.tertiary}' as TokenRef,
      backgroundPressed: '{color.tertiary}' as TokenRef,
      text: '{color.on-tertiary}' as TokenRef,
    },
    error: {
      background: '{color.error}' as TokenRef,
      backgroundHover: '{color.error}' as TokenRef,
      backgroundPressed: '{color.error}' as TokenRef,
      text: '{color.on-error}' as TokenRef,
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
      height: 20,
      paddingX: 6,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 4,
    },
    lg: {
      height: 28,
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 6,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;

      const shapes: Shape[] = [];

      if (props.isDot) {
        // Dot 모드: 원형 점만 표시
        const dotSize = size.height === 20 ? 8 : size.height === 24 ? 10 : 12;
        shapes.push({
          type: 'circle' as const,
          x: dotSize / 2,
          y: dotSize / 2,
          radius: dotSize / 2,
          fill: bgColor,
        });
      } else {
        // 일반 모드: pill 형태 배경 + 텍스트
        shapes.push({
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto' as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });

        const text = props.children || props.text;
        if (text) {
          // 사용자 스타일 padding 우선, 없으면 spec 기본값
          const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
          const paddingX = stylePx != null
            ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
            : size.paddingX;

          // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
          const fontSize = props.style?.fontSize ?? size.fontSize;
          const fwRaw = props.style?.fontWeight;
          const fw = fwRaw != null
            ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
            : 500;
          const ff = (props.style?.fontFamily as string) || fontFamily.sans;
          const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'center';
          const textColor = props.style?.color ?? variant.text;

          shapes.push({
            type: 'text' as const,
            x: paddingX,
            y: 0,
            text,
            fontSize: fontSize as unknown as number,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: textAlign,
            baseline: 'middle' as const,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      'data-dot': props.isDot || undefined,
      'data-pulsing': props.isPulsing || undefined,
      'data-loading': props.isLoading || undefined,
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
