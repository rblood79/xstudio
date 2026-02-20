/**
 * Tree Component Spec
 *
 * Material Design 3 기반 트리 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Tree Props
 */
export interface TreeProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  style?: Record<string, string | number | undefined>;
}

/**
 * Tree Component Spec
 */
export const TreeSpec: ComponentSpec<TreeProps> = {
  name: 'Tree',
  description: 'Material Design 3 기반 트리 컴포넌트',
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
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 28,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 2,
    },
    md: {
      height: 36,
      paddingX: 12,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 4,
    },
    lg: {
      height: 44,
      paddingX: 16,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 20,
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
    shapes: (_props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;

      const ff = fontFamily.sans;
      const itemHeight = 32;
      const indent = 20;

      // Phase C: 기본 트리 아이템 (3레벨 중첩)
      const treeItems = [
        { label: 'Root', level: 0, expanded: true },
        { label: 'Documents', level: 1, expanded: true },
        { label: 'file.txt', level: 2, expanded: false },
        { label: 'readme.md', level: 2, expanded: false },
        { label: 'Images', level: 1, expanded: false },
      ];

      const paddingY = size.paddingY as unknown as number || 8;
      const totalHeight = paddingY * 2 + treeItems.length * itemHeight;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: totalHeight,
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
      ];

      // 트리 아이템 Shape 생성
      let y = paddingY;
      for (const item of treeItems) {
        const x = size.paddingX + item.level * indent;

        // expand/collapse 아이콘 (자식이 있는 경우)
        if (item.level < 2) {
          shapes.push({
            type: 'icon_font' as const,
            iconName: item.expanded ? 'chevron-down' : 'chevron-right',
            x: x - 4,
            y: y + itemHeight / 2,
            fontSize: 14,
            fill: variant.text,
            strokeWidth: 2,
          });
        }

        // 아이템 텍스트
        shapes.push({
          type: 'text' as const,
          x: x + 12,
          y: y + itemHeight / 2,
          text: item.label,
          fontSize: size.fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: item.level === 0 ? 600 : 400,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'middle' as const,
        });

        y += itemHeight;
      }

      return shapes;
    },

    react: () => ({
      role: 'tree',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'default',
    }),
  },
};
