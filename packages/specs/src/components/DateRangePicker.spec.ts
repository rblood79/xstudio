/**
 * DateRangePicker Component Spec
 *
 * Material Design 3 기반 날짜 범위 선택기 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * DateRangePicker Props
 */
export interface DateRangePickerProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  startDate?: string;
  endDate?: string;
  placeholder?: string;
  label?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DateRangePicker Component Spec
 *
 * trigger + dual calendar overlay 구조
 */
export const DateRangePickerSpec: ComponentSpec<DateRangePickerProps> = {
  name: 'DateRangePicker',
  description: 'Material Design 3 기반 날짜 범위 선택기 (dual calendar overlay)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'popover',
    hasBackdrop: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: 'overlay',
  },

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
      borderHover: '{color.primary-hover}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 18,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
      gap: 10,
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
      const width = (props.style?.width as number) || 300;
      const height = size.height;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const bgColor = props.style?.backgroundColor
                    ?? variant.background;

      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const fontSize = props.style?.fontSize ?? size.fontSize as unknown as number;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? (props.startDate ? variant.text : '{color.on-surface-variant}' as TokenRef);

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      // 범위 표시 텍스트
      const displayText = props.startDate && props.endDate
        ? `${props.startDate} — ${props.endDate}`
        : props.placeholder || 'Start date — End date';

      const shapes: Shape[] = [
        // Trigger 배경
        {
          id: 'trigger',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
        },
        // Trigger 테두리
        {
          type: 'border' as const,
          target: 'trigger',
          borderWidth,
          color: borderColor ?? '{color.outline}' as TokenRef,
          radius: borderRadius,
        },
        // 범위 텍스트
        {
          type: 'text' as const,
          x: paddingX,
          y: 0,
          text: displayText,
          fontSize: fontSize as number,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: 'middle' as const,
        },
      ];

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // Dual calendar overlay (열린 상태)
      if (props.isOpen) {
        const calendarY = height + (size.gap ?? 8);

        shapes.push({
          type: 'shadow' as const,
          target: 'overlay',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.15)',
          alpha: 0.15,
        });

        shapes.push({
          id: 'overlay',
          type: 'roundRect' as const,
          x: 0,
          y: calendarY,
          width,
          height: 'auto',
          radius: borderRadius,
          fill: '{color.surface-container}' as TokenRef,
        });

        shapes.push({
          type: 'border' as const,
          target: 'overlay',
          borderWidth: 1,
          color: '{color.outline-variant}' as TokenRef,
          radius: borderRadius,
        });

        // 이중 캘린더 컨테이너
        shapes.push({
          type: 'container' as const,
          x: 0,
          y: calendarY,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'flex',
            flexDirection: 'row',
            gap: size.gap,
            padding: size.paddingY,
          },
        });
      }

      return shapes;
    },

    react: (props) => ({
      'aria-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-open': props.isOpen || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
