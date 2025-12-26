# Builder 구조 통합 계획

## 개요

현재 builder 내 여러 모듈들이 분산되어 있어 관리 및 사용에 혼란이 발생하고 있습니다.
이 문서는 다음 두 가지 통합 계획을 정의합니다:

1. **Components 통합**: `src/builder/components` + `src/builder/panels/common` → `src/builder/components`
2. **Events 통합**: `src/builder/events` → `src/builder/panels/events`

---

# Part 1: Components 통합

## 1.1 개요

`src/builder/components`와 `src/builder/panels/common`을 통합하여 공통 컴포넌트를 한 곳에서 관리합니다.

## 1.2 현재 구조 분석

### `src/builder/components/` (7개 파일)

| 파일 | 설명 | 분류 |
|------|------|------|
| `AddPageDialog.tsx` | 페이지 추가 다이얼로그 | Dialog |
| `AddPageDialog.css` | 다이얼로그 스타일 | Dialog |
| `DataTable.tsx` | 데이터 테이블 컴포넌트 | Data |
| `DataTableMetadata.ts` | 데이터 테이블 메타데이터 | Data |
| `ScopedErrorBoundary.tsx` | 에러 바운더리 | Feedback |
| `Toast.tsx` | 토스트 알림 | Feedback |
| `ToastContainer.tsx` | 토스트 컨테이너 | Feedback |
| `styles/Toast.css` | 토스트 스타일 | Feedback |
| `styles/ScopedErrorBoundary.css` | 에러 바운더리 스타일 | Feedback |

### `src/builder/panels/common/` (22개 파일)

| 파일 | 설명 | 분류 |
|------|------|------|
| `PropertyInput.tsx` | 텍스트 입력 프로퍼티 | Property |
| `PropertySelect.tsx` | 선택 프로퍼티 | Property |
| `PropertyCheckbox.tsx` | 체크박스 프로퍼티 | Property |
| `PropertySwitch.tsx` | 스위치 프로퍼티 | Property |
| `PropertySlider.tsx` | 슬라이더 프로퍼티 | Property |
| `PropertyColor.tsx` | 색상 프로퍼티 | Property |
| `PropertyColorPicker.tsx` | 색상 피커 프로퍼티 | Property |
| `PropertyUnitInput.tsx` | 단위 입력 프로퍼티 | Property |
| `PropertySection.tsx` | 프로퍼티 섹션 | Property |
| `PropertyFieldset.tsx` | 프로퍼티 필드셋 | Property |
| `PropertyCustomId.tsx` | 커스텀 ID 프로퍼티 | Property |
| `PropertyDataBinding.tsx` | 데이터 바인딩 프로퍼티 | Property |
| `PropertyDataBinding.css` | 데이터 바인딩 스타일 | Property |
| `PanelHeader.tsx` | 패널 헤더 | Panel |
| `SectionHeader.tsx` | 섹션 헤더 | Panel |
| `EmptyState.tsx` | 빈 상태 표시 | Feedback |
| `LoadingSpinner.tsx` | 로딩 스피너 | Feedback |
| `MultiSelectStatusIndicator.tsx` | 다중 선택 상태 표시 | Selection |
| `BatchPropertyEditor.tsx` | 일괄 프로퍼티 편집 | Selection |
| `SelectionFilter.tsx` | 선택 필터 | Selection |
| `SelectionMemory.tsx` | 선택 메모리 | Selection |
| `SmartSelection.tsx` | 스마트 선택 | Selection |
| `KeyboardShortcutsHelp.tsx` | 키보드 단축키 도움말 | Help |
| `index.ts` | 통합 export | - |
| `index.css` | 공통 스타일 | - |
| `list-group.css` | 리스트 그룹 스타일 | - |

## 1.3 문제점

1. **일관성 부족**: 공통 컴포넌트를 찾을 때 두 곳을 확인해야 함
2. **명확한 기준 부재**: 새 컴포넌트를 어디에 추가해야 하는지 모호함
3. **import 경로 복잡**: 사용처마다 다른 경로로 import
4. **유지보수 어려움**: 관련 컴포넌트가 분산되어 있어 수정 시 누락 가능성

## 1.4 통합 목표

- 모든 builder 공통 컴포넌트를 `src/builder/components/`에서 관리
- 성격에 따라 하위 폴더로 분류하여 가독성 확보
- 통합 `index.ts`를 통한 일관된 import 경로 제공

