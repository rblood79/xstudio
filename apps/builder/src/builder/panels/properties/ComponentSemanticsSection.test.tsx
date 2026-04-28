// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Element } from "../../../types/core/store.types";
import { historyManager } from "../../stores/history";
import { useStore } from "../../stores";
import { ComponentSemanticsSection } from "./ComponentSemanticsSection";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Button",
    parent_id: null,
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

describe("ComponentSemanticsSection", () => {
  beforeEach(() => {
    historyManager.setCurrentPage("page-1");
    useStore.setState({
      elementsMap: new Map(),
      currentPageId: null,
      elements: [],
      multiSelectMode: false,
      selectedElementId: null,
      selectedElementIds: [],
      selectedElementIdsSet: new Set<string>(),
      selectedElementProps: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("renders Origin label for reusable element", () => {
    useStore.setState({
      elementsMap: new Map([
        ["origin", makeElement("origin", { reusable: true })],
      ]),
    });

    render(<ComponentSemanticsSection elementId="origin" />);

    expect(screen.getByText("Component")).toBeTruthy();
    expect(screen.getByText("Role")).toBeTruthy();
    expect(screen.getByText("Origin")).toBeTruthy();
  });

  it("renders Instance label for ref element", () => {
    useStore.setState({
      elementsMap: new Map([
        [
          "instance",
          makeElement("instance", { type: "ref", ref: "origin" } as never),
        ],
      ]),
    });

    render(<ComponentSemanticsSection elementId="instance" />);

    expect(screen.getByText("Instance")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Detach instance" }),
    ).toBeTruthy();
  });

  it("renders Standard label for plain element", () => {
    useStore.setState({
      elementsMap: new Map([["plain", makeElement("plain")]]),
    });

    render(<ComponentSemanticsSection elementId="plain" />);

    expect(screen.getByText("Component")).toBeTruthy();
    expect(screen.getByText("Role")).toBeTruthy();
    expect(screen.getByText("Standard")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Create component" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Detach instance" }),
    ).toBeNull();
  });

  it("renders nothing for missing element", () => {
    const { container } = render(
      <ComponentSemanticsSection elementId="missing" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("standard action creates a reusable component origin", async () => {
    const plain = makeElement("plain", {
      customId: "primary-action",
      page_id: "page-1",
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [plain],
      elementsMap: new Map([["plain", plain]]),
    });
    useStore.getState()._rebuildIndexes();

    render(<ComponentSemanticsSection elementId="plain" />);
    fireEvent.click(screen.getByRole("button", { name: "Create component" }));

    await waitFor(() => {
      expect(useStore.getState().elementsMap.get("plain")).toMatchObject({
        componentName: "primary-action",
        reusable: true,
      });
    });
  });

  it("origin action removes component status when no instances exist", async () => {
    const origin = makeElement("origin", {
      page_id: "page-1",
      reusable: true,
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin],
      elementsMap: new Map([["origin", origin]]),
    });
    useStore.getState()._rebuildIndexes();

    render(<ComponentSemanticsSection elementId="origin" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove component" }));

    await waitFor(() => {
      expect(useStore.getState().elementsMap.get("origin")).toMatchObject({
        reusable: false,
      });
    });
  });

  it("instance action selects its origin", () => {
    const origin = makeElement("origin", { page_id: "page-1", reusable: true });
    const instance = makeElement("instance", {
      masterId: "origin",
      page_id: "page-1",
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });

    render(<ComponentSemanticsSection elementId="instance" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to component" }));

    expect(useStore.getState().selectedElementId).toBe("origin");
    expect(useStore.getState().selectedElementIds).toEqual(["origin"]);
  });

  it("canonical instance action selects its origin by custom id", () => {
    const origin = makeElement("origin", {
      customId: "NumberField",
      page_id: "page-1",
      reusable: true,
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "NumberField",
      page_id: "page-1",
    } as never);

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });

    render(<ComponentSemanticsSection elementId="instance" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to component" }));

    expect(useStore.getState().selectedElementId).toBe("origin");
    expect(useStore.getState().selectedElementIds).toEqual(["origin"]);
  });

  it("origin action multi-selects all matching instances", () => {
    const origin = makeElement("origin", { page_id: "page-1", reusable: true });
    const instanceA = makeElement("instance-a", {
      masterId: "origin",
      page_id: "page-1",
    });
    const instanceB = makeElement("instance-b", {
      masterId: "origin",
      page_id: "page-1",
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, instanceA, instanceB],
      elementsMap: new Map([
        ["origin", origin],
        ["instance-a", instanceA],
        ["instance-b", instanceB],
      ]),
    });

    render(<ComponentSemanticsSection elementId="origin" />);
    expect(screen.getByText("2 instances")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "Remove component",
      }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Select instances (2)" }));

    expect(useStore.getState().selectedElementIds).toEqual([
      "instance-a",
      "instance-b",
    ]);
    expect(useStore.getState().multiSelectMode).toBe(true);
  });

  it("legacy instance detach action asks before detaching", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const origin = makeElement("origin", {
      componentRole: "master",
      page_id: "page-1",
      props: { label: "Origin" },
    });
    const instance = makeElement("instance", {
      componentRole: "instance",
      masterId: "origin",
      page_id: "page-1",
      overrides: { label: "Detached" },
    });

    useStore.setState({
      currentPageId: "page-1",
      selectedElementId: "instance",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });
    useStore.getState()._rebuildIndexes();

    render(<ComponentSemanticsSection elementId="instance" />);
    fireEvent.click(screen.getByRole("button", { name: "Detach instance" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      componentRole: undefined,
      masterId: undefined,
      overrides: undefined,
      props: { label: "Detached" },
    });
  });

  it("renders root override fields and resets one override", () => {
    const origin = makeElement("origin", {
      componentRole: "master",
      page_id: "page-1",
      props: { label: "Origin" },
    });
    const instance = makeElement("instance", {
      componentRole: "instance",
      masterId: "origin",
      page_id: "page-1",
      overrides: { label: "Detached", style: { color: "blue" } },
    });

    useStore.setState({
      currentPageId: "page-1",
      selectedElementId: "instance",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });
    useStore.getState()._rebuildIndexes();

    render(<ComponentSemanticsSection elementId="instance" />);
    expect(screen.getByLabelText("Overrides")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Reset label override" }),
    );

    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      overrides: { style: { color: "blue" } },
    });
    expect(
      screen.queryByRole("button", { name: "Reset label override" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Reset style override" }),
    ).toBeTruthy();
  });

  it("renders descendant override fields and resets one override", () => {
    const origin = makeElement("origin", {
      page_id: "page-1",
      reusable: true,
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "origin",
      page_id: "page-1",
      descendants: {
        "slot/label": { text: "Custom label", tone: "accent" },
      },
    } as never);

    useStore.setState({
      currentPageId: "page-1",
      selectedElementId: "instance",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });
    useStore.getState()._rebuildIndexes();

    render(<ComponentSemanticsSection elementId="instance" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset slot/label.text override",
      }),
    );

    expect(useStore.getState().elementsMap.get("instance")).toMatchObject({
      descendants: {
        "slot/label": { tone: "accent" },
      },
    });
    expect(
      screen.queryByRole("button", {
        name: "Reset slot/label.text override",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Reset slot/label.tone override",
      }),
    ).toBeTruthy();
  });

  it("legacy instance detach action preserves the instance when cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const origin = makeElement("origin", { componentRole: "master" });
    const instance = makeElement("instance", {
      componentRole: "instance",
      masterId: "origin",
      overrides: { label: "Detached" },
    });

    useStore.setState({
      currentPageId: "page-1",
      elements: [origin, instance],
      elementsMap: new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    });

    render(<ComponentSemanticsSection elementId="instance" />);
    fireEvent.click(screen.getByRole("button", { name: "Detach instance" }));

    expect(useStore.getState().elementsMap.get("instance")).toBe(instance);
  });
});
