# ADR-083: Archetype Base Styles 를 Spec containerStyles 로 리프팅

## Status

Proposed — 2026-04-20

## Context

`packages/specs/src/renderers/CSSGenerator.ts:50-116` 의 `ARCHETYPE_BASE_STYLES` 테이블이 **12 archetype entry** (`simple`/`text`/`button`/`input-base`/`toggle-indicator`/`progress`/`slider`/`tabs-indicator`/`collection`/`overlay`/`calendar`/`alert`) 에 대한 layout base styles (`display`/`flexDirection`/`alignItems`/... 등) 를 선언하고 있다. 12 entry 중 `tabs-indicator` 는 현재 소비 spec 0 이므로 **실질 영향 archetype 은 11**. 이 테이블은 **CSSGenerator 단독 소비**이며, Skia Taffy 레이아웃 엔진과 Style Panel (ADR-082 resolver) 은 archetype 의 존재 자체를 모른다.

결과: 65 spec × 3경로(CSS/Skia/Panel) 중 CSS만 정상 동작. InlineAlert 실 사례에서 확증 — CSS 에는 `display: flex; flex-direction: column` 이 적용되어 vertical stack, Skia Taffy 에는 block fallback → Skia 렌더가 가로 배치로 무너짐. 11 archetype (tabs-indicator 제외) × 평균 6 spec = 65 spec 모두 동일 취약점 보유. 65/65 spec 이 `containerStyles` 에 display 를 **명시하지 않음** — Generator table 이 유일 소스.

**SSOT 체인 관점 (D1/D2/D3)**: 본 ADR 은 `.claude/rules/ssot-hierarchy.md` **D3 (시각 스타일, Spec SSOT)** 범위 내 정리. CSSGenerator table 이 실질 소유자인 현재 구조는 ADR-063 "Spec = D3 SSOT" 원칙과 `ssot-hierarchy.md` 대칭 정의("symmetric = 시각 결과 동일") 둘 다 위반. D1 (DOM/접근성, RAC) / D2 (Props/API) 경계 침범 없음.

**Hard Constraints**:

1. 기존 Generated CSS 의 cascade 결과 **완전 동일** 유지 (65 spec × 각 variant/size 조합 시각 회귀 0)
2. `pnpm type-check` 3/3 × `pnpm build:specs` × `pnpm --filter @composition/builder test` 전부 PASS
3. ADR-078 Phase 5 선례 (ListBox/Menu/Autocomplete) 와 **동일 패턴** — `containerStyles` 필드 명시
4. 수용 가능한 최악 회귀 — Generated CSS diff 에서 `display`/`flex-direction` 이 archetype block 과 `containerStyles` block 양쪽에 중복 emit (실질 cascade 동일). 단일 Phase 내부에서 감지 가능해야 함
5. ADR-082 Hard Constraint "Spec 내용 불변" 와 충돌 — 본 ADR 이 **그 제약을 명시적으로 해제**. 대신 ADR-082 Phase 5 (Chrome MCP 검증) 를 본 ADR land 후 실행으로 재조정

**Soft Constraints**:

- 65 spec 전체를 한 세션에 처리 불가 — archetype 별 Phase 분리 필수
- `progress` archetype 은 `grid-template-areas` / nested slot selector 포함 — `ContainerStylesSchema` 확장 필요 가능성
- `simple` archetype 27 spec 대량 — batch script 고려

## Alternatives Considered

### 대안 A: SSOT 리프팅 (각 spec `containerStyles` 에 archetype base 값 명시)

- 설명: 11 archetype 의 base 값을 각 해당 spec 의 `containerStyles` 필드로 이관. `ARCHETYPE_BASE_STYLES` 테이블은 최종 Phase 에서 삭제 (tabs-indicator 0-spec entry 포함). archetype abstraction 은 label-only (category 분류용) 로 환원.
- 근거: **부분 선례 존재** — ADR-078 Phase 5 흐름으로 `ListBox.spec` + `ListBoxItem.spec` 2 spec 에 `containerStyles` 내 `display`/`flexDirection`/`alignItems`/`justifyContent` 리프팅 완료 (코드 확증: `ListBox.spec.ts:84-91` + `ListBoxItem.spec.ts:52-57`). 다른 containerStyles 보유 spec (Menu / Autocomplete 등) 은 색상·간격 SSOT 만 리프팅, layout primitive (display/flexDirection) 는 미적용. 또한 `ContainerStylesSchema` 인프라(ADR-071) 와 `useContainerStyleDefault` read-through (ADR-079 Implemented) 가 이미 land — 확장 기반 검증 완료. ADR-063 "Spec = D3 SSOT" 원칙과 최적 정합. Spec 하나만 열어도 시각 특성 전부 추론 가능.
- 위험:
  - 기술: **LOW** — ADR-078 Phase 5 선례로 패턴 검증 완료, `ContainerStylesSchema` 인프라(ADR-071) 존재
  - 성능: **LOW** — runtime 변화 없음, 빌드 타임 Generator 로직 단순화 (네거티브 영향)
  - 유지보수: **LOW** — 65 spec 에 4-8줄씩 추가, diff 단순, grep 가능
  - 마이그레이션: **MEDIUM** — 65 spec 순차 수정, Phase 분리 + 회귀 테스트 필수. Phase 별 rollback 경로 필요

