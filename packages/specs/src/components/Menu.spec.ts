/**
 * Menu Component Spec
 *
 * Material Design 3 기반 메뉴 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Menu Props
 */
export interface MenuProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  style?: Record<string, string | number | undefined>;
}

/**
 * Menu Component Spec
 *
 * overlay: popover (포털, 배경 클릭으로 닫기)
 */
export const MenuSpec: ComponentSpec<MenuProps> = {
  name: 'Menu',
  description: 'Material Design 3 기반 드롭다운 메뉴 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
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
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 4,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 6,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '-2px',
    },
  },

  render: {
    shapes: (_props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // 그림자
        {
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.12)',
          alpha: 0.12,
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
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
        // 메뉴 아이템 컨테이너
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

    react: () => ({
      role: 'menu',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
