# ADR-059 Phase 4-infra2: CSSGenerator Selector Emit (0-D.9 + 0-D.10)

## Status

Design — 2026-04-14

## Context

ADR-059 v2 Phase 4-infra (PR #203) 에서 0-D.7(`@keyframes`) + 0-D.8(`@media prefers-reduced-motion`) 완료. 58-component snapshot baseline 도입. 그러나 ProgressBar/Meter 실전 해체는 CSSGenerator의 2가지 추가 미지원 패턴으로 차단:

| #      | 기능                     | 사용처                                                            |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| 0-D.9  | per-size nested child    | `[data-size=sm] { .bar { height; border-radius } .fill { ... } }` |
| 0-D.10 | root `:not()`/`:where()` | `&:not([aria-valuenow]) { .fill { animation: ... } }`             |

**SSOT domain**: D3 (시각 스타일). CSS consumer 확장, Spec=SSOT 유지. Skia consumer는 shapes로 size별 dimension 처리 — nested 필드 무시 (symmetric 원칙 유지, 구현 방법 자유).

**Hard constraints**:

- 58-component snapshot byte diff 0 (기존 spec에 신규 필드 없으면 출력 불변)
- Spec=SSOT D3, at-rule/selector는 `@layer components` 내부
- sizes.\* 기존 consumer(Skia) 기존 shape 유지

## Alternatives Considered

### 0-D.9: per-size nested

#### 대안 A: `sizes.*.nested?` 확장 (채택)

- 기존 sizes 필드에 `nested?: Record<selector, styles>` 추가. CSS consumer 전용.
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 B: `containerVariants.size` 통합

- size를 data-attr variant로 취급 → 기존 nested `&` 경로 재사용
- 위험: 기술(L) / 성능(L) / 유지보수(M — sizes/containerVariants 이중 경로) / 마이그레이션(M)

#### 대안 C: 별도 `perSizeNested` 필드

- sizes와 분리된 CSS 전용 테이블
- 위험: 기술(L) / 성능(L) / 유지보수(M — 필드 증식) / 마이그레이션(L)

### 0-D.10: root pseudo

#### 대안 A: `rootSelectors` 신규 필드 (채택)

- `Record<rawSelector, { styles?, nested? }>` — `:not()`, `:where()`, `:has()` 범용 수용
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

#### 대안 B: `containerVariants.not` 확장

- 제한적, pseudo class 종류마다 필드 추가 필요
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)

#### 대안 C: 기존 containerVariants 키를 raw selector로

- 키 네이밍 컨벤션 변경 → 기존 spec 해석 규칙 파손 위험
- 위험: 기술(M) / 성능(L) / 유지보수(H) / 마이그레이션(H)

**Risk Threshold Check**: A/A 잔존 HIGH 0개 → Gate 불필요.

## Decision

- **0-D.9**: 대안 A 채택. B는 이중 경로, C는 필드 증식.
- **0-D.10**: 대안 A 채택. B는 pseudo 종류 확장성 부족, C는 기존 키 의미 충돌.

### Spec API

```ts
// sizes.*.nested (CSS 전용, Skia 무시)
sizes: {
  [K in SizeKey]: {
    // 기존 필드 유지
    height?: string; fontSize?: string; /* ... */
    nested?: Record<string, Record<string, string>>;
  }
}

// rootSelectors (CompositionSpec top-level)
interface CompositionSpec {
  // 기존 필드 유지
  rootSelectors?: Record<
    string,  // raw selector fragment (e.g. "&:not([aria-valuenow])")
    {
      styles?: Record<string, string>;
      nested?: Record<string, Record<string, string>>;
    }
  >;
}
```

### Emit 구조

```css
@layer components {
  /* 기존 root rule */

  /* 0-D.9: per-size nested */
  .react-aria-ProgressBar[data-size="sm"] {
    /* 기존 size root props */
    .bar { height: ...; border-radius: ... }
    .fill { border-radius: ... }
  }

  /* 0-D.10: rootSelectors */
  .react-aria-ProgressBar:not([aria-valuenow]) {
    .fill { animation: ProgressBar-indeterminate 1.5s infinite ease-in-out; ... }
  }
}

/* @keyframes (0-D.7, 기존) */
@keyframes ProgressBar-indeterminate { ... }
```

### 회귀 Gate

- 기존 58-component snapshot 재사용
- Task 1/2 후: 신규 필드 없는 spec → diff 0
- Task 3/4 후: ProgressBar/Meter snapshot 변경 허용 (해체로 인한 의도된 변경)

### 실전 검증

- ProgressBar: `sizes.nested` + `rootSelectors` + `animations` 3 필드 사용
- Meter: `sizes.nested`만 사용 (indeterminate/animation 없음)
- `/cross-check` skill 로 시각 대칭 확인

## Gates

잔존 HIGH 위험 없음. snapshot baseline 자동 감지로 회귀 방지.

## Consequences

### Positive

- ProgressBar/Meter 시각 Spec SSOT 복구 — Builder/Preview 대칭 완성
- `rootSelectors` 범용 패턴 — 향후 `:has()`, `:where()` 수요 대응
- `sizes.*.nested` — size 축에 자식 slot 분기 필요한 컴포넌트 표준화

### Negative

- sizes 타입 shape 변경 — 기존 consumer 타입 체크 대응 필요 (Skia 는 nested 무시)
- CSSGenerator +~40L (두 emit branch)
- spec.types.ts +~15L
