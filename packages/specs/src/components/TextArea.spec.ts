/**
 * TextArea Component Spec
 *
 * Material Design 3 기반 멀티라인 텍스트 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * TextArea Props
 */
export interface TextAreaProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  value?: string;
  description?: string;
  errorMessage?: string;
  rows?: number;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * TextArea Component Spec
 */
export const TextAreaSpec: ComponentSpec<TextAreaProps> = {
  name: 'TextArea',
  description: 'Material Design 3 기반 멀티라인 텍스트 입력 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 64,
      paddingX: 10,
      paddingY: 6,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 80,
      paddingX: 14,
      paddingY: 10,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 6,
    },
    lg: {
      height: 120,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
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
      const width = (props.style?.width as number) || 240;
      const rows = props.rows || 3;
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 16;
      const lineHeight = fontSize * 1.5;
      const height = Math.max(size.height, rows * lineHeight + size.paddingY * 2);

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
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : defaultBw;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? variant.text;

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const shapes: Shape[] = [];
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // label offset 동적 계산 (fontSize 기반)
      const labelFontSize = fontSize - 2;
      const labelHeight = Math.ceil(labelFontSize * 1.2);
      const labelGap = size.gap ?? 8;
      const labelOffset = props.label ? labelHeight + labelGap : 0;

      // 라벨
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: labelFontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 입력 영역 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: labelOffset,
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
          color: props.isInvalid ? ('{color.error}' as TokenRef) : borderColor,
          radius: borderRadius,
        });
      }

      // 입력 텍스트 / 플레이스홀더
      const displayText = props.value || props.placeholder || '';
      if (displayText) {
        shapes.push({
          type: 'text' as const,
          x: paddingX,
          y: labelOffset + size.paddingY,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fill: props.value ? textColor : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'top' as const,
          lineHeight: 1.5,
          maxWidth: width - paddingX * 2,
        });
      }

      // 설명 / 에러 메시지
      const descText = props.isInvalid && props.errorMessage ? props.errorMessage : props.description;
      if (descText) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: labelOffset + height + 4,
          text: descText,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid ? ('{color.error}' as TokenRef) : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-required': props.isRequired || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
