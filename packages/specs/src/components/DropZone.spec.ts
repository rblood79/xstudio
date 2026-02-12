/**
 * DropZone Component Spec
 *
 * Material Design 3 기반 드롭 존 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * DropZone Props
 */
export interface DropZoneProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isDropTarget?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DropZone Component Spec
 */
export const DropZoneSpec: ComponentSpec<DropZoneProps> = {
  name: 'DropZone',
  description: 'Material Design 3 기반 파일 드롭 존 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.primary}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 80,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 24,
      gap: 8,
    },
    md: {
      height: 120,
      paddingX: 24,
      paddingY: 24,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 32,
      gap: 12,
    },
    lg: {
      height: 160,
      paddingX: 32,
      paddingY: 32,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 40,
      gap: 16,
    },
  },

  states: {
    hover: {},
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
    shapes: (props, variant, size, state = 'default') => {
      const borderRadius = size.borderRadius;
      const label = props.label || 'Drop files here';
      const isActive = props.isDropTarget || state === 'hover';

      const bgColor = isActive ? variant.backgroundHover : variant.background;
      const borderColor = isActive
        ? ('{color.primary}' as TokenRef)
        : variant.border || ('{color.outline-variant}' as TokenRef);

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
        // 점선 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 2,
          color: borderColor,
          style: 'dashed',
          radius: borderRadius as unknown as number,
        },
        // 라벨 텍스트
        {
          type: 'text' as const,
          x: 0,
          y: 0,
          text: label,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: isActive ? ('{color.primary}' as TokenRef) : variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'button',
      'data-drop-target': props.isDropTarget || undefined,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'pointer',
    }),
  },
};
