import { describe, test, expect } from "vitest";
import { resolveStickyY, resolveStickyX } from "../../layout/stickyResolver";

describe("sticky pipeline integration", () => {
  test("sticky 요소의 렌더 좌표가 스크롤에 따라 보정됨", () => {
    const renderY = resolveStickyY({
      elementY: 200,
      stickyTop: 10,
      scrollOffset: 300,
      containerTop: 0,
      containerBottom: 1000,
      elementHeight: 50,
    });
    expect(renderY).toBe(310); // 300 + 10
  });

  test("스크롤 전(normal 상태)에는 원래 y를 반환", () => {
    const renderY = resolveStickyY({
      elementY: 50,
      stickyTop: 10,
      scrollOffset: 0,
      containerTop: 0,
      containerBottom: 500,
      elementHeight: 30,
    });
    expect(renderY).toBe(50); // elementY >= viewportTop(0+10=10) → normal
  });

  test("fixed는 containerBottom=Infinity로 제한 없음", () => {
    const renderY = resolveStickyY({
      elementY: 100,
      stickyTop: 0,
      scrollOffset: 5000,
      containerTop: 0,
      containerBottom: Infinity,
      elementHeight: 50,
    });
    expect(renderY).toBe(5000); // scrollOffset + stickyTop(0) = 5000
  });

  test("limit 상태: 부모 하단에 도달하면 containerBottom - elementHeight로 제한", () => {
    const renderY = resolveStickyY({
      elementY: 200,
      stickyTop: 10,
      scrollOffset: 950,
      containerTop: 0,
      containerBottom: 1000,
      elementHeight: 50,
    });
    // stuckY = 950 + 10 = 960, maxY = 1000 - 50 = 950 → min(960, 950) = 950
    expect(renderY).toBe(950);
  });

  test("수평 sticky", () => {
    const renderX = resolveStickyX({
      elementX: 100,
      stickyLeft: 5,
      scrollOffset: 200,
      containerLeft: 0,
      containerRight: 500,
      elementWidth: 80,
    });
    expect(renderX).toBe(205); // 200 + 5
  });

  test("수평 sticky — normal 상태", () => {
    const renderX = resolveStickyX({
      elementX: 100,
      stickyLeft: 5,
      scrollOffset: 0,
      containerLeft: 0,
      containerRight: 500,
      elementWidth: 80,
    });
    expect(renderX).toBe(100); // elementX(100) >= viewportLeft(0+5=5) → normal
  });

  test("수평 sticky — limit 상태", () => {
    const renderX = resolveStickyX({
      elementX: 100,
      stickyLeft: 5,
      scrollOffset: 430,
      containerLeft: 0,
      containerRight: 500,
      elementWidth: 80,
    });
    // stuckX = 430 + 5 = 435, maxX = 500 - 80 = 420 → min(435, 420) = 420
    expect(renderX).toBe(420);
  });
});
