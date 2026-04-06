# ADR-100 Phase 3: CSS3 렌더링 확장

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skia 렌더러의 CSS 시각 정합성을 82%→97%로 향상하고, position:sticky/fixed + backdrop-filter를 추가한다.

**Architecture:** 기존 effects.ts / fills.ts / nodeRendererText.ts / styleConverter.ts를 수정하여 7개 시각 정합성 갭(G1~G7)을 해결한다. position:sticky는 post-layout 보정으로 Taffy 수정 없이 구현한다. 모든 변경은 기존 코드에 대한 수정이며 신규 파일은 최소화��다.

**Tech Stack:** TypeScript, CanvasKit/Skia WASM, Vitest

**Prerequisite:** Phase 2 완료 (SceneGraph + SkiaCanvas + Feature flags)

**이미 구현 확인됨 (스킵):** sepia/invert 필터 (styleConverter.ts), outline-style (nodeRendererBorders.ts)

---

## 파일 구조

| 파일                                   | 변경 유형 | 담당 Task     |
| -------------------------------------- | --------- | ------------- |
| `apps/.../sprites/styleConverter.ts`   | Modify    | 3.1, 3.4      |
| `apps/.../skia/effects.ts`             | Modify    | 3.1           |
| `apps/.../skia/nodeRendererText.ts`    | Modify    | 3.4           |
| `apps/.../skia/fills.ts`               | Modify    | 3.5, 3.6, 3.7 |
| `apps/.../skia/types.ts`               | Modify    | 3.2, 3.4, 3.8 |
| `apps/.../skia/nodeRendererBorders.ts` | Modify    | 3.2           |
| `apps/.../skia/nodeRendererEffects.ts` | Create    | 3.8           |
| `apps/.../layout/stickyResolver.ts`    | Create    | 3.9           |
| 테스트 파일들                          | Create    | 각 Task       |

> 경로 접두사: `apps/builder/src/builder/workspace/canvas/`

---

## Task 3.1: G3 — Blur sigma 공식 수정 (1줄 × 2곳)

**Files:**

- Modify: `sprites/styleConverter.ts:1189,1678`
- Test: `skia/__tests__/blurSigma.test.ts`

CSS W3C 표준: sigma = radius / (2 × sqrt(2 × ln(2))) ≈ radius / 2.355

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/blurSigma.test.ts
import { describe, test, expect } from "vitest";

const CSS_BLUR_SIGMA_DIVISOR = 2.355;

describe("G3: blur sigma formula", () => {
  test("CSS 10px blur → sigma ≈ 4.246", () => {
    const sigma = 10 / CSS_BLUR_SIGMA_DIVISOR;
    expect(sigma).toBeCloseTo(4.246, 2);
  });

  test("CSS 0px blur → sigma 0", () => {
    expect(0 / CSS_BLUR_SIGMA_DIVISOR).toBe(0);
  });
});
```

- [ ] **Step 2: styleConverter.ts 수정 — parseOneShadow (line 1189)**

```typescript
// 변경 전 (line 1188-1189):
// CSS blur-radius → Skia sigma (sigma ≈ blurRadius / 2)
const sigma = blurRadius / 2;

// 변경 후:
// CSS blur-radius → Skia sigma (W3C Gaussian: σ = radius / 2.355)
const sigma = blurRadius / 2.355;
```

- [ ] **Step 3: styleConverter.ts 수정 — parseDropShadowFilterArgs (line 1678)**

```typescript
// 변경 전 (line 1677-1678):
// CSS blur-radius → Skia sigma (sigma ≈ blurRadius / 2)
const sigma = blurRadius / 2;

// 변경 후:
// CSS blur-radius → Skia sigma (W3C Gaussian: σ = radius / 2.355)
const sigma = blurRadius / 2.355;
```

- [ ] **Step 4: 테스트 실행**

Run: `npx vitest run skia/__tests__/blurSigma.test.ts`

- [ ] **Step 5: 커밋**

```bash
git add -A && git commit -m "fix(skia): G3 blur sigma formula — radius/2 → radius/2.355 (W3C)"
```

---

## Task 3.2: G1+G2 — Box-shadow + border-radius + spread 통합 수정

**Files:**

- Modify: `skia/types.ts` — DropShadowEffect에 borderRadius 추가
- Modify: `skia/nodeRendererBorders.ts` — renderBox에서 shadow를 RRect로 렌더
- Modify: `sprites/styleConverter.ts` — shadow 파싱 시 spread → RRect 확대
- Test: `skia/__tests__/boxShadow.test.ts`

현재: shadow가 직사각형 bounds에 렌더 → border-radius 무시. spread는 dilate/erode 필터 근사.
목표: shadow를 border-radius에 맞는 RRect로 직접 draw, spread는 RRect 크기 확대로 처리.

- [ ] **Step 1: 테스트 작성**

```typescript
// skia/__tests__/boxShadow.test.ts
import { describe, test, expect } from "vitest";

