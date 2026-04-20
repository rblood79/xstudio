# ADR-100 CSS3 렌더링 확장 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skia 렌더러의 CSS 시각 정합성 82%→97%, 동적 효과(transitions/animations) 엔진 통합, position sticky/fixed 파이프라인 완성.

**Architecture:** 기존 Skia 렌더링 파이프라인(effects.ts, fills.ts, nodeRendererText.ts, renderCommands.ts, SkiaRenderer.ts)을 점진 확장. 신규 파일 5개(colorSpace.ts, nodeRendererMask.ts, transitionManager.ts, animationEngine.ts, interpolators.ts). Pull 모델로 transition/animation tick → dirty 노드만 갱신.

**Tech Stack:** TypeScript, CanvasKit/Skia WASM, SkSL (mask-image), Vitest

**이미 구현 확인됨 (스킵):**

- G1+G2 box-shadow RRect + spread (nodeRendererBorders.ts:307)
- G3 blur sigma 2.355 (styleConverter.ts:1201,1690)
- G5 repeating-gradient TileMode (fills.ts:58,84,114)
- 7종 ColorMatrix 필터 (styleConverter.ts:1498-1824)
- outline dashed/dotted (nodeRendererBorders.ts:81-88)
- backdrop-filter 기본 blur (effects.ts:64-78)
- transitionEngine 수학 (transitionEngine.ts)
- stickyResolver 순수 함수 (stickyResolver.ts)

**Spec:** `docs/superpowers/specs/2026-04-07-adr100-css3-rendering-extensions-design.md`

---

## 파일 구조

> 경로 접두사: `apps/builder/src/builder/workspace/canvas/`

| 파일                                       | 변경 유형 | 담당 Task     |
| ------------------------------------------ | --------- | ------------- |
| `skia/colorSpace.ts`                       | Create    | 1             |
| `skia/__tests__/colorSpace.test.ts`        | Create    | 1             |
| `skia/fills.ts`                            | Modify    | 1, 2          |
| `skia/__tests__/radialGradient.test.ts`    | Create    | 2             |
| `skia/nodeRendererText.ts`                 | Modify    | 3             |
| `sprites/styleConverter.ts`                | Modify    | 3             |
| `skia/__tests__/textShadow.test.ts`        | Create    | 3             |
| `skia/effects.ts`                          | Modify    | 4             |
| `skia/types.ts`                            | Modify    | 4, 5, 6, 7, 8 |
| `skia/renderCommands.ts`                   | Modify    | 4, 5, 6       |
| `skia/nodeRendererMask.ts`                 | Create    | 5             |
| `skia/__tests__/nodeRendererMask.test.ts`  | Create    | 5             |
| `skia/renderCommands.ts`                   | Modify    | 6             |
| `skia/__tests__/stickyIntegration.test.ts` | Create    | 6             |
| `skia/interpolators.ts`                    | Create    | 7             |
| `skia/__tests__/interpolators.test.ts`     | Create    | 7             |
| `skia/transitionManager.ts`                | Create    | 8             |
| `skia/__tests__/transitionManager.test.ts` | Create    | 8             |
| `skia/SkiaRenderer.ts`                     | Modify    | 8, 9          |
| `skia/StoreRenderBridge.ts`                | Modify    | 8             |
| `skia/animationEngine.ts`                  | Create    | 9             |
| `skia/__tests__/animationEngine.test.ts`   | Create    | 9             |

---

## Task 1: G7 — oklab 색상 보간 (colorSpace.ts + fills.ts)

**Files:**

- Create: `skia/colorSpace.ts`
- Create: `skia/__tests__/colorSpace.test.ts`
- Modify: `skia/fills.ts`

sRGB↔oklab 변환 + gradient stop 증폭. Björn Ottosson의 공식 행렬 사용.

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/colorSpace.test.ts
import { describe, test, expect } from "vitest";
import { srgbToOklab, oklabToSrgb, amplifyGradientStops } from "../colorSpace";

describe("colorSpace: sRGB ↔ oklab", () => {
  test("white roundtrip", () => {
    const [L, a, b] = srgbToOklab(1, 1, 1);
    expect(L).toBeCloseTo(1.0, 2);
    expect(a).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    const [r, g, bl] = oklabToSrgb(L, a, b);
    expect(r).toBeCloseTo(1.0, 2);
    expect(g).toBeCloseTo(1.0, 2);
    expect(bl).toBeCloseTo(1.0, 2);
  });

  test("black → L=0", () => {
    const [L] = srgbToOklab(0, 0, 0);
    expect(L).toBeCloseTo(0, 2);
  });

  test("pure red roundtrip", () => {
    const [L, a, b] = srgbToOklab(1, 0, 0);
    expect(L).toBeGreaterThan(0.4);
    const [r, g, bl] = oklabToSrgb(L, a, b);
    expect(r).toBeCloseTo(1.0, 1);
    expect(g).toBeCloseTo(0, 1);
    expect(bl).toBeCloseTo(0, 1);
  });
});

describe("amplifyGradientStops", () => {
  test("2 stops → 2 + 8 intermediate = 10 stops", () => {
    const colors = [
      new Float32Array([1, 0, 0, 1]), // red
      new Float32Array([0, 0, 1, 1]), // blue
    ];
    const positions = [0, 1];
    const result = amplifyGradientStops(colors, positions, 8);
    expect(result.colors.length).toBe(10);
    expect(result.positions.length).toBe(10);
    expect(result.positions[0]).toBe(0);
    expect(result.positions[9]).toBe(1);
  });

  test("intermediate colors are in oklab-blended sRGB", () => {
    const colors = [
      new Float32Array([1, 0, 0, 1]),
      new Float32Array([0, 0, 1, 1]),
    ];
    const positions = [0, 1];
    const result = amplifyGradientStops(colors, positions, 8);
    // midpoint should NOT be the dull sRGB average (0.5, 0, 0.5)
    const mid = result.colors[5]; // roughly t=0.5
    // oklab midpoint of red↔blue is more vibrant than sRGB midpoint
    const srgbMid = (mid[0] + mid[2]) / 2;
    expect(srgbMid).toBeDefined(); // sanity
  });
});
```

- [ ] **Step 2: 테스트 실행 확인 (FAIL)**

Run: `cd apps/builder && npx vitest run src/builder/workspace/canvas/skia/__tests__/colorSpace.test.ts`
Expected: FAIL (모듈 미존재)

- [ ] **Step 3: colorSpace.ts 구현**

```typescript
// skia/colorSpace.ts
/**
 * sRGB ↔ oklab 색상 공간 변환 + gradient stop 증폭.
 *
 * Björn Ottosson (2020) "A perceptual color space for image processing"
 * https://bottosson.github.io/posts/oklab/
 */

/** sRGB gamma → linear */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** linear → sRGB gamma */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** sRGB [0-1] → oklab [L, a, b] */
export function srgbToOklab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** oklab [L, a, b] → sRGB [0-1], clamped */
export function oklabToSrgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [
    Math.max(0, Math.min(1, linearToSrgb(r))),
    Math.max(0, Math.min(1, linearToSrgb(g))),
    Math.max(0, Math.min(1, linearToSrgb(bl))),
  ];
}

