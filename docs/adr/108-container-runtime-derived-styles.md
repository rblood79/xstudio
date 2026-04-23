# ADR-108: Spec `derivedContainerStyles` for props-derived container layout

> 부제: 컨테이너 Runtime-Derived 스타일 Spec SSOT — `labelPosition` 등 runtime prop 기반 containerStyles 의 Spec 단일 정본화 + Spec registry/fallback resolver 의 `@composition/specs` 귀속

## Status

Proposed — 2026-04-23 (round 2 — review-adr 1차 반영)

## Context

composition 은 [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md) 3-domain 분할 중 **D3(시각 스타일)** 에서 Spec 을 SSOT 로 삼는다. 그러나 **runtime prop 에 따라 결정되는 containerStyles** (예: `labelPosition="side"` 일 때 flexDirection 이 row, 그 외 column) 는 현재 Spec 이 표현할 수 없어 **3 consumer 가 각자 해석**하는 SSOT 공백이 존재한다.

진단 대상: **TagGroup**

| Consumer                          | 현재 구현                                                                         | 근거 라인                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Preview CSS                       | `.react-aria-TagGroup[data-label-position="side"]` data-attr selector             | `packages/shared/src/components/styles/TagGroup.css:9-12`                                     |
| Skia / Layout (implicitStyles.ts) | `resolveLabelFlexDir(labelPos, fallback, default)` runtime 함수                   | `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:281-288, 541-556` |
| Style Panel (useLayoutValues)     | `spec.containerStyles.flexDirection` (부재) → `firstDefined(..., "row")` 하드코드 | `apps/builder/src/builder/panels/styles/hooks/useLayoutValues.ts:41-45`                       |

**Panel 버그 노출**: TagGroup.spec.ts `containerStyles` 에 `flexDirection` 키가 없어(ADR-087 SP6 의도적 누락) `specPreset.flexDirection === undefined` → fallback `"row"` 하드코드 적용. `labelPosition="top"` (기본값) 시 실제 Canvas/Preview 는 column 인데 Panel Direction 필드는 "row" 표시 → **사용자 오인지**.

**동일 패턴 영향 범위 — 12 컨테이너 확증**: `labelPosition` prop 을 보유한 컨테이너 = **TagGroup / CheckboxGroup / RadioGroup / NumberField / TextField / TextArea / DateField / TimeField / DatePicker / DateRangePicker / ColorField / ComboBox** (총 12).

| skipCSSGeneration | 개수 | 컨테이너                                                                                                                            |
| ----------------- | :--: | ----------------------------------------------------------------------------------------------------------------------------------- |
| `true` (명시)     |  1   | TagGroup                                                                                                                            |
| `false` (명시)    |  10  | CheckboxGroup / RadioGroup / NumberField / TextField / DateField / TimeField / DatePicker / DateRangePicker / ColorField / ComboBox |
| 미설정 (기본)     |  1   | TextArea                                                                                                                            |

TagGroup 외 11 컨테이너는 CSS auto-gen 대상 → 본 ADR 에서 CSS emit 경로는 scope 외 (Phase 5 follow-up ADR 분리).

**추가 SSOT 공백 — Spec Registry + Fallback Resolver 위치 불일치**: Spec 데이터 자체는 `packages/specs/src/components/*.spec.ts` 에 정의되나, **tag→spec registry 는 `apps/builder/.../sprites/tagSpecMap.ts`** (TAG_SPEC_MAP, expandChildSpecs), **LOWERCASE alias 는 `apps/builder/.../layout/engines/tagSpecLookup.ts`**, **fallback resolver 는 `apps/builder/.../layout/engines/implicitStyles.ts:158`** 에 산재. `packages/specs` 내부에는 canonical registry 부재. 이 상태에서는 `derivedContainerStyles` resolver 를 `@composition/specs` 에 신설해도 의존성 방향이 역전 (packages/specs → apps/builder) — **Phase 0 에서 registry + fallback resolver 를 먼저 `@composition/specs` 로 이관**해야 Phase 1 resolver 가 clean 빌드.

**Hard Constraints**:

