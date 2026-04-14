# ADR-059 Phase 4-infra2: Selector Emit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSSGenerator에 `composition.sizeSelectors` (0-D.9) + animation-name auto-rewrite 추가 + ProgressBar/Meter 해체.

**Architecture:** `CompositionSpec.sizeSelectors` 신규 필드 (CSS 전용, Skia 무시) + Generator가 모든 style block의 `animation`/`animation-name` 값을 `animations` 선언 기반으로 `{specName}-{animName}` 자동 치환. 58-component snapshot + 추가 단위 테스트 2중 회귀 감지.

**Tech Stack:** TypeScript, vitest, pnpm monorepo.

**Design doc:** `docs/superpowers/specs/2026-04-14-adr059-phase4-infra2-selector-emit-design.md`

**Baseline commit (main):** `2f82fabe` (design revision)

---

### Task 1: `sizeSelectors` 타입 선언

**Files:**

- Modify: `packages/specs/src/types/spec.types.ts:280-348` (CompositionSpec)

- [ ] **Step 1: Read CompositionSpec 현 정의**

Read `packages/specs/src/types/spec.types.ts:280-348`.

- [ ] **Step 2: `sizeSelectors` 필드 추가**

`animations` 필드 직후, `delegation` 직전에 삽입:

```ts
  /**
   * CSS 전용 per-size nested child selectors (ADR-059 v2 Phase 4-infra2 0-D.9).
   *
   * Skia consumer는 shapes로 size별 dimension 처리 → 이 필드 무시 (CSS only).
   * emit: `.react-aria-{SpecName}[data-size="{size}"] {selector} { ...styles }`
   *
   * 구조:
   *   sizeSelectors: {
   *     sm: {
   *       ".bar": { height: "4px", "border-radius": "2px" },
   *       ".fill": { "border-radius": "2px" }
   *     }
   *   }
   */
  sizeSelectors?: Record<
    string,
    Record<string, Record<string, string>>
  >;
```

- [ ] **Step 3: 타입 체크**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/types/spec.types.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra2 — add CompositionSpec.sizeSelectors type (0-D.9)"
```

---

### Task 2: `sizeSelectors` emit 구현 + snapshot diff 0 검증

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts` (신규 helper + generateCSS 호출)

- [ ] **Step 1: 현재 generateCSS 구조 파악**

Read `packages/specs/src/renderers/CSSGenerator.ts:100-260` — generateCSS 본문 + `@layer components` close 지점(line ~248).

- [ ] **Step 2: `generateSizeSelectorRules` helper 추가**

`CSSGenerator.ts` 파일 하단, `generateAnimationAtRules` 함수 **직전**에 추가:

```ts
// ─── Phase 4-infra2 0-D.9: Size Selectors ──────────────────────────────────

/**
 * `composition.sizeSelectors` → per-size child selector rules emit.
 * `@layer components` 내부에 emit. 미선언 시 빈 배열 반환 → 출력 변화 0.
 */
function generateSizeSelectorRules<Props>(
  spec: ComponentSpec<Props>,
): string[] {
  const sizeSelectors = spec.composition?.sizeSelectors;
  if (!sizeSelectors) return [];

  const lines: string[] = [];
  const rootSel = `.react-aria-${spec.name}`;

  for (const [sizeKey, selectors] of Object.entries(sizeSelectors)) {
    for (const [selector, styles] of Object.entries(selectors)) {
      const fullSel = `${rootSel}[data-size="${sizeKey}"] ${selector}`;
      lines.push(`  ${fullSel} {`);
      for (const [prop, value] of Object.entries(styles)) {
        lines.push(`    ${prop}: ${value};`);
      }
      lines.push(`  }`);
      lines.push("");
    }
  }

  return lines;
}
```

- [ ] **Step 3: generateCSS 에서 호출 (at-rule emit 직전)**

`CSSGenerator.ts` 의 `} /* @layer components */` 라인 바로 **직전**에 호출 추가. Read해서 현재 형태 확인:

```
  lines.push("");
  lines.push("} /* @layer components */");
```

Edit old_string:

```
  lines.push("");
  lines.push("} /* @layer components */");

  // ─── Phase 4-infra: Animation at-rules (@layer 바깥) ───
  const atRules = generateAnimationAtRules(spec);
```

new_string:

```
  // ─── Phase 4-infra2 0-D.9: Size selectors (@layer 내부) ───
  const sizeSelectorRules = generateSizeSelectorRules(spec);
  if (sizeSelectorRules.length > 0) {
    lines.push("");
    lines.push(...sizeSelectorRules);
  }

  lines.push("");
  lines.push("} /* @layer components */");

  // ─── Phase 4-infra: Animation at-rules (@layer 바깥) ───
  const atRules = generateAnimationAtRules(spec);
```

