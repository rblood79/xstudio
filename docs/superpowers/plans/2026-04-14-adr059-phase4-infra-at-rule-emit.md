# ADR-059 Phase 4-infra: At-Rule Emit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CSSGenerator 에 `@keyframes` (0-D.7) + `@media (prefers-reduced-motion)` override (0-D.8) emit 기능 추가 + snapshot 회귀 gate 도입 + ProgressBar/Meter 실전 검증.

**Architecture:** `CompositionSpec.animations` 신규 필드 → CSSGenerator 가 generateAnimationAtRules() 로 top-level at-rule 묶음을 emit. 기존 emit 경로에는 조건 가드 추가 (animations 없으면 출력 변화 0). Snapshot 테스트로 baseline 고정.

**Tech Stack:** TypeScript, vitest snapshot, pnpm monorepo, specs package.

**Design doc:** `docs/superpowers/specs/2026-04-14-adr059-phase4-infra-at-rule-emit-design.md`

**Baseline commit (main):** `6199fb56`

**Guard rail:** Task 2 의 snapshot baseline 생성 이후, Task 3 이전 → 53 simple 컴포넌트 CSS 변화 없음 확인. Task 3 이후에도 animations 미사용 컴포넌트는 diff 0 유지 필수.

---

### Task 1: `animations` 타입 선언

**Files:**

- Modify: `packages/specs/src/types/spec.types.ts:280-329` (CompositionSpec)

- [ ] **Step 1: Read CompositionSpec 현 정의**

Read `packages/specs/src/types/spec.types.ts:270-400` → 기존 필드 순서 및 JSDoc 스타일 파악.

- [ ] **Step 2: animations 필드 추가**

`externalStyles` 필드 직후에 추가:

```ts
  /**
   * 애니메이션 선언 (ADR-059 v2 Phase 4-infra 0-D.7)
   *
   * `@keyframes {specName}-{animName}` 로 emit.
   * `reducedMotion` 는 `@media (prefers-reduced-motion: reduce)` 내 root 셀렉터
   * 에 override 로 emit.
   *
   * 구조:
   *   animations: {
   *     [animName]: {
   *       keyframes: { "0%": {...}, "100%": {...} },
   *       reducedMotion?: { "animation-duration": "0s", ... }
   *     }
   *   }
   */
  animations?: Record<
    string,
    {
      keyframes: Record<string, Record<string, string>>;
      reducedMotion?: Record<string, string>;
    }
  >;
```

- [ ] **Step 3: 타입 체크**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs type-check`
Expected: PASS (기존 코드에 변화 없음)

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/types/spec.types.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra — add CompositionSpec.animations type (0-D.7)"
```

---

### Task 2: Snapshot baseline 테스트 도입

**Files:**

- Create: `packages/specs/src/renderers/__tests__/CSSGenerator.snapshot.test.ts`

- [ ] **Step 1: 전체 spec export 위치 확인**

Run: `cat /Users/admin/work/composition/packages/specs/src/index.ts | head -40`

주의: 모든 spec export 지점 식별 (보통 `components/index.ts` re-export).

- [ ] **Step 2: vitest config 존재 확인**

Run: `ls /Users/admin/work/composition/packages/specs/vitest.config.* 2>/dev/null; cat /Users/admin/work/composition/packages/specs/package.json | grep -E "test|vitest"`

vitest 미설정이면 스크립트 추가 필요. composition 리포의 vitest 패턴 따름.

- [ ] **Step 3: snapshot 테스트 작성**

```ts
// packages/specs/src/renderers/__tests__/CSSGenerator.snapshot.test.ts
import { describe, it, expect } from "vitest";
import { generateCSS } from "../CSSGenerator";
import * as specs from "../../components";

/**
 * ADR-059 Phase 4-infra byte diff 0 회귀 Gate.
 * 모든 ComponentSpec 의 generated CSS 를 snapshot 으로 고정.
 * 인프라 변경 후 snapshot diff 0 이어야 회귀 없음.
 */
describe("CSSGenerator snapshot baseline", () => {
  const allSpecs = Object.values(specs).filter(
    (v): v is { name: string; skipCSSGeneration?: boolean } =>
      typeof v === "object" &&
      v !== null &&
      "name" in v &&
      typeof (v as { name: unknown }).name === "string",
  );

  for (const spec of allSpecs) {
    if (spec.skipCSSGeneration) continue;
    it(`${spec.name}`, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const css = generateCSS(spec as any);
      expect(css).toMatchSnapshot();
    });
  }
});
```

- [ ] **Step 4: 테스트 실행 → baseline 자동 생성**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 모든 케이스 PASS, `__snapshots__/CSSGenerator.snapshot.test.ts.snap` 자동 생성.

만약 spec export 구조가 `components/index.ts` 가 아닌 다른 경로면 import 를 조정.

