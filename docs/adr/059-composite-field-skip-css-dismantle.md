# ADR-059: Composite Field `skipCSSGeneration` 해체 — Spec SSOT 확장

## Status

Proposed — 2026-04-11

## 원칙

본 ADR의 원칙 선언은 [ADR-057 §원칙](./057-text-spec-first-migration.md#원칙--spec-ssot--symmetric-consumers-adr-036-준수)과 [ADR-058 §원칙](./058-text-tags-legacy-dismantle.md#원칙)을 그대로 상속한다.

핵심:

- **Spec이 SSOT**, CSS/Skia는 대등한 consumer
- **ADR-059의 본질**: ADR-036 "Spec-First Single Source"가 Phase 3a에서 Composite Container 해체를 미완료로 남긴 결과, 59개 Field/Composite 컴포넌트가 `skipCSSGeneration: true` 예외 경로에 고착되었다. 본 ADR은 이 잔존 예외 경로를 해체하여 Composite 컴포넌트도 Spec SSOT로 복귀시킨다. "CSS↔Skia 맞춤"이 아니라 **"누락된 consumer 재배치"**이다.

## Context

ADR-036 Phase 4가 완료로 체크되었으나, 실제 코드베이스에는 **59개의 `skipCSSGeneration: true` 컴포넌트**가 잔존한다 (2026-04-11 실측, `packages/specs/src/components/`). ADR-057/058이 Text/Heading/Paragraph/Kbd/Code 5개를 해체하는 동안 Composite Container 계열은 손대지 못했다.

본 ADR은 이 59개 중 **Field 계열 (TextField/NumberField/SearchField/ColorField/DateField/TimeField/TextArea 7개)**을 Phase 1 시험대로 삼고, 후속 Phase에서 Select/ComboBox/DatePicker/Form 계열로 확장한다.

### 현재 예외 상태 (실측)

| 경로             | 현상태                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Spec**         | `spec.sizes.md = { height: 30, paddingX: 12, paddingY: 4, fontSize: "{typography.text-sm}" }` — Skia 전용                            |
| **CSS (수동)**   | `packages/shared/src/components/styles/TextField.css` — hand-written, spec 값과 독립                                                 |
| **composition**  | `spec.composition.delegation[i].variables.md["--tf-input-padding"] = "var(--spacing-xs) var(--spacing-md)"` — 수동 CSS 변수와 매핑용 |
| **CSSGenerator** | `if (spec.skipCSSGeneration) return null;` → 전체 생성 스킵                                                                          |

**결과**: `sizes.md.paddingX = 12`가 `--tf-input-padding: var(--spacing-xs) var(--spacing-md)` (= 8px 16px)와 **수치적으로 일치한다는 보장 없음**. 두 값이 각각 다른 파일에서 독립적으로 편집되며, 정합성은 리뷰어의 육안 검사에 의존한다.

### SSOT 위반 증거

1. **`@sync` 주석 23개** (13개 파일) — 개발자가 "반드시 동기화해야 한다"는 경고를 수동으로 적어둔 지점. 자동 검증 없음
   - `TextField.spec.ts:309` — `// @sync Button.spec.ts sizes — Input height = Button height`
   - `Select.spec.ts:305` — `// @sync BUTTON_SIZE_CONFIG (utils.ts)`
   - `ComboBox.spec.ts:265` — `// @sync Select.spec.ts sizes`
   - `NumberField.spec.ts`, `Tag.spec.ts` 등 8개 파일
2. **`resolveSpecFontSize` 129개소 분산 호출** — 각 spec의 `render.shapes()` 함수에서 개별 호출. ADR-058 Phase 1이 Text에서만 집약
3. **Composite delegation 상수 테이블** — `utils/fieldDelegation.ts`의 `FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES`가 spec.sizes 외부에 존재

### Text 케이스와의 구조적 동형성

| 축               | Text (ADR-058)                                | Composite Field (ADR-059)                      |
| ---------------- | --------------------------------------------- | ---------------------------------------------- |
| 예외 플래그      | `skipCSSGeneration: true` + `() => []` shapes | `skipCSSGeneration: true` + 정상 shapes        |
| 분산 consumer    | 5곳 (buildTextNodeData + 4 layout 유틸)       | CSS 파일 + composition.delegation + sizes      |
| 수동 동기화 흔적 | 5-point patch (`f140f173`)                    | `@sync` 주석 23개                              |
| 증상             | size prop 변경 미반영                         | paddingX 변경 시 CSS 누락 가능성               |
| 해법 방향        | 예외 경로 제거 + spec 통합                    | CSSGenerator 확장 + composition 변수 자동 생성 |

### Hard Constraints

1. **Preview DOM 구조 불변** — React Aria hooks가 생성하는 DOM tree (Label/Input/FieldError 등 중첩 구조) 보존
2. **CSS cascade 정상 동작** — `@layer components` 래핑 유지, 사용자 override 경로 불변
3. **외관 ≤1px** — 전환 전/후 screenshot diff 범위
4. **60fps 유지** — CSS 생성 규모 증가가 초기 렌더 시간에 영향 없음
5. **`@sync` 주석 완전 제거** — 제거되지 않으면 근본 해결 아님
6. **ADR-042 Spec Dimension Injection 호환** — `_containerWidth`/`_containerHeight` 주입 경로 무회귀
7. **Sectional rollback 가능** — Phase 단위 rollback 경계 명확

### Soft Constraints

- `composition.delegation` 선언 형식 유지 (제거가 아닌 auto-generation)
- ADR-056 Base Typography SSOT와 단일 주입 지점 공유
- 향후 신규 Composite 컴포넌트 추가 시 `skipCSSGeneration: true` 없이 바로 생성

## 의존성

- **ADR-036 Phase 4** (선행 완료): Tier 2 Composite CSS 생성 메타데이터 (`composition.delegation`) — 본 ADR의 시작점
- **ADR-057/058** (선행 완료): Text Spec-First 해체 패턴의 참조 모델
- **ADR-056** (병행 권장): Base Typography SSOT — Composite 해체 시 typography 주입 지점 일원화

## Alternatives Considered

### 대안 A: 현상 유지 (`skipCSSGeneration: true` 영속화)

- 설명: 59개 예외 경로 유지. 신규 Composite 컴포넌트는 동일 패턴으로 추가
- 근거: 최소 변경, 회귀 위험 제로
- 위험:
  - 기술: L — 변경 없음
  - 성능: L
  - 유지보수: **H** — `@sync` 주석 23개 영속화, CSS↔spec 수동 검증 부담 증가, Composite가 SSOT 외부 영구 고립
  - 마이그레이션: L

### 대안 B: 일괄 전환 (59개 동시 해체)

- 설명: 단일 Phase에서 59개 컴포넌트 `skipCSSGeneration: false` 전환 + CSSGenerator 확장
- 근거: 작업 기간 단축, 패턴 일관성
- 위험:
  - 기술: **H** — Composite 59개 동시 회귀 가능, rollback 단위 거대
  - 성능: M — CSS 번들 크기 급증 가능성 (측정 전 불명확)
  - 유지보수: L
  - 마이그레이션: **H** — 실패 시 전체 롤백

### 대안 C: CSSGenerator 확장 + Archetype 별 점진 전환 (본 제안)

- 설명:
  1. CSSGenerator를 확장하여 `composition.delegation.variables`를 `spec.sizes` 값에서 자동 생성
  2. Field 계열 7개를 Phase 1 시험대로 전환
  3. Select/ComboBox 2개 Phase 2
  4. DatePicker/DateRangePicker/TimePicker Phase 3
  5. 잔존 Composite (Form/Menu/Dialog/Modal/Tabs 등) Phase 4
- 근거:
  - Field 7개는 구조가 가장 단순 (`flex-column` + 단일 Input delegate)
  - CSSGenerator 확장이 선행되면 후속 Phase는 flag 전환 + 수동 CSS 삭제로 축소
  - Phase 경계 rollback 가능
- 위험:
  - 기술: M — CSSGenerator 확장 시 기존 53개 simple 컴포넌트 회귀 가능성
  - 성능: L — 번들 크기는 증분 측정 가능
  - 유지보수: L
  - 마이그레이션: M — Phase 경계 명확

### 대안 D: `skipCSSGeneration: true` 유지 + 검증 도구만 추가

- 설명: CSSGenerator는 손대지 않고, build-time lint 도구가 `spec.sizes`와 수동 CSS 파일의 수치 불일치를 감지
- 근거: 롤백 안전성, 기존 구조 보존
- 위험:
  - 기술: M — CSS 파일 파싱 복잡도 (CSS custom property 해석)
  - 성능: L
  - 유지보수: **M** — SSOT가 여전히 두 곳(spec + CSS), 검증만 자동화
  - 마이그레이션: L

### 대안 E: 수동 CSS 파일 완전 삭제 + Spec만 유지

- 설명: `TextField.css` 등 수동 CSS 파일을 제거하고 CSSGenerator가 100% 생성
- 근거: SSOT 단일화 극단
- 위험:
  - 기술: **H** — 수동 CSS에는 React Aria hover/focus/invalid 상태별 세부 조정이 포함됨. CSSGenerator가 이를 표현하려면 스키마 대폭 확장 필요
  - 성능: L
  - 유지보수: L
  - 마이그레이션: **CRITICAL** — 표현력 부족으로 회귀 필수

### Risk Threshold Check

| 대안                             | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| -------------------------------- | ----- | ---- | -------- | ------------ | :--------: |
| A (현상 유지)                    | L     | L    | **H**    | L            |     1      |
| B (일괄 전환)                    | **H** | M    | L        | **H**        |     2      |
| C (**CSSGenerator 확장 + 점진**) | M     | L    | L        | M            |     0      |
| D (검증 도구만)                  | M     | L    | M        | L            |     0      |
| E (수동 CSS 삭제)                | **H** | L    | L        | **CRIT**     |     2      |

루프 판정: 대안 A는 유지보수 H 1개(SSOT 위반 영속화). 대안 B/E는 2개 이상. 대안 D는 HIGH+ 없지만 SSOT 단일화 목표 미달성. 대안 C가 HIGH+ 없고 점진 검증 가능한 유일한 해법.

**선택 기준**: SSOT 단일화 + rollback 단위 최소화 + CSS 표현력 유지.

## Decision

**대안 C: CSSGenerator 확장 + Archetype 별 점진 전환**을 선택한다.

기각 사유:

- **대안 A**: `@sync` 주석 23개가 SSOT 외부 영구 고립의 증거
- **대안 B**: 59개 동시 전환은 회귀 원인 추적 불가, Phase 경계 없이 rollback 불가
- **대안 D**: 검증 도구는 SSOT 단일화가 아닌 "두 source의 일치 확인"이며, 근본 해결 아님
- **대안 E**: 수동 CSS의 React Aria 상태 조정 로직은 Spec 스키마가 표현하지 못함. 표현력 확장이 본 ADR 범위를 초과

### 실행 구조 (요약)

- **Pre-Phase 0** (모든 Phase 선행): CSSGenerator Composite 생성 엔진 확장 — `composition.delegation.variables`를 `spec.sizes` 값에서 자동 도출하는 파생 규칙 도입. 기존 simple 컴포넌트 경로 무회귀 검증
- **Phase 1** — **Field 계열 7개 해체** (TextField/NumberField/SearchField/ColorField/DateField/TimeField/TextArea) — `skipCSSGeneration: false` 전환, 수동 CSS와 자동 생성 결과 diff 0
- **Phase 2** — **Select/ComboBox 2개 해체** — Popover 자식 렌더링 경로 (ADR-047) 무회귀 필수
- **Phase 3** — **DatePicker/DateRangePicker 2개 해체** — Calendar 내부 절대 좌표 (ADR-050) 무회귀
- **Phase 4** — **잔존 Composite (~48개)** Menu/Dialog/Modal/Tabs/Form 등 — Archetype별 그룹 전환
- **Phase 5** — `@sync` 주석 완전 제거 + `utils/fieldDelegation.ts` 상수 테이블 폐지 + ADR-036 재승격

각 Phase의 작업 순서, 파일 변경 목록, 검증 체크리스트는 breakdown 문서 참조.

> 구현 상세: [059-composite-field-skip-css-dismantle-breakdown.md](../design/059-composite-field-skip-css-dismantle-breakdown.md)

## Gates

잔존 HIGH 위험: 없음. Pre-Phase 0의 CSSGenerator 확장이 기존 simple 컴포넌트에 영향을 주지 않는지가 최대 위험이며 Gate로 관리한다.

| Gate                           | 시점             | 통과 조건                                                                                                             | 실패 시 대안                 |
| ------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| CSSGenerator 확장 무회귀       | Pre-Phase 0 완료 | 기존 `skipCSSGeneration: false` 컴포넌트 (Button/Badge 등) CSS 생성 결과 byte diff 0건, Storybook screenshot diff 0건 | 확장 롤백, 설계 재검토       |
| Field 자동 생성 diff           | Phase 1 완료     | TextField 등 7개 자동 생성 CSS vs 기존 수동 CSS 시맨틱 diff 0건 (공백/순서 제외), Preview 렌더링 ≤1px                 | Phase 1 롤백, 수동 CSS 복원  |
| `@sync` 제거 (Phase 1 해당)    | Phase 1 완료     | Field 7개 spec 파일의 `@sync` 주석 grep 0건                                                                           | 주석 복원, 근본 해결 재검토  |
| Select/ComboBox Popover 무회귀 | Phase 2 완료     | ADR-047 Popover 테스트 통과, 드롭다운 표시 ≤1px                                                                       | Phase 2 롤백                 |
| DatePicker Calendar 무회귀     | Phase 3 완료     | ADR-050 overflow clipping 무회귀, Calendar 절대 좌표 ≤1px                                                             | Phase 3 롤백                 |
| 전체 `skipCSSGeneration` 제거  | Phase 4 완료     | `grep "skipCSSGeneration.*true"` 0건 (ADR-058 Phase 4 통합 시점에서의 잔존 포함)                                      | 잔존 컴포넌트 개별 재전환    |
| `@sync` 주석 완전 제거         | Phase 5 완료     | 13개 파일의 23개 `@sync` 주석 grep 0건, `utils/fieldDelegation.ts` 상수 테이블 폐지 확인                              | 주석 복원 후 원인 재조사     |
| 60fps 유지                     | 각 Phase 완료    | Canvas FPS 60, 초기 로드 <3s, 번들 <500KB                                                                             | Phase 롤백                   |
| 2-pass re-enrichment 무회귀    | 각 Phase 완료    | `processedElementsMap` 경로 (layout-engine.md) 무회귀                                                                 | layout-engine 경로 분리 유지 |

## Consequences

### Positive

- **ADR-036 Spec-First 완전 준수** — 59개 Composite가 SSOT로 복귀, ADR-036이 진정으로 Implemented 상태 달성
- **`@sync` 주석 23개 소멸** — 수동 동기화 부담 제거
- **`resolveSpecFontSize` 129개소 집약 기반** — ADR-058 Phase 1 패턴을 Composite까지 확장 가능
- **신규 Composite 추가 비용 절감** — `skipCSSGeneration: true` 플래그 없이 바로 생성, 수동 CSS 파일 불필요
- **ADR-056 시너지** — Base Typography SSOT 단일 주입 지점으로 Composite도 편입
- **CSS 변수 파생 규칙 확립** — `spec.sizes` → `--tf-input-padding` 자동 매핑 규약 정립

### Negative

- **Pre-Phase 0 선행 부담** — CSSGenerator Composite 엔진 확장이 Phase 1 진입 전 완료되어야 함
- **5 Phase coordinated 변경** — 중단 시 부분 통합 상태 유지. Phase 경계 커밋 및 rollback 가능성 확보 필수
- **수동 CSS 삭제의 점진 범위** — 완전 삭제가 아닌 "자동 생성과 동등한 부분만 삭제". React Aria 상태별 세부 조정은 수동 override 경로에 잔존 (소프트 부채)
- **검증 부담** — 각 Phase 완료 시 CSS byte-level diff + Preview screenshot diff 2중 검증 필요
- **Archetype 별 세밀한 규칙** — Field vs Overlay vs Picker 각각 composition 생성 규칙이 다름

### 후속 작업

- **`resolveSpecFontSize` 129개소 집약** — 본 ADR 완료 후 전 컴포넌트 단일 helper로 통합 (ADR-058 Phase 1 확장)
- **`utils/fieldDelegation.ts` 완전 폐지** — Phase 5
- **ADR-036 상태 재평가** — "Implemented" → "Partially Implemented" 하향 조정 후 본 ADR + ADR-058 + ADR-060/061 완료 시 재승격
- ~~**ADR-060 (Form Control Indicator)** 병행~~ — Implemented (2026-04-13)
- ~~**ADR-061 (Focus Ring 토큰화)** 병행~~ — Implemented (2026-04-13)

## 착수 가이드 (새 세션 시작 시)

본 ADR은 범위가 크고(59개 컴포넌트 + CSSGenerator 확장) 선행 설계 결정이 다수 있어, **코딩 직진 대신 선행 조사 단계**가 필수이다. ADR-060/061에서 얻은 교훈:

1. **계획 외 매직 테이블/패턴 조기 발견** — ADR-060은 계획 4개 → 실측 6개로 확장. ADR-059도 `@sync` 주석 23개가 실제 어느 파일과 동기화되는지 실측 필요
2. **공유 상수 타입 narrowing** — `DATE_PICKER_STATES` 같은 공유 states 상수는 `as const` 없으면 DTS 빌드 실패
3. **bulk 치환 효율성** — 패턴이 동일할 때 perl 스크립트로 bulk 치환이 빠름. 단, 예외 패턴(Tabs의 inset variant 등)은 개별 처리
4. **검증 2단계** — `pnpm type-check` + `pnpm build:specs` 양쪽이 다른 오류를 잡는다 (DTS 빌드는 type-check보다 엄격)

### 선행 조사 4가지 (Pre-Phase 0 진입 전)

1. **`@sync` 주석 전수 실측** — 13개 파일의 23개 주석이 각각 어떤 값과 동기화되는지 매핑
   ```
   grep -rn "@sync" packages/specs/src/components/
   ```
2. **Field 7개 composition.delegation 구조 비교** — TextField/NumberField/SearchField/ColorField/DateField/TimeField/TextArea의 delegation 배열 구조 + variables 네이밍 패턴(`--tf-*`, `--select-*` 등) 실측
3. **Pre-Phase 0 설계 결정** — breakdown이 제시한 `"auto"` 파생 규칙의 구체화. 변수 prefix 결정 방식(컴포넌트명/archetype별/명시 선언) 중 선택. `superpowers:brainstorming` 스킬 사용 권장
4. **CSS 시맨틱 diff 도구 준비** — Phase 1 Gate의 "byte diff 0건(공백/순서 제외)" 검증을 위한 diff 방법 결정. `css-diff` CLI 또는 수작업 정규화 스크립트

### 재시작 프롬프트

새 세션에서 아래 프롬프트를 그대로 사용:

```text
ADR-059 Composite Field skipCSSGeneration 해체 작업을 시작합니다.

배경: ADR-036 재승격 체인 마지막 잔존 위반. ADR-057/058/060/061 완료.
참고: docs/adr/059-composite-field-skip-css-dismantle.md + breakdown

코딩 전 선행 조사 4가지 (docs/adr/059 §착수 가이드 참조):

1. @sync 주석 전수 실측 (grep 23개소 매핑)
2. Field 7개 composition.delegation 구조 비교
3. Pre-Phase 0 설계 — "auto" 파생 규칙 (superpowers:brainstorming 사용)
4. CSS 시맨틱 diff 도구 결정

worktree 격리 필요성도 판단해주세요 (superpowers:using-git-worktrees).

4개 조사 완료 후 요약 보고 → 사용자 확인 → Pre-Phase 0 코드 수정 착수 순서로
진행합니다. MEMORY.md의 adr059-launch-plan.md에 상세 맥락이 있습니다.
```
