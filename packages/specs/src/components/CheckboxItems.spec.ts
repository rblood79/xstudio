/**
 * CheckboxItems Component Spec
 *
 * ADR-093 Phase 1 — CheckboxItems 중간 컨테이너의 layout primitive (display/flexDirection/gap)
 * SSOT 신설.
 * ADR-103 — CheckboxItems Compositional Architecture 정당화 확증 (ADR-098-e 슬롯).
 *   RAC `<CheckboxGroup>` 은 `<Checkbox>` 를 직접 배치하는 구조이며 "CheckboxItems" 중간
 *   컨테이너는 RAC 공식 API 에 없음. composition 고유 D3 layout 컨테이너로 정당화 유지.
 *   정당화 근거: factory 직렬화 BC HIGH (GroupComponents.ts:221 `tag:"CheckboxItems"`) +
 *   D3 시각 스타일 domain 100% 귀속 (containerStyles/sizes Spec SSOT 완비).
 *
 * - composition 자체 추상화: RAC 표준 API 에 없음. CheckboxGroup > CheckboxItems > Checkbox
 *   3단 구조의 중간 컨테이너. spec name 에 "composition 자체 추상" 명시 (ADR-093 R3).
 * - CSS 자동 생성: skipCSSGeneration: true — 부모 CheckboxGroupSpec.childSpecs 경로로
 *   부모 CheckboxGroup generated CSS 내부에 inline emit (ADR-078/090/092 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → `TAG_SPEC_MAP` /
 *   `LOWERCASE_TAG_SPEC_MAP` / `tagToElement.ts` 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — CheckboxItems 자체 시각 없음. Checkbox 자식이 각자 렌더링.
 *
 * containerStyles: `implicitStyles.ts:882-893` checkboxitems 분기의 display/flexDirection
 *   base primitive 를 Spec SSOT 로 리프팅.
 *   Hard Constraint #2: CheckboxGroup orientation 기본값 vertical → column 기본
 *   (CheckboxGroup.spec.ts:32 확인).
 *
 * sizes: sm/md/lg gap 8/12/16 — size-indexed (RadioItems 와 동일 패턴, implicitStyles.ts:888 일치).
 *   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
 *
 * runtime fork (implicitStyles 잔존):
 *   - `orientation === "horizontal"` 시 flexDirection:"row" + alignItems:"center" override
 *   - size-based gap: spec.sizes[sizeName].gap 참조 (Phase 3 implicitStyles 하드코딩 제거)
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * CheckboxItems Props
 *
 * CheckboxItems 는 CheckboxGroup 내부의 중간 컨테이너로 composition 이 자동 생성하는 element.
 * RAC 표준 API 에 없는 composition 자체 추상화.
 */
export interface CheckboxItemsProps {
  // 부모 CheckboxGroup 으로부터 propagation 수신 전용
  size?: "sm" | "md" | "lg";
  orientation?: "vertical" | "horizontal";
}

/**
 * CheckboxItems Component Spec
 *
 * archetype: "simple" — SHELL_ONLY_CONTAINER_TAGS 판정 대상 아님.
 * skipCSSGeneration: true — 독립 CSS 파일 emit 중단.
 *   부모 CheckboxGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-093 — CheckboxItems 분기 base primitive 리프팅.
 *   Hard Constraint #2: CheckboxGroup orientation 기본값 vertical → column 기본.
 *   ADR-094 `expandChildSpecs` 를 통해 `resolveContainerStylesFallback` /
 *   `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
 *
 * runtime fork (implicitStyles 잔존):
 *   orientation="horizontal" 시 flexDirection:"row" + alignItems:"center" override.
 */
export const CheckboxItemsSpec: ComponentSpec<CheckboxItemsProps> = {
  name: "CheckboxItems",
  description:
    "CheckboxGroup 내부 중간 컨테이너 (composition 자체 추상) — display:flex column default",
  archetype: "simple",
  element: "div",
  // ADR-093: 독립 CSS 파일 emit 중단.
  //   부모 CheckboxGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
  skipCSSGeneration: true,

  // ADR-093 Phase 1: implicitStyles.ts CheckboxItems 분기(display/flexDirection base)
  //   를 Spec SSOT 로 리프팅. ADR-094 `expandChildSpecs` 를 통해 자동 주입.
  //   Hard Constraint #2: CheckboxGroup orientation 기본 vertical → column.
  //   runtime fork (orientation="horizontal" 시 row+alignItems:center, gap)
  //   는 implicitStyles.ts 잔존.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
  },

  defaultSize: "md",

  // sizes: sm/md/lg gap 8/12/16 (RadioItems 와 동일, implicitStyles.ts:888 기존값 일치).
  //   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
  sizes: {
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
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 16,
    },
  },

  states: {
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    // Skia 미사용 — container shell.
    //   CheckboxItems 시각 없음. Checkbox 자식이 각자 렌더링.
    shapes: () => [],
    react: () => ({}),
  },
};