- [ ] **Step 5: snapshot 파일 commit**

```bash
git add packages/specs/src/renderers/__tests__/
git commit -m "test(specs): ADR-059 Phase 4-infra — CSSGenerator snapshot baseline"
```

---

### Task 3: `@keyframes` + `@media` emit 함수 구현

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts` (generateCSS 하단 + 신규 helper)

- [ ] **Step 1: generateAnimationAtRules helper 추가**

`CSSGenerator.ts` 파일 끝, `generateAllCSS` 직전에 추가:

```ts
// ─── Phase 4-infra 0-D.7/0-D.8: Animation At-Rules ──────────────────────────

/**
 * `composition.animations` → `@keyframes` + `@media (prefers-reduced-motion)` emit.
 * @layer components **바깥**에 배치하여 cascade 영향 없음.
 * animations 미선언 시 빈 배열 반환 → 기존 출력 변화 0.
 */
function generateAnimationAtRules<Props>(spec: ComponentSpec<Props>): string[] {
  const animations = spec.composition?.animations;
  if (!animations) return [];

  const lines: string[] = [];
  const rootSel = `.react-aria-${spec.name}`;

  // @keyframes emit (prefix: {specName}-{animName})
  for (const [animName, animDef] of Object.entries(animations)) {
    const keyframeName = `${spec.name}-${animName}`;
    lines.push(`@keyframes ${keyframeName} {`);
    for (const [stop, props] of Object.entries(animDef.keyframes)) {
      lines.push(`  ${stop} {`);
      for (const [prop, value] of Object.entries(props)) {
        lines.push(`    ${prop}: ${value};`);
      }
      lines.push(`  }`);
    }
    lines.push(`}`);
    lines.push("");
  }

  // reducedMotion override — 존재하는 animations 에 대해서만 emit
  const reducedBlocks: string[] = [];
  for (const animDef of Object.values(animations)) {
    if (!animDef.reducedMotion) continue;
    for (const [prop, value] of Object.entries(animDef.reducedMotion)) {
      reducedBlocks.push(`    ${prop}: ${value};`);
    }
  }
  if (reducedBlocks.length > 0) {
    lines.push(`@media (prefers-reduced-motion: reduce) {`);
    lines.push(`  ${rootSel} {`);
    lines.push(...reducedBlocks);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push("");
  }

  return lines;
}
```

- [ ] **Step 2: generateCSS 에서 호출**

`CSSGenerator.ts:247` 의 `} /* @layer components */` **직후**에 at-rule emit 추가. `Edit` 도구 사용:

old_string:

```
  lines.push("");
  lines.push("} /* @layer components */");

  return lines.join("\n");
}
```

new_string:

```
  lines.push("");
  lines.push("} /* @layer components */");

  // ─── Phase 4-infra: Animation at-rules (@layer 바깥) ───
  const atRules = generateAnimationAtRules(spec);
  if (atRules.length > 0) {
    lines.push("");
    lines.push(...atRules);
  }

  return lines.join("\n");
}
```

- [ ] **Step 3: snapshot 테스트 재실행 → diff 0 확인**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot`
Expected: 모든 PASS, **snapshot diff 없음** (animations 미사용 → 출력 불변).

실패 시 `generateAnimationAtRules` 가 빈 배열일 때 lines.push 호출이 이뤄지지 않는지 확인.

