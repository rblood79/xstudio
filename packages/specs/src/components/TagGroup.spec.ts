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
import { resolveStateColors } from '../utils/stateEffect';
import { resolveToken } from '../renderers/utils/tokenResolver';

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
    shapes: (props, variant, size, state = 'default') => {
      const shapes: Shape[] = [];
      const rawTagFontSize = size.fontSize;
      const resolvedTagFs = typeof rawTagFontSize === 'number'
        ? rawTagFontSize
        : (typeof rawTagFontSize === 'string' && rawTagFontSize.startsWith('{')
            ? resolveToken(rawTagFontSize as TokenRef)
            : rawTagFontSize);
      const tagFontSize = typeof resolvedTagFs === 'number' ? resolvedTagFs : 14;
      const tagGap = size.gap || 4;
      const currentY = 0;

      // ── CSS 구조: TagGroup (column) ──
      // ├── Label       ← 자식 Label 요소가 렌더링 (spec shapes에서 제외)
      // └── TagList (row flex-wrap)
      //     ├── Tag
      //     └── Tag
      //
      // Label은 자식 요소(child Label element)로 렌더링되므로
      // spec shapes에서 중복 렌더링하지 않음 (두 줄 렌더링 방지)

      // TagList 영역: Tag chips (CSS: .react-aria-TagList > .react-aria-Tag)
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
            fill: resolveStateColors(variant, state).background,
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
