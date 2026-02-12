/**
 * Section Component Spec
 *
 * HTML <section> 시맨틱 컨테이너 컴포넌트
 * Single Source of Truth - React와 CanvasKit/Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Section Props
 */
export interface SectionProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Section Component Spec
 *
 * height: 0 = auto (콘텐츠에 따라 결정)
 * 시맨틱 섹션 컨테이너 - Card와 유사하나 shadow/elevation 없이 콘텐츠 영역 구분 용도
 */
export const SectionSpec: ComponentSpec<SectionProps> = {
  name: 'Section',
  description: 'HTML <section> 시맨틱 컨테이너 컴포넌트',
  element: 'section',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      backgroundAlpha: 0,
    },
    primary: {
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
    },
    secondary: {
      background: '{color.secondary-container}' as TokenRef,
      backgroundHover: '{color.secondary-container}' as TokenRef,
      backgroundPressed: '{color.secondary-container}' as TokenRef,
      text: '{color.on-secondary-container}' as TokenRef,
    },
    tertiary: {
      background: '{color.tertiary-container}' as TokenRef,
      backgroundHover: '{color.tertiary-container}' as TokenRef,
      backgroundPressed: '{color.tertiary-container}' as TokenRef,
      text: '{color.on-tertiary-container}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    outlined: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
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
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 24,
      paddingY: 24,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const shapes: Shape[] = [];

      // 배경 (default variant는 투명)
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: (props.style?.width as number) || 'auto',
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: bgColor,
        ...(variant.backgroundAlpha !== undefined && { fillAlpha: variant.backgroundAlpha }),
      });

      // 테두리 (outlined variant)
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // 콘텐츠 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'block',
        },
      });

      return shapes;
    },

    react: () => ({
      role: 'region',
    }),

    pixi: () => ({
      eventMode: 'passive' as const,
      cursor: 'default',
    }),
  },
};
