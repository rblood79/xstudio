/**
 * Button Component Spec
 *
 * Material Design 3 기반 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * Button Props
 */
export interface ButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: string;
  text?: string;
  label?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Button Component Spec
 */
export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: 'Button',
  description: 'Material Design 3 기반 버튼 컴포넌트',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'sm',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary-hover}' as TokenRef,
      backgroundPressed: '{color.primary-pressed}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
      border: '{color.primary}' as TokenRef, // CSS: border-color: var(--primary) → 배경과 동일 → 투명
      borderHover: '{color.primary-hover}' as TokenRef,
    },
    secondary: {
      background: '{color.secondary}' as TokenRef,
      backgroundHover: '{color.secondary-hover}' as TokenRef,
      backgroundPressed: '{color.secondary-pressed}' as TokenRef,
      text: '{color.on-secondary}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
      borderHover: '{color.secondary-hover}' as TokenRef,
    },
    tertiary: {
      background: '{color.tertiary}' as TokenRef,
      backgroundHover: '{color.tertiary-hover}' as TokenRef,
      backgroundPressed: '{color.tertiary-pressed}' as TokenRef,
      text: '{color.on-tertiary}' as TokenRef,
      border: '{color.tertiary}' as TokenRef,
      borderHover: '{color.tertiary-hover}' as TokenRef,
    },
    error: {
      background: '{color.error}' as TokenRef,
      backgroundHover: '{color.error-hover}' as TokenRef,
      backgroundPressed: '{color.error-pressed}' as TokenRef,
      text: '{color.on-error}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    outline: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.primary}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      backgroundAlpha: 0,
    },
    ghost: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.primary}' as TokenRef,
      backgroundAlpha: 0,
    },
  },

  sizes: {
    xs: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 12,
      gap: 4,
    },
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 32,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
      gap: 10,
    },
    xl: {
      height: 56,
      paddingX: 40,
      paddingY: 16,
      fontSize: '{typography.text-xl}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 24,
      gap: 12,
    },
  },

  states: {
    hover: {
      // variant별 hover 색상은 variants에서 정의
    },
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
    },
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
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      // props.style.width를 직접 사용하면 bgBox 추출이 실패하고 렌더링이 깨짐
      const width = 'auto' as const;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      // 상태에 따른 배경색 선택 (사용자 스타일 우선)
      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);

      // 상태에 따른 텍스트색 선택 (사용자 스타일 우선)
      const textColor = props.style?.color
                      ?? ((state === 'hover' && variant.textHover)
                          ? variant.textHover
                          : variant.text);

      // 상태에 따른 테두리색 선택 (사용자 스타일 우선)
      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const shapes: Shape[] = [
        // 배경 (height: 'auto' → 실제 레이아웃 높이에 맞춤)
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height: 'auto' as unknown as number,
          radius: borderRadius as unknown as number, // TokenRef를 나중에 resolve
          fill: bgColor,
          fillAlpha: variant.backgroundAlpha ?? 1,
        },
      ];

      // 테두리 (있는 경우)
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
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
      'data-loading': props.isLoading || undefined,
      'aria-busy': props.isLoading || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static',
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
