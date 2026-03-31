# Reviewer Agent Memory

## 리뷰 빈출 이슈 패턴

- **Store 타입 → 엔진 함수 캐스팅**: Store의 `childrenMap`/`elementsMap`을 엔진 유틸 파라미터 타입으로 `as Map<string, ...>` 캐스팅하는 패턴 — 엔진 인터페이스가 Store 타입의 최소 구조만 요구하도록 설계 필요
- **Spec propagation rules copy-paste**: 유사 컴포넌트(DatePicker/DateRangePicker 등) 간 propagation 규칙 배열을 통째로 복제하는 패턴 — 공통 규칙은 팩토리 함수로 추출해야 함
- **`unknown` 경유 타입 우회 (`as unknown as T`)**: 제네릭 파라미터 타입 불일치를 `CAST` 헬퍼로 회피하는 패턴 — 함수 시그니처 제네릭화로 해결
- **hot path `Object.keys()` 빈 체크**: `handleUpdate`처럼 매 prop 변경 시 호출되는 콜백에서 `Object.keys(obj).length === 0`으로 빈 객체 확인 — 루프 내 카운터 또는 `for...in` 단락 평가로 대체
- **hot path 이중 spread (`{ ...parent, props: { ...parent.props, ...delta } }`)**: propagation 규칙 존재 시 매 호출마다 두 번 shallow copy — 함수 시그니처를 `(parentProps, changedProps)` 분리 전달로 merge 불필요하게 설계
- **asStyle 축적 spread**: 동일 elementId에 규칙이 N개면 `existing.style = { ...prevStyle, [k]: v }` N회 반복 — style 객체 직접 키 할당으로 대체
- **병존하는 자식 동기화 경로**: `useSyncChildProp`(직접 자식 1단계, label sync용)과 `buildPropagationUpdates`(Spec 기반, 중첩 경로 지원)가 동시 존재 — Phase 3 확장 시 단일 경로로 통합 필요. 현재 13개 에디터가 구 경로 사용 중
- **분리된 Spec 등록 레지스트리**: `specRegistry.ts`(PROPERTY_EDITOR_SPEC_MAP)와 `propagationRegistry.ts`가 별도로 Spec import 및 tag→Spec 매핑을 관리 — 동일 Spec을 두 파일에서 중복 등록. Phase 3 확장 전에 단일 소스로 통합할 것
- **buildPropagationUpdates transform 이중 spread**: transform 규칙마다 `{ ...parentElement.props, ...changedProps }` shallow copy 재생성 — mergedProps를 루프 진입 전 1회만 생성하거나 transform 시그니처를 분리 전달로 변경
- **handleUpdate rules 존재 컴포넌트에서 무조건 buildPropagationUpdates 진입**: `changedProps` 키가 `rule.parentProp`과 실제 매칭되는지 사전 확인(`rules.some(r => r.parentProp in changedProps)`) 없이 항상 진입 — Map 생성+Array.from 비용 낭비
- **applyFactoryPropagation 4중 Map 생성**: tempChildrenMap + tempElementsMap + updatesById(내부) + patchById — patchById 재색인 단계는 buildPropagationUpdates가 이미 머지하므로 중복
- **resolveChildPath 중첩 경로 초기 껍데기 객체**: `[{ id: parentId } as ElementLike]`로 props/tag 없는 임시 객체를 매 호출마다 생성 — 첫 단계를 parentId 문자열로 직접 처리하여 제거 가능
- **useSyncChildProp stale props 병합**: `childrenMap`에서 읽은 `child.props`로 `{ ...child.props, [key]: value }` merge — childrenMap staleness 규칙 위반. `elementsMap.get(child.id).props`로 최신 props 조회 필요 (useSyncGrandchildProp 동일)
- **propagationRegistry와 specRegistry 이중 Spec 등록**: 동일 Spec 집합을 두 파일에서 import — `PROPERTY_EDITOR_SPEC_MAP`을 단일 소스로 consolidation 필요. Phase 3 전 수행 필수
- **에디터 삭제 시 3곳 동시 정리 필수**: (1) 에디터 .tsx 파일 삭제, (2) `editors/index.ts` export 제거, (3) `metadata.ts` `hasCustomEditor: true` + `editorName` → `hasCustomEditor: false` 변경. 1개라도 누락 시 빌드 오류 또는 console.warn 발생 (e0c2da74 SearchFieldEditor 사례)
- **Spec 전환 시 metadata.ts 미정리 패턴**: 에디터 파일은 HybridAfterSection으로 전환하되 Spec을 등록한 경우, registry.ts가 propertySpec 경로로 단락되어 metadata `hasCustomEditor: true` 분기에 도달하지 않더라도 metadata 불일치 상태가 남음 — 05e6489c 커밋의 GridList/ListBox가 이 패턴 (Spec 등록 후 metadata 미정리)
- **Spec shapes() 내 `Math.ceil(fontSize * 1.5)` labelLineHeight 계산**: Select.spec.ts, ComboBox.spec.ts의 legacy(!hasChildren) 경로에 남아있는 패턴 — LABEL_SIZE_STYLE lineHeight 역참조로 교체 필요 (canvas-rendering.md CRITICAL 규칙)
- **composition.delegation 크기별 CSS 변수 복제**: Select.spec.ts ↔ ComboBox.spec.ts의 trigger 컨테이너 delegation 변수 5사이즈가 거의 동일 — 공통 헬퍼 팩토리로 추출 필요
- **propagation 규칙과 수동 syncChildProp 병존으로 이중 업데이트**: Spec에 `{ parentProp: "value", childPath: "SliderTrack", override: true }` 규칙이 있음에도 에디터에서 `syncSliderTrackValue`로 SliderTrack을 별도 업데이트 — propagation 규칙 추가 시 에디터의 대응 수동 sync 코드 반드시 제거
- **`handleRangeModeToggle`에서 `childrenMap` stale props 사용**: `sliderOutput.props`를 childrenMap 경유로 spread — `elementsMap.get(id)?.props` 로 최신 조회 필수 (zustand-childrenmap-staleness 반복 패턴)
- **Spec properties field key가 Props 인터페이스에 미등록**: `Slider.spec.ts`의 `key: "orientation"` 필드가 `SliderProps`에 없는 패턴 — Spec properties 추가 시 Props 인터페이스에도 동시 등록 필수
- **Spec sizes 키와 CSS size variant 불일치**: `ListBox.spec.ts`의 `sizes` 키는 `sm/md/lg` 3개인데, CSS에 `xs`/`xl` 추가 시 Spec sizes에 동시 추가 누락 → `spec.sizes["xs"]` undefined 반환. `ListBoxProps.size` 타입도 확장 필요. CSS size variant 추가 시 Spec sizes + Props 타입 3곳 동시 갱신 필수
- **string-array join/split 구분자 비대칭**: `SpecField.tsx`의 `string-array` 케이스에서 join은 `sep + " "`, split은 `sep`만 사용 — 커스텀 separator 사용 시 round-trip 불완전
- **memo 컴포넌트 내 useCallback 누락 (핸들러)**: `GenericPropertyEditor` 등 memo 컴포넌트에서 자식에게 전달하는 콜백을 useCallback 없이 정의 — 자식이 memo여도 매 렌더마다 새 참조로 리렌더 유발
- **JSX 객체 단일 인스턴스 이중 위치 참조**: `customIdField` 변수에 JSX를 한 번 생성 후 두 조건 분기에서 동시 사용 — 함수로 분리하여 각 경로에서 독립 생성 필요
- **Spec properties `calendar` vs `calendarSystem` key 불일치**: `DateField.spec.ts`만 `key: "calendar"` 사용, 나머지 6개 파일(Calendar/DatePicker/DateRangePicker/RangeCalendar 등)은 `calendarSystem` — 동일 prop을 가리키면서 key 불일치
- **Spec properties icon 일관성 결여**: 동일 key(isDisabled/isInvalid/necessityIndicator/orientation 등)가 어떤 파일에선 icon 있고 다른 파일에선 없음 — DatePicker/DateRangePicker/TextArea/RadioGroup/CheckboxGroup이 특히 많이 누락
- **Spec properties 섹션 배치 불일치**: `necessityIndicator`가 절반은 "State"에 절반은 "Validation"에 배치, `labelPosition`이 `Form.spec.ts`만 "State"에 배치(나머지 14개 파일은 "Appearance"), `selectionMode`가 CardView/TableView는 "Selection"에 나머지는 "State"에 배치
- **Card/Group spec 섹션 타이틀 "States" (복수)**: 표준 단수 "State" 대신 "States" 사용 — isDisabled/isInvalid/isReadOnly 섹션 불일치 원인
- **Renderer overlay props 인라인 변환 중복**: `renderTooltip`/`renderPopover` 등에서 `X !== undefined ? Number(X) : undefined` 패턴 반복 — `propToNumber()` 헬퍼 추출 필요. `!== undefined`와 `!= null` 혼용으로 null 처리 비일관성도 동반
- **`ComponentSize` 미import → 인라인 `import()` 타입 캐스팅**: `LayoutRenderers.tsx`에서 `ComponentSize`를 named import 없이 `as import("../types").ComponentSize | undefined`로 직접 JSX 속성에 인라인 캐스팅 — 상단 import에 추가 필요
- **Overlay Spec fields 공유 상수 없음**: `crossOffset`/`shouldFlip`/`containerPadding` field 정의가 Tooltip.spec.ts · Popover.spec.ts에 동일하게 복제 — `overlayPositioningFields` 공유 상수 추출 필요. 섹션 배치(Position vs State)도 불일치
- **프로덕션 렌더 경로 `console.log` 미제거**: `Menu.tsx`에 개발 디버그용 log 20여 개가 렌더 경로에 존재 — 제거 필수
- **Spec props → Renderer 전달 누락 (E2E 단절)**: `Menu.spec.ts`에 `align`/`direction`/`shouldFlip` 추가 후 `renderActionMenu`에서 `MenuButton`으로 전달 안 됨 — Spec properties 추가 시 반드시 렌더러 전달 + API 매핑까지 E2E로 완성해야 함. `align`/`direction` → React Aria `placement` 변환 로직 필요
- **React Aria API와 다른 Spec prop naming**: Tooltip/Popover는 React Aria `placement` prop을 그대로 사용하지만, Menu는 `align`+`direction` 분리 naming — React Aria `MenuTriggerProps`에는 `placement`가 없어 변환 레이어 필수. Spec 설계 시 React Aria API 이름을 먼저 확인 필요
- **Spec shapes() fontSize 해결 3단계 패턴 (56개 파일 중복)**: `(1) rawFontSize = props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize)` → `(2) resolvedFs = typeof raw === "number" ? raw : raw.startsWith("{") ? resolveToken(raw) : raw` → `(3) fontSize = typeof resolvedFs === "number" ? resolvedFs : fallback` 패턴이 56개 Spec 파일에 복제. `utils/` 에 `resolveSpecFontSize(props, size, fallback)` 헬퍼 추출 필요. fallback 값은 파일마다 12/14/16으로 다르므로 매개변수화 필요
- **`override: true` 일괄 추가 패턴**: propagation `size` 규칙에 `override: true`가 22개 Spec 파일에 일괄 추가됨 — size prop은 항상 override여야 하므로, propagation 엔진에서 `parentProp === "size"`인 규칙에 `override: true`를 자동 적용하거나 별도 `sizeRules` 배열 타입으로 분리하는 설계 고려 필요

## False Positive 기록

- **`hasCustomEditor: false` 명시적 선언**: 런타임 동작에 영향 없음 — registry.ts가 propertySpec 우선 체크 후 fallback으로만 사용. 생략 가능하나 기존 패턴과 일관성 측면에서 MEDIUM 이하 이슈

## 프로젝트 컨벤션 예외

- Builder 아이콘 버튼: 공유 `Button variant="ghost"` 대신 `ActionIconButton` 사용
- Canvas 관련 코드: DirectContainer 패턴 필수 (엔진 결과 직접 배치)
- field 컴포넌트: 입력 영역 배경 `--bg-inset` / `{color.layer-2}` 통일
- `propagationRegistry.ts`의 `CAST` 헬퍼: Phase 1 임시 패턴 — Phase 3 대량 등록 전에 제네릭 시그니처로 교체 필요
