/**
 * @fileoverview Legacy events/dataBinding round-trip — ADR-916 Phase 5 G7
 *   본격 cutover (2026-05-01)
 *
 * **검증 영역**:
 * - `legacyToCanonical` 가 element.events / element.dataBinding 를
 *   `x-composition` extension 으로 분리 (metadata.legacyProps 미반영)
 * - `exportLegacyDocument` 가 `x-composition` extension 에서 reverse 추출하여
 *   element.events / element.dataBinding 복원 (top-level field 로 분리)
 * - round-trip 정합 (legacy → canonical → legacy 동등)
 * - `buildLegacyElementMetadata` 는 events/dataBinding 미보존 (dual-storage 종결)
 * - undefined / null edge case
 *
 * **G7 본격 cutover framing**:
 * - transition first slice (metadata.legacyProps dual-storage) 종결.
 * - `x-composition` extension namespace 가 events/dataBinding 단일 SSOT.
 * - 본 file 의 검증 = legacy ↔ canonical adapter 영역의 schema 분리 정합.
 *
 * **isolated 분리 사유**: 본 file 은 store import 무경유 (`legacyMetadata.ts` +
 * `exportLegacyDocument.ts` + `index.ts` 의 `legacyToCanonical` 만 import) —
 * vitest mock 함정 영역 외.
 */

import { describe, it, expect } from "vitest";
import type {
  CanonicalNode,
  CompositionDocument,
  CompositionExtension,
} from "@composition/shared";

import { buildLegacyElementMetadata } from "../legacyMetadata";
import { exportLegacyDocument } from "../exportLegacyDocument";
import { legacyToCanonical } from "../index";
import type { LegacyAdapterInput } from "../types";
import type { Element } from "@/types/builder/unified.types";
import type { DataBinding } from "@/types/builder/unified.types";

function makeCanonicalDoc(children: CanonicalNode[]): CompositionDocument {
  return { schemaVersion: "1.0", children };
}

/**
 * legacyToCanonical 호출용 minimal deps stub — convertComponentRole 은 단순 baseline
 * (master/instance 분기 미적용), convertPageLayout 은 null 반환 (page 미사용 시).
 */
const noopDeps = {
  convertComponentRole: () => ({
    reusable: false,
    ref: null,
    descendantsRemapped: undefined,
    rootOverrides: undefined,
  }),
  convertPageLayout: () => null,
};

const TEST_PAGE_ID = "__test_page__";

/**
 * legacyToCanonical 는 elements 를 page_id 기반 grouping → pages 가 비어 있으면
 * element 가 emit 안 됨. test 용 dummy page 로 wrapping 후 첫 page node 의
 * children 으로 element 들이 변환됨.
 */
function buildCanonicalFromElements(elements: Element[]): CompositionDocument {
  const pageIds = new Set<string>();
  const elementsWithPage = elements.map((e) => {
    const pageId = e.page_id ?? TEST_PAGE_ID;
    pageIds.add(pageId);
    return { ...e, page_id: pageId };
  });
  const pages = Array.from(pageIds).map((id) => ({
    id,
    title: id,
    project_id: "test-proj",
    slug: id,
  }));
  const input: LegacyAdapterInput = {
    elements: elementsWithPage,
    pages,
    layouts: [],
  };
  return legacyToCanonical(input, noopDeps);
}

/**
 * dummy page wrapper 안의 첫 element node 추출 (G7 cutover 검증 helper).
 */
function firstElementNode(
  doc: CompositionDocument,
): CanonicalNode & { "x-composition"?: CompositionExtension } {
  const pageNode = doc.children[0];
  const node = pageNode?.children?.[0];
  if (!node) {
    throw new Error("test fixture: page node has no children");
  }
  return node as CanonicalNode & { "x-composition"?: CompositionExtension };
}

// ─────────────────────────────────────────────
// A. legacyToCanonical — events/dataBinding → x-composition extension
// ─────────────────────────────────────────────

