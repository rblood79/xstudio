import { describe, expect, it } from "vitest";
import {
  buildAspectRatioStyleUpdates,
  hasEnabledAspectRatio,
  isAutoLikeSize,
  parseAspectRatio,
  shouldSetAutoHeightForAspectRatio,
} from "./aspectRatio";

describe("aspectRatio utils", () => {
  it('"16 / 9"를 숫자 비율로 파싱한다', () => {
    expect(parseAspectRatio("16 / 9")).toBeCloseTo(16 / 9);
  });

  it("숫자 문자열도 허용한다", () => {
    expect(parseAspectRatio("1.777")).toBeCloseTo(1.777);
  });

  it("reset/auto/빈 값은 비활성으로 처리한다", () => {
    expect(parseAspectRatio("reset")).toBeUndefined();
    expect(parseAspectRatio("auto")).toBeUndefined();
    expect(parseAspectRatio("")).toBeUndefined();
    expect(hasEnabledAspectRatio("reset")).toBe(false);
  });

  it("auto 계열 크기 값을 판별한다", () => {
    expect(isAutoLikeSize(undefined)).toBe(true);
    expect(isAutoLikeSize("auto")).toBe(true);
    expect(isAutoLikeSize("fit-content")).toBe(true);
    expect(isAutoLikeSize("100px")).toBe(false);
  });

  it("height가 비어 있고 resolvedHeight도 없으면 auto 보정을 적용한다", () => {
    expect(shouldSetAutoHeightForAspectRatio("320px", undefined)).toBe(true);
  });

  it("width와 height가 모두 고정값이면 auto height를 강제한다", () => {
    expect(shouldSetAutoHeightForAspectRatio("320px", "180px")).toBe(true);
  });

  it("height가 이미 auto 계열이면 추가 보정을 하지 않는다", () => {
    expect(shouldSetAutoHeightForAspectRatio("320px", "auto")).toBe(true);
    expect(
      buildAspectRatioStyleUpdates("16 / 9", {
        width: "320px",
        height: "auto",
      }),
    ).toEqual({
      aspectRatio: "16 / 9",
    });
  });

  it("UI 업데이트는 고정 height일 때만 auto를 함께 설정한다", () => {
    expect(
      buildAspectRatioStyleUpdates("16 / 9", {
        width: "320px",
        height: "180px",
      }),
    ).toEqual({
      aspectRatio: "16 / 9",
      height: "auto",
    });
  });

  it("reset은 aspectRatio만 비운다", () => {
    expect(
      buildAspectRatioStyleUpdates("reset", {
        width: "320px",
        height: "180px",
      }),
    ).toEqual({
      aspectRatio: "",
    });
  });
});
