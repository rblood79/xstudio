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

import { describe, it, expect, vi } from "vitest";
import {
  convertTemplateToCanonicalFrame,
  flattenTemplateElements,
  buildDescendantsFromSlots,
  hoistLayoutAsReusableFrame,
  dryRunMigrationP911,
} from "../migrationP911";
import type { CompositionDocument, FrameNode } from "@composition/shared";
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
import type { Layout } from "../../../types/builder/layout.types";

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

describe("ADR-911 P1-b1: hoistLayoutAsReusableFrame", () => {
  const baseLayout: Layout = {
    id: "layout-uuid-1",
    name: "Main Layout",
    project_id: "project-uuid-1",
  };

  describe("기본 변환", () => {
    it("returns FrameNode with type='frame'", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.type).toBe("frame");
    });

    it("preserves layout id and name", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.id).toBe("layout-uuid-1");
      expect(result.name).toBe("Main Layout");
    });

    it("sets reusable=true", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.reusable).toBe(true);
    });

    it("defaults slot=false (children/slot 정보 별도 처리)", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.slot).toBe(false);
    });

    it("defaults children=[] (elements 별도 P1-b2 처리)", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.children).toEqual([]);
    });
  });

  describe("legacy 메타데이터 보존 (출처 추적)", () => {
    it("metadata.type='legacy-layout-hoist' 마커 추가", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.metadata?.type).toBe("legacy-layout-hoist");
    });

    it("metadata 에 project_id 보존", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect(result.metadata?.projectId).toBe("project-uuid-1");
    });

    it("metadata 에 optional fields (description / slug / order_num) 보존", () => {
      const layout: Layout = {
        ...baseLayout,
        description: "Main app layout shell",
        slug: "/main",
        order_num: 1,
      };
      const result = hoistLayoutAsReusableFrame(layout);
      expect(result.metadata?.description).toBe("Main app layout shell");
      expect(result.metadata?.slug).toBe("/main");
      expect(result.metadata?.orderNum).toBe(1);
    });

    it("metadata 에 notFoundPageId / inheritNotFound 보존", () => {
      const layout: Layout = {
        ...baseLayout,
        notFoundPageId: "not-found-uuid",
        inheritNotFound: false,
      };
      const result = hoistLayoutAsReusableFrame(layout);
      expect(result.metadata?.notFoundPageId).toBe("not-found-uuid");
      expect(result.metadata?.inheritNotFound).toBe(false);
    });

    it("optional fields 가 undefined 면 metadata 에 포함 안함", () => {
      const result = hoistLayoutAsReusableFrame(baseLayout);
      expect("description" in (result.metadata ?? {})).toBe(false);
      expect("slug" in (result.metadata ?? {})).toBe(false);
      expect("orderNum" in (result.metadata ?? {})).toBe(false);
    });
  });

  describe("idempotency — 같은 input 으로 같은 결과", () => {
    it("두 번 호출 시 동일한 결과 반환 (id/name/metadata 일치)", () => {
      const result1 = hoistLayoutAsReusableFrame(baseLayout);
      const result2 = hoistLayoutAsReusableFrame(baseLayout);
      expect(result1.id).toBe(result2.id);
      expect(result1.name).toBe(result2.name);
      expect(result1.metadata).toEqual(result2.metadata);
    });
  });
});

