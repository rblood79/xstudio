# ADR-059 v2 Breakdown: Composite Field CSS SSOT 확립 — 대칭 파이프라인 복귀

> 상위 ADR: [059-composite-field-skip-css-dismantle.md](../adr/059-composite-field-skip-css-dismantle.md) (v2, 2026-04-13)
>
> **v1→v2 변경**: 2층 구조(generated + 수동 override) 기각, 수동 CSS 완전 삭제 + spec.states 확장 결정. byte diff Gate 폐기, `/cross-check` 대칭 검증으로 대체

## 전제: 선행 조사 실측 결과

| Field       | skipCSSGeneration | delegation | prefix      | 비고                           |
| ----------- | :---------------: | :--------: | ----------- | ------------------------------ |
| TextField   |       true        |    3개     | `--tf-*`    | Phase 1 시험대 적격            |
| NumberField |       true        |    4개     | `--nf-*`    | ComboBox 복제 (Phase 2로 이동) |
| SearchField |       true        |  ❌ 부재   | `--sf-*`    | delegation 신설 필요           |
| ColorField  |       true        |  ❌ 부재   | `--cf-*`    | delegation 신설 필요           |
| DateField   |       true        |  ❌ 부재   | `--df-*`    | delegation 신설 필요           |
| TimeField   |       true        |  ❌ 부재   | `--tf-*`    | 🚨 TextField와 prefix 충돌     |
| TextArea    |     **false**     |  ❌ 부재   | `--label-*` | 일관성 위반                    |

`@sync` 23건 / 13파일 중 Field 계열 9건(TextField 1 + NumberField 8). 나머지 14건은 Phase 2~4 범위.

## 파일 인벤토리

### CSSGenerator (Pre-Phase 0-D 수정 대상)

| 파일                                                                  | 역할                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/specs/src/renderers/CSSGenerator.ts`                        | `skipCSSGeneration` 분기, `generateCompositionCSS` 확장 지점 |
| `packages/specs/src/types/spec.types.ts`                              | `CompositionSpec.delegation` 타입 확장 (prefix 필드 추가)    |
| `packages/specs/src/renderers/utils/tokenResolver.ts`                 | `spec.sizes.*` → CSS 변수 값 파생 헬퍼                       |
| `packages/specs/src/renderers/utils/stateCSSGenerator.ts` (신설 가능) | `spec.states` → 상태별 CSS 블록 생성                         |

### Phase 1 — TextField 시험대

| 파일                                                  | 작업                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/specs/src/components/TextField.spec.ts`     | `skipCSSGeneration: false`, `delegation.prefix` 선언, `@sync` 주석 제거 |
| `packages/shared/src/components/styles/TextField.css` | **삭제**                                                                |
| `packages/shared/src/components/styles/index.css`     | TextField.css import 제거                                               |

### Phase 1.5 — SearchField/ColorField/DateField/TimeField/TextArea

각 컴포넌트 spec 수정 + 수동 CSS 파일 삭제 + import 제거.  
**TimeField는 Pre-Phase 0-A에서 prefix 리네임 선행** (예: `--tf-*` → `--time-*`).

### Phase 2 — Select/ComboBox/NumberField

Popover 렌더링 경로(ADR-047) 무회귀 필수. NumberField의 ComboBox 의존성 해소 시점.

### Phase 3 — DatePicker/DateRangePicker

Calendar 내부 절대 좌표 (ADR-050 overflow clipping) 무회귀.

### Phase 4 — 잔존 Composite (~48개)

Archetype 단위 그룹 전환 (Menu/Dialog/Modal/Tabs/Form/Toolbar/Tree/Table 등). 5~8개씩 sub-phase.

### Phase 5 — 상수 테이블 폐지 + 재승격

- `apps/builder/src/builder/workspace/canvas/utils/fieldDelegation.ts` — `FIELD_TRIGGER_VARIABLES`, `FIELD_AUTO_HEIGHT_VARIABLES` 폐지
- `docs/adr/README.md` — ADR-036 "Fully Implemented" 재승격 표기

---

## Pre-Phase 0-A — Naming SSOT

### 목적

CSS 변수 prefix를 spec 내부 선언으로 흡수. 비-spec 네이밍(ad-hoc prefix) 제거, prefix 충돌 구조적 불가능화.

### 작업

