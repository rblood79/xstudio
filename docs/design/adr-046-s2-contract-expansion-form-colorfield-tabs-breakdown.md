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

### 2026-03-26 1차 결정

- `labelPosition`, `labelAlign`, `necessityIndicator`는 **이번 단계에서 채택하지 않는다**.
- 이유:
  - preview가 현재 `Form` 전용 renderer 없이 HTML fallback으로 렌더된다.
  - child field wrapper들이 parent `Form`의 상위 계약을 자동 상속하지 않는다.
  - canvas/WebGL 경로에도 동일한 전파 규칙이 없다.
- 유지:
  - 기존 `Form` 계약(`action`, `method`, `encType`, `target`, `autoFocus`, `restoreFocus`, `validationBehavior`)만 유지한다.
- 채택 전 선행 조건:
  - `Form` 전용 preview renderer 도입
  - parent `Form` → child field 전파 규칙 정의
  - preview/canvas 양쪽에서 동일한 상속 계약 확인
- 후순위 후보:
  - `isEmphasized`
  - `size`

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

### 2026-03-26 1차 결정

- 아래 항목은 **계약으로 승격**한다.
  - `variant`
  - `size`
  - `isInvalid`
  - `autoFocus`
  - `name`
  - `form`
  - `validationBehavior`
  - `necessityIndicator`
  - `labelPosition`
  - `channel`
  - `colorSpace`
- 근거:
  - S2 문서 근거 존재
  - shared `ColorField` 또는 Aria `ColorFieldProps` 경로에서 수용 가능
  - builder type + preview renderer로 같은 변경 세트 안에서 닫을 수 있음
- 구현 반영:
  - builder unified type
  - `ColorFieldEditor`
  - shared `ColorField`
  - preview renderer (`renderColorField`)
- 이번 단계에서 **보류**:
  - `labelAlign`
- 보류 이유:
  - shared `ColorField`와 CSS에 아직 실제 정렬 반영 경로가 없다.

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

### 2026-03-26 1차 결정

- `density`를 첫 계약 확정 항목으로 채택한다.
- 반영 범위:
  - builder unified types
  - `TabsEditor`
  - preview renderer (`renderTabs`)
- 보류 범위:
  - canvas/WebGL 시각 차이 검증
  - `isQuiet`, `isEmphasized` 같은 추가 시각 모드

## 4. 현재 반영 상태

### 구현 완료

- `Tabs.density`
  - builder unified type
  - `TabsEditor`
  - preview renderer (`renderTabs`)
- `ColorField`
  - builder unified type
  - `ColorFieldEditor`
  - shared `ColorField`
  - preview renderer (`renderColorField`)

### 보류

- `Form`
  - 상위 계약 전파 규칙 부재로 보류
- `ColorField.labelAlign`
  - shared/CSS/renderer에 실제 정렬 반영 경로가 없어 보류

## 5. 실행 순서

1. ADR-045 범위의 정렬 작업 수행
2. ADR-046에서 `Form`, `ColorField`, `Tabs` 계약 확정
3. ADR-041 자동 생성 설계에 반영

## 6. Form 후속 설계 초안

`Form` 상위 계약을 채택하려면 preview, canvas, spec 경로가 같은 의미를 공유해야 한다.

### 현재 상태

- preview
  - `Form` 전용 renderer가 없다.
  - field 계열(`TextField`, `NumberField`, `SearchField`, `ColorField`)은 각자 개별 props만 본다.
- canvas/WebGL
  - `PixiForm`은 hit area 중심 컨테이너다.
  - 상위 `Form` 계약이 자식 field 시각에 전파되지 않는다.
- specs
  - `FormSpec`은 컨테이너 시각만 정의한다.
  - `labelPosition`, `labelAlign`, `necessityIndicator` 같은 상위 field 계약은 아직 없다.

### 1단계: Preview 전파 경로 도입

- `packages/shared/src/renderers/FormRenderers.tsx`
  - `renderForm` 추가
- `packages/shared/src/renderers/index.ts`
  - `Form`를 rendererMap에 등록
- 동작
  - shared `Form` 컴포넌트로 감싼 뒤 자식을 `renderElement`로 렌더
  - 이 단계에서는 기존 `Form` 계약(`action`, `method`, `encType`, `target`, `autoFocus`, `restoreFocus`, `validationBehavior`)만 전달
- 상태
  - 구현 완료

### 2단계: Effective Form Contract 도입

- child field renderer가 부모 체인에서 가장 가까운 `Form`을 찾아 fallback 규칙을 적용한다.
- 목적
  - child field가 자기 own prop이 없을 때만 parent `Form` 값을 상속받게 한다.
- 최초 전파 후보
  - `labelPosition`
  - `necessityIndicator`
- 제외
  - `labelAlign`
  - 실제 CSS/renderer 반영 경로가 준비되기 전까지 제외
- 상태
  - preview 기준 구현 완료
  - 적용 대상:
    - `TextField`
    - `NumberField`
    - `SearchField`
    - `ColorField`

### 전파 규칙

- child own prop 우선
- parent `Form` prop fallback
- 둘 다 없으면 component default 사용

### 구현 순서

1. preview `renderForm` 추가
2. `TextField`, `NumberField`, `SearchField`, `ColorField`에 fallback 규칙 적용
3. canvas/WebGL에 동일 의미의 상속 규칙 추가
4. 그 후에만 `Form.labelPosition`, `Form.necessityIndicator` 채택 여부 재판단

### 현재 남은 작업

- canvas/WebGL
  - `Form` 상위 계약 fallback을 동일 의미로 반영
- 채택 재판단
  - preview/canvas 정합성 확인 후 `Form.labelPosition`, `Form.necessityIndicator` 채택 여부 판단

### 보류 조건

- `labelAlign`
  - shared field 컴포넌트의 실제 레이아웃 정렬 구현이 먼저 필요하다.
- `isEmphasized`, `size`
  - 상위 컨테이너 계약인지 field 시각 프리셋인지 의미가 아직 불명확하다.
