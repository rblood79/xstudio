# ADR-017: React-Aria CSS Override SSOT — M3 제거 + Tailwind 통합

## Status

Proposed

## Context

### 문제 정의

XStudio의 모든 react-aria 컴포넌트에서 CSS 스타일이 다수 파일에 걸쳐 중복 선언되어 cascade 오버라이드가 과도하게 발생하고 있다. 근본 원인은 **M3 컬러 시스템이 기존 시맨틱 토큰 위에 불필요하게 중첩**된 것이다.

**정량적 문제 범위:**

| 심각도 | 컴포넌트                                      | 오버라이드 파일 수 | 비고                              |
| ------ | --------------------------------------------- | :----------------: | --------------------------------- |
| 심각   | Button                                        |        15개        | 가장 많은 파일에서 재정의         |
| 심각   | FieldError                                    |        13개        | 거의 모든 필드 컴포넌트에서       |
| 심각   | Label                                         |        11개        | base.css + 개별 필드 CSS          |
| 높음   | Popover                                       |        9개         | 복합 컴포넌트에서 중첩 오버라이드 |
| 높음   | Input / TextArea                              |        8개         | 대표 분석 사례                    |
| 중간   | Dialog, Group, Heading                        |       각 5개       | 복합 컴포넌트 내부 오버라이드     |
| 중간   | CheckboxGroup, SearchField, ListBox, Checkbox |       3~4개        | 날짜/색상 관련 복합 컴포넌트      |

**영향 범위**: shared CSS 79개 파일 + Builder CSS 14개 파일 = **총 93개 CSS 파일** (이 중 M3 토큰 실참조: shared 57개 + builder 7개 = **64개**)

### 근본 원인: 토큰 시스템 이중 구조

`preview-system.css`에 **두 시스템이 병존**하고 있다:

```
Lines 8-65:   원본 theme.css 시맨틱 토큰 (→ Tailwind 색상 참조)   ← 현재도 사용 중
Lines 66-144: M3 역할 토큰 (→ Tailwind 색상 참조)                 ← 위에 덮어씌운 것
```

**진화 이력:**

1. `react-aria-starter/src/theme.css` 도입 → ~20개 시맨틱 토큰 (`--text-color`, `--border-color`, `--field-background` 등)
2. M3 컬러 시스템 추가 → 38개 역할 토큰 (`--primary`, `--surface-container`, `--on-surface` 등)
3. 컴포넌트 CSS가 M3 토큰으로 전환 → 기존 시맨틱 토큰과 혼재
4. 결과: **동일한 Tailwind 색상을 가리키는 두 변수 체계가 동시 존재**

```css
/* 같은 Tailwind 색상을 두 변수가 가리킴 */
--text-color: var(--color-neutral-900); /* 원본 시맨틱 */
--on-surface: var(--color-neutral-900); /* M3 추가본 */

--border-color: var(--color-neutral-300); /* 원본 시맨틱 */
--outline-variant: var(--color-neutral-400); /* M3 추가본 */

--field-background: var(--color-neutral-50); /* 원본 시맨틱 */
--surface-container: var(--color-surface-100); /* M3 추가본 */
```

### M3의 과도한 복잡도

| 항목            | 원본 theme.css  |                    M3 추가분                     |
| --------------- | :-------------: | :----------------------------------------------: |
| 시맨틱 토큰 수  |    **~20개**    |                     **38개**                     |
| Surface 단계    | gray scale 직접 |       5단계 (lowest/low/기본/high/highest)       |
| 역할별 토큰     |      없음       | 4역할 × 6토큰 (primary/secondary/tertiary/error) |
| 다크모드 재매핑 |      ~20개      |               38개 추가 (총 ~58개)               |
| 변수 체인 깊이  |       2단       |                       3단                        |

**M3 38개 중 실사용 고빈도는 ~10개** (`--primary`, `--on-surface`, `--outline-variant`, `--surface-container`, `--error` 등). 나머지 ~28개는 저빈도 또는 미사용.

### 구조적 문제

#### 1. 포커스 셀렉터 비일관성

