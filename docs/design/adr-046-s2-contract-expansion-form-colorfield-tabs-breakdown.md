# ADR-046 Breakdown: Form, ColorField, Tabs 계약 확장

이 문서는 [ADR-046](/Users/admin/work/xstudio/docs/adr/046-s2-contract-expansion-form-colorfield-tabs.md)의 구현 전 검토 메모다.

## 목표

- `Form`, `ColorField`, `Tabs`에 대해 자동 생성기 입력으로 사용할 제품 계약 후보를 정리한다.
- 채택 후보와 보류 후보를 나눈다.

## 1. Form

### 현재 계약

- `action`
- `method`
- `encType`
- `target`
- `autoFocus`
- `restoreFocus`
- `validationBehavior`

### S2 기반 확장 후보

- `labelPosition`
- `labelAlign`
- `necessityIndicator`
- `isEmphasized`
- `size`

### 검토 포인트

- 이 값들이 자식 field에 어떻게 전파되는지 규칙이 필요하다.
- 전파 규칙이 없으면 editor만 늘어나고 실제 렌더는 무의미해질 수 있다.

## 2. ColorField

### 현재 계약

- `label`
- `description`
- `errorMessage`
- `value`
- `defaultValue`
- `isDisabled`
- `isReadOnly`
- `isRequired`
- `channel`
- `colorSpace`

### S2 기반 확장 후보

- `name`
- `form`
- `autoFocus`
- `validationBehavior`
- `labelPosition`
- `labelAlign`
- `necessityIndicator`
- `size`

### 정리 대상

- 현재 editor에 있는 `variant`, `size`, `isInvalid`, `necessityIndicator`는 타입 계약과 불일치 가능성이 있다.
- 구현 전에 "editor가 먼저 만든 임시 surface"를 걷어내거나 정식 계약으로 승격할지 결정해야 한다.

## 3. Tabs

### 현재 계약

- `selectedKey`
- `defaultSelectedKey`
- `orientation`

### 확장 후보

- `density`

### 제외 후보

- `isQuiet`
- `isEmphasized`

### 검토 포인트

- `density`는 shared 타입과 S2 문서 양쪽 근거가 있어 우선순위가 높다.
- 나머지 시각 모드 prop는 현재 채택 근거가 약하다.

## 4. 1차 구현 범위

ADR-045 기준 실제 첫 구현 파동은 계약 확장이 아니라 기존 계약 정렬에 집중한다.

### 포함

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

### 보류

- `FormEditor.tsx`
  - 현재 계약 노출 범위는 이미 비교적 넓으므로, ADR-046 결정 후 상위 계약을 추가한다.
- `ColorFieldEditor.tsx`
  - 기존 surface와 타입 계약이 어긋나 있으므로, 정식 계약 결정 없이 바로 확장하지 않는다.
- `TabsEditor.tsx`
  - `density` 채택 여부를 ADR-046에서 먼저 확정한다.

## 5. 실행 순서

1. ADR-045 범위의 정렬 작업 수행
2. ADR-046에서 `Form`, `ColorField`, `Tabs` 계약 확정
3. ADR-041 자동 생성 설계에 반영
