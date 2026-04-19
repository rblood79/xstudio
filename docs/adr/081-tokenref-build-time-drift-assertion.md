# ADR-081: TokenRef resolved-value build-time drift assertion — token 소비자 경로 전체 일관성 검증

## Status

Proposed — 2026-04-20

## Context

**D3 (시각 스타일) 인프라 — ADR-063 domain 판정**

`packages/specs/src/primitives/` 의 token 파일(`spacing.ts`/`radius.ts`/`typography.ts`/`colors.ts`/`shadows.ts`)은 D3 시각 스타일의 최상위 공급자다. 이 token 의 resolved 숫자 값이 변경될 때 downstream 소비자 경로 전체가 자동으로 검증되어야 한다. 본 ADR 은 그 검증 인프라를 설계한다.

**CSSGenerator snapshot 인프라 재사용 선언**

기존 `packages/specs/src/renderers/__tests__/CSSGenerator.snapshot.test.ts` 가 스냅샷 기반 회귀 방지의 선례를 제공한다. 본 ADR 은 동일 vitest + `.snap` 파일 패턴을 채택하며, 새 test runner 를 도입하지 않는다.

**문제 정의 — ADR-079 Phase 3.2 drift test 의 한계**

ADR-079 P3.2 에서 추가한 `implicitStyles-listbox.test.ts` 는 Spec 의 **TokenRef 식별자** 일치만 검증한다:

```typescript
// apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles-listbox.test.ts (ADR-079 P3.2)
expect(c.padding).toBe("{spacing.xs}"); // ← 문자열 식별자만 검증
expect(c.gap).toBe("{spacing.2xs}"); // ← resolved 숫자 값 미검증
```

`spacing.xs` 의 resolved 값이 `4 → 6` 으로 변경되면:

- 위 test 는 **PASS 유지** (`"{spacing.xs}"` 문자열은 불변)
- `implicitStyles.ts` 의 fallback 상수 `?? 4` 는 **여전히 4 를 반환** (drift 발생)
- `var(--spacing-xs)` CSS 변수는 CSS 정의 파일에서 별도로 6 으로 갱신되지 않는 한 **3-way 비대칭** 발생

**확인된 영향 소비자 경로 — 커버리지 3종 (C1~C3) + scope 제외 1종 (C4 참고용)**

| 경로 ID                   | 경로 이름     | 핵심 파일                                                                                                 | token 소비 방식                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1                        | Preview CSS   | `packages/specs/src/renderers/CSSGenerator.ts` → `tokenToCSSVar()`                                        | `{spacing.xs}` → `var(--spacing-xs)` CSS 변수 참조 (런타임 해결)                                                                                                                                                                                                                                                                                                                                                              |
| C2                        | Skia 렌더     | `apps/builder/src/builder/workspace/canvas/skia/specShapeConverter.ts` → `resolveToken()`                 | `{spacing.xs}` → 숫자 4 (빌드타임/렌더타임 해결)                                                                                                                                                                                                                                                                                                                                                                              |
| C3                        | Layout engine | `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts`                              | 현재 하드코딩 `?? 4` / `?? 2`. ADR-080 이후 `resolveToken()` 경유 예정                                                                                                                                                                                                                                                                                                                                                        |
| C4 (**scope 제외, 참고**) | Style Panel   | `apps/builder/src/builder/panels/styles/hooks/useLayoutAuxiliary.ts:25-39` → `useContainerStyleDefault()` | **현재 drift 소비자 아님**. hook signature 는 `display \| flexDirection \| alignItems \| justifyContent` 4종만 읽으며 (useLayoutAuxiliary.ts:27) gap/padding/border-radius 등 **숫자 TokenRef 경로가 없다**. 따라서 본 ADR 의 snapshot cross-reference 대상에서 **제외**. 향후 `useContainerStyleDefault` 의 리턴 타입이 `{ ref, resolved }` 로 확장되거나 gap/padding 읽는 경로가 추가되면 후속 ADR 에서 커버리지 포함 검토. |

**BC 훼손 수식화**