### 대안 B: Read-through 전면화 (테이블 공유, 3 consumer 참조)

- 설명: `ARCHETYPE_BASE_STYLES` 테이블을 `packages/specs/src/renderers/` 에서 export. CSSGenerator + Skia Taffy layout builder + Style Panel resolver 3자가 동일 테이블 참조. Spec 은 `archetype` 필드만 보유, 시각값은 공유 테이블 소유.
- 근거: 테이블 1 곳 수정 = 3 경로 동시 반영. 변경 비용 낮음. `.claude/rules/ssot-hierarchy.md` 가 허용 ("구현 방법 자유, 시각 결과 동일")
- 위험:
  - 기술: **MEDIUM** — Skia Taffy 빌더 진입점에서 archetype 해석 로직 신설, composite 케이스(ListBox 처럼 `containerStyles` 부분 override) 의 merge 규칙 정의 필요
  - 성능: **LOW** — runtime 영향 미미
  - 유지보수: **MEDIUM** — hidden-default 패턴 영구 고착. 새 archetype 추가 시 3 곳 동기화 책임. Spec 만 봐서는 시각 특성 추론 불가, 테이블 역조회 필요
  - 마이그레이션: **LOW** — spec 파일 수정 0, Generator/Skia/Panel 3 곳만 배선

### 대안 C: Status Quo (InlineAlert 단일 fix 만)

- 설명: InlineAlert.spec 에만 `containerStyles` 추가. 다른 archetype 은 보고 후 fix.
- 근거: 최소 변경 — 급한 체감 버그만 해결. 다른 archetype 은 "발견 시 점진 fix".
- 위험:
  - 기술: **LOW** — 1 spec 수정
  - 성능: **LOW** — 영향 없음
  - 유지보수: **HIGH** — 동일 증상이 archetype 65 spec 에 잠복. 발견될 때마다 band-aid 반복 ("버그-패치-버그-패치" 패턴). 개별 spec 의 containerStyles 선언 스타일이 파편화 (어떤 spec 은 선언, 어떤 spec 은 archetype table 의존)
  - 마이그레이션: **LOW** — 1 spec 수정

### Risk Threshold Check

| 대안             | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---------------- | :--: | :--: | :------: | :----------: | :--------: |
| A (SSOT 리프팅)  | LOW  | LOW  |   LOW    |    MEDIUM    |     0      |
| B (Read-through) | MED  | LOW  |   MED    |     LOW      |     0      |
| C (Status Quo)   | LOW  | LOW  | **HIGH** |     LOW      |     1      |

**루프 판정**:

- 대안 C 는 HIGH 1 개 (유지보수) 보유 — 본 ADR 의 트리거(InlineAlert) 증상이 65 spec 에 걸쳐 재발할 수밖에 없는 구조. 사용자 피드백("버그-패치-버그-패치 안 할 것 아닌가") 에서도 명시적 기각
- 대안 A / B 모두 HIGH 0 — CRITICAL 루프 불필요
- A 의 MEDIUM (마이그레이션) 은 Phase 분리 + rollback 경로로 완화 가능
- B 의 MEDIUM 2건 은 구조적 debt (hidden-default 고착 + 3곳 동기화) 로, 완화 어려움

## Decision

**대안 A (SSOT 리프팅)** 를 선택한다.

선택 근거:

1. **부분 선례 + 인프라 존재**: ADR-078 Phase 5 흐름으로 `ListBox.spec` + `ListBoxItem.spec` 2 spec 에 layout primitive 리프팅 완료 (`ListBox.spec.ts:84-91` + `ListBoxItem.spec.ts:52-57`). `ContainerStylesSchema` 인프라(ADR-071) 와 `useContainerStyleDefault` read-through(ADR-079 Implemented) 가 확장 기반으로 land. 본 ADR 은 이 패턴을 11 archetype 전체로 일반화
2. **SSOT 원칙 정합**: ADR-063 "Spec = D3 시각 domain SSOT" + `ssot-hierarchy.md` 대칭 원칙 둘 다에 최적 부합. 시각값 소유자를 Spec 으로 통일하여 3 consumer (CSS/Skia/Panel) 가 동일 소스 참조
3. **잔존 위험 수용 근거**: A 의 MEDIUM (마이그레이션) 은 Phase 별 독립 커밋 + 각 Phase cascade diff 수동 검토 + `archetypeCssParity.test.ts` 회귀 감지 인프라로 완화. 각 Phase 실패 시 해당 Phase 만 revert 가능

기각 사유:

- **대안 B 기각**: hidden-default 패턴이 영구 고착됨. Spec 작성자가 `archetype="alert"` 한 줄만 보고 컴포넌트 시각 특성 추론 불가 → 리뷰/디버깅 때마다 테이블 역조회. ADR-063 정신과 거리가 멀고, 부분 선례(ListBox/ListBoxItem) 와 철학 상충
- **대안 C 기각**: 유지보수 HIGH — 동일 증상 65 spec 재발 구조적 불가피. 사용자 기각 명시

