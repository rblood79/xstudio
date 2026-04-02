# Reviewer Agent Memory

## 리뷰 빈출 이슈 패턴

- **Store 타입 → 엔진 함수 캐스팅**: Store의 `childrenMap`/`elementsMap`을 엔진 유틸 파라미터 타입으로 `as Map<string, ...>` 캐스팅하는 패턴 — 엔진 인터페이스가 Store 타입의 최소 구조만 요구하도록 설계 필요
- **Spec propagation rules copy-paste**: 유사 컴포넌트(DatePicker/DateRangePicker, CheckboxGroup/RadioGroup 등) 간 propagation 규칙 배열을 통째로 복제하는 패턴 — 공통 규칙은 팩토리 함수로 추출해야 함 (`makeGroupSizePropagationRules` 패턴 제안)
- **shapes() 선언부·사용부 이중 주석**: 변수 선언 직전과 해당 변수를 shape에 전달하는 위치 양쪽에 동일 내용을 주석으로 기재하는 copy-paste — 선언부 주석 하나만 유지
- **Slider shapes() fontSize Propagation 우선순위 패턴 미적용**: NumberField/SearchField/TextField는 `props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize)` 패턴으로 수정됐으나 Slider는 누락 — size propagation 후 Canvas 미반영 버그 유발
- **composition delegation 인라인 공통 CSS 토큰 5중 복제**: `.react-aria-Group` 등 delegation 블록에서 `background`, `color`, `border` 값이 xs~xl 5개 사이즈에 동일하게 복제 — `GROUP_BASE_STYLE` 상수 추출 필요 (NumberField, ComboBox 동일 패턴)
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
- **CSS 수동 파일 index.css 미등록 + 컴포넌트 직접 import 의존**: `Calendar.css`(수동), `Popover.css`(수동)가 `index.css`에 없고 각각 `Calendar.tsx`에서 직접 import되거나 누락된 상태. `generated/` 파일과 수동 파일이 서로 다른 경로로 로드되어 `@layer` 우선순위 제어 불가. 수동 CSS 추가 시 반드시 `index.css`에 generated → manual 순서로 등록 필수
- **generated/Popover.css `background: --bg-inset` 토큰 오남용**: Popover는 오버레이이므로 `--bg-raised` 또는 `--bg-overlay`가 의미상 올바르나 Spec에 `{color.layer-2}`(`--bg-inset`)로 정의됨 — Popover.spec.ts의 기본 variant background 토큰 재검토 필요
- **generated/Popover.css `position: fixed` + Popover.css `position: static` override 체인**: Popover.css가 index.css에 누락되면 `.react-aria-Popover .react-aria-Dialog { position: static }` 규칙이 미적용 → DatePicker/DateRangePicker 팝오버 2×2px 축소. import 누락 시 즉시 확인 필요
- **`new Set([...])` 조건 블록 내부 생성 + 일본어 주석 혼입**: `applyImplicitStyles` 같은 hot path 조건 블록 안에 고정 Set 리터럴을 생성하는 패턴(모듈 최상단 상수로 호이스팅 필수) + 같은 지점에 일본어 주석이 함께 삽입된 패턴 — 커밋 전 일본어/중국어 문자(は、ため、から 등) grep 점검 필요 (implicitStyles.ts POPOVER_CHILDREN 사례)
- **`as unknown as T` — 제네릭 DateValue placeholderValue**: `now()` 반환 `ZonedDateTime`을 `T extends DateValue`로 캐스팅 시 이중 우회. `placeholderValue` prop 타입을 `DateValue | undefined`로 완화하거나 업캐스팅으로 해결 (DatePicker.tsx, DateRangePicker.tsx 동일 패턴)
- **remountKey granularity 과세분화**: DatePicker/DateRangePicker `remountKey`에 granularity 4-값을 그대로 포함하면 "hour"→"minute" 전환에서 불필요한 리마운트 발생 — `isTimeGranularity ? "time" : "date"` 2-값으로 단순화하여 day↔time 경계에서만 리마운트
- **`!== false` 기본값 전환 패턴**: `Boolean(prop)` → `prop !== false`로 변경 시 기존 저장 요소(prop 키 없음)가 영향을 받음 — 팩토리 기본값 추가 없이 단독으로 변경하면 마이그레이션 이슈. DateRenderers.tsx의 hideTimeZone/shouldForceLeadingZeros 사례
- **Slider.spec.ts fontSize 우선순위 미적용**: `props.style?.fontSize ?? size.fontSize` 패턴 사용 — `props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize)` 패턴 필수 (canvas-rendering.md CRITICAL). 향후 Slider 수정 시 즉시 확인 필요
- **CheckboxGroup/RadioGroup 3단계 propagation + DFS Label 이중 경로**: `["CheckboxItems", "Checkbox", "Label"]` 규칙이 Label에 size를 Store에 기록하고, fullTreeLayout.ts DFS도 동일 Label에 size를 주입 — Inspector는 Store write, DFS는 인라인 스타일 주입이라 현재 충돌 없으나 Phase 3 전 단일 경로 통합 필요
- **`necessityIndicator` derivedUpdateFn 3중 복제**: TextField/NumberField/SearchField.spec.ts의 `derivedUpdateFn`이 완전히 동일 — `packages/specs/src/utils/sharedSections.ts`에 `NECESSITY_INDICATOR_FIELD` 공유 상수로 추출 필요. sharedSections.ts에 이미 FILTERING_SECTION 패턴 존재
- **GroupComponents.ts Label factory 인라인 6회 반복**: `createDefaultLabelProps()`가 unified.types.ts:1624에 이미 존재하나 GroupComponents.ts에서 미사용 — Radio 자식(344, 368행)에는 `fontWeight: 500`도 누락되어 Checkbox 자식과 불일치
- **`resolveSpecFontSize()` 헬퍼 미존재**: 3단계 fontSize 해결 패턴이 17개 Spec 파일(TextField, NumberField, SearchField, Switch, Checkbox, Radio, Label, Input, SelectValue, DateSegment, MeterValue, ProgressBarValue, SliderOutput, FieldError, Description 등)에 인라인 복제 — `packages/specs/src/renderers/utils/tokenResolver.ts`에 추출 필요. fallback 값(12/14/16)이 파일마다 다르므로 매개변수화 필수

