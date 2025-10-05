# Inspector 리팩토링 완료 ✅

## 개요

Inspector를 확장 가능한 구조로 완전히 리팩토링했습니다. 이제 새로운 컴포넌트를 추가할 때 메타데이터만 등록하면 자동으로 Inspector가 동작합니다.

## 완료 상태

- ✅ 메타데이터 시스템 (componentMetadata)
- ✅ 타입 정의 시스템 (types.ts)
- ✅ Zustand 상태 관리 (useInspectorState)
- ✅ 에디터 레지스트리 (자동 로딩)
- ✅ PropertiesSection (동적 에디터 로딩)
- ✅ StyleSection (SemanticClassPicker, CSSVariableEditor, PreviewPanel)
- ✅ DataSection (Supabase/State/Static 바인딩 에디터)
- ✅ EventSection (EventList, EventEditor, 6가지 Action Editor)
- ✅ 전체 CSS 스타일링 완료
- ✅ 타입 에러 수정 완료

## 디렉토리 구조

```
src/builder/
├── components/
│   ├── metadata.ts              # ✅ 컴포넌트 메타데이터 (Inspector 설정)
│   ├── list.ts                  # 컴포넌트 export + 메타데이터 export
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
    ├── hooks/                   # ✅ React Hooks
    │   ├── useInspectorState.ts # Zustand store
    │   ├── useComponentMeta.ts  # 메타데이터 조회
    │   └── index.ts
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

```typescript
const useInspectorState = create((set) => ({
  selectedElement: null,

  // Properties
  updateProperty: (key, value) => { ... },
  updateProperties: (props) => { ... },

  // Styles
  updateSemanticClasses: (classes) => { ... },
  updateCSSVariables: (vars) => { ... },

  // Data
  updateDataBinding: (binding) => { ... },

  // Events
  updateEvents: (events) => { ... },
  addEvent: (event) => { ... },
}));
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

```typescript
import { useInspectorState } from "@/builder/inspector";

// 컴포넌트에서 사용
const { selectedElement, updateProperty } = useInspectorState();

// 요소 선택
setSelectedElement({
  id: "button-1",
  type: "Button",
  properties: { variant: "primary", size: "md" },
});

// 속성 업데이트
updateProperty("variant", "secondary");
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

## 코딩 규칙 준수

- ✅ React Aria Components 사용
- ✅ Zustand 상태 관리
- ✅ TypeScript strict mode
- ✅ 의미 클래스 기반 스타일 (.primary, .card)
- ✅ CSS 변수 토큰 시스템 (--color-_, --spacing-_)
- ✅ Tailwind 인라인 유틸리티 금지
- ✅ Supabase JS v2 준비
- ✅ 모듈화된 구조