> 구현 상세: [083-archetype-base-styles-lifting-breakdown.md](../design/083-archetype-base-styles-lifting-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                              | 심각도 | 대응                                                                                                                                                                                             |
| :-: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Phase 중 Generated CSS cascade 결과 변화 (double-emit 이지만 specificity 차이로 다른 값 이김)                                                                                                                     |  MED   | 각 Phase 별 Generated CSS diff 수동 검토 + `archetypeCssParity.test.ts` 신설 (archetype base 선언이 `containerStyles` 에도 선언돼 있는지 cross-ref, drift 감지)                                  |
| R2  | `progress` archetype 의 `grid-template-areas` + nested slot selector 를 `ContainerStylesSchema` 가 수용 못 함                                                                                                     |  MED   | Phase 10 진입 전 `ContainerStylesSchema` 확장 ADR 발의 또는 본 ADR Addendum. 필요시 progress 만 read-through 예외 (대안 B subset) 유지 검토                                                      |
| R3  | 65 spec 대량 수정에서 일부 spec 이 archetype base 를 이미 override 중일 때 merge 실수                                                                                                                             |  MED   | Phase 별 진입 전 해당 archetype 소속 spec 의 기존 `containerStyles` 감사. 기존 필드와 archetype 값이 충돌하면 기존 필드 우선 (Spec 작성자 의도 존중)                                             |
| R4  | ADR-082 Hard Constraint "Spec 내용 불변" 의 명시적 해제로 ADR-082 검증 base 가 흔들림                                                                                                                             |  LOW   | ADR-082 P5 (Chrome MCP) 를 본 ADR land 후로 재일정. ADR-082 본문에 Hard Constraint 수정 Addendum 추가                                                                                            |
| R5  | `simple` archetype 27 spec 대량 batch 수정에서 개별 spec 특이사항 놓침                                                                                                                                            |  LOW   | `simple` 을 마지막 Phase (11) 로 배치. 이전 Phase 패턴 안정화 후 batch script 작성 + 자동 diff                                                                                                   |
| R6  | Factory 중복 주입 재발 — ADR-079 P3 계약(factory `display/flexDirection/gap/padding` 제거) 위반 잠재 (spec.containerStyles 에 archetype base 추가 시 factory 에도 동일 값이 남아있으면 implicitStyles drift 발생) |  MED   | 각 Phase 통과 조건에 `effectiveGetChildElements`/factory `createDefault*Props` 대상 archetype 의 factory 코드 감사 추가. `implicitStyles` drift test 재실행 의무. 위반 발견 시 해당 factory 정리 |
| R7  | Preview/Publish 경로 (`packages/shared/src/components/styles/generated/*.css`) 의 cascade 결과 변화 감지 누락                                                                                                     |  LOW   | G3 Chrome MCP 샘플링을 Builder Skia + Preview DOM + Publish DOM 3경로 비교로 확장. ADR-082 P5 scope 포함                                                                                         |

잔존 HIGH 위험 없음.

## Gates

| Gate | 시점                   | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                         | 실패 시 대안                                                           |
| :--: | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
|  G1  | Phase 1 (alert) 완료   | (a) InlineAlert/IllustratedMessage Generated CSS diff 수동 검토 → "실질 변화 없음" 확정. (b) Chrome MCP InlineAlert 시각 Skia = CSS = Panel 3경로 정합. (c) **`pnpm build:specs` → `packages/shared` regenerate 후 stale CSS 없음 확인**. (d) **alert archetype 소속 factory(`createDefault*Props`) 에 archetype base 중복 주입 없음 감사 (R6)**. (e) **ADR-082 본문에 Hard Constraint "Spec 내용 불변" 해제 Addendum 작성 (R4)** | Phase 1 revert + 테이블 위치/merge 규칙 재설계                         |
|  G2  | Phase 2–5 각각 완료    | (a) 해당 archetype Generated CSS diff "실질 변화 없음". (b) `resolveLayoutSpecPreset` 단위 테스트 PASS + `pnpm type-check` 3/3. (c) **해당 archetype factory 중복 주입 감사(R6)**. (d) **ADR-081 `tokenConsumerDrift.test.ts` snap 재실행 + 의도된 변화만 update**                                                                                                                                                                | 해당 Phase revert, 원인 분석 후 재진입                                 |
|  G3  | Phase 6–10 완료        | (a) `archetypeCssParity.test.ts` 전체 archetype coverage PASS. (b) **Chrome MCP 샘플링 4 archetype 이상 × Builder Skia + Preview DOM + Publish DOM 3경로 비교 정합(R7)**. (c) factory 감사 누적 + snap 절차 유지                                                                                                                                                                                                                  | drift 발견 archetype revert                                            |
|  G4  | Phase 11 (simple) 완료 | 27 spec 전체 Generated CSS diff + Chrome MCP 대표 5 spec × 3경로 정합 + builder vitest 회귀 0 + factory 감사 완료                                                                                                                                                                                                                                                                                                                 | batch script 오류 시 개별 spec 수동 검토 후 재커밋                     |
|  G5  | 최종 (Generator 정리)  | `ARCHETYPE_BASE_STYLES` 테이블 삭제(tabs-indicator 0-spec entry 포함) 후에도 Generated CSS 전체 diff = Phase 11 종료 시점과 동일. ADR-081 tokenConsumerDrift 패턴 재사용한 archetype drift 테스트 PASS                                                                                                                                                                                                                            | Generator 테이블 삭제 보류, CSSGenerator-only helper 로 범위 축소 유지 |

## Consequences

### Positive

- **65 spec × 3 경로 (CSS/Skia/Panel) 정합성 완전 복원** — InlineAlert 유형 drift 가 구조적으로 불가능해짐
- **ADR-063 D3 SSOT 원칙 충실** — Spec 이 시각값 유일 소유자. 새 컴포넌트 추가 시 `containerStyles` 선언 여부가 type-check/리뷰 게이트에서 자연 표면화
- **ADR-078 Phase 5 확장 완결** — 부분 적용 상태를 통일
- **Generator 로직 단순화** — `ARCHETYPE_BASE_STYLES` 분기 소멸, `generateBaseStyles` 함수 축소
- **ADR-081 drift 인프라 활용 극대화** — archetype coverage 도 drift 감지 대상에 편입 가능 (ADR-081 C4 Addendum 트리거)
- **ADR-082 P5 Chrome MCP 검증의 정확도 향상** — 기존 검증은 archetype spec 에 대해 "의미 없는 block fallback" 기록 가능성 있었음

### Negative

- **65 spec 에 `containerStyles` 필드 추가 = diff 체감 크기 증가** — Phase 별 독립 커밋으로 분산하여 리뷰 단위 유지
- **ADR-082 Hard Constraint "Spec 내용 불변" 명시적 해제** — ADR-082 검증 base 재조정 필요 (ADR-082 에 Addendum 추가)
- **archetype abstraction 의미 희석** — "visual category" 역할만 남아 `archetype` 필드가 점차 의미 잃음. 향후 필드 자체 제거 고려 가능하나 본 ADR scope 외
- **Phase 분리에 따른 중간 상태 기간 증가** — Phase 1–11 이 분할 세션으로 수 주 지속 가능. 중간 시점에 어떤 spec 은 리프팅 완료, 어떤 spec 은 archetype table 의존 → 혼합 상태. Generator 는 양쪽 지원하도록 최종 Phase 까지 유지 필수
