/**
 * Disclosure Component Spec
 *
 * Material Design 3 기반 디스클로저 (아코디언) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Disclosure Props
 */
export interface DisclosureProps {
  variant?: 'default' | 'primary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  isExpanded?: boolean;
  title?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Disclosure Component Spec
 */
export const DisclosureSpec: ComponentSpec<DisclosureProps> = {
  name: 'Disclosure',
  description: 'Material Design 3 기반 디스클로저 (아코디언) 컴포넌트',
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
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
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
      height: 36,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 14,
      gap: 8,
    },
    md: {
      height: 44,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 12,
    },
    lg: {
      height: 52,
      paddingX: 20,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
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
      const title = props.title || 'Disclosure';

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
        // 헤더 (클릭 영역)
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: size.height,
          children: [
            // 타이틀 텍스트
            {
              type: 'text' as const,
              x: size.paddingX,
              y: size.height / 2,
              text: title,
              fontSize: size.fontSize as unknown as number,
              fontFamily: fontFamily.sans,
              fontWeight: 500,
              fill: variant.text,
              baseline: 'middle' as const,
              align: 'left' as const,
            },
          ],
          layout: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: [0, size.paddingX, 0, size.paddingX],
          },
        },
        // 콘텐츠 패널 (isExpanded일 때만 표시)
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: props.isExpanded ? 'auto' : 0,
          children: [],
          layout: {
            display: props.isExpanded ? 'flex' : 'none',
            flexDirection: 'column',
            padding: [0, size.paddingX, size.paddingY, size.paddingX],
            gap: size.gap,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      'data-expanded': props.isExpanded || undefined,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'pointer',
    }),
  },
};