| 패턴             | 파일 수 | 대표 파일                                                           |
| ---------------- | :-----: | ------------------------------------------------------------------- |
| `[data-focused]` |  11개   | base.css, TextField.css, ComboBox.css, SearchField.css 등           |
| `:focus`         |  12개   | ComponentSearch.css, ColorPicker.css, NumberField.css, Table.css 등 |
| `:focus-visible` |   3개   | ChatInput.css, Form.css, ListBox.css                                |
| **혼재**         |   1개   | ListBox.css (`:focus` + `[data-focused]` 동시 사용)                 |

#### 2. Layer 교차 오버라이드

- Builder CSS 14개 파일이 `@layer builder-system`에서 component 스타일을 재정의
- Layer 우선순위: `components` < `builder-system` → builder가 무조건 이김

#### 3. 복합 컴포넌트 확산

- DatePicker, ColorPicker 등이 하위 컴포넌트(Button, Calendar, Input, Popover) 스타일을 부모 CSS에서 재정의
- 한 컴포넌트(예: Button)의 스타일 변경이 15개 파일에 영향

### Hard Constraints

| 제약 조건                                  | 근거                      |
| ------------------------------------------ | ------------------------- |
| Canvas 60fps, 초기 로드 < 3s, 번들 < 500KB | 성능 기준                 |
| react-aria-components 코어 기술 변경 불가  | ADR-002                   |
| `data-*` + CSS 셀렉터 패턴 유지            | 현재 표준 (Phase 4 이후)  |
| `@layer` cascade 구조 유지 (ITCSS)         | ADR-002, CSS_ARCHITECTURE |
| CSS 단일 경로 원칙 (import chain)          | Phase 5 해결              |
| Builder ↔ Preview iframe 격리              | ADR-004                   |
| 레이아웃 무영향 (color/bg/border만 변경)   | 안정성                    |

---

## Research

### preview-system.css 이중 구조 분석

현재 `preview-system.css`는 두 토큰 체계를 모두 정의:

**원본 시맨틱 토큰 (L8-65) — 이미 Tailwind 매핑 완료:**

```css
--text-color: var(--color-text-primary, var(--color-neutral-900));
--border-color: var(--color-border-base, var(--color-neutral-300));
--field-background: var(--color-field-background, var(--color-neutral-50));
--highlight-background: var(
  --color-highlight-background,
  var(--color-primary-600)
);
--highlight-foreground: var(--color-highlight-foreground, var(--color-white));
--invalid-color: var(--color-invalid, var(--color-error-400));
--button-background: var(--color-button-background, var(--color-neutral-50));
--overlay-background: var(--color-overlay-background, var(--color-neutral-50));
```

**M3 역할 토큰 (L66-144) — 같은 Tailwind 색상을 다른 이름으로:**

```css
--primary: var(--color-primary-600, #6750a4);
--on-surface: var(--color-neutral-900, #1d1b20);
--outline-variant: var(--color-neutral-400, #cac4d0);
--surface-container: var(--color-surface-100, #f3edf7);
```

→ M3 토큰을 제거해도 원본 시맨틱 토큰이 동일한 Tailwind 색상을 가리키므로 **시각적 변화 없음**.

### M3 → 시맨틱/Tailwind 매핑 테이블

| M3 토큰 (제거)                | → 대체                                                                                                            | 근거                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `--primary`                   | `--highlight-background`                                                                                          | 이미 동일 Tailwind 색상 참조          |
| `--on-primary`                | `--highlight-foreground`                                                                                          | 이미 동일                             |
| `--primary-hover/pressed`     | `--highlight-background-hover/pressed` (없으면 `color-mix(in srgb, var(--highlight-background) 85%, black)` 파생) | 시맨틱 토큰 우선, 없는 경우 color-mix |
| `--on-surface`                | `--text-color`                                                                                                    | 둘 다 `--color-neutral-900`           |
| `--on-surface-variant`        | `--text-color-placeholder`                                                                                        | 둘 다 `--color-neutral-700`           |
| `--outline-variant`           | `--border-color`                                                                                                  | 동일 역할                             |
| `--outline`                   | `--border-color-hover`                                                                                            | 동일 역할                             |
| `--surface-container`         | `--field-background`                                                                                              | 동일 역할                             |
| `--surface-container-high`    | `--overlay-background`                                                                                            | 동일 역할                             |
| `--error`                     | `--invalid-color`                                                                                                 | 동일 역할                             |
| `--on-error`                  | `var(--color-white)`                                                                                              | Tailwind 직접                         |
| `--secondary`                 | `--button-background` 또는 Tailwind 직접                                                                          | 저빈도                                |
| `--tertiary`                  | Tailwind 직접 (`--color-purple-600`)                                                                              | 저빈도, Tabs/Badge 전용               |
| `--surface-container-lowest`  | `var(--color-white)`                                                                                              | Tailwind 직접                         |
| `--surface-container-low`     | `var(--color-neutral-50)`                                                                                         | Tailwind 직접                         |
| `--surface-container-highest` | `var(--color-neutral-200)`                                                                                        | Tailwind 직접                         |
| `--primary-container`         | `var(--color-primary-100)`                                                                                        | Tailwind 직접, 저빈도                 |
| `--inverse-*` (3개)           | Tailwind 직접                                                                                                     | Toast/Snackbar 전용, 저빈도           |
| `--surface-tint`              | 제거                                                                                                              | 미사용                                |

