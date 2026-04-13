# ADR-059 Breakdown: Composite Field `skipCSSGeneration` 해체

> 상위 ADR: [059-composite-field-skip-css-dismantle.md](../adr/059-composite-field-skip-css-dismantle.md)

## 파일 인벤토리

### CSSGenerator (Pre-Phase 0 수정 대상)

| 파일                                                         | 역할                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/specs/src/runtime/CSSGenerator.ts`                 | `skipCSSGeneration` 분기, Composite 생성 로직            |
| `packages/specs/src/runtime/compositeCssGenerator.ts` (신설) | Archetype 별 composition.delegation 자동 생성 규칙       |
| `packages/specs/src/runtime/tokenResolver.ts`                | `spec.sizes` → CSS 변수 매핑 헬퍼                        |
| `packages/specs/src/types/spec.types.ts`                     | `composition.delegation.variables` 타입 `auto` 옵션 추가 |

### Phase 1 — Field 계열 7개

| Spec 파일                                           | 수동 CSS 파일                                           | `@sync` 주석 위치                   |
| --------------------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `packages/specs/src/components/TextField.spec.ts`   | `packages/shared/src/components/styles/TextField.css`   | `TextField.spec.ts:309`             |
| `packages/specs/src/components/NumberField.spec.ts` | `packages/shared/src/components/styles/NumberField.css` | `NumberField.spec.ts` (`@sync` 8개) |
| `packages/specs/src/components/SearchField.spec.ts` | `packages/shared/src/components/styles/SearchField.css` | TBD                                 |
| `packages/specs/src/components/ColorField.spec.ts`  | `packages/shared/src/components/styles/ColorField.css`  | TBD                                 |
| `packages/specs/src/components/DateField.spec.ts`   | `packages/shared/src/components/styles/DateField.css`   | TBD                                 |
| `packages/specs/src/components/TimeField.spec.ts`   | `packages/shared/src/components/styles/TimeField.css`   | TBD                                 |
| `packages/specs/src/components/TextArea.spec.ts`    | `packages/shared/src/components/styles/TextArea.css`    | TBD                                 |

### Phase 2~4 대상 (요약)

- **Phase 2**: `Select.spec.ts`, `ComboBox.spec.ts` + Popover 렌더링 경로
- **Phase 3**: `DatePicker.spec.ts`, `DateRangePicker.spec.ts`, `Calendar.spec.ts` 연동 검증
- **Phase 4**: Menu/Dialog/Modal/Tabs/Form/Toolbar/Breadcrumb/Tree/Table/Tab/Disclosure/Accordion 등 ~48개

### Phase 5 — 상수 테이블 폐지

- `apps/builder/src/builder/workspace/canvas/utils/fieldDelegation.ts` (`FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES`)

## Pre-Phase 0 작업 순서

1. **CSSGenerator 확장 스키마 설계**
   - `composition.delegation.variables.md = "auto"` 선언 시 spec.sizes에서 자동 파생
   - 파생 규칙 table (예시):
     | 시맨틱 변수 | spec.sizes 소스 |
     | ---------------------- | ---------------------------------------------------- |
     | `--tf-input-padding` | `${size.paddingY}px ${size.paddingX}px` |
     | `--tf-input-height` | `${size.height}px` |
     | `--tf-input-font-size` | `var(${resolveToken(size.fontSize)})` |
     | `--tf-input-gap` | `${size.gap}px` |
     | `--tf-input-radius` | `var(${resolveToken(size.borderRadius)})` |
2. **simple 컴포넌트 회귀 테스트** — Button/Badge/Link/Tag 등 `skipCSSGeneration: false` 컴포넌트의 CSS 생성 결과 byte diff 0건 확인
3. **Archetype 분류 확정** — Field / Overlay / Picker / Composite-Container 4가지 archetype에 대한 생성 규칙 정의
4. **단위 테스트**: `compositeCssGenerator.test.ts` 신설. 샘플 spec 주입 → 기대 CSS 문자열 비교

## Phase 1 작업 순서 (Field 계열)

### Step 1. TextField 시험대

1. `TextField.spec.ts`의 `skipCSSGeneration: true` → `false` 전환
2. `composition.delegation.variables.md = "auto"` 선언
3. `@sync` 주석 제거 (L309)
4. `pnpm build:specs` → `packages/shared/src/components/styles/generated/TextField.css` 생성 확인
5. 기존 수동 `TextField.css`와 시맨틱 diff 실행
6. 차이점 있으면 spec.sizes 값 수정 또는 파생 규칙 수정 (hand-written CSS는 수정 금지)
7. 수동 `TextField.css`를 generated 파일 import + 수동 override (React Aria 상태별) 분리 구조로 재작성
8. Preview screenshot diff (xs/sm/md/lg/xl 5사이즈 × default/hover/focus/disabled/invalid 5상태 = 25 샷)

### Step 2. NumberField/SearchField 복제

- TextField 패턴 복제. 각 컴포넌트 고유 변수 (spinner, clear button 등)는 수동 override 경로 유지

### Step 3. Color/Date/Time Field 확장

- `ColorField`, `DateField`, `TimeField` — 내부 Segment/Swatch 렌더링 경로 추가 검증
- `TextArea` — multi-line 높이 계산 경로 무회귀

### Step 4. Phase 1 Gate 검증

- 모든 7개 컴포넌트에 대해:
  - CSS byte diff 0 (시맨틱 단위)
  - Preview screenshot ≤1px
  - `@sync` 주석 0건
  - Storybook 테스트 통과
  - `pnpm type-check` 통과
  - Canvas 60fps 유지

## Phase 2~4 요약

- **Phase 2 (Select/ComboBox)**: Popover 렌더링 경로 ADR-047 무회귀. `Select.composition.delegation`은 trigger/popover/option 3개 child selector를 가지므로 archetype 규칙 확장 필요
- **Phase 3 (DatePicker/DateRangePicker)**: Calendar 절대 좌표 (ADR-050 overflow clipping) 무회귀. Popover 자식 레이아웃 제외 규칙 (canvas-rendering.md §6) 확인
- **Phase 4 (잔존 48개)**: Archetype 별 그룹 전환. 한 번에 5~8개씩 Sub-Phase

## Phase 5 — 상수 테이블 폐지 + ADR-036 재승격

1. `utils/fieldDelegation.ts`의 `FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES` 사용처 grep
2. CSS 자동 생성 결과로 치환 가능한 항목 제거
3. 파일 완전 삭제 또는 legacy export 유지 (dead code 확인 후 결정)
4. `@sync` 주석 13개 파일 전수 제거 확인
5. `docs/adr/README.md` 업데이트 — ADR-036 "Implemented" 유지 근거로 ADR-059 완료 링크 추가

## 회귀 진단 절차

### 단위 1: CSS byte diff

```bash
# 전환 전 수동 CSS 스냅샷
cp packages/shared/src/components/styles/TextField.css /tmp/TextField.css.before

