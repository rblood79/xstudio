import { describe, test, expect } from "vitest";
import { resolveStickyY, resolveStickyX } from "../stickyResolver";

describe("stickyResolver", () => {
  describe("resolveStickyY", () => {
    test("normal state — 스크롤 전", () => {
      const y = resolveStickyY({
        elementY: 200,
        stickyTop: 0,
        scrollOffset: 0,
        containerTop: 0,
        containerBottom: 1000,
        elementHeight: 50,
      });
      expect(y).toBe(200);
    });

    test("stuck state — 스크롤 후 고정", () => {
      const y = resolveStickyY({
        elementY: 200,
        stickyTop: 10,
        scrollOffset: 250,
        containerTop: 0,
        containerBottom: 1000,
        elementHeight: 50,
      });
      // scrollOffset(250) + stickyTop(10) = 260
      expect(y).toBe(260);
    });

    test("limit state — 부모 하단 제한", () => {
      const y = resolveStickyY({
        elementY: 200,
        stickyTop: 0,
        scrollOffset: 980,
        containerTop: 0,
        containerBottom: 1000,
        elementHeight: 50,
      });
      // containerBottom(1000) - elementHeight(50) = 950
      expect(y).toBe(950);
    });

    test("stickyTop=20 offset 적용", () => {
      const y = resolveStickyY({
        elementY: 100,
        stickyTop: 20,
        scrollOffset: 200,
        containerTop: 0,
        containerBottom: 500,
        elementHeight: 40,
      });
      // scrollOffset(200) + stickyTop(20) = 220
      expect(y).toBe(220);
    });

    test("large element hits limit early", () => {
      const y = resolveStickyY({
        elementY: 100,
        stickyTop: 0,
        scrollOffset: 500,
        containerTop: 0,
        containerBottom: 600,
        elementHeight: 200,
      });
      // maxY = 600 - 200 = 400, stuckY = 500 → min(500, 400) = 400
      expect(y).toBe(400);
    });
  });

  describe("resolveStickyX", () => {
    test("normal state — 수평 스크롤 전", () => {
      const x = resolveStickyX({
        elementX: 300,
        stickyLeft: 0,
        scrollOffset: 0,
        containerLeft: 0,
        containerRight: 1000,
        elementWidth: 100,
      });
      expect(x).toBe(300);
    });

    test("stuck state — 수평 스크롤 후", () => {
      const x = resolveStickyX({
        elementX: 300,
        stickyLeft: 10,
        scrollOffset: 400,
        containerLeft: 0,
        containerRight: 1000,
        elementWidth: 100,
      });
      expect(x).toBe(410);
    });
  });
});