describe("G1+G2: box-shadow border-radius + spread", () => {
  test("shadow spread expands RRect bounds", () => {
    const bounds = { x: 0, y: 0, w: 100, h: 50 };
    const spread = 5;
    const expanded = {
      x: bounds.x - spread,
      y: bounds.y - spread,
      w: bounds.w + spread * 2,
      h: bounds.h + spread * 2,
    };
    expect(expanded.w).toBe(110);
    expect(expanded.h).toBe(60);
  });

  test("shadow border-radius increases with spread", () => {
    const borderRadius = 8;
    const spread = 5;
    // CSS 스펙: shadow radius = max(0, border-radius + spread)
    const shadowRadius = Math.max(0, borderRadius + spread);
    expect(shadowRadius).toBe(13);
  });

  test("negative spread shrinks bounds and radius", () => {
    const borderRadius = 8;
    const spread = -3;
    const shadowRadius = Math.max(0, borderRadius + spread);
    expect(shadowRadius).toBe(5);
  });
});
```

- [ ] **Step 2: effects.ts의 drop-shadow에서 dilate/erode 제거 → spread를 무시하도록 변경**

effects.ts line 77-115의 drop-shadow 분기에서 `spread` 관련 dilate/erode 코드를 제거하고, spread는 nodeRendererBorders에서 RRect 크기 확대로 처리하도록 변경. (effects.ts의 drop-shadow는 CSS `filter: drop-shadow()`용으로 유지 — spread 없음)

- [ ] **Step 3: nodeRendererBorders.ts에 renderBoxShadows 함수 추가**

renderBox 함수 내부, fill 렌더링 직전에 shadow 렌더링 호출:

```typescript
function renderBoxShadows(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
): void {
  if (!node.box?.shadows?.length) return;

  const br = node.box.borderRadius;

  for (const shadow of node.box.shadows) {
    if (shadow.inner) continue; // outer shadow만 (inset은 별도)

    canvas.save();
    canvas.translate(shadow.dx, shadow.dy);

    const spread = shadow.spread ?? 0;
    const shadowRect = ck.LTRBRect(
      -spread,
      -spread,
      node.width + spread,
      node.height + spread,
    );

    const paint = new ck.Paint();
    paint.setAntiAlias(true);
    paint.setColor(shadow.color);

    if (shadow.sigmaX > 0 || shadow.sigmaY > 0) {
      paint.setImageFilter(
        ck.ImageFilter.MakeBlur(
          shadow.sigmaX,
          shadow.sigmaY,
          ck.TileMode.Decal,
          null,
        ),
      );
    }

    // border-radius에 맞는 RRect로 shadow 렌더
    const shadowRadius = Math.max(
      0,
      (typeof br === "number" ? br : 0) + spread,
    );
    if (shadowRadius > 0) {
      canvas.drawRRect(
        ck.RRectXY(shadowRect, shadowRadius, shadowRadius),
        paint,
      );
    } else {
      canvas.drawRect(shadowRect, paint);
    }

    paint.delete();
    canvas.restore();
  }
}
```

- [ ] **Step 4: renderBox에서 renderBoxShadows 호출**

nodeRendererBorders.ts renderBox 함수에서 fill 렌더링 직전(line ~316)에 호출:

```typescript
// shadow는 fill 아래에 렌더 (CSS 스펙)
renderBoxShadows(ck, canvas, node);
```

- [ ] **Step 5: types.ts의 BoxStyle에 shadows 필드 추가**

```typescript
// types.ts — BoxStyle 인터페이스에 추가
shadows?: DropShadowEffect[];
```

- [ ] **Step 6: styleConverter.ts에서 boxShadow를 BoxStyle.shadows로 변환**

기존 `parseAllBoxShadows` 결과를 effects 배열이 아닌 `box.shadows`로 라우팅.

- [ ] **Step 7: 테스트 + 커밋**

---

## Task 3.3: G5 — Repeating gradient (TileMode 분기)

**Files:**

- Modify: `skia/fills.ts:54-74`
- Modify: `skia/types.ts` — gradient fill에 repeating 필드 추가
- Test: `skia/__tests__/gradientRepeat.test.ts`

- [ ] **Step 1: 테스트**

```typescript
import { describe, test, expect } from "vitest";

