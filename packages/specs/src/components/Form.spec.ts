/**
 * Form Component Spec
 *
 * Material Design 3 기반 폼 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Form Props
 */
export interface FormProps {
  variant?: 'default' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  title?: string;
  description?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Form Component Spec
 */
export const FormSpec: ComponentSpec<FormProps> = {
  name: 'Form',
  description: 'Material Design 3 기반 폼 컨테이너 컴포넌트',
  element: 'form',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    outlined: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    md: {
      height: 0,
      paddingX: 20,
      paddingY: 20,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
    lg: {
      height: 0,
      paddingX: 28,
      paddingY: 28,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 20,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const width = (props.style?.width as number) || 'auto';
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [];

      // 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: variant.background,
      });

      // 테두리 (outlined variant)
      if (variant.border) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border,
          radius: borderRadius as unknown as number,
        });
      }

      // 타이틀
      if (props.title) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY,
          text: props.title,
          fontSize: (size.fontSize as unknown as number) + 4,
          fontFamily: fontFamily.sans,
          fontWeight: 600,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'top' as const,
        });
      }

      // 설명
      if (props.description) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY + (props.title ? (size.fontSize as unknown as number) + 12 : 0),
          text: props.description,
          fontSize: (size.fontSize as unknown as number) - 2,
          fontFamily: fontFamily.sans,
          fill: '{color.on-surface-variant}' as TokenRef,
          align: 'left' as const,
          baseline: 'top' as const,
        });
      }

      // 폼 필드 컨테이너
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
          gap: size.gap,
          padding: size.paddingY,
        },
      });

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('passive' as const),
    }),
  },
};
