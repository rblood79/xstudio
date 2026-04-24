# ADR-083: Layout Primitive 리프팅 — archetype base 의 layout 속성을 Spec containerStyles 로 이관

## Status

Implemented — 2026-04-20 (Phase 0-11 전부 land, 11 commit `20914c93`→`9675a3e6`)

**실행 요약** (총 63 spec 중 56 리프팅, 7 spec R8 후속 이관):

- Phase 0 (infra) — Skia consumer 일반화 (LOWERCASE_TAG_SPEC_MAP + 10 필드 + 공통 선주입 layer + listbox 중복 호출 제거)
- Phase 1 — alert 2 spec (InlineAlert + IllustratedMessage) + CSSGenerator color-only skip 분리 + ADR-082 Addendum A3
- Phase 2 — input-base 2 spec (Input + TextArea)
- Phase 3 — toggle-indicator 3 spec (Checkbox + Radio + Switch)
- Phase 4 — calendar 2 spec (CalendarGrid + CalendarHeader; Calendar 제외 — implicitStyles 분기 충돌 R8)
- Phase 5 — slider 3 spec (Slider + SliderTrack + SliderThumb)
- Phase 6 — collection 4 spec (Autocomplete + Menu + TabPanel + TabPanels)
- Phase 7 — text 4 spec (Text + Heading + Paragraph + Description)
- Phase 8 — button 5 spec (Button + ToggleButton + Link + SelectTrigger + FileTrigger; SelectTrigger Skia override 수용 R8)
- Phase 9 — overlay 0 spec (schema 미지원으로 전부 no-op)
- Phase 10 — progress 5 spec (ProgressCircle + \*Track/\*Value 4종; ProgressBar/Meter 제외 — 분기 충돌 R8)
- Phase 11 — simple 26 spec 일괄 리프팅 (sed batch; Breadcrumbs Skia override 수용 R8)

**R8 후속 ADR 대상** (implicitStyles 하드코딩 분기 해체): Calendar / ProgressBar / Meter / SelectTrigger / Breadcrumbs + 전반 분기 정리.

Proposed — 2026-04-20 (**Revision 5**: Codex Round 5 MED+LOW 반영 — 실제 entry 함수명 `applyImplicitStyles` 로 교체 (`getImplicitStyles` 오기) + breakdown revision 표기 Rev 4 동기화 보정)

## Context

### 현재 구조 (3 consumer 비대칭)

| consumer                                                                              | archetype base 소비 | spec `containerStyles` 소비                                                                                                                                | 대상 태그    |
| ------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **CSSGenerator** (`packages/specs/src/renderers/CSSGenerator.ts:50-116`)              | ✅ (단독 소유)      | ✅ (`emitContainerStyles`)                                                                                                                                 | 전체         |
| **Style Panel** (`specPresetResolver` — ADR-082)                                      | ❌                  | ✅ (ADR-082 A1/A2)                                                                                                                                         | 전체         |
| **Skia layout** (`implicitStyles.ts:95-116 resolveContainerStylesFallback` — ADR-080) | ❌                  | **부분 — `CONTAINER_STYLES_SPEC_MAP = { listbox: ListBoxSpec }` 단일 태그, `CONTAINER_STYLES_FALLBACK_KEYS = 4 필드` (display/flexDirection/gap/padding)** | listbox 전용 |

즉 **Skia consumer 는 ListBox 전용**이며 4 필드만 fallback. 다른 컴포넌트의 layout 은:

1. Generator archetype base 테이블 (Preview/Publish CSS 경로만) — 12 entry (tabs-indicator 0 spec 제외 시 11 archetype)
2. Skia 측에는 개별 `containerTag === "inlinealert"` / `"gridlistitem"` / `"listboxitem"` 등 **하드코딩 분기**가 산재. 예 `implicitStyles.ts:~2000` InlineAlert 블록이 `display: parentStyle.display ?? "flex"`, `flexDirection: ... ?? "column"`, `width: ... ?? "100%"` 를 하드코딩 주입

### 문제 구조