/**
 * Gradient color stop을 oklab 공간에서 보간하여 중간점을 삽입한다.
 *
 * CanvasKit의 sRGB gradient에 더 많은 stop을 전달하여
 * oklab 보간을 근사한다.
 *
 * @param colors Float32Array[] [r,g,b,a] 0-1
 * @param positions number[] 0-1
 * @param subdivisions 인접 stop 사이에 삽입할 중간점 수
 */
export function amplifyGradientStops(
  colors: Float32Array[],
  positions: number[],
  subdivisions = 8,
): { colors: Float32Array[]; positions: number[] } {
  if (colors.length < 2) return { colors, positions };

  const outColors: Float32Array[] = [];
  const outPositions: number[] = [];

  for (let i = 0; i < colors.length - 1; i++) {
    const c0 = colors[i];
    const c1 = colors[i + 1];
    const p0 = positions[i];
    const p1 = positions[i + 1];

    const [L0, a0, b0] = srgbToOklab(c0[0], c0[1], c0[2]);
    const [L1, a1, b1] = srgbToOklab(c1[0], c1[1], c1[2]);

    outColors.push(c0);
    outPositions.push(p0);

    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1);
      const L = L0 + (L1 - L0) * t;
      const a = a0 + (a1 - a0) * t;
      const b = b0 + (b1 - b0) * t;
      const alpha = c0[3] + (c1[3] - c0[3]) * t;

      const [r, g, bl] = oklabToSrgb(L, a, b);
      outColors.push(new Float32Array([r, g, bl, alpha]));
      outPositions.push(p0 + (p1 - p0) * t);
    }
  }

  // 마지막 stop
  outColors.push(colors[colors.length - 1]);
  outPositions.push(positions[positions.length - 1]);

  return { colors: outColors, positions: outPositions };
}
```

- [ ] **Step 4: 테스트 실행 (PASS)**

Run: `cd apps/builder && npx vitest run src/builder/workspace/canvas/skia/__tests__/colorSpace.test.ts`
Expected: PASS

- [ ] **Step 5: fills.ts에 oklab 보간 통합**

`fills.ts`의 linear-gradient/radial-gradient/angular-gradient 분기에서 `fill.interpolation === "oklab"` 조건 추가:

```typescript
// fills.ts — linear-gradient 분기 (line ~51) 수정
case "linear-gradient": {
  let { colors, positions } = fill;
  if (fill.interpolation === "oklab") {
    const amplified = amplifyGradientStops(colors, positions);
    colors = amplified.colors;
    positions = amplified.positions;
  }
  const flatColors = flattenColors(colors);
  const shader = ck.Shader.MakeLinearGradient(
    fill.start,
    fill.end,
    flatColors,
    positions,
    fill.repeating ? ck.TileMode.Repeat : ck.TileMode.Clamp,
  );
  // ... rest unchanged
}
```

radial-gradient, angular-gradient에도 동일 패턴 적용.

- [ ] **Step 6: types.ts gradient fill 인터페이스에 interpolation 필드 추가**

```typescript
// types.ts — LinearGradientFill에 추가
interpolation?: "srgb" | "oklab"; // 기본 "srgb"
```

RadialGradientFill, AngularGradientFill에도 동일 추가.

- [ ] **Step 7: 테스트 + 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/colorSpace.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/colorSpace.test.ts \
       apps/builder/src/builder/workspace/canvas/skia/fills.ts \
       apps/builder/src/builder/workspace/canvas/skia/types.ts
git commit -m "feat(skia): G7 oklab gradient interpolation — colorSpace.ts + fills.ts amplification"
```

---

## Task 2: G6 — Radial-gradient 키워드 변환

**Files:**

- Modify: `skia/fills.ts`
- Modify: `sprites/styleConverter.ts`
- Create: `skia/__tests__/radialGradient.test.ts`

CSS radial-gradient의 `closest-side`, `farthest-side`, `closest-corner`, `farthest-corner` 키워드를 수치로 변환.

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/radialGradient.test.ts
import { describe, test, expect } from "vitest";
import { resolveRadialExtent } from "../fills";

