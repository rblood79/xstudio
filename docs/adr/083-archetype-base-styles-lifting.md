# ADR-083: Layout Primitive 리프팅 — archetype base 의 layout 속성을 Spec containerStyles 로 이관

## Status

Proposed — 2026-04-20 (Revision 2: Codex 리뷰 HIGH 반영 — scope 를 layout primitive 로 축소)

## Context

`packages/specs/src/renderers/CSSGenerator.ts:50-116` 의 `ARCHETYPE_BASE_STYLES` 테이블이 **12 archetype entry** (`simple`/`text`/`button`/`input-base`/`toggle-indicator`/`progress`/`slider`/`tabs-indicator`/`collection`/`overlay`/`calendar`/`alert`) 에 대한 base styles 를 선언하고 있다. 이 테이블은 **CSSGenerator 단독 소비**이며, Skia Taffy 레이아웃 엔진과 Style Panel (ADR-082 resolver) 은 archetype 의 존재 자체를 모른다. 12 entry 중 `tabs-indicator` 는 현재 소비 spec 0 이므로 **실질 영향 archetype 은 11**.

결과: 65 spec × 3 경로(CSS/Skia/Panel) 중 CSS만 정상 동작. InlineAlert 실 사례에서 확증 — CSS 에는 `display: flex; flex-direction: column` 이 적용되어 vertical stack, Skia Taffy 에는 block fallback → Skia 렌더가 가로 배치로 무너짐. 11 archetype (tabs-indicator 제외) × 평균 6 spec = 65 spec. **ListBox.spec + ListBoxItem.spec 2 spec 이 기존 layout primitive 리프팅 완료** (선례), 나머지 63 spec 은 `containerStyles` 에 display 미명시.

### Scope 결정 — Layout Primitive 한정 (Revision 2)

**archetype table 에는 layout primitive 외에도** `box-sizing`, `cursor`, `user-select`, `transition`, `font-family`, `position: fixed`, `grid-template-areas`, `grid-template-columns`, nested selector (`.react-aria-Label { ... }`) 등이 선언되어 있다. 이들 중 상당수는 **현재 `ContainerStylesSchema` (`packages/specs/src/types/spec.types.ts:59-93`) 과 `emitContainerStyles` (`CSSGenerator.ts:634`) 가 지원하지 않는 필드**이며, schema/Generator 확장 없이는 리프팅 불가.

따라서 본 ADR 은 **현재 schema 가 지원하는 layout primitive 속성만** Spec containerStyles 로 이관한다:

- 지원 필드 (리프팅 대상): `display` / `flexDirection` / `alignItems` / `justifyContent` / `width` / `maxHeight` / `overflow` / `outline`
- 리프팅 대상에서 제외: `box-sizing` / `cursor` / `user-select` / `transition` / `font-family` / `position: fixed` / grid-template-\* / nested selector

결과로 **`ARCHETYPE_BASE_STYLES` 테이블은 유지** — 단, layout primitive 부분은 spec 선언과 중복 emit 상태로 남는다. 완전 삭제는 후속 ADR (ContainerStylesSchema/Generator 확장 + 나머지 속성 리프팅) 에서 처리.

### SSOT 체인 관점 (D1/D2/D3)

본 ADR 은 `.claude/rules/ssot-hierarchy.md` **D3 (시각 스타일, Spec SSOT)** 범위 내 정리. CSSGenerator table 이 layout primitive 의 실질 소유자인 현재 구조는 ADR-063 "Spec = D3 SSOT" 원칙과 `ssot-hierarchy.md` 대칭 정의("symmetric = 시각 결과 동일") 둘 다 위반. D1 (DOM/접근성, RAC) / D2 (Props/API) 경계 침범 없음.

### 선례 인용 (분리 명시)

- **`ContainerStylesSchema` 인프라**: ADR-071 (Implemented 2026-04-18) — 본 ADR 이 소비하는 schema/Generator emit 체인
- **ListBox.spec layout primitive 리프팅**: ADR-078 Phase 5 흐름 — `ListBox.spec.ts:76-91`
- **`ContainerStylesSchema.alignItems`/`justifyContent` 필드 + ListBoxItem.spec 리프팅**: ADR-079 P1 (Implemented 2026-04-19) — `ListBoxItem.spec.ts:49-57`
- **Style Panel read-through 체인**: ADR-079 P2 (`useContainerStyleDefault`) + ADR-082 (Style Panel resolver)
- **Layout engine read-through**: ADR-080 (Implemented 2026-04-20) — `resolveContainerStylesFallback`