## 1.5 제안 구조

```
src/builder/components/
├── property/                    # 프로퍼티 편집 컴포넌트
│   ├── PropertyInput.tsx
│   ├── PropertySelect.tsx
│   ├── PropertyCheckbox.tsx
│   ├── PropertySwitch.tsx
│   ├── PropertySlider.tsx
│   ├── PropertyColor.tsx
│   ├── PropertyColorPicker.tsx
│   ├── PropertyUnitInput.tsx
│   ├── PropertySection.tsx
│   ├── PropertyFieldset.tsx
│   ├── PropertyCustomId.tsx
│   ├── PropertyDataBinding.tsx
│   ├── PropertyDataBinding.css
│   └── index.ts
│
├── panel/                       # 패널 관련 컴포넌트
│   ├── PanelHeader.tsx
│   ├── SectionHeader.tsx
│   └── index.ts
│
├── selection/                   # 선택 관련 컴포넌트
│   ├── MultiSelectStatusIndicator.tsx
│   ├── BatchPropertyEditor.tsx
│   ├── SelectionFilter.tsx
│   ├── SelectionMemory.tsx
│   ├── SmartSelection.tsx
│   └── index.ts
│
├── feedback/                    # 피드백/상태 표시 컴포넌트
│   ├── Toast.tsx
│   ├── ToastContainer.tsx
│   ├── Toast.css
│   ├── EmptyState.tsx
│   ├── LoadingSpinner.tsx
│   ├── ScopedErrorBoundary.tsx
│   ├── ScopedErrorBoundary.css
│   └── index.ts
│
├── dialog/                      # 다이얼로그 컴포넌트
│   ├── AddPageDialog.tsx
│   ├── AddPageDialog.css
│   └── index.ts
│
├── data/                        # 데이터 관련 컴포넌트
│   ├── DataTable.tsx
│   ├── DataTableMetadata.ts
│   └── index.ts
│
├── help/                        # 도움말 관련 컴포넌트
│   ├── KeyboardShortcutsHelp.tsx
│   └── index.ts
│
├── styles/                      # 공통 스타일
│   ├── index.css
│   └── list-group.css
│
└── index.ts                     # 통합 export
```

## 1.6 마이그레이션 단계

### Phase 1: 폴더 구조 생성
- [ ] `src/builder/components/` 하위에 분류별 폴더 생성
  - `property/`, `panel/`, `selection/`, `feedback/`, `dialog/`, `data/`, `help/`, `styles/`

### Phase 2: 파일 이동
- [ ] `panels/common/`의 Property* 컴포넌트들 → `components/property/`
- [ ] `panels/common/`의 PanelHeader, SectionHeader → `components/panel/`
- [ ] `panels/common/`의 Selection*, Batch*, MultiSelect* → `components/selection/`
- [ ] `panels/common/`의 EmptyState, LoadingSpinner → `components/feedback/`
- [ ] `panels/common/`의 KeyboardShortcutsHelp → `components/help/`
- [ ] 기존 `components/`의 Toast*, ScopedErrorBoundary → `components/feedback/`
- [ ] 기존 `components/`의 AddPageDialog → `components/dialog/`
- [ ] 기존 `components/`의 DataTable* → `components/data/`
- [ ] 스타일 파일들 정리 → `components/styles/` 또는 각 폴더 내

### Phase 3: Export 설정
- [ ] 각 하위 폴더에 `index.ts` 생성
- [ ] 루트 `components/index.ts`에서 모든 컴포넌트 re-export

### Phase 4: Import 경로 업데이트
- [ ] `panels/common`을 import하는 모든 파일 검색
- [ ] import 경로를 `builder/components`로 변경

### Phase 5: 정리
- [ ] `src/builder/panels/common/` 폴더 삭제
- [ ] 빌드 및 테스트 검증

## 1.7 Import 경로 변경 예시

### Before
```typescript
// 분산된 import
import { PropertyInput, PropertySelect } from '../panels/common';
import { Toast } from '../components/Toast';
import { EmptyState } from '../panels/common/EmptyState';
```

### After
```typescript
// 통합된 import
import {
  PropertyInput,
  PropertySelect,
  Toast,
  EmptyState
} from '../components';

// 또는 카테고리별 import
import { PropertyInput, PropertySelect } from '../components/property';
import { Toast, EmptyState } from '../components/feedback';
```

