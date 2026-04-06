import { describe, test, expect, beforeEach } from "vitest";
import { SceneGraph } from "../SceneGraph";
import { DirtyFlags } from "../types";

describe("SceneGraph", () => {
  let graph: SceneGraph;

  beforeEach(() => {
    graph = new SceneGraph();
  });

  test("createNode adds to graph", () => {
    graph.createNode("root", "Box", null);
    expect(graph.size).toBe(1);
    expect(graph.getNode("root")?.tag).toBe("Box");
  });

  test("parent-child relationship", () => {
    graph.createNode("parent", "Box", null);
    graph.createNode("child1", "Text", "parent");
    graph.createNode("child2", "Image", "parent");

    const children = graph.getChildren("parent");
    expect(children.length).toBe(2);
    expect(children[0].id).toBe("child1");
    expect(children[1].id).toBe("child2");
  });

  test("removeNode removes recursively", () => {
    graph.createNode("root", "Box", null);
    graph.createNode("child", "Text", "root");
    graph.createNode("grandchild", "Span", "child");

    graph.removeNode("child");
    expect(graph.size).toBe(1); // only root
    expect(graph.getChildren("root").length).toBe(0);
  });

  test("moveNode reparents", () => {
    graph.createNode("parent1", "Box", null);
    graph.createNode("parent2", "Box", null);
    graph.createNode("child", "Text", "parent1");

    graph.moveNode("child", "parent2", 0);

    expect(graph.getChildren("parent1").length).toBe(0);
    expect(graph.getChildren("parent2").length).toBe(1);
    expect(graph.getNode("child")?.parentId).toBe("parent2");
  });

  test("dirty tracking", () => {
    graph.createNode("n1", "Box", null);
    graph.clearDirty();

    expect(graph.dirtyCount).toBe(0);

    graph.updateStyle("n1", { display: "grid" });
    expect(graph.dirtyCount).toBe(1);
    expect(graph.collectDirtyNodes()).toEqual(["n1"]);

    graph.clearDirty();
    expect(graph.dirtyCount).toBe(0);
    expect(graph.getNode("n1")?.dirty).toBe(DirtyFlags.NONE);
  });

  test("getVisibleNodes with viewport", () => {
    graph.createNode("visible", "Box", null);
    graph.updateLayout("visible", { x: 50, y: 50, width: 100, height: 100 });

    graph.createNode("offscreen", "Box", null);
    graph.updateLayout("offscreen", {
      x: 2000,
      y: 2000,
      width: 100,
      height: 100,
    });

    const viewport = { x: 0, y: 0, width: 500, height: 500 };
    const visible = graph.getVisibleNodes(viewport);

    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe("visible");
  });
});