1. **Canvas FPS 60fps 유지** — derived 계산은 element tree traversal 당 1회 (`implicitStyles.ts`) + Panel per-selection 1회로 한정. per-frame 호출 금지.
2. **Skia ↔ Preview 시각 대칭 보존** — `/cross-check` 통과 필수. `labelPosition="top"/"side"` 양측에서 Canvas 와 Preview DOM 의 flex 방향 일치.
3. **ADR-059 수동 CSS 해체 방향 역행 금지** — 11 컨테이너의 `skipCSSGeneration: false` / 미설정은 유지 (flip to true 불가).
4. **Panel flexDirection 정합 복구** — `labelPosition` 선택 값에 따라 Direction 필드가 실제 렌더와 일치.
5. **D3 Spec SSOT 권위 packages/specs 단일 귀속** — Phase 0 완료 시 Spec 정의 + registry + derivation logic + fallback resolver 모두 `@composition/specs` 소유. Consumer (Canvas/Panel) 는 단방향 import.

**Soft Constraints**:

- ComponentSpec 은 "pure data" 가 아닌 **"pure module with pure-function derivations"** 원칙. `render.shapes(props, ctx)` / `render.react(props)` / `render.pixi()` / `properties.sections[].fields[].derivedUpdateFn(value)` 등 이미 함수 필드 전례 존재. 본 ADR 에서 이 원칙을 명문화.
- DSL (`@when` rule 등) 은 현재 직렬화/introspection/비개발자 편집 요구 부재 → YAGNI. 향후 요구 발생 시 함수 → DSL 이행 경로 열림.
- Panel `useElementStyleContext` 는 현재 `{style, type, size}` 만 노출 — `props`/`childTags` 확장 필요. 소비자 4 section hook (`useTransformValues` / `useAppearanceValues` / `useTypographyValues` / `useLayoutValues` — Fill 은 consumer 아님) 동시 영향.

## Alternatives Considered

### 대안 A: 함수형 `derivedContainerStyles` + CSS 현행 유지 + Registry 이관

- **설명**:
  - `ComponentSpec<P>.derivedContainerStyles?: (ctx: { props, childTags }) => Partial<Record<string, unknown>>` 스키마 확장
  - **Phase 0**: Spec registry (`TAG_SPEC_MAP` / `LOWERCASE_TAG_SPEC_MAP` / `expandChildSpecs`) + `resolveContainerStylesFallback` 를 `@composition/specs` 로 이관. `IMAGE_TAGS` 등 Canvas 전용 상수만 apps/builder 잔존.
  - 공용 resolver `resolveContainerStyles(spec, ctx)` 를 `@composition/specs` 에 신설 — Skia (implicitStyles) + Panel (useLayoutValues) 양쪽이 동일 함수 호출.
  - CSSGenerator 는 `containerStyles` static 만 소비, `derivedContainerStyles` skip (11 컨테이너 data-attr CSS 는 수동 유지 — 의도적 잔존 debt, Phase 5 follow-up).
  - Preview CSS / React 경로는 건드리지 않음 — data-attribute selector 기존대로 유지 (ctx 공급 불필요).
- **근거**: `render.shapes`/`react`/`pixi` + `derivedUpdateFn` 함수 필드 전례. Canvas runtime 에서 spec 을 import 하여 실행하는 모델과 정합. 함수 시그니처 최소 (2 필드 ctx). Registry 이관 scope 는 mechanical — 8 consumer import 경로 + 2 파일 split, HIGH 위험 없음.
- **위험**:
  - 기술: M — ctx 계약 확장 (`useElementStyleContext` 에 props + childTags 추가) + `useShallow` 로 Set 참조 안정성. Phase 0 registry 이관 시 `expandChildSpecs` import cycle 재확인.
  - 성능: L — Panel 함수 호출 per-selection 1회 < 1ms. Canvas 는 기존 분기 제거분과 상쇄 (net 0). childTags Set 재생성은 shallow 비교로 차단.
  - 유지보수: L — ADR-087 SP6 (containerStyles static 리프팅) 기조와 정합. `resolveLabelFlexDir` 12 분기 제거 + apps→packages 단방향 의존성 회복으로 implicitStyles.ts 단순화.
  - 마이그레이션: M — Phase 0 (8 consumer import 경로 갱신) + 12 컨테이너 점진 전환 (TagGroup PoC → 11 컨테이너 sweep). props 스키마 불변, data-file migration 0.

