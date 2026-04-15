# ADR-059 B5 — ToggleButton/ToggleButtonGroup SSOT 완결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADR-059 연장 — ToggleButtonGroup `indicator="true"` 모드 + ToggleButton `[data-selected]` 시각 스타일을 Spec(D3 SSOT)에서 파생된 generated CSS로 완전 복원하고, 잔존 수동 CSS(`ToggleButton.css` + `@sync` 주석) 및 builder inspector 회색지대 처리를 제거한다.

**Architecture:**

- `VariantSpec`에 `selected*` 색상 필드 추가 → CSSGenerator가 `[data-selected]` 룰 자동 생성.
- `ComponentSpec`에 `indicatorMode?` 서브-스키마 신설 → CSSGenerator가 `[data-indicator="true"]` 컨테이너 + `.react-aria-SelectionIndicator` + indicator-selected override를 통합 생성.
- ToggleButton에 `variant` prop은 추가하지 않고(React 컴포넌트는 기존대로 `data-emphasized`만 출력), CSS Generator가 `&[data-emphasized][data-selected]` 중첩 룰을 `emphasizedSelected*` 필드에서 생성.
- 수동 `ToggleButton.css` 삭제 + `ToggleButton.tsx` import를 generated CSS로 전환.
- 기존 `form-controls.css`의 `:not([data-indicator="true"])` 스코프는 유지 (inspector 레이아웃 한정 조정이므로 D3 위반 아님).

**Tech Stack:** TypeScript, CSSGenerator (packages/specs/src/renderers/CSSGenerator.ts), React Aria Components, pnpm workspace, Vitest snapshot tests.

**Reference:**

- ADR-059: `docs/adr/059-composite-field-skip-css-dismantle.md`
- 삭제된 원본 CSS (복원 기준): `git show e27665c7^:packages/shared/src/components/styles/ToggleButtonGroup.css`
- 현 수동 CSS (해체 대상): `packages/shared/src/components/styles/ToggleButton.css`
- SSOT 정본: `.claude/rules/ssot-hierarchy.md` (D3 symmetric)

---

## File Structure

**Modify:**

- `packages/specs/src/types/spec.types.ts` — `VariantSpec`에 `selected*` 필드, `ComponentSpec`에 `indicatorMode?` 추가, `IndicatorModeSpec` 신규
- `packages/specs/src/types/index.ts` — `IndicatorModeSpec` export
- `packages/specs/src/renderers/CSSGenerator.ts` — variant block에 selected 룰 emit, `generateIndicatorModeCSS()` 추가 + 호출부 통합
- `packages/specs/src/components/ToggleButton.spec.ts` — `variants.default`에 `selected*` / `emphasizedSelected*` 채우기
- `packages/specs/src/components/ToggleButtonGroup.spec.ts` — `indicatorMode` 블록 추가
- `packages/shared/src/components/ToggleButton.tsx` — import 경로 전환
- `packages/shared/src/components/styles/index.css` — manual import 제거 (해당 항목 있으면)
- `docs/adr/059-composite-field-skip-css-dismantle.md` — Phase 5(B5) 섹션 추가
- `docs/adr/README.md` — 상태 테이블 갱신
- `packages/specs/src/renderers/__tests__/__snapshots__/*.snap` — 스냅샷 업데이트

**Delete:**

- `packages/shared/src/components/styles/ToggleButton.css` (141 lines, `@sync` 주석 포함)

---

## Task 1: `VariantSpec`에 `selected*` 필드 추가

**Files:**

- Modify: `packages/specs/src/types/spec.types.ts:528-569`

- [ ] **Step 1: 타입 확장 작성**

