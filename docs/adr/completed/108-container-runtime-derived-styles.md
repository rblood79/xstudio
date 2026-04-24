# ADR-108: `containerVariants` consumer 확장 — Spec runtime variant 의 Canvas/Panel 소비 일원화

> 부제: `CompositionSpec.containerVariants` (기존 ADR-036 Phase 3a 자산) 를 CSSGenerator 단독 소비 → Canvas/Panel 까지 확장 + Spec registry `@composition/specs` 통합. 이전 round 1-2 의 "신규 `derivedContainerStyles` 함수 도입" 안은 Codex 리뷰 r1 으로 기각, r3 (scope/alias/예외) + r4 (G4/P5 시퀀싱 + registry 카운트) 6 이슈 반영.

## Status

Implemented — 2026-04-23 (round 5.5 — ADR-108 scope 완료: `containerVariants` helper + registry 통합 + Panel 소비 + TagGroup/TextArea P5 + legacy side-label helper 제거. P6 orientation 은 follow-up ADR scope, TagGroup `skipCSSGeneration:true` 는 ADR-106-b / ADR-059 Tier 3 예외로 유지)

## Context

composition 은 [ssot-hierarchy.md](../../../.claude/rules/ssot-hierarchy.md) 3-domain 분할 중 **D3(시각 스타일)** 에서 Spec 을 SSOT 로 삼는다. 그러나 **`labelPosition` 등 runtime prop 에 따라 결정되는 containerStyles** 는 현재 3 consumer 가 각자 해석하는 SSOT 공백이 존재한다.

진단 대상: **TextField** (대표 예 — ADR 착수 시점의 12 spec 동일 패턴)

| Consumer                          | 착수 시점 구현                                                                                                       | 근거 라인                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Preview CSS / Publish             | Spec `composition.containerVariants` 데이터 → `CSSGenerator` 가 generated CSS 산출                                   | `packages/specs/src/components/TextField.spec.ts:308`, `packages/specs/src/renderers/CSSGenerator.ts:1147` |
| Skia / Layout (implicitStyles.ts) | `resolveLabelFlexDir` + `applySideLabelChildStyles` 함수로 동일 규칙 **중복 구현** (containerVariants 데이터 미참조) | `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:281, 368, 1240`                |
| Style Panel (useLayoutValues)     | `spec.containerStyles.flexDirection` (부재) → `firstDefined(..., "row")` 하드코드 (containerVariants 데이터 미참조)  | `apps/builder/src/builder/panels/styles/hooks/useLayoutValues.ts:41-45`                                    |

**Panel 버그 노출**: TextField 의 `containerVariants["label-position"].side` 는 `display: "grid"` 등을 표현하나 Panel `useLayoutValues` 는 이를 읽지 못해 `labelPosition` 변경에도 Direction 필드가 무관하게 표시.

### Codex 리뷰 (2026-04-23) 발견 — 핵심 가정 두 가지 깨짐

1. **`containerVariants` 가 이미 존재** — `CompositionSpec.containerVariants` (`packages/specs/src/types/spec.types.ts:498`, ADR-036 Phase 3a / ADR-059 v2 Pre-Phase 0-D.3 도입) 가 이미 runtime variant 데이터 + nested selector 표현. 16 spec 사용 중 (CheckboxGroup / ColorField / ComboBox / DateField / DatePicker / DateRangePicker / Form / Meter / NumberField / ProgressBar / RadioGroup / SearchField / **Select** / TextField / TimeField / Toolbar). **신규 함수 (`derivedContainerStyles`) 도입은 기존 메커니즘과 중복**.
2. **Spec registry 도 packages/specs 에 이미 존재** — `packages/specs/src/runtime/tagToElement.ts:125` 의 `BASE_TAG_SPEC_MAP` (**99 entries** — Codex r4 정정) + `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts:115` 의 `BASE_TAG_SPEC_MAP` (108 entries). **두 registry 가 이미 공존 = SSOT 위반 상태**. 실제 차이 항목 = builder-only **11** + specs-only **2** (총 13). Phase 0 는 mechanical 이관이 아닌 **중복 통합 + alias 분류 정책 결정**.

