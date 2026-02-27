/**
 * SelectValue Component Spec
 *
 * Select 컴포넌트의 선택된 값/placeholder 텍스트 렌더링
 * Compositional Architecture: SelectTrigger의 자식 Element로 독립 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

export interface SelectValueProps {
  variant?: 'default';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  placeholder?: string;
  isPlaceholder?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const SelectValueSpec: ComponentSpec<SelectValueProps> = {
  name: 'SelectValue',
  description: '선택된 값 또는 placeholder 텍스트 렌더링',
  element: 'span',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.transparent}' as TokenRef,
      backgroundHover: '{color.transparent}' as TokenRef,
      backgroundPressed: '{color.transparent}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
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
      const text = props.children || props.placeholder || '';
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
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      // placeholder일 때 variant 색상, 값일 때 텍스트 색상
      const isPlaceholder = props.isPlaceholder || (!props.children && !!props.placeholder);
      const textColor = props.style?.color
                      ?? (isPlaceholder
                          ? ('{color.on-surface-variant}' as TokenRef)
                          : variant.text);

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
          baseline: 'middle' as const,
        },
      ];

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
