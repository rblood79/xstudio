import { describe, test, expect } from "vitest";
import { Camera } from "../Camera";

describe("Camera", () => {
  test("initial state", () => {
    const cam = new Camera();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
  });

  test("screenToCanvas at zoom 1", () => {
    const cam = new Camera();
    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    const pt = cam.screenToCanvas(100, 200, rect);
    expect(pt.x).toBe(100);
    expect(pt.y).toBe(200);
  });

  test("screenToCanvas with pan", () => {
    const cam = new Camera();
    cam.pan(50, 100);
    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    const pt = cam.screenToCanvas(100, 200, rect);
    expect(pt.x).toBe(50); // (100 - 50) / 1
    expect(pt.y).toBe(100); // (200 - 100) / 1
  });

  test("screenToCanvas with zoom", () => {
    const cam = new Camera();
    cam.zoom = 2;
    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    const pt = cam.screenToCanvas(200, 400, rect);
    expect(pt.x).toBe(100); // 200 / 2
    expect(pt.y).toBe(200); // 400 / 2
  });

  test("zoom clamps to [0.1, 10]", () => {
    const cam = new Camera();
    cam.setPosition(0, 0, 0.01);
    expect(cam.zoom).toBe(0.1);
    cam.setPosition(0, 0, 100);
    expect(cam.zoom).toBe(10);
  });

  test("onChange notifies listeners", () => {
    const cam = new Camera();
    let called = 0;
    cam.onChange(() => called++);
    cam.pan(10, 0);
    expect(called).toBe(1);
  });
});