- **트리거**: InlineAlert 처럼 하드코딩 분기가 있는 태그는 Skia 렌더가 복구되지만, 새 archetype 추가/변경 시 하드코딩이 따라가지 않으면 drift 재발. 하드코딩 분기 자체가 파편화된 2차 소스 (ADR-063 SSOT 위반)
- **Style Panel**: ADR-082 A1/A2 로 spec containerStyles 소비 경로는 완성되었으나, **spec 에 값이 선언되어 있지 않으면** Panel 이 fallback 기본값만 표시 (현 상태 — 63 spec). 예: Select/ComboBox/Button 등 대부분의 컴포넌트에서 Layout section display 가 잘못 표시
- **Skia**: consumer 일반화 없음 → ListBox 외 태그는 spec containerStyles 를 절대 읽지 않음
- **근본 원인**: `ARCHETYPE_BASE_STYLES` (CSSGenerator 단독 소유) 가 layout primitive 의 **유일 SSOT**. 3 consumer 가 동일 소스 참조 못함 → `ssot-hierarchy.md` "symmetric = 시각 결과 동일" 원칙 위반

65 spec 중 **ListBox.spec + ListBoxItem.spec 2 spec** 이 layout primitive 를 containerStyles 로 리프팅 완료 (ADR-078 Phase 5 + ADR-079 P1). 잔여 **63 spec** 은 containerStyles 에 layout primitive 미선언 — archetype table 의존.

### Scope 결정 — Layout Primitive 한정 + Skia consumer 일반화 (Revision 3)

**Revision 2 scope 한계**: archetype table 완전 삭제는 비-layout 속성 (`box-sizing` / `cursor` / `user-select` / `transition` / `font-family` / `position: fixed` / `grid-template-areas` / `grid-template-columns` / nested selector) 이 현재 `ContainerStylesSchema` 미지원 → 후속 ADR 로 분리.

**Revision 3 추가**: Revision 2 의 spec 리프팅 scope 8 필드 (`display` / `flexDirection` / `alignItems` / `justifyContent` / `width` / `maxHeight` / `overflow` / `outline`) 는 **Skia consumer 가 읽어야만 의미** 있음. `CONTAINER_STYLES_SPEC_MAP` 과 `CONTAINER_STYLES_FALLBACK_KEYS` 가 **listbox + 4 필드 로만 부분 구현** 된 현재 상태에서 spec 에 아무리 값을 선언해도 Skia 는 참조하지 않는다. 따라서 **Phase 0 = Skia consumer 일반화** 를 본 ADR scope 에 포함한다.

### SSOT 체인 관점 (D1/D2/D3)

본 ADR 은 `.claude/rules/ssot-hierarchy.md` **D3 (시각 스타일, Spec SSOT)** 범위. `ARCHETYPE_BASE_STYLES` + 하드코딩 분기 파편화가 ADR-063 "Spec = D3 SSOT" 및 symmetric 원칙 위반. D1 (DOM/접근성, RAC) / D2 (Props/API) 경계 침범 없음.

### 선례 인용 (분리 명시)

- **`ContainerStylesSchema` 인프라**: ADR-071 (Implemented 2026-04-18)
- **ListBox.spec layout primitive 리프팅**: ADR-078 Phase 5 흐름 — `ListBox.spec.ts:76-91`
- **`ContainerStylesSchema.alignItems`/`justifyContent` 필드 + ListBoxItem.spec 리프팅**: ADR-079 P1 (Implemented 2026-04-19) — `ListBoxItem.spec.ts:49-57`
- **`useContainerStyleDefault` Panel read-through**: ADR-079 P2 + ADR-082
- **Skia layout read-through (listbox 단일)**: ADR-080 (Implemented 2026-04-20) — `implicitStyles.ts:112 resolveContainerStylesFallback`. **본 ADR Phase 0 = 이를 일반화**

Menu.spec / Autocomplete.spec 은 색상·간격 containerStyles 만 보유, layout primitive 미리프팅 — 선례 모수 아님.

### Hard Constraints

