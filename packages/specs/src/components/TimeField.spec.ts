/**
 * TimeField Component Spec
 *
 * Material Design 3 기반 시간 입력 필드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * TimeField Props
 */
export interface TimeFieldProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  placeholder?: string;
  label?: string;
  hourCycle?: 12 | 24;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * TimeField Component Spec
 */
export const TimeFieldSpec: ComponentSpec<TimeFieldProps> = {
  name: 'TimeField',
  description: 'Material Design 3 기반 시간 입력 필드 (hour:minute:second 세그먼트)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
      borderHover: '{color.primary-hover}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 6,
    },
    lg: {
      height: 48,
      paddingX: 18,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 8,
    },
  },

  states: {
    hover: {},
    pressed: {},
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
      const width = (props.style?.width as number) || 160;
      const height = size.height;
      const borderRadius = size.borderRadius;

      const borderColor = state === 'hover' && variant.borderHover
        ? variant.borderHover
        : variant.border;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: borderColor ?? '{color.outline}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
      ];

      // 시간 세그먼트 텍스트 (HH : MM : SS)
      const value = props.value || '09:30:00';
      const parts = value.split(':');
      const displayText = `${parts[0] || 'HH'} : ${parts[1] || 'MM'} : ${parts[2] || 'SS'}`;

      shapes.push({
        type: 'text' as const,
        x: size.paddingX,
        y: 0,
        text: displayText,
        fontSize: size.fontSize as unknown as number,
        fontFamily: fontFamily.mono,
        fontWeight: 400,
        fill: variant.text,
        align: 'left' as const,
        baseline: 'middle' as const,
      });

      return shapes;
    },

    react: (props) => ({
      'aria-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      role: 'group',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