### 대안 A-lite: 함수형 helper + Registry 유지 (DI pattern)

- **설명**: A 에서 Phase 0 생략. `resolveContainerStyles(spec, ctx)` 만 신설하되 `spec` 은 호출자가 공급 (DI). `resolveContainerStylesFallback` 은 apps/builder 잔존.
- **근거**: 이관 cost 최소. 회귀 위험 LOW.
- **위험**:
  - 기술: L
  - 성능: L
  - 유지보수: **M** — Spec SSOT 층이 apps/builder 에 산재 유지 → 향후 Publish/tester 재사용 시 중복/cross-app import 불가피. **A 방향으로의 이행 debt** 가 고정됨.
  - 마이그레이션: L
- **기각 근거**: "b'→a 이행 필수" 전제에서 A-lite 는 known debt accumulation — 근본 해결 원칙과 배치. 사용자 피드백 (debt 회피, SSOT 중복 제거) 과 정면 배치.

### 대안 B: 함수형 `derivedContainerStyles` + CSSGenerator data-attr emit (정석)

- **설명**: 대안 A 의 상위집합. CSSGenerator 가 `derivedContainerStyles` 함수를 AST/runtime probe 로 분석하여 `[data-prop="X"]` CSS selector 자동 emit. D3 symmetric consumer 완전 복구 (수동 CSS duplication debt 0).
- **근거**: D3 대칭 원칙 엄격 준수. ADR-059 (skipCSSGeneration 해체) 와 정합 최대.
- **위험**:
  - 기술: **H** — 함수 body 정적 분석은 Babel AST parser 신설 또는 DSL 전환 필요. 조건 표현식 cover (`===`, `??`, ternary, 논리 연산) 전부 지원해야 함.
  - 성능: L — CSS 빌드 타임만 영향. 런타임 비용 없음.
  - 유지보수: **H** — CSSGenerator 신규 복잡도. 함수 시그니처/ctx 계약 변경 시 파서 재작성 필수. DSL 전환 시 학습 비용.
  - 마이그레이션: **H** — A 의 scope 포함 + CSSGenerator 전면 개편 + 11 컨테이너 CSS regeneration. 회귀 위험 최대.

### 대안 C: DSL `@when` rule

- **설명**:
  ```ts
  containerStyles: {
    display: "flex",
    "@when": [
      { if: { prop: { labelPosition: "side" } }, then: { flexDirection: "row" } },
      { if: { prop: { labelPosition: { not: "side" } } }, then: { flexDirection: "column" } },
    ],
  }
  ```
  pure data 원칙 유지, 직렬화 가능.
- **근거**: 원격 저장/DevTools introspection/비개발자 편집 요구가 있을 경우 가치.
- **위험**:
  - 기술: M — rule parser + validator 신설. 조건 표현력 한계 (nested/computed 규칙).
  - 성능: M — rule engine 평가 매 호출.
  - 유지보수: **H** — 새 DSL 학습 비용. 함수 대비 표현력 제약 (computed 값, 조건 결합 등).
  - 마이그레이션: M — 12 컨테이너 rule 변환.
- **기각 근거**: 현재 요구(직렬화/introspection/비개발자 편집) 전부 부재 → YAGNI.

### 대안 D: Panel-only 픽스

- **설명**: `useLayoutValues` 에서 `labelPosition` prop 직접 해석 후 `flexDirection` 하드코드 override. Spec 스키마 불변, Skia 경로 불변.
- **근거**: 최소 변경. Panel 버그만 핀포인트 해소.
- **위험**:
  - 기술: L
  - 성능: L
  - 유지보수: **H** — D3 SSOT 4 consumer 고착화 (Spec 공백 유지 + Panel 신규 해석 로직 추가). `resolveLabelFlexDir` 호출 12 분기 + Panel 중복 로직 동시 유지 → ADR-063 방향 역행.
  - 마이그레이션: L