- [ ] **Step 4: 타입 체크 + build**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs type-check && pnpm build:specs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): ADR-059 Phase 4-infra — @keyframes + @media emit (0-D.7+0-D.8)"
```

---

### Task 4: ProgressBar 실전 검증 (animations 적용 + 해체)

**Files:**

- Modify: `packages/specs/src/components/ProgressBar.spec.ts`
- Modify: `packages/shared/src/components/ProgressBar.tsx` (import 교체)
- Delete: `packages/shared/src/components/styles/ProgressBar.css`
- Modify: `packages/shared/src/components/styles/index.css` (import 경로 교체)

- [ ] **Step 1: ProgressBar.css 내용 읽기 → spec 으로 이식할 요소 목록화**

Run: `wc -l /Users/admin/work/composition/packages/shared/src/components/styles/ProgressBar.css && head -100 /Users/admin/work/composition/packages/shared/src/components/styles/ProgressBar.css`

필수 식별: `@keyframes indeterminate`, animation 적용 지점, reducedMotion override, `:not([aria-valuenow])` 셀렉터, per-size bar height.

- [ ] **Step 2: 0-D.9/0-D.10 한계 재확인**

CSS 안에 아래가 있으면 본 PR 범위 초과 → **Task 4~5 전체 skip** 하고 본 PR 을 "인프라만" 으로 마감:

- root `:not([aria-valuenow])` pseudo (0-D.10 필요)
- per-size nested 자식 style (`[data-size=sm] .bar { height: ... }`) (0-D.9 필요)

skip 판정 시 바로 Task 6(마무리)로 이동하여 PR 생성.

- [ ] **Step 3: (한계 없음 가정) ProgressBar.spec.ts 수정**

`skipCSSGeneration: true` → `false` 로. `composition.animations` 필드 추가:

```ts
composition: {
  // 기존 필드 ...
  animations: {
    indeterminate: {
      keyframes: {
        "0%": { transform: "translateX(-100%)" },
        "100%": { transform: "translateX(400%)" },
      },
      reducedMotion: { "animation-duration": "0s" },
    },
  },
},
```

(정확한 keyframes 값은 Step 1 에서 추출한 수동 CSS 기준으로 맞춤)

- [ ] **Step 4: ProgressBar.tsx import 교체**

`import "./styles/ProgressBar.css"` → `import "./styles/generated/ProgressBar.css"`.

- [ ] **Step 5: styles/index.css 경로 교체**

`@import "./ProgressBar.css"` → `@import "./generated/ProgressBar.css"`.

- [ ] **Step 6: 수동 CSS 삭제 + generated CSS 빌드**

```bash
rm packages/shared/src/components/styles/ProgressBar.css
pnpm build:specs
```

- [ ] **Step 7: snapshot 업데이트 (ProgressBar 만)**

Run: `cd /Users/admin/work/composition && pnpm --filter @composition/specs test -- CSSGenerator.snapshot -u`

기대: ProgressBar 만 snapshot 변경, 나머지 52개 컴포넌트 snapshot 불변.

snapshot diff 확인: `git diff packages/specs/src/renderers/__tests__/__snapshots__/` → 오직 ProgressBar 블록만 변경되었는지 확인. 다른 컴포넌트 변경 발견 시 Task 3 의 generateCSS 호출 지점 조건 가드 검토.

- [ ] **Step 8: type-check + dev server 로 시각 확인**

Run: `pnpm type-check && pnpm dev`
브라우저에서 ProgressBar indeterminate 모드 시각 확인 (애니메이션 동작, reducedMotion 시스템 설정 있으면 정지).

- [ ] **Step 9: Commit**

```bash
git add packages/specs/src/components/ProgressBar.spec.ts \
        packages/shared/src/components/ProgressBar.tsx \
        packages/shared/src/components/styles/index.css \
        packages/shared/src/components/styles/generated/ProgressBar.css \
        packages/specs/src/renderers/__tests__/__snapshots__/
git rm packages/shared/src/components/styles/ProgressBar.css
git commit -m "refactor(progress-bar): ADR-059 Phase 4.4 — spec-driven CSS via animations"
```

---

### Task 5: Meter 실전 검증 (ProgressBar 동일 패턴)

**Files:**

- Modify: `packages/specs/src/components/Meter.spec.ts`
- Modify: `packages/shared/src/components/Meter.tsx`
- Delete: `packages/shared/src/components/styles/Meter.css`
- Modify: `packages/shared/src/components/styles/index.css`

- [ ] **Step 1: Meter.css 분석 및 한계 재확인**

Task 4 Step 1-2 와 동일 절차. 0-D.9/10 필요 기능 발견 시 Meter 도 skip, Task 6 로 이동.

- [ ] **Step 2~9: Task 4 Step 3~9 절차를 Meter 에 적용**

Meter 에 animations 불필요하면 skipCSSGeneration 전환만. reducedMotion 만 필요할 수 있음 — 그 경우 animations 필드 비어도 되므로 Task 4 Step 3 skip 하고 컨테이너/size 만 Spec 으로 이식.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(meter): ADR-059 Phase 4.4 — spec-driven CSS"
```

---

### Task 6: PR 생성 + memory 갱신

**Files:**

- Modify: `/Users/admin/.claude/projects/-Users-admin-work-composition/memory/adr059-launch-plan.md`

- [ ] **Step 1: 변경 요약 확인**

Run: `git log --oneline main..HEAD && git diff main --stat | tail -20`

- [ ] **Step 2: memory 갱신**

`adr059-launch-plan.md` 의 "CSSGenerator 누적 확장" 표에 0-D.7/0-D.8 행 추가. Phase 4 진단 결과 섹션에서 두 항목을 "완료"로 표시. Phase 4.4 완료(또는 skip) 상태 반영.

- [ ] **Step 3: PR push**

```bash
git push -u origin feature/adr-059-phase-4-infra
```

이후 GitHub 에서 PR 생성. 제목: `feat(adr-059): Phase 4-infra — CSSGenerator at-rule emit (0-D.7+0-D.8)`

- [ ] **Step 4: 최종 체크**

Run: `pnpm type-check && pnpm --filter @composition/specs test`
Expected: 모든 PASS.
