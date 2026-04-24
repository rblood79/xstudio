# ADR-041 Property Editor Transition Breakdown

## 목적

ADR-041 1차 대상 12개가 모두 `spec.properties` 기반 generic editor 입력을 갖게 된 이후,
다음 두 작업을 안전하게 진행하기 위한 정리 문서다.

1. 기존 수동 editor 파일 정리
2. 등급 B/C 하이브리드 전환 시작

---

## 1차 12개 수동 Editor 정리 분류

### 즉시 삭제 가능 후보

아래 파일들은 현재 `registry.ts`가 generic editor를 우선 사용하고, generic surface가 수동 editor와 사실상 동일하므로
별도 수동 editor 유지 가치가 낮다.

- `apps/builder/src/builder/panels/properties/editors/BadgeEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/SeparatorEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/StatusLightEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/MeterEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/ProgressBarEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/LinkEditor.tsx`

삭제 기준

- `spec.properties`가 수동 editor의 섹션/필드 집합을 그대로 표현한다.
- preview/shared path가 해당 surface를 실제 소비한다.
- `derivedUpdateFn` 같은 예외 처리 없이도 동일 동작을 낸다.

### 비교 기준으로 잠시 보류할 후보

아래 파일들은 generic editor 입력은 닫혔지만, overlay/provider 성격 또는 상속/파생 규칙 때문에
한 번 더 시각/행동 검증 후 제거하는 편이 안전하다.

- `apps/builder/src/builder/panels/properties/editors/ToastEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/FormEditor.tsx`
- `apps/builder/src/builder/panels/properties/editors/ColorFieldEditor.tsx`

보류 이유

- `Toast`
  - provider 성격이라 preview가 editor surface를 “데이터로는” 소비해도 실제 동작 정합성을 한 번 더 보는 편이 안전하다.
- `Form`
  - parent → child 상속 규칙(`labelPosition`, `labelAlign`, `necessityIndicator`)이 포함된다.
- `ColorField`
  - `derivedUpdateFn`으로 `isRequired + necessityIndicator`를 동시 갱신한다.

### 삭제 순서 제안

1. 즉시 삭제 가능 6개를 먼저 제거
2. 보류 6개는 시각/행동 점검 후 제거
3. 각 삭제 PR에서는 `componentMetadata.inspector.editorName` fallback 의존 여부를 같이 점검

---

## 등급 B/C 하이브리드 시작점

### 1순위 대상: Button

선정 이유

- 현재 `ButtonEditor`는 파일 크기와 메모이제이션이 과하지만, 실질적으로는
  `Content / Design / Behavior / Link / Form / Icon`
  섹션으로 나뉜 전형적인 하이브리드 케이스다.
- 완전 자동 생성보다는 `Design`과 `Behavior` 일부를 generic으로 추출하고,
  `Icon`, `Link`, `Form`의 조건부 섹션만 수동으로 남기는 편이 리스크가 낮다.

### Button의 현재 난점

- `visibleWhen`이 단순하지 않다.
  - `href`가 있을 때만 `Link` 섹션 노출
  - `type === "submit" | "reset"`일 때만 `Form` 섹션 노출
  - `type === "submit"`일 때만 submit 전용 필드 추가 노출
- `Icon` 섹션은 `PropertyIconPicker`가 필요하다.
- 일부 필드는 DOM/폼/링크 계약이 서로 얽혀 있다.
  - `href`, `target`, `rel`
  - `type`, `form`, `formAction`, `formMethod`, `formNoValidate`, `formTarget`

### Button 하이브리드 목표 범위

#### generic으로 올릴 후보

- `Content`
  - `children`
- `Design`
  - `variant`
  - `fillStyle`
  - `size`
- `Behavior`
  - `type`
  - `autoFocus`
  - `isPending`
  - `isDisabled`

#### 수동 유지 후보

- `Icon`
  - `iconName`
  - `iconPosition`
  - `iconStrokeWidth`
- `Link`
  - `href`
  - `target`
  - `rel`
- `Form`
  - `form`
  - `name`
  - `value`
  - `formAction`
  - `formMethod`
  - `formNoValidate`
  - `formTarget`

### 구현 방식 제안

1. `Button.spec.ts`에 `properties`를 추가하되 `Design` + `Behavior`까지만 넣는다.
2. `GenericPropertyEditor`에 `afterSections` 또는 `customSectionRenderer` 같은 하이브리드 슬롯을 추가한다.
3. `ButtonEditor`는 전체를 유지하지 않고,
   `Icon/Link/Form` 전용 wrapper로 축소한다.
4. 최종적으로는 `ButtonEditor`를 “수동 보조 섹션” 컴포넌트로 바꾸고,
   기본 섹션은 generic editor가 담당하게 한다.

### Button 선행 조건

- `icon` field type 지원
- `visibleWhen`이 현재보다 조금 더 풍부해져야 한다.
  - `truthy key`
  - `equals`
  - `oneOf`
- Generic editor에 하이브리드 주입 지점이 필요하다.

---

## 다음 구현 순서

1. 즉시 삭제 가능 6개 수동 editor 제거 PR
2. `Button` 하이브리드용 generic slot 설계
3. `Button.spec.ts`에 `Design/Behavior` schema 추가
4. `ButtonEditor`를 `Icon/Link/Form` 보조 섹션 전용으로 축소

---

## 2026-03-26 진행 상태

### 수동 editor 정리 완료

즉시 삭제 가능 후보 6개는 코드에서 제거 완료.

- `BadgeEditor.tsx`
- `SeparatorEditor.tsx`
- `StatusLightEditor.tsx`
- `MeterEditor.tsx`
- `ProgressBarEditor.tsx`
- `LinkEditor.tsx`

정리 범위

- `apps/builder/src/builder/panels/properties/editors/index.ts` export 제거
- `registry.ts` / `specRegistry.ts`는 수정 없이 generic 경로 유지

검증

- `npm run type-check` 통과
- builder 대상 eslint 통과

### Button 하이브리드 구현 지점

현재 `ButtonEditor`는 사실상 아래 6개 섹션으로 분해된다.

