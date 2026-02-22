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
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * Breadcrumbs Props
 */
export interface BreadcrumbsProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  separator?: string;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Breadcrumb 텍스트 배열 (Skia 렌더링용) */
  _crumbs?: string[];
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
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 24,
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
      // CSS 기본 구분자: › (RIGHT SINGLE ANGLE QUOTATION MARK)
      const separator = props.separator ?? '›';
      const crumbs = (props._crumbs && props._crumbs.length > 0)
        ? props._crumbs
        : ['Home', 'Products', 'Detail'];
      const shapes: Shape[] = [];

      // fontSize: TokenRef 문자열일 수 있으므로 resolveToken으로 숫자 변환
      const resolvedFontSize = typeof size.fontSize === 'number'
        ? size.fontSize
        : (resolveToken(size.fontSize as TokenRef) as number) ?? 14;
      // CSS 구분자 간격: padding: 0 var(--spacing) = 0 4px
      const separatorPadding = 4;

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
          fontSize: resolvedFontSize,
          fontFamily: ff,
          fontWeight: isLast ? 600 : 400,
          fill: isLast ? variant.text : ('{color.on-surface-variant}' as TokenRef),
          align: 'left' as const,
          baseline: 'middle' as const,
        });

        // 글자 수 기반 간이 폭 추정 (정확한 측정은 런타임에서)
        x += crumbs[i].length * (resolvedFontSize * 0.55);

        // 구분자 (CSS: padding 0 4px)
        if (!isLast) {
          x += separatorPadding;
          shapes.push({
            type: 'text' as const,
            x,
            y: height / 2,
            text: separator,
            fontSize: resolvedFontSize,
            fontFamily: ff,
            fontWeight: 400,
            fill: '{color.on-surface-variant}' as TokenRef,
            align: 'left' as const,
            baseline: 'middle' as const,
          });
          x += separatorPadding + resolvedFontSize * 0.35;
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
