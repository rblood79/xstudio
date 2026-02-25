/**
 * Toast Component Spec
 *
 * Material Design 3 기반 토스트 알림 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * Toast Props
 */
export interface ToastProps {
  variant?: 'default' | 'primary' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Toast Component Spec
 *
 * overlay: toast (포털, 화면 하단에 표시)
 */
export const ToastSpec: ComponentSpec<ToastProps> = {
  name: 'Toast',
  description: 'Material Design 3 기반 토스트 알림 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'toast',
    hasBackdrop: false,
    closeOnEscape: true,
    trapFocus: false,
    pixiLayer: 'toast',
  },

  variants: {
    default: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
    error: {
      background: '{color.error-container}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-error-container}' as TokenRef,
      border: '{color.error}' as TokenRef,
    },
    success: {
      background: '{color.tertiary-container}' as TokenRef,
      backgroundHover: '{color.tertiary-container}' as TokenRef,
      backgroundPressed: '{color.tertiary-container}' as TokenRef,
      text: '{color.on-tertiary-container}' as TokenRef,
      border: '{color.tertiary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 40,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    md: {
      height: 48,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 20,
      gap: 10,
    },
    lg: {
      height: 56,
      paddingX: 20,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 24,
      gap: 12,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      const message = props.message || props.children || 'Notification';

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;
      const borderColor = props.style?.borderColor
                        ?? (variant.border || ('{color.outline-variant}' as TokenRef));

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
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        // 그림자
        {
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.15)',
          alpha: 0.15,
        },
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: size.height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
        // 좌측 액센트 바
        {
          type: 'rect' as const,
          x: 0,
          y: 0,
          width: 3,
          height: size.height,
          fill: variant.border || ('{color.primary}' as TokenRef),
        },
      ];
      if (hasChildren) return shapes;

      // 메시지 텍스트 (standalone 전용)
      shapes.push({
        type: 'text' as const,
        x: paddingX + (size.iconSize || 20) + (size.gap || 10),
        y: size.height / 2,
        text: message,
        fontSize: fontSize,
        fontFamily: ff,
        fontWeight: fw,
        fill: textColor,
        baseline: 'middle' as const,
        align: textAlign,
      });

      return shapes;
    },

    react: () => ({
      role: 'alert',
      'aria-live': 'polite',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
