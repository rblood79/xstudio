/**
 * SearchField Component Spec
 *
 * Material Design 3 기반 검색 입력 컴포넌트 (검색 아이콘 + 클리어 버튼)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * SearchField Props
 */
export interface SearchFieldProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  value?: string;
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * SearchField Component Spec
 */
export const SearchFieldSpec: ComponentSpec<SearchFieldProps> = {
  name: 'SearchField',
  description: 'Material Design 3 기반 검색 입력 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 18,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 22,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const width = (props.style?.width as number) || 280;
      const height = size.height;
      const iconSize = size.iconSize ?? 18;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);

      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const fontSize = props.style?.fontSize ?? size.fontSize as unknown as number;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? (props.value ? variant.text : ('{color.on-surface-variant}' as TokenRef));

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const shapes: Shape[] = [];

      // 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width,
        height,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius,
        });
      }

      // 검색 아이콘 (원 + 선으로 표현)
      const iconX = paddingX + iconSize / 2;
      const iconY = height / 2;
      shapes.push({
        type: 'circle' as const,
        x: iconX - 2,
        y: iconY - 2,
        radius: iconSize / 3,
        fill: '{color.on-surface-variant}' as TokenRef,
        fillAlpha: 0,
      });
      shapes.push({
        type: 'line' as const,
        x1: iconX + iconSize / 5,
        y1: iconY + iconSize / 5,
        x2: iconX + iconSize / 2.5,
        y2: iconY + iconSize / 2.5,
        stroke: '{color.on-surface-variant}' as TokenRef,
        strokeWidth: 2,
      });

      // 텍스트
      const displayText = props.value || props.placeholder || 'Search...';
      shapes.push({
        type: 'text' as const,
        x: paddingX + iconSize + (size.gap ?? 8),
        y: height / 2,
        text: displayText,
        fontSize: fontSize as number,
        fontFamily: ff,
        fill: textColor,
        align: textAlign,
        baseline: 'middle' as const,
      });

      // 클리어 버튼 (값이 있을 때)
      if (props.value) {
        shapes.push({
          id: 'clear',
          type: 'circle' as const,
          x: width - paddingX - iconSize / 2,
          y: height / 2,
          radius: iconSize / 2.5,
          fill: '{color.on-surface-variant}' as TokenRef,
          fillAlpha: 0.15,
        });
        // X 마크
        const cx = width - paddingX - iconSize / 2;
        const cy = height / 2;
        const cs = iconSize / 5;
        shapes.push({
          type: 'line' as const,
          x1: cx - cs,
          y1: cy - cs,
          x2: cx + cs,
          y2: cy + cs,
          stroke: '{color.on-surface-variant}' as TokenRef,
          strokeWidth: 2,
        });
        shapes.push({
          type: 'line' as const,
          x1: cx + cs,
          y1: cy - cs,
          x2: cx - cs,
          y2: cy + cs,
          stroke: '{color.on-surface-variant}' as TokenRef,
          strokeWidth: 2,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      role: 'search',
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