### builder-system.css 현황

Builder CSS는 이미 **시맨틱 토큰 + `--gray-*`/`--blue-*` (Tailwind alias)** 기반:

```css
--text-color: var(--gray-750); /* 시맨틱 — 유지 */
--border-color: var(--gray-300); /* 시맨틱 — 유지 */
--primary: var(--blue-400); /* M3 — --highlight-background로 전환 */
--surface-container: var(--gray-50); /* M3 — --field-background로 전환 */
```

M3 섹션(`Lines 81-136`)만 제거하면 됨. 시맨틱 토큰 섹션은 그대로 유지.

### Adobe 공식 React Aria 스타터 비교

| 항목                      | react-aria-starter (CSS)      | react-aria-tailwind-starter |
| ------------------------- | ----------------------------- | --------------------------- |
| 토큰 체계                 | `theme.css` ~20개 시맨틱 토큰 | Tailwind 유틸리티 직접      |
| M3 토큰                   | **없음**                      | **없음**                    |
| base.css                  | **없음** — 컴포넌트 자체 완결 | 없음                        |
| 복합 컴포넌트 하위 재정의 | **하지 않음**                 | **하지 않음**               |

→ Adobe 공식 스타터에는 M3가 없다. XStudio의 M3는 자체 추가한 레이어.

### 업계 참조

- **Radix UI / shadcn/ui**: `--input`, `--ring`, `--border` 등 간결한 시맨틱 토큰. M3 미사용.
- **Material Web Components**: M3 사용하지만 자체 토큰 체계와 혼용하지 않음 (단일 체계).
- **React Aria Components 공식 가이드**: `theme.css` 시맨틱 토큰 기반. M3 언급 없음.

---

## Alternatives Considered

### 대안 A: M3 제거 + theme.css 시맨틱 복귀 + Tailwind 통합

M3 역할 토큰 38개를 제거하고, 원본 `theme.css` 시맨틱 토큰 ~20개 + Tailwind 색상 직접 참조로 통합. 컴포넌트 CSS에서 M3 토큰을 시맨틱 토큰 또는 Tailwind로 치환.

```css
/* Before (M3) */
.react-aria-Input {
  border-color: var(--outline-variant);
  background: var(--surface-container);
  color: var(--on-surface);
}
.react-aria-Input[data-focused] {
  outline-color: var(--primary);
}

/* After (시맨틱 + Tailwind) */
.react-aria-Input {
  border-color: var(--border-color);
  background: var(--field-background);
  color: var(--text-color);
}
.react-aria-Input[data-focused] {
  outline-color: var(--highlight-background);
}
```

추가로:

1. `:focus` → `[data-focused]` 전면 정규화 (12개 파일)
2. base.css dead code 제거 (1세대 토큰)
3. 복합 컴포넌트 하위 오버라이드 경량화

| 축           | 등급       | 근거                                                               |
| ------------ | ---------- | ------------------------------------------------------------------ |
| 기술         | **LOW**    | 이미 존재하는 시맨틱 토큰으로 복귀. 새 기술 없음                   |
| 성능         | **LOW**    | 변수 체인 3단→2단 감소, CSS 번들 감소 (M3 정의 제거)               |
| 유지보수     | **LOW**    | 토큰 체계 단일화 (시맨틱 ~20개). Adobe 공식 패턴 정렬              |
| 마이그레이션 | **MEDIUM** | 64개 파일 find-and-replace 성격. 레이아웃 미영향. 단계적 적용 가능 |

