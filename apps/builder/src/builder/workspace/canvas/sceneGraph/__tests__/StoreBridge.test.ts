import { describe, test, expect, beforeEach } from "vitest";
import { SceneGraph } from "../SceneGraph";
import { StoreBridge } from "../StoreBridge";

describe("StoreBridge", () => {
  let graph: SceneGraph;
  let bridge: StoreBridge;

  beforeEach(() => {
    graph = new SceneGraph();
    bridge = new StoreBridge(graph);
  });

  test("fullSync creates nodes from store", () => {
    const elementsMap = new Map([
      [
        "el-1",
        {
          id: "el-1",
          tag: "Box",
          parent_id: null,
          properties: { style: { display: "flex" } },
        },
      ],
      [
        "el-2",
        {
          id: "el-2",
          tag: "Text",
          parent_id: "el-1",
          properties: { style: { fontSize: "14px" } },
        },
      ],
    ]);

    bridge.fullSync({ elementsMap, childrenMap: new Map() });

    expect(graph.size).toBe(2);
    expect(graph.getNode("el-1")?.tag).toBe("Box");
    expect(graph.getNode("el-2")?.parentId).toBe("el-1");
  });

  test("fullSync sets initial prevElementIds so re-sync detects diffs", () => {
    const elementsMap = new Map([
      [
        "el-1",
        {
          id: "el-1",
          tag: "Box",
          parent_id: null,
          properties: {},
        },
      ],
    ]);

    bridge.fullSync({ elementsMap, childrenMap: new Map() });
    expect(graph.size).toBe(1);
  });

  test("flush processes create changes", () => {
    // Start empty
    bridge.fullSync({ elementsMap: new Map(), childrenMap: new Map() });

    // Manually simulate what diffAndQueue would queue
    (
      bridge as unknown as {
        changeQueue: Array<{
          type: string;
          id: string;
          data?: Record<string, unknown>;
        }>;
      }
    ).changeQueue.push({
      type: "create",
      id: "new-el",
      data: { tag: "Box", parentId: null, style: {} },
    });

    bridge.flush();

    expect(graph.size).toBe(1);
    expect(graph.getNode("new-el")?.tag).toBe("Box");
    expect(bridge.pendingChanges).toBe(0);
  });

  test("flush processes update changes", () => {
    bridge.fullSync({
      elementsMap: new Map([
        [
          "el-1",
          {
            id: "el-1",
            tag: "Box",
            parent_id: null,
            properties: { style: { display: "block" } },
          },
        ],
      ]),
      childrenMap: new Map(),
    });

    (
      bridge as unknown as {
        changeQueue: Array<{
          type: string;
          id: string;
          data?: Record<string, unknown>;
        }>;
      }
    ).changeQueue.push({
      type: "update",
      id: "el-1",
      data: { display: "flex" },
    });

    bridge.flush();

    expect(graph.getNode("el-1")?.style.display).toBe("flex");
  });

  test("flush processes remove changes", () => {
    bridge.fullSync({
      elementsMap: new Map([
        ["el-1", { id: "el-1", tag: "Box", parent_id: null, properties: {} }],
      ]),
      childrenMap: new Map(),
    });

    expect(graph.size).toBe(1);

    (
      bridge as unknown as {
        changeQueue: Array<{ type: string; id: string }>;
      }
    ).changeQueue.push({ type: "remove", id: "el-1" });

    bridge.flush();

    expect(graph.size).toBe(0);
  });

  test("pendingChanges reflects queue length", () => {
    bridge.fullSync({ elementsMap: new Map(), childrenMap: new Map() });
    expect(bridge.pendingChanges).toBe(0);

    const queue = (
      bridge as unknown as {
        changeQueue: Array<{ type: string; id: string }>;
      }
    ).changeQueue;
    queue.push({ type: "remove", id: "x" });
    expect(bridge.pendingChanges).toBe(1);
  });

  test("flush is idempotent on empty queue", () => {
    bridge.fullSync({ elementsMap: new Map(), childrenMap: new Map() });
    bridge.flush();
    bridge.flush();
    expect(graph.size).toBe(0);
  });

  test("dispose clears queue and unsubscribes", () => {
    let unsubCalled = false;
    const fakeSubscribe = (listener: () => void) => {
      void listener;
      return () => {
        unsubCalled = true;
      };
    };
    const fakeGetState = () => ({
      elementsMap: new Map<
        string,
        {
          id: string;
          tag: string;
          parent_id: string | null;
          properties: Record<string, unknown>;
        }
      >(),
      childrenMap: new Map<string, string[]>(),
    });

    bridge.connect(fakeSubscribe, fakeGetState);
    bridge.dispose();

    expect(unsubCalled).toBe(true);
    expect(bridge.pendingChanges).toBe(0);
  });

  test("connect performs fullSync on initial call", () => {
    const elementsMap = new Map([
      ["root", { id: "root", tag: "Box", parent_id: null, properties: {} }],
    ]);

    bridge.connect(
      (_listener) => () => undefined,
      () => ({ elementsMap, childrenMap: new Map() }),
    );

    expect(graph.size).toBe(1);
    expect(graph.getNode("root")?.tag).toBe("Box");
  });
});
