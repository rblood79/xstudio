/**
 * Link Component Spec
 *
 * Material Design 3 기반 링크 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Link Props
 */
export interface LinkProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  href?: string;
  isExternal?: boolean;
  showExternalIcon?: boolean;
  isDisabled?: boolean;
}

/**
 * Link Component Spec
 *
 * height: 0 = auto (인라인 요소)
 * backgroundAlpha: 0 (배경 없음)
 */
export const LinkSpec: ComponentSpec<LinkProps> = {
  name: 'Link',
  description: 'Material Design 3 기반 링크 컴포넌트',
  element: 'a',

  defaultVariant: 'primary',
  defaultSize: 'md',

  variants: {
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.primary}' as TokenRef,
      textHover: '{color.primary-hover}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.on-surface}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
  },

  states: {
    hover: {
      // textHover는 variants에서 처리
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
      const text = props.children || props.text || '';
      const textColor = (state === 'hover' && variant.textHover)
                      ? variant.textHover
                      : variant.text;

      const shapes: Shape[] = [];

      if (text) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
          fill: textColor,
          align: 'left' as const,
          baseline: 'top' as const,
          textDecoration: state === 'hover' ? 'underline' : 'none',
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-external': props.isExternal || undefined,
      target: props.isExternal ? '_blank' : undefined,
      rel: props.isExternal ? 'noopener noreferrer' : undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
