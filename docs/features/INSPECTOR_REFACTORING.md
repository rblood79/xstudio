# Inspector 리팩토링 완료 ✅

## 개요

Inspector를 확장 가능한 구조로 완전히 리팩토링했습니다. 이제 새로운 컴포넌트를 추가할 때 메타데이터만 등록하면 자동으로 Inspector가 동작합니다.

---

## 🚀 Phase 12: Single Source of Truth 마이그레이션 (2024-12)

### 배경

기존 아키텍처에서 Inspector Store와 Builder Store의 양방향 동기화로 인한 문제 발생:
- 패널 열림/닫힘 시 스타일 변경이 반영되지 않는 버그
- `isUpdatingFromBuilder` 플래그로 인한 첫 번째 변경 무시
- 타이밍 이슈로 인한 불안정한 상태 동기화

### 해결 방안: Single Source of Truth

Inspector Store를 완전히 제거하고 Builder Store가 유일한 상태 관리 소스가 되도록 변경.

### 삭제된 파일

```
src/builder/inspector/
├── hooks/
│   ├── useInspectorState.ts    ❌ 삭제
│   └── useSyncWithBuilder.ts   ❌ 삭제
└── InspectorSync.tsx           ❌ 삭제
```

### 새로운 아키텍처

```
src/builder/stores/
├── index.ts                    # Builder Store (Single Source of Truth)
├── inspectorActions.ts         # ✅ 신규: Inspector 액션 슬라이스
└── ...

사용 패턴:
- 읽기: useSelectedElementData() → SelectedElement | null
- 쓰기: useStore.getState().updateSelectedStyle/Styles/Properties/...
```

### 마이그레이션된 컴포넌트

| 파일 | 변경 사항 |
|------|----------|
| `panels/styles/StylesPanel.tsx` | `useInspectorState` → `useSelectedElementData` |
| `panels/styles/hooks/useStyleActions.ts` | `useInspectorState.getState()` → `useStore.getState()` |
| `panels/properties/PropertiesPanel.tsx` | Inspector Store → Builder Store |
| `panels/properties/editors/SlotEditor.tsx` | `setSelectedElement` 직접 사용 |
| `panels/events/EventsPanel.tsx` | `useInspectorState` → `useStore` |
| `events/EventList.tsx` | `addEvent/removeEvent` → Builder Store |
| `events/EventEditor.tsx` | `updateEvent` → Builder Store |
| `panels/common/PropertyCustomId.tsx` | `updateCustomId` → Builder Store |
| `overlay/index.tsx` | borderRadius 읽기 → `useSelectedElementData` |
| `overlay/hooks/useBorderRadiusDrag.ts` | 스타일 업데이트 → Builder Store |
| `hooks/useIframeMessenger.ts` | computedStyle 업데이트 + 동기화 플래그 제거 |
| `main/BuilderCore.tsx` | `<InspectorSync />` 제거 |

### 새로운 API

```typescript
// src/builder/stores/index.ts

// 1. 선택된 요소 데이터 가져오기 (읽기)
export const useSelectedElementData = (): SelectedElement | null => {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const elementsMap = useStore((state) => state.elementsMap);

  return useMemo(() => {
    if (!selectedElementId) return null;
    const element = elementsMap.get(selectedElementId);
    if (!element) return null;
    return mapElementToSelectedElement(element);
  }, [selectedElementId, elementsMap]);
};

// 2. Inspector 액션 가져오기 (쓰기)
export const useInspectorActions = () => ({
  updateSelectedStyle: useStore.getState().updateSelectedStyle,
  updateSelectedStyles: useStore.getState().updateSelectedStyles,
  updateSelectedProperty: useStore.getState().updateSelectedProperty,
  updateSelectedProperties: useStore.getState().updateSelectedProperties,
  updateSelectedCustomId: useStore.getState().updateSelectedCustomId,
  updateSelectedDataBinding: useStore.getState().updateSelectedDataBinding,
  updateSelectedEvents: useStore.getState().updateSelectedEvents,
  addSelectedEvent: useStore.getState().addSelectedEvent,
  updateSelectedEvent: useStore.getState().updateSelectedEvent,
  removeSelectedEvent: useStore.getState().removeSelectedEvent,
});
```

