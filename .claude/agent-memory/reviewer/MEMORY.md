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

## False Positive 기록

- **`hasCustomEditor: false` 명시적 선언**: 런타임 동작에 영향 없음 — registry.ts가 propertySpec 우선 체크 후 fallback으로만 사용. 생략 가능하나 기존 패턴과 일관성 측면에서 MEDIUM 이하 이슈

## 프로젝트 컨벤션 예외

- Builder 아이콘 버튼: 공유 `Button variant="ghost"` 대신 `ActionIconButton` 사용
- Canvas 관련 코드: DirectContainer 패턴 필수 (엔진 결과 직접 배치)
- field 컴포넌트: 입력 영역 배경 `--bg-inset` / `{color.layer-2}` 통일
- `propagationRegistry.ts`의 `CAST` 헬퍼: Phase 1 임시 패턴 — Phase 3 대량 등록 전에 제네릭 시그니처로 교체 필요
