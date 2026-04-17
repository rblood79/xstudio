# ADR-071: Generator `containerStyles` 인프라 + Menu 정방향 복원

> **SSOT domain**: D3 (시각 스타일) — non-composite Spec이 popover/dropdown 컨테이너 시각을 Spec SSOT에 편입하는 최초 사례. CSSGenerator에 `containerStyles` top-level 필드 신설 + `{color.raised}` TokenRef 신설 + Menu container 수동 CSS(ADR-070 Addendum 1 debt) 해체. 정본: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md), 선례: [ADR-036](completed/036-spec-first-single-source.md), [ADR-059](completed/059-composite-field-skip-css-dismantle.md), [ADR-070 Addendum 1](completed/070-popover-item-css-ssot.md).

## Status

Proposed — 2026-04-17

## Context

### 발단 — ADR-070 Addendum 1 debt

ADR-070(2026-04-17 Implemented) 구현 검증 중, Preview popover 내 Menu 컨테이너(`.react-aria-Menu`)의 light/dark 팔레트가 반전(검은 배경/앱 배경 텍스트) 상태임이 지적되었다. 근본 원인은 `Menu.spec.defaultVariant = "primary"`(`{color.neutral}` = `var(--fg)`)이 `generateBaseStyles`에 의해 `.react-aria-Menu` base에 **자동 주입**되어 발생. `skipVariantCss: true`는 variants 블록 생성만 차단하고 base의 defaultVariant 주입은 막지 못함.

ADR-070 본 범위 외 조치(사용자 지시)로 Menu.css 수동 작성 + `skipCSSGeneration: true` 전환이 수행되었고, **ADR-070 Addendum 1** 에 ADR-036 / ADR-059 / ADR-063 역행 debt가 명시 기록되었다. 본 ADR은 해당 debt 청산을 목적으로 한다.

### 구조적 원인 — Menu Spec의 이원성

Menu Spec은 실제로 **2개 논리 요소**를 하나의 Spec에 담고 있다:

| 논리 요소            | Consumer                 | 시각 원천                       |
| -------------------- | ------------------------ | ------------------------------- |
| **trigger 버튼**     | Skia (render.shapes)     | `variants[defaultVariant]` 색상 |
| **popover 컨테이너** | DOM + CSS (RAC `<Menu>`) | 수동 Menu.css (debt)            |

기존 Generator는 "한 Spec = 한 consumer 정합"을 가정하여 `defaultVariant` 색상을 CSS base에 주입한다. Menu는 이 가정에 부합하지 않고 — **trigger와 popover가 서로 다른 물리 요소**이며 각각 별도 팔레트를 요구한다. `defaultVariant = "primary"`는 trigger 버튼의 Button 컴포넌트 정합을 위한 선택이며, popover 컨테이너에는 부적합.

이 이원성을 Generator 인프라에 구조적으로 수용하지 않으면 유사 debt(Popover/ListBox 등)도 반복 발생한다. 실제 조사 결과 Popover/ListBox/Menu 모두 컨테이너 시각이 Spec variants 외부(수동 CSS)에서 보정되는 D3 symmetric 위반 패턴을 공유하되, 경로는 변이체를 띤다:

- **ListBox**: `skipCSSGeneration: true` 전체 차단 경로 + 수동 CSS 전담. variants.default.background `{color.base}` 선언되나 미emit. 수동 `styles/ListBox.css` 가 `var(--bg-raised)` 사용 (ADR-059 역행 debt).
- **Menu**: `skipCSSGeneration: true` 전체 차단 경로 + 수동 CSS 전담. variants.primary.background `{color.neutral}` 선언되나 미emit. 수동 `styles/Menu.css` 가 `var(--bg-raised)` 사용 (ADR-070 Addendum 1 debt).
- **Popover**: `skipCSSGeneration` 없음 → defaultVariant `surface` = `{color.layer-2}` 선언되어 `generated/Popover.css:15` 에 `background: var(--bg-inset)` emit. 수동 `styles/Popover.css:26` 이 `var(--bg-raised)` 로 cascade override — 생성·수동 CSS 값 불일치 경로.

본 ADR 은 Menu 변이체(skipCSSGeneration 경로)에 집중하여 인프라(`containerStyles` 스키마)를 제공하며, ListBox/Popover 변이체는 해당 인프라 재사용(각각의 variants.background 교정 포함)으로 후속 ADR 에서 처리.

### Hard Constraints

