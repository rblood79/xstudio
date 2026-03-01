# ADR-007: Quick Connect — Collection 컴포넌트 데이터 바인딩 자동화

## Status
Proposed

## Date
2026-03-02

## Decision Makers
XStudio Team

---

## Executive Summary

Collection 컴포넌트(ListBox, Select, ComboBox, GridList, Menu, Table)에 데이터를 연결하는 3단계 수동 작업을 **1클릭 Quick Connect**로 자동화한다. React Aria의 Dynamic Collections 패턴을 기본으로 따르며, 데이터 독립성(컴포넌트 삭제 시 DataTable 보존)을 유지한다.

### 업계 표준 분석

| 빌더 | 데이터 소스 자동 생성 | 삭제 시 데이터 | 패턴 |
|------|:---:|:---:|------|
| Webflow | ❌ | 유지 | 기존 CMS Collection 선택 |
| Retool | ❌ (데모만) | 유지 | 쿼리 기반 느슨 결합 |
| Framer | ❌ | 유지 | CMS Collection 선택 |
| Bubble.io | ❌ | 유지 | Type + 쿼리 2단계 |
| **XStudio (제안)** | **Quick Connect로 생성** | **유지** | **Preset 기반 1클릭** |

---

## Context

### 현재 워크플로우 (3단계)
1. Dataset 패널 → DataTable 수동 생성
2. Property Editor → DataBinding 소스/테이블 수동 선택
3. (ListBox만) "Field 자동 생성" 클릭

### 문제점
- Factory가 의미 없는 정적 아이템(Item 1, 2, 3) 생성
- 데이터 연결까지 3단계 수동 작업 필요
- 초보자에게 높은 학습 곡선

---

## Decision

### React Aria 정합성 원칙

#### Dynamic Collections (기본 경로)
React Aria 표준: `items` prop + render function으로 데이터 렌더링.
XStudio의 `dataBinding` → `useCollectionData` 훅 → `items` prop이 이 패턴을 정확히 구현.

**Quick Connect의 기본 동작 = DataTable 생성 + dataBinding 설정만으로 충분.**

#### 슬롯 시스템 (template 경로)
React Aria의 표준 슬롯: `slot="label"`, `slot="description"`, `slot="selection"`, `slot="drag"`.
사용자가 template을 커스터마이징할 때 이 슬롯 패턴을 따라야 함.

```tsx
// React Aria 표준 ListBoxItem
<ListBoxItem textValue={item.name}>
  <Text slot="label">{item.name}</Text>
  <Text slot="description">{item.email}</Text>
</ListBoxItem>

// React Aria 표준 GridListItem (인터랙티브 요소 허용)
<GridListItem textValue={item.name}>
  <Checkbox slot="selection" />
  <Text slot="label">{item.name}</Text>
  <Text slot="description">{item.description}</Text>
</GridListItem>
```

**ListBox vs GridList 사용 기준:**
- ListBox: 선택 전용 (인터랙티브 요소 **불가** — React Aria 제약)
- GridList: 선택 + 인터랙티브 (Checkbox, Switch 등 **허용**)

---

## Part 1: Factory 변경 — 빈 Collection 컴포넌트 생성

### 수정 대상

| 파일 | 제거할 기본 아이템 | 유지할 구조 |
|------|-------------------|------------|
| `apps/builder/src/builder/factories/definitions/SelectionComponents.ts` | ListBoxItem×3, SelectItem×3, ComboBoxItem×3, GridListItem×3 | Select/ComboBox 구조적 자식 (Label, Trigger 등) |
| `apps/builder/src/builder/factories/definitions/NavigationComponents.ts` | MenuItem×3 | — |
| `apps/builder/src/builder/factories/definitions/TableComponents.ts` | Column×3, Row×3, Cell×9 | TableHeader + TableBody (빈 구조) |

### 변경 결과

```
ListBox          → 빈 상태 (spec shapes placeholder)
Select           → Label + SelectTrigger(SelectValue + SelectIcon)
ComboBox         → Label + ComboBoxWrapper(Input + Trigger)
GridList         → 빈 상태
Menu             → 빈 상태
Table            → TableHeader + TableBody (빈 구조)
```

### renderEmptyState 기본 메시지 추가

빈 컴포넌트의 Preview 렌더링을 위해 공유 컴포넌트에 기본 empty state 추가:

```tsx
renderEmptyState={() => (
  <div className="collection-empty-state">데이터를 연결하세요</div>
)}
```

