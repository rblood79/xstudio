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
      const label = props.label || 'Slot';

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const borderColor = props.style?.borderColor
                        ?? (variant.border || ('{color.outline-variant}' as TokenRef));

      // 사용자 스타일 padding 우선, 없으면 spec 기본값
      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'center';
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto' as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
          fillAlpha: 0.5,
        },
        // 점선 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          style: 'dashed',
          radius: borderRadius as unknown as number,
        },
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 플레이스홀더 텍스트
      shapes.push({
        type: 'text' as const,
        x: paddingX,
        y: 0,
        text: label,
        fontSize: fontSize as unknown as number,
        fontFamily: ff,
        fontWeight: fw,
        fill: textColor,
        align: textAlign,
        baseline: 'middle' as const,
      });

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'passive' as const,
    }),
  },
};