1. **타입 확장** — `DelegationSpec`에 `prefix: string` 필드 추가:
   ```ts
   export interface DelegationSpec {
     childSelector: string;
     prefix: string; // 신설 — "text-field-input" 등 명시
     variables: Record<SizeName, Record<string, string>>;
   }
   ```
2. **기존 prefix spec 내부 확정** — TextField/NumberField의 현 prefix(`--tf-*`, `--nf-*`)를 `composition.delegation[i].prefix`로 선언
3. **TimeField prefix 충돌 제거** — `--tf-*` → 선택(`--time-field-*` 권장, 축약 금지). 수동 CSS 파일 내 기존 `--tf-*` 참조 0건 검증
4. **lint 규칙 신설** (선택) — 동일 prefix 재사용 빌드 실패

### 통과 조건

- `grep "composition.delegation" packages/specs/src/components/` 결과 중 prefix 미선언 0
- TimeField `--tf-*` 참조 0
- `pnpm type-check` / `pnpm build:specs` 통과

### 롤백

타입 필드 optional 유지하여 기존 delegation 구조 호환. 실패 시 필드 제거만으로 복원.

---

## Pre-Phase 0-B — Delegation 완전성

### 목적

SearchField/ColorField/DateField/TimeField 4개에 `composition.delegation` 신설. TextArea 일관성 회복. CSS consumer 구조 100% spec 선언.

### 작업

1. 각 Field의 수동 CSS 파일 실측 → 필요 selector 추출 (Label/Input/Button/FieldError 등)
2. `composition.delegation` 배열 신설, 각 selector당 prefix + size variants 선언
3. TextArea는 `skipCSSGeneration: true`로 통일 (Phase 1.5에서 해체)

### 통과 조건

- 4개 Field 모두 delegation 배열 존재
- 수동 CSS에서 관찰된 selector와 delegation 선언 selector 집합 일치
- `pnpm type-check` 통과

### 롤백

delegation 제거만으로 복원 (CSSGenerator 미확장 상태이므로 CSS 출력 영향 없음).

---

## Pre-Phase 0-C — 공유 SSOT 승격 + 복제 관계 명시

### 목적

`BUTTON_SIZE_CONFIG` 등 암묵 공유 SSOT를 명시화. NumberField ↔ ComboBox 복제 관계를 Phase 순서에 반영.

### 작업

1. **BUTTON_SIZE_CONFIG 실측** — 7개 `@sync` 참조 점 확인 (TextField/Select/SelectTrigger/Input/Panel/Tag/Tabs)
2. **공유 토큰/spec 참조 결정** — 옵션:
   - (a) `packages/specs/src/shared/buttonSize.ts`로 명시 export, 참조 spec이 `import`
   - (b) Button spec의 `sizes`를 직접 참조 가능한 헬퍼 (`referenceSize(ButtonSpec, sizeName)`) 도입
3. `@sync` 주석 7건 제거, import/참조로 대체
4. **NumberField ↔ ComboBox 복제 관계 명시** — NumberField spec 파일 상단 JSDoc에 "ComboBox delegation 패턴 재사용, Phase 2 선행 필요" 명시. Phase 1 범위에서 제외

### 통과 조건

- `grep "BUTTON_SIZE_CONFIG" packages/specs/src/components/` 참조 명시 import로 전환
- `@sync.*BUTTON_SIZE_CONFIG` 주석 0
- NumberField spec에 Phase 2 선행 의존성 JSDoc 명시

### 롤백

공유 토큰 파일 제거 + 개별 spec 재복제. 위험 작음(정적 상수).

---

## Pre-Phase 0-D — States + Auto-derivation

### 목적

CSSGenerator 확장: `spec.sizes` + `spec.states` + `delegation.prefix` 3개 축에서 CSS 100% 생성. 수동 CSS 표현력 완전 흡수.

### 작업

1. **auto-derivation 규칙** — `delegation.variables.md = "auto"` 선언 시 spec.sizes에서 자동 파생:

   | 변수 (예: prefix="text-field-input") | 파생 규칙                                 |
   | ------------------------------------ | ----------------------------------------- |
   | `--text-field-input-padding`         | `${size.paddingY}px ${size.paddingX}px`   |
   | `--text-field-input-height`          | `${size.height}px`                        |
   | `--text-field-input-font-size`       | `var(${resolveToken(size.fontSize)})`     |
   | `--text-field-input-radius`          | `var(${resolveToken(size.borderRadius)})` |
   | `--text-field-input-gap`             | `${size.gap}px`                           |

