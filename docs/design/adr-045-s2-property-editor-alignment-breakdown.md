# ADR-045 Breakdown: S2 Property Editor 정합성 정렬

이 문서는 ADR-045의 구현 메모를 관리한다. 결정 자체는 [ADR-045](/Users/admin/work/xstudio/docs/adr/045-s2-property-editor-alignment.md)에 있고, 여기에는 컴포넌트별 실행 후보와 계약 확장 후보만 기록한다.

## 목적

- Property Editor에서 즉시 정렬 가능한 항목과 별도 계약 확장이 필요한 항목을 분리한다.
- 구현 범위를 작은 변경 묶음으로 나누기 위한 작업 메모를 유지한다.
- ADR 본문에 넣지 않는 파일 경계와 QA 체크 항목을 관리한다.

## 1. 즉시 정렬 후보

아래 항목은 현재 코드 계약에 이미 존재하거나, 작은 범위의 동기화로 정렬 가능한 후보다.

### Link

- 현재 계약 확인:
  - `target`
  - `rel`
  - `isQuiet`
  - `staticColor`
- 메모:
  - 기존 editor에는 `target`, `rel`, `isQuiet`, `staticColor` 일부가 빠져 있다.
  - `variant`는 현재 `"primary" | "secondary"` 계약을 유지한다.
  - S2 문서에 없는 `overBackground` 같은 확장은 이번 범위에서 제외한다.

### Dialog

- 현재 계약 확인:
  - `isDismissable`
  - `role`
- 메모:
  - S2 문서상 `size`가 존재하지만, 현재 builder unified type에는 없다.
  - `size`는 즉시 정렬 항목이 아니라 계약 확장 후보로 분류한다.

### ColorField

- 현재 계약 확인:
  - `channel`
  - `colorSpace`
  - `isRequired`
- 추가 대조 필요:
  - `name`
  - `form`
  - `autoFocus`
  - `validationBehavior`
  - `labelPosition`
  - `labelAlign`
  - `necessityIndicator`
- 메모:
  - S2 문서상 지원 범위가 넓지만, 현재 unified type은 매우 좁다.
  - 이 컴포넌트는 즉시 정렬과 계약 확장이 섞여 있으므로 PR 단위를 분리하는 편이 안전하다.

### Tabs

- 현재 계약 확인:
  - `orientation`
- 현재 타입 외 참고:
  - `density`는 shared/types 쪽에는 존재하지만 builder unified type 반영이 필요하다.
- 메모:
  - `density`는 계약 보강 후 정렬 가능성이 있다.
  - `isQuiet`, `isEmphasized`는 현재 근거가 부족하므로 제외한다.

### Form

- 현재 계약 확인:
  - `action`
  - `method`
  - `encType`
  - `target`
  - `autoFocus`
  - `restoreFocus`
  - `validationBehavior`
- 메모:
  - S2 문서상 `labelPosition`, `labelAlign`, `necessityIndicator`, `isEmphasized`, `size`가 있지만, 현재 XStudio 계약에는 없다.
  - 이번 ADR 범위에서는 기존 Form 계약을 노출하는 정렬부터 우선한다.

## 2. 계약 확장 후보

아래 항목은 S2 문서에는 존재하지만, 현재 XStudio 계약에 없거나 경로가 불완전하다.

### Tooltip

- 후보:
  - `containerPadding`
  - `crossOffset`
  - `shouldFlip`
  - `trigger`
- 제외:
  - `variant`
  - `showIcon`
- 메모:
  - 현재 XStudio Tooltip 계약은 `placement`, `offset` 정도만 노출한다.
  - `variant`, `showIcon`은 S2 Tooltip 문서 근거가 부족하므로 이번 범위에서 제거한다.

### Popover

- 후보:
  - `crossOffset`
  - `shouldFlip`
  - `containerPadding`
  - `size`
- 제외:
  - `isNonModal`
- 메모:
  - `trigger`는 styling hook 성격이 강하므로 builder에서 직접 노출할지 별도 판단이 필요하다.

### Breadcrumbs

- 후보:
  - `size`
  - item 단위 `target`
  - item 단위 `rel`
- 제외:
  - `showRoot`
  - `isMultiline`
- 메모:
  - S2 문서 기준으로 `showRoot`, `isMultiline` 근거는 확인되지 않았다.

### Menu

- 후보:
  - trigger 쪽 `align`
  - trigger 쪽 `direction`
  - trigger 쪽 `shouldFlip`
  - trigger 쪽 `trigger`
  - menu 쪽 `size`
- 제외:
  - `closeOnSelect`
- 메모:
  - 현재 XStudio는 `Menu`와 trigger 계약이 분리되어 있지 않아, editor surface를 어디에 둘지 먼저 정해야 한다.

## 3. 공통 정렬 후보

아래 항목은 여러 field 계열 컴포넌트에 공통으로 적용 가능하지만, 반드시 현재 계약 존재 여부를 먼저 확인한다.

- `validationBehavior`
- `isInvalid`
- `labelPosition`
- `staticColor`
- `buildRequiredUpdate` 유틸 통합

## 4. 실행 원칙

- 한 PR에서 계약 없는 prop까지 무리하게 확장하지 않는다.
- editor 추가와 renderer 반영은 한 묶음으로 검증한다.
- `pnpm run type-check`, `pnpm run lint`를 기본 게이트로 사용한다.
- 수동 점검은 최소한 다음을 포함한다.
  - editor에서 값 변경 가능
  - preview 또는 publish 경로에서 값 반영 확인
  - reload 후 값 유지 확인

## 5. 1차 구현 범위

ADR-045의 첫 구현 파동은 "기존 계약이 이미 존재하는데 editor에 노출되지 않는 갭"만 다룬다.

### 대상 파일

- `apps/builder/src/builder/panels/properties/editors/LinkEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/DialogEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/editorUtils.ts`

### 추가할 항목

- `LinkEditor.tsx`
  - `target`
  - `rel`
  - `isQuiet`
  - `staticColor`
- `DialogEditor.tsx`
  - `isDismissable`
  - `role`
- `editorUtils.ts`
  - `STATIC_COLOR_OPTIONS`
  - `LINK_TARGET_OPTIONS`

### 이번 파동에서 제외

- `FormEditor.tsx`
  - 기존 계약과 상위 계약 확장이 섞여 있으므로 ADR-046 이후로 넘긴다.
- `ColorFieldEditor.tsx`
  - editor surface와 타입 계약이 이미 어긋나 있어, 먼저 계약 정리가 필요하다.
- `TabsEditor.tsx`
  - `density` 채택 여부를 ADR-046에서 먼저 결정한다.