1. `Basic`
2. `Content`
3. `Design`
4. `Icon`
5. `Behavior`
6. `Link`
7. `Form`

이 중 하이브리드 1차에서 generic으로 올릴 섹션은 다음과 같다.

- `Content`
  - `children`
- `Design`
  - `variant`
  - `fillStyle`
  - `size`
- `Behavior`
  - `type`
  - `autoFocus`
  - `isPending`
  - `isDisabled`

수동 유지 섹션은 다음과 같다.

- `Icon`
  - `PropertyIconPicker`
  - `iconName`, `iconPosition`, `iconStrokeWidth`
- `Link`
  - `href`, `target`, `rel`
  - `href`가 truthy일 때만 노출
- `Form`
  - `form`, `name`, `value`, `formAction`, `formMethod`, `formNoValidate`, `formTarget`
  - `type === submit | reset`일 때 노출
  - `type === submit`일 때 submit 전용 필드 추가 노출

### Button 하이브리드 선행 코드 작업

1. `visibleWhen` 확장
   - 현재 `equals`, `oneOf`는 있지만, `truthy key` 표현이 필요
   - `href` 기반 `Link` 섹션 노출에 사용
2. generic editor 보조 섹션 슬롯
   - `afterSections` 또는 `customSections` 주입 지점 필요
3. `icon` field type 지원
   - 추후 `Button` icon 섹션 generic 전환 여부 판단에 필요

### 2026-03-26 선행 코드 반영

- `GenericPropertyEditor.renderAfterSections` 추가
  - 하이브리드 에디터가 generic 섹션 뒤에 수동 섹션을 붙일 수 있음
- `VisibilityCondition.truthy` 추가
  - `href` 존재 여부 기반 섹션 노출 가능

### 2026-03-26 Button 하이브리드 완료

- `Button.spec.ts`
  - `Content`, `Design`, `Behavior` schema 추가
- `specRegistry.ts`
  - `Button` 등록
- `registry.ts`
  - `Button`은 generic editor 뒤에 `ButtonHybridAfterSections`를 붙이도록 연결
- `ButtonEditor.tsx`
  - 수동 editor를 `Icon`, `Link`, `Form` 보조 섹션 전용으로 축소

정리 결과

- generic 담당
  - `Content`
  - `Design`
  - `Behavior`
- 수동 보조 섹션 담당
  - `Icon`
  - `Link`
  - `Form`

검증

- `npm run type-check` 통과
- `ButtonEditor.tsx`, `registry.ts`, `specRegistry.ts` 대상 eslint 통과

### 다음 하이브리드 후보

다음 후보는 `TextField`보다 `SearchField`를 우선한다.

- `SearchField`
  - child sync는 `label`, `placeholder` 두 축으로 제한적이다.
  - `Validation`, `Behavior`, `Form Integration`은 순수 prop 편집이라 generic 분리가 쉽다.
- `TextField`
  - `size` 변경 시 child label style 보정까지 포함되어 있어 첫 하이브리드 대상으로는 무겁다.

### 2026-03-26 SearchField 하이브리드 시작

- `SearchField.spec.ts`
  - `Design`, `Input Mode`, `Validation`, `Behavior`, `Form Integration` schema 추가
- `SearchFieldElementProps`
  - `labelPosition`, `necessityIndicator`, `isInvalid` 계약 반영
- `specRegistry.ts`
  - `SearchField` 등록
- `registry.ts`
  - `SearchField`는 generic editor 뒤에 `SearchFieldHybridAfterSections`를 붙이도록 연결
- `SearchFieldEditor.tsx`
  - 수동 editor를 `Content` 보조 섹션 전용으로 축소

정리 결과

- generic 담당
  - `Design`
  - `Input Mode`
  - `Validation`
  - `Behavior`
  - `Form Integration`
- 수동 보조 섹션 담당
  - `Content`
    - `label`
    - `value`
    - `placeholder`
    - `description`

판단 근거

- `label`, `placeholder`는 child sync가 필요하므로 수동 유지가 안전하다.
- 나머지 섹션은 순수 prop 편집이라 generic 분리가 가능하다.

주의 사항

- `SearchFieldEditor.tsx`는 현재 삭제 대상이 아니다.
- inspector entry는 generic이 맡지만, `SearchFieldHybridAfterSections`를 제공하는 wrapper 파일은 계속 필요하다.

### 2026-03-26 TextField 하이브리드 시작

- `TextField.spec.ts`
  - `Input Type`, `Validation`, `Behavior`, `Form Integration` schema 추가
- `TextFieldElementProps`
  - `type: "number"` 축 반영
  - `autoCorrect`를 boolean으로 정리
  - `labelPosition`, `necessityIndicator`, `isInvalid` 계약 반영
- `specRegistry.ts`
  - `TextField` 등록
- `registry.ts`
  - `TextField`는 generic editor 뒤에 `TextFieldHybridAfterSections`를 붙이도록 연결
- `TextFieldEditor.tsx`
  - 수동 editor를 `Design`, `Content` 보조 섹션 전용으로 축소

정리 결과

- generic 담당
  - `Input Type`
  - `Validation`
  - `Behavior`
  - `Form Integration`
- 수동 보조 섹션 담당
  - `Design`
    - `size`
    - `labelPosition`
  - `Content`
    - `label`
    - `value`
    - `placeholder`
    - `description`

판단 근거

- `size` 변경은 child `Input` size 동기화와 `Label` fontSize 보정이 함께 필요하다.
- `label`, `placeholder`는 child sync가 필요하므로 수동 유지가 안전하다.

주의 사항

- `TextFieldEditor.tsx`도 현재 삭제 대상이 아니다.
- inspector entry는 generic이 맡지만, `TextFieldHybridAfterSections`를 제공하는 wrapper 파일은 계속 필요하다.

### NumberField 검토 결과

`NumberField`는 다음 하이브리드 후보로 볼 수는 있지만, 지금 바로 전환할 단계는 아니다.

현재 구조상 난점

- `Content`
  - `label`, `placeholder` child sync가 필요하다.
