/**
 * Dialog Component Spec
 *
 * Material Design 3 기반 다이얼로그 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Dialog Props
 */
export interface DialogProps {
  variant?: 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

/**
 * Dialog Component Spec
 *
 * height: 0 = auto
 * overlay: modal (포털, 포커스 트랩, 백드롭)
 * Modal 내부에서 사용 — Modal이 backdrop과 focus management 담당
 */
export const DialogSpec: ComponentSpec<DialogProps> = {
  name: 'Dialog',
  description: 'Material Design 3 기반 다이얼로그 컴포넌트',
  element: 'div',

  defaultVariant: 'primary',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'modal',
    hasBackdrop: true,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: 'modal',
  },

  variants: {
    primary: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    error: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
    md: {
      height: 0,
      paddingX: 24,
      paddingY: 24,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 20,
    },
    lg: {
      height: 0,
      paddingX: 32,
      paddingY: 32,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 24,
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
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.2)',
          alpha: 0.2,
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
      role: 'dialog',
      'aria-modal': true,
      'aria-label': props.title,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
