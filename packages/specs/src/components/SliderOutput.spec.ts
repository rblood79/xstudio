/**
 * SliderOutput Component Spec
 *
 * Material Design 3 기반 슬라이더 값 출력 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (현재 값 텍스트 표시)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * SliderOutput Props
 */
export interface SliderOutputProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  /** 표시할 값 텍스트 (포맷팅된 문자열) */
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * SliderOutput Component Spec
 */
export const SliderOutputSpec: ComponentSpec<SliderOutputProps> = {
  name: 'SliderOutput',
  description: '슬라이더 현재 값 텍스트 렌더링',
  element: 'output',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.transparent}' as TokenRef,
      backgroundHover: '{color.transparent}' as TokenRef,
      backgroundPressed: '{color.transparent}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    primary: {
      background: '{color.transparent}' as TokenRef,
      backgroundHover: '{color.transparent}' as TokenRef,
      backgroundPressed: '{color.transparent}' as TokenRef,
      text: '{color.primary}' as TokenRef,
    },
    secondary: {
      background: '{color.transparent}' as TokenRef,
      backgroundHover: '{color.transparent}' as TokenRef,
      backgroundPressed: '{color.transparent}' as TokenRef,
      text: '{color.secondary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const text = props.children ?? '';
      if (!text) return [];

      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 14;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textColor = props.style?.color ?? variant.text;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'right';

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
        },
      ];

      return shapes;
    },

    react: () => ({
      'aria-live': 'off',
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