- **기각 근거**: 근본 해결 아님. debt 확대.

### Risk Threshold Check

| 대안   | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ------ | :--: | :--: | :------: | :----------: | :--------: |
| A      |  M   |  L   |    L     |      M       |     0      |
| A-lite |  L   |  L   |    M     |      L       |     0      |
| B      |  H   |  L   |    H     |      H       |     3      |
| C      |  M   |  M   |    H     |      M       |     1      |
| D      |  L   |  L   |    H     |      L       |     1      |

**루프 판정**: A 와 A-lite 모두 HIGH 0. A-lite 는 known debt accumulation 으로 기각, A 채택. B/C/D HIGH 존재하나 A 수용 가능. 1회 루프 종료.

## Decision

**대안 A: 함수형 `derivedContainerStyles` + CSS 현행 유지 + Registry 이관**을 선택한다.

핵심 결정 사항:

1. `ComponentSpec<P>` 에 `derivedContainerStyles?: (ctx: DerivedContainerCtx<P>) => Partial<ContainerStyles>` 추가.
2. `ctx = { props, childTags }` — 최소 계약. `layoutVersion`/parent/grandchildren 등은 의도적 제외.
3. **머지 순서**: `containerStyles` (static) < `derivedContainerStyles(ctx)` < `element.props.style` (user — 최우선).
4. 함수는 **순수(pure) 함수**. side-effect/외부 참조/DOM·store 접근 금지. 본 ADR 에 제약 명문화, 향후 ESLint custom rule 승격 검토.
5. **Phase 0 에서 Spec registry 를 `@composition/specs` 로 이관**: `TAG_SPEC_MAP` / `BASE_TAG_SPEC_MAP` / `expandChildSpecs` / `getSpecForTag` (현재 `apps/builder/.../sprites/tagSpecMap.ts`) + `LOWERCASE_TAG_SPEC_MAP` (현재 `apps/builder/.../layout/engines/tagSpecLookup.ts`) + `resolveContainerStylesFallback` (현재 `apps/builder/.../layout/engines/implicitStyles.ts:158`). `IMAGE_TAGS` 등 Canvas sprite 전용 상수만 apps/builder 잔존.
6. 공용 resolver `resolveContainerStyles(spec, ctx)` + 리프팅된 `resolveContainerStylesFallback(tag, parentStyle)` 모두 `@composition/specs` 에 export.
7. `implicitStyles.ts` 의 `labelPosition`/`orientation`/`hasChild` 분기는 각 spec 으로 이관 후 공용 resolver 호출로 대체.
8. Preview (CSS/React) 경로는 건드리지 않음 — `data-label-position` selector 기존대로 유지.
9. Style Panel (`useLayoutValues`) 은 spec static 만 보던 기존 코드를 `resolveContainerStyles(spec, ctx)` 호출로 교체.

선택 근거:

1. **HIGH+ 위험 0 개** — 4 대안 중 유일 (A-lite 동급 이나 known debt 로 기각).
2. **ComponentSpec 함수 필드 전례와 정합** — `render.shapes/react/pixi` + `derivedUpdateFn` 이 이미 함수. "pure module with pure-function derivations" 원칙 재정의로 현실과 일치.
3. **D3 SSOT 100% packages/specs 귀속** — Phase 0 이관 완료 시 Spec 정의 + registry + derivation logic + fallback resolver 모두 `@composition/specs` 소유. 의존성 방향 단방향 회복.
4. **Phase 분리로 회귀 관리 가능** — P0(Registry 이관) → P1(TagGroup PoC) → P2(Panel 통합) → P3(11 컨테이너 sweep) → P4(util 재배치) → P5(CSSGenerator follow-up) 단계별 Gate. 롤백 단위가 Phase × 컨테이너로 세분.
5. **CSS duplication debt 는 Phase 5 follow-up ADR 로 명시 분리** — 본 ADR scope 에서 11 컨테이너 수동 data-attr CSS 는 현행 유지. 향후 B 경로(CSSGenerator AST) 로 이행할 escape hatch 열어둠.

기각 사유:

