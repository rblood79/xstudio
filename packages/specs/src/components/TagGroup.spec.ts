/**
 * TagGroup Component Spec
 *
 * Material Design 3 기반 태그 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * TagGroup Props
 */
export interface TagGroupProps {
  variant?: 'default' | 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  label?: string;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Tag 텍스트 배열 (Skia 렌더링용) */
  _tagItems?: { text: string }[];
}

/**
 * TagGroup Component Spec
 */
export const TagGroupSpec: ComponentSpec<TagGroupProps> = {
  name: 'TagGroup',
  description: 'Material Design 3 기반 태그 그룹 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
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
    secondary: {
      background: '{color.secondary-container}' as TokenRef,
      backgroundHover: '{color.secondary-container}' as TokenRef,
      backgroundPressed: '{color.secondary-container}' as TokenRef,
      text: '{color.on-secondary-container}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    error: {
      background: '{color.error-container}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-error-container}' as TokenRef,
      border: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 16,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 10,
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
    shapes: (props, variant, size, _state = 'default') => {
      const shapes: Shape[] = [];
      const tagFontSize = size.fontSize as unknown as number || 14;
      const tagGap = size.gap || 4;
      let currentY = 0;

      // ── CSS 구조: TagGroup (column) ──
      // ├── Label
      // └── TagList (row flex-wrap)
      //     ├── Tag
      //     └── Tag

      // 1) Label 텍스트 (CSS: .react-aria-TagGroup > Label)
      const label = props.label;
      if (label) {
        const labelFontSize = tagFontSize > 2 ? tagFontSize - 2 : 12;
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: currentY,
          text: label,
          fontSize: labelFontSize,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'top' as const,
        });
        currentY += labelFontSize + 4; // gap: 2px + 여유
      }

      // 2) TagList 영역: Tag chips (CSS: .react-aria-TagList > .react-aria-Tag)
      const tagItems = props._tagItems;
      if (tagItems && tagItems.length > 0) {
        const tagPaddingX = size.paddingX || 8;
        const tagPaddingY = size.paddingY || 2;
        const tagHeight = tagFontSize + tagPaddingY * 2;
        const borderRadius = size.borderRadius as unknown as number || 4;
        let tagX = 0;

        for (const item of tagItems) {
          // 태그 칩 너비 추정
          const charWidth = tagFontSize * 0.55;
          const textWidth = item.text.length * charWidth;
          const chipWidth = textWidth + tagPaddingX * 2;

          // Tag 배경 (roundRect)
          shapes.push({
            id: `tag-bg-${tagX}-${currentY}`,
            type: 'roundRect' as const,
            x: tagX,
            y: currentY,
            width: chipWidth,
            height: tagHeight,
            radius: borderRadius,
            fill: variant.background,
          });

          // Tag 테두리
          shapes.push({
            type: 'border' as const,
            target: `tag-bg-${tagX}-${currentY}`,
            borderWidth: 1,
            color: variant.border || variant.text,
            radius: borderRadius,
          });

          // Tag 텍스트
          shapes.push({
            type: 'text' as const,
            x: tagX + tagPaddingX,
            y: currentY + tagPaddingY,
            text: item.text,
            fontSize: tagFontSize,
            fontFamily: fontFamily.sans,
            fontWeight: 400,
            fill: variant.text,
            align: 'left' as const,
            baseline: 'top' as const,
          });

          tagX += chipWidth + tagGap;
        }
      }

      return shapes;
    },

    react: (props) => ({
      role: 'group',
      'aria-label': props.label,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