1. `pnpm type-check` 3 tasks 통과.
2. `pnpm build:specs` 정상 — 현재 `generated/` 집합(Menu 미포함 91 파일) diff 0 + `generated/Menu.css` 1건 신규 추가.
3. Chrome MCP light/dark 토글: Menu popover container 시각 정합 (ADR-070 Addendum 1 이전 수동 CSS와 동등).
4. **Skia Menu trigger 시각 불변** — `variants.primary` 기반 팔레트 유지 (Button 동형 보장).
5. ADR-059 부합성 — `skipCSSGeneration: true` 신규 추가 금지, 기존 1건(Menu) 해체.
6. ADR-063 D3 symmetric 회복 범위 — Menu 한정. Popover/ListBox는 후속 ADR.

### Soft Constraints

- scope α(Menu only) — ListBox / Popover / Select / ComboBox 의 유사 debt 는 각각 후속 ADR(-B/-C)에서 처리.
- `[data-empty]` 상태 CSS 는 본 ADR 범위 외. 목록형(Menu/ListBox/Select) 공통 규칙으로 별도 수단 처리.
- `spec.composition.containerStyles`(legacy, `Record<string,string>`)는 변경하지 않음. 전수 마이그레이션은 별도 ADR.

### Primitive 확장 최소 수용 (scope 내)

수동 Menu.css 완전 재현을 위해 기존 primitive 에 누락된 1 슬롯을 본 ADR scope 에 포함 (모두 CSS 변수 레벨엔 이미 정의되어 있으나 Spec primitive 에는 누락된 항목):

- `SpacingTokens."2xs": 2` — `shared-tokens.css` 에 `--spacing-2xs: 0.125rem = 2px` 이미 존재. Spec primitive 만 누락 → 본 ADR 에서 등록하여 `{spacing.2xs}` 유효화 (`gap` 재현에 필요).

`ContainerStylesSchema` 에는 archetype base 에서 제공되지 않는 속성 1개 추가:

- `width?: string` — 수동 Menu.css 의 `width: 100%` 재현. archetype `"collection"` base 는 `display: flex; flex-direction: column; box-sizing: border-box;` 만 제공하여 width 미커버. 향후 popover-class 공통 인프라로 재사용 가능.

## Alternatives Considered

### 대안 A: Manual CSS 유지 (debt 방치)

- **설명**: ADR-070 Addendum 1의 `styles/Menu.css` 수동 파일 + `skipCSSGeneration: true` 상태 유지. "현상 유지".
- **근거**: 0 변경, 0 리스크. 즉시 안정.
- **위험**:
  - 기술: **LOW** — 코드 변경 0.
  - 성능: **LOW**.
  - 유지보수: **HIGH** — ADR-036/059/063 역행 debt 영구화. Popover/ListBox 유사 debt 해체 시 재사용 가능한 인프라 부재로 또 수동 CSS 누적.
  - 마이그레이션: **LOW**.

### 대안 B: Top-level `spec.containerStyles` + S3 semantic + `{color.raised}` — **선정**

- **설명**: ComponentSpec 에 optional `containerStyles` 필드(타입화된 스키마 — `background/text/border/borderWidth/borderRadius/padding/gap/maxHeight/overflow/outline/width`) 신설. `generateBaseStyles`에서 `containerStyles` 존재 시 defaultVariant 색상 주입 skip + variants 블록 skip(implicit skipVariantCss) 즉 **S3 semantic** (variants=Skia axis / containerStyles=CSS axis 독립). TokenResolver에 `"raised": "var(--bg-raised)"` 추가. `SpacingTokens` 에 `"2xs": 2` 등록 (현 primitive 누락분). Menu.spec에 containerStyles 정의 + `skipCSSGeneration: true` 제거 + 수동 Menu.css 삭제.
- **근거**: Menu의 "trigger/popover 이원성"을 Generator 인프라에 구조적으로 수용. 색상은 TokenRef 필수로 D3 SSOT 원칙 엄수. `{color.raised}`는 기존 Spec 토큰 체계(`base/layer-1/layer-2/elevated/disabled`) 와 정합. 후속 ADR(-B/-C)에 재사용.
- **위험**:
  - 기술: **LOW** — optional 필드 추가형. `emitContainerStyles` 헬퍼는 추가. 색상 미정의 spec에 대해 no-op 보장 (기존 107 CSS diff 0).
  - 성능: **LOW** — CSS 용량 근사 불변.
  - 유지보수: **LOW** — TokenRef 기반 → dark mode 자동 반전. 스키마는 타입 안전.
  - 마이그레이션: **LOW** — 3 commit 구조(P1/P2/P3) 로 git revert 용이.

