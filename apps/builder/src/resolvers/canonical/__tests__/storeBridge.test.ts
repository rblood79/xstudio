/**
 * @fileoverview storeBridge helper 단위 테스트 — ADR-903 P2 D-B
 *
 * 검증 대상:
 * - `selectResolvedTree(state, pages, layouts, cache?)` — store snapshot 진입점
 * - `buildResolvedNodeIndex(tree)` — DFS flatten Map
 * - `extractLegacyPropsFromResolved(resolved)` — 두 metadata 패턴 대응
 * - `resolveInstanceWithSharedCache(instance, master, cache?)` — mini-doc + cache 통과한
 *   Element 재구성 — legacy `resolveInstanceElement` 와 시각 등가성 보장
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { Element, Page } from "@/types/builder/unified.types";
import type { Layout } from "@/types/builder/layout.types";
import type { ElementsState } from "@/builder/stores/elements";
import type { CanonicalNode, RefNode, ResolvedNode } from "@composition/shared";

import { resolveInstanceElement } from "@/utils/component/instanceResolver";
import {
  buildResolvedNodeIndex,
  extractLegacyPropsFromResolved,
  resolveInstanceWithSharedCache,
  selectResolvedTree,
} from "../storeBridge";
import {
  createResolverCache,
  resetSharedResolverCache,
  getSharedResolverCache,
} from "../cache";

// ─────────────────────────────────────────────────────────────────────────────
// fixture helpers (integration.test.ts 패턴 공유)
// ─────────────────────────────────────────────────────────────────────────────

function el(partial: Partial<Element> & Pick<Element, "id" | "tag">): Element {
  return {
    props: {},
    parent_id: null,
    order_num: 0,
    ...partial,
  } as Element;
}

function makeState(elements: Element[], pages: Page[]): ElementsState {
  const elementsMap = new Map<string, Element>();
  for (const e of elements) elementsMap.set(e.id, e);
  return {
    elements,
    elementsMap,
    pages,
  } as unknown as ElementsState;
}

// ─────────────────────────────────────────────────────────────────────────────
// selectResolvedTree
// ─────────────────────────────────────────────────────────────────────────────

describe("selectResolvedTree", () => {
  beforeEach(() => {
    resetSharedResolverCache();
  });

  it("TC1: master + instance legacy → ResolvedNode[] (instance 는 _resolvedFrom 세팅)", () => {
    // P1 adapter (idPath.ts) 는 element 의 customId/componentName/tag 기반으로
    // segId 를 생성하므로, 명시적 customId 를 부여하여 stable lookup 을 보장한다.
    const elements: Element[] = [
      el({
        id: "master-btn",
        tag: "Button",
        componentRole: "master",
        customId: "MasterBtn",
        props: { label: "Submit", color: "blue" },
      }),
      el({
        id: "instance-btn",
        tag: "Button",
        componentRole: "instance",
        masterId: "master-btn",
        customId: "InstanceBtn",
        page_id: "P1",
        overrides: { label: "Send" },
      }),
    ];
    const pages: Page[] = [
      { id: "P1", title: "Home", slug: "/", project_id: "proj-1" } as Page,
    ];
    const layouts: Layout[] = [];

    const cache = createResolverCache();
    const tree = selectResolvedTree(
      makeState(elements, pages),
      pages,
      layouts,
      cache,
    );

    // top-level: reusable master 1+ 개 + pageNodes — reusable 노드 존재 확인
    const reusableNodes = tree.filter((n) => n.reusable === true);
    expect(reusableNodes.length).toBeGreaterThanOrEqual(1);

    // instance 의 segId 는 customId 기반 ("InstanceBtn") — DFS index 로 lookup
    const index = buildResolvedNodeIndex(tree);
    const instanceResolved = index.get("InstanceBtn");
    expect(instanceResolved).toBeDefined();
    // _resolvedFrom 은 ref 의 stable id path (customId "MasterBtn")
    expect(instanceResolved?._resolvedFrom).toBe("MasterBtn");
  });

  it("TC2: 동일 state 에 대한 반복 호출은 shared cache 로 ref subtree hit 보장", () => {
    const elements: Element[] = [
      el({
        id: "master-A",
        tag: "Button",
        componentRole: "master",
        props: { label: "A" },
      }),
      el({
        id: "inst-A1",
        tag: "Button",
        componentRole: "instance",
        masterId: "master-A",
        page_id: "P1",
      }),
      el({
        id: "inst-A2",
        tag: "Button",
        componentRole: "instance",
        masterId: "master-A",
        page_id: "P1",
      }),
    ];
    const pages: Page[] = [
      { id: "P1", title: "Home", slug: "/", project_id: "proj-1" } as Page,
    ];

    const cache = createResolverCache();
    const state = makeState(elements, pages);

    const before = cache.stats();
    expect(before.hits).toBe(0);

    selectResolvedTree(state, pages, [], cache);
    const afterFirst = cache.stats();
    expect(afterFirst.misses).toBeGreaterThan(0);
    expect(afterFirst.size).toBeGreaterThan(0);

    selectResolvedTree(state, pages, [], cache);
    const afterSecond = cache.stats();
    // 2 번째 호출은 동일 ref subtree 에 대해 hit 발생
    expect(afterSecond.hits).toBeGreaterThan(afterFirst.hits);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildResolvedNodeIndex
// ─────────────────────────────────────────────────────────────────────────────

describe("buildResolvedNodeIndex", () => {
  it("TC3: 중첩 트리 DFS flatten — 모든 id 가 index 에 등록됨", () => {
    const tree: ResolvedNode[] = [
      {
        id: "root",
        type: "frame",
        children: [
          {
            id: "child-A",
            type: "Button",
            children: [{ id: "grand-1", type: "Text" }],
          },
          { id: "child-B", type: "Button" },
        ],
      },
    ];

    const index = buildResolvedNodeIndex(tree);

    expect(index.size).toBe(4);
    expect(index.get("root")?.type).toBe("frame");
    expect(index.get("child-A")?.type).toBe("Button");
    expect(index.get("grand-1")?.type).toBe("Text");
    expect(index.get("child-B")?.type).toBe("Button");
  });

  it("TC4: children 없는 노드도 정상 처리", () => {
    const tree: ResolvedNode[] = [{ id: "solo", type: "Text" }];
    const index = buildResolvedNodeIndex(tree);
    expect(index.size).toBe(1);
    expect(index.get("solo")?.type).toBe("Text");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractLegacyPropsFromResolved
// ─────────────────────────────────────────────────────────────────────────────

describe("extractLegacyPropsFromResolved", () => {
  it("TC5: metadata.legacyProps 필드 존재 — 그 값을 그대로 반환 (adapter / descendants mode A 패턴)", () => {
    const node: ResolvedNode = {
      id: "n1",
      type: "Button",
      metadata: {
        type: "legacy-element-props",
        legacyProps: { label: "Hello", color: "red" },
      },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ label: "Hello", color: "red" });
  });

  it("TC6: metadata 에 type + spread props 패턴 (ref-resolve) — type 제외 나머지 반환", () => {
    const node: ResolvedNode = {
      id: "n1",
      type: "Button",
      metadata: {
        type: "legacy-element-props",
        label: "Direct",
        color: "blue",
      },
    };
    const props = extractLegacyPropsFromResolved(node);
    expect(props).toEqual({ label: "Direct", color: "blue" });
    expect(props).not.toHaveProperty("type");
  });

  it("TC7: metadata 없으면 빈 객체", () => {
    const node: ResolvedNode = { id: "n1", type: "Button" };
    expect(extractLegacyPropsFromResolved(node)).toEqual({});
  });

  it("TC8: metadata.legacyProps 가 null/undefined 이면 빈 객체", () => {
    const node: ResolvedNode = {
      id: "n1",
      type: "Button",
      metadata: { type: "legacy-element-props", legacyProps: null },
    } as unknown as ResolvedNode;
    expect(extractLegacyPropsFromResolved(node)).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveInstanceWithSharedCache  (시각 대칭 보장 — legacy 와 동일 결과)
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveInstanceWithSharedCache", () => {
  beforeEach(() => {
    resetSharedResolverCache();
  });

  it("TC9: instance + master → tag=master.tag, props=merged (legacy 와 deep-equal)", () => {
    const master: Element = el({
      id: "m1",
      tag: "Button",
      componentRole: "master",
      props: {
        label: "Submit",
        style: { color: "red", fontSize: 14 },
        isDisabled: false,
      },
    });
    const instance: Element = el({
      id: "i1",
      tag: "Button",
      componentRole: "instance",
      masterId: "m1",
      overrides: { label: "Send", style: { color: "blue" } },
    });

    const canonical = resolveInstanceWithSharedCache(instance, master);
    const legacy = resolveInstanceElement(instance, master);

    expect(canonical).not.toBeNull();
    expect(canonical?.tag).toBe("Button");
    expect(canonical?.id).toBe("i1");
    // style 심층 병합 포함 props 완전 일치 — ADR-903 Decision 시각 대칭
    expect(canonical?.props).toEqual(legacy.props);
  });

  it("TC10: master 없음 → null (caller 는 element 그대로 처리)", () => {
    const instance: Element = el({
      id: "i1",
      tag: "Button",
      componentRole: "instance",
      masterId: "m-missing",
    });
    expect(resolveInstanceWithSharedCache(instance, undefined)).toBeNull();
  });

  it("TC11: 비-instance element → null (caller 는 element 그대로 처리)", () => {
    const regular: Element = el({
      id: "r1",
      tag: "Button",
      props: { label: "Plain" },
    });
    // master 가 있어도 instance 가 아니면 null
    expect(resolveInstanceWithSharedCache(regular, regular)).toBeNull();
  });

  it("TC12: 동일 (instance, master) pair 반복 호출 — shared cache hit", () => {
    const master: Element = el({
      id: "m1",
      tag: "Button",
      componentRole: "master",
      props: { label: "Submit" },
    });
    const instance: Element = el({
      id: "i1",
      tag: "Button",
      componentRole: "instance",
      masterId: "m1",
      overrides: { label: "Send" },
    });

    const cache = createResolverCache();
    const before = cache.stats();
    expect(before.hits).toBe(0);

    resolveInstanceWithSharedCache(instance, master, cache);
    resolveInstanceWithSharedCache(instance, master, cache);
    const after = cache.stats();

    expect(after.hits).toBeGreaterThan(0);
  });

  it("TC13: singleton 기본값 사용 — 명시 cache 없이 getSharedResolverCache 공유", () => {
    const master: Element = el({
      id: "m-singleton",
      tag: "Button",
      componentRole: "master",
      props: { label: "Singleton" },
    });
    const instance: Element = el({
      id: "i-singleton",
      tag: "Button",
      componentRole: "instance",
      masterId: "m-singleton",
    });

    const shared = getSharedResolverCache();
    const before = shared.stats();

    resolveInstanceWithSharedCache(instance, master);
    const afterFirst = shared.stats();
    expect(afterFirst.size).toBeGreaterThan(before.size);

    resolveInstanceWithSharedCache(instance, master);
    const afterSecond = shared.stats();
    expect(afterSecond.hits).toBeGreaterThan(afterFirst.hits);
  });
});
