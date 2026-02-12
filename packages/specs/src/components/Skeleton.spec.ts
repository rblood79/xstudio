/**
 * Skeleton Component Spec
 *
 * Material Design 3 기반 스켈레톤 로딩 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Skeleton Props
 */
export interface SkeletonProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  skeletonVariant?: 'text' | 'avatar' | 'card' | 'list';
  width?: number;
  height?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * Skeleton Component Spec
 */
export const SkeletonSpec: ComponentSpec<SkeletonProps> = {
  name: 'Skeleton',
  description: 'Material Design 3 기반 스켈레톤 로딩 플레이스홀더 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const skeletonType = props.skeletonVariant || 'text';
      const width = props.width || 200;
      const height = props.height || size.height;
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [];

      if (skeletonType === 'avatar') {
        // 원형 아바타 스켈레톤
        const avatarSize = height;
        shapes.push({
          type: 'circle' as const,
          x: avatarSize / 2,
          y: avatarSize / 2,
          radius: avatarSize / 2,
          fill: variant.background,
        });
      } else if (skeletonType === 'card') {
        // 카드 스켈레톤
        shapes.push({
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: variant.background,
        });
        // 이미지 영역
        shapes.push({
          type: 'rect' as const,
          x: 0,
          y: 0,
          width,
          height: height * 0.5,
          fill: '{color.surface-container-high}' as TokenRef,
        });
        // 제목 라인
        shapes.push({
          type: 'roundRect' as const,
          x: 12,
          y: height * 0.55,
          width: width * 0.7,
          height: size.height * 0.8,
          radius: 4,
          fill: '{color.surface-container-high}' as TokenRef,
        });
      } else if (skeletonType === 'list') {
        // 리스트 스켈레톤 (3행)
        for (let i = 0; i < 3; i++) {
          const rowY = i * (size.height + 12);
          // 아바타
          shapes.push({
            type: 'circle' as const,
            x: size.height / 2,
            y: rowY + size.height / 2,
            radius: size.height / 2,
            fill: variant.background,
          });
          // 텍스트 라인
          shapes.push({
            type: 'roundRect' as const,
            x: size.height + 12,
            y: rowY + 2,
            width: width * 0.5,
            height: size.height * 0.6,
            radius: 4,
            fill: variant.background,
          });
        }
      } else {
        // 텍스트 스켈레톤 (기본)
        shapes.push({
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: variant.background,
        });
      }

      return shapes;
    },

    react: () => ({
      'aria-hidden': true,
      role: 'presentation',
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
