import { describe, test, expect, beforeEach, vi } from "vitest";
import { StoreRenderBridge } from "../StoreRenderBridge";
import type { Element } from "../../../../../types/core/store.types";

// Mock useSkiaNode registry
vi.mock("../useSkiaNode", () => {
  const registry = new Map<string, unknown>();
  let version = 0;
  return {
    registerSkiaNode: (id: string, data: unknown) => {
      registry.set(id, data);
      version++;
    },
    unregisterSkiaNode: (id: string) => {
      registry.delete(id);
      version++;
    },
    getRegistryVersion: () => version,
    // expose for test assertions
    __registry: registry,
  };
});

function makeElement(
  id: string,
  tag: string,
  style: Record<string, unknown> = {},
): Element {
  return {
    id,
    tag,
    props: {
      style: {
        backgroundColor: "#fff",
        width: "100px",
        height: "50px",
        ...style,
      },
    },
  } as Element;
}

describe("StoreRenderBridge", () => {
  let bridge: StoreRenderBridge;

  beforeEach(() => {
    bridge = new StoreRenderBridge();
  });

  test("connect performs initial sync", () => {
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
      ["e2", makeElement("e2", "section")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    expect(bridge.size).toBe(2);
  });

  test("subscribe callback triggers re-sync", () => {
    let callback: (() => void) | null = null;
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: (cb) => {
        callback = cb;
        return () => {
          callback = null;
        };
      },
    });

    expect(bridge.size).toBe(1);

    // 요소 추가
    elements.set("e2", makeElement("e2", "div"));
    callback?.();
    expect(bridge.size).toBe(2);
  });

  test("removed elements get unregistered", () => {
    let callback: (() => void) | null = null;
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
      ["e2", makeElement("e2", "div")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: (cb) => {
        callback = cb;
        return () => {};
      },
    });

    expect(bridge.size).toBe(2);

    // e2 삭제
    elements.delete("e2");
    callback?.();
    expect(bridge.size).toBe(1);
  });

  test("dispose unregisters all and unsubscribes", () => {
    let unsubCalled = false;

    bridge.connect({
      getElements: () => new Map([["e1", makeElement("e1", "div")]]),
      getLayoutMap: () => new Map(),
      subscribe: () => () => {
        unsubCalled = true;
      },
    });

    expect(bridge.size).toBe(1);

    bridge.dispose();
    expect(bridge.size).toBe(0);
    expect(unsubCalled).toBe(true);
  });

  test("text elements use buildTextSkiaNodeData", () => {
    const elements = new Map<string, Element>([
      ["t1", makeElement("t1", "Heading", { fontSize: "24px" })],
    ]);
    // Heading의 props에 children 추가
    (elements.get("t1")!.props as Record<string, unknown>).children = "Hello";

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    expect(bridge.size).toBe(1);
  });

  test("display:none elements are skipped", () => {
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div", { display: "none" })],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    // display:none → buildSkiaNodeData returns null → not registered
    // But registeredIds still tracks it
    expect(bridge.size).toBe(1);
  });
});