### inspectorActions.ts 슬라이스

```typescript
// src/builder/stores/inspectorActions.ts

export interface InspectorActionsState {
  updateSelectedStyle: (property: string, value: string) => void;
  updateSelectedStyles: (styles: Record<string, string>) => void;
  updateSelectedProperty: (key: string, value: unknown) => void;
  updateSelectedProperties: (properties: Record<string, unknown>) => void;
  updateSelectedCustomId: (customId: string) => void;
  updateSelectedDataBinding: (dataBinding: DataBinding | undefined) => void;
  updateSelectedEvents: (events: EventHandler[]) => void;
  addSelectedEvent: (event: EventHandler) => void;
  updateSelectedEvent: (id: string, event: EventHandler) => void;
  removeSelectedEvent: (id: string) => void;
  updateSelectedComputedStyle: (computedStyle: Record<string, string>) => void;
}
```

### 이점

1. **버그 해결**: 양방향 동기화 타이밍 이슈 완전 제거
2. **코드 단순화**: 동기화 로직 제거로 코드 복잡도 감소
3. **성능 향상**: 불필요한 상태 복제 및 동기화 오버헤드 제거
4. **디버깅 용이**: 단일 상태 소스로 상태 추적 간편

---

## 완료 상태

- ✅ 메타데이터 시스템 (componentMetadata)
- ✅ 타입 정의 시스템 (types.ts)
- ✅ Zustand 상태 관리 (~~useInspectorState~~ → Builder Store)
- ✅ 에디터 레지스트리 (자동 로딩)
- ✅ PropertiesSection (동적 에디터 로딩)
- ✅ StyleSection (SemanticClassPicker, CSSVariableEditor, PreviewPanel)
- ✅ DataSection (Supabase/State/Static 바인딩 에디터)
- ✅ EventSection (EventList, EventEditor, 6가지 Action Editor)
- ✅ 전체 CSS 스타일링 완료
- ✅ 타입 에러 수정 완료
- ✅ **Phase 12: Single Source of Truth 마이그레이션** (2024-12)
  - Inspector Store 제거 (useInspectorState, useSyncWithBuilder, InspectorSync)
  - Builder Store에 inspectorActions 슬라이스 추가
  - 12개 컴포넌트 마이그레이션 완료
  - 양방향 동기화 버그 해결

## 디렉토리 구조

