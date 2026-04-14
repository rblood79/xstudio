# ADR-059 Phase 4.5a: Small Utilities + rootSelectors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSSGenerator 에 `rootSelectors` (0-D.10) 추가 + `staticSelectors` key validation relax + 6 utility 컴포넌트 해체.

**Architecture:** `CompositionSpec.rootSelectors` 신규 필드 (raw pseudo selector + validation) + 기존 `staticSelectors` key `:not()` 허용. 58-component snapshot 회귀 Gate 재사용.

**Tech Stack:** TypeScript, vitest, pnpm monorepo.

**Design doc:** `docs/superpowers/specs/2026-04-14-adr059-phase4-5a-small-utilities-design.md`

**Baseline commit (main):** `ded205e8`

**Work on branch:** `feature/adr-059-phase-4-5a`

---

### Task 1: `rootSelectors` 타입 선언

**Files:**

- Modify: `packages/specs/src/types/spec.types.ts` (CompositionSpec interface)

- [ ] **Step 1: Read CompositionSpec 현 정의 위치**

Read `packages/specs/src/types/spec.types.ts:280-380`. 기존 `staticSelectors` 와 `sizeSelectors` 위치 확인.

- [ ] **Step 2: `rootSelectors` 필드 추가**

`sizeSelectors` 직후에 삽입:

```ts
  /**
   * CSS 전용 root pseudo selector (ADR-059 v2 Phase 4.5a 0-D.10).
   *
   * raw selector fragment. `&` prefix 필수 (root `.react-aria-{Name}` 기준으로 치환됨).
   * 허용: `:not()`, `:where()`, `:has()`, 속성 selector `[...]`, combinators.
   * 금지 문자: `{`, `}`, `;`, `@` (build-time validation).
   *
   * emit: `.react-aria-{Name}{fragment-with-&-replaced} { ...styles; {nested-selector} {...} }`
   *
   * 예시:
   *   rootSelectors: {
   *     "&:not([aria-orientation=\"vertical\"])": {
   *       styles: { flex: "1 1 auto" }
   *     }
   *   }
   */
  rootSelectors?: Record<
    string,
    {
      styles?: Record<string, string>;
      nested?: Record<string, Record<string, string>>;
    }
  >;
```

- [ ] **Step 3: 타입 체크**

Run: `cd <worktree> && pnpm --filter @composition/specs type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/types/spec.types.ts
git commit -m "feat(specs): ADR-059 Phase 4.5a — add CompositionSpec.rootSelectors type (0-D.10)"
```

---

### Task 2: Selector validation helper

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts`

- [ ] **Step 1: validation helper 추가**

`CSSGenerator.ts` 상단 유틸 영역 (예: `rewriteAnimationNames` 근처) 에 추가:

```ts
// ─── Phase 4.5a 0-D.10: Selector Validation ───────────────────────────────

const FORBIDDEN_SELECTOR_CHARS = /[{};@]/;

function validateRootSelectorKey(key: string, specName: string): void {
  if (!key.startsWith("&")) {
    throw new Error(
      `[CSSGenerator] ${specName}: rootSelectors key must start with "&". Got: ${JSON.stringify(key)}`,
    );
  }
  if (FORBIDDEN_SELECTOR_CHARS.test(key)) {
    throw new Error(
      `[CSSGenerator] ${specName}: rootSelectors key contains forbidden chars ({};@). Got: ${JSON.stringify(key)}`,
    );
  }
}

function validateNestedSelectorKey(
  key: string,
  specName: string,
  context: string,
): void {
  if (FORBIDDEN_SELECTOR_CHARS.test(key)) {
    throw new Error(
      `[CSSGenerator] ${specName}: ${context} selector contains forbidden chars ({};@). Got: ${JSON.stringify(key)}`,
    );
  }
}
```

- [ ] **Step 2: type-check**

Run: `pnpm --filter @composition/specs type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4.5a — selector validation helpers"
```

---

### Task 3: `rootSelectors` emit + snapshot diff 0

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts`

- [ ] **Step 1: `generateRootSelectorRules` helper 추가**

`generateSizeSelectorRules` 바로 아래에 삽입:

