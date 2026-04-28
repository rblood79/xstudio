// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { Element, Page } from "../../../../types/core/store.types";

import { resolvePageWithFrame } from "./resolvePageWithFrame";

const makeEl = (
  partial: Partial<Element> & { id: string; type: string },
): Element => ({
  props: {},
  ...partial,
});

const makePage = (partial: Partial<Page> & { id: string }): Page => ({
  title: "Home",
  project_id: "proj-1",
  slug: "home",
  ...partial,
});

const buildElementsMap = (els: Element[]): Map<string, Element> =>
  new Map(els.map((el) => [el.id, el]));

describe("ADR-911 P3-θ resolvePageWithFrame", () => {
  it("layout_id 미바인딩 page → 기존 동작 (body + nonBody, hasFrameBinding=false)", () => {
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
      order_num: 0,
    });
    const button = makeEl({
      id: "btn",
      type: "Button",
      page_id: "page-1",
      parent_id: "page-body",
      order_num: 1,
    });
    const elementsMap = buildElementsMap([pageBody, button]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1" }),
      pageElements: [pageBody, button],
      elementsMap,
    });

    expect(result.hasFrameBinding).toBe(false);
    expect(result.bodyElement?.id).toBe("page-body");
    expect(result.pageElements.map((el) => el.id)).toEqual(["btn"]);
  });

  it("layout_id 바인딩 but frame body 미존재 → page only fallback", () => {
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const button = makeEl({
      id: "btn",
      type: "Button",
      page_id: "page-1",
      parent_id: "page-body",
      order_num: 1,
    });
    const elementsMap = buildElementsMap([pageBody, button]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: "missing-frame" }),
      pageElements: [pageBody, button],
      elementsMap,
    });

    expect(result.hasFrameBinding).toBe(false);
    expect(result.bodyElement?.id).toBe("page-body");
    expect(result.pageElements.map((el) => el.id)).toEqual(["btn"]);
  });

  describe("T2 — frame body + slot 구조 inline 노출 (page slot fill 없음)", () => {
    const FRAME_ID = "frame-9dd9946f";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
      order_num: 0,
    });
    const slotHeader = makeEl({
      id: "slot-header",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 0,
      props: { name: "header" },
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 1,
      props: { name: "content" },
    });
    const slotFooter = makeEl({
      id: "slot-footer",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 2,
      props: { name: "footer" },
    });
    const textHeader = makeEl({
      id: "text-header",
      type: "Text",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "slot-header",
      order_num: 0,
    });
    const textFooter = makeEl({
      id: "text-footer",
      type: "Text",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "slot-footer",
      order_num: 0,
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });

    const allElements = [
      frameBody,
      slotHeader,
      slotContent,
      slotFooter,
      textHeader,
      textFooter,
      pageBody,
    ];

    it("page body 가 root 유지, frame slot 들이 page body 자식으로 reparent + default text 노출", () => {
      const elementsMap = buildElementsMap(allElements);

      const result = resolvePageWithFrame({
        page: makePage({ id: "page-1", layout_id: FRAME_ID }),
        pageElements: [pageBody],
        elementsMap,
      });

      expect(result.hasFrameBinding).toBe(true);
      expect(result.bodyElement?.id).toBe("page-body");

      const ids = new Set(result.pageElements.map((el) => el.id));
      expect(ids).toEqual(
        new Set([
          "slot-header",
          "slot-content",
          "slot-footer",
          "text-header",
          "text-footer",
        ]),
      );

      const reparentedSlotHeader = result.pageElements.find(
        (el) => el.id === "slot-header",
      );
      const reparentedSlotContent = result.pageElements.find(
        (el) => el.id === "slot-content",
      );
      const reparentedSlotFooter = result.pageElements.find(
        (el) => el.id === "slot-footer",
      );
      expect(reparentedSlotHeader?.parent_id).toBe("page-body");
      expect(reparentedSlotContent?.parent_id).toBe("page-body");
      expect(reparentedSlotFooter?.parent_id).toBe("page-body");
      expect(reparentedSlotHeader?.props?._slotChrome).toBe("hidden");
      expect(reparentedSlotContent?.props?._slotChrome).toBe("hidden");
      expect(reparentedSlotFooter?.props?._slotChrome).toBe("hidden");

      const textInHeader = result.pageElements.find(
        (el) => el.id === "text-header",
      );
      expect(textInHeader?.parent_id).toBe("slot-header");
    });
  });

  describe("T3 — page slot:content fill (frame default content 의 자식 hide)", () => {
    const FRAME_ID = "frame-9dd9946f";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
    });
    const slotHeader = makeEl({
      id: "slot-header",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 0,
      props: { name: "header" },
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 1,
      props: { name: "content" },
    });
    const slotFooter = makeEl({
      id: "slot-footer",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      order_num: 2,
      props: { name: "footer" },
    });
    const textHeader = makeEl({
      id: "text-header",
      type: "Text",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "slot-header",
    });
    const textFooter = makeEl({
      id: "text-footer",
      type: "Text",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "slot-footer",
    });
    const defaultContentText = makeEl({
      id: "default-content-text",
      type: "Text",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "slot-content",
    });

    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const pageCustom = makeEl({
      id: "page-custom",
      type: "Card",
      page_id: "page-1",
      parent_id: "page-body",
      order_num: 0,
      props: { slot_name: "content" },
    });

    const allElements = [
      frameBody,
      slotHeader,
      slotContent,
      slotFooter,
      textHeader,
      textFooter,
      defaultContentText,
      pageBody,
      pageCustom,
    ];

    it("page slot_name='content' 매칭 → page element parent_id 재매핑 + frame default content 자식 hide", () => {
      const elementsMap = buildElementsMap(allElements);

      const result = resolvePageWithFrame({
        page: makePage({ id: "page-1", layout_id: FRAME_ID }),
        pageElements: [pageBody, pageCustom],
        elementsMap,
      });

      expect(result.hasFrameBinding).toBe(true);
      expect(result.bodyElement?.id).toBe("page-body");

      const ids = new Set(result.pageElements.map((el) => el.id));
      expect(ids.has("default-content-text")).toBe(false);
      expect(ids.has("page-custom")).toBe(true);
      expect(ids.has("slot-content")).toBe(true);
      expect(ids.has("slot-header")).toBe(true);
      expect(ids.has("text-header")).toBe(true);
      expect(ids.has("text-footer")).toBe(true);

      const remappedCustom = result.pageElements.find(
        (el) => el.id === "page-custom",
      );
      expect(remappedCustom?.parent_id).toBe("slot-content");

      const slotContentRow = result.pageElements.find(
        (el) => el.id === "slot-content",
      );
      expect(slotContentRow?.parent_id).toBe("page-body");
      expect(slotContentRow?.props?._slotChrome).toBe("hidden");
    });

    it("page slot_name 가 element-level (props 외부) 에 있어도 매칭", () => {
      const pageCustomLegacy = makeEl({
        id: "page-custom",
        type: "Card",
        page_id: "page-1",
        parent_id: "page-body",
        slot_name: "content",
      });
      const elementsMap = buildElementsMap([
        frameBody,
        slotHeader,
        slotContent,
        slotFooter,
        textHeader,
        textFooter,
        defaultContentText,
        pageBody,
        pageCustomLegacy,
      ]);

      const result = resolvePageWithFrame({
        page: makePage({ id: "page-1", layout_id: FRAME_ID }),
        pageElements: [pageBody, pageCustomLegacy],
        elementsMap,
      });

      const remappedCustom = result.pageElements.find(
        (el) => el.id === "page-custom",
      );
      expect(remappedCustom?.parent_id).toBe("slot-content");
    });
  });

  it("매칭 안 된 slot_name 은 'content' fallback 으로 fill", () => {
    const FRAME_ID = "frame-1";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      props: { name: "content" },
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const pageMisslotted = makeEl({
      id: "misslotted",
      type: "Button",
      page_id: "page-1",
      parent_id: "page-body",
      props: { slot_name: "nonexistent" },
    });
    const elementsMap = buildElementsMap([
      frameBody,
      slotContent,
      pageBody,
      pageMisslotted,
    ]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: FRAME_ID }),
      pageElements: [pageBody, pageMisslotted],
      elementsMap,
    });

    const remapped = result.pageElements.find((el) => el.id === "misslotted");
    expect(remapped?.parent_id).toBe("slot-content");
  });

  it("page non-root element (다른 page element 의 자식) 는 그대로 유지", () => {
    const FRAME_ID = "frame-1";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      props: { name: "content" },
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const pageRoot = makeEl({
      id: "page-root",
      type: "Card",
      page_id: "page-1",
      parent_id: "page-body",
      props: { slot_name: "content" },
    });
    const pageChild = makeEl({
      id: "page-child",
      type: "Text",
      page_id: "page-1",
      parent_id: "page-root",
    });
    const elementsMap = buildElementsMap([
      frameBody,
      slotContent,
      pageBody,
      pageRoot,
      pageChild,
    ]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: FRAME_ID }),
      pageElements: [pageBody, pageRoot, pageChild],
      elementsMap,
    });

    const remappedRoot = result.pageElements.find(
      (el) => el.id === "page-root",
    );
    const childResult = result.pageElements.find(
      (el) => el.id === "page-child",
    );

    expect(remappedRoot?.parent_id).toBe("slot-content");
    expect(childResult?.parent_id).toBe("page-root");
  });

  it("frame Slot 0건 (빈 frame body) → page element 가 page-body 자식 유지 (orphan 방지 회귀 fixture)", () => {
    const FRAME_ID = "frame-empty";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const pageCard = makeEl({
      id: "page-card",
      type: "Card",
      page_id: "page-1",
      parent_id: "page-body",
    });
    const elementsMap = buildElementsMap([frameBody, pageBody, pageCard]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: FRAME_ID }),
      pageElements: [pageBody, pageCard],
      elementsMap,
    });

    expect(result.bodyElement?.id).toBe("page-body");
    expect(result.hasFrameBinding).toBe(true);

    const cardRow = result.pageElements.find((el) => el.id === "page-card");
    expect(cardRow?.parent_id).toBe("page-body");
  });

  it("page width/height/배경 시각 속성 보존 (page body 가 root 유지)", () => {
    const FRAME_ID = "frame-1";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
      props: { style: { width: 320, height: 200, background: "red" } },
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      props: { name: "content" },
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
      props: { style: { width: 390, height: 844, background: "white" } },
    });
    const elementsMap = buildElementsMap([frameBody, slotContent, pageBody]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: FRAME_ID }),
      pageElements: [pageBody],
      elementsMap,
    });

    expect(result.bodyElement?.id).toBe("page-body");
    const bodyStyle = (result.bodyElement?.props?.style ?? {}) as Record<
      string,
      unknown
    >;
    expect(bodyStyle.width).toBe(390);
    expect(bodyStyle.height).toBe(844);
    expect(bodyStyle.background).toBe("white");

    const slotRow = result.pageElements.find((el) => el.id === "slot-content");
    expect(slotRow?.parent_id).toBe("page-body");
  });

  it("deleted 표시된 frame element 는 제외", () => {
    const FRAME_ID = "frame-1";
    const frameBody = makeEl({
      id: "frame-body",
      type: "body",
      layout_id: FRAME_ID,
      page_id: null,
    });
    const slotContent = makeEl({
      id: "slot-content",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      props: { name: "content" },
    });
    const deletedSlot = makeEl({
      id: "slot-deleted",
      type: "Slot",
      layout_id: FRAME_ID,
      page_id: null,
      parent_id: "frame-body",
      props: { name: "footer" },
      deleted: true,
    });
    const pageBody = makeEl({
      id: "page-body",
      type: "body",
      page_id: "page-1",
    });
    const elementsMap = buildElementsMap([
      frameBody,
      slotContent,
      deletedSlot,
      pageBody,
    ]);

    const result = resolvePageWithFrame({
      page: makePage({ id: "page-1", layout_id: FRAME_ID }),
      pageElements: [pageBody],
      elementsMap,
    });

    const ids = new Set(result.pageElements.map((el) => el.id));
    expect(ids.has("slot-deleted")).toBe(false);
    expect(ids.has("slot-content")).toBe(true);
  });
});