describe("legacyToCanonical — G7 cutover events/dataBinding → x-composition extension", () => {
  it("element.events 정의 → 해당 노드 'x-composition'.events 로 분리", () => {
    const element: Element = {
      id: "el-1",
      type: "Button",
      props: { variant: "primary" },
      parent_id: null,
      page_id: null,
      order_num: 0,
      events: [{ id: "evt-1", kind: "onPress" }],
    };

    const doc = buildCanonicalFromElements([element]);
    const node = firstElementNode(doc);
    expect(node["x-composition"]?.events).toEqual([
      { id: "evt-1", kind: "onPress" },
    ]);
    // metadata.legacyProps 에 events 미spread (dual-storage 종결)
    const meta = node.metadata as { legacyProps?: Record<string, unknown> };
    expect(meta.legacyProps).not.toHaveProperty("events");
  });

  it("element.dataBinding 정의 → 해당 노드 'x-composition'.dataBinding 으로 분리", () => {
    const dataBinding: DataBinding = {
      type: "collection",
      source: "supabase",
      config: { table: "users" },
    };
    const element: Element = {
      id: "el-2",
      type: "ListBox",
      props: { variant: "default" },
      parent_id: null,
      page_id: null,
      order_num: 0,
      dataBinding,
    };

    const doc = buildCanonicalFromElements([element]);
    const node = firstElementNode(doc);
    expect(node["x-composition"]?.dataBinding).toEqual(dataBinding);
    const meta = node.metadata as { legacyProps?: Record<string, unknown> };
    expect(meta.legacyProps).not.toHaveProperty("dataBinding");
  });

  it("events / dataBinding 양쪽 동시 정의 → extension 동시 분리", () => {
    const element: Element = {
      id: "el-3",
      type: "Button",
      props: {},
      parent_id: null,
      page_id: null,
      order_num: 0,
      events: [{ id: "e1", kind: "onPress" }],
      dataBinding: {
        type: "value",
        source: "state",
        config: { key: "count" },
      },
    };

    const doc = buildCanonicalFromElements([element]);
    const node = firstElementNode(doc);
    expect(node["x-composition"]?.events).toEqual([
      { id: "e1", kind: "onPress" },
    ]);
    expect(node["x-composition"]?.dataBinding).toEqual({
      type: "value",
      source: "state",
      config: { key: "count" },
    });
  });

  it("events / dataBinding 미정의 → 'x-composition' field 자체 노출 안 함", () => {
    const element: Element = {
      id: "el-4",
      type: "Button",
      props: {},
      parent_id: null,
      page_id: null,
      order_num: 0,
    };

    const doc = buildCanonicalFromElements([element]);
    const node = firstElementNode(doc);
    expect(node["x-composition"]).toBeUndefined();
  });

  it("빈 배열 events 는 extension 미노출 (length === 0 skip)", () => {
    const element: Element = {
      id: "el-5",
      type: "Button",
      props: {},
      parent_id: null,
      page_id: null,
      order_num: 0,
      events: [],
    };

    const doc = buildCanonicalFromElements([element]);
    const node = firstElementNode(doc);
    expect(node["x-composition"]?.events).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// B. buildLegacyElementMetadata — events/dataBinding 미보존 (dual-storage 종결)
// ─────────────────────────────────────────────

describe("buildLegacyElementMetadata — G7 cutover dual-storage 종결", () => {
  it("element.events 정의해도 metadata.legacyProps 에 events 키 미노출", () => {
    const element: Element = {
      id: "el-1",
      type: "Button",
      props: { variant: "primary" },
      events: [{ id: "evt-1", kind: "onPress" }],
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps).not.toHaveProperty("events");
  });

  it("element.dataBinding 정의해도 metadata.legacyProps 에 dataBinding 키 미노출", () => {
    const element: Element = {
      id: "el-2",
      type: "ListBox",
      props: {},
      dataBinding: {
        type: "collection",
        source: "supabase",
        config: { table: "users" },
      },
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps).not.toHaveProperty("dataBinding");
  });

  it("element.props 의 events/dataBinding 키는 spread 그대로 보존 (top-level 만 분리)", () => {
    const element: Element = {
      id: "el-3",
      type: "Button",
      props: {
        events: [{ id: "props-evt", kind: "onPress" }],
        dataBinding: { type: "static", source: "static", config: {} },
      },
      events: [{ id: "top-evt", kind: "onClick" }],
    };

    const metadata = buildLegacyElementMetadata(element);
    // props.events 는 metadata.legacyProps 에 그대로 (top-level events 영향 무관)
    expect(metadata.legacyProps.events).toEqual([
      { id: "props-evt", kind: "onPress" },
    ]);
    expect(metadata.legacyProps.dataBinding).toEqual({
      type: "static",
      source: "static",
      config: {},
    });
  });
});

// ─────────────────────────────────────────────
// C. exportLegacyDocument — x-composition extension reverse
// ─────────────────────────────────────────────

describe("exportLegacyDocument — G7 cutover extension reverse", () => {
  it("'x-composition'.events 보존된 노드 → element.events 복원", () => {
    const doc = makeCanonicalDoc([
      {
        id: "seg-1",
        type: "Button",
        metadata: {
          type: "legacy-element-props",
          legacyProps: {
            id: "uuid-1",
            parent_id: null,
            page_id: "page-1",
            order_num: 0,
            type: "Button",
          },
        },
        "x-composition": {
          events: [{ id: "evt-1", kind: "onPress" }],
        },
      } as CanonicalNode,
    ]);

    const elements = exportLegacyDocument(doc);
    expect(elements).toHaveLength(1);
    expect(elements[0].events).toEqual([{ id: "evt-1", kind: "onPress" }]);
    // props 에 events 미잔존
    expect(elements[0].props).not.toHaveProperty("events");
  });

  it("'x-composition'.dataBinding 보존된 노드 → element.dataBinding 복원", () => {
    const doc = makeCanonicalDoc([
      {
        id: "seg-2",
        type: "ListBox",
        metadata: {
          type: "legacy-element-props",
          legacyProps: {
            id: "uuid-2",
            parent_id: null,
            page_id: "page-1",
            order_num: 0,
            type: "ListBox",
          },
        },
        "x-composition": {
          dataBinding: {
            type: "collection",
            source: "supabase",
            config: { table: "users" },
          },
        },
      } as CanonicalNode,
    ]);

    const [el] = exportLegacyDocument(doc);
    expect(el.dataBinding).toEqual({
      type: "collection",
      source: "supabase",
      config: { table: "users" },
    });
    expect(el.props).not.toHaveProperty("dataBinding");
  });

  it("extension 미정의 노드 → element 에 events/dataBinding 미정의", () => {
    const doc = makeCanonicalDoc([
      {
        id: "seg-3",
        type: "Button",
        metadata: {
          type: "legacy-element-props",
          legacyProps: {
            id: "uuid-3",
            parent_id: null,
            order_num: 0,
            type: "Button",
          },
        },
      },
    ]);

    const [el] = exportLegacyDocument(doc);
    expect(el.events).toBeUndefined();
    expect(el.dataBinding).toBeUndefined();
  });

  it("legacyProps.events / legacyProps.dataBinding 가 (transition 잔여 상태로) 있어도 extension 우선 — extension 미정의 시 props 로 잔존", () => {
    // G7 본격 cutover 후에는 buildLegacyElementMetadata 가 events/dataBinding 을
    // metadata.legacyProps 에 넣지 않는다. 그러나 legacy fixture / 외부 입력이
    // legacyProps 에 events/dataBinding 을 넣고 들어오면, extractLegacyElement 는
    // 이를 props 로 쓸어 담는다 (extension 우선 contract). 본 test 는 contract 명시.
    const doc = makeCanonicalDoc([
      {
        id: "seg-4",
        type: "Button",
        metadata: {
          type: "legacy-element-props",
          legacyProps: {
            id: "uuid-4",
            parent_id: null,
            order_num: 0,
            type: "Button",
            events: [{ id: "stale-evt", kind: "onPress" }],
          },
        },
      } as CanonicalNode,
    ]);

    const [el] = exportLegacyDocument(doc);
    // top-level events 는 미설정 (extension 미정의)
    expect(el.events).toBeUndefined();
    // legacyProps.events 는 props 로 잔존 (transition 잔여 호환)
    expect(el.props.events).toEqual([{ id: "stale-evt", kind: "onPress" }]);
  });
});

// ─────────────────────────────────────────────
// D. round-trip 정합 (legacy → canonical → legacy 동등)
// ─────────────────────────────────────────────

describe("Round-trip — legacy → canonical (extension) → legacy 동등", () => {
  it("Button + events round-trip 동등", () => {
    const original: Element = {
      id: "el-rt-1",
      type: "Button",
      props: { variant: "primary", children: "Click" },
      parent_id: null,
      page_id: "page-1",
      order_num: 5,
      events: [{ id: "evt-rt", kind: "onPress" }],
    };

    const doc = buildCanonicalFromElements([original]);
    const [restored] = exportLegacyDocument(doc);
    expect(restored.id).toBe(original.id);
    expect(restored.type).toBe(original.type);
    expect(restored.props).toEqual(original.props);
    expect(restored.parent_id).toBe(original.parent_id);
    expect(restored.page_id).toBe(original.page_id);
    expect(restored.order_num).toBe(original.order_num);
    expect(restored.events).toEqual(original.events);
    // props 에 events 누락 (extension 으로 분리됨)
    expect(restored.props).not.toHaveProperty("events");
  });

  it("ListBox + dataBinding round-trip 동등", () => {
    const original: Element = {
      id: "el-rt-2",
      type: "ListBox",
      props: { variant: "default" },
      parent_id: null,
      page_id: "page-1",
      order_num: 0,
      dataBinding: {
        type: "collection",
        source: "supabase",
        config: { table: "items", limit: 50 },
      },
    };

    const doc = buildCanonicalFromElements([original]);
    const [restored] = exportLegacyDocument(doc);
    expect(restored.dataBinding).toEqual(original.dataBinding);
    expect(restored.props).not.toHaveProperty("dataBinding");
  });

  it("events + dataBinding 동시 round-trip 동등", () => {
    const original: Element = {
      id: "el-rt-3",
      type: "Button",
      props: { variant: "primary" },
      parent_id: null,
      page_id: null,
      order_num: 0,
      events: [
        { id: "e1", kind: "onPress" },
        { id: "e2", kind: "onHover" },
      ],
      dataBinding: {
        type: "value",
        source: "state",
        config: { key: "count" },
      },
    };

    const doc = buildCanonicalFromElements([original]);
    const [restored] = exportLegacyDocument(doc);
    expect(restored.events).toEqual(original.events);
    expect(restored.dataBinding).toEqual(original.dataBinding);
    expect(restored.props).toEqual({ variant: "primary" });
  });

  it("events/dataBinding 미정의 element round-trip — restored 도 미정의", () => {
    const original: Element = {
      id: "el-rt-4",
      type: "Box",
      props: { name: "container" },
      parent_id: null,
      page_id: null,
      order_num: 0,
    };

    const doc = buildCanonicalFromElements([original]);
    const [restored] = exportLegacyDocument(doc);
    expect(restored.events).toBeUndefined();
    expect(restored.dataBinding).toBeUndefined();
  });

  it("element.props.events 와 top-level events 공존 — props.events 보존 + top-level 우선 분리", () => {
    const original: Element = {
      id: "el-rt-5",
      type: "Button",
      props: {
        variant: "primary",
        events: [{ id: "props-evt", kind: "onPress" }],
      },
      parent_id: null,
      page_id: null,
      order_num: 0,
      events: [{ id: "top-evt", kind: "onClick" }],
    };

    const doc = buildCanonicalFromElements([original]);
    const [restored] = exportLegacyDocument(doc);
    // top-level events = extension 으로 분리 후 복원
    expect(restored.events).toEqual([{ id: "top-evt", kind: "onClick" }]);
    // props.events 는 metadata.legacyProps 통해 복원
    expect(restored.props.events).toEqual([
      { id: "props-evt", kind: "onPress" },
    ]);
  });
});
