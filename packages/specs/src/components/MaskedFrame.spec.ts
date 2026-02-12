/**
 * MaskedFrame Component Spec
 *
 * Material Design 3 기반 마스크 프레임 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * MaskedFrame Props
 */
export interface MaskedFrameProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  maskShape?: 'rect' | 'circle' | 'roundRect';
  style?: Record<string, string | number | undefined>;
}

/**
 * MaskedFrame Component Spec
 */
export const MaskedFrameSpec: ComponentSpec<MaskedFrameProps> = {
  name: 'MaskedFrame',
  description: 'Material Design 3 기반 마스크 프레임 컴포넌트',
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
  },

  sizes: {
    sm: {
      height: 80,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
    md: {
      height: 120,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
    },
    lg: {
      height: 200,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
    },
  },

  states: {
    hover: {},
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

      const maskShape = props.maskShape || 'roundRect';
      const width = (props.style?.width as number) || 'auto';
      const height = size.height;

      const shapes: Shape[] = [];

      // 마스크 영역에 따라 다른 Shape 생성
      if (maskShape === 'circle') {
        const radius = Math.min(
          typeof width === 'number' ? width : height,
          height
        ) / 2;
        shapes.push({
          id: 'mask',
          type: 'circle' as const,
          x: radius,
          y: radius,
          radius,
          fill: bgColor,
        });
      } else if (maskShape === 'rect') {
        shapes.push({
          id: 'mask',
          type: 'rect' as const,
          x: 0,
          y: 0,
          width,
          height,
          fill: bgColor,
        });
      } else {
        // roundRect (기본)
        shapes.push({
          id: 'mask',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });
      }

      // 테두리
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'mask',
          borderWidth,
          color: borderColor,
          radius: maskShape === 'roundRect' ? borderRadius as unknown as number : undefined,
        });
      }

      // 콘텐츠 컨테이너 (클리핑 적용)
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width,
        height,
        children: [],
        clip: true,
      });

      return shapes;
    },

    react: (props) => ({
      'data-mask-shape': props.maskShape || 'roundRect',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
