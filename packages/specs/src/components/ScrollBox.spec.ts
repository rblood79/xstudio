/**
 * ScrollBox Component Spec
 *
 * Material Design 3 기반 스크롤 박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ScrollBox Props
 */
export interface ScrollBoxProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  scrollDirection?: 'vertical' | 'horizontal' | 'both';
  style?: Record<string, string | number | undefined>;
}

/**
 * ScrollBox Component Spec
 */
export const ScrollBoxSpec: ComponentSpec<ScrollBoxProps> = {
  name: 'ScrollBox',
  description: 'Material Design 3 기반 스크롤 가능한 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 120,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
    md: {
      height: 200,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
    lg: {
      height: 320,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
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
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      const width = 'auto' as const;
      const height = size.height;

      // 사용자 스타일 우선, 없으면 spec 기본값
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
                        ?? (variant.border || ('{color.outline-variant}' as TokenRef));

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
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
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
        // 스크롤 콘텐츠 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width,
          height,
          children: [],
          clip: true,
          layout: {
            display: 'flex',
            flexDirection: 'column',
            padding: size.paddingY,
          },
        },
        // 세로 스크롤바 트랙
        {
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 6,
          height: height * 0.3,
          radius: 3,
          fill: '{color.on-surface-variant}' as TokenRef,
          fillAlpha: 0.3,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      tabIndex: 0,
      style: {
        overflowX: props.scrollDirection === 'horizontal' || props.scrollDirection === 'both' ? 'auto' : 'hidden',
        overflowY: props.scrollDirection === 'horizontal' ? 'hidden' : 'auto',
      },
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
