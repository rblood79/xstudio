/**
 * TagList Component Spec
 *
 * ADR-093 Phase 1 — TagList 중간 컨테이너의 layout primitive (display/flexDirection/flexWrap/gap)
 * SSOT 신설.
 *
 * - composition 자체 추상화: RAC `<TagList>` 에 대응하지만, 이 spec 은 composition
 *   builder 에서 TagGroup > TagList > Tag 3단 구조의 중간 컨테이너 레이어.
 * - CSS 자동 생성: skipCSSGeneration: true — 부모 TagGroupSpec.childSpecs 경로로
 *   부모 TagGroup generated CSS 내부에 inline emit (ADR-078/090/092 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → `TAG_SPEC_MAP` /
 *   `LOWERCASE_TAG_SPEC_MAP` / `tagToElement.ts` 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — TagList 자체 시각 없음. Tag 자식이 각자 렌더링.
 *
 * containerStyles: `implicitStyles.ts:574-582` TagList 분기의 display/flexDirection/
 *   flexWrap/gap base primitive 를 Spec SSOT 로 리프팅.
 *   Hard Constraint #2: TagGroup 에는 `orientation` prop 없음 (TagGroup.spec.ts:35 /
 *   GroupComponents.ts:403 확인) → 기본값은 row + wrap (현재 implicitStyles.ts:577 동작 일치).
 *
 * sizes: TagList 는 size prop 없음 (Soft Constraint) → sizes.md only.
 *   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
 *
 * runtime fork (implicitStyles 잔존):
 *   - `labelPosition === "side"` 시 flex:1/minWidth:0 주입
 *   - Tag 자식 whiteSpace:"nowrap" 주입
 *   - maxRows 근사 계산 (자식 Element 조작, spec 커버 영역 아님 — ADR-093 HC#4)
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * TagList Props
 *
 * TagList 는 TagGroup 내부의 중간 컨테이너로 composition 이 자동 생성하는 element.
 * size prop 없음 — 부모 TagGroup.size 를 propagation 으로 수신.
 */
export interface TagListProps {
  // 부모 TagGroup 으로부터 propagation 수신 전용
  size?: "sm" | "md" | "lg";
  allowsRemoving?: boolean;
}

/**
 * TagList Component Spec
 *
 * archetype: "simple" — SHELL_ONLY_CONTAINER_TAGS 판정 대상 아님 (부모 TagGroup 이 해당).
 * skipCSSGeneration: true — 독립 CSS 파일 emit 중단.
 *   부모 TagGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-093 — TagList 분기 base primitive 리프팅.
 *   Hard Constraint #2: TagGroup orientation prop 없음 → row+wrap 기본 (현재 runtime 동작 일치).
 *   ADR-094 `expandChildSpecs` 를 통해 `resolveContainerStylesFallback` /
 *   `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
 */
export const TagListSpec: ComponentSpec<TagListProps> = {
  name: "TagList",
  description:
    "TagGroup 내부 중간 컨테이너 — display:flex row+wrap (TagGroup orientation prop 없음 반영)",
  archetype: "simple",
  element: "div",
  // ADR-093: 독립 CSS 파일 emit 중단.
  //   부모 TagGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
  skipCSSGeneration: true,

  // ADR-093 Phase 1: implicitStyles.ts TagList 분기(display/flexDirection/flexWrap/gap base)
  //   를 Spec SSOT 로 리프팅. ADR-094 `expandChildSpecs` 를 통해
  //   `resolveContainerStylesFallback` / `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
  //   Hard Constraint #2: TagGroup 에는 orientation prop 없음 → row+wrap 기본값.
  //   runtime fork (labelPosition="side" 시 flex:1/minWidth:0, maxRows, whiteSpace injection)
  //   는 implicitStyles.ts 잔존 (Hard Constraint #4).
  containerStyles: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  defaultSize: "md",

  // sizes: TagList 는 size prop 없음 → sizes.md only (gap 4 = implicitStyles.ts:579 기존값 일치).
  //   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
  sizes: {
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 4,
    },
  },

  states: {
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    // Skia 미사용 — container shell.
    //   TagList 시각(배경/테두리 없음)은 자식 Tag element 가 각자 렌더링.
    shapes: () => [],
    react: () => ({}),
  },
};