- `Internationalization`
  - `locale`, `formatStyle`, `currency`, `unit`, `notation`, `decimals`, `showGroupSeparator`
  - `formatStyle` 값에 따라 조건부 필드가 갈린다.
- `Advanced Format Options`
  - `formatOptions.minimumFractionDigits`
  - `formatOptions.maximumFractionDigits`
  - 중첩 객체 업데이트가 필요하다.
- `Validation`
  - `necessityIndicator`가 `isRequired`와 함께 움직인다.

현재 판단

- 즉시 generic으로 올릴 수 있는 순수 섹션과
  중첩 객체/child sync/파생 업데이트가 필요한 섹션이 섞여 있다.
- 따라서 `NumberField`는 `Button`, `SearchField`, `TextField`와 같은
  1차 하이브리드 패턴보다 한 단계 뒤에 두는 것이 안전하다.

권장 선행 작업

1. generic field에 nested path 또는 object-merge update 지원 추가 여부 결정
2. `formatOptions`를 별도 수동 보조 섹션으로 남길지 결정
3. 그 다음 `Internationalization` 일부만 generic으로 먼저 분리할지 재판단

### 2026-03-26 NumberField 선행 기반 반영

- `BaseFieldDef.updatePath` 추가
  - generic field가 중첩 객체 경로를 대상으로 업데이트할 수 있음
- `SpecField`
  - `updatePath` 기반 현재값 조회 지원
  - `updatePath` 기반 object-merge update 지원

의미

- 이제 spec schema에서 `formatOptions.minimumFractionDigits` 같은 값을
  top-level prop flatten 없이 다룰 수 있는 기반이 생겼다.
- 아직 `NumberField`를 generic/hybrid로 전환한 것은 아니다.
- 다음 단계에서 `formatOptions`를 generic으로 올릴지, 수동 보조 섹션으로 둘지 결정하면 된다.

### 2026-03-26 NumberField partial hybrid 시작

- `NumberField.spec.ts`
  - `Internationalization`
  - `Advanced Format Options`
  - `Validation`
  - `Behavior`
  - `Form Integration`
  schema 추가
- `NumberFieldElementProps`
  - `labelPosition`, `necessityIndicator`, `isInvalid` 계약 반영
- `specRegistry.ts`
  - `NumberField` 등록
- `registry.ts`
  - `NumberField`는 generic editor 뒤에 `NumberFieldHybridAfterSections`를 붙이도록 연결
- `NumberFieldEditor.tsx`
  - 수동 editor를 `Design`, `Content` 보조 섹션 전용으로 축소

정리 결과

- generic 담당
  - `Internationalization`
  - `Advanced Format Options`
  - `Validation`
  - `Behavior`
  - `Form Integration`
- 수동 보조 섹션 담당
  - `Design`
    - `labelPosition`
  - `Content`
    - `label`
    - `value`
    - `placeholder`
    - `description`

판단

- `NumberFieldEditor`는 지금 삭제하면 안 된다.
- `label`, `placeholder` child sync와 `Design`의 `labelPosition` 수동 섹션이 남아 있기 때문이다.

### 2026-03-26 NumberField preview parity 반영

- `NumberField.tsx`
  - `notation`에 `scientific`, `engineering` 추가
  - `formatOptions` override prop 추가
- `renderNumberField`
  - `locale`
  - `formatStyle`
  - `currency`
  - `unit`
  - `notation`
  - `decimals`
  - `showGroupSeparator`
  - `formatOptions`
  를 preview로 전달

결과

- inspector generic surface와 preview formatting surface가 같은 축을 보게 됐다.

### 하이브리드 공통 패턴

현재 `Button`, `SearchField`, `TextField`, `NumberField`는 같은 공통 패턴으로 정리된다.

1. `spec.properties`에는 순수 prop 편집 섹션만 올린다.
2. child sync 또는 특수 UI가 필요한 섹션은 `*HybridAfterSections`로 남긴다.
3. `registry.ts`는 해당 tag에 대해 generic editor 뒤에 보조 섹션을 붙인다.
4. 수동 editor 파일은 “전체 editor”가 아니라 “보조 섹션 wrapper” 역할만 한다.

현재 공통 분류

- `Button`
  - generic: `Content`, `Design`, `Behavior`
  - manual: `Icon`, `Link`, `Form`
- `SearchField`
  - generic: `Design`, `Input Mode`, `Validation`, `Behavior`, `Form Integration`
  - manual: `Content`
- `TextField`
  - generic: `Input Type`, `Validation`, `Behavior`, `Form Integration`
  - manual: `Design`, `Content`
- `NumberField`
  - generic: `Internationalization`, `Advanced Format Options`, `Validation`, `Behavior`, `Form Integration`
  - manual: `Design`, `Content`

### 다음 후보 판단: Popover 우선

`ComboBox`와 `Popover` 중 다음 대상으로는 `Popover`를 먼저 가져가는 편이 맞다.

이유

- `Popover`
  - 현재 수동 surface가 작다.
  - `Content`
  - `Position`
  - 이미 generic schema와 preview renderer가 배치 2에서 닫혀 있다.
  - 남은 작업은 수동 editor 제거 또는 wrapper 불필요 여부 점검에 가깝다.

- `ComboBox`
  - child sync가 두 단계다.
    - `label` direct child sync
    - `placeholder` grandchild sync
  - collection item 관리가 포함된다.
    - `ComboBoxItem`
    - 선택 옵션 편집
    - data binding
  - size 변경 시 child/grandchild style 보정이 들어간다.
  - 즉 `Button/SearchField/TextField/NumberField`보다도 더 복합적인 하이브리드다.

결론

- 다음 실제 작업은 `Popover` 수동 editor 제거 가능 여부를 먼저 닫는 것이 안전하다.
- `ComboBox`는 별도 하이브리드 설계 문단을 만든 뒤에 들어가는 편이 맞다.

### 2026-03-26 Popover 수동 editor 제거 완료

- `PopoverEditor.tsx` 삭제
- `editors/index.ts` export 제거

근거

