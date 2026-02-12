/**
 * Panel Component Spec
 *
 * Material Design 3 기반 패널 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Panel Props
 */
export interface PanelProps {
  variant?: 'default' | 'primary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Panel Component Spec
 */
export const PanelSpec: ComponentSpec<PanelProps> = {
  name: 'Panel',
  description: 'Material Design 3 기반 패널 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 24,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;
      const title = props.title;

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
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
      ];

      // 타이틀이 있는 경우
      if (title) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY,
          text: title,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 600,
          fill: variant.text,
          baseline: 'top' as const,
          align: 'left' as const,
        });
        // 타이틀 하단 구분선
        shapes.push({
          type: 'line' as const,
          x1: 0,
          y1: size.paddingY * 2 + (size.fontSize as unknown as number),
          x2: 'auto' as unknown as number,
          y2: size.paddingY * 2 + (size.fontSize as unknown as number),
          stroke: variant.border || ('{color.outline-variant}' as TokenRef),
          strokeWidth: 1,
        });
      }

      // 콘텐츠 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: 'column',
          padding: size.paddingY,
          gap: size.gap,
        },
      });

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