2. **States 확장** — `spec.states.hover/focused/disabled/invalid` CSS 블록 자동 생성 (ADR-061 focusRing 패턴 일반화):
   ```css
   .react-aria-TextField[data-hovered] {
     /* states.hover */
   }
   .react-aria-TextField[data-focus-visible] {
     /* states.focused */
   }
   .react-aria-TextField[data-invalid] {
     /* states.invalid */
   }
   ```
3. **기존 simple 컴포넌트 무회귀** — Button/Badge/Link/Tag 등 `skipCSSGeneration: false` 53개 CSS 생성 byte diff 0 확인
4. **단위 테스트** — `compositeCssGenerator.test.ts`: 샘플 spec → 기대 CSS 문자열

### 통과 조건

- 기존 53개 simple 컴포넌트 `generated/*.css` byte diff 0
- 단위 테스트 통과
- `pnpm build:specs` 통과 (DTS 포함)

### 롤백

CSSGenerator 확장 revert. Phase 1 진입 차단.

---

## Phase 1 — TextField 시험대

### 목적

Pre-Phase 0 성과의 실증. 1개 컴포넌트를 **수동 CSS 파일 삭제 + `/cross-check` 대칭 검증**까지 완주.

### 작업

1. `TextField.spec.ts` — `skipCSSGeneration: false`
2. `composition.delegation[i].variables = "auto"` 전환
3. `@sync` 주석 제거 (L309)
4. `pnpm build:specs` → `packages/shared/src/components/styles/generated/TextField.css` 생성
5. **수동 `TextField.css` 삭제**
6. `styles/index.css` import 갱신
7. Preview 렌더링 및 Builder Canvas 시각 확인 (xs/sm/md/lg/xl × default/hover/focus/disabled/invalid)
8. `/cross-check` skill 실행 — Preview ↔ Builder 시각 일치 확인

### 통과 조건

- `packages/shared/src/components/styles/TextField.css` 파일 존재 안 함
- `grep "@sync" packages/specs/src/components/TextField.spec.ts` = 0
- `/cross-check` 통과
- Storybook 전 스토리 렌더링 확인 (수동)
- 60fps / 번들 <500KB / type-check 통과

### 롤백

- spec `skipCSSGeneration: true` 복원
- TextField.css 복원 (git)
- @sync 주석 복원

---

## Phase 1.5 — SearchField/ColorField/DateField/TimeField/TextArea

TextField 패턴 적용. 각 컴포넌트별 sub-step:

1. spec의 `delegation.variables = "auto"` 전환
2. 수동 CSS 삭제
3. `/cross-check`
4. Storybook 수동 확인

**주의**: TimeField는 Pre-Phase 0-A에서 prefix 리네임 선행 완료되어야 함.

### 통과 조건

- 5개 컴포넌트 수동 CSS 파일 0
- Field 계열 `@sync` 주석 0 (NumberField 제외)
- `/cross-check` 통과
- 60fps / 번들 / type-check 통과

---

## Phase 2 — Select/ComboBox/NumberField

### 추가 고려사항

- **Popover 렌더링 경로 (ADR-047)** — Select/ComboBox 드롭다운 표시 무회귀
- **NumberField ↔ ComboBox** — ComboBox 해체 완료 후 NumberField의 복제 delegation 을 ComboBox 참조로 변환 가능성 평가
- Archetype 규칙 확장 — trigger/popover/option 3개 child selector

### 통과 조건

- 3개 컴포넌트 수동 CSS 0, `@sync` 0
- Popover 드롭다운 시각 일치
- `/cross-check` 통과

---

## Phase 3 — DatePicker/DateRangePicker

### 추가 고려사항

- Calendar 내부 절대 좌표 (ADR-050 overflow clipping)
- Popover 자식 레이아웃 제외 규칙 (canvas-rendering.md §6)
- DATE_PICKER_STATES 공유 상수 `as const` narrowing (ADR-061 학습)

---

## Phase 4 — 잔존 Composite ~48개

Archetype 그룹화 (5~8개씩 sub-phase):

