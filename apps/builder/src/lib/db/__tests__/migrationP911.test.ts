/**
 * ADR-911 Phase 1 (G1) — Layout migration tool
 *
 * convertTemplateToCanonicalFrame: legacy LayoutTemplate → canonical reusable FrameNode
 *
 * 변환 규칙 (911-...-breakdown.md P1-a):
 * - LayoutTemplate.slots[] → FrameNode.slot = slots.map(s => s.name)
 * - tag="Slot" 자식 → 제거 (descendants key 로 대체)
 * - reusable: true (재사용 원본)
 * - placeholder: true (slot.required 가 있는 경우)
 * - descendants: 각 slot name → { children: [] } (빈 placeholder)
 */

import { describe, it, expect } from "vitest";
import {
  convertTemplateToCanonicalFrame,
  flattenTemplateElements,
  buildDescendantsFromSlots,
} from "../migrationP911";
import {
  singleColumnTemplate,
  twoColumnTemplate,
  threeColumnTemplate,
  dashboardTemplate,
  dashboardWithPanelTemplate,
  landingPageTemplate,
  documentationTemplate,
  layoutTemplates,
} from "../../../builder/templates/layoutTemplates";

describe("ADR-911 P1-a: convertTemplateToCanonicalFrame", () => {
  describe("singleColumnTemplate", () => {
    it("returns FrameNode with type='frame'", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      expect(result.type).toBe("frame");
    });

    it("preserves template id and name", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      expect(result.id).toBe("single-column");
      expect(result.name).toBe("Single Column");
    });

    it("sets reusable=true (재사용 원본)", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      expect(result.reusable).toBe(true);
    });

    it("collects slot names into FrameNode.slot field", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      expect(result.slot).toEqual(["header", "content", "footer"]);
    });

    it("sets placeholder=true when any slot has required=true", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      expect(result.placeholder).toBe(true);
    });

    it("does NOT include descendants on FrameNode (RefNode-only field)", () => {
      const result = convertTemplateToCanonicalFrame(singleColumnTemplate);
      // FrameNode 는 descendants 필드 없음 — RefNode 전용
      // slot 채우기는 RefNode 생성 시 buildDescendantsFromSlots() 별도 호출
      expect("descendants" in result).toBe(false);
    });
  });

  describe("slot=false when template has no slots", () => {
    it("returns slot=false for empty slots array", () => {
      const emptyTemplate = {
        ...singleColumnTemplate,
        id: "empty",
        slots: [],
      };
      const result = convertTemplateToCanonicalFrame(emptyTemplate);
      expect(result.slot).toBe(false);
    });
  });

  describe("placeholder=undefined when no slot is required", () => {
    it("omits placeholder when all slots are optional", () => {
      const optionalTemplate = {
        ...singleColumnTemplate,
        id: "all-optional",
        slots: [{ name: "header" }, { name: "content" }, { name: "footer" }],
      };
      const result = convertTemplateToCanonicalFrame(optionalTemplate);
      expect(result.placeholder).toBeUndefined();
    });
  });

  describe("all 28 layout templates 변환 정상 (G1-a 통과 조건)", () => {
    it("each template converts to FrameNode with valid type", () => {
      for (const template of layoutTemplates) {
        const result = convertTemplateToCanonicalFrame(template);
        expect(result.type).toBe("frame");
        expect(result.id).toBe(template.id);
        expect(result.reusable).toBe(true);
      }
    });

    it("each template's slot field matches slots array", () => {
      for (const template of layoutTemplates) {
        const result = convertTemplateToCanonicalFrame(template);
        if (template.slots.length > 0) {
          expect(result.slot).toEqual(template.slots.map((s) => s.name));
        } else {
          expect(result.slot).toBe(false);
        }
      }
    });
  });

  describe("category-specific templates", () => {
    it.each([
      ["twoColumn", twoColumnTemplate],
      ["threeColumn", threeColumnTemplate],
      ["dashboard", dashboardTemplate],
      ["dashboardWithPanel", dashboardWithPanelTemplate],
      ["landingPage", landingPageTemplate],
      ["documentation", documentationTemplate],
    ])("converts %s template to canonical FrameNode", (_name, template) => {
      const result = convertTemplateToCanonicalFrame(template);
      expect(result.type).toBe("frame");
      expect(result.reusable).toBe(true);
      expect(Array.isArray(result.slot) ? result.slot : []).toHaveLength(
        template.slots.length,
      );
    });
  });
});

describe("ADR-911 P1-a: flattenTemplateElements", () => {
  it("removes tag='Slot' children from element tree", () => {
    const elements = [
      { tag: "div", props: { className: "wrapper" } },
      { tag: "Slot", props: { name: "content" } },
      { tag: "footer", props: {} },
    ];
    const result = flattenTemplateElements(elements);
    expect(result).toHaveLength(2);
    expect(result.find((el) => el.name === "Slot")).toBeUndefined();
  });

  it("preserves non-Slot elements with type='frame'", () => {
    const elements = [{ tag: "div", props: { className: "box" } }];
    const result = flattenTemplateElements(elements);
    expect(result[0].type).toBe("frame");
    expect(result[0].name).toBe("div");
  });

  it("returns empty array for elements containing only Slot", () => {
    const elements = [{ tag: "Slot", props: { name: "only" } }];
    const result = flattenTemplateElements(elements);
    expect(result).toEqual([]);
  });
});

describe("ADR-911 P1-a: buildDescendantsFromSlots", () => {
  it("creates descendants entry for each slot name", () => {
    const slots = [
      { name: "header" },
      { name: "content", required: true },
      { name: "footer" },
    ];
    const result = buildDescendantsFromSlots(slots);
    expect(Object.keys(result)).toEqual(["header", "content", "footer"]);
    expect(result.header).toEqual({ children: [] });
    expect(result.content).toEqual({ children: [] });
    expect(result.footer).toEqual({ children: [] });
  });

  it("returns empty object for empty slots", () => {
    const result = buildDescendantsFromSlots([]);
    expect(result).toEqual({});
  });
});