- [ ] **Step 4: snapshot 테스트 실행 → diff 0 확인**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 58/58 PASS, snapshot diff 없음 (sizeSelectors 미사용 → 출력 불변).

실패 시 `generateSizeSelectorRules` 가 빈 배열일 때 lines.push 조건 가드 재검토.

- [ ] **Step 5: type-check + build**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs type-check && pnpm build:specs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra2 — sizeSelectors emit (0-D.9)"
```

---

### Task 3: Animation name auto-rewrite 구현

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts`

- [ ] **Step 1: rewrite helper 추가**

`CSSGenerator.ts` 상단 유틸 영역(다른 helper들 근처, 예: line 80-100 사이 기존 유틸 그룹)에 추가. 파일을 Read해서 유틸 블록 정확한 위치 확인 후:

```ts
// ─── Phase 4-infra2: Animation Name Rewrite ────────────────────────────────

/**
 * style 값 내부 animation/animation-name 을 `{specName}-{animName}` 으로 rewrite.
 * spec.composition.animations 에 선언된 이름만 치환. 외부 이름은 보존.
 *
 * - `animation-name: foo` → `animation-name: ProgressBar-foo`
 * - `animation: foo 1.5s ease` → `animation: ProgressBar-foo 1.5s ease`
 * - `animation: other 1s` (animations 미선언) → 그대로
 */
function rewriteAnimationNames<Props>(
  styles: Record<string, string>,
  spec: ComponentSpec<Props>,
): Record<string, string> {
  const animations = spec.composition?.animations;
  if (!animations) return styles;
  const declaredNames = new Set(Object.keys(animations));
  if (declaredNames.size === 0) return styles;

  const prefix = (name: string): string =>
    declaredNames.has(name) ? `${spec.name}-${name}` : name;

  const result: Record<string, string> = {};
  for (const [prop, value] of Object.entries(styles)) {
    if (prop === "animation-name") {
      result[prop] = prefix(value.trim());
    } else if (prop === "animation") {
      const trimmed = value.trim();
      const firstSpace = trimmed.indexOf(" ");
      if (firstSpace === -1) {
        result[prop] = prefix(trimmed);
      } else {
        const firstToken = trimmed.slice(0, firstSpace);
        const rest = trimmed.slice(firstSpace);
        result[prop] = `${prefix(firstToken)}${rest}`;
      }
    } else {
      result[prop] = value;
    }
  }
  return result;
}
```

- [ ] **Step 2: emit 경로에 rewrite 적용**

root styles / containerVariants / sizeSelectors 3곳의 style record 출력 직전에 `rewriteAnimationNames(styles, spec)` 적용. 각 경로의 정확한 위치를 파일에서 찾아 Edit.

**(a) `generateSizeSelectorRules`** — Task 2에서 작성한 helper 내부 `for (const [prop, value] of Object.entries(styles))` 직전에 rewrite 삽입:

```ts
for (const [selector, rawStyles] of Object.entries(selectors)) {
  const styles = rewriteAnimationNames(rawStyles, spec);
  const fullSel = `${rootSel}[data-size="${sizeKey}"] ${selector}`;
  lines.push(`  ${fullSel} {`);
  for (const [prop, value] of Object.entries(styles)) {
    lines.push(`    ${prop}: ${value};`);
  }
  lines.push(`  }`);
  lines.push("");
}
```

**(b) containerVariants emit 경로** — Read `CSSGenerator.ts` 로 `containerVariants` 처리하는 helper(이름 예상: `generateContainerVariantRules` 또는 generateCSS 내 inline) 찾아 style record 순회 직전에 rewrite 적용:

grep `containerVariants` in CSSGenerator.ts → emit 지점에서 `styles` record 출력 전에 `const styles = rewriteAnimationNames(rawStyles, spec);` 삽입. nested 자식도 동일 처리.

**(c) root `generateBaseStyles` 또는 그 호출자** — 동일 패턴.

- [ ] **Step 3: snapshot 테스트 실행 → diff 0 확인**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 58/58 PASS, diff 없음 (기존 spec은 animation 값에 미선언 이름 없음 또는 animations 자체 없음 → rewrite no-op).

실패 시 rewrite 로직이 animations 미선언 spec에서 early-return 하는지 재검증.