### 대안 B: M3 제거 + 시맨틱 토큰도 제거 + Tailwind만 사용

컴포넌트가 Tailwind 색상 변수를 직접 참조. 시맨틱 레이어 없음.

```css
.react-aria-Input {
  border-color: var(--color-neutral-300);
  background: var(--color-neutral-50);
  color: var(--color-neutral-900);
}
```

| 축           | 등급       | 근거                                                                                                                      |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 기술         | **LOW**    | 단순한 변수 참조                                                                                                          |
| 성능         | **LOW**    | 최소 체인 (1단)                                                                                                           |
| 유지보수     | **HIGH**   | 시맨틱 의미 상실. `neutral-300`이 "보더"인지 "배경"인지 코드에서 추론 불가. 다크모드 전환 시 모든 컴포넌트 개별 수정 필요 |
| 마이그레이션 | **MEDIUM** | 64개 파일 변경                                                                                                            |

### 대안 C: M3 유지 + 컴포넌트 변수 계층 추가 (기존 ADR-017 v1)

M3를 유지한 채 `--input-*`, `--btn-*` 등 컴포넌트 레벨 변수를 추가.

| 축           | 등급       | 근거                                                                                |
| ------------ | ---------- | ----------------------------------------------------------------------------------- |
| 기술         | **LOW**    | CSS 변수 표준                                                                       |
| 성능         | **LOW**    | 변수 추가                                                                           |
| 유지보수     | **MEDIUM** | 근본 원인(이중 토큰 체계) 미해결. 시맨틱 + M3 + 컴포넌트 = **3계층 변수**로 더 복잡 |
| 마이그레이션 | **MEDIUM** | 93개 파일 단계적 변경                                                               |

### 대안 D: Status Quo 유지

| 축           | 등급     | 근거                                         |
| ------------ | -------- | -------------------------------------------- |
| 기술         | **LOW**  | 변경 없음                                    |
| 성능         | **LOW**  | 변경 없음                                    |
| 유지보수     | **HIGH** | 이중 토큰, 88파일 오버라이드, 세대 혼재 지속 |
| 마이그레이션 | **LOW**  | 변경 없음                                    |

---

## Risk Threshold Check

| 대안                        | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH 이상 |
| --------------------------- | :--: | :--: | :------: | :----------: | :-------: |
| A: M3 제거 + 시맨틱 복귀    |  L   |  L   |    L     |      M       |   **0**   |
| B: Tailwind만 사용          |  L   |  L   |  **H**   |      M       |     1     |
| C: M3 유지 + 변수 계층 추가 |  L   |  L   |    M     |      M       |     0     |
| D: Status Quo               |  L   |  L   |  **H**   |      L       |     1     |

- 대안 B, D에 HIGH 존재
- 대안 A가 C보다 근본적 (이중 토큰 해소) + 유지보수 LOW (C는 MEDIUM)
- **대안 A가 모든 축에서 가장 균형 잡힌 프로필**

---

## Decision

**대안 A: M3 제거 + theme.css 시맨틱 복귀 + Tailwind 통합** 채택.

### 채택 근거

1. **근본 원인 해소**: 이중 토큰 체계 (시맨틱 + M3) → 단일 체계 (시맨틱)로 축소. 토큰 수 38+20 → ~20.

2. **이미 존재하는 토큰으로 복귀**: `preview-system.css`의 시맨틱 토큰(L8-65)은 현재도 사용 중. M3 섹션(L66-144)만 제거하면 됨. 새 토큰 체계를 발명하는 것이 아니라 **불필요한 중복 레이어를 제거**하는 것.

3. **Adobe 공식 패턴 정렬**: react-aria-starter의 `theme.css`가 원본. M3는 XStudio에서 자체 추가한 것이므로 제거해도 공식 패턴에서 벗어나지 않음.

4. **레이아웃 무영향**: color/background/border-color만 변경. width/height/padding/margin/flex/grid 일절 미접촉.

5. **`--input-*`, `--btn-*` 등 컴포넌트 변수 계층 불필요**: 시맨틱 토큰 ~20개가 충분히 간결하므로 추가 indirection 불필요.

6. **마이그레이션 = find-and-replace**: `--on-surface` → `--text-color`, `--outline-variant` → `--border-color` 등 기계적 치환.

### 자기 검증