### 대안 C: 기존 `spec.composition.containerStyles` 확장 (Menu를 composition으로 선언)

- **설명**: Menu.spec에 `composition: { containerStyles: { ... } }` 추가. 기존 Composite 판정 로직(`generateBaseStyles:463`) 재사용.
- **근거**: API 단일화 — 기존 필드 재사용, 신규 필드 0.
- **위험**:
  - 기술: **HIGH** — `spec.composition` 존재 시 "Composite 컨테이너"로 취급하는 기존 의미는 "자식이 색상 관리한다" 는 가정을 포함. Menu는 자식(MenuItem)이 자체 CSS(MenuItem.css)에서 색상을 관리하므로 의미는 얼핏 맞지만, composition 블록에는 `layout`/`gap`/`containerVariants` 등 Composite 전용 필드가 공존. Menu는 이것들이 불필요한데도 Composite 판정을 받아 기존 로직 분기에 혼재 → 향후 로직 변경 시 회귀 위험.
  - 성능: **LOW**.
  - 유지보수: **MEDIUM** — "composition" 의미 희석. 향후 Composite vs non-composite 판정이 모호해지고 `composition` 블록의 일부 필드만 쓰는 spec들이 생겨 일관성 저하.
  - 마이그레이션: **LOW** — 롤백 용이.

### 대안 D: Menu / MenuTrigger Spec 구조 분리 (근본)

- **설명**: `MenuSpec` 을 `MenuTriggerSpec`(Skia 단일 consumer) + `MenuPopoverSpec`(CSS 단일 consumer) 로 분리. 각 Spec이 단일 consumer SSOT 엄격. D3 symmetric 완전 회복.
- **근거**: 근본적 해결. 향후 모든 popover-class 의 정본 모델.
- **위험**:
  - 기술: **HIGH** — element tree 분리, RAC MenuTrigger/Menu 대응 관계 수정, items SSOT(ADR-068) wiring 재설계.
  - 성능: **LOW**.
  - 유지보수: **HIGH** — 2 spec 관리 부담, defaultVariant/size/propagation 등 연쇄 영향.
  - 마이그레이션: **HIGH** — ADR-068 규모 리팩토링. 기존 사용자 데이터(Menu element) 호환성 재검토 필요.

### Risk Threshold Check

| 대안 | 기술     | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | -------- | ---- | -------- | ------------ | :--------: |
| A    | LOW      | LOW  | **HIGH** | LOW          |     1      |
| B    | LOW      | LOW  | LOW      | LOW          |   **0**    |
| C    | **HIGH** | LOW  | MEDIUM   | LOW          |     1      |
| D    | **HIGH** | LOW  | **HIGH** | **HIGH**     |     3      |

루프 판정: 대안 B HIGH 0건, CRITICAL 0건 → **대안 B 채택**. 추가 루프 불필요.

## Decision

**대안 B (Top-level `spec.containerStyles` + S3 semantic + `{color.raised}` 신설)** 를 선택한다.

선택 근거:

1. **HIGH 위험 0건** — optional 필드 추가형 변경, 색상 미정의 spec에 no-op. 기존 107 CSS diff 0 보장.
2. **구조적 근본 수용** — Menu의 "variants=Skia trigger / containerStyles=CSS popover" 이원성을 Generator 인프라에 수용. ADR-070 Addendum 1 debt 의 원인이었던 "Spec과 Consumer 관계의 가정 충돌" 을 구조적으로 해소.
3. **재사용 가능 인프라** — 동일 패턴 debt(Popover/ListBox.spec의 `variants.background = {color.base}` + 수동 CSS `--bg-raised` 공유)가 이미 존재. 본 ADR 인프라로 후속 ADR-B/C 에서 재사용.
4. **D3 정본 준수** — TokenRef 필수 스키마로 dark mode 자동 반전 보장. `{color.raised}` 는 기존 Spec 토큰 체계(`base/layer-1/layer-2/elevated/disabled`) 와 시맨틱 일관.
5. **롤백 비용 LOW** — 3 commit(P1 TokenRef, P2 Generator, P3 Menu) git revert.

기각 사유:

