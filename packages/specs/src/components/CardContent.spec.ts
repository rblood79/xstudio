/**
 * CardContent Component Spec
 *
 * ADR-092 Phase 1 — CardContent slot 의 layout primitive(display/flexDirection) 와
 * size-indexed gap SSOT.
 *
 * - CSS 자동 생성: skipCSSGeneration: true — 부모 CardSpec.childSpecs 경로로
 *   `generated/Card.css` 내부에 inline emit (ADR-078/090 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — CardContent 자체 시각 없음.
 *
 * containerStyles: `implicitStyles.ts:1827-1838` Card 분기의 CardContent width:"100%" 주입을 이관.
 *   ADR-092 Phase 5 에서 해당 분기 제거.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * CardContent Props
 */
export interface CardContentProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * CardContent Component Spec
 *
 * skipCSSGeneration: true — 독립 CSS 파일 emit 중단.
 *   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 내부에 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-092 — `implicitStyles.ts` Card 분기 width:"100%" 주입 이관.
 *   display:flex + flexDirection:column + width:100% 를 SSOT 로 등록.
 *   기존 factory inline default (display/flexDirection/gap) 도 이관 (ADR-092 Phase 4).
 */
export const CardContentSpec: ComponentSpec<CardContentProps> = {
  name: "CardContent",
  description: "Card content slot — display:flex column + width:100%",
  archetype: "simple",
  element: "div",
  // ADR-092: 독립 CSS 파일 emit 중단.
  //   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 에만 inline emit.
  skipCSSGeneration: true,

  // ADR-092 Phase 3: implicitStyles.ts Card 분기(width:"100%") + factory inline(display/flexDirection/gap)
  //   을 Spec SSOT 로 리프팅.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },

  defaultSize: "md",

  // sizes: CardContent 는 Card 컨테이너 padding 내부에 위치하므로 자체 padding = 0.
  //   gap 만 size-indexed — Description + 추가 콘텐츠 사이 간격.
  //   Card.sizes 와 정합하는 gap 스케일 (xs:4 / sm:8 / md:8 / lg:8 / xl:8).
  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 4,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    // Skia 미사용 — container shell.
    //   카드 콘텐츠 시각은 부모 Card.render.shapes 가 담당.
    shapes: () => [],
    react: () => ({}),
  },
};