describe("G5: repeating-gradient TileMode", () => {
  test("repeating=true → Repeat tileMode", () => {
    const repeating = true;
    const tileMode = repeating ? "Repeat" : "Clamp";
    expect(tileMode).toBe("Repeat");
  });

  test("repeating=false → Clamp tileMode (기본값)", () => {
    const repeating = false;
    const tileMode = repeating ? "Repeat" : "Clamp";
    expect(tileMode).toBe("Clamp");
  });
});
```

- [ ] **Step 2: types.ts LinearGradientFill에 repeating 필드 추가**

```typescript
export interface LinearGradientFill {
  type: "linear-gradient";
  // ... existing fields
  repeating?: boolean; // G5: repeating-linear-gradient
}
```

RadialGradientFill, AngularGradientFill에도 동일 추가.

- [ ] **Step 3: fills.ts에서 TileMode 분기**

fills.ts line 68 (linear-gradient):

```typescript
// 변경 전:
ck.TileMode.Clamp,

// 변경 후:
fill.repeating ? ck.TileMode.Repeat : ck.TileMode.Clamp,
```

radial-gradient (line 92), angular-gradient (line 117)에도 동일 적용.

- [ ] **Step 4: styleConverter.ts에서 repeating- 접두사 파싱**

CSS `repeating-linear-gradient(...)` → `{ type: "linear-gradient", repeating: true, ... }`

- [ ] **Step 5: 테스트 + 커밋**

---

## Task 3.4: G4 — Text-shadow 구현 (2-pass 렌더링)

**Files:**

- Modify: `skia/types.ts` — TextShadow 인터페이스 추가
- Modify: `skia/nodeRendererText.ts:430` — shadow pass 삽입
- Modify: `sprites/styleConverter.ts` — text-shadow 파싱
- Test: `skia/__tests__/textShadow.test.ts`

- [ ] **Step 1: types.ts에 TextShadow 타입 추가**

```typescript
export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number; // sigma (이미 변환된 값)
  color: Float32Array;
}
```

SkiaNodeData의 text 인터페이스에 `textShadows?: TextShadow[]` 추가.

- [ ] **Step 2: nodeRendererText.ts에 shadow pass 삽입 (line 430 앞)**

```typescript
// Pass 1: text-shadow 렌더
if (node.text.textShadows?.length) {
  for (const shadow of node.text.textShadows) {
    canvas.save();
    canvas.translate(shadow.offsetX, shadow.offsetY);

    if (shadow.blur > 0) {
      const blurPaint = new ck.Paint();
      blurPaint.setImageFilter(
        ck.ImageFilter.MakeBlur(shadow.blur, shadow.blur, ck.TileMode.Decal, null),
      );
      canvas.saveLayer(blurPaint);
      blurPaint.delete();
    }

    // shadow 색상으로 Paragraph 재생성 (또는 ColorFilter 적용)
    canvas.drawParagraph(
      paragraph,
      node.text.paddingLeft + textIndent + alignOffset,
      drawY,
    );

    if (shadow.blur > 0) canvas.restore(); // blur layer
    canvas.restore(); // translate
  }
}

// Pass 2: 원본 텍스트 (기존 코드)
canvas.drawParagraph(paragraph, ...);
```

- [ ] **Step 3: styleConverter.ts에 parseTextShadow 함수 추가**

CSS `text-shadow: 2px 2px 4px rgba(0,0,0,0.5)` 파싱. parseOneShadow와 유사 구조.

- [ ] **Step 4: 테스트 + 커밋**

---

## Task 3.5: G6 — Radial-gradient 키워드 변환

**Files:**

- Modify: `skia/fills.ts` — resolveRadialSize 함수 추가
- Modify: `sprites/styleConverter.ts` — radial gradient 키워드 파싱
- Test: `skia/__tests__/radialGradient.test.ts`

- [ ] **Step 1: 테스트**

```typescript
import { describe, test, expect } from "vitest";

function resolveRadialSize(
  keyword: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
): { rx: number; ry: number } {
  switch (keyword) {
    case "closest-side":
      return { rx: Math.min(cx, w - cx), ry: Math.min(cy, h - cy) };
    case "farthest-side":
      return { rx: Math.max(cx, w - cx), ry: Math.max(cy, h - cy) };
    case "farthest-corner":
    default:
      return {
        rx: Math.sqrt(Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2),
        ry: Math.sqrt(Math.max(cx, w - cx) ** 2 + Math.max(cy, h - cy) ** 2),
      };
  }
}