- **대안 A-lite 기각**: Phase 0 생략 시 "b'→a 이행" debt 가 고정됨. 근본 해결/SSOT 중복 제거 원칙과 배치.
- **대안 B 기각**: CSSGenerator 확장 scope 폭발 (기술/유지보수/마이그레이션 3 축 HIGH). AST 분석 또는 DSL 전환은 독립 설계 트랙 → **Phase 5 follow-up ADR 로 분리**.
- **대안 C 기각**: 현재 직렬화/introspection/비개발자 편집 요구 부재 → YAGNI. 향후 요구 발생 시 재평가 (본 ADR 의 함수 구현을 DSL 로 이행하는 경로는 열림).
- **대안 D 기각**: D3 SSOT 4 consumer 고착화, ADR-063 3-domain 분할 역행. 유지보수 HIGH.

> 구현 상세: [108-container-runtime-derived-styles-breakdown.md](../design/108-container-runtime-derived-styles-breakdown.md)

## Risks

| ID  | 위험                                                                                                                                                                                                                                                                             | 심각도 | 대응                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `childTags` Set cache key thrashing → Panel re-render 급증                                                                                                                                                                                                                       |  MED   | `useShallow` (from `zustand/react/shallow`, Zustand v5+) 로 Set 참조 안정성 확보. Panel `useMemo` deps 에 childTags 포함. P2 시작 전 Zustand 실버전 확증 필수.                                                                     |
| R2  | Panel ctx 공급 누락 (`labelPosition` prop 미전달) 으로 기존 Panel 기능 회귀                                                                                                                                                                                                      |  MED   | P2 종료 시 Panel 4 section hook (`useTransformValues`/`useAppearanceValues`/`useTypographyValues`/`useLayoutValues` — Fill 은 consumer 아님) 전수 type-check + Chrome MCP 12 컨테이너 실 UI sweep.                                 |
| R3  | CSS duplication debt 장기화 (11 컨테이너 data-attr CSS 수동 유지) — `ssot-hierarchy.md` D3 symmetric 위반 잔존                                                                                                                                                                   |  MED   | Phase 5 follow-up ADR (CSSGenerator data-attr emit) Proposed 상태 기록 + annual review. `/cross-check` 는 Canvas/Panel 대칭으로 우선 복구.                                                                                         |
| R4  | 12 컨테이너 마이그레이션 중 runtime 분기 오탈 — `labelPosition` 외에 `resolveLabelFlexDir` (`implicitStyles.ts:281-288`) / `applySideLabelChildStyles` (`implicitStyles.ts:368`, 호출 L993/L1051/L1241/L1660) / orientation 분기 (CheckboxGroup/RadioGroup) 3계열                |  HIGH  | P3 진입 전 `grep -rn "resolveLabelFlexDir\|applySideLabelChildStyles\|orientation" implicitStyles.ts` 전수 조사. R4 대응 scope 에 위 3 함수 + 5 호출 site 명시. 각 컨테이너 `parallel-verify` 5×5 필수.                            |
| R5  | 순수성 제약 (DOM/file/store 접근 금지) 이 코드 리뷰 의존 → 향후 위반 유입 가능                                                                                                                                                                                                   |  LOW   | ADR 본문에 제약 명문화 + review 체크리스트 포함. 위반 패턴 발견 시 ESLint custom rule 승격 검토.                                                                                                                                   |
| R6  | **Phase 0 blast radius** — 8 consumer (`StoreRenderBridge` / `buildSpecNodeData` / `tagSpecLookup` / `implicitStyles` / `fullTreeLayout` / `specPresetResolver` / `useLayoutAuxiliary` / `useTransformAuxiliary`) import 경로 일괄 갱신 + `expandChildSpecs` import cycle 가능성 |  MED   | P0 착수 전 `expandChildSpecs` 의 childSpecs 재귀 참조 경로 사전 점검 (circular import test). 8 consumer 경로 갱신은 mechanical IDE refactor + `pnpm type-check` 전 영역 PASS 로 catch. `tagSpecMap.test.ts` 의 registry 계약 보존. |

## Gates

