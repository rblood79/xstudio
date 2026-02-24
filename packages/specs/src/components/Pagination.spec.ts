/**
 * Pagination Component Spec
 *
 * Material Design 3 기반 페이지네이션 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Pagination Props
 */
export interface PaginationProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  totalPages?: number;
  currentPage?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * Pagination Component Spec
 */
export const PaginationSpec: ComponentSpec<PaginationProps> = {
  name: 'Pagination',
  description: 'Material Design 3 기반 페이지네이션 컴포넌트',
  element: 'nav',

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
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary-hover}' as TokenRef,
      backgroundPressed: '{color.primary-pressed}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 28,
      paddingX: 6,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 36,
      paddingX: 10,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 6,
    },
    lg: {
      height: 44,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
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
    shapes: (props, variant, size, _state = 'default') => {
      const totalPages = props.totalPages || 5;
      const currentPage = props.currentPage || 1;
      const buttonSize = size.height;

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'center';

      const shapes: Shape[] = [];

      // 페이지네이션 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: size.gap,
        },
      });

      // Child Composition: 자식 Element가 있으면 spec shapes에서 버튼 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 이전 버튼
      shapes.push({
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: buttonSize,
        height: buttonSize,
        radius: borderRadius as unknown as number,
        fill: '{color.surface-container}' as TokenRef,
      });

      // 페이지 버튼들
      for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        const isActive = i === currentPage;
        shapes.push({
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: buttonSize,
          height: buttonSize,
          radius: borderRadius as unknown as number,
          fill: isActive ? bgColor : ('{color.surface}' as TokenRef),
        });

        const fwRaw = props.style?.fontWeight;
        const fw = fwRaw != null
          ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || (isActive ? 600 : 400))
          : (isActive ? 600 : 400);

        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: String(i),
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: fw,
          fill: isActive ? textColor : ('{color.on-surface}' as TokenRef),
          align: textAlign,
          baseline: 'middle' as const,
        });
      }

      // 다음 버튼
      shapes.push({
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: buttonSize,
        height: buttonSize,
        radius: borderRadius as unknown as number,
        fill: '{color.surface-container}' as TokenRef,
      });

      return shapes;
    },

    react: () => ({
      role: 'navigation',
      'aria-label': 'Pagination',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'pointer',
    }),
  },
};