수정 대상: `packages/shared/src/components/` 내 ListBox.tsx, GridList.tsx, Select.tsx, ComboBox.tsx, Menu.tsx, Table.tsx

---

## Part 2: Quick Connect 기능

### 컴포넌트별 동작

| 컴포넌트 | Quick Connect 동작 | React Aria 패턴 |
|----------|-------------------|----------------|
| **ListBox** | DataTable + dataBinding | Dynamic Collections |
| **GridList** | DataTable + dataBinding | Dynamic Collections |
| **Select** | DataTable + dataBinding | Dynamic Collections |
| **ComboBox** | DataTable + dataBinding | Dynamic Collections |
| **Menu** | DataTable + dataBinding | Dynamic Collections |
| **Table** | DataTable + dataBinding + **Column 자동 생성** | Column 정의 필수 |

- ListBox/GridList: `item.name || item.title || item.label` 자동 매핑 (이미 구현됨)
- Table: React Aria가 Column 정의를 요구하므로 schema 기반 Column 자동 생성 필수

### 생성할 파일

#### `apps/builder/src/builder/hooks/useQuickConnect.ts`

```typescript
interface UseQuickConnectOptions {
  elementId: string;
  componentTag: string;
  currentDataBinding?: DataBindingValue | null;
  onDataBindingChange: (binding: DataBindingValue | null) => void;
  onConnected?: (schema: DataField[], tableName: string) => void;
}

interface UseQuickConnectResult {
  quickConnect: (preset: DataTablePreset | null) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
}
```

로직:
1. `useDataStore.getState()`에서 `createDataTable`, `currentProjectId`, `dataTables` 접근
2. 이름 고유성: `dataTables.has(name)` → suffix 추가 (`Users_2`)
3. `createDataTable()` 호출 → `onDataBindingChange()` → `onConnected?.()` (Table Column용)

#### `apps/builder/src/builder/hooks/useAutoGenerateColumns.ts`

Table 전용. Column 자동 생성만 담당.

```typescript
interface UseAutoGenerateColumnsOptions {
  elementId: string;
}

interface UseAutoGenerateColumnsResult {
  generateColumnsFromSchema: (schema: DataField[]) => Promise<void>;
}
```

#### `apps/builder/src/builder/components/property/QuickConnectButton.tsx` + `.css`

React-Aria `DialogTrigger` + `Popover` 기반 UI.

```
[Zap] Quick Connect (버튼)
  └── Popover (280px)
      ├── "빈 테이블" 옵션
      ├── 구분선
      └── 카테고리별 Preset 목록 (PRESET_CATEGORIES 5개)
```

재실행 처리: `isConnected=true` → 기존 DataTable 유지, 새 DataTable 생성 + 바인딩 교체

### 수정할 파일

| 파일 | 변경 내용 |
|------|---------|
| `hooks/index.ts` | `useQuickConnect`, `useAutoGenerateColumns` export |
| `components/property/index.ts` | `QuickConnectButton` export |
| `ListBoxEditor.tsx` | `inferFieldType` + `handleAutoGenerateFields` 제거, Quick Connect 추가 |
| `TableEditor.tsx` | `useQuickConnect` + `useAutoGenerateColumns` + QuickConnectButton |
| `GridListEditor.tsx` | `useQuickConnect` + QuickConnectButton |
| `SelectEditor.tsx` | `useQuickConnect` + QuickConnectButton |
| `ComboBoxEditor.tsx` | `useQuickConnect` + QuickConnectButton |
| `MenuEditor.tsx` | `useQuickConnect` + QuickConnectButton |

---

## 에디터 통합 패턴

### 모든 컴포넌트 (Table 제외)
```tsx
const { quickConnect, isConnected, isConnecting } = useQuickConnect({
  elementId, componentTag: 'ListBox',
  currentDataBinding, onDataBindingChange: handleDataBindingChange,
});

<PropertySection title="Data Binding" icon={Database}>
  <QuickConnectButton
    onQuickConnect={quickConnect}
    isConnected={isConnected}
    isConnecting={isConnecting}
  />
  <PropertyDataBinding label="데이터 소스" value={...} onChange={...} />
</PropertySection>
```

### Table (Column 생성 포함)
```tsx
const { generateColumnsFromSchema } = useAutoGenerateColumns({ elementId });
const { quickConnect, isConnected, isConnecting } = useQuickConnect({
  elementId, componentTag: 'Table',
  currentDataBinding, onDataBindingChange: handleDataBindingChange,
  onConnected: (schema) => generateColumnsFromSchema(schema),
});
```

