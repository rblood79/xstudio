/**
 * @fileoverview Legacy events/dataBinding round-trip — ADR-916 Phase 5 G7
 *   transition first slice (2026-05-01)
 *
 * **검증 영역**:
 * - `buildLegacyElementMetadata` 가 element.events / element.dataBinding 를
 *   metadata.legacyProps 에 보존
 * - `extractLegacyElement` (exportLegacyDocument 경유) 가 reverse 변환 시
 *   element.events / element.dataBinding 복원
 * - round-trip 정합 (legacy → metadata → legacy 동등)
 * - undefined / null edge case (top-level field 미정의 시 spread 회피)
 *
 * **transition framing**:
 * - 본 단계 = metadata.legacyProps dual-storage (events/dataBinding 가 7
 *   top-level field 와 함께 보존)
 * - G7 본격 cutover 시점 = `x-composition` extension 으로 이전, metadata.legacyProps
 *   에서 events/dataBinding 제거 (별 sub-phase)
 *
 * **isolated 분리 사유**: 본 file 은 store import 무경유 (legacyMetadata.ts +
 * exportLegacyDocument.ts 만 import) — vitest mock 함정 영역 외.
 */

import { describe, it, expect } from "vitest";
import type { CanonicalNode, CompositionDocument } from "@composition/shared";

import { buildLegacyElementMetadata } from "../legacyMetadata";
import { exportLegacyDocument } from "../exportLegacyDocument";
import type { Element } from "@/types/builder/unified.types";
import type { DataBinding } from "@/types/builder/unified.types";

function makeCanonicalDoc(children: CanonicalNode[]): CompositionDocument {
  return { schemaVersion: "1.0", children };
}

// ─────────────────────────────────────────────
// A. buildLegacyElementMetadata — events/dataBinding 보존
// ─────────────────────────────────────────────

describe("buildLegacyElementMetadata — G7 transition events/dataBinding 보존", () => {
  it("element.events 보존 — top-level events 가 metadata.legacyProps.events 로 spread", () => {
    const element: Element = {
      id: "el-1",
      type: "Button",
      props: { variant: "primary" },
      events: [{ id: "evt-1", kind: "onPress" }],
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps.events).toEqual([
      { id: "evt-1", kind: "onPress" },
    ]);
  });

  it("element.dataBinding 보존 — top-level dataBinding 이 metadata.legacyProps.dataBinding 으로 spread", () => {
    const dataBinding: DataBinding = {
      type: "collection",
      source: "supabase",
      config: { table: "users" },
    };
    const element: Element = {
      id: "el-2",
      type: "ListBox",
      props: { variant: "default" },
      dataBinding,
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps.dataBinding).toEqual(dataBinding);
  });

  it("events / dataBinding 양쪽 동시 보존", () => {
    const element: Element = {
      id: "el-3",
      type: "Button",
      props: {},
      events: [{ id: "e1", kind: "onPress" }],
      dataBinding: {
        type: "value",
        source: "state",
        config: { key: "count" },
      },
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps.events).toEqual([
      { id: "e1", kind: "onPress" },
    ]);
    expect(metadata.legacyProps.dataBinding).toEqual({
      type: "value",
      source: "state",
      config: { key: "count" },
    });
  });

  it("undefined events/dataBinding 미spread — undefined 키 노출 회피", () => {
    const element: Element = {
      id: "el-4",
      type: "Button",
      props: {},
      // events / dataBinding 미정의
    };

    const metadata = buildLegacyElementMetadata(element);
    expect(metadata.legacyProps).not.toHaveProperty("events");
    expect(metadata.legacyProps).not.toHaveProperty("dataBinding");
  });

  it("element.props.events / props.dataBinding 도 spread 우선순위 — top-level 이 props 동명 키 덮어씀", () => {
    const element: Element = {
      id: "el-5",
      type: "Button",
      props: {
        events: [{ id: "props-evt", kind: "onPress" }],
        dataBinding: { type: "static", source: "static", config: {} },
      },
      events: [{ id: "top-evt", kind: "onClick" }],
      dataBinding: {
        type: "collection",
        source: "supabase",
        config: { table: "items" },
      },
    };

    const metadata = buildLegacyElementMetadata(element);
    // top-level 이 우선 (spread 순서: ...props 먼저 → top-level 덮어씀)
    expect(metadata.legacyProps.events).toEqual([
      { id: "top-evt", kind: "onClick" },
    ]);
    expect(metadata.legacyProps.dataBinding).toEqual({
      type: "collection",
      source: "supabase",
      config: { table: "items" },
    });
  });
});