- [ ] **Step 4: type-check**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra2 — animation-name auto-rewrite"
```

---

### Task 4: 단위 테스트 — sizeSelectors emit + animation rewrite

**Files:**

- Create: `packages/specs/src/renderers/__tests__/CSSGenerator.sizeSelectors.test.ts`
- Create: `packages/specs/src/renderers/__tests__/CSSGenerator.animationRewrite.test.ts`

- [ ] **Step 1: sizeSelectors emit 테스트 작성**

```ts
// packages/specs/src/renderers/__tests__/CSSGenerator.sizeSelectors.test.ts
import { describe, it, expect } from "vitest";
import { generateCSS } from "../CSSGenerator";
import type { ComponentSpec } from "../../types/spec.types";

function makeSpec(overrides: Partial<ComponentSpec["composition"]> = {}): ComponentSpec {
  return {
    name: "TestBar",
    archetype: "container",
    sizes: { md: { height: "8px" } },
    composition: {
      layout: "flex-column",
      delegation: [],
      ...overrides,
    },
  } as unknown as ComponentSpec;
}

describe("sizeSelectors emit (0-D.9)", () => {
  it("sizeSelectors 미선언 시 selector rule 없음", () => {
    const css = generateCSS(makeSpec());
    expect(css).not.toMatch(/\[data-size="[^"]+"\]\s+\./);
  });

  it("sizeSelectors 선언 시 per-size nested selector emit", () => {
    const css = generateCSS(
      makeSpec({
        sizeSelectors: {
          sm: { ".bar": { height: "4px" } },
        },
      }),
    );
    expect(css).toContain('.react-aria-TestBar[data-size="sm"] .bar');
    expect(css).toContain("height: 4px;");
  });

  it("sizeSelectors 는 @layer components 내부에 위치", () => {
    const css = generateCSS(
      makeSpec({
        sizeSelectors: { sm: { ".bar": { height: "4px" } } },
      })!;
    const layerClose = css.indexOf("} /* @layer components */");
    const sizeRule = css.indexOf('[data-size="sm"] .bar');
    expect(sizeRule).toBeGreaterThan(-1);
    expect(sizeRule).toBeLessThan(layerClose);
  });

  it("root .bar 보다 뒤에 emit (cascade 순서)", () => {
    const css = generateCSS(
      makeSpec({
        containerStyles: {},
        sizeSelectors: { sm: { ".bar": { height: "4px" } } },
      }),
    )!;
    const sizeIdx = css.indexOf('[data-size="sm"] .bar');
    // containerVariants / 기타 base rule 이 먼저 나오는지 확인 — 최소한 cascade 위치 확인
    expect(sizeIdx).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: animation rewrite 테스트 작성**

```ts
// packages/specs/src/renderers/__tests__/CSSGenerator.animationRewrite.test.ts
import { describe, it, expect } from "vitest";
import { generateCSS } from "../CSSGenerator";
import type { ComponentSpec } from "../../types/spec.types";

function makeSpec(
  composition: Partial<ComponentSpec["composition"]> = {},
): ComponentSpec {
  return {
    name: "AnimTest",
    archetype: "container",
    sizes: { md: {} },
    composition: {
      layout: "flex-column",
      delegation: [],
      ...composition,
    },
  } as unknown as ComponentSpec;
}

describe("animation-name auto-rewrite", () => {
  it("animations 선언 이름은 {specName}-{animName} 으로 prefix", () => {
    const css = generateCSS(
      makeSpec({
        animations: {
          spin: {
            keyframes: { "0%": { transform: "rotate(0deg)" } },
          },
        },
        sizeSelectors: {
          md: { ".icon": { animation: "spin 1s linear infinite" } },
        },
      }),
    )!;
    expect(css).toContain("animation: AnimTest-spin 1s linear infinite;");
    expect(css).not.toContain("animation: spin 1s");
  });

  it("animation-name 단독 property 도 prefix", () => {
    const css = generateCSS(
      makeSpec({
        animations: { pulse: { keyframes: {} } },
        sizeSelectors: {
          md: { ".dot": { "animation-name": "pulse" } },
        },
      }),
    )!;
    expect(css).toContain("animation-name: AnimTest-pulse;");
  });

  it("미선언 이름은 rewrite 하지 않음", () => {
    const css = generateCSS(
      makeSpec({
        animations: { spin: { keyframes: {} } },
        sizeSelectors: {
          md: { ".bar": { animation: "externalAnim 1s ease" } },
        },
      }),
    )!;
    expect(css).toContain("animation: externalAnim 1s ease;");
    expect(css).not.toContain("AnimTest-externalAnim");
  });

  it("animations 자체 없으면 no-op", () => {
    const css = generateCSS(
      makeSpec({
        sizeSelectors: {
          md: { ".bar": { animation: "foo 1s" } },
        },
      }),
    )!;
    expect(css).toContain("animation: foo 1s;");
  });
});
```

- [ ] **Step 3: 두 테스트 실행**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.sizeSelectors CSSGenerator.animationRewrite`
Expected: 모든 PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/renderers/__tests__/CSSGenerator.sizeSelectors.test.ts \
        packages/specs/src/renderers/__tests__/CSSGenerator.animationRewrite.test.ts
git commit -m "test(specs): ADR-059 Phase 4-infra2 — sizeSelectors + animation rewrite unit tests"
```

---

### Task 5: ProgressBar 해체

**Files:**

- Modify: `packages/specs/src/components/ProgressBar.spec.ts`
- Modify: `packages/shared/src/components/ProgressBar.tsx` (wrapper에 data-indeterminate 주입 + import 교체)
- Modify: `packages/shared/src/components/styles/index.css` (import 경로 교체)
- Delete: `packages/shared/src/components/styles/ProgressBar.css`

- [ ] **Step 1: 기존 ProgressBar.css 내용 Read**

Read `packages/shared/src/components/styles/ProgressBar.css` 전체 182줄. spec 이식 대상 목록화:

- root: grid layout, `--fill-color`, `--track-color`, `color`, `font-size`, `--label-font-size`
- nested root: `.react-aria-Label`, `.value`, `.bar`, `.fill`
- `:not([aria-valuenow])` → **containerVariants.indeterminate.true.nested**
- variants: `[data-variant="default|accent|neutral"]` — containerVariants.variant
- sizes sm/md/lg/xl → sizes.\* + sizeSelectors per-size `.bar`/`.fill`
- states: `[data-focus-visible]` → containerVariants.focus-visible (or pseudo)
- `[data-disabled]` → containerVariants.disabled
- `@keyframes indeterminate` → animations.indeterminate
- `@media forced-colors` → 별 skip (Preview 전용, Spec 밖 — skipCSSGeneration 잔재)
- `@media prefers-reduced-motion` → animations.indeterminate.reducedMotion

주의: `@media (forced-colors: active)` 는 0-D.11 미지원 → Spec에 넣을 수 없음. ProgressBar.css 에서 이 블록만 별도 파일(ProgressBar-a11y.css) 로 분리하고 styles/index.css 에서 계속 import. (Meter 는 forced-colors 없음.)

- [ ] **Step 2: ProgressBar.spec.ts 읽고 수정**

Read `packages/specs/src/components/ProgressBar.spec.ts` 전체. `skipCSSGeneration: true` 확인.

Edit 변경:

- `skipCSSGeneration: true` → 제거 (또는 false)
- `composition` 에 다음 필드 추가/확장:

```ts
composition: {
  layout: "grid",  // 또는 기존 layout 유지
  containerStyles: {
    "grid-template-areas": '"label value" "bar bar"',
    "grid-template-columns": "1fr auto",
    "box-sizing": "border-box",
    "row-gap": "var(--spacing-xs)",
    "column-gap": "var(--spacing-md)",
    width: "100%",
    color: "var(--fg)",
    "font-size": "var(--text-sm)",
    "--label-font-size": "var(--text-sm)",
    "--fill-color": "var(--accent)",
    "--track-color": "var(--accent-subtle)",
  },
  containerVariants: {
    variant: {
      default: { styles: { "--fill-color": "var(--accent)", "--track-color": "var(--accent-subtle)" } },
      accent: { styles: { "--fill-color": "var(--accent)", "--track-color": "var(--accent-subtle)" } },
      neutral: { styles: { "--fill-color": "var(--fg-muted)", "--track-color": "var(--bg-muted)" } },
    },
    indeterminate: {
      true: {
        nested: {
          ".fill": {
            width: "120px",
            "border-radius": "inherit",
            animation: "indeterminate 1.5s infinite ease-in-out",  // auto-rewrite → ProgressBar-indeterminate
            "will-change": "transform",
          },
        },
      },
    },
    disabled: {
      true: {
        styles: {
          opacity: "0.38",
          cursor: "not-allowed",
          "pointer-events": "none",
        },
      },
    },
  },
  sizeSelectors: {
    sm: {
      ".bar": { height: "var(--spacing-xs)", "border-radius": "var(--radius-sm)" },
      ".fill": { "border-radius": "var(--radius-sm)" },
      ".value": { "font-size": "var(--text-xs)" },
    },
    md: {
      ".bar": { height: "var(--spacing-sm)", "border-radius": "var(--radius-sm)" },
      ".fill": { "border-radius": "var(--radius-sm)" },
      ".value": { "font-size": "var(--text-sm)" },
    },
    lg: {
      ".bar": { height: "var(--spacing-md)", "border-radius": "var(--radius-lg)" },
      ".fill": { "border-radius": "var(--radius-md)" },
      ".value": { "font-size": "var(--text-base)" },
    },
    xl: {
      ".bar": { height: "var(--spacing-lg)", "border-radius": "var(--radius-lg)" },
      ".fill": { "border-radius": "var(--radius-lg)" },
      ".value": { "font-size": "var(--text-lg)" },
    },
  },
  animations: {
    indeterminate: {
      keyframes: {
        "from": { transform: "translateX(-100%)" },
        "to": { transform: "translateX(250px)" },
      },
      reducedMotion: { "transition-duration": "0s" },  // 기존 .react-aria-ProgressBar 전체 대상
    },
  },
  delegation: [],  // 기존 값 유지
},
```

주의: `.react-aria-Label { grid-area: label; white-space: nowrap }` 와 `.value { grid-area: value; font-size; color; white-space }`, `.bar { grid-area: bar; box-shadow; forced-color-adjust; height; border-radius; overflow; will-change; background }`, `.fill { border-radius; background; height; transition }` 등 root 하위 고정 자식 스타일은 **CSSGenerator가 지원하는 방식** (containerStyles의 nested 또는 별도 필드) 으로 이식. 현재 `containerStyles`는 flat record 이므로 자식 selector 를 지원하지 않음.

**지원 필드 확인 필요**: `containerVariants` 의 기본 variant 없이 nested 만 출력하거나, `externalStyles` 경로 활용. Read `CSSGenerator.ts` 에서 containerStyles + nested 패턴 확인 후 처리.

만약 현재 인프라로 root 하위 고정 자식 스타일 ( `.bar { ... }` 등 variant 독립) 을 표현 불가능하면 → **추가 infra 필요 → 본 Task 중단 + 별 PR**. 이 가드 확인을 Step 3 에서 수행.

- [ ] **Step 3: containerStyles child-selector 지원 여부 확인**

Run: `grep -n "containerStyles" /Users/admin/work/composition/packages/specs/src/renderers/CSSGenerator.ts`

현재 `containerStyles` 가 flat record only (`Record<string, string>`) 이므로 `.react-aria-Label { grid-area: label }` 같은 고정 자식 selector 불가능.

대안:

- (a) `containerVariants` 에 "default" variant 트릭 — `containerVariants: { _base: { always: { nested: { ".bar": {...} } } } }` — hacky
- (b) **추가 infra** — `composition.staticSelectors?: Record<string, Record<string, string>>` CSS 전용. Preview 에서 `.bar`/`.fill`/`.value`/`.react-aria-Label` 고정 selector 지원. Skia 무시.

**판정**: (b) 필요. 본 Task 5 에서 staticSelectors infra 추가 포함.

- [ ] **Step 4: `staticSelectors` 타입 + emit 추가 (선행 infra)**

**Modify `spec.types.ts`**: CompositionSpec 에 `sizeSelectors` 바로 위에 추가:

```ts
  /**
   * CSS 전용 root 하위 고정 자식 selector 스타일 (ADR-059 v2 Phase 4-infra2).
   *
   * variant 와 무관한 slot 스타일 (`.bar`, `.fill`, `.value` 등). Skia 무시.
   * emit: `.react-aria-{SpecName} {selector} { ...styles }`
   */
  staticSelectors?: Record<string, Record<string, string>>;
```

**Modify `CSSGenerator.ts`**: `generateSizeSelectorRules` 와 동일 패턴으로 `generateStaticSelectorRules` 추가:

```ts
function generateStaticSelectorRules<Props>(
  spec: ComponentSpec<Props>,
): string[] {
  const staticSelectors = spec.composition?.staticSelectors;
  if (!staticSelectors) return [];

  const lines: string[] = [];
  const rootSel = `.react-aria-${spec.name}`;

  for (const [selector, rawStyles] of Object.entries(staticSelectors)) {
    const styles = rewriteAnimationNames(rawStyles, spec);
    lines.push(`  ${rootSel} ${selector} {`);
    for (const [prop, value] of Object.entries(styles)) {
      lines.push(`    ${prop}: ${value};`);
    }
    lines.push(`  }`);
    lines.push("");
  }

  return lines;
}
```

`generateCSS` 에서 sizeSelectorRules 바로 **위에** 호출 삽입 (static → size 순서로 cascade):

```ts
const staticRules = generateStaticSelectorRules(spec);
if (staticRules.length > 0) {
  lines.push("");
  lines.push(...staticRules);
}

const sizeSelectorRules = generateSizeSelectorRules(spec);
if (sizeSelectorRules.length > 0) {
  lines.push("");
  lines.push(...sizeSelectorRules);
}

lines.push("");
lines.push("} /* @layer components */");
```

- [ ] **Step 5: snapshot 재실행 → diff 0**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 58/58 PASS, diff 없음.

- [ ] **Step 6: staticSelectors 단위 테스트 추가**

Edit `packages/specs/src/renderers/__tests__/CSSGenerator.sizeSelectors.test.ts` 끝에 추가 describe 블록:

```ts
describe("staticSelectors emit", () => {
  function makeSpec(
    overrides: Partial<ComponentSpec["composition"]> = {},
  ): ComponentSpec {
    return {
      name: "StaticBar",
      archetype: "container",
      sizes: { md: {} },
      composition: { layout: "flex-column", delegation: [], ...overrides },
    } as unknown as ComponentSpec;
  }

  it("staticSelectors 선언 시 root 하위 고정 selector emit", () => {
    const css = generateCSS(
      makeSpec({
        staticSelectors: {
          ".bar": { height: "8px", background: "red" },
        },
      }),
    )!;
    expect(css).toContain(".react-aria-StaticBar .bar");
    expect(css).toContain("height: 8px;");
    expect(css).toContain("background: red;");
  });
});
```

Run: `pnpm --filter @composition/specs test -- CSSGenerator.sizeSelectors`
Expected: PASS.

- [ ] **Step 7: Commit (infra 추가)**

```bash
git add packages/specs/src/types/spec.types.ts \
        packages/specs/src/renderers/CSSGenerator.ts \
        packages/specs/src/renderers/__tests__/CSSGenerator.sizeSelectors.test.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra2 — staticSelectors emit"
```

- [ ] **Step 8: ProgressBar.spec.ts 최종 수정 (staticSelectors 포함)**

Step 2 의 spec 정의에 `staticSelectors` 추가. `containerStyles` 의 자식 스타일을 `staticSelectors` 로 이동:

```ts
staticSelectors: {
  ".react-aria-Label": {
    "grid-area": "label",
    "white-space": "nowrap",
  },
  ".value": {
    "grid-area": "value",
    "font-size": "var(--text-sm)",
    color: "var(--fg-muted)",
    "white-space": "nowrap",
  },
  ".bar": {
    "grid-area": "bar",
    "box-shadow": "var(--inset-shadow-xs)",
    "forced-color-adjust": "none",
    height: "var(--spacing-sm)",
    "border-radius": "var(--radius-sm)",
    overflow: "hidden",
    "will-change": "transform",
    background: "var(--track-color)",
  },
  ".fill": {
    "border-radius": "var(--radius-sm)",
    background: "var(--fill-color)",
    height: "100%",
    transition: "width 200ms ease-out",
  },
},
```

Step 2 정의 전체를 실제 `ProgressBar.spec.ts` 에 반영. `skipCSSGeneration: true` 제거.

- [ ] **Step 9: ProgressBar.tsx wrapper 수정 (data-indeterminate 주입)**

Read `packages/shared/src/components/ProgressBar.tsx`. RAC `<ProgressBar>` 사용 지점에서 `children={({ isIndeterminate, ... }) => ...}` 또는 direct props.

방식: wrapper 최상위 div 또는 RAC root 에 `data-indeterminate` attr 주입. 만약 직접 RAC `ProgressBar` 컴포넌트만 쓴다면 wrapper 로 감싸거나 `className` 함수 대신 `data-indeterminate` 를 render prop 으로 전달.

간단한 방법: RAC `ProgressBar` 는 children function 패턴 지원. 수정:

```tsx
<ProgressBar {...props}>
  {({ isIndeterminate, valueText, percentage }) => (
    <div
      data-indeterminate={isIndeterminate || undefined}
      style={{ display: "contents" }}
    >
      {/* 기존 children 구조 */}
    </div>
  )}
</ProgressBar>
```

또는 더 간단히: wrapper 최상위가 이미 `<ProgressBar>` 면 children 함수에서 `data-indeterminate` 를 `<Label>`/`<div className="bar">` 의 **부모**에 주입해야 selector `.react-aria-ProgressBar[data-indeterminate] .fill` 매치.

**가장 깔끔한 방식**: RAC `<ProgressBar>` 의 `className`/`data-*` 는 render props 기반. `data-indeterminate` 를 직접 root 에 주입하려면 `<ProgressBar>` 를 래핑하는 `<div>` 추가 또는 RAC 의 render prop 시스템 사용.

실제 구현은 ProgressBar.tsx 현 코드 확인 후 최소 침습으로. Read + Edit.

Read: `packages/shared/src/components/ProgressBar.tsx`
Edit: wrapper root 에 `data-indeterminate={isIndeterminate ? "true" : undefined}` attr 추가 — 정확한 위치는 코드 보고 판단.

- [ ] **Step 10: import 교체**

`packages/shared/src/components/ProgressBar.tsx` 안의 CSS import:

- `import "./styles/ProgressBar.css"` → `import "./styles/generated/ProgressBar.css"`

`packages/shared/src/components/styles/index.css`:

- `@import "./ProgressBar.css"` → `@import "./generated/ProgressBar.css"`
- 만약 forced-colors 블록 유지 필요 시: `ProgressBar.css` 남기되 해당 @media 블록만 유지한 축약본으로 교체 + index.css 에 두 import 모두 유지

- [ ] **Step 11: 수동 CSS 정리**

forced-colors 블록만 남긴 축약 ProgressBar.css 를 `styles/ProgressBar.a11y.css` 로 리네임 (또는 본 PR 범위 넘으면 별 PR). 아래 축약본을 `ProgressBar.css` 에 **대체 작성**:

```css
/**
 * ProgressBar a11y overrides
 *
 * 대부분 스타일은 Spec → generated/ProgressBar.css 로 이동 (ADR-059 Phase 4-infra2).
 * 본 파일은 CSSGenerator 미지원 @media forced-colors 블록만 유지.
 */

@layer components {
  @media (forced-colors: active) {
    .react-aria-ProgressBar {
      forced-color-adjust: auto;
    }
  }
}
```

- [ ] **Step 12: generated CSS 빌드 + snapshot 업데이트**

Run:

```bash
cd /Users/admin/work/composition && pnpm build:specs
pnpm --filter @composition/specs test -- CSSGenerator.snapshot -u
```

Expected: ProgressBar snapshot 만 변경, 나머지 57 컴포넌트 불변.

`git diff packages/specs/src/renderers/__tests__/__snapshots__/` 로 확인 — ProgressBar 블록만 바뀌었는지 verify. 다른 컴포넌트 변경 있으면 중단 후 조사.

- [ ] **Step 13: type-check + dev server 시각 확인**

```bash
pnpm type-check
pnpm dev
```

브라우저에서:

- ProgressBar determinate mode (valueNow 설정) → fill 폭이 값에 비례
- ProgressBar indeterminate mode (value 미설정 or isIndeterminate) → animation 동작 (`ProgressBar-indeterminate` keyframe)
- sm/md/lg/xl sizes → bar height 각각 다름
- variants default/accent/neutral → --fill-color 반영
- disabled → opacity 0.38

- [ ] **Step 14: /cross-check skill 실행**

Run: `/cross-check ProgressBar`
Expected: CSS vs Skia 시각 대칭 통과.

- [ ] **Step 15: Commit**

```bash
git add packages/specs/src/components/ProgressBar.spec.ts \
        packages/shared/src/components/ProgressBar.tsx \
        packages/shared/src/components/styles/ProgressBar.css \
        packages/shared/src/components/styles/index.css \
        packages/shared/src/components/styles/generated/ProgressBar.css \
        packages/specs/src/renderers/__tests__/__snapshots__/
git commit -m "refactor(progress-bar): ADR-059 Phase 4.4 — spec-driven CSS via animations/sizeSelectors/staticSelectors"
```

---

### Task 6: Meter 해체

**Files:**

- Modify: `packages/specs/src/components/Meter.spec.ts`
- Modify: `packages/shared/src/components/Meter.tsx` (import 교체만)
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/Meter.css`

- [ ] **Step 1: Meter.css 전체 Read**

Read `packages/shared/src/components/styles/Meter.css` (152 줄). Meter 는 variant/size/base 스타일만 — animations/indeterminate/forced-colors 없음.

- [ ] **Step 2: Meter.spec.ts 수정**

`skipCSSGeneration: true` 제거. composition 에 `containerStyles`, `containerVariants`, `staticSelectors`, `sizeSelectors` 채움 (ProgressBar Task 5 Step 8 패턴 재사용, animations/indeterminate 는 제외).

예시 structure:

```ts
composition: {
  layout: "grid",
  containerStyles: {
    "grid-template-areas": '"label value" "bar bar"',
    "grid-template-columns": "1fr auto",
    /* ... 기존 Meter.css root 스타일 */
    "--fill-color": "var(--color-info-600)",
  },
  containerVariants: {
    variant: {
      informative: { styles: { "--fill-color": "var(--color-info-600)" } },
      positive: { styles: { "--fill-color": "var(--color-green-600)" } },
      warning: { styles: { "--fill-color": "var(--color-warning-600)" } },
      critical: { styles: { "--fill-color": "var(--negative)" } },
    },
  },
  staticSelectors: {
    ".react-aria-Label": { "grid-area": "label", "white-space": "nowrap" },
    ".value": { /* ... */ },
    ".bar": { /* ... */ },
    ".fill": { /* ... */ },
  },
  sizeSelectors: {
    sm: { ".bar": { height: "var(--spacing-xs)" } },
    md: { ".bar": { height: "var(--spacing-sm)" } },
    lg: { ".bar": { height: "var(--spacing-md)" } },
    xl: { ".bar": { height: "var(--spacing-lg)" } },
  },
  delegation: [ /* 기존 유지 */ ],
},
```

정확한 값은 `Meter.css` 에서 1:1 이식.

- [ ] **Step 3: Meter.tsx import 교체**

`import "./styles/Meter.css"` → `import "./styles/generated/Meter.css"`

- [ ] **Step 4: styles/index.css 경로 교체**

`@import "./Meter.css"` → `@import "./generated/Meter.css"`

- [ ] **Step 5: 수동 CSS 삭제**

Meter 는 forced-colors 없으므로 완전 삭제:

```bash
rm packages/shared/src/components/styles/Meter.css
```

- [ ] **Step 6: generated CSS 빌드 + snapshot 업데이트**

```bash
pnpm build:specs
pnpm --filter @composition/specs test -- CSSGenerator.snapshot -u
```

snapshot diff 는 Meter 만 변경 — `git diff __snapshots__/` 로 확인.

- [ ] **Step 7: type-check + dev server 시각 확인**

```bash
pnpm type-check
pnpm dev
```

Meter variants/sizes 시각 확인.

- [ ] **Step 8: /cross-check**

Run: `/cross-check Meter`

- [ ] **Step 9: Commit**

```bash
git add packages/specs/src/components/Meter.spec.ts \
        packages/shared/src/components/Meter.tsx \
        packages/shared/src/components/styles/index.css \
        packages/shared/src/components/styles/generated/Meter.css \
        packages/specs/src/renderers/__tests__/__snapshots__/
git rm packages/shared/src/components/styles/Meter.css
git commit -m "refactor(meter): ADR-059 Phase 4.4 — spec-driven CSS"
```

---

### Task 7: PR 생성 + memory 갱신

**Files:**

- Modify: `/Users/admin/.claude/projects/-Users-admin-work-composition/memory/adr059-launch-plan.md`

- [ ] **Step 1: branch 생성 (아직 안 했다면)**

```bash
cd /Users/admin/work/composition
git checkout -b feature/adr-059-phase-4-infra2
```

(Task 1 전에 미리 해두는 것이 자연스러우나, 진행 중에도 가능)

- [ ] **Step 2: 변경 요약 확인**

```bash
git log --oneline main..HEAD
git diff main --stat | tail -30
```

- [ ] **Step 3: memory 갱신**

Read `/Users/admin/.claude/projects/-Users-admin-work-composition/memory/adr059-launch-plan.md`.

Edit "CSSGenerator 누적 확장" 표에 0-D.9 + animationRewrite + staticSelectors 행 추가:

```
| 0-D.9 | `CompositionSpec.sizeSelectors` | per-size nested child selectors (ProgressBar/Meter) |
| 0-D.11 | `CompositionSpec.staticSelectors` | root 하위 고정 자식 selector (variant 무관 slot) |
| rewrite | animation-name auto prefix | `animations` 선언 이름 → `{specName}-{animName}` 치환 |
```

"Phase 4 진단 결과" 섹션에서 0-D.9 "완료"로 표시, 0-D.10 "drop (YAGNI — data-indeterminate attr 주입으로 해결)" 메모.

"완료된 해체 목록" 표에 ProgressBar / Meter 행 추가 (제거 줄수는 실제 git diff 기준).

- [ ] **Step 4: PR push**

```bash
git push -u origin feature/adr-059-phase-4-infra2
```

GitHub에서 PR 생성. 제목: `feat(adr-059): Phase 4-infra2 — sizeSelectors + staticSelectors + animation rewrite + ProgressBar/Meter dismantle`

- [ ] **Step 5: 최종 체크**

```bash
pnpm type-check && pnpm --filter @composition/specs test
```

Expected: 모든 PASS, 58+N snapshot (N = 새로 해체한 ProgressBar/Meter).
