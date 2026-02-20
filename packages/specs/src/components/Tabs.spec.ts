/**
 * Tabs Component Spec
 *
 * Material Design 3 기반 탭 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Tabs Props
 */
export interface TabsProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  selectedKey?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Tabs Component Spec
 */
export const TabsSpec: ComponentSpec<TabsProps> = {
  name: 'Tabs',
  description: 'Material Design 3 기반 탭 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.secondary-container}' as TokenRef,
      backgroundPressed: '{color.secondary-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.secondary}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 12,
      paddingY: 6,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 44,
      paddingX: 16,
      paddingY: 10,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 52,
      paddingX: 20,
      paddingY: 14,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
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
      outlineOffset: '-2px',
    },
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const isVertical = props.orientation === 'vertical';

      // 사용자 스타일 우선
      const borderColor = props.style?.borderColor
                        ?? (variant.border || ('{color.outline-variant}' as TokenRef));

      const ff = fontFamily.sans;
      const tabLabels = ['Tab 1', 'Tab 2', 'Tab 3'];
      const selectedIdx = 0; // 기본 첫 번째 탭 선택
      const tabWidth = isVertical ? 120 : 100;
      const shapes: Shape[] = [];

      // Phase C: 탭 버튼 Shape 생성
      let tabX = 0;
      let tabY = 0;
      for (let i = 0; i < tabLabels.length; i++) {
        const isSelected = i === selectedIdx;

        // 탭 배경
        shapes.push({
          type: 'rect' as const,
          x: isVertical ? 0 : tabX,
          y: isVertical ? tabY : 0,
          width: tabWidth,
          height: size.height,
          fill: isSelected ? variant.backgroundHover : variant.background,
        });

        // 탭 텍스트
        shapes.push({
          type: 'text' as const,
          x: (isVertical ? 0 : tabX) + tabWidth / 2,
          y: (isVertical ? tabY : 0) + size.height / 2,
          text: tabLabels[i],
          fontSize: size.fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: isSelected ? 600 : 400,
          fill: isSelected ? (variant.textHover ?? variant.text) : variant.text,
          align: 'center' as const,
          baseline: 'middle' as const,
        });

        // 선택된 탭의 하단 인디케이터
        if (isSelected) {
          shapes.push({
            type: 'line' as const,
            x1: isVertical ? 0 : tabX,
            y1: isVertical ? tabY + size.height : size.height - 2,
            x2: isVertical ? 0 : tabX + tabWidth,
            y2: isVertical ? tabY + size.height : size.height - 2,
            stroke: '{color.primary}' as TokenRef,
            strokeWidth: 3,
          });
        }

        if (isVertical) {
          tabY += size.height;
        } else {
          tabX += tabWidth;
        }
      }

      // 탭 리스트 하단/우측 구분선
      shapes.push({
        type: 'line' as const,
        x1: 0,
        y1: isVertical ? 0 : size.height,
        x2: isVertical ? 0 : 'auto' as unknown as number,
        y2: isVertical ? 'auto' as unknown as number : size.height,
        stroke: borderColor,
        strokeWidth: 1,
      });

      return shapes;
    },

    react: (props) => ({
      'data-orientation': props.orientation || 'horizontal',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
