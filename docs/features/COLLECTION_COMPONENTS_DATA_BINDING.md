# Collection Components Data Binding

## 개요

Collection 컴포넌트들(ListBox, GridList, Select, ComboBox, TagGroup 등)의 동적 데이터 렌더링 시스템 구현 문서입니다. 이 시스템은 REST API, MOCK_DATA, Supabase 등 다양한 데이터 소스를 지원하며, Field 기반 템플릿 렌더링을 통해 일관된 패턴을 제공합니다.

**구현 날짜**: 2025-10-27

## 배경

기존에는 ListBox만 columnMapping과 Field 패턴을 지원했습니다. 다른 Collection 컴포넌트들(GridList, Select, ComboBox, TagGroup)도 동일한 패턴을 지원해야 했으며, 특히 ComboBox의 자동완성 필터링과 TagGroup의 항목 제거 기능이 필요했습니다.

## 구현된 기능

### 1. ComboBox Filtering (textValue)

**문제**: ComboBox에서 Field 기반 렌더링을 사용할 때 자동완성 필터링이 작동하지 않았습니다.

**원인**: React Aria의 ComboBox는 각 ComboBoxItem에 `textValue` prop이 필요하지만, Field 컴포넌트를 children으로 사용할 때는 textValue가 설정되지 않았습니다.

**해결책**:
```typescript
// SelectionRenderers.tsx:719-741
const textValue = fieldChildren
  .filter((field) => (field.props as { visible?: boolean }).visible !== false)
  .map((field) => {
    const fieldKey = (field.props as { key?: string }).key;
    const fieldValue = fieldKey ? item[fieldKey] : undefined;
    return fieldValue != null ? String(fieldValue) : '';
  })
  .filter(Boolean)
  .join(' ');

<ComboBoxItem
  key={String(item.id)}
  textValue={textValue}  // Required for filtering!
  value={item as object}
>
  {/* Field children */}
</ComboBoxItem>
```

**결과**:
- 사용자가 "John"을 입력하면 name 또는 email 필드에 "John"이 포함된 항목이 모두 표시됩니다
- 여러 필드를 한 번에 검색할 수 있습니다
- 부분 매칭을 지원합니다

### 2. TagGroup ColumnMapping Support

**문제**: TagGroup이 columnMapping을 지원하지 않아 동적 데이터 렌더링이 불가능했습니다.

**해결책**:

**TagGroup 컴포넌트** (`TagGroup.tsx:42-43, 87-151`):
```typescript
export interface TagGroupProps<T> {
  // ... other props
  removedItemIds?: string[];  // Track removed items
}

// Filter out removed items before rendering
const tagItems = boundData
  .filter((item, index) => {
    const itemId = String(item.id ?? index);
    return !removedItemIds.includes(itemId);
  })
  .map((item, index) => ({
    id: String(item.id || index),
    ...item,
  })) as T[];
```

**Preview Renderer** (`CollectionRenderers.tsx:174-384`):
```typescript
// ColumnMapping 추출
const columnMapping = (element.props as { columnMapping?: ColumnMapping })
  .columnMapping;

// Field 기반 renderChildren 함수 생성
const renderChildren = hasValidTemplate
  ? (item: Record<string, unknown>) => {
      const tagTemplate = tagChildren[0];
      const fieldChildren = context.elements.filter(...);

      return (
        <Tag key={String(item.id)} {...}>
          {fieldChildren.map(field => (
            <DataField
              fieldKey={field.props.key}
              type={field.props.type}
              value={item[field.props.key]}
            />
          ))}
        </Tag>
      );
    }
  : staticChildren;
```

**결과**:
- TagGroup이 REST API/MOCK_DATA에서 데이터를 로드하여 Tag들을 동적으로 렌더링합니다
- Field 컴포넌트를 사용하여 각 필드의 타입에 맞게 표시합니다
- ListBox, GridList, Select, ComboBox와 동일한 패턴을 따릅니다

### 3. TagGroup Item Removal (removedItemIds)

**문제**: TagGroup의 `allowsRemoving` 모드에서 항목을 제거해도 REST API 데이터는 그대로 남아 있어 화면에 다시 나타났습니다.

**해결책**: `removedItemIds` 배열을 사용한 비파괴적 제거 시스템

**아키텍처**:

1. **TagGroup 컴포넌트** - 필터링 로직:
```typescript
const tagItems = boundData
  .filter((item, index) => {
    const itemId = String(item.id ?? index);
    return !removedItemIds.includes(itemId);
  })
  .map((item) => ({ id: String(item.id), ...item }));
```

2. **Preview Renderer** - onRemove 핸들러:
```typescript
onRemove={async (keys) => {
  const keysToRemove = Array.from(keys).map(String);

  // ColumnMapping mode: Track removed IDs
  if (hasValidTemplate) {
    const updatedRemovedIds = [...currentRemovedIds, ...keysToRemove];
    updateElementProps(element.id, {
      removedItemIds: updatedRemovedIds,
      selectedKeys: updatedSelectedKeys,
    });
    // Save to database
    await ElementUtils.updateElementProps(element.id, updatedProps);
    return;
  }

  // Static mode: Delete actual Tag elements
  // ... existing deletion logic
}}
```

3. **Inspector Recovery UI** - 복구 버튼:
```tsx
{Array.isArray(currentProps.removedItemIds) && currentProps.removedItemIds.length > 0 && (
  <div style={{ backgroundColor: 'var(--color-warning-bg)' }}>
    <p>🗑️ Removed items: {currentProps.removedItemIds.length}</p>
    <button onClick={() => updateProp('removedItemIds', [])}>
      ♻️ Restore All Removed Items
    </button>
  </div>
)}
```