```typescript
// VariantSpec 인터페이스 끝부분에 추가
export interface VariantSpec {
  // ... 기존 필드 ...

  // ─── ADR-059 B5: Selected 상태 색상 ───
  selectedBackground?: TokenRef;
  selectedBackgroundHover?: TokenRef;
  selectedBackgroundPressed?: TokenRef;
  selectedText?: TokenRef;
  selectedBorder?: TokenRef;

  // ─── ADR-059 B5: data-emphasized 조합 ───
  emphasizedSelectedBackground?: TokenRef;
  emphasizedSelectedText?: TokenRef;
  emphasizedSelectedBorder?: TokenRef;
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm -F @composition/specs type-check`
Expected: PASS (모두 optional이므로 기존 spec 영향 없음)

- [ ] **Step 3: Commit**

```bash
git add packages/specs/src/types/spec.types.ts
git commit -m "feat(specs): extend VariantSpec with selected* color fields (ADR-059 B5)"
```

---

## Task 2: `ComponentSpec.indicatorMode` 서브-스키마 신설

**Files:**

- Modify: `packages/specs/src/types/spec.types.ts`
- Modify: `packages/specs/src/types/index.ts`

- [ ] **Step 1: IndicatorModeSpec 인터페이스 작성**

```typescript
// VariantSpec 아래에 추가
export interface IndicatorModeSpec {
  /** indicator 배경 토큰 */
  background: TokenRef;
  /** indicator 위 선택 버튼 텍스트 색상 */
  selectedText: TokenRef;
  /** indicator pressed 배경 (optional) */
  backgroundPressed?: TokenRef;
  /** border-radius 토큰 (default: {radius.sm}) */
  borderRadius?: TokenRef;
  /** box-shadow 토큰 (default: {shadow.sm}) */
  boxShadow?: string | ShadowTokenRef;
  /** transition 지속 ms (default: 200) */
  transitionMs?: number;
}

// ComponentSpec 인터페이스에 추가
export interface ComponentSpec<Props = Record<string, unknown>> {
  // ... 기존 필드 ...
  /** ADR-059 B5: indicator 모드 전용 시각 스펙 */
  indicatorMode?: IndicatorModeSpec;
}
```

- [ ] **Step 2: index.ts export**

```typescript
// packages/specs/src/types/index.ts
export type { IndicatorModeSpec } from "./spec.types";
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm -F @composition/specs type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/types/
git commit -m "feat(specs): add ComponentSpec.indicatorMode schema (ADR-059 B5)"
```

---

## Task 3: CSSGenerator — variant selected 룰 emit

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts:139-205`

- [ ] **Step 1: 기존 스냅샷 회귀 기준선 확인**

Run: `pnpm -F @composition/specs test -- CSSGenerator.snapshot`
Expected: PASS

- [ ] **Step 2: pressed 블록 뒤에 selected 룰 삽입**

`CSSGenerator.ts` variant loop 안 pressed 블록(line 162-166) 종료 `lines.push("  }");` 다음, `lines.push("}"); lines.push("");` 전에 삽입:

```typescript
// selected 상태 (ADR-059 B5)
if (variantSpec.selectedBackground) {
  lines.push("");
  lines.push("  &[data-selected] {");
  lines.push(
    `    background: ${tokenToCSSVar(variantSpec.selectedBackground)};`,
  );
  if (variantSpec.selectedText) {
    lines.push(`    color: ${tokenToCSSVar(variantSpec.selectedText)};`);
  }
  if (variantSpec.selectedBorder) {
    lines.push(
      `    border-color: ${tokenToCSSVar(variantSpec.selectedBorder)};`,
    );
  }
  if (variantSpec.selectedBackgroundHover) {
    lines.push("");
    lines.push("    &[data-hovered] {");
    lines.push(
      `      background: ${tokenToCSSVar(variantSpec.selectedBackgroundHover)};`,
    );
    lines.push("    }");
  }
  if (variantSpec.selectedBackgroundPressed) {
    lines.push("");
    lines.push("    &[data-pressed] {");
    lines.push(
      `      background: ${tokenToCSSVar(variantSpec.selectedBackgroundPressed)};`,
    );
    lines.push("    }");
  }
  lines.push("  }");
}