- Menu/MenuItem/MenuTrigger
- Dialog/Modal/Popover
- Tabs/Tab/TabList/TabPanel
- Form/Fieldset
- Toolbar/ToolbarItem
- Breadcrumb/BreadcrumbItem
- Tree/TreeItem
- Table/TableHeader/TableBody/TableRow/Cell
- Disclosure/Accordion

각 그룹별 완료 시 `/cross-check` + 60fps + 번들 Gate.

---

## Phase 5 — 최종 검증 + 재승격

### 작업

1. `grep -rn "skipCSSGeneration.*true" packages/specs/src/components/` = 0
2. `grep -rn "@sync" packages/specs/src/components/` = 0
3. `utils/fieldDelegation.ts` — `FIELD_TRIGGER_VARIABLES`/`FIELD_AUTO_HEIGHT_VARIABLES` 사용처 grep, 미사용 확인 후 파일 삭제
4. `docs/adr/README.md` — ADR-036 "Implemented" → "Fully Implemented" 재승격. ADR-059 Implemented 표기
5. ADR-059 Status → Implemented

### 통과 조건

- 위 grep 3건 모두 0
- `utils/fieldDelegation.ts` 파일 존재 안 함
- Canvas 60fps / 번들 <500KB 최종
- `/cross-check` 전 Composite 통과

---

## 회귀 진단 절차 (v2)

### 검증 원칙

v1의 "기존 수동 CSS ↔ generated CSS byte diff 0" Gate는 **폐기**. 기존 수동 CSS는 오염된 consumer 상태이며 reference 자격 없음.

### 단위 1: CSS 생성 무회귀 (Pre-Phase 0-D만)

기존 `skipCSSGeneration: false` simple 컴포넌트 53개의 generated CSS가 확장 전/후 동일. byte diff 도구는 이 단일 목적에만 사용.

### 단위 2: 대칭 파이프라인 검증 (`/cross-check`)

- Preview (DOM+CSS) 렌더링 캡처
- Builder Canvas (Skia) 렌더링 캡처
- 두 결과가 시각 일치 (≤1px 허용)
- 동일 spec 소스에서 두 consumer가 동일 결과 산출

### 단위 3: SSOT 순도 정량 Gate

- `grep "skipCSSGeneration.*true"` 카운트
- `grep "@sync"` 카운트
- 수동 CSS 파일 잔존 카운트

---

## 체크리스트 (최종 완료 시)

### Pre-Phase 0

- [ ] 0-A: delegation.prefix 타입 확장, 기존 Field prefix 선언, TimeField 충돌 제거
- [ ] 0-B: 4개 Field delegation 신설 + TextArea 일관성 회복
- [ ] 0-C: BUTTON_SIZE_CONFIG 명시화, NumberField Phase 2 의존성 기술
- [ ] 0-D: CSSGenerator 확장 (states + auto), simple 컴포넌트 53개 byte diff 0

### Phase 1~5

- [ ] Phase 1: TextField 수동 CSS 삭제, `/cross-check` 통과
- [ ] Phase 1.5: 5개 Field 해체 완료
- [ ] Phase 2: Select/ComboBox/NumberField 해체, Popover 무회귀
- [ ] Phase 3: DatePicker/DateRangePicker 해체, Calendar 무회귀
- [ ] Phase 4: 잔존 48개 Archetype 그룹 전환
- [ ] Phase 5: `@sync` 0건, skipCSSGeneration 0건, fieldDelegation.ts 폐지, ADR-036 재승격

### 원칙 준수 검증

- [ ] 수동 CSS 파일 0 (대상 Composite 범위)
- [ ] `/cross-check` 대칭 검증 통과
- [ ] v1 "byte diff Gate" 미사용 (대칭 원리 위반 방지)

---

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

### Phase 단위 rollback

- 대상: 1개 Phase 분 spec 변경 + 삭제된 수동 CSS 파일 복원
- 방법: git revert (Phase 커밋 단위 분리 필수)

### Pre-Phase 0 실패

- 0-A~0-C 실패: 각 단계 revert 가능. 타입 확장 optional이므로 breaking 없음
- 0-D 실패 (CSSGenerator 확장 회귀): 확장 revert. Phase 1 진입 차단

### 최종 재승격 실패

- Phase 5 grep 0건 불충족 시: 개별 잔존 컴포넌트 해체로 분할