1. **Phase 0 (Skia consumer 일반화) 는 Phase 1 선행 필수** — consumer 없이 spec 리프팅은 Skia 에 반영되지 않음. 이를 위반하면 본 ADR 전체가 무효
2. 기존 Generated CSS 의 cascade 결과 **완전 동일** 유지 (63 잔여 spec × 각 variant/size 조합 시각 회귀 0)
3. 기존 Skia 렌더 회귀 0 — Phase 0 consumer 일반화 시 **3 영역 수정 필요** (Codex Round 4 HIGH 반영): (a) `CONTAINER_STYLES_SPEC_MAP` → TAG_SPEC_MAP 기반 `LOWERCASE_TAG_SPEC_MAP` (build-time Map 변환) + 10 필드 fallback. (b) `applyImplicitStyles` 진입부 **공통 선주입 layer** 추가 — 모든 태그의 `parentStyle` 에 spec fallback 선주입 (기존 `implicitStyles.ts:716` 단일 호출만으로는 listbox 외 효력 없음). (c) 기존 listbox 분기의 중복 호출 제거. 하드코딩 분기 감사에서 `parentStyle.X ?? "값"` 패턴은 자연 호환, 직접 할당 패턴 (gridlistitem/listboxitem 등) 은 `??` 도입 또는 분기 제거/whitelist. 하드코딩 해체 전체는 R8 후속
4. `pnpm type-check` 3/3 × `pnpm build:specs` × `pnpm --filter @composition/builder test` 전부 PASS
5. 리프팅 대상 = `ContainerStylesSchema` 현재 지원 필드 (layout primitive 8종) 에 한정. 비-layout 속성은 archetype table 유지, 후속 ADR
6. `ARCHETYPE_BASE_STYLES` 테이블은 **유지** — 본 ADR 은 테이블 완전 삭제를 목표로 하지 않음

### Soft Constraints

- Phase 0 일반화 범위가 예상 외로 큰 충돌 발생 시 "선별 태그 whitelist" 로 축소 가능 (ListBox 외 2-3 태그만 추가, 나머지는 후속)
- `simple` archetype 26 spec 대량 → batch script
- `progress` / `overlay` archetype 의 grid-template / position 속성은 scope 외

## Alternatives Considered

### 대안 A: Phase 0 (Skia consumer 일반화) + Phase 1-11 (spec 리프팅)

- 설명: Phase 0 = **3 영역 수정** — (1) `CONTAINER_STYLES_SPEC_MAP` 을 TAG_SPEC_MAP 기반 `LOWERCASE_TAG_SPEC_MAP` (build-time Map 변환, casing 정규화) + `CONTAINER_STYLES_FALLBACK_KEYS` 10 필드 확장, (2) `applyImplicitStyles` 진입부 공통 선주입 layer 추가, (3) 기존 listbox 분기 중복 호출 제거. 이후 Phase 1-11 로 11 archetype 의 63 spec 에 layout primitive `containerStyles` 선언. `ARCHETYPE_BASE_STYLES` 테이블 유지.
- 근거: 선례 완비 — `ListBox.spec.ts:76-91` + `ListBoxItem.spec.ts:49-57` 는 이미 패턴 적용 + `resolveContainerStylesFallback` (ADR-080) 인프라가 존재 (단 listbox/4필드만). Phase 0 은 기존 인프라의 lookup 범위 확장 — 신규 API 추가 아님. ADR-063 "Spec = D3 SSOT" 정합.
- 위험:
  - 기술: **LOW-MED** — Phase 0 consumer 일반화 + 기존 하드코딩 분기와의 우선순위 검증 (parentStyle 우선 구조 이용 — 이미 ListBox 가 동일 패턴에서 회귀 0)
  - 성능: **LOW** — runtime 변화 미미, TAG_SPEC_MAP lookup 1회 추가
  - 유지보수: **LOW** — 63 spec 에 4-8줄씩 추가
  - 마이그레이션: **MEDIUM** — 63 spec 순차 수정 + Phase 별 회귀 테스트

### 대안 B: archetype table 완전 삭제 (전체 속성 리프팅 + schema 확장)

- 설명: `ContainerStylesSchema` 확장 (10+ 필드) + `emitContainerStyles` 확장 + Generator base 로직 재작성 + 65 spec 전부 리프팅 + consumer 일반화.
- 위험: 기술 **HIGH** (schema + emit + Generator 전면 수정) / 성능 LOW / 유지보수 MED (schema 표면적 증가) / 마이그레이션 **HIGH** (얽힌 revert)

### 대안 C: Read-through 전면화 (archetype table 을 3 consumer 공유)

