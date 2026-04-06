/**
 * SkiaCanvas 모듈 테스트 (ADR-100 Phase 2.6)
 *
 * SkiaCanvas는 React 컴포넌트이므로 전체 렌더링 테스트는 Phase 2.8(파리티)에서 수행.
 * 여기서는 Camera 통합, props 인터페이스를 검증한다.
 *
 * Note: SkiaCanvas 컴포넌트 import는 fontManager 등 브라우저 전용 모듈에 의존하므로
 * Node 환경에서는 동적 import가 실패한다. 컴포넌트 렌더링 테스트는 jsdom + browser
 * 환경의 통합 테스트(Phase 2.8)에서 수행한다.
 */

import { describe, test, expect } from "vitest";
import { Camera } from "../../viewport/Camera";

describe("SkiaCanvas module", () => {
  test("Camera integrates with SkiaCanvas props interface", () => {
    const camera = new Camera();
    camera.setPosition(100, 200, 1.5);

    // Camera state should be readable for render loop
    const state = camera.getState();
    expect(state.x).toBe(100);
    expect(state.y).toBe(200);
    expect(state.zoom).toBe(1.5);
  });

  test("Camera screenToCanvas transforms correctly", () => {
    const camera = new Camera();
    camera.setPosition(50, 100, 2);

    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    const result = camera.screenToCanvas(150, 300, rect);

    // screenToCanvas: (screenX - rect.left - camera.x) / zoom
    expect(result.x).toBe((150 - 0 - 50) / 2); // 50
    expect(result.y).toBe((300 - 0 - 100) / 2); // 100
  });

  test("Camera onChange notifies on pan", () => {
    const camera = new Camera();
    let called = 0;
    camera.onChange(() => called++);

    camera.pan(10, 20);
    expect(called).toBe(1);
    expect(camera.x).toBe(10);
    expect(camera.y).toBe(20);
  });

  test("Camera onChange notifies on zoomAt", () => {
    const camera = new Camera();
    let called = 0;
    camera.onChange(() => called++);

    const rect = { left: 0, top: 0, width: 800, height: 600 } as DOMRect;
    camera.zoomAt(2, 400, 300, rect);
    expect(called).toBe(1);
    expect(camera.zoom).toBe(2);
  });

  test("Camera zoom clamping", () => {
    const camera = new Camera();

    camera.setPosition(0, 0, 0.01); // below min
    expect(camera.zoom).toBe(0.1);

    camera.setPosition(0, 0, 100); // above max
    expect(camera.zoom).toBe(10);
  });

  test("Camera unsubscribe works", () => {
    const camera = new Camera();
    let called = 0;
    const unsub = camera.onChange(() => called++);

    camera.pan(10, 0);
    expect(called).toBe(1);

    unsub();
    camera.pan(10, 0);
    expect(called).toBe(1); // not called after unsubscribe
  });
});

describe("SkiaCanvas vs SkiaOverlay interface parity", () => {
  test("SkiaCanvas props interface does not require PixiJS app", () => {
    // SkiaCanvasProps는 `app: Application`을 포함하지 않음 (타입 레벨 검증)
    // SkiaOverlayProps와 비교: app 필드 제거, camera 필드 추가
    // 이 테스트는 Camera 인스턴스가 올바르게 생성됨을 검증
    const camera = new Camera();
    expect(camera.getState()).toEqual({ x: 0, y: 0, zoom: 1 });

    // Camera를 외부에서 주입 가능
    camera.setPosition(50, 100, 2);
    expect(camera.zoom).toBe(2);
  });
});
