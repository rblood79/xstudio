/**
 * Breadcrumbs Component Spec
 *
 * Material Design 3 기반 브레드크럼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Breadcrumbs Props
 */
export interface BreadcrumbsProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  separator?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Breadcrumbs Component Spec
 */
export const BreadcrumbsSpec: ComponentSpec<BreadcrumbsProps> = {
  name: 'Breadcrumbs',
  description: 'Material Design 3 기반 브레드크럼 네비게이션 컴포넌트',
  element: 'nav',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 10,
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
      const ff = fontFamily.sans;
      const separator = props.separator ?? '/';
      const crumbs = ['Home', 'Products', 'Detail'];
      const shapes: Shape[] = [];

      // Phase C: 브레드크럼 아이템 생성
      let x = 0;
      const height = size.height || 24;
      for (let i = 0; i < crumbs.length; i++) {
        const isLast = i === crumbs.length - 1;

        // 크럼 텍스트
        shapes.push({
          type: 'text' as const,
          x,
          y: height / 2,
          text: crumbs[i],
          fontSize: size.fontSize as unknown as number,
          fontFamily: ff,
          fontWeight: isLast ? 600 : 400,
          fill: isLast ? variant.text : ('{color.on-surface-variant}' as TokenRef),
          align: 'left' as const,
          baseline: 'middle' as const,
        });

        // 글자 수 기반 간이 폭 추정 (정확한 측정은 런타임에서)
        x += crumbs[i].length * ((size.fontSize as unknown as number || 14) * 0.6);

        // 구분자
        if (!isLast) {
          x += (size.gap as unknown as number || 8);
          shapes.push({
            type: 'text' as const,
            x,
            y: height / 2,
            text: separator,
            fontSize: size.fontSize as unknown as number,
            fontFamily: ff,
            fontWeight: 400,
            fill: '{color.on-surface-variant}' as TokenRef,
            align: 'left' as const,
            baseline: 'middle' as const,
          });
          x += (size.gap as unknown as number || 8) + (size.fontSize as unknown as number || 14) * 0.4;
        }
      }

      return shapes;
    },

    react: () => ({
      'aria-label': 'Breadcrumb',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
