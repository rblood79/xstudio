import { describe, it, expect } from "vitest";
import type { StoredSelectItem, RuntimeSelectItem } from "../types/select-items";
import { toRuntimeSelectItem } from "../types/select-items";

describe("StoredSelectItem", () => {
  it("required fields: id + label", () => {
    const minimal: StoredSelectItem = { id: "a", label: "A" };
    expect(minimal.id).toBe("a");
    expect(minimal.label).toBe("A");
  });

  it("optional fields compile", () => {
    const full: StoredSelectItem = {
      id: "a",
      label: "A",
      value: "value-a",
      textValue: "TEXT A",
      isDisabled: true,
      icon: "star",
      description: "desc",
      onActionId: "event-1",
    };
    expect(full.onActionId).toBe("event-1");
  });
});

describe("toRuntimeSelectItem", () => {
  it("onActionId → onAction function when resolver returns fn", () => {
    const stored: StoredSelectItem = { id: "a", label: "A", onActionId: "event-1" };
    const fn = () => void 0;
    const resolveActionId = (id: string) => (id === "event-1" ? fn : undefined);
    const runtime: RuntimeSelectItem = toRuntimeSelectItem(stored, resolveActionId);
    expect(runtime.onAction).toBe(fn);
    // @ts-expect-error — onActionId excluded on Runtime
    expect(runtime.onActionId).toBeUndefined();
  });

  it("onActionId undefined → runtime.onAction undefined", () => {
    const stored: StoredSelectItem = { id: "a", label: "A" };
    const runtime = toRuntimeSelectItem(stored, () => undefined);
    expect(runtime.onAction).toBeUndefined();
  });

  it("unknown onActionId → runtime.onAction undefined (resolver miss)", () => {
    const stored: StoredSelectItem = { id: "a", label: "A", onActionId: "unknown" };
    const runtime = toRuntimeSelectItem(stored, () => undefined);
    expect(runtime.onAction).toBeUndefined();
  });

  it("id !== value — runtime 에 둘 다 pass-through", () => {
    const stored: StoredSelectItem = {
      id: "opt-a",
      label: "Apple",
      value: "APPLE_VAL",
    };
    const runtime = toRuntimeSelectItem(stored, () => undefined);
    expect(runtime.id).toBe("opt-a");
    expect(runtime.value).toBe("APPLE_VAL");
    expect(runtime.label).toBe("Apple");
  });

  it("id === value 동일 케이스도 pass-through", () => {
    const stored: StoredSelectItem = {
      id: "same",
      label: "Same",
      value: "same",
    };
    const runtime = toRuntimeSelectItem(stored, () => undefined);
    expect(runtime.id).toBe("same");
    expect(runtime.value).toBe("same");
  });
});
