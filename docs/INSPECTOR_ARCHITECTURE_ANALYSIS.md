# Inspector 아키텍처 분석 및 패턴 비교

> **작성일**: 2025-11-09
> **목적**: Phase 1 시작 전 Events 구조와 다른 Inspector 파트들의 패턴 차이 분석

---

## 📊 Inspector 전체 구조 개요

### 파일 수 비교
| 섹션 | 파일 수 | 복잡도 | 주요 패턴 |
|------|---------|--------|-----------|
| **events/** | **47개** | **HIGH** | listMode/visualMode 이중 구조 |
| **properties/** | 51개 | MEDIUM | Registry 패턴 + 개별 Editor |
| **data/** | 11개 | LOW | Source별 Editor 분리 |
| **styles/** | 6개 | LOW | CSS Variable + Semantic Classes |

### 디렉토리 구조

```
inspector/
├── sections/                    # 4개의 메인 섹션
│   ├── PropertiesSection.tsx    # Registry 패턴 (동적 로딩)
│   ├── DataSection.tsx          # 단순 컴포넌트 위임
│   ├── StyleSection.tsx         # CSS 관리
│   └── EventSection.tsx         # ⚠️ 복잡한 상태 관리
│
├── properties/                  # 51개 파일 (간단명료)
│   └── editors/                 # 컴포넌트별 Editor (1:1 매칭)
│       ├── ButtonEditor.tsx
│       ├── CheckboxEditor.tsx
│       └── ... (48개)
│
├── data/                        # 11개 파일 (소스별 분리)
│   ├── DataSourceSelector.tsx   # 진입점
│   ├── APICollectionEditor.tsx  # API 데이터
│   ├── StaticDataEditor.tsx     # Static 데이터
│   └── SupabaseCollectionEditor.tsx  # Supabase
│
├── styles/                      # 6개 파일 (단순)
│   ├── SemanticClassPicker.tsx  # CSS 클래스 선택
│   └── CSSVariableEditor.tsx    # CSS 변수 편집
│
└── events/                      # ⚠️ 47개 파일 (과도하게 복잡)
    ├── actions/                 # 7개 (액션별 Editor)
    ├── components/              # 17개 (listMode + visualMode)
    │   ├── listMode/            # 9개 ⚠️ 중복 패턴
    │   └── visualMode/          # 6개 (ReactFlow)
    ├── data/                    # 4개
    ├── hooks/                   # 6개
    ├── types/                   # 3개
    └── utils/                   # 1개
```

---

## 🔍 섹션별 패턴 분석

### 1. Properties Section - ✅ Registry 패턴 (가장 단순)

**파일 구조:**
```
properties/
├── editors/
│   ├── ButtonEditor.tsx         # 11KB
│   ├── CheckboxEditor.tsx       # 8KB
│   ├── ComboBoxEditor.tsx       # 18KB
│   └── ... (48개 Editor)
└── types/
    └── editorTypes.ts           # 공통 타입
```

**패턴 특징:**

1. **Registry 패턴** - 동적 Editor 로딩
```typescript
// editors/registry.ts
export async function getEditor(componentType: string) {
  switch (componentType) {
    case 'Button': return (await import('./ButtonEditor')).ButtonEditor;
    case 'Checkbox': return (await import('./CheckboxEditor')).CheckboxEditor;
    // ...
  }
}

// sections/PropertiesSection.tsx
const [Editor, setEditor] = useState<ComponentType<ComponentEditorProps> | null>(null);

useEffect(() => {
  getEditor(element.type)
    .then((editor) => setEditor(() => editor))
    .catch(() => setEditor(null));
}, [element.type]);
```

2. **1:1 매핑** - 컴포넌트당 1개 Editor
3. **공통 인터페이스** - `ComponentEditorProps`
4. **간단한 상태 관리** - `updateProperties()`만 사용

**장점:**
- ✅ 명확한 구조 (1 Component = 1 Editor)
- ✅ 코드 분할 (Lazy loading)
- ✅ 확장 용이 (새 Editor 추가 쉬움)

**단점:**
- ❌ 없음 (이상적인 패턴)

---

### 2. Data Section - ✅ Source별 분리 패턴 (단순)

**파일 구조:**
```
data/
├── DataSourceSelector.tsx       # 진입점 (16KB)
├── APICollectionEditor.tsx      # 22KB ⚠️ 복잡
├── StaticDataEditor.tsx         # 16KB
├── SupabaseCollectionEditor.tsx # 10KB
├── APIValueEditor.tsx           # 3KB
└── utils/                       # 헬퍼 함수
```

**패턴 특징:**

1. **Source별 Editor 분리**
```typescript
// sections/DataSection.tsx (단순 위임)
export function DataSection({ element }: DataSectionProps) {
  return (
    <div className="data-section">
      <DataSourceSelector element={element} />
    </div>
  );
}

// data/DataSourceSelector.tsx
export function DataSourceSelector({ element }) {
  switch (dataBinding?.source) {
    case 'api': return <APICollectionEditor />;
    case 'static': return <StaticDataEditor />;
    case 'supabase': return <SupabaseCollectionEditor />;
  }
}
```

2. **3가지 데이터 소스**
   - `api` - REST API 연동
   - `static` - 정적 데이터
   - `supabase` - Supabase DB

3. **수동 상태 관리** (⚠️ React Stately 적용 필요)
```typescript
// APICollectionEditor.tsx - 현재 10개 useState
const [localEndpoint, setLocalEndpoint] = useState('');
const [localParams, setLocalParams] = useState('');
const [localHeaders, setLocalHeaders] = useState('');
const [availableColumns, setAvailableColumns] = useState<string[]>([]);
const [previewData, setPreviewData] = useState([]);
const [loading, setLoading] = useState(false);
// ... 10개 상태
```

**장점:**
- ✅ 소스별 명확한 분리
- ✅ 확장 가능 (새 소스 추가 쉬움)

**단점:**
- ⚠️ APICollectionEditor가 복잡 (22KB, 10개 useState)
- ⚠️ Phase 2에서 useAsyncList 적용 필요

---

### 3. Styles Section - ✅ 최소 구조 (가장 단순)

**파일 구조:**
```
styles/
├── SemanticClassPicker.tsx      # 주요 컴포넌트
├── CSSVariableEditor.tsx        # CSS 변수 편집
├── PreviewPanel.tsx             # 미리보기
├── semantic-classes.ts          # 클래스 정의
└── index.ts                     # Export
```

**패턴 특징:**

1. **Semantic Classes + CSS Variables**
```typescript
// SemanticClassPicker.tsx
const handleToggleClass = (classValue: string) => {
  const isSelected = selectedClasses.includes(classValue);
  const updated = isSelected
    ? selectedClasses.filter((c) => c !== classValue)
    : [...selectedClasses, classValue];
  onChange(updated);
};
```

2. **수동 배열 관리** (⚠️ useListData 적용 필요)

**장점:**
- ✅ 매우 단순한 구조
- ✅ 명확한 책임 분리

**단점:**
- ⚠️ Phase 2에서 useListData 적용 필요

---

### 4. Events Section - ❌ 과도하게 복잡 (47개 파일)

**파일 구조:**
```
events/
├── EventEditor.tsx              # 3.5KB
├── EventList.tsx                # 2.5KB
├── index.tsx                    # 18KB ⚠️ 너무 큼
├── events.css                   # 19KB
├── IMPLEMENTATION_GUIDE.md      # 12KB
│
├── actions/                     # 7개 파일 (액션별 Editor)
│   ├── NavigateActionEditor.tsx
│   ├── UpdateStateActionEditor.tsx
│   ├── ShowModalActionEditor.tsx
│   └── ... (4개)
│
├── components/                  # 17개 파일 ⚠️ 이중 구조
│   ├── EventHandlerManager.tsx  # 3.3KB
│   ├── ViewModeToggle.tsx       # 1.4KB
│   │
│   ├── listMode/                # 9개 파일 ⚠️ 중복
│   │   ├── EventPalette.tsx
│   │   ├── ActionPalette.tsx
│   │   ├── EventList.tsx
│   │   ├── ActionList.tsx        # 159줄 - 수동 Drag-drop
│   │   ├── EventTemplateLibrary.tsx
│   │   ├── EventCategoryGroup.tsx
│   │   ├── InlineActionEditor.tsx
│   │   ├── ActionReorderHandle.tsx
│   │   └── EventHandlerCard.tsx
│   │
│   └── visualMode/              # 6개 파일 (ReactFlow)
│       ├── ReactFlowCanvas.tsx
│       ├── TriggerNode.tsx
│       ├── ActionNode.tsx
│       ├── EdgeRenderer.tsx
│       └── ... (2개)
│
├── data/                        # 4개 파일
│   ├── eventTemplates.ts        # 템플릿 정의
│   ├── eventCategories.ts       # 카테고리
│   └── ...
│
├── hooks/                       # 6개 파일 ⚠️ 과도한 훅
│   ├── useEventSearch.ts        # 검색
│   ├── useApplyTemplate.ts      # 템플릿 적용
│   ├── useCopyPasteActions.ts   # 복사/붙여넣기
│   ├── useRecommendedEvents.ts  # 추천 이벤트
│   └── ...
│
├── types/                       # 3개 타입 파일
│   ├── eventTypes.ts
│   └── ...
│
└── utils/                       # 1개
    └── actionHelpers.ts
```

**패턴 특징:**

1. **이중 구조 - listMode vs visualMode** ⚠️
```typescript
// EventSection.tsx
const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');

return (
  <>
    <ViewModeToggle mode={viewMode} onChange={setViewMode} />
    {viewMode === 'list' ? (
      <EventPalette />   // 9개 파일
    ) : (
      <ReactFlowCanvas /> // 6개 파일
    )}
  </>
);
```

**문제점:**
- ❌ **15개 파일이 이중 구조로 중복** (listMode 9개 + visualMode 6개)
- ❌ **EventPalette vs ActionPalette** - 단순 Select로 대체 가능
- ❌ **EventTemplateLibrary** - 템플릿 기능 사용 빈도 낮음
- ❌ **EventCategoryGroup** - 불필요한 그룹핑
- ❌ **InlineActionEditor** - 각 ActionEditor로 이동 가능

2. **수동 상태 관리 (159줄)** ⚠️
```typescript
// listMode/ActionList.tsx (159 lines)
const { dragAndDropHooks } = useDragAndDrop({
  onReorder: (e) => {
    const reorderedActions = [...actions];
    const draggedItems = [...e.keys].map(key =>
      actions.find(a => a.id === key)
    );

    // 50+ 줄의 수동 재정렬 로직
    draggedItems.forEach((item) => {
      const index = reorderedActions.findIndex((a) => a.id === item.id);
      if (index !== -1) {
        reorderedActions.splice(index, 1);
      }
    });

    // 타겟 위치 계산
    let targetIndex = reorderedActions.findIndex(a => a.id === e.target.key);
    if (e.target.dropPosition === 'after') targetIndex++;

    reorderedActions.splice(targetIndex, 0, ...draggedItems);
    onReorder(reorderedActions);
  }
});
```

**React Stately 적용 시:**
```typescript
// useListData 사용 (단 3줄)
const { dragAndDropHooks } = useDragAndDrop({
  onReorder: (e) => {
    actionList.move(e.keys, e.target.key, e.target.dropPosition);
  }
});
```

3. **과도한 훅 (6개)** ⚠️
```typescript
// hooks/useEventSearch.ts - Select의 기본 필터링으로 충분
// hooks/useApplyTemplate.ts - 템플릿 기능 사용 빈도 낮음
// hooks/useCopyPasteActions.ts - 우선순위 낮음
// hooks/useRecommendedEvents.ts - AI 기능, 복잡도 높음
```

**장점:**
- ✅ ReactFlow 시각화 (visualMode)는 유용

**단점:**
- ❌ **47개 파일** (다른 섹션의 4-8배)
- ❌ **이중 구조** (listMode + visualMode 중복)
- ❌ **과도한 추상화** (Palette, Template, Category)
- ❌ **수동 상태 관리** (159줄의 Drag-drop 로직)
- ❌ **불필요한 훅** (6개 중 2-3개만 필요)

---

## 🔄 패턴 비교 매트릭스

| 기준 | Properties | Data | Styles | Events | 이상적 |
|------|-----------|------|--------|--------|--------|
| **파일 수** | 51개 | 11개 | 6개 | **47개** ⚠️ | 15-20개 |
| **복잡도** | MEDIUM | LOW | LOW | **HIGH** ⚠️ | MEDIUM |
| **주요 패턴** | Registry | Source별 분리 | Semantic | **이중 구조** ⚠️ | 단일 구조 |
| **상태 관리** | Simple | Manual | Manual | **Manual + 복잡** ⚠️ | React Stately |
| **중복 코드** | 없음 | 없음 | 없음 | **많음** ⚠️ | 없음 |
| **확장성** | ✅ 우수 | ✅ 우수 | ✅ 우수 | ❌ 낮음 | ✅ 우수 |
| **유지보수성** | ✅ 우수 | ✅ 좋음 | ✅ 우수 | ❌ 낮음 | ✅ 우수 |

---

## 🎯 Events 섹션이 복잡한 이유

### 1. 이중 UI 모드 (listMode vs visualMode)

**listMode (9개 파일):**
- EventPalette - 이벤트 타입 선택
- ActionPalette - 액션 타입 선택
- EventList - 이벤트 핸들러 목록
- ActionList - 액션 목록 (Drag-drop)
- EventTemplateLibrary - 템플릿 라이브러리
- EventCategoryGroup - 카테고리 그룹
- InlineActionEditor - 인라인 에디터
- ActionReorderHandle - 드래그 핸들
- EventHandlerCard - 핸들러 카드

**visualMode (6개 파일):**
- ReactFlowCanvas - ReactFlow 캔버스
- TriggerNode - 트리거 노드
- ActionNode - 액션 노드
- EdgeRenderer - 엣지 렌더러
- NodeToolbar - 노드 툴바
- ... (2개)

**문제:**
- ❌ 같은 기능을 2가지 방식으로 구현 (15개 파일)
- ❌ 이벤트 추가/삭제/수정 로직이 양쪽에 중복
- ❌ 상태 동기화 복잡도 증가

**해결책:**
- ✅ ReactFlow 중심으로 단일화
- ✅ EventPalette/ActionPalette → 간단한 Select로 대체
- ✅ 9개 파일 삭제 → 2개 파일로 대체

### 2. 과도한 추상화

**EventPalette vs ActionPalette:**
```typescript
// 현재 (2개 파일, 각 200+ 줄)
<EventPalette
  events={eventTypes}
  categories={categories}
  onSelect={handleSelect}
  search={true}
  groupByCategory={true}
/>

// 필요한 것 (React Aria Select, 30줄)
<Select onSelectionChange={handleSelect}>
  <Label>Add Event</Label>
  <Button><Plus />Add Event</Button>
  {eventTypes.map(type => (
    <SelectItem key={type}>{type}</SelectItem>
  ))}
</Select>
```

**EventTemplateLibrary:**
- ❌ 템플릿 기능 사용 빈도 낮음
- ❌ 복잡도만 증가
- ✅ 제거 가능

**EventCategoryGroup:**
- ❌ 카테고리 그룹핑 불필요
- ❌ Select의 기본 기능으로 충분
- ✅ 제거 가능

### 3. 수동 상태 관리

**ActionList.tsx (159줄):**
```typescript
// ❌ 현재: 50+ 줄의 수동 재정렬 로직
const handleReorder = (e) => {
  const reorderedActions = [...actions];
  // 드래그된 아이템 찾기
  const draggedItems = [...e.keys].map(key =>
    actions.find(a => a.id === key)
  );
  // 기존 위치에서 제거
  draggedItems.forEach((item) => {
    const index = reorderedActions.findIndex((a) => a.id === item.id);
    if (index !== -1) {
      reorderedActions.splice(index, 1);
    }
  });
  // 새 위치에 삽입
  let targetIndex = reorderedActions.findIndex(a => a.id === e.target.key);
  if (e.target.dropPosition === 'after') targetIndex++;
  reorderedActions.splice(targetIndex, 0, ...draggedItems);
  onReorder(reorderedActions);
};

// ✅ React Stately: 단 1줄
const handleReorder = (e) => {
  actionList.move(e.keys, e.target.key, e.target.dropPosition);
};
```

### 4. 불필요한 훅 (6개 중 4개 제거 가능)

| 훅 | 기능 | 필요성 | 대안 |
|----|------|--------|------|
| useEventSearch | 이벤트 검색 | ❌ 낮음 | Select 기본 필터링 |
| useApplyTemplate | 템플릿 적용 | ❌ 낮음 | 제거 |
| useCopyPasteActions | 복사/붙여넣기 | ❌ 중간 | Phase 1 이후 |
| useRecommendedEvents | AI 추천 | ❌ 낮음 | Phase 1 이후 |
| useEventFlow | ReactFlow 변환 | ✅ 높음 | **유지** |
| useDragAndDrop | Drag-drop | ✅ 높음 | **React Stately로 대체** |

---

## ✅ Phase 1 리팩토링 방향

### 제거할 패턴

1. **❌ 이중 구조 제거**
   - listMode 9개 파일 → 삭제
   - visualMode만 유지 (ReactFlow 중심)

2. **❌ 과도한 추상화 제거**
   - EventPalette → EventTypePicker (Select)
   - ActionPalette → ActionTypePicker (Select)
   - EventTemplateLibrary → 삭제
   - EventCategoryGroup → 삭제
   - InlineActionEditor → 각 ActionEditor로 이동

3. **❌ 불필요한 훅 제거**
   - useEventSearch → 삭제
   - useApplyTemplate → 삭제
   - useCopyPasteActions → 삭제 (Phase 1 이후 재검토)
   - useRecommendedEvents → 삭제 (Phase 1 이후 재검토)

### 추가할 패턴

1. **✅ React Stately 기반 상태 관리**
   - `useEventHandlers.ts` (useListData)
   - `useActions.ts` (useListData)
   - `useEventSelection.ts` (useListState)

2. **✅ 간단한 Select 컴포넌트**
   - `EventTypePicker.tsx` (30줄)
   - `ActionTypePicker.tsx` (30줄)

3. **✅ ReactFlow 중심 UI**
   - `EventFlowCanvas.tsx` (기존 유지, 개선)
   - `TriggerNode.tsx` (기존 유지)
   - `ActionNode.tsx` (기존 유지)

### 새로운 구조

```
events/
├── editors/                     # 7개 (기존 actions/ 이름 변경)
│   ├── NavigateActionEditor.tsx
│   ├── UpdateStateActionEditor.tsx
│   └── ... (5개)
│
├── flow/                        # 4개 (기존 visualMode/)
│   ├── EventFlowCanvas.tsx
│   ├── TriggerNode.tsx
│   ├── ActionNode.tsx
│   └── useEventFlow.ts
│
├── state/                       # 3개 ✨ NEW (React Stately)
│   ├── useEventHandlers.ts
│   ├── useActions.ts
│   └── useEventSelection.ts
│
├── pickers/                     # 2개 ✨ NEW (간단한 Select)
│   ├── EventTypePicker.tsx
│   └── ActionTypePicker.tsx
│
└── utils/
    └── actionHelpers.ts

총: 16개 파일 (47개 → 16개, -66%)
```

---

## 🎯 다른 섹션에도 적용할 패턴

### Properties Section
- ✅ **이미 이상적** - 변경 불필요
- Registry 패턴 유지

### Data Section
- ⚠️ **Phase 2 적용**
- `useAsyncList` 적용 (APICollectionEditor)
- 10개 useState → 1개 useAsyncList

### Styles Section
- ⚠️ **Phase 2 적용**
- `useListData` 적용 (SemanticClassPicker)
- 수동 배열 조작 → useListData

---

## 📊 최종 요약

| 섹션 | 현재 패턴 | 문제점 | Phase | 적용 패턴 |
|------|----------|--------|-------|-----------|
| **Events** | 이중 구조 (47개) | ❌ 과도한 복잡도 | **Phase 1** | useListData + ReactFlow |
| **Properties** | Registry (51개) | ✅ 이상적 | - | 변경 불필요 |
| **Data** | Source별 (11개) | ⚠️ 수동 fetch | **Phase 2** | useAsyncList |
| **Styles** | Semantic (6개) | ⚠️ 수동 배열 | **Phase 2** | useListData |

### Phase 1 목표
- **Events만 집중 리팩토링**
- **47개 → 16개 파일** (-66%)
- **5,604줄 → 2,800줄** (-50%)
- **React Stately 완전 적용**

### 다른 섹션은 Phase 2+에서
- Data: useAsyncList 적용
- Styles: useListData 적용
- Properties: 변경 없음 (이미 이상적)

---

**결론:** Events 섹션만 유독 복잡한 이유는 **이중 UI 모드 + 과도한 추상화 + 수동 상태 관리** 때문입니다. Phase 1에서 이를 **ReactFlow 중심 + React Stately**로 단순화합니다.
