/**
 * Switcher Component Spec
 *
 * @pixi/ui 기반 뷰 전환 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Switcher Props
 */
export interface SwitcherProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  items?: Array<string | { label: string; value?: string }>;
  activeIndex?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Switcher Component Spec
 */
export const SwitcherSpec: ComponentSpec<SwitcherProps> = {
  name: 'Switcher',
  description: '@pixi/ui 기반 뷰 전환 (탭/세그먼트 컨트롤)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 4,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 2,
    },
    md: {
      height: 40,
      paddingX: 4,
      paddingY: 4,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 2,
    },
    lg: {
      height: 48,
      paddingX: 6,
      paddingY: 6,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 4,
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
      const width = (props.style?.width as number) || 240;
      const height = size.height;

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const borderColor = props.style?.borderColor
                        ?? (variant.border ?? '{color.outline-variant}' as TokenRef);

      const items = props.items ?? ['Tab 1', 'Tab 2'];
      const activeIndex = props.activeIndex ?? 0;
      const itemCount = items.length;
      const itemWidth = itemCount > 0 ? (width - size.paddingX * 2) / itemCount : width;

      const shapes: Shape[] = [
        // 배경 트랙
        {
          id: 'track',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'track',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      // Active indicator (선택된 탭 배경)
      const activeX = size.paddingX + activeIndex * itemWidth;
      const activeHeight = height - size.paddingY * 2;
      const activeRadius = (borderRadius as unknown as number) - 2;

      shapes.push({
        id: 'active',
        type: 'roundRect' as const,
        x: activeX,
        y: size.paddingY,
        width: itemWidth,
        height: activeHeight,
        radius: activeRadius,
        fill: '{color.primary}' as TokenRef,
      });

      // 탭 텍스트 스타일
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'center';

      // 탭 텍스트
      items.forEach((item, index) => {
        const label = typeof item === 'string' ? item : item.label;
        const isActive = index === activeIndex;

        const fwRaw = props.style?.fontWeight;
        const fw = fwRaw != null
          ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || (isActive ? 600 : 400))
          : (isActive ? 600 : 400);

        const textColor = props.style?.color
                        ?? (isActive ? '{color.on-primary}' as TokenRef : variant.text);

        shapes.push({
          type: 'text' as const,
          x: size.paddingX + index * itemWidth,
          y: height / 2,
          text: label,
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'middle' as const,
          maxWidth: itemWidth,
        });
      });

      return shapes;
    },

    react: (props) => ({
      role: 'tablist',
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
