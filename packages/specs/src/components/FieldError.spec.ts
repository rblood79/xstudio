/**
 * FieldError Component Spec
 *
 * Material Design 3 기반 에러 메시지 컴포넌트
 * TextField, NumberField 등 compound 컴포넌트의 child 요소
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * FieldError Props
 */
export interface FieldErrorProps {
  variant?: 'default';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * FieldError Component Spec
 */
export const FieldErrorSpec: ComponentSpec<FieldErrorProps> = {
  name: 'FieldError',
  description: 'compound 컴포넌트의 에러 메시지 텍스트 렌더링',
  element: 'p',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.transparent}' as TokenRef,
      backgroundHover: '{color.transparent}' as TokenRef,
      backgroundPressed: '{color.transparent}' as TokenRef,
      text: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {},
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const text = props.children ?? '';
      if (!text) return [];

      const width = (props.style?.width as number) || 'auto';

      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 12;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      // error color 우선, style.color로 오버라이드 가능
      const textColor = props.style?.color ?? variant.text;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const shapes: Shape[] = [
        {
          type: 'text' as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
          maxWidth: typeof width === 'number' ? width : undefined,
        },
      ];

      return shapes;
    },

    react: () => ({
      role: 'alert',
      'aria-live': 'polite',
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