| Gate | 시점    | 통과 조건                                                                                                                                                                                                                       | 실패 시 대안                                                              |
| ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| G0   | P0 종료 | `pnpm type-check` 전 영역 PASS + 8 consumer import 경로 `@composition/specs` 로 갱신 완료 + `tagSpecMap.test.ts` / `resolveContainerStylesFallback.test.ts` / `tokenConsumerDrift.test.ts` PASS + Canvas 렌더 spot-check 회귀 0 | Registry split 경계 재검토 — `IMAGE_TAGS` / `BASE_TAG_SPEC_MAP` 배치 조정 |
| G1   | P1 종료 | TagGroup Skia/Preview/Panel 3축 대칭 확증 (Chrome MCP `labelPosition="top"/"side"` 양측)                                                                                                                                        | TagGroup derivedContainerStyles 재설계 — 공용 resolver 계약 조정          |
| G2   | P2 종료 | `pnpm type-check` 전 모듈 PASS + Panel Direction 필드가 TagGroup `labelPosition` 에 정합 표시 + 4 section hook (Transform/Appearance/Typography/Layout) 전수 회귀 0                                                             | `useElementStyleContext` 확장 필드 설계 재검토 — 4 section 호환성         |
| G3   | P3 종료 | 12 컨테이너 전수 `/cross-check` PASS + 각 spec 에 `derivedContainerStyles` 이관 완료                                                                                                                                            | 잔존 runtime 분기 (orientation 등) 추가 발굴 → P3 scope 확장              |
| G4   | P4 종료 | `grep -rn "resolveLabelFlexDir\|applySideLabelChildStyles" apps/builder/src/builder/workspace` → **결과 0**                                                                                                                     | util 재배치 설계 조정 — spec-side 헬퍼 경계 재확인                        |

## Consequences

### Positive

- **D3 Spec SSOT 100% packages/specs 귀속** (ADR-108 scope 기준): Spec 정의 + registry + derivation logic + fallback resolver 모두 `@composition/specs` 소유. Canvas/Panel 은 단방향 import consumer. 향후 Publish/tester 재사용 경로 자동 열림.
- **implicitStyles.ts 단순화**: 12 컨테이너 `resolveLabelFlexDir` / `applySideLabelChildStyles` 분기 + 5 호출 site 제거 → runtime fork 감소, engine 코드 대폭 축소.
- **Panel 버그 해소**: `labelPosition="top"` 에서 Direction 필드가 실제 "column" 표시 (사용자 오인지 제거) + labelPosition 변경 시 Panel 표시값 회귀 0 보장.
- **향후 확장 경로**: `orientation`, `size`, `hasChild` 등 다른 runtime-derived 스타일도 동일 메커니즘 채택 가능. ADR-108 이 패턴 레퍼런스.
- **util 재배치로 spec-runtime 경계 정리**: `resolveLabelFlexDir` 이 `@composition/specs` (spec 계약) 에 위치 → Canvas/Panel 이 같은 helper 소비, 책임 경계 명확.

### Negative

- **Spec "pure data" 원칙 재정의 필요**: `derivedContainerStyles` 가 layout-primitive 계층 첫 함수 필드. ADR 본문에 "pure module with pure-function derivations" 원칙 명문화 필수. SSOT 체인 문서 (`ssot-hierarchy.md`) 업데이트 scope.
- **Phase 0 blast radius**: 8 consumer import 경로 + `tagSpecMap.ts` split + `tagSpecLookup.ts` 이관. Mechanical 이나 갱신 누락 시 type error. G0 로 차단.
- **CSS duplication debt 잔존**: 11 컨테이너의 `data-label-position` CSS 규칙은 수동 유지 (Phase 5 follow-up ADR 로 이연). `/cross-check` 는 Canvas/Panel 대칭 우선 복구하나, Preview CSS 는 독립 수정 대상으로 남음.
- **Panel ctx 계약 확장 비용**: `useElementStyleContext` 가 4 section hook (Transform/Appearance/Typography/Layout) 의 공유 dependency — 변경 시 전 hook 회귀 검증 필요.
- **childTags Set 재생성 per-render**: `useShallow` 로 차단하나, Zustand store `childrenMap` 변경 시 새 Set 인스턴스 생성 → GC 부담 미약 증가.
