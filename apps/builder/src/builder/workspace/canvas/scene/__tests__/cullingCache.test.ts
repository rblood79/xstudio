import { describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import {
  getCachedCullingResult,
  getCachedRenderIdSet,
  getCachedTopLevelCandidateIds,
} from "../cullingCache";

function createElement(overrides: Partial<Element>): Element {
  return {
    id: overrides.id ?? "el-1",
    props: overrides.props ?? {},
    tag: overrides.tag ?? "Div",
    ...overrides,
  };
}

describe("cullingCache", () => {
  it("같은 cache key에서는 동일 culling result를 재사용한다", () => {
    const result = getCachedCullingResult("same-key", () => ({
      culledCount: 1,
      cullingRatio: 0.5,
      totalCount: 2,
      visibleElements: [createElement({ id: "child-a" })],
    }));
    const reused = getCachedCullingResult("same-key", () => ({
      culledCount: 0,
      cullingRatio: 0,
      totalCount: 0,
      visibleElements: [],
    }));

    expect(reused).toBe(result);
    expect(reused.visibleElements[0]?.id).toBe("child-a");
  });

  it("top-level subtree 후보와 render id set을 캐시한다", () => {
    const bodyId = "body-a";
    const top = createElement({ id: "top-a", parent_id: bodyId, page_id: "page-a" });
    const child = createElement({ id: "child-a", parent_id: "top-a", page_id: "page-a" });
    const pageChildrenMap = new Map<string | null, Element[]>([
      [bodyId, [top]],
      [top.id, [child]],
    ]);

    const candidateIds = getCachedTopLevelCandidateIds({
      bodyElementId: bodyId,
      cacheKey: "top-level-key",
      pageChildrenMap,
      viewport: { left: 0, top: 0, right: 100, bottom: 100 },
    });
    const renderIdSet = getCachedRenderIdSet({
      cacheKey: "render-id-key",
      elementById: new Map([
        [top.id, top],
        [child.id, child],
      ]),
      visibleElements: [child],
    });

    expect(candidateIds.has(top.id)).toBe(true);
    expect(candidateIds.has(child.id)).toBe(true);
    expect(renderIdSet.has(top.id)).toBe(true);
    expect(renderIdSet.has(child.id)).toBe(true);
  });
});
