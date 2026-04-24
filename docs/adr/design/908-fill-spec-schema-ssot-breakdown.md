# ADR-908 Breakdown: Fill Spec Schema SSOT 전환

## 목표

- spec schema의 `background` 계열을 fill preset schema로 대체해 D3 시각 스타일 SSOT를 spec까지 확장한다.
- builder resolver/panel/CSS generator/spec renderer가 같은 spec fill preset을 읽게 만든다.
- migration 완료 후 legacy `background/backgroundHover/backgroundPressed` 해석 경로를 제거한다.

## 범위

- 포함
  - `packages/specs/src/types/spec.types.ts` 의 `VariantSpec` background 계열 전수 (`spec.types.ts:740-795`):
    - 기본: `background` (740) / `backgroundHover` (743) / `backgroundPressed` (746)
    - opacity: `backgroundAlpha` (760)
    - fillStyle variant: `outlineBackground` (766) / `subtleBackground` (775)
    - selected 상태: `selectedBackground` (782) / `selectedBackgroundHover` (784) / `selectedBackgroundPressed` (786)
    - emphasized 조합: `emphasizedSelectedBackground` (793)
  - `IndicatorModeSpec.background` (807) + `IndicatorModeSpec.backgroundPressed` (811)
  - builder spec preset resolver / appearance fallback 경로 (`specPresetResolver.ts` + `useAppearanceValues.ts`)
  - spec renderer direct consumer — CSSGenerator / ReactRenderer / variantColors / stateEffect / validate-specs (아래 "파일 영향 초안" 참조)
  - component spec 의 variant appearance 선언 중 위 필드 소비 지점
  - 관련 테스트와 grep gate
- 제외
  - runtime 문서의 top-level `fills` shape 재정의
  - image/mesh fill의 spec 저작 UX
  - Row/Cell component-specific `backgroundColor` 예외 도메인
  - `VariantSpec` 의 비-background 색상 필드 — `text` / `textHover` / `border` / `borderHover` / `outlineText` / `outlineBorder` / `subtleText` / `selectedText` / `selectedBorder` / `emphasizedSelectedText` / `emphasizedSelectedBorder` (line 748-795) — 본 ADR scope 외. 후속 ADR 에서 fill preset 언어를 비-background 색상군까지 확장할지 별도 판정.

## 현재 기준선

- `VariantSpec` 은 `background` 계열 10+ 필드 (기본/selected/emphasized/outline/subtle/alpha) 를 직접 가진다 (`spec.types.ts:740-795`). `IndicatorModeSpec` 도 `background` (807) + `backgroundPressed` (811) 를 가진다.
- 직접 소비자는 6경로 존재:
  1. `packages/specs/src/renderers/CSSGenerator.ts:228,282,320,357` — selected/emphasized/outline/subtle state selector 를 포함한 background token 직접 emit
  2. `packages/specs/src/renderers/ReactRenderer.ts:88-92` — React inline style 렌더에 background 직접 주입
  3. `packages/specs/src/renderers/utils/variantColors.ts:13,25-27` — variant color 공통 resolver
  4. `packages/specs/src/utils/stateEffect.ts:24,33-41` — state 합성 시 variant.background 참조
  5. `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts:295-325` — spec `background` → `backgroundColor` 변환 (패널 fallback)
  6. `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts:47-49` — `s.backgroundColor ?? specPreset.backgroundColor` fallback 체인
- 추가로 `packages/specs/scripts/validate-specs.ts:146` 이 variant background 필드 존재를 검증 rule 로 사용한다.
- runtime/storage는 이미 ADR-904/905로 top-level `fills`가 정본이다.

## Phase Plan

### Phase 0 — Inventory + schema 경계 고정

- 범위
  - spec 타입/컴포넌트에서 `background*` 직접 사용 지점 inventory 수집
  - fill spec schema의 지원 범위를 color/state 중심으로 고정
- 산출
  - `VariantSpec.background*`, `IndicatorModeSpec.background`, `props.style?.backgroundColor` 사용 카운트 baseline
  - spec 지원 범위 명세