```
src/builder/
├── components/
│   ├── metadata.ts              # ✅ 컴포넌트 메타데이터 (Inspector 설정)
│   ├── list.ts                  # 컴포넌트 export + 메타데이터 export
│   └── ...
│
├── stores/                      # 🚀 Phase 12: Single Source of Truth
│   ├── index.ts                 # Builder Store + useSelectedElementData
│   ├── inspectorActions.ts      # ✅ Inspector 액션 슬라이스
│   └── ...
│
└── inspector/
    ├── index.tsx                # ✅ 메인 Inspector 컴포넌트 (4-tab structure)
    ├── index.css                # ✅ 통합 CSS (styles, data, events import)
    ├── index.ts                 # Public API export
    ├── types.ts                 # ✅ 공통 타입 정의
    │
    ├── sections/                # ✅ 4개 탭 섹션 (모두 완료)
    │   ├── PropertiesSection.tsx  # 동적 에디터 로딩
    │   ├── StyleSection.tsx       # 의미 클래스 + CSS 변수
    │   ├── DataSection.tsx        # 데이터 바인딩
    │   └── EventSection.tsx       # 이벤트 핸들러
    │
    ├── editors/                 # ✅ 에디터 레지스트리
    │   ├── registry.ts          # 자동 로딩 시스템
    │   └── index.ts
    │
    ├── hooks/                   # ✅ React Hooks (Phase 12 업데이트)
    │   ├── useComponentMeta.ts  # 메타데이터 조회
    │   └── index.ts             # ❌ useInspectorState 제거됨
    │
    ├── styles/                  # ✅ StyleSection 컴포넌트
    │   ├── SemanticClassPicker.tsx
    │   ├── CSSVariableEditor.tsx
    │   ├── PreviewPanel.tsx
    │   ├── styles.css
    │   └── index.ts
    │
    ├── data/                    # ✅ DataSection 에디터
    │   ├── DataSourceSelector.tsx
    │   ├── SupabaseCollectionEditor.tsx
    │   ├── SupabaseValueEditor.tsx
    │   ├── StateBindingEditor.tsx
    │   ├── StaticDataEditor.tsx
    │   ├── data.css
    │   └── index.ts
    │
    ├── events/                  # ✅ EventSection 컴포넌트
    │   ├── EventList.tsx
    │   ├── EventEditor.tsx
    │   ├── events.css
    │   ├── actions/
    │   │   ├── ActionEditor.tsx
    │   │   ├── NavigateActionEditor.tsx
    │   │   ├── SetStateActionEditor.tsx
    │   │   ├── APICallActionEditor.tsx
    │   │   ├── ShowModalActionEditor.tsx
    │   │   ├── ShowToastActionEditor.tsx
    │   │   └── ValidateFormActionEditor.tsx
    │   └── index.ts
    │
    └── properties/              # 기존 에디터들 (유지)
        └── editors/
            ├── ButtonEditor.tsx
            ├── TableEditor.tsx
            └── ...
```

## 핵심 개선 사항

### 1. 메타데이터 기반 자동화

**components/metadata.ts**에 컴포넌트 정보를 등록하면:

```typescript
{
  type: 'Button',
  label: 'Button',
  category: 'Actions',
  inspector: {
    hasCustomEditor: true,
    editorName: 'ButtonEditor',
    dataBindingType: null,
    supportedEvents: ['onClick', 'onPress'],
  },
}
```

- **PropertiesSection**: 자동으로 에디터 로딩
- **DataSection**: 바인딩 타입에 따라 자동 분기
- **EventSection**: 지원 이벤트만 표시

### 2. 관심사 분리

#### PropertiesSection (속성)

- tv() variants (variant, size)
- 컴포넌트 고유 props (columns, options)
- ❌ 데이터 소스, 스타일 제외

#### StyleSection (스타일)

- 의미 클래스 (.card, .primary)
- CSS 변수 (--color-_, --spacing-_)
- ❌ 인라인 Tailwind 유틸리티 금지

#### DataSection (데이터)

- Collection 바인딩 (Table, ListBox)
- Value 바인딩 (TextField, Select)
- Supabase / Zustand / Static

#### EventSection (이벤트)

- 컴포넌트별 지원 이벤트 자동 필터링
- Navigate / SetState / APICall 등

### 3. Zustand 상태 관리

> ⚠️ **업데이트**: Phase 12에서 `useInspectorState`가 제거되고 Builder Store로 통합되었습니다.
> 새로운 사용법은 상단의 "Phase 12: Single Source of Truth" 섹션을 참조하세요.

```typescript
// 🚀 새로운 방식: Builder Store 직접 사용
import { useStore, useSelectedElementData } from "@/builder/stores";

// 읽기
const selectedElement = useSelectedElementData();

// 쓰기
useStore.getState().updateSelectedStyle("color", "red");
useStore.getState().updateSelectedProperties({ variant: "primary" });
```

## 새 컴포넌트 추가 방법

### 1. 컴포넌트 생성