`{spacing.xs}` 값이 `4 → 6` 으로 변경될 경우:

- 영향 파일 추정: spacing 토큰 직접 소비 Spec ~40개 × **covered 소비자 경로 3종 (C1/C2/C3)** = **최대 120 개 drift point** (C4 scope 제외)
- 현재 검증 커버리지: C1(CSSGenerator snapshot — 토큰 값 아닌 CSS var 문자열 스냅샷), C2(미검증), C3(ADR-079 P3.2 식별자만)
- **성능 영향**: token 값 변경은 빌드타임 발견 불가 → 런타임 시각 오차. Skia 렌더와 CSS 간 레이아웃 차이 px 단위 drift

**Hard Constraints**

1. **빌드 시간 증가 10% 미만 (상대 기준)** — vitest 전체 실행 시간의 **상대 비율**로 판정한다. 절대 수치 예시(`type-check 3.166s`)는 특정 cache 상태의 1회 측정값으로 cold/warm 조건에 따라 ±30% 변동 가능 (참고: ADR-079 실측 편차 3.949s / 307ms / 296ms). G종결 측정 시 **동일 cache 상태에서 before/after 3회 평균**으로 비교 (absolute target 대신 relative delta).
2. CI 실패 시 정확한 drift 위치 리포트 (어떤 token → 어떤 소비자 경로 → 값 차이)
3. 기존 snapshot test 인프라(vitest + `.snap`) 재사용 — 새 test runner 도입 금지
4. primitives 변경 없이 기존 소비자 동작 불변 (회귀 0)
5. token snapshot 파일은 CI 에서 자동 업데이트 금지 — 사람이 리뷰하고 커밋

**Soft Constraints**

- 소비자 경로 자동 감지 vs 명시적 등록: 초기에는 명시적 등록(3종 C1~C3)으로 시작, 자동 감지는 별도 ADR scope
- ADR-080 (Layout engine Spec direct read-through) 이 C3 를 `resolveToken()` 기반으로 전환하면 본 ADR 의 C3 커버리지가 자동 확장됨 (소비자 추가 비용 없음)
- **ADR-080 선행 의존성 (C3 구현 순서)**: 현재 `implicitStyles.ts:668` 의 fallback 상수 `?? 4` / `?? 2` 는 `applyImplicitStyles()` **함수 내부 인라인 리터럴** 이다. 외부에서 참조 가능한 export/helper 가 없어 test 에서 cross-reference 불가능. 따라서 본 ADR 의 C3 assertion 은 (a) ADR-080 P1 이 `resolveContainerStylesFallback()` 공통 helper 로 추출한 후에만 실질 구현 가능 (추천), 또는 (b) 상수 복붙으로 "그림자 상수" 를 만드는데 이는 drift 감지 무효화. **G2 착수 전 ADR-080 P1 완료 필수**.
- **`packages/specs/scripts/validate-tokens.ts` 관계**: 기존 `validate-tokens.ts` 는 **Spec→primitives 참조 일관성** 검증 (TokenRef 가 primitives 에 실제 존재하는가). 본 ADR 의 snapshot test 는 **primitives resolved 값 ↔ consumer 소비값 일치** 검증 (값 차원). 두 script 는 **보완 관계** (역할 분담): validate-tokens 는 "식별자 유효성", 본 ADR 은 "값 전파 일관성". 대체 아님.

## Alternatives Considered

### 대안 A: Build-time snapshot cross-reference (추천)