---

## 데이터 흐름

```
Quick Connect 클릭 → Preset 선택
  ↓
useQuickConnect:
  1. DataTable 생성 (Data Store — IndexedDB)
  2. dataBinding 설정 (Element Store — props)
  3. onConnected 콜백 (Table만 — Column 생성)
  ↓
컴포넌트 렌더링:
  useCollectionData(dataBinding) → items prop → React Aria Dynamic Collections
  ↓
결과:
  - Canvas: Skia spec shapes가 데이터 렌더링
  - Preview: React Aria 컴포넌트가 동적 아이템 표시
  - Dataset 패널: DataTable 목록에 표시 → 편집 가능
  - Events 패널: onSelectionChange 등 이벤트 구성 가능
```

---

## 주의사항

| 항목 | 대응 |
|------|------|
| **이름 고유성** | `dataTables.has(name)` + suffix (`Users_2`) |
| **currentProjectId null** | console.error + 조용히 실패 |
| **Stale Closure** | async 내 `useDataStore.getState()` 사용 |
| **Quick Connect 재실행** | 기존 DataTable 유지 + 새 DataTable 생성 + 바인딩 교체 |
| **Undo/Redo** | Column 생성만 히스토리 (DataTable은 Data Store 독립) |
| **기존 수동 경로** | PropertyDataBinding + "바인딩 제거" 버튼 유지 |
| **Spec shapes 빈 상태** | 구현 전 6개 컴포넌트 placeholder 렌더링 검증 필수 |

---

## 구현 순서

1. Spec shapes 빈 상태 검증 (6개 컴포넌트)
2. Factory 변경: 기본 아이템 제거
3. renderEmptyState 추가 (6개 공유 컴포넌트)
4. useQuickConnect 훅 생성
5. useAutoGenerateColumns 훅 생성 (Table 전용)
6. QuickConnectButton 컴포넌트 + CSS 생성
7. ListBoxEditor 리팩토링 + Quick Connect 통합
8. TableEditor 통합 (Column 자동 생성)
9. GridListEditor, SelectEditor, ComboBoxEditor, MenuEditor 통합
10. export index 파일 업데이트
11. 타입 체크 (`cd apps/builder && pnpm exec tsc --noEmit`)

---

## 검증

1. `cd apps/builder && pnpm exec tsc --noEmit` — 타입 에러 없음
2. `pnpm dev` → 기능 테스트:
   - 빈 컴포넌트 생성 → spec placeholder + Preview empty state
   - Quick Connect → DataTable 생성 + dataBinding 설정
   - ListBox/GridList/Select/ComboBox/Menu → 동적 아이템 자동 렌더링
   - Table → Column 자동 생성 + 데이터 렌더링
   - 기존 수동 DataBinding 경로 정상 작동
   - 컴포넌트 삭제 → DataTable 유지 (데이터 독립성)
   - 동일 Preset 2회 → 이름 고유성 확인 (`Users`, `Users_2`)
   - Quick Connect 재실행 → 바인딩 교체 정상 동작

---

## Alternatives Considered

### A. Factory에서 DataTable 자동 생성 (기각)
컴포넌트 생성 시 자동으로 DataTable 생성. 기각 이유:
- 데이터/UI 강결합 (삭제 시 정리 복잡)
- DataTable 공유 불가 (1:1 바인딩)
- 업계 표준과 불일치 (5개 빌더 모두 자동 생성 안 함)

### B. 기존 수동 경로만 유지 (기각)
현재 시스템 유지. 기각 이유:
- 3단계 수동 작업 = 높은 학습 곡선
- Retool 등 경쟁 빌더 대비 UX 열위

### C. Field 자동 생성 (수정됨)
ListBox/GridList에 Field 자식 자동 생성. 수정 이유:
- React Aria의 Dynamic Collections 패턴과 불일치
- XStudio의 커스텀 확장 (slot 시스템 밖)
- dataBinding만으로 동적 렌더링이 이미 작동

---

## References

- [React Aria ListBox](https://react-aria.adobe.com/ListBox)
- [React Aria Collections](https://react-aria.adobe.com/collections)
- [React Aria GridList](https://react-aria.adobe.com/GridList)
- [ADR-001: State Management](./001-state-management.md)
