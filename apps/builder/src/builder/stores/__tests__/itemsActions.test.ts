import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../elements";

// ADR-073 P4: addItem/removeItem/updateItem 일반화 액션 단위 테스트

describe("Store items actions (ADR-073 P4)", () => {
  const selectId = "test-select-1";

  beforeEach(() => {
    const state = useStore.getState();
    const el = {
      id: selectId,
      tag: "Select",
      parent_id: null,
      page_id: "p1",
      order_num: 0,
      props: { items: [] },
    };
    useStore.setState({
      ...state,
      currentPageId: "p1",
      elements: [el as never],
      elementsMap: new Map([[selectId, el as never]]),
      childrenMap: new Map(),
    } as never);
  });

  it("addItem: items 배열에 신규 item push + id 자동 생성", async () => {
    await useStore.getState().addItem(selectId, "items", { label: "Opt A" });
    const el = useStore.getState().elementsMap.get(selectId)!;
    const items = el.props.items as Array<{ id: string; label: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Opt A");
    expect(items[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("removeItem: id 일치 항목 제거", async () => {
    await useStore
      .getState()
      .addItem(selectId, "items", { id: "fixed-id", label: "X" });
    await useStore.getState().removeItem(selectId, "items", "fixed-id");
    const el = useStore.getState().elementsMap.get(selectId)!;
    expect(el.props.items as unknown[]).toHaveLength(0);
  });

  it("updateItem: 특정 id patch 적용", async () => {
    await useStore
      .getState()
      .addItem(selectId, "items", { id: "x", label: "Old" });
    await useStore
      .getState()
      .updateItem(selectId, "items", "x", { label: "New", value: "V" });
    const el = useStore.getState().elementsMap.get(selectId)!;
    const items = el.props.items as Array<{
      id: string;
      label: string;
      value?: string;
    }>;
    expect(items[0]).toMatchObject({ id: "x", label: "New", value: "V" });
  });

  it("addMenuItem: Menu 회귀 0 — addItem wrapper 로 동작", async () => {
    const menuEl = {
      id: "menu-1",
      tag: "Menu",
      parent_id: null,
      page_id: "p1",
      order_num: 0,
      props: { items: [] },
    };
    useStore.setState({
      elementsMap: new Map([["menu-1", menuEl as never]]),
    } as never);
    await useStore.getState().addMenuItem("menu-1", { label: "MI" });
    const menu = useStore.getState().elementsMap.get("menu-1")!;
    const items = menu.props.items as Array<{ label: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("MI");
  });

  it("addItem: 존재하지 않는 elementId → no-op (throw 없음)", async () => {
    await expect(
      useStore.getState().addItem("non-existent", "items", { label: "X" }),
    ).resolves.toBeUndefined();
  });
});