- 완료 조건
  - `rg "backgroundHover|backgroundPressed|props\\.style\\?\\.backgroundColor|background:" packages/specs/src` baseline 기록
  - color-only 우선 범위와 비대상(image/mesh) 명시

### Phase 1 — Spec fill preset 타입 도입

- 범위
  - `FillTokenSpec` 또는 동등 schema 도입
  - stateful appearance를 표현할 수 있는 variant fill preset 타입 추가
- 산출
  - `spec.types.ts` 신규 타입
  - token/state parity 테스트
- 설계 원칙
  - runtime `FillItem` raw shape를 재사용하지 않는다.
  - token ref를 1급 값으로 유지한다.
  - 기본/hover/pressed 상태를 동일 구조 안에 수용한다.

### Phase 2 — Resolver / Generator seam 통합

- 범위
  - `specPresetResolver`가 spec fill preset direct-read를 지원
  - CSS generator/spec renderer가 background 토큰 대신 fill preset을 읽도록 bridge 도입
- 산출
  - resolver/generator 공통 helper
  - dual-read migration seam 테스트
- 완료 조건
  - builder appearance fallback이 spec fill preset 기준으로 동작
  - background 기반 direct-read는 migration bridge로만 남음

### Phase 3 — Component spec migration

- 범위
  - 우선순위 family 부터 component spec 의 `variant.background*` / `selectedBackground*` / `emphasizedSelectedBackground` / `outlineBackground` / `subtleBackground` / `backgroundAlpha` 선언을 fill preset 으로 데이터 전환
  - 6 direct consumer 전수 전환:
    1. `CSSGenerator.ts:228,282,320,357` — state selector emit 을 fill preset 분기로
    2. `ReactRenderer.ts:88-92` — React inline style 주입을 fill preset direct-read 로
    3. `variantColors.ts:13,25-27` — variant color resolver 를 fill preset 기반으로
    4. `stateEffect.ts:24,33-41` — state 합성이 fill preset 참조
    5. `specPresetResolver.ts:295-325` (`appearanceFromContainerStyles` + `appearanceFromComposition`) 의 background→backgroundColor 변환 제거
    6. `useAppearanceValues.ts:47-49` fallback 체인을 fill preset direct-read 로
  - `validate-specs.ts:146` 의 background 필드 존재 rule 을 fill preset schema rule 로 교체
- 우선순위 후보
  1. Button / Badge / InlineAlert / Avatar
  2. ListBox / Menu / TabPanel / CalendarGrid
  3. 남은 family 전수
- 산출
  - component spec diff
  - cross-check 테스트
- 완료 조건
  - pilot family에서 CSS/Panel/Skia parity 0 regression

### Phase 4 — Legacy 제거

- 범위
  - `VariantSpec.background*`, `IndicatorModeSpec.background` 삭제
  - spec resolver의 background→backgroundColor 변환 bridge 삭제
  - 문서/README/grep gate 정리
- 산출
  - legacy 삭제 커밋
  - 최종 grep 0 보고
- 완료 조건
  - `rg "backgroundHover|backgroundPressed" packages/specs/src/types` = 0 (VariantSpec/IndicatorModeSpec 정의 삭제)
  - `rg "variantSpec\.(background|backgroundHover|backgroundPressed|selectedBackground|selectedBackgroundHover|selectedBackgroundPressed|emphasizedSelectedBackground|outlineBackground|subtleBackground|backgroundAlpha)" packages/specs/src apps/builder/src` = 0 (VariantSpec full object access)
  - `rg "\bvariant\.(background|backgroundHover|backgroundPressed|selectedBackground|outlineBackground|subtleBackground|backgroundAlpha)" packages/specs/src apps/builder/src` = 0 (short alias — `stateEffect.ts:35-57` + `validate-specs.ts:146-148` 커버)
  - `rg "im\.(background|backgroundPressed)" packages/specs/src` = 0 (IndicatorModeSpec alias 소비 경로 전환 완료)
  - `CSSGenerator.ts` / `ReactRenderer.ts` / `variantColors.ts` / `stateEffect.ts` / `specPresetResolver.ts` / `useAppearanceValues.ts` / `validate-specs.ts` 7 소비자 파일에서 background→fill bridge 삭제
  - `specPresetResolver.ts` 의 `appearanceFromContainerStyles` + `appearanceFromComposition` background→backgroundColor 변환 함수 삭제
  - `useAppearanceValues.ts` 의 `specPreset.backgroundColor` fallback 체인 삭제