Menu.spec (`Menu.spec.ts:72-`) 는 색상·간격 containerStyles 만, Autocomplete.spec (`Autocomplete.spec.ts:123-`) 은 빈 composition.containerStyles 만 보유 — layout primitive 선례 모수 아님.

### Hard Constraints

1. 기존 Generated CSS 의 cascade 결과 **완전 동일** 유지 (63 잔여 spec × 각 variant/size 조합 시각 회귀 0)
2. `pnpm type-check` 3/3 × `pnpm build:specs` × `pnpm --filter @composition/builder test` 전부 PASS
3. 리프팅 대상 = `ContainerStylesSchema` 현재 지원 필드 (layout primitive 8종) 에 한정
4. 수용 가능한 최악 회귀 — Generated CSS diff 에서 layout primitive 가 archetype block 과 `containerStyles` block 양쪽에 중복 emit (실질 cascade 동일). 단일 Phase 내부에서 감지 가능해야 함
5. `ARCHETYPE_BASE_STYLES` 테이블은 **유지** — 본 ADR 은 테이블 완전 삭제를 목표로 하지 않는다. 비-layout 속성(box-sizing 등) 은 후속 ADR scope

### Soft Constraints

- 63 잔여 spec 전체를 한 세션에 처리 불가 — archetype 별 Phase 분리 필수
- `simple` archetype 26 spec (ListBoxItem 제외) 대량 — batch script 고려
- `progress` archetype 의 grid-template 관련 속성은 scope 외 — display: grid 만 리프팅

## Alternatives Considered

### 대안 A: Layout Primitive 리프팅 (schema 지원 범위)

- 설명: 11 archetype 의 layout primitive (display/flexDirection/alignItems/justifyContent/width/maxHeight/overflow/outline) 를 각 해당 spec 의 `containerStyles` 필드로 이관. `ARCHETYPE_BASE_STYLES` 테이블은 **유지** (layout primitive 는 중복 emit, 비-layout 속성은 단독 소유). archetype abstraction 은 유지되지만 layout 책임은 Spec 이 소유.
- 근거: **부분 선례 + 인프라 존재** — `ListBox.spec.ts:76-91` (collection archetype) + `ListBoxItem.spec.ts:49-57` (simple archetype) 가 정확히 이 패턴 적용 완료. `ContainerStylesSchema` (ADR-071) + `useContainerStyleDefault` (ADR-079 P2) + `resolveContainerStylesFallback` (ADR-080) 가 소비 경로 완성. ADR-063 "Spec = D3 SSOT" 원칙과 정합 (layout primitive 범위에서).
- 위험:
  - 기술: **LOW** — ADR-078/079/080 선례로 패턴 검증 완료, schema 확장 불필요
  - 성능: **LOW** — runtime 변화 없음, 빌드 타임 소폭 증가
  - 유지보수: **LOW** — 63 spec 에 4-8줄씩 추가, diff 단순, grep 가능
  - 마이그레이션: **MEDIUM** — 63 spec 순차 수정, Phase 분리 + 회귀 테스트 필수

### 대안 B: archetype table 완전 삭제 (전체 속성 리프팅)

- 설명: `ARCHETYPE_BASE_STYLES` 의 **모든 속성** (layout primitive + box-sizing + cursor + user-select + transition + font-family + position + grid-template-\* + nested selector) 을 Spec 으로 이관. `ContainerStylesSchema` 확장 + `emitContainerStyles` 확장 + Generator base 로직 단순화 선행 필요.
- 근거: archetype abstraction 완전 해체. Spec 단일 평면.
- 위험:
  - 기술: **HIGH** — `ContainerStylesSchema` 에 ~10 필드 추가 + nested selector 표현 방식 신설 + Generator base emit 로직 재작성. grid-template-areas 같은 문자열 속성의 타입 설계 필요
  - 성능: **LOW** — runtime 무관
  - 유지보수: **MEDIUM** — schema 가 방대해지면 Spec 선언 표면적 증가. 일부 속성 (box-sizing: border-box) 은 거의 모든 컴포넌트 공통 → 반복 선언 부담
  - 마이그레이션: **HIGH** — schema 확장 + 65 spec 수정 + Generator 로직 수정이 얽혀 revert 단위 커짐