### 영향 범위 — 16 컨테이너 (Codex r3 정정: TextArea / Select / TagGroup 분류 수정 + ToggleButton → ToggleButtonGroup)

| 카테고리                                              | 컨테이너                                                                                                                                                       | 비고                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| labelPosition + containerVariants **둘 다 보유** (12) | TextField / NumberField / SearchField / DateField / TimeField / DatePicker / DateRangePicker / ColorField / ComboBox / **Select** / CheckboxGroup / RadioGroup | 본 ADR P2-P3 핵심 scope. Select 의 `containerVariants["label-position"].side` (`Select.spec.ts:353`) + generated CSS (`Select.css:279`) 확증.                                        |
| labelPosition 보유 + containerVariants **미보유** (2) | **TagGroup** (`skipCSSGeneration: true`, 수동 CSS 사용) / **TextArea** (`skipCSSGeneration: false` 기본)                                                       | P5 에서 containerVariants 신규 추가. TagGroup 은 Preview 수동 CSS 동기화 정책 별도 (R9 / Decision #10).                                                                              |
| orientation runtime variant (4)                       | CheckboxGroup / RadioGroup / **ToggleButtonGroup** / Toolbar                                                                                                   | CheckboxGroup/RadioGroup 위와 중복. 신규 2 (**ToggleButtonGroup**, Toolbar) 는 P6 follow-up ADR. ToggleButton 은 `_groupPosition.orientation` (parent injection) 만 읽음 — scope 외. |
| **합계 unique**                                       | **16**                                                                                                                                                         |                                                                                                                                                                                      |

`implicitStyles.ts` 착수 시점 영향:

- `resolveLabelFlexDir` (`L281-288`) — 12 컨테이너 호출
- `applySideLabelChildStyles` (`L368`) — 4 호출 site (`L993, L1051, L1241, L1660`) — Label/FieldError/Description/wrapper 자식 props 직접 조작
- ComboBox/Select/SearchField 통합 분기 (`L945`) — 3 컨테이너 공유
- TagGroup 분기 (`L541-556`) — 1 컨테이너

### 두 Registry 차이 (Audit 결과 — Codex r4 카운트 재정정)

| 위치                                                                  | entries | 비고                                                                                                                       |
| --------------------------------------------------------------------- | ------: | -------------------------------------------------------------------------------------------------------------------------- |
| `packages/specs/src/runtime/tagToElement.ts:125`                      |  **99** | spec 정본 (SelectTrigger / SelectValue / SelectIcon / DateInput **이미 등록 — r3 의 alias 분류에서 잘못 포함되었던 항목**) |
| `apps/builder/src/builder/workspace/canvas/sprites/tagSpecMap.ts:115` |     108 | spec + builder-only **11** 추가                                                                                            |

**실제 13 차이 항목 분류 (11 builder-only + 2 specs-only — Codex r4 정정):**

- **A. 진짜 builder UI 전용 alias (8)** — packages/specs 부재, builder 만 보유. 정본 spec 의 별칭 또는 composition 고유 wrapper element:
  - ComboBoxWrapper (→ SelectTriggerSpec) / ComboBoxInput (→ SelectValueSpec) / ComboBoxTrigger (→ SelectIconSpec)
  - SearchFieldWrapper (→ SelectTriggerSpec) / SearchInput (→ SelectValueSpec) / SearchIcon (→ SelectIconSpec) / SearchClearButton (→ SelectIconSpec)
  - TabBar
  - → `apps/builder/.../sprites/builderAliasMap.ts` 분리 대상.
- **B. packages/specs export 인데 runtime registry 등록 누락 (3)** — `packages/specs/src/index.ts` export 는 있으나 `tagToElement.ts:125` BASE_TAG_SPEC_MAP 등록만 빠짐:
  - **IllustratedMessage** (`packages/specs/src/index.ts:575`)
  - **CardView** (`packages/specs/src/index.ts:580`)
  - **TableView** (`packages/specs/src/index.ts:584`)
  - → P0 에서 정본 registry 등록 (99 → 102).
- **C. packages/specs 만 보유 (2)** — DisclosureHeader / Section. builder 측 stale 가능성 또는 의도적 제외. → P0 에서 사유 audit 후 builderAliasMap 추가 또는 정본 유지 결정.

**최종 목표 상태**: packages/specs 정본 = 99 + 3 (B 등록) = **102 entries**. builder alias layer = **8** (A only). C 는 audit 결과에 따라 별도 처리 (builderAliasMap +0 or +2).

**Hard Constraints**:

1. **Canvas FPS 60fps 유지** — `resolveContainerVariants` 호출은 element tree traversal 당 1회. per-frame 호출 금지.
2. **Skia ↔ Preview 시각 대칭 보존** — `/cross-check` 통과 필수. 동일 `containerVariants` 데이터 → 동일 시각 결과.
3. **ADR-059 수동 CSS 해체 방향 역행 금지** — generated CSS 경로 보존.
4. **Panel flexDirection 정합 복구** — `labelPosition` 변경 시 Direction 필드가 실제 렌더와 일치.
5. **Spec "pure data" 원칙 유지** — 신규 함수 필드 도입 0. `containerVariants` 데이터 + consumer-side 해석 헬퍼만 추가.
6. **D3 Spec SSOT 100% packages/specs 귀속** — registry 통합 + consumer 헬퍼 모두 `@composition/specs` 소유.

**Soft Constraints**:

- CSS selector → Canvas element tag 매칭은 mini-matcher 필요 (`> .react-aria-Label` → `child.tag === "Label"` 등). composition 의 RAC class naming convention 의존.
- Builder alias **8개** (ComboBoxWrapper 등 — Codex r4 정정) 는 `apps/builder` UI 전용 element — packages/specs 에 들이지 않음 (UI 레이어 책임).
- ADR-094 `expandChildSpecs` 는 packages/specs 의 BASE_TAG_SPEC_MAP 와 builder alias layer 모두에 적용되어야 함.

## Alternatives Considered

### 대안 A: `containerVariants` consumer 확장 (재설계 채택)

- **설명**:
  - **스키마 확장 0** — 기존 `CompositionSpec.containerVariants` 사용. 신규 함수 필드 (`derivedContainerStyles`) 도입 안 함.
  - 공용 helper `resolveContainerVariants(spec, props): { styles, nested[] }` 를 `@composition/specs` 에 신설. CSSGenerator (`renderers/CSSGenerator.ts:1147`) 의 기존 소비 로직을 reusable 함수로 추출.
  - Canvas (`implicitStyles.ts`): helper 호출 → `.styles` 를 parentStyle 머지 + `.nested[]` selector 매칭으로 자식 element props 주입 → `applySideLabelChildStyles` / `resolveLabelFlexDir` 대체.
  - Panel (`useLayoutValues` / `specPresetResolver`): helper 호출 → `.styles.flexDirection` 등 `LayoutSpecPreset` 채움.
  - Phase 0: 두 `BASE_TAG_SPEC_MAP` 통합 — packages/specs 정본 **99 entries** 를 source of truth 로, builder 의 **8 진짜 alias** 는 `@composition/specs` re-export + alias layer (`apps/builder/.../sprites/builderAliasMap.ts`) 로 분리. 추가로 정본 spec 등록 누락 3 (IllustratedMessage / CardView / TableView) 을 packages/specs 에 등록 (99 → 102).
- **근거**: Spec 데이터는 이미 SSOT 위치에 존재 (16 spec 사용중). 부족한 것은 **소비 경로** — Canvas/Panel 이 미소비. CSSGenerator 가 이미 소비 중이므로 helper 추출 + 2 추가 consumer = 최소 변경 + 최대 SSOT 효과.
- **위험**:
  - 기술: M — selector mini-matcher 설계 (`> .react-aria-X` → `child.tag === "X"` 매핑). Builder alias 정책 결정.
  - 성능: L — helper 호출 1회/element. CSSGenerator 의 기존 Object.entries 순회 패턴 재사용.
  - 유지보수: L — Spec 단일 데이터, consumer 3개 (CSS/Canvas/Panel) 가 동일 source. 함수 중복 0.
  - 마이그레이션: M — 13 컨테이너 implicitStyles 분기 + 12 spec 의 containerVariants audit + TagGroup 신규 추가. props 스키마 불변.

### 대안 B: 신규 함수 `derivedContainerStyles` 도입 (이전 round 1-2 안 — 기각)

- **설명**: `ComponentSpec<P>.derivedContainerStyles?: (ctx) => Partial<ContainerStyles>` 함수 필드 신설.
- **근거 (당시)**: Spec 이 runtime prop styles 표현 못한다는 가정.
- **기각 사유 (Codex 리뷰 verified)**:
  - `containerVariants` 가 이미 동일 메커니즘 — 함수 신설은 **SSOT 중복 정의**, 본 ADR 자체가 SSOT 위반.
  - 함수형은 자식 styling (`Label.width`, `FieldError.marginLeft` 등) 표현 어려움 — `containerVariants.nested` 는 selector 로 자연 표현.
  - Spec "pure data" 원칙 재정의 필요 — 데이터 접근법은 원칙 유지.

### 대안 C: DSL `@when` rule

- **설명**: 기존 ADR-108 r1-r2 와 동일.
- **기각 사유**: 현재 직렬화/introspection/비개발자 편집 요구 부재 → YAGNI. 또한 `containerVariants` 가 이미 데이터 + selector 양쪽을 표현 → DSL 도입 불필요.

### 대안 D: Panel-only 픽스

- **설명**: `useLayoutValues` 에서 `labelPosition` prop 직접 해석.
- **기각 사유**: D3 SSOT 4 consumer 고착화. Canvas 의 `resolveLabelFlexDir` 중복 유지 → 근본 해결 아님.

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 |                   HIGH+ 개수                    |
| ---- | :--: | :--: | :------: | :----------: | :---------------------------------------------: |
| A    |  M   |  L   |    L     |      M       |                        0                        |
| B    |  M   |  L   |    M     |      M       | 0 (단, **SSOT 중복 정의 자체가 ADR 무효 사유**) |
| C    |  M   |  M   |    H     |      M       |                        1                        |
| D    |  L   |  L   |    H     |      L       |                        1                        |

**루프 판정**: A 채택. B 는 위험 수치는 낮으나 **본 ADR 의 목적 (SSOT 복구) 을 ADR 자체가 위반** → 무효. C/D HIGH 존재.

## Decision

**대안 A: `containerVariants` consumer 확장 + Registry 통합**을 선택한다.

핵심 결정 사항:

1. **스키마 확장 0** — 기존 `CompositionSpec.containerVariants` 활용. 신규 함수 필드 도입 안 함.
2. **공용 helper `resolveContainerVariants(spec, props): { styles, nested[] }`** 를 `@composition/specs/renderers/` 에 신설. CSSGenerator 의 기존 소비 로직을 reusable 함수로 추출하여 3 consumer 공유.
3. **Selector mini-matcher** 신설 — `> .react-aria-Label`, `> :not(.react-aria-Label)`, `.react-aria-Input` 등 RAC class naming → element tag 매칭. composition 의 컨벤션 의존.
4. **Phase 0 Registry 통합** (Codex r4 카운트 재정정): `packages/specs/.../tagToElement.ts:125` 의 `BASE_TAG_SPEC_MAP` (**99 entries — 실제 카운트**) 를 정본으로, 13 차이 항목 (builder-only 11 + specs-only 2) 을 **3 분류**로 처리:
   - **(B) 정본 spec 등록 누락 3** (IllustratedMessage / CardView / TableView) — packages/specs runtime registry 에 등록 추가 → **99 → 102**
   - **(A) 진짜 builder UI alias 8** (ComboBoxWrapper / ComboBoxInput / ComboBoxTrigger / SearchFieldWrapper / SearchInput / SearchIcon / SearchClearButton / TabBar) — `apps/builder/.../sprites/builderAliasMap.ts` 분리
   - **(C) packages/specs 만 보유 2** (DisclosureHeader / Section) — sweep audit 후 builderAliasMap 추가 또는 정본 유지 결정
   - ADR-094 `expandChildSpecs` 양 layer 적용
5. **머지 순서**: `containerStyles` (static) < `resolveContainerVariants(spec, props).styles` (variant) < `element.props.style` (user — 최우선).
6. **자식 element props 주입**: `nested[].selector` 매칭된 자식의 props.style 에 `nested[].styles` 머지. user 명시 props 우선.
7. **Preview (CSS/React) 경로 무변경** — CSSGenerator 가 이미 동일 데이터 소비 중. 자동 정합. **단 TagGroup 예외 — 결정 #10 참조**.
8. **Style Panel (`useLayoutValues`)**: `resolveContainerVariants` 호출 후 `.styles` 에서 layout-relevant 키 추출 → `LayoutSpecPreset` 채움.
9. **P5 컨테이너 — TagGroup + TextArea (Codex r3 정정)**: TextArea 도 착수 시점에는 containerVariants 미보유 — TagGroup 과 동일 카테고리. 둘 다 P5 에서 신규 containerVariants 추가 완료.
10. **TagGroup Preview 수동 CSS 동기화 정책 (예외 명시)**: TagGroup 은 `skipCSSGeneration: true` (`TagGroup.spec.ts:72`) — Preview 가 수동 CSS (`packages/shared/src/components/styles/TagGroup.css:1`) 사용. P5 에서 spec 에 containerVariants 를 추가해도 **Preview 는 그 데이터를 직접 읽지 않음** — "3 consumer 동일 source" 주장의 **명시적 예외**. TagGroup 의 Canvas/Panel 은 helper 소비 (2 consumer 정합), Preview 수동 CSS 와 spec containerVariants 는 **수동 mirror 동기화** (CSS 파일 수정 시 spec 도 동시 갱신). 이 예외는 "곧 해체할 후속 트랙"이 아니라 **ADR-106-b 에서 정당화된 `skipCSSGeneration` 유지 판정**이며, ADR-059 completed breakdown 에서도 **Tier 3 예외**로 확정됐다. TextArea 는 `skipCSSGeneration: false` 기본 — generated CSS 자동 정합 (예외 아님).
11. **P6 follow-up scope 정정 (Codex r3)**: orientation runtime 분기는 **ToggleButtonGroup** (`packages/specs/src/components/ToggleButtonGroup.spec.ts:25`) 와 Toolbar. ToggleButton 은 `_groupPosition.orientation` (parent injection) 만 읽음 — scope 외.

선택 근거:

1. **HIGH+ 위험 0 + ADR 자체가 SSOT 위반 아님** — 4 대안 중 A 만 본 ADR 의 목적과 일치.
2. **CSS↔Canvas↔Panel 시각 정합 자동 보장** — 동일 데이터 소스 → 결과 drift 불가능. `/cross-check` 통과 자연스러움.
3. **Spec "pure data" 원칙 유지** — ADR 본문 원칙 재정의 부담 0.
4. **자식 styling 자연 표현** — `nested[]` selector → Canvas element tree 매칭. ADR-108 r2 의 `derivedContainerStyles` scope 외 gap 자동 해결.
5. **Phase 5 follow-up ADR (CSSGenerator AST emit) 자체 소멸** — CSS 가 이미 데이터 소비 중이므로 추가 ADR 불필요. Debt 조기 청산.

기각 사유:

- **대안 B 기각**: SSOT 중복 정의 (containerVariants 와 derivedContainerStyles 가 동일 책임). ADR 자체가 본문 원칙 위반.
- **대안 C 기각**: 기존 `containerVariants` 가 이미 데이터 + selector 표현. DSL 추가 불필요.
- **대안 D 기각**: D3 SSOT 4 consumer 고착화, ADR-063 3-domain 분할 역행.

> 구현 상세: [108-container-runtime-derived-styles-breakdown.md](../design/108-container-runtime-derived-styles-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                                       | 심각도 | 대응                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Selector mini-matcher 표현력 한계 — `containerVariants.nested[].selector` 가 단순 RAC class naming (`> .react-aria-X`) 외 복잡한 selector (pseudo-class, attr selector 등) 사용                                            |  HIGH  | P1 진입 전 16 spec 의 `containerVariants.nested[].selector` 전수 audit. 지원 selector 문법 명문화 (whitelist). 미지원 selector 사용 spec 은 P3 sweep 시 명시적 deferred 분류. CSSGenerator 와의 호환 표 작성.                                                                                                               |
| R2  | Builder alias (**8개 진짜 alias** — ComboBoxWrapper 등) 의 `containerVariants` 정책 결정 — alias 가 정본 spec 의 variant 를 그대로 소비할지, alias 자체에 별도 variant 정의할지                                            |  MED   | Phase 0 alias 정책 결정 단계에 포함. 현재 builder alias 들이 variant 보유 여부 grep audit (`grep "containerVariants" apps/builder`) — 아마 0 (CSS 미생성). 결정: alias 는 정본 spec 의 variant 를 share (다중 lookup 로직).                                                                                                 |
| R3  | Registry 통합 시 13 차이 항목 분류 정확성 — Codex r4 정정: **8 진짜 alias** + 3 정본 spec 등록 누락 (IllustratedMessage/CardView/TableView) + 2 stale 후보 (DisclosureHeader/Section). 목표: 99 → 102 정본 + 8 alias layer |  MED   | Phase 0 사전 audit: (a) 3 누락 spec 을 packages/specs `BASE_TAG_SPEC_MAP` 에 등록 추가 (99→102) (b) 8 alias → 정본 spec 매핑 (ComboBoxWrapper → SelectTriggerSpec 등) 문서화 (c) DisclosureHeader/Section 사유 확인.                                                                                                        |
| R4  | Canvas 자식 element props 주입 시 user-edit override 보존 — `nested[].styles` 가 user 명시 props 를 덮어쓰면 안 됨                                                                                                         |  MED   | helper 머지 순서 명문화: `child.props.style = { ...nestedMatch.styles, ...userStyle }`. user 명시 키는 항상 최우선. P2 체크리스트에 user-override 회귀 테스트 포함.                                                                                                                                                         |
| R5  | Panel 4 section hook (Transform/Appearance/Typography/Layout) 의 `useElementStyleContext` 확장 영향 — `props` 추가 노출 시 다른 hook 회귀 가능                                                                             |  MED   | P3 종료 시 4 hook 전수 type-check + Chrome MCP 회귀 sweep. `useShallow` (zustand v5+) 로 props 참조 안정성 확보. Zustand 실 버전 확증 P3 착수 전 required.                                                                                                                                                                  |
| R6  | TagGroup / TextArea 의 `containerVariants` 신규 추가 (P5) — TagGroup `skipCSSGeneration: true`, TextArea `false`. 신규 variant 데이터 추가 시 helper 가 정확히 소비                                                        |  LOW   | helper 는 CSS emit 여부와 무관 (data-only consumption). P5 단위 테스트로 확증. TextArea 는 generated CSS 자동 정합, TagGroup 은 R9 별도 처리.                                                                                                                                                                               |
| R7  | 16 spec 의 기존 `containerVariants` 가 정확한지 audit 필요 — CSSGenerator 만 검증해온 데이터가 Canvas 에서도 동일 시각 결과 산출하는지 확신 부재                                                                           |  MED   | P1-P2 진입 전 16 spec audit: 각 variant 의 styles + nested 가 ADR-108 r4 의 머지 모델로 시각 정합 가능한지 확인. 불일치 발견 시 spec 수정 (CSS↔Canvas 양쪽 정합되도록).                                                                                                                                                     |
| R8  | orientation runtime variant (**ToggleButtonGroup** / Toolbar) 는 P6 follow-up ADR 분리 — 본 ADR 의 helper 가 orientation 도 소비 가능한 일반화 설계여야 follow-up scope 자연 흡수                                          |  LOW   | helper 는 `containerVariants` 전체를 일반 처리 (특정 dataAttr 키 하드코드 안 함). orientation/quiet 등 모든 키 동일 메커니즘. ToggleButton 은 `_groupPosition.orientation` parent injection 만 사용 — scope 외.                                                                                                             |
| R9  | **TagGroup Preview 수동 CSS 동기화 부담** (Codex r3) — TagGroup `skipCSSGeneration:true` → Preview 가 spec containerVariants 데이터 미사용. P5 추가된 spec data 와 기존 수동 `TagGroup.css` 가 drift 가능                  |  MED   | P5 진입 시 `TagGroup.spec.ts containerVariants` 와 `packages/shared/src/components/styles/TagGroup.css:9-12` 양쪽 mirror 동기화 정책 문서화 (CSS 파일 수정 시 spec 동시 갱신 + review 체크리스트). 이는 예정된 해체 트랙이 아니라 ADR-106-b / ADR-059 Tier 3 예외 유지 비용이다. P5 단위 테스트로 두 정의 의도적 정합 검증. |

## Gates

| Gate | 시점                                       | 통과 조건                                                                                                                                                                                                                                                                                                 | 실패 시 대안                                                                              |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| G0   | P0 종료                                    | `pnpm type-check` 전 영역 PASS + 두 BASE_TAG_SPEC_MAP 통합 (정본 **99 + 3 누락 spec 등록 = 102**) + **8 진짜 builder alias** layer 분리 + DisclosureHeader/Section 사유 audit 완료 + ADR-094 expandChildSpecs 양 layer 적용                                                                               | Registry 13 차이 항목 분류 재검토 — 누락 spec 등록 vs alias 유지 결정                     |
| G1   | P1 종료 ✅                                 | `resolveContainerVariants` helper 구현 (2026-04-23) + selector mini-matcher whitelist 명문화 + 16 spec 의 selector 전수 audit 통과 (whitelist 8 + deferred 24, Canvas layout 주입 대상 100% 커버) + CSSGenerator 의 기존 소비 로직과 동등성 확증 (15 unit tests PASS)                                     | Helper 시그니처 또는 mini-matcher 표현력 재설계                                           |
| G2   | P2 종료 ✅                                 | TextField/TextArea 분기가 helper 소비로 전환 (2026-04-23). unit test 5 건 PASS (`textFieldImplicitStyles.test.ts` — top/side/user-override/unset/hasLabel 회귀). Chrome MCP 대칭 spot-check 는 P4 sweep 시 일괄 검증. Canvas 자식 element (Label/Input/FieldError) 주입은 `matchNestedSelector` 매칭 기반 | TextField 단독 helper 호출 패턴 재설계 — 자식 매칭 알고리즘 조정                          |
| G3   | P3 종료 ✅                                 | Panel 4 section hook (Transform/Appearance/Typography/Layout) 호환 + 12 컨테이너 (Select 포함) Panel Direction 필드 정합 표시. user-override 회귀 0. `useLayoutValues` / `useLayoutAuxiliary` / `specPresetResolver` targeted tests PASS (2026-04-23)                                                     | `useElementStyleContext` 확장 필드 설계 재검토                                            |
| G4   | P4 종료 ✅                                 | **(Codex r4 완화)** 12 기존 variant 보유 컨테이너 (TextField PoC 외 11 + Select) implicitStyles 분기 전수 제거. P5 완료 후 legacy helper 완전 제거로 흡수 (2026-04-23)                                                                                                                                    | 잔존 분기 재발굴 (orientation 등) → P4 scope 확장 또는 P6 분리                            |
| G5a  | P5 — TagGroup + TextArea spec 추가 종료 ✅ | **TagGroup + TextArea** containerVariants 추가 + Skia 렌더 회귀 0 + TagGroup `TagGroup.css` ↔ spec containerVariants mirror 동기화 문서화 (R9 대응) + TextArea generated CSS 자동 정합 확증                                                                                                               | P5 spec 정의 재설계 — TagGroup 의 manual CSS scope 보존 결정 / TextArea variant 형식 조정 |
| G5b  | P5 — TagGroup + TextArea 분기 제거 종료 ✅ | `grep -rn "resolveLabelFlexDir\|applySideLabelChildStyles" apps/builder/src/builder/workspace` → **결과 0** (TagGroup L541 + TextField/TextArea 통합 분기 L1231 제거 후 함수 정의도 삭제) — 기존 r4 G4 조건 흡수                                                                                          | TagGroup/TextArea helper 소비 패턴 재설계 — 잔존 호출 site 추가 발굴                      |

## Consequences

### Positive

- **D3 Spec SSOT 진정 달성 (TagGroup 1 예외 명시)** — 기존 `containerVariants` 데이터를 3 consumer (CSS/Canvas/Panel) 동일 helper 로 소비. 함수 중복 0, 데이터 중복 0. **단 TagGroup 은 `skipCSSGeneration:true` 로 인해 Preview 가 수동 CSS 사용 — 2 consumer 정합 + 수동 mirror 동기화** (Decision #10, R9). 이는 ADR-108 미완료가 아니라 ADR-106-b / ADR-059 Tier 3 에서 허용된 예외를 포함한 완료 상태다.
- **Spec "pure data" 원칙 유지** — 신규 함수 필드 도입 0. ADR-094/036 기조 유지.
- **CSS↔Canvas↔Panel 시각 정합 자동 보장 (TagGroup 외 15)** — 동일 source → 결과 drift 불가능.
- **자식 styling 자연 해결** — `nested[]` selector → Canvas element tree 매칭. r2 의 `derivedContainerStyles` scope gap (Codex r1 Issue 1) 해결.
- **Registry SSOT 복구** — packages/specs 정본 (**102 entries: 99 + 3 누락 spec 추가**) + builder alias layer (**8**) 분리. 의존성 방향 단방향.
- **Phase 5 follow-up ADR (CSSGenerator AST emit) 소멸** — CSSGenerator 가 이미 데이터 소비 중이므로 r2 의 P5 불필요. Debt 조기 청산.
- **implicitStyles.ts 단순화** — 12 컨테이너 분기 + `resolveLabelFlexDir` + `applySideLabelChildStyles` 함수 제거 (~50+ 줄).
- **Panel 버그 해소** — `labelPosition` 변경 시 Direction 필드 정합 표시.

### Negative

- **Selector mini-matcher 신설 부담** — `> .react-aria-X` 같은 단순 selector 만 지원하더라도 RAC class naming convention 의존성 + 16 spec audit 필요. R1 위험.
- **Builder 13 차이 항목 분류 정책 결정 부담** — Phase 0 에서 8 진짜 alias / 3 누락 spec 등록 / 2 stale 후보 audit 결정 (Codex r4 정정). ComboBoxWrapper 등 builder UI 전용 element 와 정본 spec 의 매핑 정책 문서화 필요.
- **16 spec 의 기존 `containerVariants` audit** — CSSGenerator 만 검증해온 데이터가 Canvas 에서도 정합한지 P1-P2 사이 확증 필요. 불일치 발견 시 spec 수정.
- **TagGroup Preview 수동 CSS 동기화 영구 부담 (R9)** — `skipCSSGeneration:true` 유지 동안 spec containerVariants ↔ `TagGroup.css` mirror 수동 관리. 현재 문서 체계상 이는 예정된 근시일 해체 작업이 아니라 ADR-106-b / ADR-059 Tier 3 예외 유지 비용이다.
- **2 BASE_TAG_SPEC_MAP 통합 시 회귀 위험** — 99 vs 108 entries 차이 (8 alias + 3 누락 spec + 2 stale 후보 = 13) 처리 시 import 경로 혼선 가능. G0 로 차단.
- **G4/G5 시퀀싱 분리 (Codex r4)** — 기존 G4 의 "함수 정의 grep == 0" 조건이 P5 이전에 만족 불가하여 G4 를 12 컨테이너 분기 제거로 완화 + G5b 에 함수 정의 완전 제거 흡수. P5 완료 후 legacy helper grep 0 으로 종결.
- **P5 scope 확장** — TextArea 가 P3 sweep 대상에서 P5 신규 variant 추가 대상으로 이동 (Codex r3 정정). P5 에서 TextArea spec 에 `containerVariants["label-position"].side` 신규 정의 완료.
