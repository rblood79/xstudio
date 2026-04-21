/**
 * CardHeader Component Spec
 *
 * ADR-104 (098-f 슬롯): `CardHeader` 이름은 S2/RSP 공식 미존재 (S2 는 범용 `Header` 슬롯을
 * Card context 에서 재사용). composition 은 Card 전용 element tree 에서 Card-prefix 구체화
 * 이름을 사용 — D3 Compositional Architecture 고유 레이아웃 슬롯 컨테이너 정당화.
 * BC 재평가: `tag:"CardHeader"` factory 직렬화 확인 (`LayoutComponents.ts:158`) — BC HIGH.
 * 대안 A (정당화 유지) 채택.
 *
 * ADR-092 Phase 1 — CardHeader slot 의 layout primitive(display/flexDirection/alignItems) 와
 * size-indexed padding SSOT.
 *
 * - CSS 자동 생성: skipCSSGeneration: false — 부모 CardSpec.childSpecs 경로로
 *   `generated/Card.css` 내부에 inline emit (ADR-078/090 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → `TAG_SPEC_MAP` / `LOWERCASE_TAG_SPEC_MAP`
 *   / `tagToElement.ts` 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — CardHeader 자체 시각 없음. 카드 헤더 배경/패딩은
 *   부모 Card.render.shapes + Taffy 레이아웃이 담당.
 *
 * containerStyles: `implicitStyles.ts:1827-1838` Card 분기의 CardHeader width:"100%" 주입을 이관.
 *   ADR-092 Phase 5 에서 해당 분기 제거.
 *
 * sizes: 부모 Card.sizes 와 동일 paddingX/Y 스케일 유지 (정합성).
 *   CardHeader 는 카드 컨테이너 padding 안에 있으므로 자체 paddingX/Y = 0.
 *   gap 만 상속 (Heading + action button 간격).
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * CardHeader Props
 */
export interface CardHeaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * CardHeader Component Spec
 *
 * skipCSSGeneration: false — 독립 파일 emit 중단.
 *   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 내부에 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-092 — `implicitStyles.ts` Card 분기 width:"100%" 주입 이관.
 *   display:flex + flexDirection:row + alignItems:center + width:100% 를 SSOT 로 등록.
 *   기존 factory inline default (display/flexDirection/alignItems/gap) 도 이관 (ADR-092 Phase 4).
 */
export const CardHeaderSpec: ComponentSpec<CardHeaderProps> = {
  name: "CardHeader",
  description:
    "Card header slot — display:flex row + alignItems:center + width:100%",
  archetype: "simple",
  element: "div",
  // ADR-092: 독립 CSS 파일 emit 중단.
  //   부모 CardSpec.childSpecs 경로로 `generated/Card.css` 에만 inline emit.
  //   수동 Card.css 가 없는 이상적 상태 (ADR-092 Context 실측)이므로 @layer 충돌 없음.
  skipCSSGeneration: true,

  // ADR-092 Phase 3: implicitStyles.ts Card 분기(width:"100%") + factory inline(display/flexDirection/
  //   alignItems/gap) 을 Spec SSOT 로 리프팅. ADR-094 `expandChildSpecs` 를 통해
  //   `resolveContainerStylesFallback` / `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
  containerStyles: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  defaultSize: "md",

  // sizes: CardHeader 는 Card 컨테이너 padding 내부에 위치하므로 자체 padding = 0.
  //   gap 만 size-indexed — Heading + 액션 버튼 사이 간격.
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

  // ADR-095: 자식 Heading 에 `style.flex: 1` 고정 주입. 기존 `implicitStyles.ts:1843-1856`
  //   cardheader 분기 해체 대응. Heading 에 사용자가 flex/flexGrow/width 중 하나라도
  //   설정돼 있으면 skip (skipIfSet — 기존 조건 1:1 이관).
  propagation: {
    rules: [
      {
        childPath: "Heading",
        childProp: "flex",
        asStyle: true,
        styleValue: 1,
        skipIfSet: ["flex", "flexGrow", "width"],
      },
    ],
  },

  render: {
    // Skia 미사용 — container shell.
    //   카드 헤더 시각(배경/padding)은 부모 Card.render.shapes 가 담당.
    shapes: () => [],
    react: () => ({}),
  },
};
