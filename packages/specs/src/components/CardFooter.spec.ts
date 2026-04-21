/**
 * CardFooter Component Spec
 *
 * ADR-092 Phase 1 — CardFooter slot 의 layout primitive(display/flexDirection/alignItems/
 * justifyContent) 와 size-indexed 값 SSOT.
 *
 * - CSS 자동 생성: skipCSSGeneration: true — 부모 CardSpec.childSpecs 경로로
 *   `generated/Card.css` 내부에 inline emit (ADR-078/090 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — CardFooter 자체 시각 없음.
 *
 * containerStyles: factory inline default(display/flexDirection/alignItems/gap/width) 이관.
 *   ADR-092 Phase 4 에서 해당 factory 코드 제거.
 *
 * Soft Constraint: CardFooter 는 `apps/builder/src/builder/factories/definitions/LayoutComponents.ts`
 *   factory 가 Card 생성 시 자동 생성 + `useElementCreator.ts:154-176` Card action 컴포넌트를
 *   CardFooter 로 자동 라우팅. implicitStyles.ts 에 별도 분기 없음 (scope 외).
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * CardFooter Props
 */
export interface CardFooterProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * CardFooter Component Spec
 *
 * skipCSSGeneration: true — 독립 CSS 파일 emit 중단.
 *   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 내부에 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-092 — factory inline(display/flexDirection/alignItems/gap/width/
 *   paddingTop/borderTopWidth) 이관. width:100% 는 CardHeader/CardContent 와 동일 패턴.
 *   paddingTop/borderTopWidth 는 Taffy layout prop 이 아니라 factory default 에만 있던 값으로,
 *   containerStyles 에 포함 불가 (Taffy shorthand 미지원) → sizes 에서 개별 필드로 관리.
 */
export const CardFooterSpec: ComponentSpec<CardFooterProps> = {
  name: "CardFooter",
  description:
    "Card footer slot — display:flex row + alignItems:center + justifyContent:flex-end + width:100%",
  archetype: "simple",
  element: "div",
  // ADR-092: 독립 CSS 파일 emit 중단.
  //   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 에만 inline emit.
  skipCSSGeneration: true,

  // ADR-092 Phase 4: factory inline(display/flexDirection/alignItems/width) 을 Spec SSOT 로 리프팅.
  //   justifyContent:flex-end — 액션 버튼을 오른쪽 정렬하는 카드 푸터 표준 레이아웃.
  containerStyles: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },

  defaultSize: "md",

  // sizes: CardFooter 는 Card 컨테이너 padding 내부에 위치하므로 자체 padding = 0.
  //   gap 만 size-indexed — 액션 버튼들 사이 간격.
  //   Card.sizes 와 정합하는 gap 스케일 (xs:4 / sm:4 / md:8 / lg:8 / xl:8).
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
      gap: 4,
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
    //   카드 푸터 시각은 부모 Card.render.shapes 가 담당.
    shapes: () => [],
    react: () => ({}),
  },
};