- 설명: `ARCHETYPE_BASE_STYLES` 를 `packages/specs/src/renderers/` 에서 export → Skia/Panel 이 직접 참조.
- 위험: 기술 MED (consumer 배선) / 성능 LOW / **유지보수 MED** (hidden-default 영구 고착) / 마이그레이션 LOW

### 대안 D: Status Quo + InlineAlert 하드코딩 패턴 확장

- 설명: 문제 발견 시 `containerTag === "..."` 분기 하드코딩 추가. archetype drift 는 수동 fix.
- 위험: 기술 LOW / 성능 LOW / **유지보수 HIGH** — 하드코딩 파편화 영구화, 63 spec 재발 구조적 불가피 / 마이그레이션 LOW

### Risk Threshold Check

| 대안                 |   기술   | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| -------------------- | :------: | :--: | :------: | :----------: | :--------: |
| A (Phase 0 + 리프팅) | LOW-MED  | LOW  |   LOW    |    MEDIUM    |     0      |
| B (완전 삭제)        | **HIGH** | LOW  |   MED    |   **HIGH**   |     2      |
| C (Read-through)     |   MED    | LOW  |   MED    |     LOW      |     0      |
| D (Status Quo)       |   LOW    | LOW  | **HIGH** |     LOW      |     1      |

**루프 판정**:

- B HIGH 2 (schema 확장 + 얽힌 마이그레이션) — 별도 ADR 로 분리
- D HIGH 1 (하드코딩 파편화 영구화) — Codex/사용자 공통 기각
- A / C HIGH 0. A 가 SSOT 원칙 정합 우월 (Spec 소유), C 는 hidden-default 고착

## Decision

**대안 A (Phase 0 Skia consumer 일반화 + Phase 1-11 spec 리프팅)** 를 선택한다.

선택 근거:

1. **Phase 0 이 본 ADR 의 필수 인프라**: Codex Round 3 HIGH 지적에서 확증. `CONTAINER_STYLES_SPEC_MAP` 이 listbox 단일 + 4 필드만 지원 → spec 에 아무리 리프팅해도 Skia 가 읽지 않으면 revision 2 전체가 무효. Phase 0 으로 TAG_SPEC_MAP 기반 일반화 + 8 필드 확장 후 Phase 1-11 이 의미 발생.
2. **선례 + 인프라 완비**: `ListBox.spec + ListBoxItem.spec` 2 spec 이 layout primitive 리프팅 패턴 land. `resolveContainerStylesFallback` (ADR-080) 은 **범위만 축소된 동일 인프라** — Phase 0 은 lookup 범위 확장이지 신규 API 아님. parentStyle 우선 패턴이 기존 하드코딩 분기와 자연 호환.
3. **Scope 최소**: InlineAlert 유형 drift 의 근본 원인은 **layout primitive 3 consumer 비대칭**. 색상·간격·box-sizing 등은 CSS cascade 로 이미 대칭. scope 를 layout primitive + consumer 일반화 에 한정해도 체감 버그 구조적 소멸.
4. **잔존 위험 수용 근거**: A 의 MEDIUM (마이그레이션) 은 Phase 별 독립 커밋 + diff 수동 검토 + factory 감사 + `tokenConsumerDrift` snap 재실행으로 완화. Phase 실패 시 해당 Phase revert.

기각 사유:

- **대안 B 기각**: HIGH 2 (기술 + 마이그레이션). schema 확장 규모는 별도 ADR
- **대안 C 기각**: hidden-default 영구 고착. Spec 작성자가 `archetype="alert"` 만 보고 layout 특성 추론 불가 → ADR-063 정신과 상충. 선례(ListBox/ListBoxItem) 의 Spec 소유 방향과도 충돌
- **대안 D 기각**: 하드코딩 파편화 영구화

