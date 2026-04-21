/**
 * GridListItem Component Spec
 *
 * ADR-090 Phase 1 — GridListItem 의 card metric(padding/gap/borderWidth/borderRadius) +
 * containerStyles (display/flexDirection/padding/gap/borderWidth) SSOT.
 *
 * - CSS 자동 생성 미사용 (skipCSSGeneration: true) — parent GridList 가 수동 CSS 유지.
 *   수동 CSS 해체는 후속 ADR (GridList.skipCSSGeneration 전환 + Generator 확장 필요).
 * - Skia consumer: `GridList.render.shapes` 가 `resolveGridListItemMetric(fontSize)` 를 소비.
 * - Layout consumer: `implicitStyles.ts` gridlistitem 분기가 `resolveContainerStylesFallback`
 *   read-through 로 `containerStyles` 를 소비 (ADR-083 Phase 0 인프라).
 *
 * ADR-078 (ListBoxItem spec) 의 패턴을 1:1 재사용.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * GridListItem Props (Spec metadata 전용)
 */
export interface GridListItemProps {
  size?: "md";
}

/**
 * GridListItem Component Spec
 *
 * skipCSSGeneration: true — CSS 자동 생성 미사용 (parent GridList 수동 CSS 유지).
 * render.shapes: () => [] — Skia shapes 없음 (card 시각은 부모 GridList.render.shapes 담당).
 *
 * sizes.md:
 *   - paddingX: 16, paddingY: 12 — 수동 CSS `var(--spacing-md) var(--spacing-lg)` = 12/16 정합
 *     (fontSize=14 기준값. fontSize>14/>12 분기는 resolveGridListItemMetric 내부에서 처리).
 *   - gap: 2 — label↔description 수직 간격 (수동 CSS `var(--spacing-2xs)` 정합).
 *   - borderWidth: 1 — 수동 CSS `border: 1px solid var(--border)` 정합.
 *   - borderRadius {radius.lg} = 8px (fontSize=14 기준. fontSize>14 분기는 resolver 내부 12px).
 *   - descGap 4 — label↔description 사이 Skia shapes 수직 간격 (fontSize=14 기준).
 *
 * containerStyles: `implicitStyles.ts:758-773` gridlistitem 분기의 하드코딩을 리프팅.
 *   `resolveContainerStylesFallback` 을 통해 parentStyle 에 선주입 → 기존 분기 해체 가능.
 */
export const GridListItemSpec: ComponentSpec<GridListItemProps> = {
  name: "GridListItem",
  description:
    "GridList item — Spec metadata 전용 (skipCSSGeneration: true, Skia shapes 부모 소비)",
  archetype: "simple",
  element: "div",
  skipCSSGeneration: true,

  // ADR-090 Phase 4: implicitStyles.ts:758-773 gridlistitem 분기 리프팅 — layout primitive.
  //   display/flexDirection 은 containerStyles 로 이관 → resolveContainerStylesFallback 주입.
  //   padding/gap/borderWidth 는 Taffy 가 shorthand 를 처리 못하므로 sizes.md 에서 개별 필드로
  //   SSOT 유지 → implicitStyles 분기가 paddingTop/Right/Bottom/Left 로 분해 주입.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
  },

  defaultSize: "md",

  // ADR-090 Phase 1: md 기준 card metric SSOT (fontSize=14 기준값).
  //   fontSize>14/>12 분기는 resolveGridListItemMetric 내부에 캡슐화.
  sizes: {
    md: {
      // height 0 = content-fit (card 시각은 label+description 합산 + padding)
      height: 0,
      paddingX: 16,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      gap: 2,
      fontWeight: 600,
    },
  },

  states: {
    hover: {
      background: "{color.layer-1}",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
  },

  render: {
    // Skia 미사용 — Spec metadata 전용.
    //   card 시각은 부모 GridList.render.shapes 가 resolveGridListItemMetric(fontSize) 를 참조.
    shapes: () => [],
    react: () => ({}),
  },
};

/**
 * ADR-090 Phase 2: GridListItem card metric 단일 소스 resolver.
 *
 * `GridList.render.shapes` 가 카드 시각 생성 시 본 resolver 를 소비.
 * fontSize-based 분기(fontSize>14: 20/16/12/6, >12: 16/12/8/4, else: 12/10/8/4) 를 내부 캡슐화.
 *
 * 기본값 (fontSize=14 기준): GridListItemSpec.sizes.md 에서 직접 참조.
 * fontSize=14 기준값: paddingX/Y = CSS `var(--spacing-md)/var(--spacing-lg)` (12/16) 정합.
 * gap=2 = CSS `var(--spacing-2xs)` 정합. borderRadius={radius.lg}=8px = CSS `var(--radius-lg)` 정합.
 * fontSize>14/>12 분기는 내부에서 처리 (cardBorderRadius 12/8/8).
 * ADR-105-c: 삼자 정합 완결 (Spec {radius.lg} / resolver 8 / CSS var(--radius-lg)).
 */
export function resolveGridListItemMetric(fontSize: number): {
  cardPaddingX: number;
  cardPaddingY: number;
  cardBorderRadius: number;
  descGap: number;
} {
  // fontSize>14: large 카드 (20/16/12/6)
  if (fontSize > 14) {
    return {
      cardPaddingX: 20,
      cardPaddingY: 16,
      cardBorderRadius: 12,
      descGap: 6,
    };
  }
  // fontSize>12: medium 카드 (16/12/8/4) — spec.sizes.md 기본값 매칭
  if (fontSize > 12) {
    const sz = GridListItemSpec.sizes.md;
    return {
      cardPaddingX: sz.paddingX,
      cardPaddingY: sz.paddingY,
      cardBorderRadius: 8,
      descGap: 4,
    };
  }
  // fontSize≤12: small 카드 (12/10/8/4)
  return {
    cardPaddingX: 12,
    cardPaddingY: 10,
    cardBorderRadius: 8,
    descGap: 4,
  };
}
