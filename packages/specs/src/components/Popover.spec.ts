/**
 * Popover Component Spec
 *
 * Material Design 3 기반 팝오버 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Popover Props
 */
export interface PopoverProps {
  variant?: 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  placement?: 'top' | 'right' | 'bottom' | 'left';
  showArrow?: boolean;
}

/**
 * Popover Component Spec
 *
 * height: 0 = auto
 * overlay: popover (포털, 포커스 트랩, 백드롭 클릭 닫기)
 */
export const PopoverSpec: ComponentSpec<PopoverProps> = {
  name: 'Popover',
  description: 'Material Design 3 기반 팝오버 컴포넌트',
  element: 'div',

  defaultVariant: 'surface',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'popover',
    hasBackdrop: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: 'overlay',
  },

  variants: {
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
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
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 20,
      paddingY: 20,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 16,
    },
  },

  states: {},

  render: {
    shapes: (_props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // Shadow
        {
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.15)',
          alpha: 0.15,
        },
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
          color: variant.border ?? '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
        // 콘텐츠 컨테이너
        {
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
        },
      ];

      return shapes;
    },

    react: (props) => ({
      'data-placement': props.placement || 'bottom',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