## 파일 영향 초안

- spec 타입
  - `packages/specs/src/types/spec.types.ts` — VariantSpec background 계열 필드 / IndicatorModeSpec.background\*
- component spec
  - `packages/specs/src/components/*.spec.ts` — variant appearance 선언 (~104 / 117 spec)
- spec renderer / CSS generator (direct consumer, Phase 2-3)
  - `packages/specs/src/renderers/CSSGenerator.ts` — variant background\* + selected/emphasized/outline/subtle state selector emit 경로 → fill preset emit 으로 bridge
  - `packages/specs/src/renderers/ReactRenderer.ts` — React inline style 렌더에 background 주입 경로 → fill preset direct-read
  - `packages/specs/src/renderers/utils/variantColors.ts` — variant color 공통 resolver → fill preset resolver 로 교체
  - `packages/specs/src/utils/stateEffect.ts` — state 합성 시 variant.background 참조 → fill preset 참조
  - `packages/specs/scripts/validate-specs.ts` — variant background 필드 존재 검증 rule → fill preset schema rule 로 교체
- builder consumer (Phase 2-3)
  - `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts` — `appearanceFromContainerStyles` (295-308) + `appearanceFromComposition` (310-325) background→backgroundColor 변환 제거
  - `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts` — 47-49 fallback 체인 전환
  - `apps/builder/src/builder/panels/styles/hooks/useResetStyles.ts` — reset 경로 fill preset 대응
- 테스트
  - `apps/builder/src/builder/panels/styles/utils/specPresetResolver.test.ts`
  - `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.test.tsx`
  - `packages/specs/src/renderers/__tests__/CSSGenerator.fill.test.ts` (신설 — state selector emit parity)
  - specs renderer 관련 테스트 파일

## 검증 체크리스트

- [ ] spec fill preset 타입이 token/state parity 를 보존한다 (10+ background 계열 필드 전수)
- [ ] builder appearance fallback 이 spec fill preset direct-read 로 동작한다
- [ ] 대표 component family parity 테스트 통과
- [ ] migration 완료 후 legacy background 계열 grep 0 — `rg "backgroundHover|backgroundPressed" packages/specs/src/types` + `rg "variantSpec\.(background|backgroundHover|backgroundPressed|selectedBackground|selectedBackgroundHover|selectedBackgroundPressed|emphasizedSelectedBackground|outlineBackground|subtleBackground|backgroundAlpha)" packages/specs/src apps/builder/src` + `rg "\bvariant\.(background|backgroundHover|backgroundPressed|selectedBackground|outlineBackground|subtleBackground|backgroundAlpha)" packages/specs/src apps/builder/src` (short alias) + `rg "im\.(background|backgroundPressed)" packages/specs/src`
- [ ] ADR-904/905 의 runtime/storage fill SSOT 와 충돌하지 않는다
- [ ] CSSGenerator 가 fill preset 의 data attribute selector (`[data-hovered]` / `[data-pressed]` / `[data-selected]` / `[data-emphasized][data-selected]` / `[data-fill-style="outline"]` / `[data-fill-style="subtle"]`) 를 올바르게 emit 한다 (React Aria 표준)
- [ ] ReactRenderer / variantColors / stateEffect / validate-specs 4 direct consumer 가 fill preset 을 direct-read 로 소비한다

## 오픈 이슈

1. spec fill preset이 color-only에서 멈출지, gradient token schema까지 포함할지
2. CSS generator가 fill preset을 직접 emit할 때 state selector mapping을 어디까지 공통화할지
3. component spec 내부 override가 `props.style?.backgroundColor` 대신 어떤 fill override seam을 가질지