// emphasized × selected 조합
if (variantSpec.emphasizedSelectedBackground) {
  lines.push("");
  lines.push("  &[data-emphasized][data-selected] {");
  lines.push(
    `    background: ${tokenToCSSVar(variantSpec.emphasizedSelectedBackground)};`,
  );
  if (variantSpec.emphasizedSelectedText) {
    lines.push(
      `    color: ${tokenToCSSVar(variantSpec.emphasizedSelectedText)};`,
    );
  }
  if (variantSpec.emphasizedSelectedBorder) {
    lines.push(
      `    border-color: ${tokenToCSSVar(variantSpec.emphasizedSelectedBorder)};`,
    );
  }
  lines.push("  }");
}
```

- [ ] **Step 3: 회귀 확인 (spec에 아직 selected 필드 없어 diff 0이어야 함)**

Run: `pnpm -F @composition/specs test -- CSSGenerator.snapshot`
Expected: PASS, diff 없음

- [ ] **Step 4: type-check**

Run: `pnpm -F @composition/specs type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): CSSGenerator emits [data-selected] variant rules (ADR-059 B5)"
```

---

## Task 4: CSSGenerator — indicatorMode CSS 생성

**Files:**

- Modify: `packages/specs/src/renderers/CSSGenerator.ts`

- [ ] **Step 1: generateIndicatorModeCSS 함수 추가**

`CSSGenerator.ts`의 `generateCompositionCSS` 근처에 함수 신규 추가:

```typescript
function generateIndicatorModeCSS<Props>(spec: ComponentSpec<Props>): string[] {
  const im = spec.indicatorMode;
  if (!im) return [];
  const base = `.react-aria-${spec.name}[data-indicator="true"]`;
  const radius = tokenToCSSVar(im.borderRadius ?? ("{radius.sm}" as TokenRef));
  const shadow = im.boxShadow
    ? (resolveBoxShadow(im.boxShadow as string | ShadowTokenRef) ??
      "var(--shadow-sm)")
    : "var(--shadow-sm)";
  const transition = im.transitionMs ?? 200;
  const lines: string[] = [];

  lines.push(`${base} {`);
  lines.push(`  --indicator-bg: ${tokenToCSSVar(im.background)};`);
  lines.push(`  --indicator-text: ${tokenToCSSVar(im.selectedText)};`);
  lines.push("}");
  lines.push("");

  lines.push(
    `${base} .react-aria-ToggleButton .react-aria-SelectionIndicator {`,
  );
  lines.push(`  position: absolute;`);
  lines.push(`  inset: 0;`);
  lines.push(`  z-index: -1;`);
  lines.push(`  border-radius: ${radius};`);
  lines.push(`  background: var(--indicator-bg);`);
  lines.push(`  box-shadow: ${shadow};`);
  lines.push(`  pointer-events: none;`);
  lines.push(
    `  transition: translate ${transition}ms cubic-bezier(0.16, 1, 0.3, 1), width ${transition}ms cubic-bezier(0.16, 1, 0.3, 1), height ${transition}ms cubic-bezier(0.16, 1, 0.3, 1);`,
  );
  lines.push("}");
  lines.push("");

  lines.push(`${base} .react-aria-ToggleButton {`);
  lines.push(`  position: relative;`);
  lines.push(`  background-color: transparent;`);
  lines.push(`  border-width: 0;`);
  lines.push("}");
  lines.push("");

  lines.push(`${base} .react-aria-ToggleButton[data-selected] {`);
  lines.push(`  background: transparent;`);
  lines.push(`  color: var(--indicator-text);`);
  lines.push("}");
  lines.push("");

  lines.push(`${base} .react-aria-ToggleButton[data-selected][data-pressed] {`);
  lines.push(`  background: transparent;`);
  lines.push(`  color: var(--fg);`);
  lines.push("}");
  lines.push("");

  if (im.backgroundPressed) {
    lines.push(
      `${base} .react-aria-ToggleButton[data-pressed]:not([data-selected]) {`,
    );
    lines.push(`  background: ${tokenToCSSVar(im.backgroundPressed)};`);
    lines.push("}");
    lines.push("");
  }

  lines.push(`@media (prefers-reduced-motion: reduce) {`);
  lines.push(
    `  ${base} .react-aria-ToggleButton .react-aria-SelectionIndicator {`,
  );
  lines.push(`    transition: none;`);
  lines.push(`  }`);
  lines.push("}");
  lines.push("");

  return lines;
}
```

- [ ] **Step 2: generate() 본문에 호출 추가**

`generateMediaQueries(spec)` 호출 직전에 삽입:

```typescript
// ─── ADR-059 B5: Indicator Mode ───
if (spec.indicatorMode) {
  lines.push("");
  lines.push(`/* ── Indicator Mode ── */`);
  lines.push(...generateIndicatorModeCSS(spec));
}
```

- [ ] **Step 3: type-check + 회귀 스냅샷 (변동 없어야 함)**

Run: `pnpm -F @composition/specs type-check && pnpm -F @composition/specs test -- CSSGenerator.snapshot`
Expected: PASS, diff 없음

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/renderers/CSSGenerator.ts
git commit -m "feat(specs): CSSGenerator emits indicatorMode CSS block (ADR-059 B5)"
```

