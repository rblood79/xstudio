import { describe, it, expect } from "vitest";
import {
  applyCollectionItemsMigration,
  listBoxItemChildrenToItemsArray,
} from "../migrateCollectionItems";

/**
 * ADR-076 Phase 5 — 컬렉션 items SSOT 마이그레이션 (ListBox 확장)
 *
 * 부모 단위 원자 판정:
 *   - 자식 ListBoxItem 중 하나라도 Field 자식 보유 → 부모 전체 템플릿 유지
 *   - 전부 Field 없음 → 부모 전체 items[] 흡수 (ListBoxItem + subtree orphan)
 *
 * Text/Description subtree 직렬화:
 *   - Text (slot 없음 / slot="title" / slot="label") → label
 *   - Description 또는 Text[slot="description"] → description
 *
 * legacy selectedIndex/Indices → selectedKey/Keys 변환 (canonical 없을 때만)
 */

interface E {
  id: string;
  tag: string;
  parent_id?: string | null;
  order_num?: number;
  props: Record<string, unknown>;
}

function el(
  id: string,
  tag: string,
  parent_id: string | null,
  order_num: number,
  props: Record<string, unknown> = {},
): E {
  return { id, tag, parent_id, order_num, props };
}

describe("listBoxItemChildrenToItemsArray (ADR-076 P5)", () => {
  it("props.label 우선, Text/Description 자식 무시 가능", () => {
    const lbi = el("lb-1", "ListBoxItem", "parent", 0, {
      label: "Apple",
      value: "A",
      isDisabled: true,
    });
    const childrenByParent = new Map<string, E[]>();
    const items = listBoxItemChildrenToItemsArray([lbi], childrenByParent);
    expect(items[0]).toMatchObject({
      id: "lb-1",
      label: "Apple",
      value: "A",
      isDisabled: true,
    });
  });

  it("props.label 부재 시 Text 자식(slot 없음) children 사용", () => {
    const lbi = el("lb-1", "ListBoxItem", "parent", 0, {});
    const txt = el("txt-1", "Text", "lb-1", 0, { children: "From Child" });
    const childrenByParent = new Map<string, E[]>([["lb-1", [txt]]]);
    const items = listBoxItemChildrenToItemsArray([lbi], childrenByParent);
    expect(items[0].label).toBe("From Child");
  });

  it("Text[slot='description'] 또는 Description element → description", () => {
    const lbi = el("lb-1", "ListBoxItem", "parent", 0, { label: "Apple" });
    const desc = el("d-1", "Text", "lb-1", 0, {
      slot: "description",
      children: "빨간 과일",
    });
    const childrenByParent = new Map<string, E[]>([["lb-1", [desc]]]);
    const items = listBoxItemChildrenToItemsArray([lbi], childrenByParent);
    expect(items[0].description).toBe("빨간 과일");
  });

  it("Description element (tag) 도 description 으로 인식", () => {
    const lbi = el("lb-1", "ListBoxItem", "parent", 0, { label: "Apple" });
    const desc = el("d-1", "Description", "lb-1", 0, {
      children: "과일 설명",
    });
    const childrenByParent = new Map<string, E[]>([["lb-1", [desc]]]);
    const items = listBoxItemChildrenToItemsArray([lbi], childrenByParent);
    expect(items[0].description).toBe("과일 설명");
  });

  it("order_num 기준 정렬", () => {
    const a = el("lb-a", "ListBoxItem", "p", 2, { label: "Third" });
    const b = el("lb-b", "ListBoxItem", "p", 0, { label: "First" });
    const c = el("lb-c", "ListBoxItem", "p", 1, { label: "Second" });
    const items = listBoxItemChildrenToItemsArray(
      [a, b, c],
      new Map<string, E[]>(),
    );
    expect(items.map((it) => it.label)).toEqual(["First", "Second", "Third"]);
  });
});

describe("applyCollectionItemsMigration — ListBox 정적 모드 (ADR-076 P5)", () => {
  it("ListBoxItem 전부 정적 → items[] 흡수 + orphan + subtree DFS", () => {
    const elements: E[] = [
      el("lb-parent", "ListBox", null, 0, {}),
      el("lbi-1", "ListBoxItem", "lb-parent", 0, { label: "Apple" }),
      el("lbi-2", "ListBoxItem", "lb-parent", 1, {}),
      // lbi-2 자식: Text + Description
      el("txt-2", "Text", "lbi-2", 0, { children: "Banana" }),
      el("desc-2", "Description", "lbi-2", 1, { children: "노란 과일" }),
    ];
    const { migratedElements, orphanIds } =
      applyCollectionItemsMigration(elements);

    // 부모만 살아있음
    expect(migratedElements.map((e) => e.id)).toEqual(["lb-parent"]);
    // items[] 복원
    const parent = migratedElements[0];
    const items = parent.props.items as Array<{
      id: string;
      label: string;
      description?: string;
    }>;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "lbi-1", label: "Apple" });
    expect(items[1]).toMatchObject({
      id: "lbi-2",
      label: "Banana",
      description: "노란 과일",
    });
    // orphan: ListBoxItem + 자식 subtree 전부
    expect(orphanIds.sort()).toEqual(["desc-2", "lbi-1", "lbi-2", "txt-2"]);
  });

  it("selectedIndex → selectedKey 변환 (canonical 없을 때)", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, { selectedIndex: 1 }),
      el("lbi-0", "ListBoxItem", "lb", 0, { label: "A" }),
      el("lbi-1", "ListBoxItem", "lb", 1, { label: "B" }),
    ];
    const { migratedElements } = applyCollectionItemsMigration(elements);
    const parent = migratedElements[0];
    expect(parent.props.selectedKey).toBe("lbi-1");
    // legacy 필드는 그대로 유지 (BC)
    expect(parent.props.selectedIndex).toBe(1);
  });

  it("selectedIndices → selectedKeys 변환 + out-of-range 필터", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, { selectedIndices: [0, 2, 99] }),
      el("lbi-0", "ListBoxItem", "lb", 0, { label: "A" }),
      el("lbi-1", "ListBoxItem", "lb", 1, { label: "B" }),
      el("lbi-2", "ListBoxItem", "lb", 2, { label: "C" }),
    ];
    const { migratedElements } = applyCollectionItemsMigration(elements);
    const parent = migratedElements[0];
    expect(parent.props.selectedKeys).toEqual(["lbi-0", "lbi-2"]);
  });

  it("canonical selectedKey 있으면 legacy selectedIndex 무시", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, {
        selectedKey: "lbi-custom",
        selectedIndex: 0,
      }),
      el("lbi-0", "ListBoxItem", "lb", 0, { label: "A" }),
    ];
    const { migratedElements } = applyCollectionItemsMigration(elements);
    const parent = migratedElements[0];
    expect(parent.props.selectedKey).toBe("lbi-custom");
  });
});