- "M3를 제거하면 디자인 시스템이 약해지지 않나?" → M3의 실사용 고빈도 토큰 ~10개는 모두 시맨틱 토큰에 1:1 매핑됨. 시맨틱 의미는 유지.
- "다크모드가 깨지지 않나?" → `preview-system.css`의 `[data-theme="dark"]` 섹션에서 시맨틱 토큰도 이미 다크 값을 정의하고 있음 (L196-227). M3 다크 섹션(L229-312)만 제거.
- "Theme Studio가 동작하지 않나?" → 오히려 개선됨. M3는 38개 토큰을 일일이 설정해야 하지만, starter의 `--tint` 패턴은 **변수 1개로 전체 테마 전환** 가능. Phase 4에서 구현.

---

## Gates

잔존 HIGH 위험 없음. MEDIUM 마이그레이션 위험에 대한 안전장치:

| Gate | 시점                 | 통과 조건                                                                   | 실패 시 대안                |
| ---- | -------------------- | --------------------------------------------------------------------------- | --------------------------- |
| G1   | Phase 1 완료         | preview-system.css에서 M3 섹션 제거 후 Storybook 시각적 일치                | M3 섹션 복원                |
| G2   | Phase 2 각 파일      | 해당 컴포넌트 Storybook 전 variant/state 시각적 확인                        | 해당 파일만 revert          |
| G3   | Phase 2 완료         | Builder Inspector/Sidebar/Header + **Publish 앱** 외관 확인                 | builder-system.css만 revert |
| G4   | Phase 3 완료         | Canvas에서 Button/Input/Card 렌더링 색상이 Preview와 일치                   | colors.ts만 revert          |
| G5   | Phase 4 완료         | Theme Studio 기본 테마 생성/적용 동작 확인                                  | Theme Studio 변경만 revert  |
| G6   | `:focus` 정규화 완료 | 12개 파일에서 `:focus` 제거, `[data-focused]` 통일 + `:focus-visible` 3파일 | 해당 파일만 revert          |

---

## Consequences

### Positive

1. **토큰 체계 단일화** — 시맨틱 ~20개 + Tailwind 직접 참조. M3 38개 제거
2. **변수 체인 단축** — 3단(M3→Tailwind→hex) → 2단(시맨틱→Tailwind)
3. **다크모드 간소화** — 재매핑 대상 ~58개 → ~20개
4. **컴포넌트 변수 계층 불필요** — `--input-*`, `--btn-*` 등 추가 indirection 없이 해결
5. **Adobe 공식 패턴 정렬** — react-aria-starter theme.css 원형 복귀
6. **오버라이드 감소** — 시맨틱 토큰이 base.css에서 통일되므로 개별 컴포넌트 중복 선언 감소
7. **포커스 일관성** — `:focus`(12파일) → `[data-focused]` 전면 통일
8. **번들 감소** — M3 정의(light+dark ~150줄) 제거
9. **Canvas/Preview 색상 통일** — Spec과 CSS가 동일한 Tailwind 색상 사용 (현재 M3 보라 vs Tailwind 파랑 불일치 해소)
10. **`--tint` 기반 테마 전환** — 변수 1개로 전체 색상 변경 가능 (M3는 38개 세팅 필요). Theme Studio/AI Theme 연동 대폭 단순화

### Negative

1. **Spec 전체 TokenRef 치환 필요** — 모든 `*Spec.ts` 파일의 `{color.primary}` → `{color.highlight-background}` 등 일괄 변경 + 테스트 갱신
2. **Theme Studio 후속 작업** — M3 토큰 기반 UI를 시맨틱 토큰 기반으로 전환 필요
3. **AI Theme Generator 수정** — M3 역할(primary/secondary/tertiary/error) 기반 생성 로직 변경 필요
4. **HCT 색상 공간 미지원** — M3 HCT 기반 색상 생성 도구 비활성화 (oklch 또는 Tailwind 팔레트로 대체 가능)
5. **64 CSS 파일 + Spec 파일 변경** — find-and-replace 성격이나 총량이 많음
6. **Publish 앱 간접 영향** — `apps/publish/`가 shared CSS를 `@import`하므로 변경 자동 전파. Publish 시각 확인 필요 (G3)

---

## Implementation Phases

### Phase 1: theme 파일 정리 (3파일)

**변경 대상**: `preview-system.css`, `builder-system.css`, `base.css`