---

## Task 5: ToggleButton.spec 에 selected 색상 채우기

**Files:**

- Modify: `packages/specs/src/components/ToggleButton.spec.ts:68-77`

- [ ] **Step 1: variants.default 확장 (기존 TOGGLE_SELECTED_COLORS 이관)**

```typescript
variants: {
  default: {
    background: "{color.neutral-subtle}" as TokenRef,
    backgroundHover: "{color.neutral-hover}" as TokenRef,
    backgroundPressed: "{color.neutral-pressed}" as TokenRef,
    text: "{color.neutral}" as TokenRef,
    border: "{color.transparent}" as TokenRef,

    // ADR-059 B5 — selected
    selectedBackground: "{color.neutral}" as TokenRef,
    selectedText: "{color.base}" as TokenRef,
    selectedBorder: "{color.neutral}" as TokenRef,

    // ADR-059 B5 — emphasized × selected
    emphasizedSelectedBackground: "{color.accent}" as TokenRef,
    emphasizedSelectedText: "{color.on-accent}" as TokenRef,
    emphasizedSelectedBorder: "{color.accent}" as TokenRef,
  },
},
```

`TOGGLE_SELECTED_COLORS` export 상수는 Skia `render.shapes`에서 참조 중이므로 **유지** (본 plan 범위 밖에서 후속으로 variants 참조 전환 권장).

- [ ] **Step 2: build:specs 실행 + 생성 CSS 수동 확인**

Run: `pnpm build:specs && grep -n "data-selected\|data-emphasized" packages/shared/src/components/styles/generated/ToggleButton.css`
Expected: 최소 2개 매치 (`&[data-selected]`, `&[data-emphasized][data-selected]`)

- [ ] **Step 3: 스냅샷 업데이트**

