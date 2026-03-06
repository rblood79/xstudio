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
  variant?: 'default' | 'accent' | 'neutral' | 'purple' | 'surface' | 'outlined';
  size?: 'S' | 'M' | 'L';
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
  defaultSize: 'M',

  variants: {
    default: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      backgroundAlpha: 0,
    },
    accent: {
      background: '{color.accent-subtle}' as TokenRef,
      backgroundHover: '{color.accent-subtle}' as TokenRef,
      backgroundPressed: '{color.accent-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
    neutral: {
      background: '{color.neutral-subtle}' as TokenRef,
      backgroundHover: '{color.neutral-subtle}' as TokenRef,
      backgroundPressed: '{color.neutral-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
    purple: {
      background: '{color.purple-subtle}' as TokenRef,
      backgroundHover: '{color.purple-subtle}' as TokenRef,
      backgroundPressed: '{color.purple-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
    surface: {
      background: '{color.layer-2}' as TokenRef,
      backgroundHover: '{color.layer-2}' as TokenRef,
      backgroundPressed: '{color.layer-2}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
    outlined: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
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
        width: 'auto' as const,
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

      // Child Composition: 자식 Element가 있으면 bg + border만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

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
