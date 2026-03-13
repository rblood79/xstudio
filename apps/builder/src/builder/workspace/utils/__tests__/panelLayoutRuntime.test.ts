import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PANEL_LAYOUT } from "../../../panels/core/types";

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  private readonly callback: ResizeObserverCallback;
  private target: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.target = target;
  }

  disconnect(): void {
    this.target = null;
  }

  emit(width: number): void {
    if (!this.target) return;
    const entry = {
      contentBoxSize: [{ inlineSize: width }],
      target: this.target,
    } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

function createPanelElement(width: number): HTMLElement {
  return {
    offsetWidth: width,
    getBoundingClientRect: () => ({
      width,
      height: 0,
      top: 0,
      right: width,
      bottom: 0,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLElement;
}

describe("panelLayoutRuntime", () => {
  let useStore: typeof import("../../../stores").useStore;
  let runtime: typeof import("../panelLayoutRuntime");

  beforeEach(async () => {
    vi.resetModules();
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    ({ useStore } = await import("../../../stores"));
    runtime = await import("../panelLayoutRuntime");
    runtime.resetPanelLayoutRuntimeForTests();

    useStore.getState().setPanelLayout({
      ...DEFAULT_PANEL_LAYOUT,
      showLeft: true,
      showRight: true,
      activeLeftPanels: ["nodes"],
      activeRightPanels: ["styles"],
    });
  });

  afterEach(() => {
    runtime?.resetPanelLayoutRuntimeForTests();
    vi.unstubAllGlobals();
  });

  it("등록된 패널 DOM의 실제 너비를 inset으로 사용한다", () => {
    runtime.registerPanelElement("left", createPanelElement(280));
    runtime.registerPanelElement("right", createPanelElement(320));

    expect(runtime.measureWorkspacePanelInsets()).toEqual({
      left: 280,
      right: 320,
    });

    useStore.getState().setPanelLayout({
      ...useStore.getState().panelLayout,
      showRight: false,
    });

    expect(runtime.measureWorkspacePanelInsets()).toEqual({
      left: 280,
      right: 0,
    });
  });

  it("토글 변경과 ResizeObserver 변경을 모두 구독한다", () => {
    runtime.registerPanelElement("left", createPanelElement(280));
    const events: string[] = [];
    const unsubscribe = runtime.subscribeToPanelLayoutChanges({
      onToggle: () => events.push("toggle"),
      onLayoutChange: () => events.push("layout"),
    });

    useStore.getState().setPanelLayout({
      ...useStore.getState().panelLayout,
      showLeft: false,
    });

    expect(events).toEqual(["toggle", "layout"]);

    events.length = 0;
    MockResizeObserver.instances[0]?.emit(240);

    expect(events).toEqual(["layout"]);
    unsubscribe();
  });
});