### 대안 C: Read-through 전면화 (테이블 공유, 3 consumer 참조)

- 설명: `ARCHETYPE_BASE_STYLES` 테이블을 `packages/specs/src/renderers/` 에서 export. CSSGenerator + Skia Taffy layout builder + Style Panel resolver 3자가 동일 테이블 참조. Spec 은 `archetype` 필드만 보유, 시각값은 공유 테이블 소유.
- 근거: 테이블 1 곳 수정 = 3 경로 동시 반영. `ssot-hierarchy.md` 가 허용 ("구현 방법 자유, 시각 결과 동일")
- 위험:
  - 기술: **MEDIUM** — Skia Taffy 빌더 진입점에서 archetype 해석 로직 신설, composite 케이스 merge 규칙 정의 필요
  - 성능: **LOW** — runtime 영향 미미
  - 유지보수: **MEDIUM** — hidden-default 패턴 영구 고착. 새 archetype 추가 시 3 곳 동기화 책임. Spec 만 봐서는 시각 특성 추론 불가
  - 마이그레이션: **LOW** — spec 파일 수정 0, Generator/Skia/Panel 3 곳만 배선

### 대안 D: Status Quo (InlineAlert 단일 fix 만)

- 설명: InlineAlert.spec 에만 `containerStyles` 추가. 다른 archetype 은 발견 시 점진 fix.
- 위험:
  - 기술: **LOW** / 성능: **LOW**
  - 유지보수: **HIGH** — 동일 증상이 63 spec 에 잠복. "버그-패치-버그-패치" 패턴 재발
  - 마이그레이션: **LOW**

### Risk Threshold Check

| 대안                 |   기술   | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| -------------------- | :------: | :--: | :------: | :----------: | :--------: |
| A (Layout Primitive) |   LOW    | LOW  |   LOW    |    MEDIUM    |     0      |
| B (완전 삭제)        | **HIGH** | LOW  |   MED    |   **HIGH**   |     2      |
| C (Read-through)     |   MED    | LOW  |   MED    |     LOW      |     0      |
| D (Status Quo)       |   LOW    | LOW  | **HIGH** |     LOW      |     1      |

**루프 판정**:

- 대안 B (완전 삭제) HIGH 2 개 — schema 확장 복잡도 + 얽힌 마이그레이션. 원래 드래프트(Revision 1)의 목표였으나 Codex 리뷰 HIGH 지적으로 HIGH 2 로 재평가. 현재 ADR scope 에서 기각, **후속 ADR 로 분리**
- 대안 D HIGH 1 (유지보수) — 트리거 증상 63 spec 재발 구조. 사용자 기각 명시
- 대안 A / C 는 HIGH 0 — A 가 SSOT 원칙 정합도 우월

## Decision

**대안 A (Layout Primitive 리프팅)** 를 선택한다.

선택 근거:

1. **부분 선례 + 인프라 완비**: `ListBox.spec.ts:76-91` (collection) + `ListBoxItem.spec.ts:49-57` (simple) 가 layout primitive 리프팅 패턴을 이미 land. `ContainerStylesSchema` (ADR-071) + `useContainerStyleDefault` (ADR-079 P2) + `resolveContainerStylesFallback` (ADR-080) + Style Panel resolver (ADR-082) 가 소비 체인 전부 완성. 본 ADR 은 이 패턴을 11 archetype 의 잔여 63 spec 으로 일반화
2. **Scope 최소 — 근본 해결 유지**: InlineAlert 유형 drift 의 근본 원인은 **layout primitive 의 3경로 비대칭**. 색상·간격·box-sizing 등은 CSS cascade 로 이미 대칭. scope 를 layout primitive 에 한정해도 사용자 체감 버그는 구조적으로 소멸. 비-layout 속성(box-sizing 등) 이관은 **후속 ADR 에서 필요성 명확해진 후** 처리
3. **잔존 위험 수용 근거**: A 의 MEDIUM (마이그레이션) 은 Phase 별 독립 커밋 + 각 Phase cascade diff 수동 검토 + factory 감사 + `tokenConsumerDrift` snap 재실행으로 완화. Phase 실패 시 해당 Phase 만 revert