```typescript
// src/builder/components/CustomGrid.tsx
export interface CustomGridProps extends RACGridListProps {
  columns?: number;
}

export function CustomGrid(props: CustomGridProps) {
  // ...
}
```

### 2. 메타데이터 등록

```typescript
// src/builder/components/metadata.ts
{
  type: 'CustomGrid',
  label: 'Custom Grid',
  category: 'Data Display',
  inspector: {
    hasCustomEditor: true,
    editorName: 'CustomGridEditor',
    dataBindingType: 'collection',     // ← 자동 분기
    supportedEvents: ['onItemClick'],  // ← 자동 필터링
  },
}
```

### 3. 에디터 생성 (선택사항)

```typescript
// src/builder/inspector/properties/editors/CustomGridEditor.tsx
export default function CustomGridEditor({ element, onUpdate }: ComponentEditorProps) {
  return (
    <div>
      <SelectControl
        property={{ key: 'columns', label: 'Columns', ... }}
        onChange={(value) => onUpdate('columns', value)}
      />
    </div>
  );
}
```

### 4. 끝!

- registry.ts가 자동으로 에디터 로드
- DataSection이 자동으로 Collection 바인딩 UI 표시
- EventSection이 자동으로 onItemClick만 표시

## 타입 안정성

```typescript
export interface SelectedElement {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  semanticClasses?: string[];
  cssVariables?: Record<string, string>;
  dataBinding?: DataBinding;
  events?: EventHandler[];
}

export type DataBinding = CollectionBinding | ValueBinding;

export interface CollectionBinding {
  type: 'collection';
  source: 'static' | 'supabase' | 'state';
  config: SupabaseCollectionConfig | ...;
}

export interface EventHandler {
  id: string;
  event: string;
  action: EventAction;
}
```

## 마이그레이션 가이드

### 기존 코드 영향

- ✅ `properties/editors/*` - 그대로 동작 (registry.ts가 자동 로드)
- ⚠️ `design/` - 향후 StyleSection으로 통합 예정
- ⚠️ `events/` - 향후 EventSection으로 통합 예정

### 사용 방법

> ⚠️ **업데이트**: Phase 12에서 `useInspectorState`가 제거되었습니다.

```typescript
// 🚀 새로운 방식
import { useStore, useSelectedElementData } from "@/builder/stores";

// 선택된 요소 읽기
const selectedElement = useSelectedElementData();

// 요소 선택
useStore.getState().setSelectedElement("button-1");

// 속성 업데이트
useStore.getState().updateSelectedProperty("variant", "secondary");

// 스타일 업데이트
useStore.getState().updateSelectedStyle("color", "blue");
useStore.getState().updateSelectedStyles({ padding: "10px", margin: "5px" });
```

## 다음 단계

1. ✅ 메타데이터 시스템 구축
2. ✅ 자동 에디터 로딩
3. ✅ 4개 섹션 분리
4. ✅ Zustand 상태 관리
5. ✅ StyleSection 상세 구현 (완료!)
   - SemanticClassPicker: 의미 클래스 선택 UI
   - CSSVariableEditor: CSS 변수 재정의
   - PreviewPanel: 적용된 스타일 미리보기
6. ⏳ DataSection 상세 구현 (Supabase 연동)
7. ⏳ EventSection 상세 구현
8. ⏳ 기존 design/, events/ 마이그레이션
9. ✅ **Phase 12: Single Source of Truth** (완료!)
   - Inspector Store 제거
   - Builder Store로 상태 통합
   - 양방향 동기화 버그 해결

## 코딩 규칙 준수

- ✅ React Aria Components 사용
- ✅ Zustand 상태 관리
- ✅ TypeScript strict mode
- ✅ 의미 클래스 기반 스타일 (.primary, .card)
- ✅ CSS 변수 토큰 시스템 (--color-_, --spacing-_)
- ✅ Tailwind 인라인 유틸리티 금지
- ✅ Supabase JS v2 준비
- ✅ 모듈화된 구조
