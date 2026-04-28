import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Element } from "../../../../types/core/store.types";
import { useStore } from "../../elements";
import { historyManager } from "../../history";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Button",
    parent_id: null,
    page_id: "page-1",
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

describe("instance store actions", () => {
  const addEntrySpy = vi.spyOn(historyManager, "addEntry");

  beforeEach(() => {
    addEntrySpy.mockClear();
    historyManager.setCurrentPage("page-1");
    useStore.setState({
      currentPageId: "page-1",
      elements: [],
      elementsMap: new Map(),
      childrenMap: new Map(),
      selectedElementId: null,
      selectedElementProps: {},
      selectedElementIds: [],
      selectedElementIdsSet: new Set<string>(),
      multiSelectMode: false,
    } as never);
  });

  it("detaches a legacy instance into a standalone element", () => {
    const master = makeElement("master", {
      componentRole: "master",
      props: { label: "Master", style: { color: "red", padding: "8px" } },
    });
    const instance = makeElement("instance", {
      componentRole: "instance",
      masterId: "master",
      overrides: { label: "Instance", style: { color: "blue" } },
      props: { ignored: true },
    });

    useStore.setState({
      elements: [master, instance],
      selectedElementId: "instance",
      elementsMap: new Map([
        ["master", master],
        ["instance", instance],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = useStore.getState().detachInstance("instance");
    const detached = useStore.getState().elementsMap.get("instance");

    expect(result?.previousState).toMatchObject({
      componentRole: "instance",
      masterId: "master",
    });
    expect(detached).toMatchObject({
      id: "instance",
      componentRole: undefined,
      masterId: undefined,
      overrides: undefined,
      descendants: undefined,
      props: { label: "Instance", style: { color: "blue", padding: "8px" } },
    });
    expect(useStore.getState().componentIndex.masterToInstances.get("master"))
      .toBeUndefined();
    expect(useStore.getState().selectedElementProps.label).toBe("Instance");
    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "batch",
        elementId: "instance",
        data: expect.objectContaining({
          prevElements: [instance],
          elements: [expect.objectContaining({ id: "instance" })],
        }),
      }),
    );
  });

  it("resets a legacy instance root override field with history", async () => {
    const master = makeElement("master", {
      componentRole: "master",
      props: { label: "Master", style: { color: "red" } },
    });
    const instance = makeElement("instance", {
      componentRole: "instance",
      masterId: "master",
      overrides: { label: "Instance", style: { color: "blue" } },
    });

    useStore.setState({
      elements: [master, instance],
      selectedElementId: "instance",
      elementsMap: new Map([
        ["master", master],
        ["instance", instance],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = useStore
      .getState()
      .resetInstanceOverrideField("instance", "label");

    expect(result?.previousState).toEqual(instance);
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      overrides: { style: { color: "blue" } },
    });
    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "update",
        elementId: "instance",
        data: expect.objectContaining({
          prevElement: instance,
          element: expect.objectContaining({
            overrides: { style: { color: "blue" } },
          }),
        }),
      }),
    );

    await useStore.getState().undo();
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      overrides: { label: "Instance", style: { color: "blue" } },
    });

    await useStore.getState().redo();
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      overrides: { style: { color: "blue" } },
    });
  });

  it("resets a canonical ref props override field", () => {
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      props: { label: "Instance", style: { color: "blue" } },
    } as never);

    useStore.setState({
      elements: [ref],
      elementsMap: new Map([["ref", ref]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().resetInstanceOverrideField("ref", "label");

    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      props: { style: { color: "blue" } },
    });
  });

  it("resets a canonical ref metadata legacyProps override field", () => {
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      metadata: {
        type: "legacy-element-props",
        legacyProps: { label: "Instance", tone: "accent" },
      },
      props: { ignored: true },
    } as never);

    useStore.setState({
      elements: [ref],
      elementsMap: new Map([["ref", ref]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().resetInstanceOverrideField("ref", "label");

    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      metadata: {
        type: "legacy-element-props",
        legacyProps: { tone: "accent" },
      },
      props: { ignored: true },
    });
  });

  it("resets a canonical ref descendant override field with history", async () => {
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      descendants: {
        "slot/label": { text: "Custom label", tone: "accent" },
        icon: {
          metadata: {
            type: "legacy-element-props",
            legacyProps: { name: "check", size: "sm" },
          },
        },
      },
    } as never);

    useStore.setState({
      elements: [ref],
      elementsMap: new Map([["ref", ref]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = useStore
      .getState()
      .resetInstanceOverrideField("ref", "text", "slot/label");

    expect(result?.previousState).toEqual(ref);
    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      descendants: {
        "slot/label": { tone: "accent" },
        icon: {
          metadata: {
            type: "legacy-element-props",
            legacyProps: { name: "check", size: "sm" },
          },
        },
      },
    });
    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "update",
        elementId: "ref",
        data: expect.objectContaining({
          prevElement: ref,
          element: expect.objectContaining({
            descendants: expect.objectContaining({
              "slot/label": { tone: "accent" },
            }),
          }),
        }),
      }),
    );

    await useStore.getState().undo();
    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      descendants: {
        "slot/label": { text: "Custom label", tone: "accent" },
      },
    });
  });

  it("resets a canonical ref descendant metadata legacyProps field", () => {
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      descendants: {
        icon: {
          metadata: {
            type: "legacy-element-props",
            legacyProps: { name: "check", size: "sm" },
          },
        },
      },
    } as never);

    useStore.setState({
      elements: [ref],
      elementsMap: new Map([["ref", ref]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().resetInstanceOverrideField("ref", "name", "icon");

    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      descendants: {
        icon: {
          metadata: {
            type: "legacy-element-props",
            legacyProps: { size: "sm" },
          },
        },
      },
    });
  });

  it("materializes a canonical ref into a standalone subtree", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const master = makeElement("master", {
      reusable: true,
      props: { label: "Master", style: { color: "red", padding: "8px" } },
    });
    const child = makeElement("label", {
      type: "Text",
      parent_id: "master",
      customId: "label",
      props: { text: "OK" },
    });
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      props: { label: "Instance", style: { color: "blue" } },
      descendants: { label: { text: "Cancel" } },
    } as never);

    useStore.setState({
      elements: [master, child, ref],
      selectedElementId: "ref",
      elementsMap: new Map([
        ["master", master],
        ["label", child],
        ["ref", ref],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = useStore.getState().detachInstance("ref");
    const detachedRoot = useStore.getState().elementsMap.get("ref") as
      | (Element & { ref?: string })
      | undefined;
    const materializedChildren = useStore
      .getState()
      .elements.filter((element) => element.parent_id === "ref");

    expect(result?.previousState).toMatchObject({ type: "ref" });
    expect(detachedRoot).toMatchObject({
      id: "ref",
      type: "Button",
      reusable: undefined,
      props: { label: "Instance", style: { color: "blue", padding: "8px" } },
    });
    expect(detachedRoot?.ref).toBeUndefined();
    expect(materializedChildren).toHaveLength(1);
    expect(materializedChildren[0]).toMatchObject({
      type: "Text",
      props: { text: "Cancel" },
    });
    expect(useStore.getState().selectedElementProps.label).toBe("Instance");
    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "batch",
        elementId: "ref",
        data: expect.objectContaining({
          prevElements: [ref],
          elements: expect.arrayContaining([
            expect.objectContaining({ id: "ref", type: "Button" }),
          ]),
        }),
      }),
    );

    await useStore.getState().undo();
    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      type: "ref",
    });
    expect(
      useStore
        .getState()
        .elements.filter((element) => element.parent_id === "ref"),
    ).toHaveLength(0);

    await useStore.getState().redo();
    expect(useStore.getState().elementsMap.get("ref")).toMatchObject({
      type: "Button",
    });
    expect(
      useStore
        .getState()
        .elements.filter((element) => element.parent_id === "ref"),
    ).toHaveLength(1);
    logSpy.mockRestore();
  });

  it("materializes canonical descendants mode C children recursively", () => {
    const master = makeElement("layout", {
      type: "frame",
      reusable: true,
      props: { role: "layout" },
    });
    const slot = makeElement("main-slot", {
      type: "frame",
      parent_id: "layout",
      customId: "main-slot",
      props: { slot: true },
    });
    const ref = makeElement("page-ref", {
      type: "ref",
      ref: "layout",
      descendants: {
        "main-slot": {
          children: [
            {
              id: "card",
              type: "Card",
              metadata: {
                type: "legacy-element-props",
                legacyProps: { title: "Card title" },
              },
              children: [
                {
                  id: "card-label",
                  type: "Text",
                  metadata: {
                    type: "legacy-element-props",
                    legacyProps: { text: "Nested label" },
                  },
                },
              ],
            },
          ],
        },
      },
    } as never);

    useStore.setState({
      elements: [master, slot, ref],
      elementsMap: new Map([
        ["layout", master],
        ["main-slot", slot],
        ["page-ref", ref],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().detachInstance("page-ref");
    const detachedSlot = useStore
      .getState()
      .elements.find((element) => element.parent_id === "page-ref");
    const materializedCard = useStore
      .getState()
      .elements.find((element) => element.parent_id === detachedSlot?.id);
    const materializedLabel = useStore
      .getState()
      .elements.find((element) => element.parent_id === materializedCard?.id);

    expect(detachedSlot).toMatchObject({ type: "frame" });
    expect(materializedCard).toMatchObject({
      id: "card",
      type: "Card",
      props: { title: "Card title" },
    });
    expect(materializedLabel).toMatchObject({
      id: "card-label",
      type: "Text",
      props: { text: "Nested label" },
    });
  });

  it("materializes canonical descendants mode B as subtree replacement", () => {
    const master = makeElement("master", { reusable: true });
    const child = makeElement("label", {
      type: "Text",
      parent_id: "master",
      customId: "label",
      props: { text: "Original" },
    });
    const grandchild = makeElement("icon", {
      type: "Icon",
      parent_id: "label",
      props: { name: "check" },
    });
    const ref = makeElement("ref", {
      type: "ref",
      ref: "master",
      descendants: {
        label: {
          id: "replacement",
          type: "Heading",
          metadata: {
            type: "legacy-element-props",
            legacyProps: { text: "Replacement" },
          },
        },
      },
    } as never);

    useStore.setState({
      elements: [master, child, grandchild, ref],
      elementsMap: new Map([
        ["master", master],
        ["label", child],
        ["icon", grandchild],
        ["ref", ref],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().detachInstance("ref");
    const materializedChildren = useStore
      .getState()
      .elements.filter((element) => element.parent_id === "ref");

    expect(materializedChildren).toHaveLength(1);
    expect(materializedChildren[0]).toMatchObject({
      id: "replacement",
      type: "Heading",
      props: { text: "Replacement" },
    });
    expect(
      useStore
      .getState()
      .elements.filter((element) => element.parent_id === "replacement"),
    ).toHaveLength(0);
  });

  it("materializes nested canonical refs recursively", () => {
    const iconMaster = makeElement("icon-master", {
      type: "Icon",
      reusable: true,
      props: { name: "default-icon" },
    });
    const iconLabel = makeElement("icon-label", {
      type: "Text",
      parent_id: "icon-master",
      customId: "label",
      props: { text: "Default label" },
    });
    const buttonMaster = makeElement("button-master", {
      type: "Button",
      reusable: true,
      props: { label: "Button" },
    });
    const nestedIconRef = makeElement("nested-icon-ref", {
      type: "ref",
      ref: "icon-master",
      parent_id: "button-master",
      props: { name: "override-icon" },
      descendants: { label: { text: "Nested label" } },
    } as never);
    const buttonRef = makeElement("button-ref", {
      type: "ref",
      ref: "button-master",
    } as never);

    useStore.setState({
      elements: [
        iconMaster,
        iconLabel,
        buttonMaster,
        nestedIconRef,
        buttonRef,
      ],
      elementsMap: new Map([
        ["icon-master", iconMaster],
        ["icon-label", iconLabel],
        ["button-master", buttonMaster],
        ["nested-icon-ref", nestedIconRef],
        ["button-ref", buttonRef],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    useStore.getState().detachInstance("button-ref");
    const materializedIcon = useStore
      .getState()
      .elements.find((element) => element.parent_id === "button-ref");
    const materializedLabel = useStore
      .getState()
      .elements.find((element) => element.parent_id === materializedIcon?.id);

    expect(materializedIcon).toMatchObject({
      type: "Icon",
      props: { name: "override-icon" },
    });
    expect((materializedIcon as Element & { ref?: string })?.ref).toBeUndefined();
    expect(materializedLabel).toMatchObject({
      type: "Text",
      props: { text: "Nested label" },
    });
  });

  it("creates a component origin from a standard element with undo", async () => {
    const button = makeElement("button", {
      customId: "primary-action",
      page_id: "page-1",
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [button],
      elementsMap: new Map([["button", button]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = await useStore.getState().toggleComponentOrigin("button");

    expect(result?.previousElements).toEqual([button]);
    expect(useStore.getState().elementsMap.get("button")).toMatchObject({
      componentName: "primary-action",
      reusable: true,
    });
    expect(addEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "batch",
        elementId: "button",
      }),
    );

    await useStore.getState().undo();
    expect(
      useStore.getState().elementsMap.get("button")?.reusable,
    ).toBeUndefined();
  });

  it("removes component origin silently when no instances exist", async () => {
    const origin = makeElement("origin", {
      componentName: "CTA",
      reusable: true,
    });

    useStore.setState({
      elements: [origin],
      elementsMap: new Map([["origin", origin]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    await useStore.getState().toggleComponentOrigin("origin");

    expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
      componentName: "CTA",
      reusable: false,
      componentRole: undefined,
    });
  });

  it("removes component origin and materializes impacted instances with single undo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const origin = makeElement("origin", {
      reusable: true,
      props: { label: "Origin", style: { padding: "8px" } },
    });
    const child = makeElement("label", {
      type: "Text",
      parent_id: "origin",
      customId: "label",
      props: { text: "Default" },
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "origin",
      props: { label: "Instance" },
      descendants: { label: { text: "Custom" } },
    } as never);

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, child, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["label", child],
        ["instance", instance],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    await useStore.getState().toggleComponentOrigin("origin");
    const detachedInstance = useStore.getState().elementsMap.get("instance") as
      | (Element & { ref?: string })
      | undefined;
    const materializedChild = useStore
      .getState()
      .elements.find((element) => element.parent_id === "instance");

    expect(confirmSpy).toHaveBeenCalled();
    expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
      reusable: false,
    });
    expect(detachedInstance).toMatchObject({
      id: "instance",
      type: "Button",
      props: { label: "Instance", style: { padding: "8px" } },
    });
    expect(detachedInstance?.ref).toBeUndefined();
    expect(materializedChild).toMatchObject({
      type: "Text",
      props: { text: "Custom" },
    });

    await useStore.getState().undo();
    expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
      reusable: true,
    });
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      type: "ref",
      ref: "origin",
    });
    expect(
      useStore
        .getState()
        .elements.filter((element) => element.parent_id === "instance"),
    ).toHaveLength(0);
  });

  it("auto-detaches canonical instances when deleting their origin", async () => {
    const origin = makeElement("origin", {
      reusable: true,
      props: { label: "Origin", style: { padding: "8px" } },
    });
    const child = makeElement("label", {
      type: "Text",
      parent_id: "origin",
      customId: "label",
      props: { text: "Default" },
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "origin",
      props: { label: "Instance" },
      descendants: { label: { text: "Custom" } },
    } as never);

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, child, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["label", child],
        ["instance", instance],
      ]),
    } as never);
    useStore.getState()._rebuildIndexes();

    await useStore.getState().removeElement("origin");

    const detachedInstance = useStore.getState().elementsMap.get("instance") as
      | (Element & { ref?: string })
      | undefined;
    const materializedChild = useStore
      .getState()
      .elements.find((element) => element.parent_id === "instance");

    expect(useStore.getState().elementsMap.has("origin")).toBe(false);
    expect(useStore.getState().elementsMap.has("label")).toBe(false);
    expect(detachedInstance).toMatchObject({
      id: "instance",
      type: "Button",
      props: { label: "Instance", style: { padding: "8px" } },
    });
    expect(detachedInstance?.ref).toBeUndefined();
    expect(materializedChild).toMatchObject({
      type: "Text",
      props: { text: "Custom" },
    });

    await useStore.getState().undo();
    expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
      reusable: true,
    });
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      type: "ref",
      ref: "origin",
    });
  });

  it("removes component origin across 1000 canonical instances", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    confirmSpy.mockClear();
    const origin = makeElement("origin", {
      reusable: true,
      props: { label: "Origin" },
    });
    const instances = Array.from({ length: 1000 }, (_, index) =>
      makeElement(`instance-${index}`, {
        type: "ref",
        ref: "origin",
        props: { label: `Instance ${index}` },
      } as never),
    );

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, ...instances],
      elementsMap: new Map(
        [origin, ...instances].map((element) => [element.id, element]),
      ),
    } as never);
    useStore.getState()._rebuildIndexes();

    const result = await useStore.getState().toggleComponentOrigin("origin");

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(result?.previousElements).toHaveLength(1001);
    expect(result?.elements).toHaveLength(1001);
    expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
      reusable: false,
    });
    expect(useStore.getState().elementsMap.get("instance-999")).toMatchObject({
      type: "Button",
      props: { label: "Instance 999" },
    });
    expect(
      (useStore.getState().elementsMap.get("instance-999") as Element & {
        ref?: string;
      })?.ref,
    ).toBeUndefined();
  });

  it("falls back to the impact dialog path when T1 finds a new instance", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    confirmSpy.mockClear();
    const origin = makeElement("origin", {
      reusable: true,
      props: { label: "Origin" },
    });

    useStore.setState({
      elements: [origin],
      elementsMap: new Map([["origin", origin]]),
    } as never);
    useStore.getState()._rebuildIndexes();

    await useStore.getState().toggleComponentOrigin("origin", {
      beforeMutation: () => {
        const raceInstance = makeElement("race-instance", {
          type: "ref",
          ref: "origin",
        } as never);
        useStore.setState({
          elements: [...useStore.getState().elements, raceInstance],
          elementsMap: new Map(useStore.getState().elementsMap).set(
            "race-instance",
            raceInstance,
          ),
        } as never);
        useStore.getState()._rebuildIndexes();
      },
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const raceInstance = useStore
      .getState()
      .elementsMap.get("race-instance") as
      | (Element & { ref?: string })
      | undefined;
    expect(raceInstance).toMatchObject({ type: "Button" });
    expect(raceInstance?.ref).toBeUndefined();
  });
});