- `Popover`는 배치 2에서 generic schema와 preview renderer가 이미 닫혀 있었다.
- 별도 child sync, derived update, provider 전용 보조 섹션이 없다.
- 따라서 수동 editor 파일을 유지할 실익이 없었다.

재분류

- 즉시 삭제 완료 누적
  - `BadgeEditor.tsx`
  - `SeparatorEditor.tsx`
  - `StatusLightEditor.tsx`
  - `MeterEditor.tsx`
  - `ProgressBarEditor.tsx`
  - `LinkEditor.tsx`
  - `PopoverEditor.tsx`

- 다음 즉시 삭제 후보
  - 없음

- 계속 보류
  - 없음

재분류 근거

- `TooltipEditor.tsx`
  - 현재 수동 surface가 `Content`, `Position`뿐이다.
  - generic schema와 preview renderer가 이미 동일 축을 소비한다.
- `DialogEditor.tsx`
  - 현재 수동 surface가 `Content`, `Behavior`뿐이다.
  - generic schema와 preview renderer가 이미 동일 축을 소비한다.

### 2026-03-26 Tooltip/Dialog/Toast 수동 editor 제거 완료

- `TooltipEditor.tsx` 삭제
- `DialogEditor.tsx` 삭제
- `ToastEditor.tsx` 삭제
- `editors/index.ts` export 제거

근거

- 세 컴포넌트 모두 수동 surface가 작다.
- generic schema와 preview renderer가 이미 같은 축을 소비한다.
- 별도 child sync, derived update, hybrid after-sections가 없다.

즉시 삭제 완료 누적

- `BadgeEditor.tsx`
- `SeparatorEditor.tsx`
- `StatusLightEditor.tsx`
- `MeterEditor.tsx`
- `ProgressBarEditor.tsx`
- `LinkEditor.tsx`
- `PopoverEditor.tsx`
- `TooltipEditor.tsx`
- `DialogEditor.tsx`
- `ToastEditor.tsx`
- `FormEditor.tsx`

### 2026-03-26 Form 수동 editor 제거 완료

- `FormEditor.tsx` 삭제
- `editors/index.ts` export 제거

근거

- `Form`은 현재 generic schema가 수동 surface를 전부 표현한다.
- child sync, derived update, hybrid after-sections가 없다.
- 상속 규칙은 renderer/canvas 쪽 구현 문제였고 editor wrapper 유지와는 무관하다.

### Form vs ColorField 판단

두 컴포넌트 모두 wrapper-only로 줄일 필요가 거의 없지만, 우선순위는 `Form`이 먼저다.

- `Form`
  - 전 필드가 순수 direct prop 편집이다.
  - generic schema가 이미 수동 surface를 그대로 표현한다.
  - 보조 섹션이나 derived update가 없다.

- `ColorField`
  - 현재도 child sync는 없고
  - `Required`가 `derivedUpdateFn`으로 generic 경로에서 안정적으로 대체된다.

결론

- `FormEditor.tsx`는 즉시 제거 가능
- 다음 정리 대상은 `ColorFieldEditor.tsx`

### 2026-03-26 ColorField 수동 editor 제거 완료

- `ColorFieldEditor.tsx` 삭제
- `editors/index.ts` export 제거

근거

- `ColorField`는 generic schema가 수동 surface를 전부 표현한다.
- `Required` 동작은 `derivedUpdateFn`으로 동일하게 대체된다.
- child sync, hybrid after-sections가 없다.

즉시 삭제 완료 누적

- `BadgeEditor.tsx`
- `SeparatorEditor.tsx`
- `StatusLightEditor.tsx`
- `MeterEditor.tsx`
- `ProgressBarEditor.tsx`
- `LinkEditor.tsx`
- `PopoverEditor.tsx`
- `TooltipEditor.tsx`
- `DialogEditor.tsx`
- `ToastEditor.tsx`
- `FormEditor.tsx`
- `ColorFieldEditor.tsx`

### Select 검토 결과

`Select`는 다음 하이브리드 후보로 바로 가져갈 대상이 아니다.

이유

- child sync가 두 단계다.
  - `label` direct child sync
  - `placeholder` grandchild sync (`SelectTrigger` → `SelectValue`)
- size 변경 시 child/grandchild fontSize 보정이 들어간다.
- collection item 관리가 포함된다.
  - `SelectItem`
  - 개별 item 편집 UI
  - 선택 item 모드 전환
- `dataBinding`이 포함된다.
- `selectionMode`, `multipleDisplayMode`, `defaultSelectedKey` 등 상태 축도 많다.

판단

- `Select`는 `Button/SearchField/TextField/NumberField` 같은 단순 하이브리드 패턴보다
  `ComboBox`에 더 가깝다.
- 따라서 `Select`를 먼저 가져가는 전략은 철회한다.

결론

- `Select`와 `ComboBox`는 같은 고난도 후보군으로 묶어 별도 설계가 필요하다.

### Select/ComboBox 별도 설계 트랙

`Select`와 `ComboBox`는 앞선 하이브리드 4개와 다른 종류의 복잡도를 가진다.

공통 난점

- collection item 관리가 포함된다.
  - `SelectItem` / `ComboBoxItem`
  - 개별 item 편집 모드
  - item 추가/삭제
- data binding이 포함된다.
- child sync 또는 grandchild sync가 포함된다.
- size 변경 시 child/grandchild style 보정이 들어간다.
- 단순 field 나열이 아니라 "전체 설정 모드 ↔ 개별 item 편집 모드" 전환이 있다.

즉, 이 둘은 `Button/SearchField/TextField/NumberField`처럼
"일부 섹션만 generic으로 옮기고 보조 섹션을 붙이는" 수준보다 한 단계 어렵다.

권장 분해 방식

1. 전체 설정 화면
   - generic으로 옮길 수 있는 섹션
2. child/grandchild sync가 필요한 섹션
   - 수동 보조 섹션 유지
3. item management / item detail 편집
   - 별도 수동 서브플로우 유지

필요한 추가 기반

