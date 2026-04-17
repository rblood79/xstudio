import { describe, it, expect } from "vitest";
import type { StoredComboBoxItem, RuntimeComboBoxItem } from "../types/combobox-items";
import { toRuntimeComboBoxItem } from "../types/combobox-items";

describe("StoredComboBoxItem", () => {
  it("required fields: id + label", () => {
    const minimal: StoredComboBoxItem = { id: "a", label: "A" };
    expect(minimal.id).toBe("a");
    expect(minimal.label).toBe("A");
  });

  it("optional fields compile", () => {
    const full: StoredComboBoxItem = {
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

describe("toRuntimeComboBoxItem", () => {
  it("onActionId → onAction function when resolver returns fn", () => {
    const stored: StoredComboBoxItem = { id: "a", label: "A", onActionId: "event-1" };
    const fn = () => void 0;
    const resolveActionId = (id: string) => (id === "event-1" ? fn : undefined);
    const runtime: RuntimeComboBoxItem = toRuntimeComboBoxItem(stored, resolveActionId);
    expect(runtime.onAction).toBe(fn);
    // @ts-expect-error — onActionId excluded on Runtime
    expect(runtime.onActionId).toBeUndefined();
  });

  it("onActionId undefined → runtime.onAction undefined", () => {
    const stored: StoredComboBoxItem = { id: "a", label: "A" };
    const runtime = toRuntimeComboBoxItem(stored, () => undefined);
    expect(runtime.onAction).toBeUndefined();
  });

  it("unknown onActionId → runtime.onAction undefined (resolver miss)", () => {
    const stored: StoredComboBoxItem = { id: "a", label: "A", onActionId: "unknown" };
    const runtime = toRuntimeComboBoxItem(stored, () => undefined);
    expect(runtime.onAction).toBeUndefined();
  });
});