- **좀비 ref (쓰기 없이 리셋만 남은 ref)**: 기능 이전 후 이전 ref를 선언 + `.current = null` 리셋 코드만 남기는 패턴 — SelectionLayer의 `dropTargetRef`가 `lastResolvedDropTargetRef`로 역할 이전 후 좀비 상태. 기능 이전 시 구 ref 완전 제거 필수
- **insertion index 계산 로직 cross-container 복제**: same-parent(`resolveDropTarget`)와 cross-container(`resolveCrossContainerDrop`) 경로에 동일한 삽입 위치 계산 루프 복제 — `computeInsertionIndex(pos, bounds, isHorizontal)` 순수 함수 추출 필요
- **Store 함수 내 `get()` 이중 호출**: `moveElementToContainer`처럼 함수 시작(`const prevState = get()`)과 중간(`const { elements } = get()`)에서 두 번 state를 읽는 패턴 — 두 스냅샷이 다를 경우 order_num 불일치 발생. 단일 `get()` 스냅샷 사용 필수
- **DropIndicatorSnapshot ↔ DropTarget 수동 변환 중복**: 두 인터페이스가 1:1 대응하면서 필드 이름만 다름(`insertIndex` vs `insertionIndex` 등) — 매 이벤트마다 수동 변환 코드 발생. `Pick<DropTarget, ...>` 타입 앨리어싱으로 통합 필요
- **drag hot path N² findIndex**: `computeSiblingOffsets` 내부 루프에서 `sortedChildren.findIndex()` 매 반복 호출 — 루프 전 `Map<id, origIdx>` 한 번 빌드로 O(1) 전환 필수 (dropTargetResolver.ts:436)
- **drag hot path isDescendantOf + depth 이중 트리 순회**: `resolveCrossContainerDrop`에서 hitId마다 `isDescendantOf`(O(depth)) + depth 계산(O(depth)) 별도 수행 — 단일 while 루프로 통합 + dragged 조상 Set 선빌드로 최적화
- **RAF per-frame Map 할당 (dragAnimator)**: `getInterpolatedOffsets()`가 60fps RAF에서 매 프레임 `new Map()` + value 객체 생성 — 모듈 레벨 재사용 Map으로 교체 필요
- **dead zone early return에서 불필요한 snapshot 객체 재생성**: `dropIndicatorSnapshotRef.current`가 이미 올바른 값인데도 `prevTarget` 필드 분해로 새 객체 할당 — 이전 값 유지로 할당 생략 가능
- **DB persist 루프 내 `startSnapshot.find()` O(N) 반복**: `persistIds.map(id => startSnapshot.find(...))` 패턴 — 진입 전 `Map<id, snap>`으로 변환하여 O(1) 조회
- **onDragUpdate 첫 프레임 `elementsMap.values()` 전체 순회**: 스냅샷 캡처 시 `childrenMap` 미사용 → O(N) 전체 스캔. `childrenMap.get(parent_id)`로 교체 필수 (domain-o1-lookup 위반)
- **`useShallow` 제거로 배열/객체 구독 성능 회귀**: Zustand v5에서 `string[]` 배열이나 객체를 직접 구독할 때 `useShallow` 없이는 매 상태 업데이트마다 새 참조 생성 → 불필요한 리렌더 유발. `selectedElementIds`(배열), `panelLayout`(객체) 구독 시 `useShallow` 필수. primitive(string, boolean, number) 만 개별 구독 무방
- **훅 제거 불완전 (dead 호출과 잔존 호출 혼재)**: `usePageManager` 같은 훅을 컴포넌트 내 한 위치에서만 제거하고 같은 컴포넌트 내 다른 위치의 동일 훅 호출을 누락하는 패턴 — 훅 제거 시 파일 전체를 grep하여 모든 호출 위치 확인 필수
- **내부 유틸 함수 내 Store Map 재빌드**: `useLayerTreeData` 같이 `elements` 배열을 받는 useMemo 내부 헬퍼에서 `new Map(elements.map(...))` 재생성 — Store의 `elementsMap`을 인자로 전달하여 O(1) 조회 활용
- **자식 font 위임 selector 분리 증식**: `inlineAlertFontStyle`(InlineAlert 자식 Heading/Description)과 `collectionItemFontStyle`(ListBoxItem/GridListItem 자식 Text/Description)이 별도 selector로 존재 — 부모 태그 → 자식 tag → `fs:fw` 문자열 반환 구조가 동일하므로 `CHILD_FONT_DELEGATION` 단일 Map + selector로 통합 필요. 신규 컴포넌트 추가 시 selector 1개씩 증가 방지
- **implicitStyles.ts 컬렉션 자식 font 주입 블록 완전 복제**: `gridlistitem`(L614)과 `listboxitem`(L650) 블록의 Text/Description font 주입 map 로직 동일 — `injectCollectionItemFontStyles(children)` 순수 함수로 추출 공유 필요
- **factory Text/Description style 리터럴 N회 반복**: `SelectionComponents.ts`에서 `{ fontSize: 14, fontWeight: 600 }`, `{ fontSize: 12 }` 리터럴이 아이템 개수만큼 인라인 복제 — `COLLECTION_ITEM_LABEL_STYLE` / `COLLECTION_ITEM_DESC_STYLE` 모듈 상수로 추출 필요
- **`_containerWidth` 주입 태그 인라인 열거 18개**: `ElementSprite.tsx` L2030~2050의 `||` 체인 — `CONTAINER_WIDTH_TAGS = new Set([...])` 모듈 상수로 추출 후 `.has(tag)` 단일 조건으로 교체 필요. 태그 추가 시 체인 수정 실수 방지

## False Positive 기록

- **`hasCustomEditor: false` 명시적 선언**: 런타임 동작에 영향 없음 — registry.ts가 propertySpec 우선 체크 후 fallback으로만 사용. 생략 가능하나 기존 패턴과 일관성 측면에서 MEDIUM 이하 이슈

## 프로젝트 컨벤션 예외

- Builder 아이콘 버튼: 공유 `Button variant="ghost"` 대신 `ActionIconButton` 사용
- Canvas 관련 코드: DirectContainer 패턴 필수 (엔진 결과 직접 배치)
- field 컴포넌트: 입력 영역 배경 `--bg-inset` / `{color.layer-2}` 통일
- `propagationRegistry.ts`의 `CAST` 헬퍼: Phase 1 임시 패턴 — Phase 3 대량 등록 전에 제네릭 시그니처로 교체 필요