- `childSync` 실제 렌더링 지원
- grandchild sync용 확장
- collection item 전용 custom field 또는 section slot
- "item edit mode"를 generic editor 바깥에서 유지하는 구조

### 구현 순서 결정: Select 먼저

둘 중 먼저 들어갈 후보는 `Select`다.

이유

- `Select`는 자유 입력이 없다.
- `ComboBox`보다 계약 축이 조금 더 닫혀 있다.
- `ComboBox`의 추가 복잡도:
  - `allowsCustomValue`
  - `textValue`
  - 입력/선택 혼합 UX

따라서 권장 순서는 다음과 같다.

1. `Select` 하이브리드 설계
2. `Select` 구현
3. 같은 패턴을 `ComboBox`로 확장

### Select 하이브리드 경계 확정

`Select`는 아래 3층으로 분리하는 방식이 가장 안전하다.

#### 1. Generic 섹션

직접 prop 편집만 하는 섹션은 generic으로 올린다.

- `State`
  - `selectionMode`
  - `multipleDisplayMode`
  - `selectedValue`
  - `defaultSelectedKey`
  - `disallowEmptySelection`
  - `necessityIndicator` (`derivedUpdateFn` 사용)
- `Behavior`
  - `isDisabled`
  - `isReadOnly`
  - `autoFocus`
- `Form Integration`
  - `name`
  - `validationBehavior`

#### 2. Manual 보조 섹션

child/grandchild sync 또는 size 보정이 필요한 섹션은 수동 유지한다.

- `Design`
  - `size`
  - `labelPosition`
- `Content`
  - `label`
  - `description`
  - `errorMessage`
  - `placeholder`
- `Data Binding`
  - `PropertyDataBinding`
- `Trigger Behavior`
  - `menuTrigger`

#### 3. Item 관리 서브플로우

generic editor 안에 넣지 않고 별도 수동 서브플로우로 유지한다.

- `Item Management`
  - item 목록
  - add item
  - edit item 진입
- `Selected Item Edit Mode`
  - item `label`
  - item `value`
  - item `isDisabled`
  - item delete

판단 근거

- `State`, `Behavior`, `Form Integration`은 현재도 direct prop update만 한다.
- `Design`은 size 변경 시 `Label`, `SelectValue`의 fontSize 보정이 들어간다.
- `Content`는 `label` direct child sync, `placeholder` grandchild sync가 필요하다.
- `menuTrigger`는 현재 shared/preview 계약에서 충분히 닫혀 있지 않아서 generic schema에 올리지 않는다.
- `Data Binding`과 `Item Management`는 generic field가 아니라 복합 UI다.

### Select 구현 기준

구현은 아래 순서로 가는 것이 안전하다.

1. `Select.spec.ts`에 generic 섹션(`State`, `Behavior`, `Form Integration`) 추가
2. `specRegistry.ts`에 `Select` 등록
3. `SelectEditor.tsx`를
   - `SelectHybridAfterSections`
   - item edit mode 유지
   구조로 축소
4. `registry.ts`에서 `SelectHybridAfterSections` 연결

### Select partial hybrid 시작

현재 코드 기준으로 `Select`는 partial hybrid 상태다.

- generic 담당
  - `State`
    - `selectionMode`
    - `multipleDisplayMode`
    - `selectedValue`
    - `defaultSelectedKey`
    - `disallowEmptySelection`
    - `necessityIndicator`
  - `Behavior`
    - `isDisabled`
    - `isReadOnly`
    - `autoFocus`
  - `Form Integration`
    - `name`
    - `validationBehavior`
- 수동 보조 섹션 담당
  - `Design`
    - `size`
    - `labelPosition`
  - `Content`
    - `label`
    - `description`
    - `errorMessage`
    - `placeholder`
  - `Trigger Behavior`
    - `menuTrigger`
  - `Data Binding`
- 별도 수동 서브플로우 유지
  - `Item Management`
  - `Selected Item Edit Mode`

구현 메모

- `Select.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `Select`를 등록했다.
- `SelectEditor.tsx`는 `SelectHybridAfterSections` + item edit mode 유지 구조로 축소했다.
- `registry.ts`는 `Select`에 대해 generic editor 뒤에 `SelectHybridAfterSections`를 붙인다.

남은 parity 확인 항목

- `menuTrigger`는 아직 수동 유지다.
- item 관리 UI와 preview/data binding 동작은 hybrid 경로에서 한 번 더 교차 점검이 필요하다.

### ComboBox 하이브리드 경계 확정

`ComboBox`는 `Select`보다 복잡하지만, direct prop 편집 영역과 수동 서브플로우를 분리할 수 있다.

- generic 담당
  - `State`
    - `selectedValue`
    - `allowsCustomValue`
    - `necessityIndicator`
  - `Behavior`
    - `isDisabled`
    - `isReadOnly`
    - `autoFocus`
  - `Form Integration`
    - `name`
    - `validationBehavior`
- 수동 보조 섹션 담당
  - `Design`
    - `variant`
    - `size`
    - `labelPosition`
    - `iconName`
  - `Content`
    - `label`
    - `description`
    - `errorMessage`
    - `placeholder`
  - `Trigger Behavior`
    - `menuTrigger`
  - `Data Binding`
- 별도 수동 서브플로우 유지
  - `Item Management`
  - `Selected Item Edit Mode`

판단 근거

- `selectedValue`, `allowsCustomValue`, `isDisabled`, `isReadOnly`, `autoFocus`, `name`, `validationBehavior`는 direct prop update만 한다.
- `necessityIndicator`는 `derivedUpdateFn`으로 `isRequired`와 함께 움직일 수 있다.
- `size`는 `Label`, `ComboBoxInput`의 fontSize 보정이 필요하다.
- `label`은 direct child sync, `placeholder`는 grandchild sync가 필요하다.
- `menuTrigger`는 preview/shared 계약이 충분히 닫혀 있지 않아 generic schema에 올리지 않는다.
- item 관리와 data binding은 복합 UI라 수동 유지가 맞다.

### ComboBox partial hybrid 시작

현재 코드 기준으로 `ComboBox`는 partial hybrid 상태다.

- `ComboBox.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `ComboBox`를 등록했다.
- `ComboBoxEditor.tsx`는 `ComboBoxHybridAfterSections` + item edit mode 유지 구조로 축소했다.
- `registry.ts`는 `ComboBox`에 대해 generic editor 뒤에 `ComboBoxHybridAfterSections`를 붙인다.