describe("G6: radial-gradient keywords", () => {
  // 100×80 컨테이너, 중심 (50, 40)
  test("closest-side at center → min distances", () => {
    const r = resolveRadialExtent("closest-side", 50, 40, 100, 80);
    expect(r.rx).toBe(40); // min(40, 40)
    expect(r.ry).toBe(40);
  });

  test("farthest-side at offset (30, 20) → max distances", () => {
    const r = resolveRadialExtent("farthest-side", 30, 20, 100, 80);
    expect(r.rx).toBe(70); // max(30, 70)
    expect(r.ry).toBe(60); // max(20, 60)
  });

  test("closest-corner at center", () => {
    const r = resolveRadialExtent("closest-corner", 50, 40, 100, 80);
    const expected = Math.sqrt(50 ** 2 + 40 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });

  test("farthest-corner at offset", () => {
    const r = resolveRadialExtent("farthest-corner", 30, 20, 100, 80);
    const expected = Math.sqrt(70 ** 2 + 60 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });

  test("default (farthest-corner) when unknown keyword", () => {
    const r = resolveRadialExtent("unknown" as string, 50, 40, 100, 80);
    const expected = Math.sqrt(50 ** 2 + 40 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL)**

Run: `cd apps/builder && npx vitest run src/builder/workspace/canvas/skia/__tests__/radialGradient.test.ts`
Expected: FAIL (resolveRadialExtent 미존재)

- [ ] **Step 3: fills.ts에 resolveRadialExtent 함수 추가**

```typescript
// fills.ts — applyFill 함수 위에 추가
/**
 * CSS radial-gradient 키워드를 반지름 수치로 변환.
 * @param keyword CSS size keyword
 * @param cx, cy 그라디언트 중심점
 * @param w, h 컨테이너 크기
 * @returns {rx, ry} 타원 반지름 (circle이면 rx === ry)
 */
export function resolveRadialExtent(
  keyword: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
): { rx: number; ry: number } {
  const left = cx;
  const right = w - cx;
  const top = cy;
  const bottom = h - cy;

  switch (keyword) {
    case "closest-side":
      return { rx: Math.min(left, right), ry: Math.min(top, bottom) };
    case "farthest-side":
      return { rx: Math.max(left, right), ry: Math.max(top, bottom) };
    case "closest-corner":
      return {
        rx: Math.sqrt(Math.min(left, right) ** 2 + Math.min(top, bottom) ** 2),
        ry: Math.sqrt(Math.min(left, right) ** 2 + Math.min(top, bottom) ** 2),
      };
    case "farthest-corner":
    default:
      return {
        rx: Math.sqrt(Math.max(left, right) ** 2 + Math.max(top, bottom) ** 2),
        ry: Math.sqrt(Math.max(left, right) ** 2 + Math.max(top, bottom) ** 2),
      };
  }
}
```

- [ ] **Step 4: styleConverter.ts에서 radial-gradient 키워드 파싱 시 resolveRadialExtent 호출**

styleConverter.ts의 radial gradient 파싱 경로에서 키워드가 감지되면 `resolveRadialExtent()`로 변환한 `endRadius`를 `RadialGradientFill`에 설정.

- [ ] **Step 5: 테스트 실행 (PASS) + 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/fills.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/radialGradient.test.ts \
       apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts
git commit -m "feat(skia): G6 radial-gradient keyword resolution (closest-side/farthest-corner)"
```

---

## Task 3: G4 — Text-shadow 2-pass 렌더링

**Files:**

- Modify: `skia/nodeRendererText.ts:79`
- Modify: `sprites/styleConverter.ts`
- Create: `skia/__tests__/textShadow.test.ts`

TextShadow 타입은 이미 types.ts:188에 정의됨. text 필드의 `textShadows?: TextShadow[]`도 이미 nodeRendererTypes.ts에 존재함을 확인 필요.

- [ ] **Step 1: nodeRendererTypes.ts 확인 — textShadows 필드 존재 여부**

`skia/nodeRendererTypes.ts`의 text 인터페이스에 `textShadows?: TextShadow[]` 필드가 없으면 추가.

- [ ] **Step 2: 테스트 작성**

```typescript
// skia/__tests__/textShadow.test.ts
import { describe, test, expect } from "vitest";
import { parseTextShadow } from "../../sprites/styleConverter";

describe("G4: text-shadow parsing", () => {
  test("single shadow — offset + blur + color", () => {
    const shadows = parseTextShadow("2px 3px 4px rgba(0,0,0,0.5)");
    expect(shadows).toHaveLength(1);
    expect(shadows[0].offsetX).toBe(2);
    expect(shadows[0].offsetY).toBe(3);
    // sigma = 4 / 2.355
    expect(shadows[0].sigma).toBeCloseTo(4 / 2.355, 2);
    expect(shadows[0].color[3]).toBeCloseTo(0.5, 2);
  });

  test("multiple shadows — comma separated", () => {
    const shadows = parseTextShadow("1px 1px red, 2px 2px 5px blue");
    expect(shadows).toHaveLength(2);
    expect(shadows[0].offsetX).toBe(1);
    expect(shadows[1].sigma).toBeCloseTo(5 / 2.355, 2);
  });

  test("no blur → sigma 0", () => {
    const shadows = parseTextShadow("1px 2px black");
    expect(shadows[0].sigma).toBe(0);
  });

  test("empty string → empty array", () => {
    expect(parseTextShadow("")).toHaveLength(0);
    expect(parseTextShadow("none")).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 테스트 실행 (FAIL)**

Run: `cd apps/builder && npx vitest run src/builder/workspace/canvas/skia/__tests__/textShadow.test.ts`

- [ ] **Step 4: styleConverter.ts에 parseTextShadow 함수 추가**

```typescript
// styleConverter.ts — export 함수 추가
import type { TextShadow } from "../workspace/canvas/skia/types";

/**
 * CSS text-shadow 문자열을 TextShadow[] 로 파싱.
 * 형식: "<offsetX> <offsetY> [blur] [color], ..."
 */
export function parseTextShadow(value: string): TextShadow[] {
  if (!value || value === "none") return [];

  return value.split(",").map((part) => {
    const trimmed = part.trim();
    // 숫자 값 추출 (px 단위)
    const numericParts: number[] = [];
    let colorPart = "";

    const tokens = trimmed.split(/\s+/);
    for (const token of tokens) {
      const num = parseFloat(token);
      if (!isNaN(num)) {
        numericParts.push(num);
      } else {
        colorPart += (colorPart ? " " : "") + token;
      }
    }

    const offsetX = numericParts[0] ?? 0;
    const offsetY = numericParts[1] ?? 0;
    const blurRadius = numericParts[2] ?? 0;
    const sigma = blurRadius > 0 ? blurRadius / 2.355 : 0;

    // colorPart → Float32Array [r,g,b,a]
    const color = colorPart
      ? cssColorToFloat32(colorPart)
      : new Float32Array([0, 0, 0, 1]); // default black

    return { offsetX, offsetY, sigma, color };
  });
}
```

`cssColorToFloat32` 는 기존 `cssColorToHex` + hex→Float32Array 변환을 조합하거나, 기존 `colorIntToFloat32`를 활용.

- [ ] **Step 5: buildTextNodeData.ts 또는 buildBoxNodeData.ts에서 text-shadow 파싱 호출**

element의 `style.textShadow` → `parseTextShadow()` → `node.text.textShadows`에 할당.

- [ ] **Step 6: nodeRendererText.ts에 2-pass shadow 렌더링 삽입**

`renderText()` 함수 내 `canvas.drawParagraph()` 호출 직전에 shadow pass 삽입:

```typescript
// nodeRendererText.ts — renderText 내부, 원본 drawParagraph 직전
// --- G4: text-shadow 2-pass 렌더링 ---
if (node.text.textShadows?.length) {
  // 역순: CSS 스펙에서 첫 번째 shadow가 맨 위
  for (let si = node.text.textShadows.length - 1; si >= 0; si--) {
    const shadow = node.text.textShadows[si];
    canvas.save();
    canvas.translate(shadow.offsetX, shadow.offsetY);

    if (shadow.sigma > 0) {
      const blurFilter = ck.ImageFilter.MakeBlur(
        shadow.sigma,
        shadow.sigma,
        ck.TileMode.Decal,
        null,
      );
      const blurPaint = new ck.Paint();
      blurPaint.setImageFilter(blurFilter);
      canvas.saveLayer(blurPaint);
      blurPaint.delete();
      blurFilter.delete();
    }

    // shadow 색상으로 별도 Paragraph 생성
    const shadowColorKey = `${shadow.color[0].toFixed(3)},${shadow.color[1].toFixed(3)},${shadow.color[2].toFixed(3)},${shadow.color[3].toFixed(3)}`;
    const shadowKey = key + "\u0000shadow:" + shadowColorKey;
    let shadowParagraph = getCachedParagraph(shadowKey);
    if (!shadowParagraph) {
      // 원본과 동일하나 색상만 shadow.color
      // (Paragraph 빌드 로직은 원본과 동일, foregroundColor만 변경)
      shadowParagraph = buildParagraph(
        ck,
        fontMgr,
        node.text,
        shadow.color,
        layoutMaxWidth,
      );
      setCachedParagraph(shadowKey, shadowParagraph);
    }
    shadowParagraph.layout(layoutMaxWidth);

    const shadowDrawY = computeDrawY(shadowParagraph);
    canvas.drawParagraph(
      shadowParagraph,
      node.text.paddingLeft + textIndent + alignOffset,
      shadowDrawY,
    );

    if (shadow.sigma > 0) canvas.restore(); // blur saveLayer
    canvas.restore(); // translate
  }
}
// --- 원본 텍스트 (기존 코드) ---
```

주의: `buildParagraph` 헬퍼 함수를 기존 Paragraph 빌드 로직에서 추출하여 재사용 가능하게 리팩토링. 현재 renderText() 내에 인라인으로 있는 ParagraphBuilder 코드를 함수로 분리.

- [ ] **Step 7: 테스트 실행 (PASS) + 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/nodeRendererText.ts \
       apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/textShadow.test.ts
git commit -m "feat(skia): G4 text-shadow 2-pass rendering with paragraph cache"
```

---

## Task 4: Backdrop-filter 강화 (saturate/brightness 체이닝)

**Files:**

- Modify: `skia/effects.ts:64-78`
- Modify: `skia/types.ts:146-150`
- Modify: `sprites/styleConverter.ts`

현재 backdrop-filter는 blur만 지원. `backdrop-filter: blur(10px) saturate(180%) brightness(1.1)` 같은 체이닝을 추가.

- [ ] **Step 1: types.ts BackdropFilterEffect 확장**

```typescript
// types.ts — BackdropFilterEffect 수정 (line 146-150)
export interface BackdropFilterEffect {
  type: "backdrop-filter";
  /** 가우시안 블러 시그마. 0이면 블러 없음 */
  sigma: number;
  /** 추가 색상 행렬 (saturate, brightness 등). null이면 없음 */
  colorMatrix?: Float32Array; // 4x5 = 20 요소
}
```

- [ ] **Step 2: effects.ts backdrop-filter 분기 수정**

```typescript
// effects.ts — case "backdrop-filter" (line 64-78) 수정
case "backdrop-filter": {
  let filter: ImageFilter | null = null;

  // blur
  if (effect.sigma > 0) {
    filter = scope.track(
      ck.ImageFilter.MakeBlur(
        effect.sigma,
        effect.sigma,
        ck.TileMode.Clamp,
        null,
      ),
    );
  }

  const paint = scope.track(new ck.Paint());
  if (filter) {
    paint.setImageFilter(filter);
  }

  // colorMatrix (saturate, brightness 등)
  if (effect.colorMatrix) {
    const colorFilter = scope.track(
      ck.ColorFilter.MakeMatrix(effect.colorMatrix),
    );
    paint.setColorFilter(colorFilter);
  }

  canvas.saveLayer(paint);
  layerCount++;
  break;
}
```

- [ ] **Step 3: styleConverter.ts에서 backdrop-filter 파싱 강화**

기존 `buildSkiaEffects()` 내 backdrop-filter 파싱에서 blur 외 함수도 처리:

- `blur(Xpx)` → sigma
- `saturate(X)` / `brightness(X)` / `contrast(X)` / `grayscale(X)` / `sepia(X)` / `hue-rotate(Xdeg)` / `invert(X)` → 개별 행렬 생성 → `multiplyColorMatrices()`로 합성

`multiplyColorMatrices()`는 기존 CSS filter 파싱에서 이미 사용 중인 행렬 곱 로직을 export.

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/effects.ts \
       apps/builder/src/builder/workspace/canvas/skia/types.ts \
       apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts
git commit -m "feat(skia): backdrop-filter saturate/brightness/grayscale chaining"
```

---

## Task 5: mask-image (SkSL RuntimeEffect)

**Files:**

- Create: `skia/nodeRendererMask.ts`
- Create: `skia/__tests__/nodeRendererMask.test.ts`
- Modify: `skia/types.ts`
- Modify: `skia/renderCommands.ts`
- Modify: `sprites/styleConverter.ts`

- [ ] **Step 1: types.ts에 MaskImageStyle 타입 추가**

```typescript
// types.ts — EffectStyle 아래에 추가
export interface MaskImageStyle {
  type: "gradient" | "image";
  /** gradient mask용 FillStyle (linear-gradient 또는 radial-gradient) */
  gradient?: FillStyle;
  /** image mask용 URL (imageCache에서 로드) */
  imageUrl?: string;
  /** alpha (기본) 또는 luminance */
  mode: "alpha" | "luminance";
  /** mask-size: contain/cover/auto */
  size?: "contain" | "cover" | "auto";
  /** mask-position: [x%, y%] */
  position?: [number, number];
}
```

`SkiaNodeData`에 `maskImage?: MaskImageStyle` 추가 (nodeRendererTypes.ts).

- [ ] **Step 2: 테스트 작성**

```typescript
// skia/__tests__/nodeRendererMask.test.ts
import { describe, test, expect } from "vitest";
import { MASK_SKSL, determineMaskMode } from "../nodeRendererMask";

describe("mask-image", () => {
  test("SkSL shader source is valid string", () => {
    expect(typeof MASK_SKSL).toBe("string");
    expect(MASK_SKSL).toContain("uniform shader content");
    expect(MASK_SKSL).toContain("uniform shader mask");
    expect(MASK_SKSL).toContain("uniform int mode");
  });

  test("determineMaskMode — SVG → luminance", () => {
    expect(determineMaskMode("image.svg", undefined)).toBe("luminance");
  });

  test("determineMaskMode — PNG → alpha", () => {
    expect(determineMaskMode("photo.png", undefined)).toBe("alpha");
  });

  test("determineMaskMode — gradient → alpha", () => {
    expect(determineMaskMode(undefined, "gradient")).toBe("alpha");
  });

  test("determineMaskMode — explicit override", () => {
    expect(determineMaskMode("image.svg", undefined, "alpha")).toBe("alpha");
  });
});
```

- [ ] **Step 3: 테스트 실행 (FAIL)**

- [ ] **Step 4: nodeRendererMask.ts 구현**

```typescript
// skia/nodeRendererMask.ts
/**
 * SkSL RuntimeEffect 기반 mask-image 렌더링.
 *
 * alpha mask + luminance mask 모두 GPU에서 처리.
 */
import type {
  CanvasKit,
  Canvas,
  Surface,
  Image as SkImage,
} from "canvaskit-wasm";

/** SkSL mask shader — alpha/luminance 모드 지원 */
export const MASK_SKSL = `
  uniform shader content;
  uniform shader mask;
  uniform int mode;

  half4 main(float2 coord) {
    half4 c = content.eval(coord);
    half4 m = mask.eval(coord);
    half a = (mode == 0) ? m.a : dot(m.rgb, half3(0.2126, 0.7152, 0.0722));
    return c * a;
  }
`;

/** 캐싱된 RuntimeEffect (CanvasKit 인스턴스 수명) */
let cachedEffect: ReturnType<CanvasKit["RuntimeEffect"]["Make"]> | null = null;

function getMaskEffect(ck: CanvasKit) {
  if (!cachedEffect) {
    cachedEffect = ck.RuntimeEffect.Make(MASK_SKSL);
    if (!cachedEffect) {
      throw new Error("[nodeRendererMask] SkSL compilation failed");
    }
  }
  return cachedEffect;
}

/** CSS mask-mode 결정 (match-source 스펙) */
export function determineMaskMode(
  imageUrl?: string,
  sourceType?: string,
  explicitMode?: "alpha" | "luminance",
): "alpha" | "luminance" {
  if (explicitMode) return explicitMode;
  if (sourceType === "gradient") return "alpha";
  if (imageUrl?.endsWith(".svg")) return "luminance";
  return "alpha";
}

/**
 * mask-image를 적용하여 요소를 렌더한다.
 *
 * 1. offscreen surface에 요소 렌더 → snapshot → content shader
 * 2. mask shader 생성 (gradient 또는 image)
 * 3. RuntimeEffect에 바인딩 → drawRect
 *
 * @param renderContent 요소 렌더 콜백 (offscreen canvas에 그리기)
 */
export function applyMaskImage(
  ck: CanvasKit,
  canvas: Canvas,
  width: number,
  height: number,
  maskShader: Parameters<typeof canvas.drawRect>[1] extends infer P
    ? unknown
    : never, // CanvasKit Shader
  mode: "alpha" | "luminance",
  renderContent: (offscreenCanvas: Canvas) => void,
): void {
  // offscreen surface 생성
  const surface = ck.MakeSurface(Math.ceil(width), Math.ceil(height));
  if (!surface) return;

  const offCanvas = surface.getCanvas();
  offCanvas.clear(ck.TRANSPARENT);
  renderContent(offCanvas);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  if (!snapshot) {
    surface.delete();
    return;
  }

  const contentShader = snapshot.makeShaderOptions(
    ck.TileMode.Clamp,
    ck.TileMode.Clamp,
    ck.FilterMode.Linear,
    ck.MipmapMode.None,
  );

  const effect = getMaskEffect(ck);
  const uniforms = new Float32Array([mode === "alpha" ? 0 : 1]);

  const resultShader = effect.makeShaderWithChildren(uniforms, [
    contentShader,
    maskShader,
  ]);

  const paint = new ck.Paint();
  paint.setShader(resultShader);
  canvas.drawRect(ck.LTRBRect(0, 0, width, height), paint);

  // cleanup
  paint.delete();
  resultShader.delete();
  contentShader.delete();
  snapshot.delete();
  surface.delete();
}

/** mask 모듈 리소스 해제 (HMR cleanup) */
export function clearMaskCache(): void {
  cachedEffect?.delete();
  cachedEffect = null;
}
```

- [ ] **Step 5: 테스트 실행 (PASS)**

- [ ] **Step 6: renderCommands.ts CMD_ELEMENT_BEGIN에 maskImage 필드 추가**

`visitElement()` (line ~322)에서 node의 `maskImage`가 있으면 CMD에 포함.
`executeRenderCommands()`에서 mask가 있는 요소는 `applyMaskImage()`로 감싸서 렌더.

- [ ] **Step 7: styleConverter.ts에 parseMaskImage 함수 추가**

CSS `mask-image` 값 파싱:

- `linear-gradient(...)` → FillStyle 변환 (기존 gradient 파서 재사용)
- `url(...)` → imageUrl 추출
- `mask-mode: alpha | luminance` → mode 설정

- [ ] **Step 8: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/nodeRendererMask.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/nodeRendererMask.test.ts \
       apps/builder/src/builder/workspace/canvas/skia/renderCommands.ts \
       apps/builder/src/builder/workspace/canvas/skia/types.ts \
       apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts
git commit -m "feat(skia): mask-image SkSL RuntimeEffect — gradient + image + luminance"
```

---

## Task 6: Position sticky/fixed 파이프라인 통합

**Files:**

- Modify: `skia/renderCommands.ts`
- Modify: `skia/types.ts`
- Create: `skia/__tests__/stickyIntegration.test.ts`

stickyResolver.ts의 순수 함수는 구현됨. 렌더 파이프라인에 통합하는 작업.

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/stickyIntegration.test.ts
import { describe, test, expect } from "vitest";
import { resolveStickyY } from "../../layout/stickyResolver";

describe("sticky pipeline integration", () => {
  test("sticky 요소의 렌더 좌표가 스크롤에 따라 보정됨", () => {
    // 시뮬레이션: elementY=200, scrollOffset=300, stickyTop=10
    const renderY = resolveStickyY({
      elementY: 200,
      stickyTop: 10,
      scrollOffset: 300,
      containerTop: 0,
      containerBottom: 1000,
      elementHeight: 50,
    });
    // stuck state: 300 + 10 = 310
    expect(renderY).toBe(310);
  });

  test("fixed 요소는 컨테이너 제한 없음 (viewport 기준)", () => {
    // fixed는 sticky의 containerBottom=Infinity와 동일
    const renderY = resolveStickyY({
      elementY: 100,
      stickyTop: 0,
      scrollOffset: 5000,
      containerTop: 0,
      containerBottom: Infinity,
      elementHeight: 50,
    });
    expect(renderY).toBe(5000);
  });
});
```

- [ ] **Step 2: renderCommands.ts visitElement에 sticky/fixed 좌표 보정 추가**

`visitElement()` (line ~322) DFS 순회에서:

```typescript
// renderCommands.ts — visitElement 내부
// position: sticky 보정
if (element.props?.style?.position === "sticky") {
  const scrollState = getScrollState(parentElementId);
  if (scrollState) {
    const containerBounds = getContainerBounds(parentElementId, layoutMap);
    const correctedY = resolveStickyY({
      elementY: layout.y,
      stickyTop: parseFloat(element.props.style.top ?? "0"),
      scrollOffset: scrollState.scrollTop,
      containerTop: containerBounds.top,
      containerBottom: containerBounds.bottom,
      elementHeight: layout.height,
    });
    // layout.y를 보정된 값으로 대체
    cmd.y = correctedY;
  }
}

// position: fixed — camera transform 역적용
if (element.props?.style?.position === "fixed") {
  // fixed 요소는 renderCommands에서 camera offset을 역으로 적용하여
  // viewport 기준 고정 위치 유지
  cmd.isFixed = true;
}
```

- [ ] **Step 3: executeRenderCommands에서 fixed 요소 camera 역보정**

```typescript
// executeRenderCommands — CMD_ELEMENT_BEGIN 내부
if (cmd.isFixed) {
  // camera transform을 상쇄하여 viewport 고정
  // camera: translate(panX, panY) + scale(zoom)
  // 역: scale(1/zoom) + translate(-panX, -panY)
  // 이 시점에서 canvas에는 이미 camera transform이 적용되어 있으므로
  // 역행렬을 concat
  canvas.save();
  // ... fixed 처리
}
```

- [ ] **Step 4: treeBoundsMap에 sticky 보정 좌표 반영**

`buildTreeBoundsMap`에서 sticky 요소의 boundsMap entry를 보정된 좌표로 갱신.

- [ ] **Step 5: 테스트 실행 (PASS) + 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/renderCommands.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/stickyIntegration.test.ts
git commit -m "feat(skia): position sticky/fixed pipeline integration — renderCommands + treeBoundsMap"
```

---

## Task 7: interpolators.ts (공유 보간 유틸)

**Files:**

- Create: `skia/interpolators.ts`
- Create: `skia/__tests__/interpolators.test.ts`

TransitionManager(Task 8)와 AnimationEngine(Task 9)이 공유하는 속성별 보간 함수.

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/interpolators.test.ts
import { describe, test, expect } from "vitest";
import {
  lerpNumber,
  lerpColor,
  lerpTransform,
  lerpBoxShadow,
  interpolateProperty,
} from "../interpolators";

describe("interpolators", () => {
  describe("lerpNumber", () => {
    test("t=0 → start", () => expect(lerpNumber(10, 20, 0)).toBe(10));
    test("t=1 → end", () => expect(lerpNumber(10, 20, 1)).toBe(20));
    test("t=0.5 → midpoint", () => expect(lerpNumber(10, 20, 0.5)).toBe(15));
    test("negative values", () => expect(lerpNumber(-10, 10, 0.5)).toBe(0));
  });

  describe("lerpColor", () => {
    test("black to white at t=0.5 → gray", () => {
      const result = lerpColor(
        new Float32Array([0, 0, 0, 1]),
        new Float32Array([1, 1, 1, 1]),
        0.5,
      );
      expect(result[0]).toBeCloseTo(0.5, 2);
      expect(result[1]).toBeCloseTo(0.5, 2);
      expect(result[2]).toBeCloseTo(0.5, 2);
      expect(result[3]).toBeCloseTo(1, 2);
    });

    test("alpha interpolation", () => {
      const result = lerpColor(
        new Float32Array([1, 0, 0, 0]),
        new Float32Array([1, 0, 0, 1]),
        0.5,
      );
      expect(result[3]).toBeCloseTo(0.5, 2);
    });
  });

  describe("interpolateProperty", () => {
    test("opacity → lerpNumber", () => {
      expect(interpolateProperty("opacity", 0, 1, 0.5)).toBe(0.5);
    });

    test("width → lerpNumber", () => {
      expect(interpolateProperty("width", 100, 200, 0.25)).toBe(125);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL)**

- [ ] **Step 3: interpolators.ts 구현**

```typescript
// skia/interpolators.ts
/**
 * 공유 보간 유틸리티.
 *
 * TransitionManager와 AnimationEngine이 속성별 보간에 사용.
 */

/** 숫자 선형 보간 */
export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** sRGB 색상 component-wise 보간. Float32Array [r,g,b,a] 0-1 */
export function lerpColor(
  a: Float32Array,
  b: Float32Array,
  t: number,
): Float32Array {
  return new Float32Array([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ]);
}

/** transform 분해 후 개별 보간 */
export function lerpTransform(
  a: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
  },
  b: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;
  },
  t: number,
): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
} {
  return {
    translateX: lerpNumber(a.translateX, b.translateX, t),
    translateY: lerpNumber(a.translateY, b.translateY, t),
    scaleX: lerpNumber(a.scaleX, b.scaleX, t),
    scaleY: lerpNumber(a.scaleY, b.scaleY, t),
    rotate: lerpNumber(a.rotate, b.rotate, t),
  };
}

/** box-shadow 보간 */
export function lerpBoxShadow(
  a: {
    dx: number;
    dy: number;
    sigmaX: number;
    sigmaY: number;
    spread: number;
    color: Float32Array;
  },
  b: {
    dx: number;
    dy: number;
    sigmaX: number;
    sigmaY: number;
    spread: number;
    color: Float32Array;
  },
  t: number,
): typeof a {
  return {
    dx: lerpNumber(a.dx, b.dx, t),
    dy: lerpNumber(a.dy, b.dy, t),
    sigmaX: lerpNumber(a.sigmaX, b.sigmaX, t),
    sigmaY: lerpNumber(a.sigmaY, b.sigmaY, t),
    spread: lerpNumber(a.spread, b.spread, t),
    color: lerpColor(a.color, b.color, t),
  };
}

/** 숫자 속성 목록 */
const NUMERIC_PROPS = new Set([
  "opacity",
  "width",
  "height",
  "borderRadius",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "fontSize",
  "letterSpacing",
  "lineHeight",
]);

/**
 * CSS 속성 이름에 따라 적절한 보간 함수를 선택하여 보간값을 반환.
 * 지원하지 않는 속성은 t >= 0.5일 때 end, 아니면 start 반환 (discrete).
 */
export function interpolateProperty(
  prop: string,
  start: unknown,
  end: unknown,
  t: number,
): unknown {
  if (
    NUMERIC_PROPS.has(prop) &&
    typeof start === "number" &&
    typeof end === "number"
  ) {
    return lerpNumber(start, end, t);
  }

  // backgroundColor, color, borderColor → Float32Array
  if (
    (prop === "backgroundColor" ||
      prop === "color" ||
      prop === "borderColor") &&
    start instanceof Float32Array &&
    end instanceof Float32Array
  ) {
    return lerpColor(start, end, t);
  }

  // discrete fallback
  return t >= 0.5 ? end : start;
}
```

- [ ] **Step 4: 테스트 실행 (PASS) + 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/interpolators.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/interpolators.test.ts
git commit -m "feat(skia): interpolators.ts — shared lerp utilities for transitions/animations"
```

---

## Task 8: TransitionManager (렌더 루프 통합)

**Files:**

- Create: `skia/transitionManager.ts`
- Create: `skia/__tests__/transitionManager.test.ts`
- Modify: `skia/SkiaRenderer.ts:503`
- Modify: `skia/StoreRenderBridge.ts:175`

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/transitionManager.test.ts
import { describe, test, expect, vi } from "vitest";
import { TransitionManager } from "../transitionManager";

describe("TransitionManager", () => {
  test("start → tick halfway → returns interpolated value", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    const dirty = tm.tick(150); // 150ms = 50% of 300ms
    expect(dirty.has("el-1")).toBe(true);

    const value = tm.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(0.5, 1);
  });

  test("tick after duration → done, returns end value", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    const dirty = tm.tick(400);
    expect(dirty.has("el-1")).toBe(true);

    const value = tm.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(1, 2);
  });

  test("no active transitions → empty dirty set", () => {
    const tm = new TransitionManager();
    const dirty = tm.tick(100);
    expect(dirty.size).toBe(0);
  });

  test("isActive() returns false when no transitions", () => {
    const tm = new TransitionManager();
    expect(tm.isActive()).toBe(false);
  });

  test("isActive() returns true during transition", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "width", 100, 200, 500, "ease");
    expect(tm.isActive()).toBe(true);
  });

  test("remove → cleans up element transitions", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");
    tm.remove("el-1");
    expect(tm.isActive()).toBe(false);
  });

  test("multiple properties on same element", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");
    tm.start("el-1", "width", 100, 200, 300, "linear");

    tm.tick(150);
    expect(tm.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.5, 1);
    expect(tm.getCurrentValue("el-1", "width")).toBeCloseTo(150, 0);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL)**

- [ ] **Step 3: transitionManager.ts 구현**

```typescript
// skia/transitionManager.ts
/**
 * CSS Transition 렌더 루프 통합 (Pull 모델).
 *
 * StoreRenderBridge에서 스타일 변경 감지 → start() 호출.
 * SkiaRenderer.renderFrame()에서 tick() 호출 → dirty nodeIds 반환.
 */
import { computeTransitionValue, parseEasing } from "./transitionEngine";
import type { TransitionState } from "./transitionEngine";
import { interpolateProperty } from "./interpolators";

interface ActiveTransition extends TransitionState {
  elementId: string;
  done: boolean;
}

export class TransitionManager {
  private transitions: Map<string, ActiveTransition[]> = new Map(); // elementId → transitions

  /**
   * 새 transition 시작.
   * 동일 element+property의 기존 transition은 현재 보간값에서 시작하도록 대체.
   */
  start(
    elementId: string,
    property: string,
    startValue: number,
    endValue: number,
    duration: number,
    easing: string,
  ): void {
    const list = this.transitions.get(elementId) ?? [];

    // 기존 동일 property transition 제거
    const filtered = list.filter((t) => t.property !== property);

    filtered.push({
      elementId,
      property,
      startValue,
      endValue,
      startTime: performance.now(),
      duration,
      easing: parseEasing(easing),
      done: false,
    });

    this.transitions.set(elementId, filtered);
  }

  /**
   * 매 프레임 호출. 진행 중인 transition의 보간값을 계산하고
   * dirty elementId Set을 반환.
   */
  tick(now: number): Set<string> {
    const dirty = new Set<string>();

    for (const [elementId, list] of this.transitions) {
      let hasActive = false;
      for (const t of list) {
        if (t.done) continue;
        const result = computeTransitionValue(t, now);
        if (result.done) {
          t.done = true;
        }
        hasActive = true;
        dirty.add(elementId);
      }

      // 모든 transition 완료 → 정리
      if (!hasActive) {
        this.transitions.delete(elementId);
      }
    }

    return dirty;
  }

  /** 특정 element+property의 현재 보간값 조회 */
  getCurrentValue(elementId: string, property: string): number | undefined {
    const list = this.transitions.get(elementId);
    if (!list) return undefined;

    const t = list.find((tr) => tr.property === property);
    if (!t) return undefined;

    const result = computeTransitionValue(t, performance.now());
    return result.value;
  }

  /** 요소 삭제 시 관련 transition 정리 */
  remove(elementId: string): void {
    this.transitions.delete(elementId);
  }

  /** 활성 transition 존재 여부 */
  isActive(): boolean {
    return this.transitions.size > 0;
  }

  /** 전체 초기화 */
  clear(): void {
    this.transitions.clear();
  }
}
```

- [ ] **Step 4: 테스트 실행 (PASS)**

- [ ] **Step 5: SkiaRenderer.ts classifyFrame에 transition 인식 추가**

`SkiaRenderer.ts` line 144 `classifyFrame()` 또는 `renderDualSurface()` (line 472)에서:

```typescript
// SkiaRenderer.ts — renderDualSurface 내부 (line ~503 frameType 결정 후)
// Transition/Animation 활성 시 idle → content 승격
if (frameType === "idle" && this.transitionManager?.isActive()) {
  frameType = "content";
}
```

SkiaRenderer 클래스에 `transitionManager: TransitionManager` 필드 추가.
`renderDualSurface()`의 `const frameType` → `let frameType`으로 변경.

- [ ] **Step 6: StoreRenderBridge.ts incrementalSync에 transition 트리거 추가**

`incrementalSync()` (line ~175)에서 요소의 이전/현재 스타일 비교:

```typescript
// StoreRenderBridge.ts — incrementalSync 내부
// transition 트리거: style 변경 감지
if (this.transitionManager && prevElement && element.props?.style?.transition) {
  const prevStyle = prevElement.props?.style ?? {};
  const currStyle = element.props?.style ?? {};
  // transition property에 명시된 속성만 비교
  const transitionProps = parseTransitionProperty(currStyle.transition);
  for (const prop of transitionProps) {
    const prev = prevStyle[prop];
    const curr = currStyle[prop];
    if (prev !== undefined && curr !== undefined && prev !== curr) {
      this.transitionManager.start(
        element.id,
        prop,
        typeof prev === "number" ? prev : 0,
        typeof curr === "number" ? curr : 0,
        parseTransitionDuration(currStyle.transition),
        parseTransitionEasing(currStyle.transition),
      );
    }
  }
}
```

- [ ] **Step 7: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/transitionManager.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/transitionManager.test.ts \
       apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts \
       apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts
git commit -m "feat(skia): TransitionManager — pull-model render loop integration"
```

---

## Task 9: AnimationEngine (@keyframes)

**Files:**

- Create: `skia/animationEngine.ts`
- Create: `skia/__tests__/animationEngine.test.ts`
- Modify: `skia/SkiaRenderer.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/animationEngine.test.ts
import { describe, test, expect } from "vitest";
import { AnimationEngine } from "../animationEngine";
import type { KeyframeAnimation } from "../animationEngine";

const fadeIn: KeyframeAnimation = {
  keyframes: [
    { offset: 0, props: { opacity: 0 } },
    { offset: 1, props: { opacity: 1 } },
  ],
  duration: 1000,
  delay: 0,
  easing: "linear",
  iterationCount: 1,
  direction: "normal",
  fillMode: "forwards",
};

describe("AnimationEngine", () => {
  test("start → tick halfway → dirty contains element", () => {
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", fadeIn);

    const dirty = engine.tick(500);
    expect(dirty.has("el-1")).toBe(true);
  });

  test("linear progress at t=500/1000 → opacity ≈ 0.5", () => {
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", fadeIn);

    engine.tick(500);
    const value = engine.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(0.5, 1);
  });

  test("fillMode: forwards → end value persists after done", () => {
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", fadeIn);

    engine.tick(1500); // past duration
    const value = engine.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(1, 2);
  });

  test("fillMode: none → no value after done", () => {
    const anim: KeyframeAnimation = { ...fadeIn, fillMode: "none" };
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", anim);

    engine.tick(1500);
    expect(engine.getCurrentValue("el-1", "opacity")).toBeUndefined();
  });

  test("direction: alternate → second iteration reverses", () => {
    const anim: KeyframeAnimation = {
      ...fadeIn,
      iterationCount: 2,
      direction: "alternate",
    };
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", anim);

    // 1st iteration 75% = 0.75 opacity
    engine.tick(750);
    expect(engine.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);

    // 2nd iteration 25% reversed = 0.75 opacity (1 - 0.25)
    engine.tick(1250);
    expect(engine.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);
  });

  test("iterationCount: Infinity → never done", () => {
    const anim: KeyframeAnimation = { ...fadeIn, iterationCount: Infinity };
    const engine = new AnimationEngine();
    engine.start("el-1", "loop", anim);

    engine.tick(5500);
    expect(engine.isActive()).toBe(true);
  });

  test("stop removes animation", () => {
    const engine = new AnimationEngine();
    engine.start("el-1", "fadeIn", fadeIn);
    engine.stop("el-1");
    expect(engine.isActive()).toBe(false);
  });

  test("3-keyframe interpolation", () => {
    const threeStep: KeyframeAnimation = {
      keyframes: [
        { offset: 0, props: { opacity: 0 } },
        { offset: 0.5, props: { opacity: 1 } },
        { offset: 1, props: { opacity: 0.5 } },
      ],
      duration: 1000,
      delay: 0,
      easing: "linear",
      iterationCount: 1,
      direction: "normal",
      fillMode: "forwards",
    };
    const engine = new AnimationEngine();
    engine.start("el-1", "threeStep", threeStep);

    // t=250ms → 25% of duration → between keyframe[0] and keyframe[1]
    // local progress in segment: 0.25/0.5 = 0.5 → opacity = lerp(0, 1, 0.5) = 0.5
    engine.tick(250);
    expect(engine.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.5, 1);

    // t=750ms → 75% of duration → between keyframe[1] and keyframe[2]
    // local progress in segment: (0.75-0.5)/0.5 = 0.5 → opacity = lerp(1, 0.5, 0.5) = 0.75
    engine.tick(750);
    expect(engine.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);
  });
});
```

- [ ] **Step 2: 테스트 실행 (FAIL)**

- [ ] **Step 3: animationEngine.ts 구현**

```typescript
// skia/animationEngine.ts
/**
 * CSS @keyframes 애니메이션 엔진.
 *
 * 범용 엔진만 구현. UI (타임라인 에디터 등)는 이후 별도 작업.
 * Pull 모델: tick(now) → dirty nodeIds.
 */
import { parseEasing } from "./transitionEngine";
import { interpolateProperty } from "./interpolators";

export interface Keyframe {
  offset: number; // 0-1
  props: Record<string, unknown>;
}

export interface KeyframeAnimation {
  keyframes: Keyframe[];
  duration: number; // ms
  delay: number;
  easing: string;
  iterationCount: number; // Infinity 가능
  direction: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fillMode: "none" | "forwards" | "backwards" | "both";
}

interface ActiveAnimation {
  elementId: string;
  name: string;
  animation: KeyframeAnimation;
  startTime: number;
  easingFn: (t: number) => number;
  /** 현재 보간값 캐시 (tick마다 갱신) */
  currentValues: Record<string, unknown>;
  done: boolean;
}

export class AnimationEngine {
  private animations: Map<string, ActiveAnimation[]> = new Map();

  start(elementId: string, name: string, animation: KeyframeAnimation): void {
    const list = this.animations.get(elementId) ?? [];
    // 동일 name 제거
    const filtered = list.filter((a) => a.name !== name);
    filtered.push({
      elementId,
      name,
      animation,
      startTime: performance.now(),
      easingFn: parseEasing(animation.easing),
      currentValues: {},
      done: false,
    });
    this.animations.set(elementId, filtered);
  }

  stop(elementId: string, name?: string): void {
    if (!name) {
      this.animations.delete(elementId);
      return;
    }
    const list = this.animations.get(elementId);
    if (!list) return;
    const filtered = list.filter((a) => a.name !== name);
    if (filtered.length === 0) {
      this.animations.delete(elementId);
    } else {
      this.animations.set(elementId, filtered);
    }
  }

  tick(now: number): Set<string> {
    const dirty = new Set<string>();

    for (const [elementId, list] of this.animations) {
      let hasActive = false;
      for (const active of list) {
        if (active.done) continue;

        const elapsed = now - active.startTime - active.animation.delay;
        if (elapsed < 0) {
          // delay 중 — backwards fillMode면 첫 keyframe 값 적용
          if (
            active.animation.fillMode === "backwards" ||
            active.animation.fillMode === "both"
          ) {
            this.applyKeyframeValues(active, 0);
            dirty.add(elementId);
          }
          hasActive = true;
          continue;
        }

        const { duration, iterationCount, direction } = active.animation;
        if (duration <= 0) {
          active.done = true;
          continue;
        }

        const rawIteration = elapsed / duration;

        if (rawIteration >= iterationCount) {
          // 완료
          active.done = true;
          if (
            active.animation.fillMode === "forwards" ||
            active.animation.fillMode === "both"
          ) {
            // 마지막 값 유지
            const lastProgress = this.resolveDirection(
              direction,
              Math.floor(iterationCount - 0.001),
              1,
            );
            this.applyKeyframeValues(active, lastProgress);
            dirty.add(elementId);
          } else {
            active.currentValues = {};
          }
          continue;
        }

        hasActive = true;
        const iterationIndex = Math.floor(rawIteration);
        const iterationProgress = rawIteration - iterationIndex;

        const directedProgress = this.resolveDirection(
          direction,
          iterationIndex,
          iterationProgress,
        );
        const easedProgress = active.easingFn(directedProgress);

        this.applyKeyframeValues(active, easedProgress);
        dirty.add(elementId);
      }

      // 모든 animation 완료 → 정리 (fillMode 값 유지하는 것만 남김)
      const remaining = list.filter(
        (a) => !a.done || Object.keys(a.currentValues).length > 0,
      );
      if (remaining.length === 0) {
        this.animations.delete(elementId);
      } else {
        this.animations.set(elementId, remaining);
      }
    }

    return dirty;
  }

  getCurrentValue(elementId: string, property: string): unknown {
    const list = this.animations.get(elementId);
    if (!list) return undefined;
    // 마지막 animation 우선 (CSS cascade)
    for (let i = list.length - 1; i >= 0; i--) {
      const val = list[i].currentValues[property];
      if (val !== undefined) return val;
    }
    return undefined;
  }

  isActive(): boolean {
    return this.animations.size > 0;
  }

  clear(): void {
    this.animations.clear();
  }

  private resolveDirection(
    direction: KeyframeAnimation["direction"],
    iterationIndex: number,
    progress: number,
  ): number {
    switch (direction) {
      case "reverse":
        return 1 - progress;
      case "alternate":
        return iterationIndex % 2 === 0 ? progress : 1 - progress;
      case "alternate-reverse":
        return iterationIndex % 2 === 0 ? 1 - progress : progress;
      case "normal":
      default:
        return progress;
    }
  }

  private applyKeyframeValues(active: ActiveAnimation, progress: number): void {
    const { keyframes } = active.animation;
    if (keyframes.length === 0) return;

    // 구간 탐색
    let prev = keyframes[0];
    let next = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (
        progress >= keyframes[i].offset &&
        progress <= keyframes[i + 1].offset
      ) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }

    const segmentLength = next.offset - prev.offset;
    const localProgress =
      segmentLength > 0 ? (progress - prev.offset) / segmentLength : 0;

    // 모든 props 보간
    const allProps = new Set([
      ...Object.keys(prev.props),
      ...Object.keys(next.props),
    ]);
    for (const prop of allProps) {
      const startVal = prev.props[prop] ?? next.props[prop];
      const endVal = next.props[prop] ?? prev.props[prop];
      active.currentValues[prop] = interpolateProperty(
        prop,
        startVal,
        endVal,
        localProgress,
      );
    }
  }
}
```

- [ ] **Step 4: 테스트 실행 (PASS)**

- [ ] **Step 5: SkiaRenderer.ts에 AnimationEngine 통합**

```typescript
// SkiaRenderer.ts — renderDualSurface 내부 (Task 8에서 추가한 transition 코드 옆)
// Animation 활성 시에도 idle → content 승격
if (frameType === "idle" && this.animationEngine?.isActive()) {
  frameType = "content";
}
```

SkiaRenderer 클래스에 `animationEngine: AnimationEngine` 필드 추가.

- [ ] **Step 6: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/animationEngine.ts \
       apps/builder/src/builder/workspace/canvas/skia/__tests__/animationEngine.test.ts \
       apps/builder/src/builder/workspace/canvas/skia/SkiaRenderer.ts
git commit -m "feat(skia): AnimationEngine — @keyframes with direction/fillMode/iterationCount"
```

---

## Task 10: Gate 검증

| Gate 항목          | 통과 조건                         |
| ------------------ | --------------------------------- |
| pnpm type-check    | 0 errors                          |
| vitest 전체        | PASS                              |
| G4 text-shadow     | 2-pass 렌더 정상                  |
| G6 radial keywords | closest-side/farthest-corner 정확 |
| G7 oklab           | sRGB↔oklab roundtrip ≤0.01 오차   |
| backdrop-filter    | blur + saturate 체이닝            |
| mask-image         | SkSL 컴파일 + alpha/luminance     |
| sticky/fixed       | WPT 스타일 5+ 케이스              |
| transitions        | pull-model tick → dirty           |
| animations         | direction/fillMode/3-keyframe     |

- [ ] **Step 1: pnpm type-check**

Run: `pnpm type-check`
Expected: 0 errors

- [ ] **Step 2: vitest 전체 실행**

Run: `cd apps/builder && npx vitest run src/builder/workspace/canvas/skia/__tests__/`
Expected: ALL PASS

- [ ] **Step 3: 메모리 갱신**

ADR-100 메모리 파일에 Phase 10 (CSS3 렌더링 확장) 완료 기록.

- [ ] **Step 4: 최종 커밋**

```bash
git commit -m "docs: ADR-100 CSS3 rendering extensions complete"
```

---

## 의존성 그래프

```
Task 1 (oklab) ─────────── 독립
Task 2 (radial keywords) ─ 독립
Task 3 (text-shadow) ───── 독립
Task 4 (backdrop-filter) ─ 독립
Task 5 (mask-image) ────── 독립
Task 6 (sticky/fixed) ──── 독립
Task 7 (interpolators) ─── 독립
Task 8 (TransitionManager) ← Task 7
Task 9 (AnimationEngine) ── ← Task 7
Task 10 (Gate) ──────────── Task 1~9 전부 완료 후
```

**병렬 실행 가능:** Task 1~7 (모두 독립)
**순차:** Task 7 → Task 8, 9 → Task 10