**데이터 흐름**:
```
1. 사용자가 Tag의 X 버튼 클릭
2. onRemove 콜백 호출
3. removedItemIds 배열에 item.id 추가
4. props 업데이트 (메모리 + DB)
5. TagGroup 컴포넌트가 리렌더링
6. 필터링으로 제거된 항목 제외
7. 화면에서 Tag 사라짐
```

**특징**:
- **비파괴적**: 원본 데이터(REST API/MOCK_DATA) 변경 없음
- **영구 저장**: removedItemIds가 DB에 저장되어 새로고침 후에도 유지
- **Undo 가능**: History 시스템과 통합되어 Ctrl+Z로 복구 가능
- **복구 가능**: Inspector에서 원클릭으로 모든 항목 복구

**결과**:
- Tag를 제거하면 화면에서 즉시 사라지고 다시 나타나지 않습니다
- Inspector에 제거된 항목 개수가 표시됩니다
- "♻️ Restore All" 버튼으로 모든 항목을 한 번에 복구할 수 있습니다

### 4. Initial Component Creation Pattern

**문제**: Collection 컴포넌트들이 생성될 때 서로 다른 개수의 child item을 생성했습니다 (Select: 3개, ComboBox: 2개).

**해결책**: 모든 Collection 컴포넌트가 **1개의 child item만 생성**하도록 통일

**변경사항** (`SelectionComponents.ts`):
```typescript
// Before
Select → 3 SelectItems
ComboBox → 2 ComboBoxItems

// After
Select → 1 SelectItem
ComboBox → 1 ComboBoxItem
GridList → 1 GridListItem
ListBox → 1 ListBoxItem
```

**이유**:
- columnMapping 모드에서는 1개의 child item이 템플릿으로 사용됩니다
- 초기에 여러 개의 항목이 있으면 혼란스럽고 불필요합니다
- 일관된 패턴을 제공합니다

**결과**:
- 모든 Collection 컴포넌트가 동일한 패턴을 따릅니다
- 사용자가 REST API를 연결하면 1개의 템플릿 항목이 모든 데이터에 적용됩니다
- 깔끔한 초기 상태를 제공합니다

## Collection Components 상태

| Component | columnMapping | textValue (filtering) | removedItemIds | Status |
|-----------|---------------|----------------------|----------------|--------|
| **ListBox** | ✅ | N/A | N/A | ✅ Implemented |
| **GridList** | ✅ | N/A | N/A | ✅ Implemented |
| **Select** | ✅ | N/A | N/A | ✅ Implemented |
| **ComboBox** | ✅ | ✅ | N/A | ✅ Implemented |
| **TagGroup** | ✅ | N/A | ✅ | ✅ Implemented |
| **Menu** | 🔄 | N/A | N/A | Pending |
| **Tree** | 🔄 | N/A | N/A | Hierarchical only |
| **CheckboxGroup** | 🔄 | N/A | N/A | Pending |
| **RadioGroup** | 🔄 | N/A | N/A | Pending |
| **ToggleButtonGroup** | 🔄 | N/A | N/A | Pending |

## 파일 위치

### 컴포넌트
- `src/builder/components/TagGroup.tsx` - TagGroup 컴포넌트
- `src/builder/components/ComboBox.tsx` - ComboBox 컴포넌트
- `src/builder/components/Select.tsx` - Select 컴포넌트
- `src/builder/components/GridList.tsx` - GridList 컴포넌트

### 렌더러
- `src/builder/preview/renderers/SelectionRenderers.tsx` - Select, ComboBox 렌더러
- `src/builder/preview/renderers/CollectionRenderers.tsx` - TagGroup 렌더러

### 에디터
- `src/builder/inspector/properties/editors/TagGroupEditor.tsx` - TagGroup Inspector
- `src/builder/inspector/data/DataSourceSelector.tsx` - DataBinding 타입 선택
- `src/builder/inspector/data/APICollectionEditor.tsx` - API Collection 설정

### 팩토리
- `src/builder/factories/definitions/SelectionComponents.ts` - 초기 컴포넌트 생성

## 사용 예제

### ComboBox 필터링
```typescript
// 사용자가 ComboBox에서 "john"을 입력
// → name에 "John Doe"가 있거나 email에 "john@example.com"이 있는 항목이 표시됨
```

### TagGroup 동적 렌더링
```typescript
// REST API에서 10개의 태그 데이터 로드
// → 각 태그마다 name, color 필드가 Field 컴포넌트로 표시됨
```

### TagGroup 항목 제거 및 복구
```typescript
// 1. Tag의 X 버튼 클릭
// 2. 화면에서 사라짐 (removedItemIds: ["tag-1"])
// 3. Inspector에서 "🗑️ Removed items: 1" 표시
// 4. "♻️ Restore All" 버튼 클릭
// 5. 태그가 다시 나타남 (removedItemIds: [])
```

## 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - Collection Components 전체 가이드
- [CHANGELOG.md](../CHANGELOG.md) - 변경사항 로그
- [Mock Data API](../../CLAUDE.md#mock-data-api-endpoints) - 테스트용 Mock 데이터

## 향후 계획

- Menu + MenuItem: columnMapping 지원 추가
- CheckboxGroup, RadioGroup, ToggleButtonGroup: columnMapping 지원 추가
- Tree: columnMapping 패턴 적용 (현재는 hierarchical data만 지원)
- 개별 항목 복구 UI (현재는 전체 복구만 지원)

## 참고 자료

- [React Aria Collections](https://react-spectrum.adobe.com/react-aria/collections.html)
- [Zustand Factory Pattern](https://docs.pmnd.rs/zustand/guides/typescript#slices-pattern)