## 1.8 영향 범위 분석

### 예상 수정 파일
- `src/builder/panels/` 하위 패널 컴포넌트들
- `src/builder/canvas/` 일부 컴포넌트
- 기타 builder 내 common 컴포넌트 사용처

### 리스크
- Import 경로 변경으로 인한 빌드 오류 가능성
- 순환 참조 발생 가능성 (의존성 분석 필요)

## 1.9 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] 모든 컴포넌트 정상 렌더링
- [ ] 기존 기능 동작 확인
- [ ] 순환 참조 없음 확인

## 1.10 일정

| 단계 | 예상 작업량 |
|------|------------|
| Phase 1 | 폴더 구조 생성 |
| Phase 2 | 파일 이동 |
| Phase 3 | Export 설정 |
| Phase 4 | Import 경로 업데이트 |
| Phase 5 | 정리 및 검증 |

## 1.11 참고사항

- 이 작업은 기능 변경 없이 구조만 개선하는 리팩토링입니다
- 각 Phase 완료 후 빌드 검증을 권장합니다
- Git 커밋은 Phase별로 분리하여 롤백 용이성을 확보합니다

---

# Part 2: Events 통합

## 2.1 개요

`src/builder/events`와 `src/builder/panels/events` 두 디렉토리가 분리되어 있지만,
실제로 `EventsPanel`에서 **양쪽 모두를 import**하여 사용하고 있어 분리의 의미가 없습니다.

`src/builder/events`를 `src/builder/panels/events`로 통합하여 이벤트 시스템을 한 곳에서 관리합니다.

## 2.2 현재 구조 분석

### `src/builder/events/` (60+ 파일)

**역할**: 이벤트 시스템의 핵심 로직 + Legacy Editor