- 설명: vitest 에서 primitives token 값을 snapshot 고정 (`tokenSnapshot.test.ts`). 각 소비자 경로별 resolved 값을 snapshot 과 비교하는 integration test 추가. primitives 수정 시 snapshot 파일이 outdated → CI 실패 → `vitest --update-snapshots` 로 명시적 승인 후 커밋. CSSGenerator snapshot test (`CSSGenerator.snapshot.test.ts`) 기존 패턴 재사용.
- 구체 파일:
  - `packages/specs/src/renderers/__tests__/tokenSnapshot.test.ts` — primitives resolved 값 snapshot
  - `apps/builder/src/builder/workspace/canvas/layout/engines/tokenConsumerDrift.test.ts` — C1(CSSGenerator `tokenToCSSVar` → CSS var 문자열 **매핑 회귀** 검출, primitive 값 변화 미감지) / C2(Skia `resolveToken()` 반환 **값 drift** 검출) / C3(ADR-080 `resolveContainerStylesFallback()` 반환 **값 drift** 검출) 각각을 snapshot 과 cross-reference. **C4 Style Panel 은 scope 제외** (`useContainerStyleDefault()` 가 resolved 숫자 미반환). C3 test 를 builder 패키지 쪽에 두는 이유는 ADR-080 helper 가 `apps/builder/.../implicitStyles.ts` 에 상주하기 때문.
- 위험:
  - 기술: **LOW** — vitest snapshot API 는 프로젝트에서 이미 사용 중. 외부 의존성 없음
  - 성능: **LOW** — vitest run 에 test 파일 2개 추가. token 수 ~50개 × **경로 3종** = 150 assertion. 추가 실행 시간 <200ms 예상
  - 유지보수: **LOW** — snapshot 파일이 변경 내역을 명시적으로 추적. 새 소비자 추가 시 test 파일에 경로 1줄 등록
  - 마이그레이션: **LOW** — 기존 코드 변경 없음. test 파일 신규 추가만

### 대안 B: Runtime assertion (dev 모드)

- 설명: `resolveToken()` 호출 시점에 dev 모드에서 resolved 값을 캐시하고, 동일 token 의 두 번째 호출 시 캐시와 비교하여 불일치 시 `console.error` 또는 `throw`. dev build 에서만 실행.
- 구체 파일:
  - `packages/specs/src/renderers/utils/tokenResolver.ts` — dev 모드 assertion 추가
  - `apps/builder/src/builder/workspace/canvas/skia/specShapeConverter.ts` — Skia 경로 assertion 발동 지점
- 위험:
  - 기술: **MEDIUM** — `process.env.NODE_ENV` 분기 및 module-level 캐시 추가. Tree-shaking 으로 production 번들 제외 보장 필요. 초기 상태 `resolveToken()` 는 항상 동일 값을 반환하므로 "동일 token 두 번째 호출" 패턴은 C3 (하드코딩 fallback) 를 감지하지 못함
  - 성능: **MEDIUM** — 렌더 경로에서 assertion 실행. 60fps Canvas 렌더에서 assertion 캐시 lookup 비용. `Map.get()` O(1) 이나 모든 resolveToken 호출에 추가됨. tree-shaking 미적용 시 production 번들 증가
  - 유지보수: **MEDIUM** — dev 전용 assertion 은 CI snapshot 과 달리 "어떤 파일이 영향받는지" 리포트하지 않음. console.error 는 무시되기 쉬움. C3 (하드코딩 fallback) 는 `resolveToken()` 를 호출하지 않으므로 **감지 불가**
  - 마이그레이션: **LOW** — 기존 소비자 코드 변경 없음

### 대안 C: 현상 유지 + 코드 리뷰에만 의존

- 설명: 수동 sync 부담. primitives 변경 시 개발자가 수동으로 모든 소비자 경로를 추적하여 업데이트.
- 위험:
  - 기술: **LOW**
  - 성능: **LOW**
  - 유지보수: **HIGH** — covered 소비자 경로 3종 (C1~C3) × token 50개 = 150 drift point 를 코드 리뷰로 추적. ADR-079 P3.2 가 이미 발견한 "식별자 일치 ≠ 값 일치" 문제를 반복적으로 놓칠 가능성 HIGH. C3 의 하드코딩 fallback `?? 4` 가 영구 잔존할 위험
  - 마이그레이션: **LOW**
- ADR-063 D3 SSOT 원칙과 역행: token 값 변경이 자동으로 전파되지 않음

### 대안 D: Lint rule 로 TokenRef 문자열 literal 직접 사용 금지

