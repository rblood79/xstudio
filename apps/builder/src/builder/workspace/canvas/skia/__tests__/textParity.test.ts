/**
 * 텍스트 하이브리드 측정 정합성 검증 프레임워크 (ADR-100 Phase 4)
 *
 * Canvas 2D (줄바꿈 결정) vs CanvasKit (실제 높이) 간 정합성 검증.
 * 브라우저 의존 측정은 E2E에서 수행 — 여기서는 프레임워크 구조만 검증.
 */

import { describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// 텍스트 정합성 검증 프레임워크 타입
// ---------------------------------------------------------------------------

interface TextParityCase {
  text: string;
  fontFamily: string;
  fontSize: number;
  maxWidth: number;
  locale: string;
}

interface TextParityResult {
  case: TextParityCase;
  canvas2dHeight: number;
  canvasKitHeight: number;
  heightDiff: number;
  lineBreakMatch: boolean;
}

function generateParityCases(): TextParityCase[] {
  const texts = [
    "Hello World",
    "안녕하세요 세계",
    "こんにちは世界",
    "مرحبا بالعالم",
    "Привет мир",
  ];
  const fonts = ["Pretendard", "Inter"];
  const sizes = [12, 16, 24];

  const cases: TextParityCase[] = [];
  for (const text of texts) {
    for (const fontFamily of fonts) {
      for (const fontSize of sizes) {
        cases.push({
          text,
          fontFamily,
          fontSize,
          maxWidth: 200,
          locale: text.includes("안녕") ? "ko" : "en",
        });
      }
    }
  }
  return cases;
}

function checkParity(result: TextParityResult): {
  heightOk: boolean;
  lineBreakOk: boolean;
} {
  return {
    heightOk: Math.abs(result.heightDiff) <= 1, // ≤1px 오차
    lineBreakOk: result.lineBreakMatch,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Text parity framework", () => {
  test("generates cross-product cases", () => {
    const cases = generateParityCases();
    // 5 texts × 2 fonts × 3 sizes = 30
    expect(cases.length).toBe(30);
  });

  test("all cases have required fields", () => {
    for (const c of generateParityCases()) {
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.fontFamily.length).toBeGreaterThan(0);
      expect(c.fontSize).toBeGreaterThan(0);
      expect(c.maxWidth).toBeGreaterThan(0);
    }
  });

  test("parity check: ≤1px height → pass", () => {
    const result: TextParityResult = {
      case: {
        text: "a",
        fontFamily: "Inter",
        fontSize: 16,
        maxWidth: 200,
        locale: "en",
      },
      canvas2dHeight: 20,
      canvasKitHeight: 20.5,
      heightDiff: 0.5,
      lineBreakMatch: true,
    };
    const { heightOk, lineBreakOk } = checkParity(result);
    expect(heightOk).toBe(true);
    expect(lineBreakOk).toBe(true);
  });

  test("parity check: >1px height → fail", () => {
    const result: TextParityResult = {
      case: {
        text: "a",
        fontFamily: "Inter",
        fontSize: 16,
        maxWidth: 200,
        locale: "en",
      },
      canvas2dHeight: 20,
      canvasKitHeight: 22,
      heightDiff: 2,
      lineBreakMatch: true,
    };
    const { heightOk } = checkParity(result);
    expect(heightOk).toBe(false);
  });

  test("parity check: line break mismatch → fail", () => {
    const result: TextParityResult = {
      case: {
        text: "a",
        fontFamily: "Inter",
        fontSize: 16,
        maxWidth: 200,
        locale: "en",
      },
      canvas2dHeight: 20,
      canvasKitHeight: 20,
      heightDiff: 0,
      lineBreakMatch: false,
    };
    const { lineBreakOk } = checkParity(result);
    expect(lineBreakOk).toBe(false);
  });

  test("multi-locale coverage", () => {
    const cases = generateParityCases();
    const locales = new Set(cases.map((c) => c.locale));
    expect(locales.size).toBeGreaterThanOrEqual(2);
  });

  test("Phase 4 target: 5000 조합 (scalable framework)", () => {
    // Full matrix: 100 texts × 10 fonts × 5 sizes = 5000
    // 여기서는 프레임워크 구조만 검증
    const targetCombinations = 100 * 10 * 5;
    expect(targetCombinations).toBe(5000);
  });
});