| 폴더 | 파일 수 | 설명 |
|------|---------|------|
| `actions/` | 21개 | 액션 에디터 (Navigate, SetState, ShowModal 등) |
| `components/` | 9개 | UI 컴포넌트 (ActionListView, ConditionEditor, visualMode/*) |
| `execution/` | 3개 | 실행 로직 (eventExecutor, conditionEvaluator, executionLogger) |
| `hooks/` | 7개 | 커스텀 훅 (useEventFlow, useVariableSchema 등) |
| `state/` | 3개 | 상태 관리 (useActions, useEventHandlers, useEventSelection) |
| `types/` | 3개 | 타입 정의 (eventTypes, eventBlockTypes, templateTypes) |
| `utils/` | 5개 | 유틸리티 함수 (normalizeEventTypes, variableParser 등) |
| `pickers/` | 2개 | EventTypePicker, ActionTypePicker |
| `data/` | 3개 | 메타데이터, 카테고리, 템플릿 |
| 루트 | 5개 | EventEditor, EventList, index.ts/tsx, CSS 파일들 |

### `src/builder/panels/events/` (21개 파일)

**역할**: Block-based UI (Phase 5 - 권장)

| 폴더 | 파일 수 | 설명 |
|------|---------|------|
| `blocks/` | 6개 | WhenBlock, IfBlock, ThenElseBlock, ActionBlock, ActionList, BlockConnector |
| `editors/` | 6개 | ConditionRow, VariableBindingEditor, ElementPicker, OperatorToggle/Picker, BlockActionEditor |
| `preview/` | 3개 | CodePreviewPanel, EventDebugger, EventMinimap |
| `hooks/` | 1개 | useBlockKeyboard |
| 루트 | 3개 | EventsPanel.tsx, index.ts, CSS |

## 2.3 문제점: EventsPanel의 의존성

`EventsPanel.tsx`에서 양쪽 디렉토리를 모두 import:

```typescript
// ❌ panels/events/ 에서 import
import { WhenBlock } from "./blocks/WhenBlock";
import { IfBlock } from "./blocks/IfBlock";
import { ThenElseBlock } from "./blocks/ThenElseBlock";
import { BlockActionEditor } from "./editors/BlockActionEditor";

// ❌ events/ 에서 import (상대 경로로 거슬러 올라감)
import { EventTypePicker } from "../../events/pickers/EventTypePicker";
import { useEventHandlers } from "../../events/state/useEventHandlers";
import { useActions } from "../../events/state/useActions";
import { useEventSelection } from "../../events/state/useEventSelection";
import { DebounceThrottleEditor } from "../../events/components/DebounceThrottleEditor";
import { normalizeToInspectorAction } from "../../events/utils/normalizeEventTypes";
```

**결론**: 두 디렉토리가 물리적으로 분리되어 있지만 실제로는 하나의 기능에서 함께 사용됨

## 2.4 통합 목표

- 모든 이벤트 관련 코드를 `src/builder/panels/events/`에서 관리
- `src/builder/events/` 폴더 제거
- import 경로 단순화 및 일관성 확보
- Legacy Editor 코드 정리 (필요시 유지 또는 제거)

## 2.5 제안 구조

```
src/builder/panels/events/
├── actions/                     # 액션 에디터 (events/actions/ → 이동)
│   ├── ActionEditor.tsx
│   ├── NavigateActionEditor.tsx
│   ├── SetStateActionEditor.tsx
│   ├── ShowModalActionEditor.tsx
│   ├── ... (21개 액션 에디터)
│   └── index.ts
│
├── blocks/                      # 블록 컴포넌트 (기존 유지)
│   ├── WhenBlock.tsx
│   ├── IfBlock.tsx
│   ├── ThenElseBlock.tsx
│   ├── ActionBlock.tsx
│   ├── ActionList.tsx
│   ├── BlockConnector.tsx
│   └── index.ts
│
├── components/                  # UI 컴포넌트 (events/components/ → 이동)
│   ├── ActionDelayEditor.tsx
│   ├── ActionListView.tsx
│   ├── ComponentSelector.tsx
│   ├── ConditionEditor.tsx
│   ├── DebounceThrottleEditor.tsx
│   ├── EventHandlerManager.tsx
│   ├── ExecutionDebugger.tsx
│   ├── ViewModeToggle.tsx
│   ├── visualMode/
│   │   ├── FlowNode.tsx
│   │   ├── ActionNode.tsx
│   │   ├── TriggerNode.tsx
│   │   ├── FlowConnector.tsx
│   │   ├── ReactFlowCanvas.tsx
│   │   ├── SimpleFlowView.tsx
│   │   └── index.ts
│   └── index.ts
│
├── editors/                     # 에디터 컴포넌트 (기존 유지)
│   ├── ConditionRow.tsx
│   ├── VariableBindingEditor.tsx
│   ├── ElementPicker.tsx
│   ├── OperatorToggle.tsx
│   ├── OperatorPicker.tsx
│   ├── BlockActionEditor.tsx
│   └── index.ts
│
├── execution/                   # 실행 로직 (events/execution/ → 이동)
│   ├── eventExecutor.ts
│   ├── conditionEvaluator.ts
│   ├── executionLogger.ts
│   └── index.ts
│
├── hooks/                       # 훅 통합 (events/hooks/ + panels/events/hooks/)
│   ├── useEventFlow.ts
│   ├── useEventSearch.ts
│   ├── useVariableSchema.ts
│   ├── useRecommendedEvents.ts
│   ├── useApplyTemplate.ts
│   ├── useCopyPasteActions.ts
│   ├── useBlockKeyboard.ts
│   └── index.ts
│
├── state/                       # 상태 관리 (events/state/ → 이동)
│   ├── useActions.ts
│   ├── useEventHandlers.ts
│   ├── useEventSelection.ts
│   └── index.ts
│
├── pickers/                     # 피커 컴포넌트 (events/pickers/ → 이동)
│   ├── EventTypePicker.tsx
│   ├── ActionTypePicker.tsx
│   └── index.ts
│
├── preview/                     # 프리뷰 컴포넌트 (기존 유지)
│   ├── CodePreviewPanel.tsx
│   ├── EventDebugger.tsx
│   ├── EventMinimap.tsx
│   └── index.ts
│
├── types/                       # 타입 정의 (events/types/ → 이동)
│   ├── eventTypes.ts
│   ├── eventBlockTypes.ts
│   ├── templateTypes.ts
│   └── index.ts
│
├── utils/                       # 유틸리티 (events/utils/ → 이동)
│   ├── normalizeEventTypes.ts
│   ├── variableParser.ts
│   ├── bindingValidator.ts
│   ├── actionHelpers.ts
│   └── index.ts
│
├── data/                        # 메타데이터 (events/data/ → 이동)
│   ├── actionMetadata.ts
│   ├── eventCategories.ts
│   ├── eventTemplates.ts
│   └── index.ts
│
├── legacy/                      # Legacy Editor (선택적 유지)
│   ├── EventEditor.tsx
│   ├── EventList.tsx
│   └── index.ts
│
├── EventsPanel.tsx              # 메인 패널 (기존 유지)
├── EventsPanel.css
└── index.ts                     # 통합 export
```

## 2.6 마이그레이션 단계

### Phase 1: 폴더 구조 생성
- [ ] `panels/events/` 하위에 새 폴더들 생성
  - `actions/`, `components/`, `execution/`, `state/`, `pickers/`, `types/`, `utils/`, `data/`, `legacy/`

### Phase 2: 파일 이동
- [ ] `events/actions/*` → `panels/events/actions/`
- [ ] `events/components/*` → `panels/events/components/`
- [ ] `events/execution/*` → `panels/events/execution/`
- [ ] `events/hooks/*` → `panels/events/hooks/` (기존 hooks와 병합)
- [ ] `events/state/*` → `panels/events/state/`
- [ ] `events/pickers/*` → `panels/events/pickers/`
- [ ] `events/types/*` → `panels/events/types/`
- [ ] `events/utils/*` → `panels/events/utils/`
- [ ] `events/data/*` → `panels/events/data/`
- [ ] `events/EventEditor.tsx`, `EventList.tsx` → `panels/events/legacy/` (선택적)

### Phase 3: Export 설정
- [ ] 각 하위 폴더에 `index.ts` 생성/업데이트
- [ ] 루트 `panels/events/index.ts` 통합 export 업데이트

### Phase 4: Import 경로 업데이트
- [ ] `events/`를 import하는 모든 파일 검색
- [ ] import 경로를 `panels/events/`로 변경

### Phase 5: 정리
- [ ] `src/builder/events/` 폴더 삭제
- [ ] 빌드 및 테스트 검증

## 2.7 Import 경로 변경 예시

### Before
```typescript
// EventsPanel.tsx - 분산된 import
import { WhenBlock } from "./blocks/WhenBlock";
import { EventTypePicker } from "../../events/pickers/EventTypePicker";
import { useEventHandlers } from "../../events/state/useEventHandlers";
import { DebounceThrottleEditor } from "../../events/components/DebounceThrottleEditor";
```

### After
```typescript
// EventsPanel.tsx - 통합된 import
import { WhenBlock } from "./blocks";
import { EventTypePicker } from "./pickers";
import { useEventHandlers } from "./state";
import { DebounceThrottleEditor } from "./components";

// 또는 통합 import
import {
  WhenBlock,
  EventTypePicker,
  useEventHandlers,
  DebounceThrottleEditor
} from "./";
```

## 2.8 Legacy Editor 처리 옵션

`events/EventEditor.tsx`와 `EventList.tsx`는 Legacy Editor로 표시되어 있음:

### 옵션 A: 보존 (권장)
- `panels/events/legacy/` 폴더에 보관
- 하위 호환성 유지
- 점진적 마이그레이션 가능

### 옵션 B: 제거
- Block-based Editor로 완전 전환된 경우
- 사용처 확인 후 안전하게 제거

## 2.9 영향 범위 분석

### 예상 수정 파일
- `src/builder/panels/events/EventsPanel.tsx`
- `src/builder/events/`를 import하는 모든 파일
- Canvas 또는 Inspector에서 events 관련 import가 있는 경우

### 리스크
- Import 경로 변경으로 인한 빌드 오류 가능성
- Legacy Editor 사용처 누락 가능성
- 순환 참조 발생 가능성

## 2.10 검증 체크리스트

- [ ] TypeScript 빌드 성공
- [ ] EventsPanel 정상 동작
- [ ] 이벤트 추가/수정/삭제 기능 동작
- [ ] 액션 에디터들 정상 렌더링
- [ ] Block-based UI (WHEN/IF/THEN/ELSE) 정상 동작
- [ ] 순환 참조 없음 확인

## 2.11 참고사항

- 이 작업은 기능 변경 없이 구조만 개선하는 리팩토링입니다
- Legacy Editor 유지 여부는 사용처 분석 후 결정
- 각 Phase 완료 후 빌드 검증을 권장합니다
- Git 커밋은 Phase별로 분리하여 롤백 용이성을 확보합니다