describe("ADR-911 P1-b2: dryRunMigrationP911", () => {
  const PROJECT_ID = "project-uuid-1";

  const buildAdapter = (layouts: Layout[]) => ({
    layouts: {
      getByProject: async (_projectId: string) => layouts,
    },
  });

  const buildCanonicalDoc = (
    reusableFrameIds: string[],
  ): CompositionDocument => ({
    version: "composition-1.0",
    children: reusableFrameIds.map(
      (id): FrameNode => ({
        id,
        type: "frame",
        reusable: true,
        name: `frame-${id}`,
      }),
    ),
  });

  describe("status='success' (정상 dryRun)", () => {
    it("empty layouts → status='success', hoisted=[], skipped=[]", async () => {
      const result = await dryRunMigrationP911(
        buildAdapter([]),
        PROJECT_ID,
        buildCanonicalDoc([]),
      );
      expect(result.status).toBe("success");
      expect(result.hoisted).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("layouts 1건 + canonical 비어있음 → hoisted 1건", async () => {
      const layout: Layout = {
        id: "layout-1",
        name: "Main",
        project_id: PROJECT_ID,
      };
      const result = await dryRunMigrationP911(
        buildAdapter([layout]),
        PROJECT_ID,
        buildCanonicalDoc([]),
      );
      expect(result.status).toBe("success");
      expect(result.hoisted).toHaveLength(1);
      expect(result.hoisted[0].id).toBe("layout-1");
      expect(result.hoisted[0].type).toBe("frame");
      expect(result.hoisted[0].reusable).toBe(true);
      expect(result.skipped).toEqual([]);
    });

    it("layouts 1건 + canonical 동일 id 존재 → skipped 1건 (idempotent)", async () => {
      const layout: Layout = {
        id: "layout-1",
        name: "Main",
        project_id: PROJECT_ID,
      };
      const result = await dryRunMigrationP911(
        buildAdapter([layout]),
        PROJECT_ID,
        buildCanonicalDoc(["layout-1"]),
      );
      expect(result.status).toBe("success");
      expect(result.hoisted).toEqual([]);
      expect(result.skipped).toEqual(["layout-1"]);
    });

    it("layouts 2건 (1 매칭 / 1 신규) → hoisted 1, skipped 1", async () => {
      const layouts: Layout[] = [
        { id: "layout-1", name: "Main", project_id: PROJECT_ID },
        { id: "layout-2", name: "Auth", project_id: PROJECT_ID },
      ];
      const result = await dryRunMigrationP911(
        buildAdapter(layouts),
        PROJECT_ID,
        buildCanonicalDoc(["layout-1"]),
      );
      expect(result.status).toBe("success");
      expect(result.hoisted).toHaveLength(1);
      expect(result.hoisted[0].id).toBe("layout-2");
      expect(result.skipped).toEqual(["layout-1"]);
    });
  });

  describe("canonical doc 의 frame 매칭 정확성", () => {
    it("non-reusable frame 은 매칭 대상이 아님", async () => {
      const layout: Layout = {
        id: "layout-1",
        name: "Main",
        project_id: PROJECT_ID,
      };
      const docWithNonReusable: CompositionDocument = {
        version: "composition-1.0",
        children: [
          {
            id: "layout-1",
            type: "frame",
            // reusable: undefined → false (non-reusable)
            name: "frame-1",
          },
        ],
      };
      const result = await dryRunMigrationP911(
        buildAdapter([layout]),
        PROJECT_ID,
        docWithNonReusable,
      );
      // non-reusable frame 은 hoist 대상으로 카운트 (매칭 안됨)
      expect(result.hoisted).toHaveLength(1);
      expect(result.skipped).toEqual([]);
    });

    it("type='ref' 노드는 매칭 대상이 아님 (reusable frame 만 검사)", async () => {
      const layout: Layout = {
        id: "layout-1",
        name: "Main",
        project_id: PROJECT_ID,
      };
      const docWithRef: CompositionDocument = {
        version: "composition-1.0",
        children: [
          {
            id: "layout-1",
            type: "ref",
            name: "ref-1",
          },
        ],
      };
      const result = await dryRunMigrationP911(
        buildAdapter([layout]),
        PROJECT_ID,
        docWithRef,
      );
      expect(result.hoisted).toHaveLength(1);
      expect(result.skipped).toEqual([]);
    });
  });

  describe("dryRun 보장 — adapter write 호출 없음", () => {
    it("adapter 에 layouts.create 등 write 메서드가 호출되지 않음", async () => {
      const writeSpy = vi.fn();
      const adapter = {
        layouts: {
          getByProject: async () => [
            { id: "layout-1", name: "Main", project_id: PROJECT_ID },
          ],
          create: writeSpy,
          update: writeSpy,
          delete: writeSpy,
        },
      };
      await dryRunMigrationP911(adapter, PROJECT_ID, buildCanonicalDoc([]));
      expect(writeSpy).not.toHaveBeenCalled();
    });
  });
});