Run: `pnpm -F @composition/specs test -- CSSGenerator.snapshot -u`
Expected: PASS, diff는 ToggleButton 스냅샷에 새 룰 추가

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/components/ToggleButton.spec.ts packages/shared/src/components/styles/generated/ToggleButton.css packages/specs/src/renderers/__tests__/__snapshots__/
git commit -m "feat(specs): ToggleButton variant.default.selected* populated (ADR-059 B5)"
```

---

## Task 6: ToggleButtonGroup.spec 에 indicatorMode 채우기

**Files:**

- Modify: `packages/specs/src/components/ToggleButtonGroup.spec.ts:41-58`

- [ ] **Step 1: ShadowTokenRef import 추가 + indicatorMode 블록**

```typescript
import type { ComponentSpec, Shape, TokenRef, ShadowTokenRef } from "../types";
```

variants 블록 바로 다음에 추가:

```typescript
// ADR-059 B5
indicatorMode: {
  background: "{color.layer-1}" as TokenRef,
  selectedText: "{color.on-accent}" as TokenRef,
  borderRadius: "{radius.sm}" as TokenRef,
  boxShadow: "{shadow.sm}" as ShadowTokenRef,
  transitionMs: 200,
},
```

- [ ] **Step 2: build:specs + 생성 CSS 수동 확인**

Run: `pnpm build:specs && grep -n "data-indicator\|SelectionIndicator" packages/shared/src/components/styles/generated/ToggleButtonGroup.css`
Expected: 최소 4개 매치 (indicator 컨테이너, SelectionIndicator, selected, pressed selected)

- [ ] **Step 3: 스냅샷 업데이트**

Run: `pnpm -F @composition/specs test -- CSSGenerator.snapshot -u`
Expected: PASS, diff는 ToggleButtonGroup 스냅샷에 indicator-mode 룰 추가

- [ ] **Step 4: Commit**

```bash
git add packages/specs/src/components/ToggleButtonGroup.spec.ts packages/shared/src/components/styles/generated/ToggleButtonGroup.css packages/specs/src/renderers/__tests__/__snapshots__/
git commit -m "feat(specs): ToggleButtonGroup.indicatorMode populated (ADR-059 B5)"
```

---

## Task 7: ToggleButton.tsx import 전환 + 수동 CSS 삭제

**Files:**

- Modify: `packages/shared/src/components/ToggleButton.tsx:10`
- Delete: `packages/shared/src/components/styles/ToggleButton.css`
- Modify: `packages/shared/src/components/styles/index.css` (해당 import 있으면 제거)

- [ ] **Step 1: import 전환**

```diff
- import "./styles/ToggleButton.css";
+ import "./styles/generated/ToggleButton.css";
```

- [ ] **Step 2: 수동 CSS 삭제**

Run: `rm packages/shared/src/components/styles/ToggleButton.css`

- [ ] **Step 3: index.css 정리**

Run: `grep -n "ToggleButton.css" packages/shared/src/components/styles/index.css || echo "no match"`
— 매치된 import line을 Edit 도구로 제거.

- [ ] **Step 4: build + type-check**

Run: `pnpm -F @composition/shared build && pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A packages/shared/src/components/
git commit -m "refactor(shared): ToggleButton 수동 CSS 삭제 — generated 전환 (ADR-059 B5)"
```

---

## Task 8: 시각 정합성 cross-check

**Files:** 코드 수정 없음 (verification only)

- [ ] **Step 1: dev 서버 기동 (background)**

Run: `pnpm dev` (run_in_background=true)

- [ ] **Step 2: Chrome MCP로 builder inspector + preview 시각 검증**

ToggleButtonGroup indicator=true 인스턴스를 생성한 테스트 페이지 열어 screenshot:

- [ ] indicator 박스 배경(layer-1) + shadow-sm 존재
- [ ] 선택된 버튼의 SelectionIndicator absolute 덮임, transition 동작
- [ ] selected 버튼 텍스트 색상 = `--indicator-text`
- [ ] isEmphasized=true → selected 버튼 배경 accent
- [ ] size=xs/sm/md/lg/xl 각 정합
- [ ] prefers-reduced-motion에서 transition 제거

- [ ] **Step 3: `/cross-check` skill 실행 (ToggleButton, ToggleButtonGroup)**

CSS↔Skia symmetric 통과 여부 확인. 실패 항목은 별도 task로 분리.

- [ ] **Step 4: 회귀 없으면 추가 commit 생략**

---

## Task 9: ADR-059 + README 업데이트

**Files:**

- Modify: `docs/adr/059-composite-field-skip-css-dismantle.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/design/059-composite-field-skip-css-dismantle-breakdown.md`

- [ ] **Step 1: ADR-059 본문에 Phase 5 (B5) 항목 추가**

Phase 섹션에 아래 블록 append:

```markdown
### Phase 5 (B5) — ToggleButton/ToggleButtonGroup indicator SSOT 완결 (2026-04-15)

