/**
 * ToggleButton Component Spec
 *
 * React Aria 기반 토글 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * ToggleButton Props
 */
export interface ToggleButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  label?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
  /** 그룹 내 위치 정보 (ToggleButtonGroup 자식일 때 주입) */
  _groupPosition?: {
    orientation: 'horizontal' | 'vertical';
    isFirst: boolean;
    isLast: boolean;
    isOnly: boolean;
  };
}

/** isSelected 시 variant별 반전 색상 */
export const TOGGLE_SELECTED_COLORS: Record<string, { bg: TokenRef; text: TokenRef; border: TokenRef }> = {
  default: {
    bg: '{color.neutral-subtle}' as TokenRef,
    text: '{color.white}' as TokenRef,
    border: '{color.neutral-subtle}' as TokenRef,
  },
  primary: {
    bg: '{color.accent}' as TokenRef,
    text: '{color.on-accent}' as TokenRef,
    border: '{color.accent}' as TokenRef,
  },
  secondary: {
    bg: '{color.neutral-subtle}' as TokenRef,
    text: '{color.white}' as TokenRef,
    border: '{color.neutral-subtle}' as TokenRef,
  },
  surface: {
    bg: '{color.accent}' as TokenRef,
    text: '{color.on-accent}' as TokenRef,
    border: '{color.accent}' as TokenRef,
  },
};

/**
 * ToggleButton Component Spec
 */
export const ToggleButtonSpec: ComponentSpec<ToggleButtonProps> = {
  name: 'ToggleButton',
  description: 'React Aria 기반 토글 버튼 컴포넌트',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.layer-1}' as TokenRef,
      backgroundHover: '{color.neutral-subtle}' as TokenRef,
      backgroundPressed: '{color.neutral-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    primary: {
      background: '{color.layer-2}' as TokenRef,
      backgroundHover: '{color.layer-1}' as TokenRef,
      backgroundPressed: '{color.neutral-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    secondary: {
      background: '{color.layer-2}' as TokenRef,
      backgroundHover: '{color.layer-1}' as TokenRef,
      backgroundPressed: '{color.neutral-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    surface: {
      background: '{color.neutral-subtle}' as TokenRef,
      backgroundHover: '{color.neutral-subtle}' as TokenRef,
      backgroundPressed: '{color.neutral-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 24,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
    },
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--highlight-background)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const variantName = props.variant ?? 'default';

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const baseBorderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      // 🚀 CSS 규칙: ToggleButtonGroup 내 위치에 따른 모서리별 border-radius
      // horizontal: first → [r,0,0,r], last → [0,r,r,0], middle → [0,0,0,0]
      // vertical:   first → [r,r,0,0], last → [0,0,r,r], middle → [0,0,0,0]
      const gp = props._groupPosition;
      let borderRadius: number | [number, number, number, number] = baseBorderRadius as number;
      if (gp && !gp.isOnly) {
        const r = baseBorderRadius as number;
        if (gp.orientation === 'horizontal') {
          if (gp.isFirst) borderRadius = [r, 0, 0, r];
          else if (gp.isLast) borderRadius = [0, r, r, 0];
          else borderRadius = [0, 0, 0, 0];
        } else {
          if (gp.isFirst) borderRadius = [r, r, 0, 0];
          else if (gp.isLast) borderRadius = [0, 0, r, r];
          else borderRadius = [0, 0, 0, 0];
        }
      }

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      // isSelected 시 색상 반전
      let bgColor: TokenRef | string | number | undefined;
      let textColor: TokenRef | string | number | undefined;
      let borderColor: TokenRef | string | number | undefined;

      if (props.isSelected) {
        const selected = TOGGLE_SELECTED_COLORS[variantName] ?? TOGGLE_SELECTED_COLORS.default;
        bgColor = props.style?.backgroundColor ?? selected.bg;
        textColor = props.style?.color ?? selected.text;
        borderColor = props.style?.borderColor ?? selected.border;
      } else {
        bgColor = props.style?.backgroundColor
                ?? (state === 'hover' ? variant.backgroundHover
                : state === 'pressed' ? variant.backgroundPressed
                : variant.background);
        textColor = props.style?.color
                  ?? ((state === 'hover' && variant.textHover)
                      ? variant.textHover
                      : variant.text);
        borderColor = props.style?.borderColor
                    ?? ((state === 'hover' && variant.borderHover)
                        ? variant.borderHover
                        : variant.border);
      }

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto' as const,
          height: 'auto' as unknown as number,
          radius: borderRadius as number | [number, number, number, number],
          fill: bgColor,
        },
      ];

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as number | [number, number, number, number],
        });
      }

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 텍스트
      const text = props.children || props.text || props.label;
      if (text) {
        // 사용자 스타일 padding 우선, 없으면 spec 기본값
        const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
        const paddingX = stylePx != null
          ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
          : size.paddingX;

        // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs = typeof rawFontSize === 'number'
          ? rawFontSize
          : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize);
        const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 16;
        const fwRaw = props.style?.fontWeight;
        const fw = fwRaw != null
          ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
          : 500;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'center';

        shapes.push({
          type: 'text' as const,
          x: paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-selected': props.isSelected || undefined,
      'aria-pressed': props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
