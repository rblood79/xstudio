import { describe, it, expect } from "vitest";
import {
  selectItemChildrenToItemsArray,
  comboBoxItemChildrenToItemsArray,
} from "../migrateSelectComboBoxItems";

// ADR-073 P5: migration util 단위 테스트

interface ElementLike {
  id: string;
  tag: string;
  parent_id: string | null;
  order_num: number;
  props: Record<string, unknown>;
}

describe("selectItemChildrenToItemsArray (ADR-073 P5)", () => {
  it("SelectItem child elements → StoredSelectItem[]", () => {
    const children: ElementLike[] = [
      {
        id: "si-1",
        tag: "SelectItem",
        parent_id: "sel-1",
        order_num: 0,
        props: { label: "Apple", value: "APPLE", isDisabled: false },
      },
      {
        id: "si-2",
        tag: "SelectItem",
        parent_id: "sel-1",
        order_num: 1,
        props: { label: "Banana", value: "BANANA", isDisabled: true },
      },
    ];
    const items = selectItemChildrenToItemsArray(children);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "si-1", label: "Apple", value: "APPLE" });
    expect(items[1]).toMatchObject({
      id: "si-2",
      label: "Banana",
      value: "BANANA",
      isDisabled: true,
    });
  });

  it("빈 배열 → 빈 배열", () => {
    expect(selectItemChildrenToItemsArray([])).toEqual([]);
  });

  it("order_num 기준 정렬 보존", () => {
    const children: ElementLike[] = [
      {
        id: "b",
        tag: "SelectItem",
        parent_id: "sel",
        order_num: 2,
        props: { label: "B" },
      },
      {
        id: "a",
        tag: "SelectItem",
        parent_id: "sel",
        order_num: 0,
        props: { label: "A" },
      },
    ];
    const items = selectItemChildrenToItemsArray(children);
    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("label 누락 시 id 로 fallback", () => {
    const children: ElementLike[] = [
      {
        id: "x",
        tag: "SelectItem",
        parent_id: "sel",
        order_num: 0,
        props: {},
      },
    ];
    expect(selectItemChildrenToItemsArray(children)[0]).toMatchObject({
      id: "x",
      label: "x",
    });
  });
});

describe("comboBoxItemChildrenToItemsArray (ADR-073 P5)", () => {
  it("ComboBoxItem child elements → StoredComboBoxItem[]", () => {
    const children: ElementLike[] = [
      {
        id: "ci-1",
        tag: "ComboBoxItem",
        parent_id: "cb-1",
        order_num: 0,
        props: { label: "Apple", value: "APPLE", isDisabled: false },
      },
      {
        id: "ci-2",
        tag: "ComboBoxItem",
        parent_id: "cb-1",
        order_num: 1,
        props: { label: "Banana", value: "BANANA", isDisabled: true },
      },
    ];
    const items = comboBoxItemChildrenToItemsArray(children);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "ci-1", label: "Apple", value: "APPLE" });
    expect(items[1]).toMatchObject({
      id: "ci-2",
      label: "Banana",
      value: "BANANA",
      isDisabled: true,
    });
  });

  it("빈 배열 → 빈 배열", () => {
    expect(comboBoxItemChildrenToItemsArray([])).toEqual([]);
  });

  it("order_num 기준 정렬 보존", () => {
    const children: ElementLike[] = [
      {
        id: "b",
        tag: "ComboBoxItem",
        parent_id: "cb",
        order_num: 2,
        props: { label: "B" },
      },
      {
        id: "a",
        tag: "ComboBoxItem",
        parent_id: "cb",
        order_num: 0,
        props: { label: "A" },
      },
    ];
    const items = comboBoxItemChildrenToItemsArray(children);
    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("label 누락 시 id 로 fallback", () => {
    const children: ElementLike[] = [
      {
        id: "y",
        tag: "ComboBoxItem",
        parent_id: "cb",
        order_num: 0,
        props: {},
      },
    ];
    expect(comboBoxItemChildrenToItemsArray(children)[0]).toMatchObject({
      id: "y",
      label: "y",
    });
  });
});
