/**
 * ListBox Component Spec
 *
 * Material Design 3 기반 리스트박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * ListBox Props
 */
export interface ListBoxProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isDisabled?: boolean;
  selectionMode?: 'single' | 'multiple';
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * ListBox Component Spec
 */
export const ListBoxSpec: ComponentSpec<ListBoxProps> = {
  name: 'ListBox',
  description: 'Material Design 3 기반 리스트박스 컴포넌트',
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
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 2,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 4,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 6,
    },
  },

  states: {
    hover: {},
    pressed: {},
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
      const width = (props.style?.width as number) || 200;
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [];

      // 라벨
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: (size.fontSize as unknown as number) - 2,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'top' as const,
        });
      }

      // 리스트 컨테이너 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: props.label ? 20 : 0,
        width,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: variant.background,
      });

      // 테두리
      if (variant.border) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border,
          radius: borderRadius as unknown as number,
        });
      }

      // 리스트 아이템 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: props.label ? 20 : 0,
        width,
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
      role: 'listbox',
      'aria-multiselectable': props.selectionMode === 'multiple' || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'default',
    }),
  },
};
