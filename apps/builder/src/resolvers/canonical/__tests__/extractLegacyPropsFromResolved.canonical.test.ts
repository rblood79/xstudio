/**
 * @fileoverview extractLegacyPropsFromResolved canonical primary fallback —
 *   ADR-916 G6-2 Preview parity (2026-05-01)
 *
 * **isolated 분리 사유**: `storeBridge.test.ts` 가 `apps/builder/src/builder/stores/index.ts`
 * import chain 에서 vitest mock path resolution pre-existing setup fail 영역
 * (`createElementsSlice is not a function` — Step 1b 시점부터 6 fail 중 일부).
 * 본 file 은 `extractLegacyPropsFromResolved` + `ResolvedNode` 만 import 해서
 * setup chain 우회. memory 패턴: "test 를 source 와 같은 __tests__/ 디렉토리 +
 * 명시 mock (importOriginal+spread 미사용) 으로 우회".
 *
 * **검증 영역 (G6-2)**:
 * - canonical primary fallback (resolved.props 직접 사용)
 * - 우선순위 — legacy adapter > ref-resolve > canonical primary
 * - shallow copy 격리 (caller mutation 이 ResolvedNode 영향 없음)
 */

import { describe, it, expect } from "vitest";
import type { ResolvedNode } from "@composition/shared";

// extractLegacyProps.ts 직접 import — storeBridge 의 store import chain 우회.
import { extractLegacyPropsFromResolved } from "../extractLegacyProps";

describe("extractLegacyPropsFromResolved — canonical primary fallback (G6-2)", () => {
  it("TC9: metadata 없고 resolved.props 있음 — props 직접 반환 (canonical primary fallback)", () => {
    const node: ResolvedNode = {
      id: "canonical-btn",
      type: "Button",
      props: { variant: "primary", children: "Click me" },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ variant: "primary", children: "Click me" });
    // shallow copy 검증 — caller 변경이 ResolvedNode.props 에 영향 없음
    expect(props).not.toBe(node.props);
  });

  it("TC10: metadata 가 type 키만 있고 resolved.props 있음 — props fallback 진입", () => {
    const node: ResolvedNode = {
      id: "canonical-btn",
      type: "Button",
      metadata: { type: "legacy-element-props" }, // type 외 키 없음
      props: { variant: "primary", size: "md" },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ variant: "primary", size: "md" });
  });

  it("TC11: legacy adapter 우선순위 — metadata.legacyProps 가 resolved.props 보다 우선", () => {
    const node: ResolvedNode = {
      id: "n1",
      type: "Button",
      metadata: {
        type: "legacy-element-props",
        legacyProps: { label: "legacy" },
      },
      props: { label: "canonical" },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ label: "legacy" });
  });

  it("TC12: ref-resolve 우선순위 — metadata spread 가 resolved.props 보다 우선", () => {
    const node: ResolvedNode = {
      id: "n1",
      type: "Button",
      metadata: { type: "legacy-element-props", label: "ref-resolved" },
      props: { label: "canonical" },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ label: "ref-resolved" });
  });

  it("TC13: 모두 없음 — 빈 객체 (회귀 — 기존 TC7 동일 동작 보존)", () => {
    const node: ResolvedNode = { id: "n1", type: "Button" };
    expect(extractLegacyPropsFromResolved(node)).toEqual({});
  });

  // ────────────────────────────────────────────────────────────────────
  // G6-1 second work fallback 와의 정합 evidence
  // ────────────────────────────────────────────────────────────────────
  //
  // CanonicalNode → Element (G6-1 fallback) 와 ResolvedNode → legacy props
  // (G6-2 fallback) 가 동일 canonical primary 모드에서 정합 동작 evidence.
  // ResolvedNode 는 CanonicalNode 를 상속하므로, canonical primary write 결과
  // 가 resolver 통과 후에도 metadata.legacyProps 없이 props 를 보존해야 함.

  it("TC14: G6-1 fallback 정합 — Button canonical primary node 가 ResolvedNode 통과 후에도 props 보존", () => {
    // Button canonical primary write 결과 시뮬레이션 (G6-1 second work)
    const buttonProps = { variant: "primary", children: "Click", size: "md" };
    const node: ResolvedNode = {
      id: "canonical-btn-1",
      type: "Button",
      props: buttonProps,
    };

    const extracted = extractLegacyPropsFromResolved(node);
    expect(extracted).toEqual(buttonProps);
  });

  it("TC15: G6-1 fallback 정합 — TextField canonical primary 정합", () => {
    const tfProps = {
      label: "Email",
      placeholder: "you@example.com",
      size: "md",
    };
    const node: ResolvedNode = {
      id: "canonical-tf-1",
      type: "TextField",
      props: tfProps,
    };

    expect(extractLegacyPropsFromResolved(node)).toEqual(tfProps);
  });

  it("TC16: G6-1 fallback 정합 — Section canonical primary 정합", () => {
    const sectionProps = { variant: "default" };
    const node: ResolvedNode = {
      id: "canonical-sec-1",
      type: "Section",
      props: sectionProps,
    };

    expect(extractLegacyPropsFromResolved(node)).toEqual(sectionProps);
  });
});
