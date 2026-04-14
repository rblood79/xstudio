# ADR-059 Phase 4-infra2: CSSGenerator Selector Emit (0-D.9 + animation rewrite)

## Status

Design — 2026-04-14 (revised after Codex review)

## Context

ADR-059 v2 Phase 4-infra (PR #203) 에서 0-D.7(`@keyframes`) + 0-D.8(`@media prefers-reduced-motion`) 완료. 58-component snapshot baseline 도입. ProgressBar/Meter 실전 해체 시도 시 미지원 패턴 발견:

| #     | 기능                          | 사용처                                                            |
| ----- | ----------------------------- | ----------------------------------------------------------------- |
| 0-D.9 | per-size nested child         | `[data-size=sm] { .bar { height; border-radius } .fill { ... } }` |
| —     | animation-name prefix rewrite | 0-D.7이 keyframe 이름만 prefix → style의 `animation:` 값 mismatch |

**D1 경계 양보**: ProgressBar의 `:not([aria-valuenow])` idiom 대신 Preview wrapper에서 `data-indeterminate={isIndeterminate}` 커스텀 attr 주입 후 기존 `containerVariants` 경로 재사용. RAC의 render prop을 data-attr로 투사하는 경미한 확장 — D1(DOM 구조)은 건드리지 않고 attr만 추가.

**SSOT domain**: D3(시각). CSS consumer 확장, Skia consumer는 shapes로 size별 dimension 처리 (sizeSelectors 필드 무시).

**Hard constraints**:

- 58-component snapshot byte diff 0 (기존 spec에 신규 필드 없으면 출력 불변)
- Spec=SSOT D3, at-rule/selector는 `@layer components` 내부
- `SizeSpec` 계약 유지 (Skia+CSS 공통 속성만)

## Alternatives Considered

### 0-D.9: per-size nested child selectors

#### 대안 A: `composition.sizeSelectors?` (채택)

- `SizeSpec`과 분리된 CSS 전용 top-level 필드. Skia 타입 오염 없음.
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 B: `sizes.*.nested?` 확장

- `SizeSpec`에 CSS 전용 필드 추가 → "Skia+CSS 공통 속성" 계약 파손.
- 위험: 기술(M — 타입 계약 파손) / 성능(L) / 유지보수(M) / 마이그레이션(L)

#### 대안 C: `containerVariants.size` 통합

- size를 data-attr variant로 취급. 기존 sizes.\*와 이중 경로.
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(M)

### Animation name prefix 동기화

#### 대안 X: Generator auto-rewrite (채택)

- user는 bare name(`indeterminate`) 작성, emit 시 `{SpecName}-{animName}`으로 `animation`/`animation-name` 값 자동 rewrite. 일관성, 사용자 실수 방지.
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 Y: 수동 prefix (사용자 책임)

- 사용자가 spec에 `ProgressBar-indeterminate` 직접 작성. Generator 로직 단순하나 실수 빈발.
- 위험: 기술(L) / 성능(L) / 유지보수(H — 실수 빈번) / 마이그레이션(L)

### 0-D.10 (root pseudo `:not()`): **drop**

Codex 리뷰에서 YAGNI 지적. ProgressBar만 현재 수요 → `data-indeterminate` attr 주입 + 기존 `containerVariants` 경로로 해결. rootSelectors 범용 API는 실수요 2+ 나올 때 도입.

**Risk Threshold Check**: A/X 잔존 HIGH 0개 → Gate 불필요.

## Decision

- **0-D.9**: 대안 A 채택 (`composition.sizeSelectors`). B는 SizeSpec 계약 파손, C는 이중 경로.
- **Animation rewrite**: 대안 X 채택 (auto-rewrite). Y는 user 실수 빈발.
- **0-D.10**: drop — `data-indeterminate` attr 주입으로 기존 containerVariants 경로 재사용.

### Spec API

```ts
interface CompositionSpec {
  // 기존 필드 유지

  /**
   * CSS 전용 per-size nested child selectors (0-D.9).
   * Skia consumer는 shapes로 size별 dimension 처리 → 이 필드 무시.
   * emit: `.react-aria-{Name}[data-size="{size}"] { {selector} { ...styles } }`
   */
  sizeSelectors?: Partial<
    Record<
      SizeKey, // "xs" | "sm" | "md" | "lg" | "xl"
      Record<string, Record<string, string>> // selector (e.g. ".bar") → style props
    >
  >;
}
```

### Animation Rewrite 규칙

- Generator는 spec 내부 모든 style block (root / containerVariants / sizeSelectors) 에서 `animation` 및 `animation-name` 값을 스캔
- `animations` 에 선언된 이름 발견 시 `{specName}-{animName}` 으로 치환
- 대상: `animation` shorthand 첫 번째 identifier, `animation-name` 전체 값
- 미선언 이름은 그대로 유지 (외부 keyframe 참조 허용)

예:

```ts
// spec input
animations: { indeterminate: { keyframes: {...} } }
containerVariants: {
  indeterminate: { true: { nested: {
    ".fill": { animation: "indeterminate 1.5s infinite ease-in-out" }
  }}}
}

// CSS output
.react-aria-ProgressBar[data-indeterminate="true"] .fill {
  animation: ProgressBar-indeterminate 1.5s infinite ease-in-out;
}
@keyframes ProgressBar-indeterminate { ... }
```

### ProgressBar wrapper 변경

Preview wrapper(`packages/shared/src/components/ProgressBar.tsx`)에서 `isIndeterminate` render prop을 `data-indeterminate={String(isIndeterminate)}` attr로 투사. RAC의 DOM 구조/ARIA는 유지, attr만 추가 (D1 경계 준수).

### Emit 구조

```css
@layer components {
  /* 기존 root rule */

  /* 0-D.9: sizeSelectors */
  .react-aria-ProgressBar[data-size="sm"] .bar {
    height: ...; border-radius: ...;
  }
  .react-aria-ProgressBar[data-size="sm"] .fill {
    border-radius: ...;
  }

  /* containerVariants (animation-name 자동 prefix) */
  .react-aria-ProgressBar[data-indeterminate="true"] .fill {
    animation: ProgressBar-indeterminate 1.5s infinite ease-in-out;
  }
}

@keyframes ProgressBar-indeterminate { ... }
```

### 회귀 Gate

- 58-component snapshot 재사용
- Task 1(sizeSelectors) + Task 2(animation rewrite) 후: 신규 필드 미사용 spec → diff 0
- Task 3/4 후: ProgressBar/Meter snapshot 변경 허용 (의도된 해체)

### 추가 단위 테스트 (Codex 권고)

- `sizeSelectors` emit 순서/specificity: root → size root → size selectors 순 (cascade 검증)
- `animation` rewrite: `animations` 선언 name만 치환, 외부 이름 보존
- snapshot 외 별개 `.test.ts` 2~3개

### 실전 검증

- ProgressBar: `sizeSelectors` + `containerVariants.indeterminate` + `animations` + Preview wrapper attr 주입
- Meter: `sizeSelectors`만 (animation/indeterminate 없음)
- `/cross-check` skill 로 시각 대칭 확인

## Gates

잔존 HIGH 위험 없음. snapshot + 추가 단위 테스트 2중 감지.

## Consequences

### Positive

- ProgressBar/Meter 시각 Spec SSOT 복구 — Builder/Preview 대칭 완성
- `sizeSelectors` — size × slot 분기 컴포넌트 표준화 (향후 Meter variants, Slider 등 재사용)
- Animation rewrite — 사용자가 bare name 쓰면 Generator가 일관성 보장
- `SizeSpec` 계약 무결 (Skia 영향 제로)

### Negative

- `data-indeterminate` attr 주입 — RAC render prop을 attr로 투사하는 경미한 확장 (D1 경계 양보 1건)
- CSSGenerator +~50L (sizeSelectors emit + animation rewrite)
- spec.types.ts +~10L

### Deferred

- `rootSelectors` (0-D.10) — 실수요 2+ 케이스 발생 시 별 PR로 재도입
- `:has()`, `:where()` pseudo — 동일