```ts
// ─── Phase 4.5a 0-D.10: Root Selectors ─────────────────────────────────────

/**
 * `composition.rootSelectors` → root pseudo selector rules emit.
 * raw selector 의 `&` 를 `.react-aria-{Name}` 으로 치환.
 * `@layer components` 내부. 미선언 시 빈 배열 → 출력 변화 0.
 */
function generateRootSelectorRules<Props>(
  spec: ComponentSpec<Props>,
): string[] {
  const rootSelectors = spec.composition?.rootSelectors;
  if (!rootSelectors) return [];

  const lines: string[] = [];
  const rootSel = `.react-aria-${spec.name}`;

  for (const [key, entry] of Object.entries(rootSelectors)) {
    validateRootSelectorKey(key, spec.name);
    const fullSel = rootSel + key.slice(1); // strip leading `&`

    const styles = entry.styles
      ? rewriteAnimationNames(entry.styles, spec)
      : null;

    if (styles && Object.keys(styles).length > 0) {
      lines.push(`  ${fullSel} {`);
      for (const [prop, value] of Object.entries(styles)) {
        lines.push(`    ${prop}: ${value};`);
      }
      lines.push(`  }`);
      lines.push("");
    }

    if (entry.nested) {
      for (const [nestedKey, rawNestedStyles] of Object.entries(entry.nested)) {
        validateNestedSelectorKey(nestedKey, spec.name, "rootSelectors.nested");
        const nestedStyles = rewriteAnimationNames(rawNestedStyles, spec);
        lines.push(`  ${fullSel} ${nestedKey} {`);
        for (const [prop, value] of Object.entries(nestedStyles)) {
          lines.push(`    ${prop}: ${value};`);
        }
        lines.push(`  }`);
        lines.push("");
      }
    }
  }

  return lines;
}
```

- [ ] **Step 2: generateCSS 에서 호출 (sizeSelectorRules 직후, @layer close 직전)**

Read CSSGenerator.ts 에서 `sizeSelectorRules` 호출 지점을 찾고, 바로 아래에 삽입:

```ts
const rootSelectorRules = generateRootSelectorRules(spec);
if (rootSelectorRules.length > 0) {
  lines.push("");
  lines.push(...rootSelectorRules);
}
```

- [ ] **Step 3: snapshot diff 0 검증**

Run: `pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 60/60 PASS, diff 0 (기존 spec 모두 rootSelectors 미선언 → 출력 불변).

- [ ] **Step 4: type-check + build**

```bash
pnpm --filter @composition/specs type-check
pnpm build:specs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4.5a — rootSelectors emit (0-D.10)"
```

---

### Task 4: `staticSelectors` key validation 통합

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts`

- [ ] **Step 1: 기존 `generateStaticSelectorRules` 위치 파악**

Read 하여 현재 emit 로직 확인. key 당 `validateNestedSelectorKey(key, spec.name, "staticSelectors")` 추가.

- [ ] **Step 2: validation 삽입**

기존 loop:

