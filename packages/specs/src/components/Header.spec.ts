/**
 * Header Component Spec
 *
 * ADR-099 Phase 3 (098-c 슬롯): RAC `<Header>` (slot="section-header") 대응.
 * ListBox/GridList/Menu Section 의 첫 자식 헤더 텍스트 렌더링용 — sticky 위치 +
 * elevated z-index + muted 스타일.
 *
 * **CSS 자동 생성 전용 (Builder Skia 미등록)**: ListBoxSpec.render.shapes 가 items
 * discriminated union 의 section 엔트리 렌더 시 Header shape 를 직접 그리고, 본 Spec
 * 은 `ListBoxSpec.childSpecs` 경로로 `generated/ListBox.css` 내부에 inline emit
 * (`.react-aria-ListBox .react-aria-Header` 블록) — Preview DOM 의 RAC Header 에
 * CSS 적용용.
 *
 * ADR-078 ListBoxItemSpec 선례 1:1 재적용 (childSpecs inline emit + Skia 미등록).
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * Header Props (CSS 생성 전용)
 */
export interface HeaderProps {
  size?: "sm" | "md" | "lg";
}

/**
 * Header Component Spec
 *
 * skipCSSGeneration: true — 독립 CSS 파일 미생성.
 *   부모 ListBox/GridList/Menu Spec 의 childSpecs 경로로 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (부모 spec shapes 가 Header text 렌더).
 */
export const HeaderSpec: ComponentSpec<HeaderProps> = {
  name: "Header",
  description:
    "Section header — ListBox/GridList/Menu section 의 첫 자식 (RAC slot='section-header')",
  archetype: "simple",
  element: "div",
  skipCSSGeneration: true,

  // ADR-099 Phase 3: RAC 공식 Header 스타일 — sticky 위치 + muted 색상 + semibold.
  // Preview DOM 의 `<Header>` 가 RAC 에서 rendering 될 때 본 containerStyles 가 적용.
  containerStyles: {
    position: "sticky",
    background: "{color.raised}" as TokenRef,
    text: "{color.neutral-subdued}" as TokenRef,
  },

  defaultSize: "md",

  // md 기준 Header metric — ListBox.render.shapes 의 HEADER_HEIGHT/FONT_SIZE 상수와
  // 시각 결과 대칭 (fontSize * 1.75 ≈ 24.5, fontSize * 0.85 ≈ 11.9).
  // sm/lg 는 Phase 3+ 확장 — 현재 md-only.
  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      fontWeight: 700,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 6,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      fontWeight: 700,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      fontWeight: 700,
    },
  },

  // Header 는 정적 텍스트 — hover/pressed/disabled 상태 의미 없음. 빈 states 객체로 선언.
  states: {},

  render: {
    shapes: () => [],
    react: () => ({
      role: "presentation",
    }),
    pixi: () => ({
      eventMode: "passive" as const,
      cursor: "default",
    }),
  },
};