| 작업               | 상세                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| preview-system.css | M3 섹션(L66-144, L229-312) 제거. 시맨틱 토큰(L8-65, L196-227)과 shadow/overlay 유지 |
| builder-system.css | M3 섹션(L81-136, L186-241) 제거. 시맨틱 토큰 + gray/blue alias 유지                 |
| base.css           | 1세대 토큰을 시맨틱 토큰으로 교체 (dead code 제거)                                  |

**Gate G1**: Storybook 시각적 일치 확인.

### Phase 2: 컴포넌트 CSS M3 토큰 치환 (64파일)

각 컴포넌트 CSS에서 M3 토큰 → 시맨틱/Tailwind 치환. M3 토큰 실참조 파일: shared 57개 + builder 7개 = **64개**. 우선순위:

**Tier 1 — 고빈도 토큰 일괄 치환 (전체 파일 대상, find-and-replace):**

| M3 토큰                | → 치환 대상                |
| ---------------------- | -------------------------- |
| `--on-surface`         | `--text-color`             |
| `--on-surface-variant` | `--text-color-placeholder` |
| `--outline-variant`    | `--border-color`           |
| `--outline`            | `--border-color-hover`     |
| `--surface-container`  | `--field-background`       |
| `--primary`            | `--highlight-background`   |
| `--on-primary`         | `--highlight-foreground`   |
| `--error`              | `--invalid-color`          |

**Tier 2 — 저빈도 토큰 개별 치환:**

| M3 토큰                    | → 치환 대상                                            | 사용처                   |
| -------------------------- | ------------------------------------------------------ | ------------------------ |
| `--secondary`              | `--button-background` 또는 `var(--color-neutral-600)`  | Button secondary variant |
| `--on-secondary`           | `--text-color` 또는 `var(--color-white)`               | Button secondary 텍스트  |
| `--tertiary`               | `var(--color-purple-600)`                              | Tabs, Badge accent       |
| `--surface-container-high` | `--overlay-background` 또는 `var(--color-neutral-200)` | Dialog, Card elevated    |
| `--surface-container-low`  | `var(--color-neutral-50)`                              | Subtle backgrounds       |
| `--primary-container`      | `var(--color-primary-100)`                             | Selected states          |
| `--error-container`        | `var(--color-error-100)`                               | Error backgrounds        |
| `--on-error`               | `var(--color-white)`                                   | Error text               |
| `--inverse-*`              | Tailwind 직접                                          | Toast/Snackbar           |

**Tier 3 — Builder CSS 정리 (7파일):**

builder-system.css의 M3 섹션 제거 후, Builder 영역에서 M3 실참조 7파일의 잔여 M3 토큰을 시맨틱/Tailwind로 치환:

- `4-layout/canvas.css`
- `4-layout/header.css`
- `4-layout/footer.css`
- `5-modules/panel-nav.css`
- `5-modules/panel-container.css`
- `5-modules/error-loading.css`
- `5-modules/themes/index.css`

**Gate G2, G3**: 각 파일별 Storybook + Builder 시각적 확인.

### Phase 3: Spec 토큰 시스템 전환 (Canvas/Skia 렌더링)

**현재 문제**: Spec의 `colors.ts`가 M3 기본 보라 팔레트(`#6750a4`)를 사용하고, CSS는 Tailwind 파랑(`--blue-400`)을 사용 → **Canvas와 Preview가 다른 색상**으로 렌더링.

**변경 대상:**

| 파일                                         | 작업                                                               |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `specs/src/types/token.types.ts`             | `ColorTokens` 인터페이스를 M3→시맨틱 이름으로 변경                 |
| `specs/src/primitives/colors.ts`             | M3 hex 값 → Tailwind hex 값으로 교체 (light/dark)                  |
| `specs/src/renderers/utils/tokenResolver.ts` | `{color.primary}` → `{color.highlight-background}` 해석            |
| `specs/src/renderers/CSSGenerator.ts`        | `tokenToCSSVar()` 출력을 `var(--highlight-background)` 등으로 변경 |
| `specs/src/**/*Spec.ts` (전체)               | TokenRef 문자열 일괄 치환                                          |
| `specs/__tests__/**`                         | 테스트 기대값 갱신                                                 |

**ColorTokens 매핑 (Phase 2 매핑 테이블과 동일):**