- 설명: `"{spacing.xs}"` 같은 문자열 literal 을 소비자 코드에서 금지하는 custom ESLint rule 추가. 상수 참조만 허용.
- 구체 파일:
  - `packages/config/eslint/` — custom rule 파일 추가
  - 모든 소비자 파일에서 `"{spacing.xs}"` → `SPACING_XS` 상수로 리팩토링
- 위험:
  - 기술: **MEDIUM** — ESLint custom rule AST 분석. TokenRef 패턴 (`/^\{[a-z]+\.[a-z0-9-]+\}$/`) 정규식. 소비자 파일 ~160 곳 리팩토링 필요
  - 성능: **LOW** — lint 단계에서만 실행. 런타임/빌드타임 영향 없음
  - 유지보수: **MEDIUM** — TokenRef 식별자를 상수화해도 **resolved 값**의 drift 는 여전히 감지 불가. Lint 는 "올바른 identifier 를 쓰는가" 만 검증. `SPACING_XS = "{spacing.xs}"` 상수가 `resolved = 4` 와 일치하는지는 lint 가 알 수 없음. 근본 문제(resolved 값 drift) 미해결
  - 마이그레이션: **HIGH** — ~160 곳 리팩토링. ADR 외 대규모 코드 변경 수반. 기존 Spec 파일들이 이미 `"{spacing.xs}"` 문자열 형식을 SSOT 로 사용 중 — 변경 시 Spec 형식 자체 재설계 필요

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | :--: | :--: | :------: | :----------: | :--------: |
| A    |  L   |  L   |    L     |      L       |     0      |
| B    |  M   |  M   |    M     |      L       |     0      |
| C    |  L   |  L   |  **H**   |      L       |     1      |
| D    |  M   |  L   |    M     |    **H**     |     1      |

**루프 판정**:

- 대안 A: HIGH 0개 — 바로 채택 가능
- 대안 B: HIGH 0개이나 C3 (하드코딩 fallback) 감지 불가 — 구조적 한계
- 대안 C: HIGH 1개 (유지보수) — 기각
- 대안 D: HIGH 1개 (마이그레이션) + 근본 문제 미해결 — 기각
- **대안 A 채택** — 추가 루프 불필요

## Decision

**대안 A: Build-time snapshot cross-reference** 를 선택한다.

**위험 수용 근거**: 기존 CSSGenerator snapshot 패턴을 그대로 재사용하므로 기술적 미지수가 없다. test 파일 2개 추가만으로 소비자 경로 3종 (C1~C3) × token ~50개 = 150 assertion 을 커버한다 (C4 는 scope 외). 빌드 시간 증가는 200ms 미만으로 hard constraint (<10%) 를 충족한다.

**기각 사유**:

- **대안 B (Runtime assertion)**: dev 모드 assertion 은 C3 (하드코딩 fallback `?? 4`) 를 원천적으로 감지하지 못한다. `resolveToken()` 을 호출하지 않는 경로는 assertion trigger 가 없다. 또한 60fps Canvas 렌더 경로에 assertion 캐시 lookup 이 추가되어 성능 위험이 있다.
- **대안 C (코드 리뷰 의존)**: 소비자 경로 ~150 drift point 를 수동 추적하는 것은 현실적으로 불가능하다. ADR-079 P3.2 가 이미 이 문제를 발견했음에도 불구하고 해결하지 않으면 SSOT 원칙의 실효성이 없다.
- **대안 D (Lint rule)**: resolved 값 drift 는 lint 로 감지 불가능하다. `"{spacing.xs}"` 식별자가 올바르더라도 primitives 의 숫자 값이 변경되면 소비자는 여전히 stale 값을 보유한다. 게다가 ~160 곳 리팩토링은 ADR scope 를 초과한다.

> 구현 상세: [081-tokenref-build-time-drift-assertion-breakdown.md](../design/081-tokenref-build-time-drift-assertion-breakdown.md)

## Risks

대안 A 선정 후에도 남는 **운영 위험** (Decision 이후 잔존). Alternatives 단계의 4축 평가와 구분하여 "결정을 이행하는 동안 관리해야 할 잔존 리스크" 로 집약.

