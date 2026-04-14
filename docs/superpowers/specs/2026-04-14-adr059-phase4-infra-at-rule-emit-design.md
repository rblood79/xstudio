# ADR-059 Phase 4-infra: CSSGenerator At-Rule Emit (0-D.7 + 0-D.8)

## Status

Design — 2026-04-14

## Context

ADR-059 v2 Phase 1~3 + 4.1 partial 머지 완료 (-3,161L, 14 컴포넌트). Phase 4.4 (ProgressBar/Meter) 시도 시 CSSGenerator 4가지 한계 발견:

| #      | 기능                              | 요구 spec                          | 사용처                       |
| ------ | --------------------------------- | ---------------------------------- | ---------------------------- |
| 0-D.7  | `@keyframes` emit                 | spec.animations                    | ProgressBar indeterminate    |
| 0-D.8  | `@media (prefers-reduced-motion)` | animations.reducedMotion           | ProgressBar/Meter            |
| 0-D.9  | per-size nested 자식              | containerVariants.nested × size 축 | Meter/ProgressBar bar height |
| 0-D.10 | root `:not()` / `:where()` pseudo | root selector 확장                 | ProgressBar                  |

본 Phase 는 **0-D.7 + 0-D.8** 만 범위. 0-D.9/10 은 별 PR (selector 확장 계열).

**Hard constraints**:

- 기존 53 simple 컴포넌트 generated CSS byte diff 0 (회귀)
- Spec=SSOT (D3) 유지 — animations 도 Spec 내부 선언
- at-rule 은 `@layer components` 바깥 emit (cascade 보호)

## Alternatives Considered

### 대안 A: animations 필드를 CompositionSpec 내부에 선언 (채택)

- 컴포넌트별 캡슐화, prefix 자동 부여
- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)

### 대안 B: primitives 공용 애니메이션 라이브러리

- 재사용성 ↑, 현 시점 재사용 케이스 1개(ProgressBar) → 조기 추상화
- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(M)

### 대안 C: tokens 하위 전역 animations

- SSOT D3 원칙 위배 (애니메이션 = 시각 = spec)
- 위험: 기술(L) / 성능(L) / 유지보수(H) / 마이그레이션(H)

**Threshold Check**: A 잔존 HIGH 0개 → Gate 불필요.

## Decision

대안 A 채택. 기각 사유: B는 조기 추상화, C는 SSOT 위배.

### Spec API

```ts
interface CompositionSpec {
  animations?: Record<
    string,
    {
      keyframes: Record<string, Record<string, string>>;
      reducedMotion?: Record<string, string>;
    }
  >;
  // 기존 필드 유지
}
```

### Emit 구조

```css
@layer components {
  /* 기존 rule (불변) */
}
@keyframes {componentName}-{animName} {
  0% { ... }
  100% { ... }
}
@media (prefers-reduced-motion: reduce) {
  .react-aria-{Component} { animation-duration: 0s !important; ... }
}
```

### 회귀 Gate

vitest snapshot 테스트 신규:

- `packages/specs/src/renderers/__tests__/CSSGenerator.snapshot.test.ts`
- 전체 Spec 순회 → `generateCSSForComponent()` → `toMatchSnapshot()`
- Phase 4-infra PR 에서 baseline 자동 생성

### 실전 검증 (동일 PR)

- ProgressBar.spec.ts + Meter.spec.ts 에 animations 필드 적용
- skipCSSGeneration: false 전환
- 수동 CSS (ProgressBar.css / Meter.css) 삭제
- **조건부**: 0-D.9/10 한계 재발견 시 ProgressBar/Meter 해체는 분리 PR 로 미룸

## Gates

| Gate                   | 시점           | 통과 조건                      | 실패 시 대안                    |
| ---------------------- | -------------- | ------------------------------ | ------------------------------- |
| Snapshot baseline 안정 | 인프라 구현 후 | 53 simple 컴포넌트 byte diff 0 | 원인 조사 → emit 로직 교정      |
| ProgressBar 시각 대칭  | 실전 검증      | /cross-check (CSS↔Skia) 통과   | 0-D.9/10 까지 대기, 해체만 분리 |

## Consequences

### Positive

- ProgressBar/Meter animations 를 Spec SSOT 로 확보 → Builder/Preview 대칭 복원
- Snapshot 인프라 도입 → 향후 모든 CSSGenerator 변경에서 회귀 자동 감지
- at-rule emit 패턴 확립 → 0-D.9/10 확장 시 재사용

### Negative

- CSSGenerator.ts +50L (at-rule branch)
- spec.types.ts +15L (animations 타입)
- snapshot 파일 (~53개 baseline) 최초 생성 — 이후 유지 비용 있음
