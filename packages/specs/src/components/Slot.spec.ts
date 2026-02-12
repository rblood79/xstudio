/**
 * Slot Component Spec
 *
 * 플레이스홀더 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Slot Props
 */
export interface SlotProps {
  variant?: 'default';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Slot Component Spec
 */
export const SlotSpec: ComponentSpec<SlotProps> = {
  name: 'Slot',
  description: '플레이스홀더 슬롯 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 40,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 60,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 80,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 12,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;
      const label = props.label || 'Slot';

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
          fill: variant.background,
          fillAlpha: 0.5,
        },
        // 점선 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          style: 'dashed',
          radius: borderRadius as unknown as number,
        },
        // 플레이스홀더 텍스트
        {
          type: 'text' as const,
          x: 0,
          y: 0,
          text: label,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
        },
      ];

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'passive' as const,
    }),
  },
};
