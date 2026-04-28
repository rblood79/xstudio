// @vitest-environment node
import { describe, expect, it } from "vitest";
import type {
  CompositionDocument,
  CanonicalNode,
  FrameNode,
} from "@composition/shared";

import { computeFrameAreas } from "./workflowEdges";

const makeFrame = (
  partial: Partial<FrameNode> & { id: string; reusable?: boolean },
): FrameNode => ({
  type: "frame",
  ...partial,
});

const makeDoc = (children: CanonicalNode[]): CompositionDocument => ({
  version: "composition-1.0",
  children,
});

describe("ADR-911 P3-β computeFrameAreas", () => {
  it("doc null/undefined → 빈 배열", () => {
    expect(computeFrameAreas(null, {}, "any-frame")).toEqual([]);
    expect(computeFrameAreas(undefined, {}, "any-frame")).toEqual([]);
  });

  it("selectedReusableFrameId null → 빈 배열 (옵션 B1: 명시 선택 시에만 노출)", () => {
    const doc = makeDoc([
      makeFrame({ id: "frame-A", reusable: true, name: "A" }),
    ]);
    expect(
      computeFrameAreas(
        doc,
        { "frame-A": { x: 0, y: 0, width: 100, height: 100 } },
        null,
      ),
    ).toEqual([]);
  });

  it("non-reusable frame 과 frame 이 아닌 노드는 제외", () => {
    const doc = makeDoc([
      makeFrame({ id: "frame-A", reusable: true, name: "Reusable A" }),
      makeFrame({ id: "frame-B", reusable: false, name: "Inline frame" }),
      { id: "page-1", type: "page", name: "Home" } as CanonicalNode,
    ]);

    const result = computeFrameAreas(
      doc,
      {
        "frame-A": { x: 10, y: 20, width: 320, height: 200 },
      },
      "frame-A",
    );

    expect(result).toHaveLength(1);
    expect(result[0].frameId).toBe("frame-A");
    expect(result[0].frameName).toBe("Reusable A");
  });

  it("metadata.layoutId 가 있으면 frameId 로 우선 사용 (legacy CRUD 정합)", () => {
    const doc = makeDoc([
      makeFrame({
        id: "layout-abc-canonical",
        reusable: true,
        name: "Layout A",
        metadata: {
          type: "layout-shell",
          layoutId: "abc-legacy-uuid",
        },
      }),
    ]);

    const result = computeFrameAreas(
      doc,
      {
        "abc-legacy-uuid": { x: 100, y: 50, width: 800, height: 600 },
      },
      "abc-legacy-uuid",
    );

    expect(result).toHaveLength(1);
    expect(result[0].frameId).toBe("abc-legacy-uuid");
    expect(result[0].x).toBe(100);
    expect(result[0].width).toBe(800);
  });

  it("framePositions miss → x/y/width/height 모두 0 으로 fallback", () => {
    const doc = makeDoc([
      makeFrame({ id: "frame-orphan", reusable: true, name: "Orphan" }),
    ]);

    const result = computeFrameAreas(doc, {}, "frame-orphan");

    expect(result).toEqual([
      {
        frameId: "frame-orphan",
        frameName: "Orphan",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    ]);
  });

  it("name 부재 시 frameId 를 frameName 으로 fallback", () => {
    const doc = makeDoc([makeFrame({ id: "frame-noname", reusable: true })]);

    const result = computeFrameAreas(
      doc,
      {
        "frame-noname": { x: 0, y: 0, width: 100, height: 100 },
      },
      "frame-noname",
    );

    expect(result[0].frameName).toBe("frame-noname");
  });

  it("선택된 frame 만 노출 (다중 reusable 중 선택된 하나)", () => {
    const doc = makeDoc([
      makeFrame({ id: "f1", reusable: true, name: "First" }),
      makeFrame({ id: "f2", reusable: false, name: "Skip" }),
      makeFrame({ id: "f3", reusable: true, name: "Third" }),
    ]);

    const result = computeFrameAreas(
      doc,
      {
        f1: { x: 0, y: 0, width: 320, height: 200 },
        f3: { x: 400, y: 0, width: 480, height: 300 },
      },
      "f3",
    );

    // 옵션 B1: 선택된 f3 만 노출 — f1 은 reusable 이지만 미선택 → 제외
    expect(result.map((g) => g.frameId)).toEqual(["f3"]);
    expect(result[0]).toMatchObject({ x: 400, width: 480 });
  });

  it("선택된 frame 이 reusable=false 또는 doc 부재 시 빈 배열", () => {
    const doc = makeDoc([
      makeFrame({ id: "frame-A", reusable: false, name: "Inline" }),
    ]);

    const result = computeFrameAreas(
      doc,
      {
        "frame-A": { x: 0, y: 0, width: 100, height: 100 },
      },
      "frame-A",
    );

    expect(result).toEqual([]);
  });
});
