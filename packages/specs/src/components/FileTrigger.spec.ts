/**
 * FileTrigger Component Spec
 *
 * Material Design 3 기반 파일 트리거 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * FileTrigger Props
 */
export interface FileTriggerProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  label?: string;
  acceptedFileTypes?: string[];
  allowsMultiple?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * FileTrigger Component Spec
 */
export const FileTriggerSpec: ComponentSpec<FileTriggerProps> = {
  name: 'FileTrigger',
  description: 'Material Design 3 기반 파일 선택 트리거 컴포넌트',
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
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 32,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
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
      const bgColor = state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background;
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: size.height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
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

      // 텍스트
      const text = props.children || props.text || props.label || 'Choose file';
      shapes.push({
        type: 'text' as const,
        x: 0,
        y: 0,
        text,
        fontSize: size.fontSize as unknown as number,
        fontFamily: fontFamily.sans,
        fontWeight: 500,
        fill: variant.text,
        align: 'center' as const,
        baseline: 'middle' as const,
      });

      return shapes;
    },

    react: (props) => ({
      'data-loading': undefined,
      'aria-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
