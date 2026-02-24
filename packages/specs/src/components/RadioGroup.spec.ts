/**
 * RadioGroup Component Spec
 *
 * Material Design 3 기반 라디오 그룹 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * RadioGroup Props
 */
export interface RadioGroupProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  orientation?: 'vertical' | 'horizontal';
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * RadioGroup Component Spec
 */
export const RadioGroupSpec: ComponentSpec<RadioGroupProps> = {
  name: 'RadioGroup',
  description: 'Material Design 3 기반 라디오 그룹 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 16,
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
      const shapes: Shape[] = [];

      // 사용자 스타일 우선
      const textColor = props.style?.color ?? variant.text;
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
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      // 그룹 라벨 — 자식 유무와 무관하게 항상 자체 렌더링
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 설명 / 에러 메시지 — 자식 유무와 무관하게 항상 자체 렌더링
      const descText = props.isInvalid && props.errorMessage ? props.errorMessage : props.description;
      if (descText) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: descText,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid ? ('{color.error}' as TokenRef) : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 자식이 있으면 자식 컨테이너는 생략 (자식이 직접 렌더링)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 라디오 자식 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: props.label ? fontSize + 8 : 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: props.orientation === 'horizontal' ? 'row' : 'column',
          gap: size.gap,
        },
      });

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      'data-invalid': props.isInvalid || undefined,
      'aria-orientation': props.orientation || 'vertical',
      role: 'radiogroup',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('passive' as const),
    }),
  },
};
