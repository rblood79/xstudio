# ADR-908 Breakdown: Fill Spec Schema SSOT 전환

## 목표

- spec schema의 `background` 계열을 fill preset schema로 대체해 D3 시각 스타일 SSOT를 spec까지 확장한다.
- builder resolver/panel/CSS generator/spec renderer가 같은 spec fill preset을 읽게 만든다.
- migration 완료 후 legacy `background/backgroundHover/backgroundPressed` 해석 경로를 제거한다.

## 범위

- 포함
  - `packages/specs/src/types/spec.types.ts` 의 `VariantSpec` 중 다음 background 계열 필드 한정 (Phase 1-4 주대상):
    - `background`, `backgroundHover`, `backgroundPressed` (line 738/741/744)
    - `selectedBackground`, `selectedBackgroundHover`, `selectedBackgroundPressed` (line 780-784)
    - `emphasizedSelectedBackground` (line 791)
    - `outlineBackground`, `subtleBackground` (line 764/773)
  - `IndicatorModeSpec.background` (line 805) + `IndicatorModeSpec.backgroundPressed` (line 809)
  - builder spec preset resolver / appearance fallback 경로
  - component spec 의 variant appearance 선언 중 위 필드 소비 지점
  - 관련 테스트와 grep gate
- 제외
  - runtime 문서의 top-level `fills` shape 재정의
  - image/mesh fill의 spec 저작 UX
  - Row/Cell component-specific `backgroundColor` 예외 도메인
  - `VariantSpec` 의 비-background 색상 필드 — `text`, `textHover`, `border`, `borderHover`, `outlineText`, `outlineBorder`, `subtleText`, `selectedText`, `selectedBorder`, `emphasizedSelectedText`, `emphasizedSelectedBorder` (line 747-793) — 본 ADR scope 외. 후속 ADR (fill 개념의 색상군 확장) 에서 동일 preset 언어 확장 여부 별도 판정.
  - `VariantSpec.backgroundAlpha` (line 759) — number 값, fill preset schema 의 opacity 처리 후속 판정.

## 현재 기준선

- spec 공통 타입은 아직 `background`, `backgroundHover`, `backgroundPressed`를 직접 가진다.
- builder appearance preset resolver는 spec `background`를 `backgroundColor`로 변환해 패널 fallback에 사용한다.
- component spec 은 `variant.background*` 토큰을 CSSGenerator 와 Skia spec renderer 가 소비하는 구조다. 사용자 override 는 `element.props.style.backgroundColor` (런타임 문서 저장 경로) 로 들어오며, builder style panel fallback 경로에서 `resolveAppearanceSpecPreset()` 이 spec `background` → `backgroundColor` 로 변환하여 `useAppearanceValues` 가 읽는다 (`apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts:295-325` + `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts:47-49`).
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
  - 우선순위 family 부터 component spec 의 `variant.background*` / `variant.selectedBackground*` 선언을 fill preset 으로 데이터 전환
  - CSSGenerator 와 Skia spec renderer 의 `variant.background*` 소비 경로를 fill preset direct-read 로 전환
  - builder resolver `appearanceFromContainerStyles` (`specPresetResolver.ts:295-308`) + `appearanceFromComposition` (`specPresetResolver.ts:310-325`) 의 background→backgroundColor 변환 경로 제거
  - `useAppearanceValues.ts:47-49` fallback 체인 (`s.backgroundColor ?? specPreset.backgroundColor`) 를 fill preset direct-read 로 전환
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
  - `rg "backgroundHover|backgroundPressed" packages/specs/src/types` 결과 0 (VariantSpec/IndicatorModeSpec 정의 삭제)
  - `rg "variant\.background(Hover|Pressed)?" packages/specs/src apps/builder/src` 결과 0 (소비 경로 전환 완료)
  - `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts` 의 background→backgroundColor 변환 함수 삭제
  - `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts` 의 `specPreset.backgroundColor` fallback 삭제

## 파일 영향 초안

- spec 타입
  - `packages/specs/src/types/spec.types.ts`
- component spec
  - `packages/specs/src/components/*.spec.ts`
- spec renderer / CSS generator
  - `packages/specs/src/renderers/CSSGenerator.ts` — variant background\* emit 경로 → fill preset emit 으로 bridge (Phase 2)
  - `packages/specs/src/renderers/resolveContainerVariants.ts` — variant background\* 해석을 fill preset direct-read 로 전환 (Phase 2); Skia 경로는 `apps/builder/src/builder/workspace/canvas/skia/specShapeConverter.ts` 가 이를 소비
- builder consumer
  - `apps/builder/src/builder/panels/styles/utils/specPresetResolver.ts`
  - `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.ts`
  - `apps/builder/src/builder/panels/styles/hooks/useResetStyles.ts`
- 테스트
  - `apps/builder/src/builder/panels/styles/utils/specPresetResolver.test.ts`
  - `apps/builder/src/builder/panels/styles/hooks/useAppearanceValues.test.tsx`
  - specs renderer 관련 테스트 파일

## 검증 체크리스트

- [ ] spec fill preset 타입이 token/state parity를 보존한다
- [ ] builder appearance fallback이 spec fill preset direct-read로 동작한다
- [ ] 대표 component family parity 테스트 통과
- [ ] migration 완료 후 legacy `background*` spec 타입/사용 지점 grep 0
- [ ] ADR-904/905의 runtime/storage fill SSOT와 충돌하지 않는다
- [ ] CSSGenerator 가 fill preset 의 state selector (hover/pressed/selected) 를 올바르게 emit 한다
- [ ] Spec→Skia renderer (`resolveContainerVariants.ts` + `specShapeConverter.ts`) 가 fill preset 을 direct-read 로 소비한다

## 오픈 이슈

1. spec fill preset scope 확장 범위 — (a) Phase 1-4 는 `background*` + `selectedBackground*` + `outlineBackground` + `subtleBackground` + `IndicatorModeSpec.background` 10+ 필드 한정 (b) 후속 ADR 에서 `text*`/`border*`/`outline{Text,Border}`/`subtle{Text}` 등 비-background 색상군을 동일 preset 언어로 확장할지 (c) gradient token schema 포함 여부는 (b) 와 독립적으로 별도 판정.
2. CSS generator가 fill preset을 직접 emit할 때 state selector mapping을 어디까지 공통화할지
3. component spec 내부 override가 `props.style?.backgroundColor` 대신 어떤 fill override seam을 가질지
