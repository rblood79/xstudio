/**
 * Card Component Spec
 *
 * Material Design 3 기반 카드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Card Props
 */
export interface CardProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'surface' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'vertical' | 'horizontal';
  isSelectable?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Card Component Spec
 *
 * height: 0 = auto (콘텐츠에 따라 결정)
 * paddingX/paddingY 동일 값으로 균일 padding 표현
 */
export const CardSpec: ComponentSpec<CardProps> = {
  name: 'Card',
  description: 'Material Design 3 기반 카드 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
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
    secondary: {
      background: '{color.secondary}' as TokenRef,
      backgroundHover: '{color.secondary-hover}' as TokenRef,
      backgroundPressed: '{color.secondary-pressed}' as TokenRef,
      text: '{color.on-secondary}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    tertiary: {
      background: '{color.tertiary}' as TokenRef,
      backgroundHover: '{color.tertiary-hover}' as TokenRef,
      backgroundPressed: '{color.tertiary-pressed}' as TokenRef,
      text: '{color.on-tertiary}' as TokenRef,
      border: '{color.tertiary}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    elevated: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      // elevated는 border 대신 shadow 사용 (render.shapes에서 처리)
    },
    outlined: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 24,
      paddingY: 24,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
    },
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

      // elevated variant: shadow
      if (props.variant === 'elevated') {
        shapes.push({
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: state === 'hover' ? 6 : 4,
          blur: state === 'hover' ? 8 : 6,
          spread: -1,
          color: 'rgba(0, 0, 0, 0.1)',
          alpha: 0.1,
        });
      }

      // 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: 'auto' as const,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: bgColor,
      });

      // 테두리
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const defaultBw = props.variant === 'outlined' ? 2 : 1;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : defaultBw;
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // 선택 상태 강조
      if (props.isSelected) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 2,
          color: '{color.primary}' as TokenRef,
          radius: borderRadius as unknown as number,
        });
      }

      // Child Composition: 자식 Element가 있으면 bg + border만 반환 (container 스킵)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 콘텐츠 컨테이너
      const stylePad = props.style?.padding;
      const padding = stylePad != null
        ? (typeof stylePad === 'number' ? stylePad : parseFloat(String(stylePad)) || 0)
        : size.paddingY;
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: props.orientation === 'horizontal' ? 'row' : 'column',
          gap: size.gap,
          padding,
        },
      });

      return shapes;
    },

    react: (props) => ({
      'data-selectable': props.isSelectable || undefined,
      'data-selected': props.isSelected || undefined,
      role: props.isSelectable ? 'button' : undefined,
      tabIndex: props.isSelectable ? 0 : undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isSelectable ? 'static' : ('passive' as const),
      cursor: props.isSelectable ? 'pointer' : 'default',
    }),
  },
};