- **대안 A 기각**: ADR-036/059/063 역행 debt 영구화 + 후속 ADR-B/C 에서 재사용 가능한 인프라 부재 → 미래 수동 CSS 누적. ADR-070 Addendum 1 이 이미 이 debt 를 "후속 ADR-071에서 해체" 전제로 기록.
- **대안 C 기각**: `spec.composition` 의 기존 의미("Composite 컨테이너 + 자식이 색상 관리 + layout/containerVariants 포함 블록") 를 Menu 같은 non-composite spec이 부분 차용하면 판정 로직이 불분명해짐. API 단일화 이득보다 의미 희석 비용이 큼.
- **대안 D 기각**: 근본이나 element tree 전면 개편 규모. 현 debt(Menu container 수동 CSS 1건) 해체에 과잉. 대안 B 인프라 정착 이후 선택적 재검토.

> 구현 상세: [071-generator-container-styles-menu-restore-breakdown.md](../design/071-generator-container-styles-menu-restore-breakdown.md)

## Gates

| Gate   | 시점            | 통과 조건                                                                                                                                                                                                                                                                                                                         | 실패 시 대안                                                                           |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **G1** | P1 + P2 완료 후 | `pnpm build:specs` 후 기존 `generated/` 집합(Menu 미포함 91 파일) diff 0 (optional 필드 no-op). `pnpm -F @composition/specs test -- CSSGenerator` 스위트 전체 통과 (per-spec snapshot 매트릭스 + animationRewrite/sizeSelectors/rootSelectors). `pnpm type-check` 3/3. `{spacing.2xs}` `resolveToken` 반환 `2`, console.warn 0건. | `emitContainerStyles` TokenRef 판정 로직 보강 / primitive 등록 누락 확인               |
| **G2** | P3 완료 후      | `generated/Menu.css` 신규 추가 — 수동 `Menu.css` 등가 (**width: 100%** + background/color/border/padding/gap/max-height/overflow/outline + data-focus-visible). 기존 집합 diff 0.                                                                                                                                                 | `ContainerStylesSchema` 에 누락 필드 추가 또는 archetype `"collection"` base 편입 검토 |
| **G3** | P3 완료 후      | Chrome MCP light/dark 토글: Menu popover container 시각 정합 — ADR-070 Addendum 1 이전 수동 CSS 시각과 동등.                                                                                                                                                                                                                      | 토큰 재조정 (예: borderRadius TokenRef → CSS 값)                                       |
| **G4** | P3 완료 후      | Skia Menu trigger 시각 불변 — `variants.primary` 기반 팔레트 유지. ADR-070 Addendum 1 이전 Skia 스냅샷과 동등.                                                                                                                                                                                                                    | render.shapes의 variants 참조 경로 재확인                                              |

잔존 HIGH 위험 없음 — 본 ADR은 ADR-070 Addendum 1 debt 한정 청산.

## Residual Risks (의식적 수용 대상)

ADR 승인 시 다음 잔존 위험을 **명시적으로 수용**한다. 모두 LOW~MEDIUM 수준이며, 본 ADR scope α 준수를 위해 후속 처리로 분리.

| 위험                                                    | 심각도 | 발생 경로                                                                                                                                                     | 처리 계획                                                                                                            |
| ------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **`[data-empty]` 상태 미구현**                          |  LOW   | 현 수동 Menu.css 에 `[data-empty]` 규칙(이탈릭/fg-muted)이 있으나 `ContainerStylesSchema` 에 state 셀렉터 경로 없음                                           | 목록형(Menu/ListBox/Select) 공통 CSS 규칙으로 이관 — 본 ADR 범위 외 별도 수단                                        |
| **legacy `spec.composition.containerStyles` 이름 중복** | MEDIUM | 기존 Composite 17개 spec이 `Record<string,string>` 규약 사용 중 (Form, Select, ComboBox, ToggleButtonGroup 등). 신규 top-level `containerStyles` 와 이름 유사 | 문서/주석으로 의미 분리 명시. 전수 마이그레이션은 선택적 ADR-D 로드맵                                                |
| **Popover/ListBox 유사 debt 잔존**                      | MEDIUM | ListBox: `skipCSSGeneration:true` + 수동 `--bg-raised`. Popover: generated `var(--bg-inset)` vs 수동 `var(--bg-raised)` cascade 값 불일치                     | 본 ADR 인프라 재활용으로 후속 ADR-C 에서 해체. ListBox.css 의 `[data-orientation]`/`--lb-*` 표현 한계 실측 선행 필요 |
| **`SpacingTokens."2xs"` 등록이 다른 spec 동작에 영향**  |  LOW   | Spec primitive 에 1 슬롯 추가 → 기존 spec 중 `{spacing.2xs}` 참조처 0 (grep 확증). 영향 경로는 runtime resolveToken 가능성 확장뿐                             | G1 에서 기존 generated diff 0 확증으로 회귀 검증                                                                     |
| **`ContainerStylesSchema.width` 필드 확장 리스크**      |  LOW   | optional 필드 추가. 기존 spec 미사용 → no-op. 향후 다른 non-composite spec 이 `width` 를 남용하면 archetype 의도 훼손 가능                                    | breakdown 금지 사항 (§금지 사항) 에 명시: Composite spec 에 `ComponentSpec.containerStyles` 사용 금지                |