| ID  | 위험                                      | 심각도 | 대응                                                                                                                                                                                   |
| --- | ----------------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | ADR-080 P1 선행 미완료 시 C3 무효화       |  MED   | G2 착수 전 ADR-080 P1 (`resolveContainerStylesFallback` export helper) 완료 확인 (G0). 미완료 시 G2 의 C3 assertion 이 상수 복붙 그림자가 되어 drift 감지 무효화 → G2 지연             |
| R2  | snapshot 파일 수동 관리 부담              |  LOW   | primitives 변경 시 `vitest --update-snapshots` 호출 + PR 리뷰에서 snapshot diff 명시적 확인. CI 자동 업데이트 금지 규칙의 반대급부. `.snap` 파일 CODEOWNERS 지정 검토                  |
| R3  | C1 역할 인지 오류 (매핑 회귀 vs 값 drift) |  LOW   | C1 은 **매핑 규칙 drift** 만 검출 (primitive 숫자값 변경 무감지). `tokenConsumerDrift.test.ts` 상단 docstring 에 역할 분리 명시 + G3 실증 케이스(`{spacing.xs}` 4→6 시 C1 PASS) 주석화 |
| R4  | C4 확장 debt                              |  LOW   | 향후 `useContainerStyleDefault` 가 resolved 숫자를 반환하도록 확장되면 C4 drift test 추가 필요. 현재는 scope 제외 명시 (Context). 확장 시 본 ADR 의 Addendum 또는 후속 ADR             |
| R5  | snapshot 초기 생성 시 대규모 PR diff      |  LOW   | token ~50개 × 소비자 3종 = 초기 150 assertion. 1회 대규모 diff 발생. PR 설명에 "initial snapshot" 명시 + 리뷰 부담 완화                                                                |

**잔존 HIGH 위험 없음** — 모든 Risks 가 MED/LOW. R1 이 가장 우선 (ADR-080 순서 의존).

## Gates

| Gate  | 시점         | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                          | 실패 시 대안                     |
| ----- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| G0    | 착수 전      | 소비자 경로 전체 enumeration 완료 — **C1/C2/C3 3종** 외 추가 경로 발견 시 포함 (C4 Style Panel 은 현재 resolved 숫자 미소비로 scope 제외). `resolveToken()` 호출처 grep + `implicitStyles.ts` hardcoded fallback 목록 확정. **ADR-080 P1 (`resolveContainerStylesFallback` helper 추출) 완료 확인** — 미완료 시 G2 미실행                                                                                                          | ADR-080 P1 선행 or 경로 재조정   |
| G1    | Phase 1 완료 | `tokenSnapshot.test.ts` 가 spacing/radius/typography 모든 token 의 resolved 숫자 값을 snapshot 고정 + vitest PASS + `.snap` 파일 CI 커밋                                                                                                                                                                                                                                                                                           | snapshot 범위 축소 후 재시도     |
| G2    | Phase 2 완료 | `tokenConsumerDrift.test.ts` 가 다음 3종을 G1 snapshot 과 비교 + vitest PASS: **C1** — `tokenToCSSVar()` 반환 CSS var 문자열 형식 regression (primitive 숫자값 변화 미감지, CSS var 이름 규칙 drift 만 감지) / **C2** — Skia `resolveToken()` 반환 숫자값 drift / **C3** — ADR-080 `resolveContainerStylesFallback()` 반환 resolved 숫자 drift                                                                                     | 경로별 skip + 이슈 등록          |
| G3    | Phase 3 완료 | **C2/C3 값 drift 실증**: `spacing.xs` 값을 임시로 `4 → 6` 으로 변경 → C2/C3 test 가 실패 + 실패 메시지에 drift 위치 명시 (token 이름 · 소비자 ID · 기댓값 4 · 실제값 6). **C1 은 실패하지 않음** — `tokenToCSSVar("{spacing.xs}")` = `"var(--spacing-xs)"` 문자열은 primitive 숫자값 변경과 독립. C1 은 별도로 "CSS var 이름 규칙 drift" 검증만 담당 (예: `tokenToCSSVar` 매핑 테이블의 name prefix 변경 시 감지). 역할 분리 명시. | drift 리포트 형식 개선 후 재실측 |
| G종결 | 전체 종결    | `spacing.xs` 원복 후 vitest 전체 회귀 0 + type-check 3/3 PASS + 빌드 시간 증가 <10% (`pnpm vitest --run` 실행 시간 **동일 cache 상태 3회 평균** before/after 비교)                                                                                                                                                                                                                                                                 | 성능 최적화 후 재측정            |