기각 사유:

- **대안 B 기각**: HIGH 2 (기술 + 마이그레이션). schema 확장 규모 큰 작업을 본 ADR 에 묶으면 리뷰/revert 단위 지나치게 커짐. 별도 ADR 로 분리해야 함
- **대안 C 기각**: hidden-default 패턴이 영구 고착됨. Spec 작성자가 `archetype="alert"` 한 줄만 보고 layout 특성 추론 불가 → ADR-063 정신과 상충. 선례(ListBox/ListBoxItem) 의 Spec 소유 방향과도 충돌
- **대안 D 기각**: 유지보수 HIGH — 63 spec 재발 구조적 불가피

> 구현 상세: [083-archetype-base-styles-lifting-breakdown.md](../design/083-archetype-base-styles-lifting-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                                | 심각도 | 대응                                                                                                                                                                                             |
| :-: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Phase 중 Generated CSS cascade 결과 변화 (double-emit 이지만 specificity/순서 차이로 다른 값 이김)                                                                                                                  |  MED   | 각 Phase 별 Generated CSS diff 수동 검토 + `archetypeCssParity.test.ts` 신설 (archetype base 의 layout primitive 선언이 `containerStyles` 에도 동일 값으로 선언돼 있는지 cross-ref, drift 감지)  |
| R2  | 65 spec 대량 수정에서 일부 spec 이 archetype base 를 이미 override 중일 때 merge 실수                                                                                                                               |  MED   | Phase 별 진입 전 해당 archetype 소속 spec 의 기존 `containerStyles` 감사. 기존 필드와 archetype 값이 충돌하면 기존 필드 우선 (Spec 작성자 의도 존중)                                             |
| R3  | ADR-082 Hard Constraint "Spec 내용 불변" 의 명시적 해제로 ADR-082 검증 base 가 흔들림                                                                                                                               |  LOW   | ADR-082 P5 (Chrome MCP) 를 본 ADR land 후로 재일정. ADR-082 본문에 Hard Constraint 수정 Addendum 추가                                                                                            |
| R4  | `simple` archetype 26 spec 대량 batch 수정에서 개별 spec 특이사항 놓침                                                                                                                                              |  LOW   | `simple` 을 마지막 Phase 로 배치. 이전 Phase 패턴 안정화 후 batch script 작성 + 자동 diff                                                                                                        |
| R5  | Factory 중복 주입 재발 — ADR-079 P3 계약(factory `display/flexDirection/gap/padding` 제거) 위반 잠재 (spec.containerStyles 에 layout primitive 추가 시 factory 에도 동일 값이 남아있으면 implicitStyles drift 발생) |  MED   | 각 Phase 통과 조건에 `effectiveGetChildElements`/factory `createDefault*Props` 대상 archetype 의 factory 코드 감사 추가. `implicitStyles` drift test 재실행 의무. 위반 발견 시 해당 factory 정리 |
| R6  | Preview/Publish 경로 (`packages/shared/src/components/styles/generated/*.css`) 의 cascade 결과 변화 감지 누락                                                                                                       |  LOW   | G3 Chrome MCP 샘플링을 Builder Skia + Preview DOM + Publish DOM 3경로 비교로 확장. ADR-082 P5 scope 포함                                                                                         |
| R7  | 비-layout 속성 (box-sizing/cursor 등) 은 archetype table 에 잔존 → systemic drift 의 "절반 해결" 상태 장기화                                                                                                        |  LOW   | 본 ADR 은 layout primitive 만 scope. 비-layout 속성의 Skia/Panel 대칭 필요성 발생 시 후속 ADR 에서 `ContainerStylesSchema` 확장 발의                                                             |

잔존 HIGH 위험 없음.

## Gates

| Gate | 시점                   | 통과 조건                                                                                                                                                                                                                                                                                                                       | 실패 시 대안                             |
| :--: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
|  G1  | Phase 1 (alert) 완료   | (a) InlineAlert/IllustratedMessage Generated CSS diff 수동 검토 → "실질 변화 없음" 확정. (b) Chrome MCP InlineAlert 시각 Skia = CSS = Panel 3경로 정합. (c) `pnpm build:specs` → `packages/shared` regenerate stale 없음. (d) alert factory 중복 주입 감사 (R5). (e) **ADR-082 본문에 Hard Constraint 해제 Addendum 작성 (R3)** | Phase 1 revert + scope/절차 재설계       |
|  G2  | Phase 2–5 각각 완료    | (a) 해당 archetype Generated CSS diff "실질 변화 없음". (b) `resolveLayoutSpecPreset` 단위 테스트 PASS + `pnpm type-check` 3/3. (c) 해당 archetype factory 중복 주입 감사 (R5). (d) ADR-081 `tokenConsumerDrift.test.ts` snap 재실행 + 의도된 변화만 update                                                                     | 해당 Phase revert, 원인 분석 후 재진입   |
|  G3  | Phase 6–10 완료        | (a) `archetypeCssParity.test.ts` 전체 archetype coverage PASS. (b) Chrome MCP 샘플링 4 archetype 이상 × Builder Skia + Preview DOM + Publish DOM 3경로 비교 정합 (R6). (c) factory 감사 누적 + snap 절차 유지                                                                                                                   | drift 발견 archetype revert              |
|  G4  | Phase 11 (simple) 완료 | 26 spec (ListBoxItem 제외) 전체 Generated CSS diff + Chrome MCP 대표 5 spec × 3경로 정합 + builder vitest 회귀 0 + factory 감사 완료                                                                                                                                                                                            | batch script 오류 시 개별 spec 수동 검토 |
|  G5  | 최종 검증              | 11 archetype 모든 layout primitive 가 해당 spec `containerStyles` 에 선언된 상태 확인 (`archetypeCssParity.test.ts` 전체 PASS). `ARCHETYPE_BASE_STYLES` 테이블은 **유지**하되 layout primitive 는 중복 상태로 표기. Generated CSS 전체 diff = Phase 11 종료 시점과 동일                                                         | drift 발견 시 해당 archetype 수정 재실행 |

## Consequences

### Positive

- **63 spec × 3 경로 (CSS/Skia/Panel) 의 layout primitive 정합성 복원** — InlineAlert 유형 drift 가 layout 범위에서 구조적으로 불가능해짐
- **ADR-063 D3 SSOT 원칙 layout 범위 충실** — Spec 이 layout 소유자. 새 컴포넌트 추가 시 `containerStyles.display` 누락 여부가 type-check/리뷰 게이트에서 자연 표면화 가능
- **ADR-078 Phase 5 / ADR-079 P1 패턴 확장 완결** — 부분 적용 상태를 11 archetype 전체로 통일
- **ADR-081 drift 인프라 활용 극대화** — `archetypeCssParity.test.ts` 신설로 archetype coverage drift 감지 편입 가능 (ADR-081 C4 Addendum 트리거)
- **ADR-082 P5 Chrome MCP 검증의 정확도 향상** — Panel 이 Spec fallback 으로 정확한 값 표시 (기존 "block fallback" 해소)

### Negative

- **63 spec 에 `containerStyles` 필드 추가/확장 = diff 체감 크기 증가** — Phase 별 독립 커밋으로 분산하여 리뷰 단위 유지
- **ADR-082 Hard Constraint "Spec 내용 불변" 명시적 해제** — ADR-082 검증 base 재조정 필요 (ADR-082 에 Addendum 추가)
- **`ARCHETYPE_BASE_STYLES` 테이블 유지 → layout primitive double-emit 상태** — CSS cascade 동일이지만 diff 가독성 저하. 후속 ADR 에서 테이블 완전 삭제 추진 가능
- **비-layout 속성 (box-sizing/cursor 등) 은 archetype table 단독 소유 유지** — systemic drift 의 "절반 해결" 상태. 필요성 발생 시 별도 ADR
- **Phase 분리에 따른 중간 상태 기간 증가** — 수 주 지속 가능. 부분 리프팅 상태에서도 Generator 는 양쪽 지원하므로 기능 중단 없음