```typescript
// Before (M3)
export interface ColorTokens {
  primary: string; // '#6750a4'
  "on-primary": string; // '#ffffff'
  "on-surface": string; // '#1d1b20'
  "outline-variant": string; // '#cac4d0'
  "surface-container": string;
  // ... 38개
}

// After (시맨틱 + Tailwind 값)
export interface ColorTokens {
  "highlight-background": string; // '#3b82f6' (Tailwind blue-500)
  "highlight-foreground": string; // '#ffffff'
  "text-color": string; // '#171717' (Tailwind neutral-900)
  "border-color": string; // '#d4d4d4' (Tailwind neutral-300)
  "field-background": string; // '#fafafa' (Tailwind neutral-50)
  "invalid-color": string; // '#ef4444' (Tailwind red-500)
  "focus-ring-color": string; // '#60a5fa' (Tailwind blue-400)
  "button-background": string; // '#fafafa' (Tailwind neutral-50)
  "overlay-background": string; // '#fafafa' (Tailwind neutral-50)
  // ... ~20개 (시맨틱 토큰 카탈로그와 1:1)
}
```

**결과**: Canvas(Skia)와 Preview(CSS)가 **동일한 Tailwind 색상**을 렌더링.

**Gate G4**: Canvas에서 Button/Input/Card 렌더링 색상이 Preview와 일치하는지 확인.

### Phase 4: Theme Studio / 테마 변경 기능

react-aria-starter `theme.css`의 `--tint` 패턴 도입으로 **단일 변수 테마 전환** 가능:

```css
/* theme.css 패턴 — --tint 1개로 전체 색상 변경 */
:root {
  --tint: var(--blue); /* 기본 테마 */
}

/* 사용자 테마 변경 시 */
[data-theme-color="green"] {
  --tint: var(--green);
}
[data-theme-color="purple"] {
  --tint: var(--purple);
}
```

**변경 대상 (5파일):**

| 파일                                                     | 작업                                          |
| -------------------------------------------------------- | --------------------------------------------- |
| `builder/panels/themes/ThemeStudio.tsx`                  | UI를 시맨틱 토큰 기반으로 전환                |
| `builder/panels/themes/components/AIThemeGenerator.tsx`  | AI 테마 생성 출력을 시맨틱 토큰 형식으로 변경 |
| `builder/panels/themes/components/HctThemeGenerator.tsx` | HCT 색공간 → Tailwind 팔레트 또는 oklch 전환  |
| `services/theme/ThemeGenerationService.ts`               | M3 역할 기반 생성 → 시맨틱 토큰 기반으로 변경 |
| `services/theme/HctThemeService.ts`                      | HCT 서비스 → Tailwind 팔레트 파생으로 대체    |

추가:

- `--tint` 기반 팔레트 파생 검토 (oklch 브라우저 지원 확인 후 결정)

**Gate G5**: 기본 테마 생성/적용 동작 확인.

### Cross-Phase (Phase 1~3 병행): 포커스 셀렉터 정규화 (15파일)

각 Phase 작업 시 해당 파일의 포커스 셀렉터 정규화를 함께 수행.

**`:focus` → `[data-focused]` 전환 (12파일):**

| 파일                  | Phase와 병행 |
| --------------------- | :----------: |
| ComponentSearch.css   |   Phase 2    |
| ColorPicker.css       |   Phase 2    |
| NumberField.css       |   Phase 2    |
| DateField.css         |   Phase 2    |
| TimeField.css         |   Phase 2    |
| ActionList.css        |   Phase 2    |
| ChatInput.css         |   Phase 2    |
| EventPalette.css      |   Phase 2    |
| Form.css              |   Phase 2    |
| ListBox.css           |   Phase 2    |
| Table.css             |   Phase 2    |
| ToggleButtonGroup.css |   Phase 2    |

**`:focus-visible` → `[data-focus-visible]` 전환 (3파일):**

| 파일          | Phase와 병행 | 비고                                                |
| ------------- | :----------: | --------------------------------------------------- |
| ChatInput.css |   Phase 2    | `:focus-visible` 사용 중                            |
| Form.css      |   Phase 2    | `:focus-visible` 사용 중                            |
| ListBox.css   |   Phase 2    | `:focus` + `[data-focused]` + `:focus-visible` 혼재 |