**잔존 HIGH 위험**: 없음.

## Consequences

### Positive

- **ADR-079 P3.2 한계 구조적 해소** — TokenRef 식별자 일치에서 resolved 값 일치 검증으로 업그레이드. `implicitStyles.ts` 하드코딩 fallback `?? 4` 가 primitives 변경 시 자동 감지됨
- **C1~C3 소비자 경로 커버리지 (역할 분리)** — **값 drift 검출**: C2(Skia `resolveToken` 반환 숫자) + C3(ADR-080 helper 반환 숫자) / **매핑 회귀 검출**: C1(`tokenToCSSVar` 의 `var(--spacing-xs)` 문자열 규칙 — primitive 값 변경과 독립). primitive 숫자 변경 시 자동 감지는 C2/C3, CSS var 이름 규칙 변경 시 감지는 C1. Style Panel(C4)은 현재 hook 이 gap/padding resolved 숫자를 소비하지 않아 scope 외 (향후 확장 시 포함)
- **ADR-080 선행 의존 + 연계 효과** — ADR-080 P1 이 `resolveContainerStylesFallback()` helper 로 추출해야 C3 test 가 외부 cross-reference 로 성립 (현재 `applyImplicitStyles()` 내부 인라인 리터럴은 접근 불가). helper 완성 후 C3 drift test 가 `resolveToken()` 반환값 비교로 전환됨
- **primitives 수정 워크플로 명확화** — token 값 변경 시 `vitest --update-snapshots` 로 의도적 승인 + PR 리뷰에서 snapshot diff 가시화
- **기존 인프라 재사용** — 새 test runner 도입 없음. vitest + `.snap` 패턴은 프로젝트 표준

### Negative

- test 파일 2개 신규 추가 — `tokenSnapshot.test.ts` + `tokenConsumerDrift.test.ts`
- **C3 구현은 ADR-080 P1 helper 완료 후에만 가능** — 현재 `applyImplicitStyles()` 내부 인라인 리터럴은 외부 참조 경로 없음. ADR-080 미완료 시 C3 assertion 은 상수 복붙 "그림자 상수" 가 되어 drift 감지 무효화됨 → **본 ADR G2 는 ADR-080 P1 에 선행 의존**
- snapshot 파일 추가로 PR diff 가 길어질 수 있음 — token ~50개 × 소비자 3종 결과 초기 snapshot 생성 시 1회 대규모 diff 발생

## References

- ADR-036 Spec-First Single Source — D3 SSOT 상위 원칙
- ADR-063 SSOT Chain Charter — D3 domain 정본 (본 ADR 의 domain 판정 근거)
- ADR-079 Phase 3.2 — `implicitStyles-listbox.test.ts` drift test (본 ADR 이 확장하는 선례)
- ADR-080 Layout engine Spec direct read-through — C3 소비자 경로를 `resolveToken()` 기반으로 전환하는 병행 ADR. 본 ADR 의 C3 커버리지 자동 강화 의존 관계
- `packages/specs/src/renderers/__tests__/CSSGenerator.snapshot.test.ts` — snapshot 패턴 선례
- `packages/specs/src/renderers/utils/tokenResolver.ts` — C2 Skia 경로 핵심 함수 (`resolveToken`, `tokenToCSSVar`)
- `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:673-674` — C3 harcoded fallback 현황 (`gap ?? 2`, `padding ?? 4`)
- `ssot-hierarchy.md` — D3 symmetric consumer 원칙
