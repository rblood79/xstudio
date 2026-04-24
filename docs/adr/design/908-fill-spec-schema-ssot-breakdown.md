# ADR-908 Breakdown: Fill Spec Schema SSOT 전환

## 목표

- spec schema의 `background` 계열을 fill preset schema로 대체해 D3 시각 스타일 SSOT를 spec까지 확장한다.
- builder resolver/panel/CSS generator/spec renderer가 같은 spec fill preset을 읽게 만든다.
- migration 완료 후 legacy `background/backgroundHover/backgroundPressed` 해석 경로를 제거한다.

## 범위

- 포함
  - `packages/specs/src/types/spec.types.ts`의 `VariantSpec`, `IndicatorModeSpec`, appearance 관련 공통 타입
  - builder spec preset resolver / appearance fallback 경로
  - component spec의 variant appearance 선언
  - 관련 테스트와 grep gate
- 제외
  - runtime 문서의 top-level `fills` shape 재정의
  - image/mesh fill의 spec 저작 UX
  - Row/Cell component-specific `backgroundColor` 예외 도메인

## 현재 기준선

- spec 공통 타입은 아직 `background`, `backgroundHover`, `backgroundPressed`를 직접 가진다.
- builder appearance preset resolver는 spec `background`를 `backgroundColor`로 변환해 패널 fallback에 사용한다.
- component spec 다수는 `props.style?.backgroundColor ?? variant.background` 패턴을 유지한다.
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
  - 우선순위 family부터 component spec 데이터 전환
  - `variant.background*`와 `props.style?.backgroundColor ?? ...` 패턴 제거
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
  - `rg "backgroundHover|backgroundPressed" packages/specs/src` 결과 0
  - background 기반 preset fallback 경로 0

## 파일 영향 초안

- spec 타입
  - `packages/specs/src/types/spec.types.ts`
- component spec
  - `packages/specs/src/components/*.spec.ts`
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

## 오픈 이슈

1. spec fill preset이 color-only에서 멈출지, gradient token schema까지 포함할지
2. CSS generator가 fill preset을 직접 emit할 때 state selector mapping을 어디까지 공통화할지
3. component spec 내부 override가 `props.style?.backgroundColor` 대신 어떤 fill override seam을 가질지