> **결정**: `:focus-visible`도 `[data-focus-visible]`로 통일. React Aria는 `data-focus-visible` 속성을 자동 제공하므로 CSS pseudo-class 대신 사용.

**Gate G6**: 15개 파일에서 `:focus`/`:focus-visible` 제거, `[data-focused]`/`[data-focus-visible]` 통일 확인.

### Phase 5 (Optional): 문서화 + 규칙

1. CSS_ARCHITECTURE.md에 시맨틱 토큰 카탈로그 추가
2. `.claude/rules/`에 `css-tokens.md` 규칙 추가 (M3 토큰 사용 금지)
3. `:focus`/`:focus-visible` 사용 금지 규칙 (`[data-focused]`/`[data-focus-visible]` 통일)
4. CLAUDE.md에서 `tv()` 참조 제거, 현재 표준 반영
5. **`docs/reference/schemas/M3_COMPONENT_TEMPLATE.css` 삭제** — M3 토큰 예시 템플릿. M3 제거 후 불필요

---

## 시맨틱 토큰 카탈로그 (Phase 1 레퍼런스)

### 유지 대상 (~20개, preview-system.css 원본)

| 토큰                             | Tailwind 기본값 (light)    | 용도                |
| -------------------------------- | -------------------------- | ------------------- |
| `--text-color`                   | `var(--color-neutral-900)` | 기본 텍스트         |
| `--text-color-base`              | `var(--color-neutral-900)` | 기본 텍스트 (alias) |
| `--text-color-hover`             | `var(--color-neutral-950)` | 텍스트 hover        |
| `--text-color-disabled`          | `var(--color-neutral-500)` | 비활성 텍스트       |
| `--text-color-placeholder`       | `var(--color-neutral-700)` | placeholder         |
| `--border-color`                 | `var(--color-neutral-300)` | 기본 보더           |
| `--border-color-hover`           | `var(--color-neutral-400)` | 보더 hover          |
| `--border-color-pressed`         | `var(--color-neutral-500)` | 보더 pressed        |
| `--border-color-disabled`        | `var(--color-neutral-100)` | 비활성 보더         |
| `--field-background`             | `var(--color-neutral-50)`  | 필드 배경           |
| `--field-text-color`             | `var(--color-neutral-900)` | 필드 텍스트         |
| `--button-background`            | `var(--color-neutral-50)`  | 버튼 기본 배경      |
| `--button-background-pressed`    | `var(--color-neutral-100)` | 버튼 pressed        |
| `--overlay-background`           | `var(--color-neutral-50)`  | Popover/Dialog 배경 |
| `--highlight-background`         | `var(--color-primary-600)` | 주요 액션 (CTA)     |
| `--highlight-background-pressed` | `var(--color-primary-700)` | 주요 액션 pressed   |
| `--highlight-foreground`         | `var(--color-white)`       | 주요 액션 텍스트    |
| `--highlight-background-invalid` | `var(--color-error-600)`   | 에러 강조           |
| `--invalid-color`                | `var(--color-error-400)`   | 에러 상태           |
| `--focus-ring-color`             | `var(--color-primary-400)` | 포커스 링           |
| `--background-color`             | `var(--color-white)`       | 페이지 배경         |
| `--link-color`                   | `var(--color-primary-500)` | 링크                |

### 제거 대상 (M3 38개)

`--primary`, `--on-primary`, `--primary-container`, `--on-primary-container`, `--primary-hover`, `--primary-pressed`, `--secondary` (6개), `--tertiary` (6개), `--error` (6개 중 시맨틱 대체분 제외), `--surface`, `--on-surface`, `--surface-variant`, `--on-surface-variant`, `--surface-container-*` (5개), `--background`, `--on-background`, `--outline`, `--outline-variant`, `--inverse-*` (3개), `--scrim`, `--surface-tint`

---

## 관련 문서

- [ADR-002: Styling Approach](002-styling-approach.md) — ITCSS + CSS 변수 기반
- [CSS_ARCHITECTURE.md](../reference/components/CSS_ARCHITECTURE.md) — CSS Import Chain, Layer 구조
- [react-aria-starter/src/theme.css](../react-aria/react-aria-starter/src/theme.css) — 원본 시맨틱 토큰 체계
- [CSS_SUPPORT_MATRIX.md](../CSS_SUPPORT_MATRIX.md) — CSS Level 3 지원 현황
