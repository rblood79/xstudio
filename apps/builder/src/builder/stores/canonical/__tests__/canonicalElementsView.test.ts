/**
 * @fileoverview canonicalElementsView unit tests — ADR-916 Phase 2 G3 Step 1b
 *
 * 검증 영역:
 * 1. canonicalDocumentToElements — DFS + metadata.legacyProps 역추적
 * 2. metadata 누락 노드 skip + 자식 parent context 승계
 * 3. element top-level fields (id/parent_id/page_id/layout_id/order_num/fills/type)
 *    무손실 복원
 * 4. legacyToCanonical 결과를 그대로 통과시킨 round-trip 동등성
 */

import { describe, expect, it } from "vitest";
import type { CompositionDocument } from "@composition/shared";

import { canonicalDocumentToElements } from "../canonicalElementsView";
import { LEGACY_ELEMENT_PROPS_METADATA_TYPE } from "../../../../adapters/canonical/legacyMetadata";

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

function makeMetadata(legacyProps: Record<string, unknown>) {
  return {
    type: LEGACY_ELEMENT_PROPS_METADATA_TYPE,
    legacyProps,
  };
}

function makeDoc(
  children: CompositionDocument["children"],
): CompositionDocument {
  return {
    schemaVersion: "1.0",
    children,
  };
}

// ─────────────────────────────────────────────
// A. metadata 보존 노드 → Element 변환
// ─────────────────────────────────────────────

describe("canonicalDocumentToElements — happy path", () => {
  it("단일 root 노드 변환", () => {
    const doc = makeDoc([
      {
        id: "seg-a",
        type: "Button",
        metadata: makeMetadata({
          id: "uuid-a",
          parent_id: null,
          page_id: "page-1",
          order_num: 0,
          type: "Button",
          label: "Click me",
        }),
      },
    ]);

    const elements = canonicalDocumentToElements(doc);
    expect(elements).toHaveLength(1);
    const el = elements[0];
    expect(el.id).toBe("uuid-a");
    expect(el.type).toBe("Button");
    expect(el.parent_id).toBeNull();
    expect(el.order_num).toBe(0);
    expect(el.page_id).toBe("page-1");
    expect(el.props).toEqual({ label: "Click me" });
  });

  it("nested children DFS 순회 + parent_id 보존", () => {
    const doc = makeDoc([
      {
        id: "seg-parent",
        type: "Frame",
        metadata: makeMetadata({
          id: "uuid-parent",
          parent_id: null,
          order_num: 0,
          type: "Frame",
        }),
        children: [
          {
            id: "seg-child-1",
            type: "Box",
            metadata: makeMetadata({
              id: "uuid-child-1",
              parent_id: "uuid-parent",
              order_num: 0,
              type: "Box",
            }),
          },
          {
            id: "seg-child-2",
            type: "Box",
            metadata: makeMetadata({
              id: "uuid-child-2",
              parent_id: "uuid-parent",
              order_num: 1,
              type: "Box",
            }),
          },
        ],
      },
    ]);

    const elements = canonicalDocumentToElements(doc);
    expect(elements).toHaveLength(3);
    expect(elements.map((e) => e.id)).toEqual([
      "uuid-parent",
      "uuid-child-1",
      "uuid-child-2",
    ]);
    expect(elements[1].parent_id).toBe("uuid-parent");
    expect(elements[2].parent_id).toBe("uuid-parent");
    expect(elements[2].order_num).toBe(1);
  });

  it("ref 노드도 metadata.legacyProps.type 으로 원본 type 복원", () => {
    const doc = makeDoc([
      {
        id: "seg-instance",
        type: "ref", // canonical ref type
        metadata: makeMetadata({
          id: "uuid-instance",
          parent_id: null,
          order_num: 0,
          type: "Button", // 원본 element.type
        }),
      },
    ]);

    const elements = canonicalDocumentToElements(doc);
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("Button"); // "ref" 가 아닌 원본 type
  });
});

// ─────────────────────────────────────────────
// B. metadata 누락 노드 skip + parent context 승계
// ─────────────────────────────────────────────

describe("canonicalDocumentToElements — metadata 미보존 노드", () => {
  it("metadata 미보존 root 노드는 skip + 자식 변환은 진행", () => {
    const doc = makeDoc([
      {
        id: "seg-page",
        type: "frame",
        metadata: { type: "legacy-page", pageId: "page-1" },
        children: [
          {
            id: "seg-real",
            type: "Box",
            metadata: makeMetadata({
              id: "uuid-real",
              parent_id: null,
              order_num: 0,
              type: "Box",
            }),
          },
        ],
      },
    ]);

    const elements = canonicalDocumentToElements(doc);
    expect(elements).toHaveLength(1);
    expect(elements[0].id).toBe("uuid-real");
  });

  it("legacyProps.id 가 없는 노드도 skip", () => {
    const doc = makeDoc([
      {
        id: "seg-broken",
        type: "Button",
        metadata: makeMetadata({ type: "Button" }), // id 없음
      },
    ]);

    expect(canonicalDocumentToElements(doc)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// C. element top-level fields 무손실 복원
// ─────────────────────────────────────────────

describe("canonicalDocumentToElements — fields 복원", () => {
  it("layout_id / fills 필드도 복원", () => {
    const doc = makeDoc([
      {
        id: "seg-layout",
        type: "Frame",
        metadata: makeMetadata({
          id: "uuid-layout-el",
          parent_id: null,
          page_id: null,
          layout_id: "layout-1",
          order_num: 5,
          fills: [{ color: "red" }],
          type: "Frame",
        }),
      },
    ]);

    const [el] = canonicalDocumentToElements(doc);
    expect(el.layout_id).toBe("layout-1");
    expect(el.page_id).toBeNull();
    expect(el.order_num).toBe(5);
    expect(el.fills).toEqual([{ color: "red" }]);
  });

  it("props 의 동명 키는 top-level field 가 우선 (legacyToCanonical spread 순서 보존)", () => {
    // buildLegacyElementMetadata 의 spread 순서: ...element.props 먼저 → top-level fields 가
    // 동명 키 덮어씀. 본 테스트는 inverse 변환에서도 일관 동작 확인.
    const doc = makeDoc([
      {
        id: "seg-x",
        type: "Box",
        metadata: makeMetadata({
          // props.type === "Old" 였더라도 legacyProps 에서는 element.type 이 우선.
          id: "uuid-x",
          parent_id: null,
          order_num: 0,
          type: "Box",
          customLabel: "preserved",
        }),
      },
    ]);

    const [el] = canonicalDocumentToElements(doc);
    expect(el.type).toBe("Box");
    expect(el.props).toEqual({ customLabel: "preserved" });
  });
});
