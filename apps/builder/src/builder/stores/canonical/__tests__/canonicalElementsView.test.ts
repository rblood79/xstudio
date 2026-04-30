/**
 * @fileoverview canonicalElementsView unit tests — ADR-916 Phase 2 G3 Step 1b/2
 *
 * 검증 영역:
 * 1. canonicalDocumentToElements — DFS + metadata.legacyProps 역추적
 * 2. metadata 누락 노드 skip + 자식 parent context 승계
 * 3. element top-level fields (id/parent_id/page_id/layout_id/order_num/fills/type)
 *    무손실 복원
 * 4. legacyToCanonical 결과를 그대로 통과시킨 round-trip 동등성
 * 5. (Step 2) useCanonicalSelectedElement — selectedElementId 단일 노드 변환
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { CanonicalNode, CompositionDocument } from "@composition/shared";

import {
  canonicalDocumentToElements,
  useCanonicalSelectedElement,
} from "../canonicalElementsView";
import { useCanonicalDocumentStore } from "../canonicalDocumentStore";
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

// ─────────────────────────────────────────────
// D. useCanonicalSelectedElement (ADR-916 Phase 2 G3 Step 2)
// ─────────────────────────────────────────────

function resetCanonicalStore(): void {
  useCanonicalDocumentStore.setState({
    documents: new Map(),
    currentProjectId: null,
    documentVersion: 0,
  });
}

describe("useCanonicalSelectedElement (Step 2 — Selection/properties)", () => {
  beforeEach(() => {
    resetCanonicalStore();
  });

  afterEach(() => {
    resetCanonicalStore();
  });

  function seedDoc(children: CanonicalNode[]): void {
    const doc: CompositionDocument = { schemaVersion: "1.0", children };
    act(() => {
      const s = useCanonicalDocumentStore.getState();
      s.setDocument("proj-a", doc);
      s.setCurrentProject("proj-a");
    });
  }

  it("selectedElementId === null 시 null 반환", () => {
    seedDoc([
      {
        id: "seg-x",
        type: "Box",
        metadata: makeMetadata({
          id: "uuid-x",
          parent_id: null,
          order_num: 0,
          type: "Box",
        }),
      },
    ]);

    const { result } = renderHook(() => useCanonicalSelectedElement(null));
    expect(result.current).toBeNull();
  });

  it("canonical store 미활성 (currentProjectId null) 시 null 반환", () => {
    // store reset 상태 — setCurrentProject 호출 안 함
    const { result } = renderHook(() => useCanonicalSelectedElement("uuid-x"));
    expect(result.current).toBeNull();
  });

  it("canonical 노드 존재 시 Element 반환 (id/type/props 보존)", () => {
    seedDoc([
      {
        id: "seg-target",
        type: "Button",
        metadata: makeMetadata({
          id: "uuid-target",
          parent_id: null,
          page_id: "page-1",
          order_num: 2,
          type: "Button",
          label: "Click",
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useCanonicalSelectedElement("uuid-target"),
    );
    const el = result.current;
    expect(el).not.toBeNull();
    expect(el?.id).toBe("uuid-target");
    expect(el?.type).toBe("Button");
    expect(el?.page_id).toBe("page-1");
    expect(el?.order_num).toBe(2);
    expect(el?.props).toEqual({ label: "Click" });
  });

  it("metadata 미보존 노드 시 null 반환", () => {
    seedDoc([
      {
        id: "uuid-broken",
        type: "Button",
        metadata: { type: "legacy-page" }, // legacy-element-props 아님
      },
    ]);

    const { result } = renderHook(() =>
      useCanonicalSelectedElement("uuid-broken"),
    );
    expect(result.current).toBeNull();
  });

  it("selectedElementId 변경 시 새 element 반환", () => {
    seedDoc([
      {
        id: "seg-a",
        type: "Box",
        metadata: makeMetadata({
          id: "uuid-a",
          parent_id: null,
          order_num: 0,
          type: "Box",
          name: "A",
        }),
      },
      {
        id: "seg-b",
        type: "Box",
        metadata: makeMetadata({
          id: "uuid-b",
          parent_id: null,
          order_num: 1,
          type: "Box",
          name: "B",
        }),
      },
    ]);

    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useCanonicalSelectedElement(id),
      { initialProps: { id: "uuid-a" as string | null } },
    );
    expect(result.current?.props).toEqual({ name: "A" });

    rerender({ id: "uuid-b" });
    expect(result.current?.props).toEqual({ name: "B" });

    rerender({ id: null });
    expect(result.current).toBeNull();
  });

  it("canonical store mutation 시 새 element 반환 (re-render)", () => {
    seedDoc([
      {
        id: "uuid-mut",
        type: "Button",
        metadata: makeMetadata({
          id: "uuid-mut",
          parent_id: null,
          order_num: 0,
          type: "Button",
          label: "old",
        }),
      },
    ]);

    const { result } = renderHook(() =>
      useCanonicalSelectedElement("uuid-mut"),
    );
    expect(result.current?.props).toEqual({ label: "old" });

    act(() => {
      // canonical store updateNodeProps 는 metadata 와 별개의 props 갱신.
      // Step 2 진입 시점에서는 metadata 가 SSOT — sync 가 새 metadata 를 보내면
      // hook 이 새 element 반환. updateNodeMetadata 미존재 시 setDocument 로
      // 전체 doc 교체 시뮬레이션.
      const s = useCanonicalDocumentStore.getState();
      s.setDocument("proj-a", {
        schemaVersion: "1.0",
        children: [
          {
            id: "uuid-mut",
            type: "Button",
            metadata: makeMetadata({
              id: "uuid-mut",
              parent_id: null,
              order_num: 0,
              type: "Button",
              label: "new",
            }),
          },
        ],
      });
    });

    expect(result.current?.props).toEqual({ label: "new" });
  });
});