현재 분담

- generic
  - `State`
  - `Behavior`
  - `Form Integration`
- 수동
  - `Design`
  - `Content`
  - `Trigger Behavior`
  - `Data Binding`
  - `Item Management`
  - `Selected Item Edit Mode`

추가 정리

- builder 타입에서 `ComboBox` 계약 축을 실제 editor/shared 기준으로 정리했다.
  - `size`: `xs | sm | md | lg | xl`
  - `variant`: `default | accent | negative`
  - `isInvalid`
  - `labelPosition`
  - `necessityIndicator`
- preview renderer도 다음 값을 실제로 전달하도록 맞췄다.
  - `variant`
  - `size`
  - `autoFocus`
  - `menuTrigger`
  - `validationBehavior`

남은 parity 확인 항목

- item 관리 UI와 preview/data binding 동작은 hybrid 경로에서 한 번 더 교차 점검이 필요하다.

### Select / ComboBox 공통 패턴 정리

두 에디터는 같은 상위 패턴을 공유한다.

- generic
  - direct prop update만 하는 `State`, `Behavior`, `Form Integration`
- 수동 보조 섹션
  - `Design`
  - `Content`
  - `Trigger Behavior`
  - `Data Binding`
- 별도 수동 서브플로우
  - `Item Management`
  - `Selected Item Edit Mode`

공통 구현 포인트

- `useCollectionItemManager`로 collection item CRUD를 처리한다.
- `label`은 direct child sync, `placeholder`는 grandchild sync로 반영한다.
- `size`는 child/grandchild fontSize 보정이 필요하다.
- `dataBinding`은 generic field가 아니라 복합 UI를 유지한다.

지금 당장 공통 컴포넌트로 추출하지 않는 이유

- `Select`와 `ComboBox`는 겉보기 구조는 같지만, 실제 손자 경로가 다르다.
  - `SelectTrigger -> SelectValue`
  - `ComboBoxWrapper -> ComboBoxInput`
- `ComboBox`만 `variant`, `iconName`, `allowsCustomValue`, `defaultSelectedKey` 보정이 추가된다.
- premature extraction을 하면 공통화보다 분기 비용이 더 커진다.

따라서 현 단계의 권장 방향은 다음과 같다.

1. 공통 패턴은 문서로 고정한다.
2. 세 번째 collection 하이브리드 후보를 하나 더 구현한다.
3. 그 뒤에야 `CollectionHybridAfterSections` 추출 여부를 재판단한다.

### 다음 고난도 후보 결정

다음 후보는 `GridList`로 잡는 편이 안전하다.

이유

- `GridList`는 `Select/ComboBox`와 같은 collection item 관리 구조를 가진다.
- 하지만 `ListBox`보다 데이터 스키마 자동 생성 흐름이 단순하다.
- `ListBox`는 `Field` 자동 생성, DataTable schema 해석, IndexedDB 생성 플로우까지 포함해서 별도 난점이 더 크다.

현재 우선순위

1. `GridList`
2. `ListBox`
3. `TagGroup` / `Tabs` / `Tree` / `Table` 재평가

### GridList 하이브리드 경계 확정

`GridList`는 `Select/ComboBox`와 같은 collection 계열이지만, sync 의존이 적어서 더 많은 섹션을 generic으로 올릴 수 있다.

- generic 담당
  - `Content`
    - `label`
    - `description`
    - `errorMessage`
  - `Layout`
    - `variant`
    - `size`
    - `layout`
    - `columns`
  - `State`
    - `selectionMode`
    - `selectionBehavior`
    - `disallowEmptySelection`
    - `isRequired`
  - `Behavior`
    - `isDisabled`
    - `autoFocus`
    - `allowsDragging`
    - `renderEmptyState`
  - `Form Integration`
    - `name`
    - `validationBehavior`
- 수동 보조 섹션 담당
  - `Filtering`
    - `filterText`
    - `filterFields`
  - `Data Binding`
- 별도 수동 서브플로우 유지
  - `Item Management`
  - `Selected Item Edit Mode`

판단 근거

- `GridList`는 `Select/ComboBox`처럼 child/grandchild sync가 없다.
- `Content`, `Layout`, `State`, `Behavior`, `Form Integration`은 direct prop update만 한다.
- `Filtering`은 `filterFields`를 CSV 문자열로 편집하는 별도 UI가 필요하다.
- `Data Binding`과 item 관리 UI는 여전히 복합 흐름이라 수동 유지가 맞다.

### GridList partial hybrid 시작

현재 코드 기준으로 `GridList`는 partial hybrid 상태다.

