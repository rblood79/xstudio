/**
 * ToggleButtonGroup Component Spec
 *
 * Material Design 3 기반 토글 버튼 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ToggleButtonGroup Props
 */
export interface ToggleButtonGroupProps {
  variant?: 'default' | 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  selectionMode?: 'single' | 'multiple';
  indicator?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ToggleButtonGroup Component Spec
 *
 * Container 컴포넌트: 자식 ToggleButton들을 포함
 * variant/size는 React 컴포넌트에서 Context로 자식에 전파
 */
export const ToggleButtonGroupSpec: ComponentSpec<ToggleButtonGroupProps> = {
  name: 'ToggleButtonGroup',
  description: 'Material Design 3 기반 토글 버튼 그룹 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    secondary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 0,
    },
  },

  states: {
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const borderColor = props.style?.borderColor ?? variant.border ?? variant.text;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const shapes: Shape[] = [
        // 그룹 배경
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
        // 그룹 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
        // 자식 ToggleButton 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [], // 자식은 렌더러에서 주입
          layout: {
            display: 'flex',
            flexDirection: props.orientation === 'vertical' ? 'column' : 'row',
            gap: size.gap,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      'aria-orientation': props.orientation || 'horizontal',
      'data-indicator': props.indicator || undefined,
      role: 'group',
    }),

    pixi: () => ({
      eventMode: 'passive' as const,
    }),
  },
};
