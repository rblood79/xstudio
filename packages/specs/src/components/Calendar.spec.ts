/**
 * Calendar Component Spec
 *
 * Material Design 3 기반 캘린더 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Calendar Props
 */
export interface CalendarProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Calendar Component Spec
 *
 * height: 0 = auto (그리드 행 수에 따라 결정)
 */
export const CalendarSpec: ComponentSpec<CalendarProps> = {
  name: 'Calendar',
  description: 'Material Design 3 기반 캘린더 (월 그리드 + 네비게이션)',
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
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 24,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 28,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 32,
      gap: 8,
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
    shapes: (_props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;
      const cellSize = (size.iconSize ?? 28) + 4;
      const calendarWidth = cellSize * 7 + (size.gap ?? 6) * 6 + size.paddingX * 2;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: calendarWidth,
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border ?? '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
        // 헤더 텍스트 (월/년)
        {
          type: 'text' as const,
          x: 0,
          y: size.paddingY,
          text: 'January 2024',
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 600,
          fill: variant.text,
          align: 'center' as const,
          baseline: 'top' as const,
        },
        // 콘텐츠 컨테이너 (요일 헤더 + 날짜 그리드)
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'grid',
            gridTemplateColumns: `repeat(7, ${cellSize}px)`,
            gap: size.gap,
            padding: size.paddingY,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'grid',
      'aria-readonly': props.isReadOnly || undefined,
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'pointer',
    }),
  },
};