- `GridList.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `GridList`를 등록했다.
- `GridListEditor.tsx`는 `GridListHybridAfterSections` + item edit mode 유지 구조로 축소했다.
- `registry.ts`는 `GridList`에 대해 generic editor 뒤에 `GridListHybridAfterSections`를 붙인다.

현재 분담

- generic
  - `Content`
  - `Layout`
  - `State`
  - `Behavior`
  - `Form Integration`
- 수동
  - `Filtering`
  - `Data Binding`
  - `Item Management`
  - `Selected Item Edit Mode`

추가 정리

- builder 타입에서 `GridList` 계약 축을 실제 editor/shared 기준으로 정리했다.
  - `variant`
  - `size`
  - `label`
  - `description`
  - `errorMessage`
  - `columns`
  - `dataBinding`
  - `filterText`
  - `filterFields`
  - `selectionBehavior`
  - `disallowEmptySelection`
  - `isRequired`
  - `autoFocus`
  - `allowsDragging`
  - `renderEmptyState`
  - `name`
  - `validationBehavior`
- preview renderer도 다음 값을 실제로 전달하도록 맞췄다.
  - `variant`
  - `size`
  - `selectionBehavior`
  - `autoFocus`
  - `filterText`
  - `filterFields`

남은 parity 확인 항목

- `isDisabled`, `isRequired`, `allowsDragging`, `name`, `validationBehavior`는 현재 shared `GridList`가 직접 소비하지 않는다.
- item 관리 UI와 preview/data binding 동작은 hybrid 경로에서 한 번 더 교차 점검이 필요하다.

### ListBox 하이브리드 경계 확정

`ListBox`는 `GridList`보다 더 많은 수동 부채가 있지만, direct prop 섹션은 generic으로 올릴 수 있다.

- generic 담당
  - `Content`
    - `label`
    - `description`
    - `errorMessage`
  - `State`
    - `selectionMode`
    - `disallowEmptySelection`
    - `isRequired`
  - `Behavior`
    - `isDisabled`
    - `autoFocus`
  - `Performance`
    - `enableVirtualization`
    - `height`
    - `overscan`
  - `Form Integration`
    - `name`
    - `validationBehavior`
- 수동 보조 섹션 담당
  - `Filtering`
    - `filterText`
    - `filterFields`
  - `Data Binding`
    - `PropertyDataBinding`
    - `Field 자동 생성`
- 별도 수동 서브플로우 유지
  - `Item Management`
  - `Selected Item Edit Mode`

판단 근거

- `Content`, `State`, `Behavior`, `Performance`, `Form Integration`은 direct prop update만 한다.
- `Filtering`은 `filterFields`를 CSV 문자열로 편집하는 별도 UI가 필요하다.
- `Data Binding`은 DataTable schema 해석과 `Field` 자동 생성 흐름까지 묶여 있어서 수동 유지가 맞다.
- item 관리 UI도 collection 편집 서브플로우라 generic 바깥이 안전하다.

### ListBox partial hybrid 시작

현재 코드 기준으로 `ListBox`는 partial hybrid 상태다.

- `ListBox.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `ListBox`를 등록했다.
- `ListBoxEditor.tsx`는 `ListBoxHybridAfterSections` + item edit mode 유지 구조로 축소했다.
- `registry.ts`는 `ListBox`에 대해 generic editor 뒤에 `ListBoxHybridAfterSections`를 붙인다.

현재 분담

- generic
  - `Content`
  - `State`
  - `Behavior`
  - `Performance`
  - `Form Integration`
- 수동
  - `Filtering`
  - `Data Binding`
  - `Item Management`
  - `Selected Item Edit Mode`

추가 정리

- builder 타입에서 `ListBox` 계약 축을 현재 editor 기준으로 정리했다.
  - `label`
  - `description`
  - `errorMessage`
  - `disallowEmptySelection`
  - `isRequired`
  - `autoFocus`
  - `name`
  - `validationBehavior`
  - `dataBinding`
  - `enableVirtualization`
  - `height`
  - `overscan`
  - `filterText`
  - `filterFields`
  - `orientation`
- preview renderer도 다음 값을 실제로 전달하도록 맞췄다.
  - `variant`
  - `size`
  - `orientation`
  - `selectionMode`
  - `disallowEmptySelection`
  - `autoFocus`
  - `enableVirtualization`
  - `height`
  - `overscan`
  - `filterText`
  - `filterFields`
  - `dataBinding`
  - `columnMapping`

남은 parity 확인 항목

- `isDisabled`, `isRequired`, `name`, `validationBehavior`는 현재 shared `ListBox`가 직접 소비하지 않는다.

### TagGroup 하이브리드 경계 확정

`TagGroup`는 collection 계열이지만, `Select/ComboBox/ListBox`보다 구조가 단순하다.

- `Tag` child 관리와 선택 상태는 있지만
- 자유 입력형 trigger/input 조합이 없고
- grandchild sync도 `SelectTrigger -> SelectValue` 수준으로 깊지 않다.

따라서 다음 경계가 맞다.

generic으로 올릴 섹션

- `Design`
- `State`
- `Behavior`
- `Form Integration`

수동 보조 섹션

- `Content`
- `Filtering`
- `Data Binding`
- `Tag Management`

별도 수동 서브플로우 유지

- `Selected Tag Edit Mode`

경계 이유

- `Content.label`은 child `Label` 동기화가 필요하다.
- `Filtering.filterFields`는 CSV 기반 편집 UI가 더 적합하다.
- `Data Binding`, `Tag Management`, `Selected Tag Edit Mode`는 direct prop 편집이 아니라 collection 관리 플로우다.

### TagGroup partial hybrid 시작

현재 코드 기준으로 `TagGroup`는 partial hybrid 상태다.