describe("G6: radial-gradient keywords", () => {
  test("closest-side at center", () => {
    const { rx, ry } = resolveRadialSize("closest-side", 50, 50, 100, 80);
    expect(rx).toBe(50);
    expect(ry).toBe(30);
  });

  test("farthest-side at offset", () => {
    const { rx, ry } = resolveRadialSize("farthest-side", 30, 20, 100, 80);
    expect(rx).toBe(70);
    expect(ry).toBe(60);
  });
});
```

- [ ] **Step 2: fills.ts에 resolveRadialSize 함수 추가 + radial gradient 렌더에서 사용**

- [ ] **Step 3: 테스트 + 커밋**

---

## Task 3.6: G7 — Gradient oklab 색상 보간

**Files:**

- Create: `skia/oklabInterpolation.ts` (~80줄)
- Modify: `skia/fills.ts` — gradient color stop을 oklab 경유로 확장
- Test: `skia/__tests__/oklabInterpolation.test.ts`

- [ ] **Step 1: oklab 변환 테스트**

```typescript
import { describe, test, expect } from "vitest";
import { srgbToOklab, oklabToSrgb } from "../oklabInterpolation";

describe("G7: oklab interpolation", () => {
  test("white sRGB → oklab → sRGB roundtrip", () => {
    const [L, a, b] = srgbToOklab(1, 1, 1);
    expect(L).toBeCloseTo(1.0, 2);
    const [r, g, bl] = oklabToSrgb(L, a, b);
    expect(r).toBeCloseTo(1.0, 2);
    expect(g).toBeCloseTo(1.0, 2);
    expect(bl).toBeCloseTo(1.0, 2);
  });

  test("black sRGB → oklab L=0", () => {
    const [L] = srgbToOklab(0, 0, 0);
    expect(L).toBeCloseTo(0, 2);
  });
});
```

- [ ] **Step 2: oklabInterpolation.ts 구현**

sRGB → linear RGB → oklab 변환 (Björn Ottosson 행렬) + 역변환.

- [ ] **Step 3: fills.ts에서 gradient 생성 시 oklab 보간 옵션 적용**

- [ ] **Step 4: 테스트 + 커밋**

---

## Task 3.7: Backdrop-filter

**Files:**

- Modify: `skia/types.ts` — BackdropFilterEffect 추가
- Modify: `skia/effects.ts` — backdrop-filter 렌더링
- Modify: `sprites/styleConverter.ts` — backdrop-filter 파싱
- Test: `skia/__tests__/backdropFilter.test.ts`

- [ ] **Step 1: types.ts에 BackdropFilterEffect 추가**

```typescript
export interface BackdropFilterEffect {
  type: "backdrop-filter";
  sigma: number; // backdrop-filter: blur(Xpx)
}
```

EffectStyle 유니온에 추가.

- [ ] **Step 2: effects.ts beginRenderEffects에 backdrop-filter 분기 추가**

```typescript
case "backdrop-filter": {
  // SaveLayer → 배경 blur → 요소 렌더 → restore
  const backdropPaint = new ck.Paint();
  backdropPaint.setImageFilter(
    ck.ImageFilter.MakeBlur(
      effect.sigma, effect.sigma, ck.TileMode.Clamp, null,
    ),
  );
  canvas.saveLayer(backdropPaint);
  backdropPaint.delete();
  layerCount++;
  break;
}
```

- [ ] **Step 3: styleConverter.ts에서 backdropFilter 파싱**

- [ ] **Step 4: 테스트 + 커밋**

---

## Task 3.8: Position sticky (post-layout 보정)

**Files:**

- Create: `layout/stickyResolver.ts` (~50줄)
- Modify: `layout/engines/fullTreeLayout.ts` — sticky 보정 호출
- Test: `layout/__tests__/stickyResolver.test.ts`

Chrome Blink 기법: Taffy 레이아웃 결과에 post-layout 보정 적용. Taffy 수정 불필요.

- [ ] **Step 1: stickyResolver 테스트**

```typescript
import { describe, test, expect } from "vitest";

interface StickyInput {
  elementY: number; // 레이아웃 결과 y
  stickyTop: number; // CSS top 값
  scrollOffset: number; // 스크롤 위치
  containerTop: number; // 부모 상단
  containerBottom: number; // 부모 하단
  elementHeight: number;
}

