import { afterEach, describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import {
  clearSyntheticElements,
  getPublishedSyntheticElementsMap,
  getSyntheticElementsMap,
  publishSyntheticElementsMap,
} from "./fullTreeLayout";

function makeElement(id: string, pageId: string): Element {
  return {
    id,
    parent_id: "tab-list",
    page_id: pageId,
    props: {},
    type: "Tab",
  } as Element;
}

describe("fullTreeLayout synthetic elements map", () => {
  afterEach(() => {
    clearSyntheticElements();
  });

  it("keeps virtual Tabs per page/frame root instead of replacing with the last root", () => {
    const pageTab = makeElement("page-1-tabs:virtualTab:a", "page-1");
    const frameTab = makeElement(
      "page-2::page-frame::tabs:virtualTab:a",
      "page-2",
    );

    publishSyntheticElementsMap(new Map([[pageTab.id, pageTab]]), "page-1");
    publishSyntheticElementsMap(new Map([[frameTab.id, frameTab]]), "page-2");

    const syntheticMap = getSyntheticElementsMap();

    expect(syntheticMap.get(pageTab.id)).toBe(pageTab);
    expect(syntheticMap.get(frameTab.id)).toBe(frameTab);
  });

  it("can republish and delete a single root without dropping other roots", () => {
    const pageTab = makeElement("page-1-tabs:virtualTab:a", "page-1");
    const frameTab = makeElement(
      "page-2::page-frame::tabs:virtualTab:a",
      "page-2",
    );

    publishSyntheticElementsMap(new Map([[pageTab.id, pageTab]]), "page-1");
    publishSyntheticElementsMap(new Map([[frameTab.id, frameTab]]), "page-2");
    publishSyntheticElementsMap(null, "page-1");

    const syntheticMap = getSyntheticElementsMap();

    expect(syntheticMap.has(pageTab.id)).toBe(false);
    expect(syntheticMap.get(frameTab.id)).toBe(frameTab);
    expect(getPublishedSyntheticElementsMap("page-2")?.get(frameTab.id)).toBe(
      frameTab,
    );
  });
});
