/**
 * List Component Spec
 *
 * Material Design 3 기반 리스트 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * List Props
 */
export interface ListProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  items?: Array<{ label: string; description?: string }>;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * List Component Spec
 *
 * height: 0 = auto (아이템 수에 따라 결정)
 */
export const ListSpec: ComponentSpec<ListProps> = {
  name: 'List',
  description: 'Material Design 3 기반 리스트 컴포넌트',
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
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 2,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
      gap: 4,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      iconSize: 24,
      gap: 6,
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
    shapes: (props, variant, size, state = 'default') => {
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      const width = 'auto' as const;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const textColor = props.style?.color ?? variant.text;
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const stylePad = props.style?.padding;
      const padding = stylePad != null
        ? (typeof stylePad === 'number' ? stylePad : parseFloat(String(stylePad)) || 0)
        : size.paddingY;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 콘텐츠 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'flex',
            flexDirection: 'column',
            gap: size.gap,
            padding,
          },
        },
      ];

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 샘플 리스트 아이템 텍스트
      const items = props.items ?? [
        { label: 'Item 1' },
        { label: 'Item 2' },
        { label: 'Item 3' },
      ];
      items.forEach((item, index) => {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY + index * ((size.fontSize as unknown as number) + (size.gap ?? 4) + size.paddingY),
          text: item.label,
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      });

      return shapes;
    },

    react: (props) => ({
      role: 'list',
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'default',
    }),
  },
};