function resolveStickyY(input: StickyInput): number {
  const {
    elementY,
    stickyTop,
    scrollOffset,
    containerTop,
    containerBottom,
    elementHeight,
  } = input;
  const viewportTop = scrollOffset + stickyTop;

  // Normal: 아직 스크롤 안 됨
  if (elementY >= viewportTop) return elementY;

  // Stuck: 고정 위치
  const stuckY = viewportTop;

  // Bottom limit: 부모 하단을 벗어나지 않음
  const maxY = containerBottom - elementHeight;
  return Math.min(stuckY, maxY);
}

describe("stickyResolver", () => {
  test("normal state — 스크롤 전", () => {
    const y = resolveStickyY({
      elementY: 200,
      stickyTop: 0,
      scrollOffset: 0,
      containerTop: 0,
      containerBottom: 1000,
      elementHeight: 50,
    });
    expect(y).toBe(200); // 원래 위치
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
    expect(y).toBe(260); // scrollOffset + stickyTop
  });

  test("bottom limit — 부모 하단 제한", () => {
    const y = resolveStickyY({
      elementY: 200,
      stickyTop: 0,
      scrollOffset: 980,
      containerTop: 0,
      containerBottom: 1000,
      elementHeight: 50,
    });
    expect(y).toBe(950); // containerBottom - elementHeight
  });
});
```

- [ ] **Step 2: stickyResolver.ts 구현**

- [ ] **Step 3: fullTreeLayout.ts에서 sticky 요소에 보정 적용**

DFS post-order에서 `position: sticky` 감지 → `resolveStickyY` 호출 → layout y 보정.

- [ ] **Step 4: 테스트 + 커밋**

---

## Task 3.9: CSS transitions 엔진 (~130줄)

**Files:**

- Create: `skia/transitionEngine.ts` (~130줄)
- Test: `skia/__tests__/transitionEngine.test.ts`

순수 수학: cubic-bezier + lerp. 외부 의존성 없음.

- [ ] **Step 1: 테스트**

```typescript
import { describe, test, expect } from "vitest";

describe("CSS transition engine", () => {
  test("linear easing at t=0.5 → 0.5", () => {
    const result = cubicBezier(0, 0, 1, 1, 0.5);
    expect(result).toBeCloseTo(0.5, 3);
  });

  test("ease at t=0.5 → ~0.69", () => {
    // CSS ease = cubic-bezier(0.25, 0.1, 0.25, 1.0)
    const result = cubicBezier(0.25, 0.1, 0.25, 1.0, 0.5);
    expect(result).toBeCloseTo(0.69, 1);
  });

  test("lerp number", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});
```

- [ ] **Step 2: transitionEngine.ts 구현**

```typescript
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): number {
  /* Newton-Raphson solver */
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const EASINGS = {
  linear: (t: number) => t,
  ease: (t: number) => cubicBezier(0.25, 0.1, 0.25, 1.0, t),
  "ease-in": (t: number) => cubicBezier(0.42, 0, 1, 1, t),
  "ease-out": (t: number) => cubicBezier(0, 0, 0.58, 1, t),
  "ease-in-out": (t: number) => cubicBezier(0.42, 0, 0.58, 1, t),
} as const;
```

- [ ] **Step 3: 테스트 + 커밋**

---

## Task 3.10: Phase 3 Gate 검증

| Gate 항목            | 통과 조건                            |
| -------------------- | ------------------------------------ |
| pnpm type-check      | 0 errors                             |
| vitest Phase 3 tests | 전부 pass                            |
| G1~G7 시각 정합성    | 82%→97% (스크린샷 비교)              |
| position:sticky      | WPT 스타일 3+ 케이스 통과            |
| backdrop-filter      | blur(10px) 렌더링 정상               |
| transitions          | 5종 easing 브라우저 비교 ≤0.001 오차 |
| 벤치마크 회귀 없음   | fps ≥ Phase 2 baseline               |

- [ ] **Step 1: pnpm type-check**
- [ ] **Step 2: vitest 전체 실행**
- [ ] **Step 3: 기존 ADR-100 테스트 회귀 확인**
- [ ] **Step 4: 메모리 갱신**

---

## 의존성 그래프

```
Task 3.1 (blur sigma) ─────── 독립
Task 3.2 (box-shadow) ─────── 독립 (3.1 이후 권장)
Task 3.3 (repeating grad) ─── 독립
Task 3.4 (text-shadow) ────── 독립
Task 3.5 (radial keywords) ── 독립
Task 3.6 (oklab) ──────────── 독립
Task 3.7 (backdrop-filter) ── 독립
Task 3.8 (sticky) ─────────── 독립
Task 3.9 (transitions) ────── 독립
Task 3.10 (Gate) ──────────── 3.1~3.9 전부 완료 후
```

모든 Task가 독립적이므로 병렬 실행 가능.