```ts
for (const [selector, rawStyles] of Object.entries(staticSelectors)) {
  const styles = rewriteAnimationNames(rawStyles, spec);
  lines.push(`  ${rootSel} ${selector} {`);
  /* ... */
}
```

Edit 해서 selector validation 추가:

```ts
for (const [selector, rawStyles] of Object.entries(staticSelectors)) {
  validateNestedSelectorKey(selector, spec.name, "staticSelectors");
  const styles = rewriteAnimationNames(rawStyles, spec);
  lines.push(`  ${rootSel} ${selector} {`);
  /* ... */
}
```

- [ ] **Step 3: snapshot diff 0 재확인**

Run: `pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 60/60 PASS, diff 0. 기존 staticSelectors 사용처 (ProgressBar/Meter) 의 key 에 forbidden char 없음 → 통과.

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4.5a — validate staticSelectors keys"
```

---

### Task 5: 단위 테스트 — rootSelectors + validation

**Files:**

- Create: `packages/specs/src/renderers/__tests__/CSSGenerator.rootSelectors.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```ts
// packages/specs/src/renderers/__tests__/CSSGenerator.rootSelectors.test.ts
import { describe, it, expect } from "vitest";
import { generateCSS } from "../CSSGenerator";
import type { ComponentSpec } from "../../types/spec.types";

function makeSpec(
  overrides: Partial<ComponentSpec["composition"]> = {},
): ComponentSpec {
  return {
    name: "RootTest",
    archetype: "container",
    sizes: { md: {} },
    composition: { layout: "flex-column", delegation: [], ...overrides },
  } as unknown as ComponentSpec;
}

describe("rootSelectors emit (0-D.10)", () => {
  it("rootSelectors 미선언 시 selector rule 없음", () => {
    const css = generateCSS(makeSpec());
    expect(css).not.toMatch(/\.react-aria-RootTest:not/);
  });

  it("`&:not([attr])` 패턴 emit 정확", () => {
    const css = generateCSS(
      makeSpec({
        rootSelectors: {
          '&:not([aria-orientation="vertical"])': {
            styles: { flex: "1 1 auto" },
          },
        },
      }),
    )!;
    expect(css).toContain(
      '.react-aria-RootTest:not([aria-orientation="vertical"])',
    );
    expect(css).toContain("flex: 1 1 auto;");
  });

  it("nested 자식 selector 도 emit", () => {
    const css = generateCSS(
      makeSpec({
        rootSelectors: {
          "&:has([data-current])": {
            nested: { ".icon": { color: "red" } },
          },
        },
      }),
    )!;
    expect(css).toContain(".react-aria-RootTest:has([data-current]) .icon");
    expect(css).toContain("color: red;");
  });

  it("`&` prefix 누락 시 throw", () => {
    expect(() =>
      generateCSS(
        makeSpec({
          rootSelectors: {
            ":not([aria-hidden])": { styles: { color: "red" } },
          },
        }),
      ),
    ).toThrow(/must start with "&"/);
  });

  it("forbidden char `{` 포함 시 throw", () => {
    expect(() =>
      generateCSS(
        makeSpec({
          rootSelectors: {
            "&{ injected }": { styles: { color: "red" } },
          },
        }),
      ),
    ).toThrow(/forbidden chars/);
  });

  it("forbidden char `@` 포함 시 throw", () => {
    expect(() =>
      generateCSS(
        makeSpec({
          rootSelectors: {
            "&@media print": { styles: { color: "red" } },
          },
        }),
      ),
    ).toThrow(/forbidden chars/);
  });
});

describe("staticSelectors descendant `:not()`", () => {
  it("`:not()` 포함 selector key 통과 + emit", () => {
    const css = generateCSS(
      makeSpec({
        staticSelectors: {
          '.react-aria-Button:not([data-current="true"])': {
            color: "blue",
          },
        },
      }),
    )!;
    expect(css).toContain(
      '.react-aria-RootTest .react-aria-Button:not([data-current="true"])',
    );
    expect(css).toContain("color: blue;");
  });

  it("staticSelectors forbidden char 시 throw", () => {
    expect(() =>
      generateCSS(
        makeSpec({
          staticSelectors: {
            ".bar { injected }": { color: "red" },
          },
        }),
      ),
    ).toThrow(/forbidden chars/);
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm --filter @composition/specs test -- CSSGenerator.rootSelectors`
Expected: 모든 PASS (8개).

- [ ] **Step 3: Commit**

```bash
git add packages/specs/src/renderers/__tests__/CSSGenerator.rootSelectors.test.ts
git commit -m "test(specs): ADR-059 Phase 4.5a — rootSelectors + validation + descendant :not tests"
```

---

### Task 6: DisclosureGroup 해체 (16L)

**Files:**

- Modify: `packages/specs/src/components/DisclosureGroup.spec.ts`
- Modify: `packages/shared/src/components/DisclosureGroup.tsx` (import 교체)
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/DisclosureGroup.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/DisclosureGroup.css` (16 lines). 주요: `&[data-disabled] { opacity/cursor/pointer-events }`.

- [ ] **Step 2: spec 수정**

Read `packages/specs/src/components/DisclosureGroup.spec.ts` 현재 구조. `skipCSSGeneration: true` 제거. composition 채움:

```ts
composition: {
  layout: "flex-column",  // 또는 기존 layout 유지
  containerStyles: { /* 기존 base 스타일 1:1 이식 */ },
  containerVariants: {
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
  delegation: [ /* 기존 보존 */ ],
}
```

실제 값은 DisclosureGroup.css 에서 1:1 추출.

- [ ] **Step 3: import 교체**

`packages/shared/src/components/DisclosureGroup.tsx`:

- `import "./styles/DisclosureGroup.css"` → `import "./styles/generated/DisclosureGroup.css"`

`packages/shared/src/components/styles/index.css`:

- `@import "./DisclosureGroup.css"` → `@import "./generated/DisclosureGroup.css"`

- [ ] **Step 4: 수동 CSS 삭제 + 빌드**

```bash
rm packages/shared/src/components/styles/DisclosureGroup.css
pnpm build:specs
```

- [ ] **Step 5: snapshot 업데이트**

Run: `pnpm --filter @composition/specs test -- CSSGenerator.snapshot -u`

Verify `git diff ...__snapshots__/ | grep -c "^-[^-]"` = 0 (DisclosureGroup 만 추가, 다른 컴포넌트 미변경).

- [ ] **Step 6: type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/specs/src/components/DisclosureGroup.spec.ts \
        packages/shared/src/components/DisclosureGroup.tsx \
        packages/shared/src/components/styles/index.css \
        packages/shared/src/components/styles/generated/DisclosureGroup.css \
        packages/specs/src/renderers/__tests__/__snapshots__/
git rm packages/shared/src/components/styles/DisclosureGroup.css
git commit -m "refactor(disclosure-group): ADR-059 Phase 4.5a — spec-driven CSS"
```

---

### Task 7: FileTrigger 해체 (27L)

**Files:**

- Modify: `packages/specs/src/components/FileTrigger.spec.ts`
- Modify: `packages/shared/src/components/FileTrigger.tsx`
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/FileTrigger.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/FileTrigger.css` (27 lines). 패턴 스캔 결과 flat CSS — `containerStyles` 만 사용.

- [ ] **Step 2: spec 수정**

`skipCSSGeneration: true` 제거. composition 에 `containerStyles` 로 1:1 이식:

```ts
composition: {
  layout: "flex-row",  // 또는 기존 유지
  containerStyles: { /* FileTrigger.css 내부 스타일 1:1 이식 */ },
  delegation: [ /* 보존 */ ],
}
```

- [ ] **Step 3: import 교체 (Task 6 Step 3 동일 패턴, 파일명만 FileTrigger)**

- [ ] **Step 4: 수동 CSS 삭제 + 빌드**

```bash
rm packages/shared/src/components/styles/FileTrigger.css
pnpm build:specs
```

- [ ] **Step 5: snapshot 업데이트 + diff 0 검증**

```bash
pnpm --filter @composition/specs test -- CSSGenerator.snapshot -u
git diff .../__snapshots__/ | grep -c "^-[^-]"  # expect 0
```

- [ ] **Step 6: type-check**

Run: `pnpm type-check`

- [ ] **Step 7: Commit**

```bash
git add packages/specs/src/components/FileTrigger.spec.ts \
        packages/shared/src/components/FileTrigger.tsx \
        packages/shared/src/components/styles/index.css \
        packages/shared/src/components/styles/generated/FileTrigger.css \
        packages/specs/src/renderers/__tests__/__snapshots__/
git rm packages/shared/src/components/styles/FileTrigger.css
git commit -m "refactor(file-trigger): ADR-059 Phase 4.5a — spec-driven CSS"
```

---

### Task 8: Autocomplete 해체 (34L)

**Files:**

- Modify: `packages/specs/src/components/Autocomplete.spec.ts`
- Modify: `packages/shared/src/components/Autocomplete.tsx`
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/Autocomplete.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/Autocomplete.css` (34 lines). 패턴: `&[data-empty] { ... }` → `containerVariants.empty`.

- [ ] **Step 2: spec 수정**

```ts
composition: {
  containerStyles: { /* base */ },
  containerVariants: {
    empty: {
      true: { styles: { /* Autocomplete.css &[data-empty] 내부 */ } },
    },
  },
  delegation: [ /* 보존 */ ],
}
```

- [ ] **Step 3-7**: Task 6 Step 3-7 패턴 동일 (파일명 Autocomplete).

Commit message: `refactor(autocomplete): ADR-059 Phase 4.5a — spec-driven CSS`

---

### Task 9: Panel 해체 (45L)

**Files:**

- Modify: `packages/specs/src/components/Panel.spec.ts`
- Modify: `packages/shared/src/components/Panel.tsx`
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/Panel.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/Panel.css` (45 lines). 자식 slot selector (`.header`, `.content` 등) 있으면 `staticSelectors` 로.

- [ ] **Step 2: spec 수정**

```ts
composition: {
  containerStyles: { /* base */ },
  staticSelectors: {
    /* .header, .content 등 root 기준 자식 slot */
  },
  delegation: [ /* 보존 */ ],
}
```

- [ ] **Step 3-7**: Task 6 패턴.

Commit: `refactor(panel): ADR-059 Phase 4.5a — spec-driven CSS`

---

### Task 10: Toolbar 해체 (42L) — rootSelectors 실전

**Files:**

- Modify: `packages/specs/src/components/Toolbar.spec.ts`
- Modify: `packages/shared/src/components/Toolbar.tsx`
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/Toolbar.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/Toolbar.css` (42 lines). 주요 패턴:

- `&[data-orientation="horizontal"] { ... }` → `containerVariants.orientation.horizontal`
- `&[data-orientation="vertical"] { ... }` → `containerVariants.orientation.vertical`
- `&:not([aria-orientation="vertical"]) { ... }` → **`rootSelectors`** (0-D.10 실전)

- [ ] **Step 2: spec 수정**

```ts
composition: {
  containerStyles: { /* base */ },
  containerVariants: {
    orientation: {
      horizontal: { styles: { /* horizontal 전용 */ } },
      vertical: { styles: { /* vertical 전용 */ } },
    },
  },
  rootSelectors: {
    '&:not([aria-orientation="vertical"])': {
      styles: { /* CSS :not(...) 블록 내용 */ },
    },
  },
  delegation: [ /* 보존 */ ],
}
```

**중요**: CSS 에서 같은 data/aria 속성을 중복 타겟팅하는 경우가 있으면 (data-orientation 과 aria-orientation 은 RAC 에서 동일 속성에서 유래), 하나로 통합 가능. 일단 CSS 1:1 이식 후 정리.

- [ ] **Step 3-7**: Task 6 패턴.

Commit: `refactor(toolbar): ADR-059 Phase 4.5a — spec-driven CSS via rootSelectors`

---

### Task 11: Pagination 해체 (52L) — staticSelectors `:not()` descendant

**Files:**

- Modify: `packages/specs/src/components/Pagination.spec.ts`
- Modify: `packages/shared/src/components/Pagination.tsx`
- Modify: `packages/shared/src/components/styles/index.css`
- Delete: `packages/shared/src/components/styles/Pagination.css`

- [ ] **Step 1: 기존 CSS Read**

Read `packages/shared/src/components/styles/Pagination.css` (52 lines). 주요 패턴:

- `.react-aria-Pagination .react-aria-Button:not([data-current="true"]) { ... }`
- `.react-aria-Pagination .react-aria-Button:not([data-current="true"]):hover:not(:disabled) { ... }`

→ `staticSelectors` 의 key 에 `:not()` 포함.

- [ ] **Step 2: spec 수정**

```ts
composition: {
  containerStyles: { /* base */ },
  staticSelectors: {
    '.react-aria-Button:not([data-current="true"])': {
      /* 기본 버튼 스타일 */
    },
    '.react-aria-Button:not([data-current="true"]):hover:not(:disabled)': {
      /* hover 스타일 */
    },
    /* [data-current="true"] 은 별도 key 로 */
  },
  delegation: [ /* 보존 */ ],
}
```

- [ ] **Step 3-7**: Task 6 패턴.

Commit: `refactor(pagination): ADR-059 Phase 4.5a — spec-driven CSS via staticSelectors descendant :not`

---

### Task 12: PR + memory 갱신

**Files:**

- Modify: `/Users/admin/.claude/projects/-Users-admin-work-composition/memory/adr059-launch-plan.md`

- [ ] **Step 1: 최종 전체 검증**

```bash
cd <worktree>
pnpm type-check
pnpm --filter @composition/specs test
git log --oneline main..HEAD
git diff main --stat | tail -20
```

Expected: 모든 PASS. 12 commits.

- [ ] **Step 2: 변경 요약**

Run: `git diff main --stat | tail -30`

- [ ] **Step 3: memory 갱신**

Edit `/Users/admin/.claude/projects/-Users-admin-work-composition/memory/adr059-launch-plan.md`:

- "CSSGenerator 누적 확장" 표에 `0-D.10` 행 추가:

```
| 0-D.10 | `CompositionSpec.rootSelectors` | root pseudo selector (`:not()`/`:where()`/`:has()`) + validation |
| 0-D.10 | `staticSelectors` key `:not()` | descendant pseudo selector 지원 |
```

- "완료된 해체 목록" 표에 6개 행 추가 (Phase 4.5a). 각 컴포넌트 실제 제거 줄수 (git diff 기준).

- "Phase 4 진단 결과" 섹션 업데이트: 0-D.10 "완료" 표시.

- [ ] **Step 4: branch push**

```bash
git push -u origin feature/adr-059-phase-4-5a
```

- [ ] **Step 5: PR 생성**

GitHub URL 에서 PR 생성. 제목:
`feat(adr-059): Phase 4.5a — rootSelectors (0-D.10) + 6 utility components dismantle`

본문: 12 commits 요약 + snapshot 변경 범위 + 해체된 제거 줄수 총합.

- [ ] **Step 6: 자체 cross-check**

각 6 컴포넌트 generated CSS 를 원본 수동 CSS 와 대조:

- 토큰 매핑 (`var(--...)`)
- variants / size 블록 모두 포함
- a11y 규칙 (forced-colors, reduced-motion) 생성 여부 확인 — 누락 시 archetype 자동 emit 의존
