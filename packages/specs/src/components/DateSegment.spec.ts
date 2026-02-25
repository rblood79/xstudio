/**
 * DateSegment Component Spec
 *
 * Material Design 3 기반 날짜/시간 세그먼트 컴포넌트
 * DateField, TimeField compound 컴포넌트의 child 요소
 * TimeSegment도 동일한 spec으로 재사용
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * 세그먼트 타입 - 날짜 또는 시간 단위
 */
export type DateSegmentType =
  | 'month'
  | 'day'
  | 'year'
  | 'hour'
  | 'minute'
  | 'second'
  | 'dayPeriod'
  | 'era'
  | 'literal';

/**
 * DateSegment Props
 */
export interface DateSegmentProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  /** 세그먼트 타입 (month, day, year, hour, minute, second 등) */
  segmentType?: DateSegmentType;
  /** 표시할 값 (숫자 또는 텍스트) */
  value?: string | number;
  /** placeholder (값이 없을 때 표시) */
  placeholder?: string;
  /** 현재 세그먼트가 포커스 상태인지 */
  isFocused?: boolean;
  /** 읽기 전용 여부 (literal 세그먼트: /, : 등) */
  isLiteral?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DateSegment Component Spec
 * TimeSegment에서도 동일하게 재사용
 */
export const DateSegmentSpec: ComponentSpec<DateSegmentProps> = {
  name: 'DateSegment',
  description: '날짜/시간 세그먼트 박스 렌더링 (DateField, TimeField 공용)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container-low}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
      borderHover: '{color.outline}' as TokenRef,
    },
    primary: {
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
      border: '{color.primary}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    error: {
      background: '{color.error-container}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-error-container}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 4,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 32,
      paddingX: 6,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 40,
      paddingX: 8,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
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
      // literal 세그먼트(/, : 등)는 배경 없이 텍스트만 렌더링
      if (props.isLiteral) {
        const literalText = String(props.value ?? props.placeholder ?? '');
        if (!literalText) return [];

        const rawFs = props.style?.fontSize ?? size.fontSize;
        const resolvedFs = typeof rawFs === 'number'
          ? rawFs
          : (typeof rawFs === 'string' && rawFs.startsWith('{')
              ? resolveToken(rawFs as TokenRef)
              : rawFs);
        const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 14;
        const ff = (props.style?.fontFamily as string) || fontFamily.mono;

        return [
          {
            type: 'text' as const,
            x: 2,
            y: 0,
            text: literalText,
            fontSize,
            fontFamily: ff,
            fontWeight: 400,
            fill: variant.text,
            align: 'center' as const,
            baseline: 'middle' as const,
          },
        ];
      }

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const width = (props.style?.width as number) || 32;
      const height = size.height;

      // 포커스 시 primary 배경, 기본은 반투명 표면 색상
      const bgColor = props.style?.backgroundColor
        ?? (props.isFocused
            ? '{color.primary-container}' as TokenRef
            : (state === 'hover' ? variant.backgroundHover : variant.background));

      const bgAlpha = props.isFocused ? 1.0 : 0.7;

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

      const ff = (props.style?.fontFamily as string) || fontFamily.mono;

      const displayText = String(props.value ?? props.placeholder ?? '');
      const textColor = props.style?.color
        ?? (props.isFocused
            ? '{color.on-primary-container}' as TokenRef
            : (props.value != null
                ? variant.text
                : '{color.on-surface-variant}' as TokenRef));

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const shapes: Shape[] = [
        // 세그먼트 배경 (반투명)
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
          fillAlpha: bgAlpha,
        },
      ];

      // 텍스트 렌더링 (값 또는 placeholder)
      if (displayText) {
        shapes.push({
          type: 'text' as const,
          x: paddingX,
          y: 0,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: 'center' as const,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: 'spinbutton',
      'aria-label': props.segmentType,
      'data-type': props.segmentType,
      'data-focused': props.isFocused || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-placeholder': props.value == null || undefined,
    }),

    pixi: (props) => ({
      eventMode: (props.isDisabled || props.isLiteral) ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