- `TagGroup.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `TagGroup`를 등록했다.
- `registry.ts`는 `TagGroup`에 대해 generic editor 뒤에 `TagGroupHybridAfterSections`를 붙인다.
- `TagGroupEditor.tsx`는 `Content`, `Filtering`, `Data Binding`, `Tag Management`, `Selected Tag Edit Mode`만 담당하는 wrapper로 축소했다.

정리 결과

- generic 담당
  - `Design`
  - `State`
  - `Behavior`
  - `Form Integration`
- 수동 보조 섹션 담당
  - `Content`
  - `Filtering`
  - `Data Binding`
  - `Tag Management`
- 별도 수동 서브플로우
  - `Selected Tag Edit Mode`

preview/data parity

- preview가 현재 직접 소비하는 축:
  - `variant`
  - `size`
  - `label`
  - `description`
  - `errorMessage`
  - `selectionMode`
  - `selectionBehavior`
  - `isDisabled`
  - `disallowEmptySelection`
  - `allowsRemoving`
  - `orientation`
  - `labelPosition`
  - `maxRows`
  - `filterText`
  - `filterFields`
  - `dataBinding`
  - `columnMapping`
  - `removedItemIds`
- 현재 shared `TagGroup`가 직접 소비하지 않는 축:
  - `isReadOnly`
  - `allowsCustomValue`
  - `name`
  - `necessityIndicator`
  - `isInvalid`

검증

- `npm run type-check` 통과
- `TagGroupEditor.tsx`, `specRegistry.ts`, `registry.ts`, `unified.types.ts`, `TagGroup.spec.ts` 대상 eslint 통과

### 다음 후보 재선정: Tabs 우선

`TagGroup` 다음 후보는 `Tabs`로 잡는 편이 맞다.

선정 이유

- `Tabs`는 item 관리와 panel 연결은 있지만, `Tree`처럼 재귀 구조가 아니다.
- `Table`처럼 row/column/cell 다층 편집 UI도 없다.
- `ADR-046`에서 `Tabs.density` 계약도 이미 닫혀 있다.

보류 이유가 남는 후보

- `Tree`
  - 재귀 child composition과 다단계 item 편집이 핵심이다.
  - ADR-006 보류 사유가 아직 해소되지 않았다.
- `Table`
  - header/body/row/cell 편집 UI와 column 정의가 별도 흐름이다.
  - 하이브리드 이전에 편집 단위 분해가 먼저 필요하다.

현재 우선순위

1. `Tabs`
2. `Tree`
3. `Table`

### Tabs 하이브리드 경계 확정

`Tabs`는 collection 계열이지만, 현재 수동 editor의 핵심 direct prop 섹션은 적다.

generic으로 올릴 섹션

- `Design`
- `Behavior`

수동 보조 섹션

- `State`
- `Tab Management`

경계 이유

- `defaultSelectedKey`는 현재 child `Tab` 목록에서 동적으로 옵션을 만들어야 한다.
- `Tab Management`는 direct prop 편집이 아니라 `Tab`/`Panel` 생성 플로우다.
- 반면 `density`, `orientation`, `showIndicator`, `isDisabled`는 순수 direct prop 편집이다.

### Tabs partial hybrid 시작

현재 코드 기준으로 `Tabs`는 partial hybrid 상태다.

- `Tabs.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `Tabs`를 등록했다.
- `registry.ts`는 `Tabs`에 대해 generic editor 뒤에 `TabsHybridAfterSections`를 붙인다.
- `TabsEditor.tsx`는 `State`와 `Tab Management`만 담당하는 wrapper로 축소했다.

정리 결과

- generic 담당
  - `Design`
  - `Behavior`
- 수동 보조 섹션 담당
  - `State`
  - `Tab Management`

preview/data parity

- preview가 현재 직접 소비하는 축:
  - `defaultSelectedKey`
  - `density`
  - `orientation`
  - `isDisabled`
  - `showIndicator`
- `Tabs.density`는 ADR-046에서 이미 계약이 닫힌 상태다.

검증

- `npm run type-check` 통과
- `TabsEditor.tsx`, `specRegistry.ts`, `registry.ts`, `unified.types.ts`, `Tabs.spec.ts` 대상 eslint 통과

### 다음 후보 재선정: Tree 우선

`Tabs` 다음 후보는 `Tree`가 맞다.

선정 이유

- `Table`은 `header/body/row/cell/column` 편집 단위가 분리돼 있고, 하이브리드 이전에 편집 모델 재구성이 먼저 필요하다.
- `Tree`도 재귀 구조 때문에 어렵지만, item 모델은 하나(`TreeItem`)로 수렴한다.
- 즉 구현 난도는 높아도, `Table`보다 경계 정의가 먼저 닫힌다.

주의점

- `Tree`는 ADR-006 보류 사유와 직접 맞닿아 있다.
- 따라서 `Tree`는 바로 코드 분해보다 먼저, `TreeItem` 재귀 편집 경계와 child composition 규칙을 다시 고정해야 한다.

현재 우선순위

1. `Tree`
2. `Table`

### Tree 하이브리드 경계 확정

`Tree`는 재귀 구조를 가지지만, `Tree` 컨테이너 자체의 prop surface는 비교적 단순하다.

generic으로 올릴 섹션

- `Content`
- `State`
- `Behavior`

수동 보조 섹션

- `Data Binding`
- `Tree Items`

경계 이유

- `Data Binding`은 `PropertyDataBinding` 전용 UI가 필요하다.
- `Tree Items`는 direct prop 편집이 아니라 `TreeItem` 생성과 재귀 child composition 관리 플로우다.
- 반면 `label`, `description`, selection 관련 props, `isDisabled`, `autoFocus`는 direct prop 편집이다.

### Tree partial hybrid 시작

현재 코드 기준으로 `Tree`는 partial hybrid 상태다.

- `Tree.spec.ts`에 generic schema를 추가했다.
- `specRegistry.ts`에 `Tree`를 등록했다.
- `registry.ts`는 `Tree`에 대해 generic editor 뒤에 `TreeHybridAfterSections`를 붙인다.
- `TreeEditor.tsx`는 `Data Binding`과 `Tree Items`만 담당하는 wrapper로 축소했다.

정리 결과

- generic 담당
  - `Content`
  - `State`
  - `Behavior`
- 수동 보조 섹션 담당
  - `Data Binding`
  - `Tree Items`

preview/data parity

- preview가 현재 직접 소비하는 축:
  - `label` (`aria-label`)
  - `selectionMode`
  - `selectionBehavior`
  - `expandedKeys`
  - `defaultExpandedKeys`
  - `selectedKeys`
  - `defaultSelectedKeys`
  - `dataBinding`
- 현재 shared `Tree`가 직접 소비하지 않는 축:
  - `description`
  - `isDisabled`
  - `autoFocus`

검증

- `npm run type-check` 통과
- `TreeEditor.tsx`, `specRegistry.ts`, `registry.ts`, `unified.types.ts`, `Tree.spec.ts`, `CollectionRenderers.tsx` 대상 lint/type-check 예정

### 다음 후보: Table

`Tree` 다음 후보는 `Table` 하나가 남는다.

판단

- `Table`은 이제 가장 무거운 잔여 항목이다.
- 바로 코드 분해보다 먼저, `Table`, `TableHeader`, `TableBody`, `Row`, `Cell`, `Column` 편집 경계를 다시 나누는 설계 단계가 필요하다.
- Data Binding의 `Field 자동 생성` 흐름은 hybrid 경로에서 한 번 더 교차 점검이 필요하다.