describe("applyCollectionItemsMigration — ListBox 템플릿 모드 (ADR-076 P5)", () => {
  it("자식 ListBoxItem 중 하나라도 Field 보유 → 부모 전체 skip", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, { columnMapping: { columns: ["c1"] } }),
      el("lbi-template", "ListBoxItem", "lb", 0, {}),
      el("field-1", "Field", "lbi-template", 0, { key: "c1" }),
    ];
    const { migratedElements, orphanIds } =
      applyCollectionItemsMigration(elements);
    // element tree 전부 유지
    expect(migratedElements.map((e) => e.id).sort()).toEqual(
      ["field-1", "lb", "lbi-template"].sort(),
    );
    expect(orphanIds).toEqual([]);
    // 부모 props 에 items 주입 안 됨
    const parent = migratedElements.find((e) => e.id === "lb")!;
    expect(parent.props.items).toBeUndefined();
  });

  it("혼합 부모 (정적 + 템플릿 공존) → 부모 단위 원자 skip", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, {}),
      // 정적 ListBoxItem
      el("lbi-static", "ListBoxItem", "lb", 0, { label: "Static" }),
      // 템플릿 ListBoxItem (Field 자식)
      el("lbi-template", "ListBoxItem", "lb", 1, {}),
      el("field-x", "Field", "lbi-template", 0, { key: "x" }),
    ];
    const { migratedElements, orphanIds } =
      applyCollectionItemsMigration(elements);
    // 전부 유지 — 정적 자식도 흡수되지 않음 (부모 원자성)
    expect(migratedElements).toHaveLength(4);
    expect(orphanIds).toEqual([]);
    const parent = migratedElements.find((e) => e.id === "lb")!;
    expect(parent.props.items).toBeUndefined();
  });
});

describe("applyCollectionItemsMigration — Idempotency + 3종 공존", () => {
  it("재실행 시 no-op (자식 없음)", () => {
    const elements: E[] = [
      el("lb", "ListBox", null, 0, {
        items: [{ id: "x", label: "X" }],
      }),
    ];
    const result1 = applyCollectionItemsMigration(elements);
    expect(result1.orphanIds).toEqual([]);
    expect(result1.migratedElements[0].props.items).toEqual([
      { id: "x", label: "X" },
    ]);

    const result2 = applyCollectionItemsMigration(result1.migratedElements);
    expect(result2.orphanIds).toEqual([]);
    expect(result2.migratedElements).toEqual(result1.migratedElements);
  });

  it("Select + ComboBox + ListBox 3종 단일 pass 에 공존", () => {
    const elements: E[] = [
      el("sel", "Select", null, 0, {}),
      el("sel-i", "SelectItem", "sel", 0, { label: "S1" }),
      el("cb", "ComboBox", null, 1, {}),
      el("cb-i", "ComboBoxItem", "cb", 0, { label: "C1" }),
      el("lb", "ListBox", null, 2, {}),
      el("lb-i", "ListBoxItem", "lb", 0, { label: "L1" }),
    ];
    const { migratedElements, orphanIds } =
      applyCollectionItemsMigration(elements);
    expect(migratedElements.map((e) => e.id).sort()).toEqual(
      ["cb", "lb", "sel"].sort(),
    );
    expect(orphanIds.sort()).toEqual(["cb-i", "lb-i", "sel-i"]);
    const selEl = migratedElements.find((e) => e.id === "sel")!;
    const cbEl = migratedElements.find((e) => e.id === "cb")!;
    const lbEl = migratedElements.find((e) => e.id === "lb")!;
    expect((selEl.props.items as Array<{ id: string }>)[0].id).toBe("sel-i");
    expect((cbEl.props.items as Array<{ id: string }>)[0].id).toBe("cb-i");
    expect((lbEl.props.items as Array<{ id: string }>)[0].id).toBe("lb-i");
  });

  it("마이그레이션 대상 없음 → 원본 그대로 반환", () => {
    const elements: E[] = [el("div", "div", null, 0, {})];
    const result = applyCollectionItemsMigration(elements);
    expect(result.migratedElements).toBe(elements);
    expect(result.orphanIds).toEqual([]);
  });
});
