/**
 * Panel Component Spec
 *
 * Material Design 3 기반 패널 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Panel Props
 */
export interface PanelProps {
  variant?: 'default' | 'primary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Panel Component Spec
 */
export const PanelSpec: ComponentSpec<PanelProps> = {
  name: 'Panel',
  description: 'Material Design 3 기반 패널 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
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
    surface: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 24,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
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
    shapes: (props, variant, size, state = 'default') => {
      const title = props.title;

      // 사용자 스타일 우선
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

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const stylePy = props.style?.paddingTop ?? props.style?.paddingBottom ?? props.style?.padding;
      const paddingY = stylePy != null
        ? (typeof stylePy === 'number' ? stylePy : parseFloat(String(stylePy)) || 0)
        : size.paddingY;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
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
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 타이틀이 있는 경우
      if (title) {
        const textColor = props.style?.color ?? variant.text;
        const fontSize = props.style?.fontSize ?? size.fontSize;
        const fwRaw = props.style?.fontWeight;
        const fw = fwRaw != null
          ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 600)
          : 600;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

        shapes.push({
          type: 'text' as const,
          x: paddingX,
          y: paddingY,
          text: title,
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          baseline: 'top' as const,
          align: textAlign,
        });
        // 타이틀 하단 구분선
        shapes.push({
          type: 'line' as const,
          x1: 0,
          y1: paddingY * 2 + (size.fontSize as unknown as number),
          x2: 'auto' as unknown as number,
          y2: paddingY * 2 + (size.fontSize as unknown as number),
          stroke: borderColor,
          strokeWidth: 1,
        });
      }

      // 콘텐츠 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: 'column',
          padding: paddingY,
          gap: size.gap,
        },
      });

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
