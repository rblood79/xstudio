/**
 * ListBox Component Spec
 *
 * Material Design 3 기반 리스트박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * ListBox Props
 */
export interface ListBoxProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isDisabled?: boolean;
  selectionMode?: 'single' | 'multiple';
  /** 아이템 목록 (우선순위: items > children 개행 분리) */
  items?: string[];
  /** 선택된 아이템 인덱스 (단일 선택용 하이라이트) */
  selectedIndex?: number;
  /** 선택된 아이템 인덱스 목록 (다중 선택용 하이라이트) */
  selectedIndices?: number[];
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * ListBox Component Spec
 */
export const ListBoxSpec: ComponentSpec<ListBoxProps> = {
  name: 'ListBox',
  description: 'Material Design 3 기반 리스트박스 컴포넌트',
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
      height: 0,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 2,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 4,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
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
      const width = (props.style?.width as number) || 200;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

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

      const labelFontSize = fontSize - 2;
      const labelHeight = Math.ceil(labelFontSize * 1.2);
      const labelGap = size.gap ?? 8;
      const labelOffset = props.label ? labelHeight + labelGap : 0;

      const shapes: Shape[] = [];

      // 라벨
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 리스트 컨테이너 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: labelOffset,
        width,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: bgColor,
      });

      // 테두리
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 리스트 아이템 생성
      const items: string[] = props.items
        ?? (props.children
            ? props.children.split('\n').filter(Boolean)
            : ['Item 1', 'Item 2', 'Item 3']);

      const itemH = fontSize > 16
        ? 40
        : fontSize > 12
          ? 36
          : 32;
      const paddingY = size.paddingY as unknown as number || 8;
      const gap = size.gap as unknown as number || 4;
      const paddingX = size.paddingX as unknown as number || 12;
      const baseY = labelOffset;
      let itemY = baseY + paddingY;

      // 선택 상태 계산
      const selectedSet = new Set<number>(
        props.selectedIndices
          ?? (props.selectedIndex != null ? [props.selectedIndex] : [0]),
      );

      for (let i = 0; i < items.length; i++) {
        const isSelected = selectedSet.has(i);

        // 아이템 배경 (선택/hover 상태 표시)
        shapes.push({
          type: 'roundRect' as const,
          x: 4,
          y: itemY + 2,
          width: width - 8,
          height: itemH - 4,
          radius: borderRadius as unknown as number,
          fill: isSelected
            ? variant.backgroundHover
            : bgColor,
        });

        // 선택 표시 아이콘 (다중 선택 모드)
        if (props.selectionMode === 'multiple') {
          shapes.push({
            type: 'icon_font' as const,
            iconName: isSelected ? 'check-square' : 'square',
            x: paddingX + 6,
            y: itemY + itemH / 2,
            fontSize,
            fill: isSelected
              ? ('{color.primary}' as TokenRef)
              : ('{color.on-surface-variant}' as TokenRef),
            strokeWidth: 2,
          });
        }

        // 아이템 텍스트
        const textX = props.selectionMode === 'multiple'
          ? paddingX + fontSize + 10
          : paddingX;
        shapes.push({
          type: 'text' as const,
          x: textX,
          y: itemY + itemH / 2,
          text: items[i],
          fontSize,
          fontFamily: ff,
          fontWeight: isSelected ? 600 : 400,
          fill: isSelected
            ? ('{color.on-surface}' as TokenRef)
            : textColor,
          align: textAlign,
          baseline: 'middle' as const,
        });

        itemY += itemH + gap;
      }

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      role: 'listbox',
      'aria-multiselectable': props.selectionMode === 'multiple' || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'default',
    }),
  },
};