# 전환 후 자동 생성 vs 수동 override 합성
cat packages/shared/src/components/styles/generated/TextField.css \
    packages/shared/src/components/styles/TextField.override.css \
    > /tmp/TextField.css.after

# 시맨틱 diff (공백/순서 정규화)
css-diff /tmp/TextField.css.before /tmp/TextField.css.after
```

### 단위 2: Preview screenshot

- Storybook + Playwright visual regression
- `xs/sm/md/lg/xl × default/hover/focus/disabled/invalid` = 25 샷
- threshold: ≤1px, ≤0.5% pixel diff

### 단위 3: Canvas rendering (Skia)

- `/cross-check` skill 실행
- spec.sizes 값 변경 없음 → Skia 무회귀

## 체크리스트 (Phase 1 완료 시)

- [ ] `TextField.spec.ts` skipCSSGeneration false
- [ ] `NumberField.spec.ts` skipCSSGeneration false
- [ ] `SearchField.spec.ts` skipCSSGeneration false
- [ ] `ColorField.spec.ts` skipCSSGeneration false
- [ ] `DateField.spec.ts` skipCSSGeneration false
- [ ] `TimeField.spec.ts` skipCSSGeneration false
- [ ] `TextArea.spec.ts` skipCSSGeneration false
- [ ] 7개 컴포넌트 `@sync` 주석 0건
- [ ] 7개 `generated/*.css` 파일 생성 확인
- [ ] CSS byte diff 0건 (시맨틱)
- [ ] Screenshot diff ≤1px × 25 샷 × 7 컴포넌트
- [ ] Storybook 전 스토리 통과
- [ ] `pnpm type-check` 통과
- [ ] Canvas 60fps 유지
- [ ] 2-pass re-enrichment 무회귀 (Label/Checkbox 내부 미재발)
- [ ] ADR-042 dimension injection 무회귀

## Pre-Phase 0-E 사전 진단 결과 (2026-04-13)

5개 Composite Field 수동 CSS 에서 `var(--{prefix}-*)` 참조를 정적 grep 하여 0-B 선언과의 정합성 매트릭스를 산출. (grep: `var\(--(tf|sf|cf|df|time-field)-[a-z-]+\)` @ `packages/shared/src/components/styles/{TextField,SearchField,ColorField,DateField,TimeField}.css`)

| Field | 0-B 선언 | 실제 CSS 소비 | Dead (선언/미소비) | Undeclared (소비/미선언) |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| TextField | tf-label-size, tf-input-{padding,size,line-height}, tf-hint-size | 동일 + tf-label-margin | 0 | `tf-label-margin` |
| SearchField | sf-label-size, sf-input-{size,line-height}, sf-hint-size | sf-label-size, sf-icon-size, sf-btn-size, sf-hint-size | **sf-input-size, sf-input-line-height** | `sf-icon-size`, `sf-btn-size` |
| ColorField | cf-label-size, cf-input-{size,line-height}, cf-hint-size | 동일 + cf-input-padding, cf-input-max-width | 0 | `cf-input-padding`, `cf-input-max-width` |
| DateField | df-label-size, df-input-{size,line-height}, df-hint-size | 동일 + df-input-padding, df-segment-size | 0 | `df-input-padding`, `df-segment-size` |
| **TimeField** | **time-field-\* (label/input/hint)** | **tf-\* (!!) — TextField prefix 재사용 중** | **time-field-\* 3개 전부 dead** | `tf-segment-size` (TextField 에도 없음) |

### 블로커 (Phase 1 진입 전 해제 필수)

1. **TimeField.css `tf-*` prefix 충돌** (CRITICAL)
   - 증상: TimeField 전용 CSS 가 TextField 네임스페이스를 공유 — TextField 의 size variant override 가 TimeField 로 의도치 않게 누출
   - 영향: 0-B 의 `time-field-*` 선언은 현재 전부 dead code
   - 조치: TimeField.css 의 모든 `--tf-*` → `--time-field-*` 로 리네이밍 후 hand-written CSS 단독 회귀 확인 (CSS-only diff, Skia 영향 없음)
   - 주의: 공통 `tf-segment-size` 는 어디에도 선언 없는 dangling — 제거 또는 selector 기반 대체

2. **SearchField 0-B 선언 오류** (HIGH)
   - 증상: 선언된 `sf-input-size`, `sf-input-line-height` 는 CSS 어디에도 참조 없음. 실제 CSS 는 `sf-icon-size`, `sf-btn-size` 참조
   - 조치: 0-B SearchField composition.delegation 수정 — input-size/line-height 제거, icon/btn delegation 신설 (또는 size-level 변수로 재정렬)

3. **auto 5변수 외 추가 변수 다수** (MEDIUM)
   - 소비 중인 수동 변수: `-label-margin` (TF), `-icon-size` (SF), `-btn-size` (SF), `-max-width` (CF), `-segment-size` (DF)
   - auto 파생 표준 5변수만으로는 현재 hand-written CSS 대체 불가 → Phase 1 는 **hybrid** 방식 필수
     - `variables: "auto"` : 표준 5변수
     - `variables: { md: { "--{prefix}-icon-size": ... } }` 형태로 추가 선언 병기 (type-system 변경 없음, 기존 union 그대로 수용)
   - 또는 auto 확장 v2: `variables: { mode: "auto", extra: { ... } }` — 타입 변경 필요. 현 단계는 hybrid 선호

### 블로커 해제 작업 순서 (0-F 제안)

| # | 작업 | 리스크 |
| --- | ------------------------------------------- | ---- |
| 0-F.1 | TimeField.css `tf-*` → `time-field-*` 리네이밍 | LOW (CSS-only, Preview 회귀 테스트 가능) |
| 0-F.2 | SearchField 0-B 선언 수정 (icon/btn 포함) | LOW (선언만, skipCSSGeneration:true 유지 → 출력 0) |
| 0-F.3 | breakdown 문서의 Phase 1 체크리스트에 "auto + hybrid extra" 설계 반영 | LOW (문서만) |

### 검증 방법

- 블로커 3개 해제 후 동일 grep 재실행 → dead/undeclared 항목 0 목표
- `build:specs` → validator R1/R2/R3 통과 (현재도 통과 — validator 는 CSS 미스캔)
- 제안: validator 에 R4 추가 고려 — "prefix 선언됐으나 `packages/shared/src/components/styles/` 에서 미참조 시 경고"

## Phase 1 Step 1 시험대 결과 (2026-04-13)

TextField.spec.ts `skipCSSGeneration: true → false` 1회 실행 후 `generated/TextField.css` 출력 비교. Step 1 진입 **불가** 판정. 아래 구조적 블로커 3종 선행 필요.

### Gap 매트릭스 (generated vs manual TextField.css)

| 항목 | Generated (Spec 기반) | Manual TextField.css | 판정 |
| --- | --- | --- | --- |
| base layout | `align-items: flex-start` + `box-sizing` | `width: fit-content` + 없음 | Spec에 fit-content 누락 |
| `data-label-position="side"` | 없음 | grid override 블록 | Spec 미표현 |
| variants | Spec variant(accent/neutral/purple/negative/positive) 색상 미생성 | `secondary/tertiary/error/filled` (다른 이름) | 양쪽 엉킴 — dead code |
| size xs | Spec sizes 미선언 | CSS에 존재 | Spec 누락 |
| size xl delegation | Spec delegation 미선언 | CSS에 존재 | Spec delegation 누락 |
| `--tf-label-margin` base default | delegation에만 | base level md 기본 | generated 미생성 |
| `--tf-input-padding` base default | delegation에만 | base level md 기본 | generated 미생성 |
| Input state 셀렉터 | 없음 | hover/focus/invalid/disabled border | Spec StateEffect 계약 부재 |
| `[data-variant="filled"] .react-aria-Input` | 없음 | 복합 블록 | filled가 Spec variant에 부재 |
| `[slot="description"]` hint | 없음 | `--tf-hint-size` consumer | Spec description 계약 부재 |
| bridge 변수 (`--label-font-size` ← `--tf-label-size`) | 없음 | Label/Input/Description 다리 | CSSGenerator 미지원 |
| focus-visible outline | `--focus-ring-width` (ADR-061 토큰) | Input 직접 `outline: 2px solid var(--accent)` | 정책 불일치 |

### 3대 구조적 블로커

1. **Variant 네이밍 완전 불일치 (CRITICAL, 독립 프로덕션 버그)**
   - Spec: `accent/neutral/purple/negative/positive` (5)
   - CSS: `primary/secondary/tertiary/error/filled` (5)
   - Spec이 emit하는 `data-variant` 값과 CSS selector 값이 완전 불일치 → CSS variant 블록 전체가 dead code
   - ADR-059와 독립. **Pre-Phase 0-G 대상**.

2. **Size 도메인 3중 불일치 (HIGH)**
   - Spec sizes: `sm/md/lg/xl` (4)
   - Spec delegation variables: `xs/sm/md/lg` (4, xs 있고 xl 없음)
   - CSS: `xs/sm/md/lg/xl` (5)
   - **Pre-Phase 0-H 대상**.

3. **State/Composition 계약 부재 (MEDIUM)**
   - DelegationSpec이 변수 발행만 지원 — state selector, base default, bridge 변수, filled variant 특별처리 미지원
   - CSSGenerator 확장 필요 — **Phase 1 Step 2 설계 대상**

### 블로커 해제 순서 (Pre-Phase 0-G/0-H)

| Step | 작업 | 리스크 | 비고 |
| --- | --- | --- | --- |
| 0-G | Variant 네이밍 정렬 — CSS dead block 제거 + Spec(accent/neutral/purple/negative/positive) 기준 CSS 재작성 | MEDIUM | filled는 Spec variant로 승격 후보 |
| 0-H | Size 도메인 정렬 — Spec sizes에 xs 추가, delegation variables에 xl 추가 | LOW | 3중 도메인 일치 |
| 0-I | Step 1 재실행 — 의미 있는 generated vs manual 비교 | — | 0-G/0-H 이후 |

### 판정

Phase 1 Step 1은 "시험대 = 데이터 수집" 단계로 종료. `skipCSSGeneration: true` revert 후 증거는 본 섹션에 보존. 0-G부터 순차 착수.

## 롤백 전략

- Phase 1 실패 시: 전환된 컴포넌트의 `skipCSSGeneration: true` 복원, 수동 CSS 복원, `@sync` 주석 복원
- Pre-Phase 0 실패 시: CSSGenerator 확장 revert, Phase 1 차단
- Phase 5 실패 시: `utils/fieldDelegation.ts` 복원
