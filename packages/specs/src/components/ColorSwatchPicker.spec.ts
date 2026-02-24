/**
 * ColorSwatchPicker Component Spec
 *
 * Material Design 3 기반 색상 스와치 그리드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ColorSwatchPicker Props
 */
export interface ColorSwatchPickerProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  colors?: string[];
  columns?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorSwatchPicker Component Spec
 */
export const ColorSwatchPickerSpec: ComponentSpec<ColorSwatchPickerProps> = {
  name: 'ColorSwatchPicker',
  description: 'Material Design 3 기반 색상 스와치 그리드 (swatch grid)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 4,
      paddingY: 4,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 20,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 6,
      paddingY: 6,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 28,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 36,
      gap: 8,
    },
  },

  states: {
    hover: {},
    pressed: {},
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
      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const stylePad = props.style?.padding;
      const padding = stylePad != null
        ? (typeof stylePad === 'number' ? stylePad : parseFloat(String(stylePad)) || 0)
        : size.paddingY;

      const swatchSize = size.iconSize ?? 28;
      const columns = props.columns ?? 6;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
      ];

      // Child Composition: 자식 Element가 있으면 그리드 컨테이너 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 그리드 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${swatchSize}px)`,
          gap: size.gap,
          padding,
        },
      });

      return shapes;
    },

    react: (props) => ({
      role: 'listbox',
      'aria-label': 'Color swatches',
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'default',
    }),
  },
};