> 구현 상세: [083-archetype-base-styles-lifting-breakdown.md](../../adr/design/083-archetype-base-styles-lifting-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                                    | 심각도 | 대응                                                                                                                                                                                                                                                                           |
| :-: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R0  | **Phase 0 공통 선주입 layer 가 기존 `containerTag === "..."` 하드코딩 분기와 우선순위 충돌** — 직접 할당 패턴 (예: `gridlistitem`/`listboxitem` 에서 `display: "flex"` 직접 대입, `??` 없음) 에서 spec fallback 이 덮임 |  MED   | Phase 0 착수 시 하드코딩 분기 전수 감사 (grep `containerTag === "` → 태그별 할당 패턴 분류). `parentStyle.X ?? "값"` 패턴 = 자연 호환. 직접 할당 패턴 = `?? parentStyle.X` 도입 또는 분기 제거 (R8 후속). 수정 불가 태그는 whitelist 임시 제외 (spec 리프팅 scope 에서도 제외) |
| R1  | Phase 중 Generated CSS cascade 결과 변화 (double-emit 이지만 specificity/순서 차이)                                                                                                                                     |  MED   | 각 Phase 별 Generated CSS diff 수동 검토 + `archetypeCssParity.test.ts` 신설 (drift 감지)                                                                                                                                                                                      |
| R2  | 65 spec 대량 수정에서 일부 spec 이 archetype base 를 이미 override 중일 때 merge 실수                                                                                                                                   |  MED   | Phase 별 진입 전 해당 archetype 소속 spec 의 기존 `containerStyles` 감사. 기존 필드 우선                                                                                                                                                                                       |
| R3  | ADR-082 Hard Constraint "Spec 내용 불변" 의 명시적 해제로 ADR-082 검증 base 가 흔들림                                                                                                                                   |  LOW   | ADR-082 P5 (Chrome MCP) 를 본 ADR land 후로 재일정. ADR-082 본문에 Hard Constraint 수정 Addendum 추가                                                                                                                                                                          |
| R4  | `simple` archetype 26 spec 대량 batch 수정에서 개별 spec 특이사항 놓침                                                                                                                                                  |  LOW   | `simple` 을 마지막 Phase 로 배치. 이전 Phase 패턴 안정화 후 batch script                                                                                                                                                                                                       |
| R5  | Factory 중복 주입 재발 — ADR-079 P3 계약(factory `display/flexDirection/gap/padding` 제거) 위반 잠재                                                                                                                    |  MED   | 각 Phase 통과 조건에 factory `createDefault*Props` 감사 + `implicitStyles` drift test 재실행                                                                                                                                                                                   |
| R6  | Preview/Publish 경로 (`packages/shared/src/components/styles/generated/*.css`) 의 cascade 결과 변화 감지 누락                                                                                                           |  LOW   | G3 Chrome MCP 샘플링을 Builder Skia + Preview DOM + Publish DOM 3경로 비교                                                                                                                                                                                                     |
| R7  | 비-layout 속성 (box-sizing/cursor 등) 은 archetype table 단독 소유 유지 → systemic drift "절반 해결" 상태 장기화                                                                                                        |  LOW   | 본 ADR scope 외. 필요성 명확해지면 후속 ADR (schema 확장)                                                                                                                                                                                                                      |
| R8  | 기존 `containerTag === "..."` 하드코딩 분기 (InlineAlert/gridlistitem/listboxitem/tabs/toolbar 등) 가 Phase 0 이후에도 잔존 — 2차 소스 파편화 지속                                                                      |  LOW   | 본 ADR scope 외. 후속 ADR (하드코딩 분기 해체) 에서 각 태그의 spec containerStyles 가 충분 공급되는지 검증 후 제거                                                                                                                                                             |

잔존 HIGH 위험 없음.

## Gates

| Gate | 시점                   | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 실패 시 대안                                   |
| :--: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
|  G0  | **Phase 0 완료**       | (a) `LOWERCASE_TAG_SPEC_MAP` build-time Map 구축 (TAG_SPEC_MAP PascalCase → lowercase casing 정규화) + `CONTAINER_STYLES_FALLBACK_KEYS` 10 필드 확장. (b) `applyImplicitStyles` 진입부 공통 선주입 layer 추가 + 기존 `implicitStyles.ts:716` listbox 중복 호출 제거. (c) 하드코딩 분기 전수 감사 — `parentStyle.X ?? ...` 자연 호환 / 직접 할당 패턴 분류 + 처리 (수정/whitelist 결정, R0). (d) Chrome MCP: ListBox 외 최소 1 태그 에서 spec 값 Skia 반영 확증 + 기존 리프팅된 ListBoxItem 이 일반화 경로로 반영되는지 실측 (직접 할당 분기 정리 효과). (e) `pnpm type-check` 3/3 + builder vitest 회귀 0. (f) `resolveContainerStylesFallback.test.ts` + `tokenConsumerDrift.test.ts` snap update (10 필드 확장으로 불가피, 의도된 변화만) | Phase 0 revert, scope whitelist 축소 후 재진입 |
|  G1  | Phase 1 (alert) 완료   | (a) InlineAlert/IllustratedMessage Generated CSS diff "실질 변화 없음". (b) Chrome MCP InlineAlert 시각 Skia = CSS = Panel 3경로 정합. (c) `pnpm build:specs` stale 없음. (d) alert factory 중복 주입 감사 (R5). (e) **ADR-082 본문 Hard Constraint 해제 Addendum 작성 (R3)**                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Phase 1 revert + Phase 0 로직 재검토           |
|  G2  | Phase 2–5 각각 완료    | (a) Generated CSS diff "실질 변화 없음". (b) `resolveLayoutSpecPreset` 단위 테스트 PASS + `pnpm type-check` 3/3. (c) factory 중복 주입 감사 (R5). (d) ADR-081 `tokenConsumerDrift.test.ts` snap 재실행                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 해당 Phase revert                              |
|  G3  | Phase 6–10 완료        | (a) `archetypeCssParity.test.ts` 전체 archetype coverage PASS. (b) Chrome MCP 샘플링 4 archetype 이상 × Builder Skia + Preview DOM + Publish DOM 3경로 정합 (R6). (c) factory 감사 누적 + snap 절차 유지                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | drift 발견 archetype revert                    |
|  G4  | Phase 11 (simple) 완료 | 26 spec 전체 Generated CSS diff + Chrome MCP 대표 5 spec × 3경로 정합 + builder vitest 회귀 0 + factory 감사 완료                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | batch script 오류 시 개별 spec 수동 검토       |
|  G5  | 최종 검증              | 11 archetype 모든 layout primitive 가 해당 spec `containerStyles` 에 선언된 상태 확인 (`archetypeCssParity.test.ts` 전체 PASS). `ARCHETYPE_BASE_STYLES` 테이블은 **유지** (layout primitive 는 double-emit 상태). Generated CSS 전체 diff = Phase 11 종료 시점과 동일                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | drift 발견 시 해당 archetype 수정 재실행       |

## Consequences

### Positive

- **Phase 0 이후**: 기존 리프팅된 ListBox + ListBoxItem 이 즉시 Skia 소비 경로 확장 (기존 listbox only → 일반화)
- **63 spec × 3 consumer (CSS/Skia/Panel) 의 layout primitive 정합성 복원** — drift 가 layout 범위에서 구조적으로 불가능
- **ADR-063 D3 SSOT 원칙 layout 범위 충실** — Spec 이 layout 소유자
- **ADR-078 Phase 5 / ADR-079 P1 / ADR-080 패턴 통합 확장** — 부분 적용 상태 통일
- **`archetypeCssParity.test.ts` 신설 + ADR-081 drift 인프라 활용 극대화**
- **ADR-082 P5 Chrome MCP 검증 정확도 향상**
- **향후 하드코딩 분기 해체의 선행 조건 확보** (R8 후속 ADR)

### Negative

- **Phase 0 = 기존 인프라 (`resolveContainerStylesFallback`) 범위 확장 — 회귀 감사 비용**
- **63 spec 에 `containerStyles` 필드 추가/확장 = diff 체감 크기 증가** — Phase 별 독립 커밋 분산
- **ADR-082 Hard Constraint "Spec 내용 불변" 명시적 해제** — Addendum 필요
- **`ARCHETYPE_BASE_STYLES` 테이블 유지 → layout primitive double-emit 상태** — 가독성 저하. 후속 ADR 에서 완전 삭제 추진 가능
- **비-layout 속성 (box-sizing/cursor 등) + 하드코딩 분기는 archetype table/분기 소유 유지** — systemic drift 의 "부분 해결" 상태. 필요성 명확해지면 별도 ADR
- **Phase 분리에 따른 중간 상태 기간 증가** — 수 주 지속 가능