// ─────────────────────────────────────────────
// B. exportLegacyDocument — events/dataBinding 복원
// ─────────────────────────────────────────────

describe("exportLegacyDocument — G7 transition events/dataBinding reverse", () => {
  it("metadata.legacyProps.events 보존된 노드 → element.events 복원", () => {
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
            events: [{ id: "evt-1", kind: "onPress" }],
          },
        },
      },
    ]);

    const elements = exportLegacyDocument(doc);
    expect(elements).toHaveLength(1);
    expect(elements[0].events).toEqual([{ id: "evt-1", kind: "onPress" }]);
  });

  it("metadata.legacyProps.dataBinding 보존된 노드 → element.dataBinding 복원", () => {
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
            dataBinding: {
              type: "collection",
              source: "supabase",
              config: { table: "users" },
            },
          },
        },
      },
    ]);

    const [el] = exportLegacyDocument(doc);
    expect(el.dataBinding).toEqual({
      type: "collection",
      source: "supabase",
      config: { table: "users" },
    });
  });

  it("events/dataBinding 미보존 노드 → element 에 events/dataBinding 미정의", () => {
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

  it("element.props 에 events/dataBinding key 남지 않음 — top-level 분리", () => {
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
            variant: "primary",
            events: [{ id: "e1", kind: "onPress" }],
            dataBinding: { type: "value", source: "state", config: {} },
          },
        },
      },
    ]);

    const [el] = exportLegacyDocument(doc);
    expect(el.events).toBeDefined();
    expect(el.dataBinding).toBeDefined();
    // props 에는 variant 만, events/dataBinding 은 top-level 로 분리됨
    expect(el.props).toEqual({ variant: "primary" });
    expect(el.props).not.toHaveProperty("events");
    expect(el.props).not.toHaveProperty("dataBinding");
  });
});

// ─────────────────────────────────────────────
// C. round-trip 정합 (legacy → metadata → legacy 동등)
// ─────────────────────────────────────────────

describe("Round-trip — legacy element → metadata.legacyProps → element 동등", () => {
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

    const metadata = buildLegacyElementMetadata(original);
    const doc = makeCanonicalDoc([
      {
        id: "seg-rt-1",
        type: "Button",
        metadata,
      },
    ]);

    const [restored] = exportLegacyDocument(doc);
    expect(restored.id).toBe(original.id);
    expect(restored.type).toBe(original.type);
    expect(restored.props).toEqual(original.props);
    expect(restored.parent_id).toBe(original.parent_id);
    expect(restored.page_id).toBe(original.page_id);
    expect(restored.order_num).toBe(original.order_num);
    expect(restored.events).toEqual(original.events);
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

    const metadata = buildLegacyElementMetadata(original);
    const doc = makeCanonicalDoc([
      {
        id: "seg-rt-2",
        type: "ListBox",
        metadata,
      },
    ]);

    const [restored] = exportLegacyDocument(doc);
    expect(restored.dataBinding).toEqual(original.dataBinding);
  });

  it("events + dataBinding 동시 round-trip 동등", () => {
    const original: Element = {
      id: "el-rt-3",
      type: "Button",
      props: { variant: "primary" },
      parent_id: null,
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

    const metadata = buildLegacyElementMetadata(original);
    const doc = makeCanonicalDoc([
      {
        id: "seg-rt-3",
        type: "Button",
        metadata,
      },
    ]);

    const [restored] = exportLegacyDocument(doc);
    expect(restored.events).toEqual(original.events);
    expect(restored.dataBinding).toEqual(original.dataBinding);
    // props 에 events/dataBinding 누락 (top-level 로 분리됨)
    expect(restored.props).toEqual({ variant: "primary" });
  });

  it("events/dataBinding 미정의 element round-trip — restored 도 미정의", () => {
    const original: Element = {
      id: "el-rt-4",
      type: "Box",
      props: { name: "container" },
      parent_id: null,
      order_num: 0,
    };

    const metadata = buildLegacyElementMetadata(original);
    const doc = makeCanonicalDoc([
      {
        id: "seg-rt-4",
        type: "Box",
        metadata,
      },
    ]);

    const [restored] = exportLegacyDocument(doc);
    expect(restored.events).toBeUndefined();
    expect(restored.dataBinding).toBeUndefined();
  });
});