- `VariantSpec.selected*`/`emphasizedSelected*` 필드 신설 → CSSGenerator `[data-selected]` + `[data-emphasized][data-selected]` 자동 emit
- `ComponentSpec.indicatorMode` 서브-스키마 신설 → `[data-indicator="true"]` + `.react-aria-SelectionIndicator` CSS 자동 생성
- `TOGGLE_SELECTED_COLORS` 값은 `ToggleButton.spec.variants.default.selected*`/`emphasizedSelected*`에 이관 (Skia 경로는 기존 상수 참조 유지, 별도 후속 task로 variants 참조 전환 권장)
- 수동 `ToggleButton.css` (141L) 삭제 + `ToggleButton.tsx` import generated 전환
- `@sync` consumer-to-consumer 참조 해소 (SSOT D3 symmetric 복원)
```

- [ ] **Step 2: design/059-\*-breakdown.md 갱신**

파일 하단에 동일한 Phase 5 상세 블록 추가 (파일/테스트 목록 포함 — 본 plan의 Task 1~7 요약).

- [ ] **Step 3: README.md 테이블 갱신**

ADR-059 행 Phase 상태란에 B5 완료 표기.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/ docs/design/
git commit -m "docs(adr-059): Phase 5 (B5) ToggleButton indicator SSOT 기록"
```

---

## Task 10: 최종 검증 + PR

- [ ] **Step 1: 전체 type-check + build**

Run: `pnpm type-check && pnpm build`
Expected: PASS

- [ ] **Step 2: specs 테스트**

Run: `pnpm -F @composition/specs test`
Expected: PASS

- [ ] **Step 3: verification-before-completion skill 실행**

- [ ] **Step 4: PR 생성**

PR 제목: `refactor(adr-059): B5 ToggleButton/Group indicator SSOT — +selected variant, +indicatorMode, -manual CSS`

Body 요점:

- `VariantSpec.selected*` + `ComponentSpec.indicatorMode` 신설
- 수동 `ToggleButton.css` 삭제 (-141L), `@sync` 참조 해소
- Skia `TOGGLE_SELECTED_COLORS` 상수는 유지(후속 variants 참조 전환 권장)
- cross-check 통과 screenshot 첨부

---

## Self-Review 결과

**1. Spec 커버리지:**

- ✅ `[data-selected]` 시각 스타일 복원 (Task 3, 5)
- ✅ `[data-indicator="true"]` 모드 복원 (Task 4, 6)
- ✅ `@sync` 수동 CSS 해소 (Task 7)
- ⚠️ orientation별 first/last `border-radius` 연결 — 본 plan 스코프 제외. Task 8 cross-check에서 regression 감지 시 별도 Task 추가.

**2. 플레이스홀더 스캔:** 없음.

**3. 타입 일관성:** `selected*` / `emphasizedSelected*` / `IndicatorModeSpec.background` / `IndicatorModeSpec.selectedText` 명명 일관.

**미해결 위험:**

- orientation connector (first/last border-radius) 복원 필요 여부 — Task 8 시각 검증에서 판정.
- `TOGGLE_SELECTED_COLORS` 상수가 Skia `render.shapes`에 잔존 — 완전 SSOT를 위해 별도 후속 task로 variants 참조 전환 권장 (본 plan 범위 외).

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-04-15-adr059-b5-togglebutton-indicator-ssot.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — executing-plans skill, batch 실행 + 중간 checkpoint

어느 방식으로 진행할까요?
