/**
 * FancyButton Component Spec
 *
 * @pixi/ui 기반 장식 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * FancyButton Props
 */
export interface FancyButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  label?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * FancyButton Component Spec
 */
export const FancyButtonSpec: ComponentSpec<FancyButtonProps> = {
  name: 'FancyButton',
  description: '@pixi/ui 기반 장식 버튼 (hover/pressed/disabled 상태 전환)',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary-hover}' as TokenRef,
      backgroundPressed: '{color.primary-pressed}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
      border: '{color.primary}' as TokenRef,
      borderHover: '{color.primary-hover}' as TokenRef,
    },
    secondary: {
      background: '{color.secondary}' as TokenRef,
      backgroundHover: '{color.secondary-hover}' as TokenRef,
      backgroundPressed: '{color.secondary-pressed}' as TokenRef,
      text: '{color.on-secondary}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
      borderHover: '{color.secondary-hover}' as TokenRef,
    },
    gradient: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary-hover}' as TokenRef,
      backgroundPressed: '{color.primary-pressed}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 16,
      paddingY: 6,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 32,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 20,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
    },
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const width = (props.style?.width as number) || 'auto';
      const height = size.height;
      const borderRadius = size.borderRadius;

      const bgColor = state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background;

      const borderColor = (state === 'hover' && variant.borderHover)
        ? variant.borderHover
        : variant.border;

      const shapes: Shape[] = [];

      // Gradient variant: gradient 배경
      if (props.variant === 'gradient') {
        shapes.push({
          id: 'bg',
          type: 'gradient' as const,
          x: 0,
          y: 0,
          width: width === 'auto' ? 120 : width,
          height,
          radius: borderRadius as unknown as number,
          gradient: {
            type: 'linear',
            angle: 135,
            stops: [
              { offset: 0, color: '{color.primary}' as TokenRef },
              { offset: 1, color: '{color.tertiary}' as TokenRef },
            ],
          },
        });
      } else {
        // 일반 배경
        shapes.push({
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });
      }

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // 텍스트
      const text = props.children || props.text || props.label;
      if (text) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 600,
          fill: variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-variant': props.variant || 'default',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