## Consequences

### Positive

- **Menu container D3 SSOT 복원** — ADR-036 Spec-First / ADR-059 skipCSSGeneration 해체 / ADR-063 symmetric consumer 원칙 모두 정합 회복.
- **재사용 가능 인프라** — `ContainerStylesSchema` 는 후속 ADR-B(Select/ComboBox items SSOT) / ADR-C(ListBox skipCSSGeneration 해체) 에서 동일 패턴 재사용.
- **Dark mode 자동 반전** — TokenRef 경유로 `color-scheme` 전환 시 Spec → CSS 변환 층이 자동 처리.
- **`{color.raised}` 신설** — popover/dropdown 계층 시맨틱 토큰 정의. 기존 Spec 토큰 체계(`base/layer-1/layer-2/elevated/disabled`) 와 일관.
- **`SpacingTokens."2xs"` primitive 등록** — CSS 변수(`--spacing-2xs: 0.125rem = 2px`)는 이미 존재했으나 Spec primitive 만 누락 상태 해소. `resolveToken({spacing.2xs})` 정상 반환 보장.
- **`ContainerStylesSchema.width` 필드** — archetype base 에서 커버하지 못하는 container width 스타일을 스키마 내 명시 경로로 추가. popover/collection 패밀리 재사용 가능.
- **Menu Spec 이원성 구조화** — `variants`(Skia trigger) / `containerStyles`(CSS popover) 독립 축이 문서화되어 향후 dual-role spec 설계 모델로 재활용.

### Negative

- **ComponentSpec 표면 확장** — `containerStyles` 필드 추가. 기존 `spec.composition.containerStyles`(legacy) 와 이름 유사 → 문서로 의미 분리 필수.
- **[data-empty] 미구현** — 목록형 공통 CSS 규칙으로 별도 처리 예정. 본 ADR 내 CSS diff 에 `[data-empty]` 규칙 부재.
- **Popover/ListBox 유사 debt 잔존** — 동일 `variants.background = {color.base}` + 수동 CSS `--bg-raised` 패턴이 Popover.spec/ListBox.spec 에 존재. 본 ADR scope α 준수를 위해 후속 ADR 로 분리. 즉시 해체는 ADR-C 에서.
- **`spec.composition.containerStyles`(legacy) 전수 마이그레이션 미진행** — 기존 Composite spec 17개가 여전히 `Record<string,string>` 규약 사용. 별도 ADR 필요 (저우선순위 — TokenRef 미경유이나 이미 `var(--*)` 사전 변환되어 cascade 정합은 유지).

## 후속 ADR 로드맵

| ADR              | 내용                                                                                               | 본 ADR과의 관계                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **ADR-B**        | Select/ComboBox items SSOT (ADR-068 패턴 확장) + `renderMenu/CollectionRenderers` wiring 정리      | D2 축 (items). 본 ADR 과 독립. ADR-071/ADR-B 순서 교환 가능.                                             |
| **ADR-C**        | ListBoxItem.spec 신설 + ListBox `skipCSSGeneration` 해체 + Popover.spec variants.background 교정   | 본 ADR `containerStyles` 인프라 재활용. ListBox.css의 `[data-orientation]`/`--lb-*` 표현 한계 실측 필수. |
| **ADR-D (선택)** | `ComponentSpec.composition.containerStyles`(legacy) 전수 마이그레이션 → ContainerStylesSchema 통합 | 본 ADR 정착 후 선택적 리네이밍. 우선순위 낮음.                                                           |
| **ADR-E (선택)** | Menu/MenuTrigger Spec 구조 분리 — D3 symmetric 완전 회복                                           | 본 ADR 은 S3 semantic 으로 이원성 구조화. 추가 분리는 선택적.                                            |

권장 진행 순서: **본 ADR-071** → **ADR-B** → **ADR-C**. ADR-B/C 는 독립 축(D2/D3) 이므로 순서 교환 가능.
