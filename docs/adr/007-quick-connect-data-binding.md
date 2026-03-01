# ADR-007: Quick Connect — Collection 컴포넌트 데이터 바인딩 자동화

## Status
Proposed

## Date
2026-03-02 (effective date — 검토 완료 기준)

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
| `apps/builder/src/builder/factories/definitions/SelectionComponents.ts` | ListBoxItem×3, SelectItem×1, ComboBoxItem×1, GridListItem×4 | Select/ComboBox 구조적 자식 (Label, Trigger 등) |
| `apps/builder/src/builder/factories/definitions/NavigationComponents.ts` | MenuItem×3 | — |
| `apps/builder/src/builder/factories/definitions/TableComponents.ts` | _(이미 빈 구조 — 변경 불필요)_ | TableHeader + TableBody (빈 구조) |

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

수정 대상 (`packages/shared/src/components/`):

| 컴포넌트 | 적용 포인트 | 비고 |
|----------|-----------|------|
| `ListBox.tsx` | `<ListBox renderEmptyState={...}>` | React Aria 기본 지원 (`renderEmptyState` prop) |
| `GridList.tsx` | `<GridList renderEmptyState={...}>` | React Aria 기본 지원 |
| `Select.tsx` | `<ListBox>` 내부 (Select의 popup) | Select 자체가 아닌 내부 ListBox에 적용 |
| `ComboBox.tsx` | `<ListBox>` 내부 (ComboBox의 popup) | ComboBox 자체가 아닌 내부 ListBox에 적용 |
| `Menu.tsx` | `<Menu renderEmptyState={...}>` | React Aria 기본 지원 |
| `Table.tsx` | `<tbody>` 내부 행 0개 분기에서 placeholder `<tr>` 렌더링 | 커스텀 TanStack 가상화 구조이므로 React Aria `renderEmptyState` 미사용. `rows.length === 0` 조건에서 colspan 전체 placeholder row 표시 |

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
| **Table** | DataTable + dataBinding (기존 `ADD_COLUMN_ELEMENTS` 파이프라인이 Column 자동 생성) | Column 정의 필수 |

- ListBox/GridList: `item.name || item.title || item.label` 자동 매핑 (이미 구현됨)
- Table: 기존 런타임 파이프라인(`Table.tsx detectColumnsFromData → TableRenderer.tsx onColumnsDetected → postMessage("ADD_COLUMN_ELEMENTS") → useIframeMessenger.ts`)이 dataBinding 설정 후 Column을 자동 생성하므로 별도 훅 불필요

### 생성할 파일

#### `apps/builder/src/builder/hooks/useQuickConnect.ts`

```typescript
interface UseQuickConnectOptions {
  elementId: string;
  componentTag: string;
  currentDataBinding?: DataBindingValue | null;
  onDataBindingChange: (binding: DataBindingValue | null) => void | Promise<void>;
}

interface UseQuickConnectResult {
  quickConnect: (preset: DataTablePreset | null) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
}
```

로직:
1. `useDataStore.getState()`에서 `createDataTable`, `currentProjectId`, `dataTables` 접근
2. 이름 고유성: `name.trim().toLowerCase()` 기준으로 `dataTables` 내 중복 검사 → 충돌 시 suffix 추가 (`Users_2`)
3. `createDataTable()` 호출 → `await onDataBindingChange()` (Table은 기존 `ADD_COLUMN_ELEMENTS` 파이프라인이 자동 처리)

#### ~~`apps/builder/src/builder/hooks/useAutoGenerateColumns.ts`~~ (삭제됨)

> **기각 사유**: 기존 런타임에 `ADD_COLUMN_ELEMENTS` 파이프라인이 이미 완전 구현되어 있음.
> `Table.tsx detectColumnsFromData()` → `TableRenderer.tsx onColumnsDetected` → `postMessage("ADD_COLUMN_ELEMENTS")` → `useIframeMessenger.ts` Store/DB 반영.
> 중복 방지도 양쪽(`columnCreationRequestedRef` Set + `existingIds` Set)에서 이중 처리됨.
> 별도 훅을 추가하면 기존 파이프라인과 경합/이중 생성 위험이 있으므로 기존 경로를 그대로 활용한다.

#### `apps/builder/src/builder/components/property/QuickConnectButton.tsx` + `.css`

React-Aria `DialogTrigger` + `Popover` 기반 UI.

```
[Zap] Quick Connect (버튼)
  └── Popover (280px)
      ├── "빈 테이블" 옵션
      ├── 구분선
      └── 카테고리별 Preset 목록 (PRESET_CATEGORIES 5개)
```

재실행 처리: `isConnected=true` → 기존 DataTable 유지, 새 DataTable 생성 + 바인딩 교체.
Table 재실행 시 Column 처리: 기존 Column Elements **전체 교체** (replace). 스키마가 변경될 수 있으므로 merge/append 대신 clean replace를 기본 전략으로 한다. 기존 Column이 존재하면 사용자에게 "기존 컬럼을 새 스키마로 교체합니다" 확인 다이얼로그를 표시하고, 승인 시 `TableHeader` 하위 **Column + ColumnGroup Elements를 함께 삭제**한 뒤 `ADD_COLUMN_ELEMENTS` 파이프라인이 새 Column을 자동 생성한다. (기본 정책: ColumnGroup 초기화)

### 수정할 파일

| 파일 | 변경 내용 |
|------|---------|
| `hooks/index.ts` | `useQuickConnect` export |
| `components/property/index.ts` | `QuickConnectButton` export |
| `components/index.ts` | `QuickConnectButton` re-export 추가 (에디터들이 `'../../../components'` 루트 barrel을 통해 import하는 패턴 유지) |
| `ListBoxEditor.tsx` | `inferFieldType` + `handleAutoGenerateFields` 제거, Quick Connect 추가 |
| `TableEditor.tsx` | `useQuickConnect` + QuickConnectButton (Column은 기존 `ADD_COLUMN_ELEMENTS` 파이프라인 활용) |
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

### Table (기존 ADD_COLUMN_ELEMENTS 파이프라인 활용)
```tsx
const { quickConnect, isConnected, isConnecting } = useQuickConnect({
  elementId, componentTag: 'Table',
  currentDataBinding, onDataBindingChange: handleDataBindingChange,
});
// dataBinding 설정 후 Preview의 TableRenderer가 데이터를 감지하면
// ADD_COLUMN_ELEMENTS postMessage → useIframeMessenger가 Column 자동 생성
```

---

## 데이터 흐름

```
Quick Connect 클릭 → Preset 선택
  ↓
useQuickConnect:
  1. DataTable 생성 (Data Store — IndexedDB)
  2. await dataBinding 설정 (Element Store — props)
  3. (Table) Preview 렌더 → 기존 ADD_COLUMN_ELEMENTS 파이프라인이 Column 자동 생성
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
| **이름 고유성** | `name.trim().toLowerCase()` 기준으로 `dataTables` 내 중복 검사 → 충돌 시 suffix 추가 (`Users_2`). `Users` vs `users` 충돌 방지 |
| **currentProjectId null** | console.error + 조용히 실패 |
| **Stale Closure** | async 내 `useDataStore.getState()` 사용 |
| **Quick Connect 재실행** | 기존 DataTable 유지 + 새 DataTable 생성 + 바인딩 교체 |
| **Undo/Redo** | 현재 `ADD_COLUMN_ELEMENTS` 경로는 `useStore.setState()` 직접 반영이므로 히스토리 스택을 타지 않음. DataTable도 Data Store 독립. Quick Connect 전체가 Undo 대상 밖이며, 되돌리기는 수동 바인딩 해제 + Column 삭제로 대응. 향후 히스토리 통합 시 `ADD_COLUMN_ELEMENTS` 핸들러에 `recordHistory()` 추가 필요 |
| **기존 수동 경로** | PropertyDataBinding + "바인딩 제거" 버튼 유지 |
| **Spec shapes 빈 상태** | 구현 전 6개 컴포넌트 placeholder 렌더링 검증 필수 |
| **PixiListBox/PixiList fallback** | 구 패턴 컴포넌트(`PixiListBox`, `PixiList`)는 자식이 없으면 하드코딩 기본값(Item 1~3/1~5)을 강제 주입함. Factory 아이템 제거 시 캔버스에 여전히 기본값이 표시되어 Preview와 불일치 발생. **구현 시 fallback 로직을 `dataBinding` 유무로 분기하거나 제거 필요.** (PixiSelect/PixiGridList은 A등급 패턴으로 리팩토링 완료, 영향 없음) |
| **Quick Connect 실패 롤백** | `createDataTable` 호출 전 `prevBinding`을 보존한다. `createDataTable` 성공 후 `onDataBindingChange` 실패 시 catch 블록에서 **(1) `onDataBindingChange(prevBinding)`으로 기존 바인딩 복구 시도** 후 **(2) `deleteDataTable(id)`로 생성된 DataTable 삭제**를 수행한다. 두 단계 중 하나라도 실패하면 console.error 로깅 후 조용히 실패 (사용자는 Dataset 패널에서 수동 복구 가능) |

---

## 구현 계획

총: 수정 18파일 + 신규 3파일 = 21파일

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
 (검증)    (기반)    (핵심)    (통합)    (마무리)
```

Phase 3-A (hook)와 3-B (UI)는 병렬 가능. Phase 4-A → 4-B → 4-C 순차.

---

### Phase 1: 검증 및 준비

#### 1-A. Spec shapes 빈 상태 분석 — 수정 불필요

Factory 아이템 제거 시 `_hasChildren=false` → spec이 자체 placeholder 렌더링:
- ListBox.spec: `['Item 1','Item 2','Item 3']` 자체 렌더링
- GridList.spec: `DEFAULT_ITEMS` 4개
- Menu.spec: `['Edit','Copy','Paste','---','Delete']`
- Select/ComboBox: Label+Trigger 구조적 자식이 남아 `_hasChildren=true` 유지
- Table: `CHILD_COMPOSITION_EXCLUDE_TAGS`에 포함, `DEFAULT_COLUMNS/ROWS` 하드코딩

Canvas에서 "비어 보이는" 현상 없음. Spec 수정 불필요.

#### 1-B. PixiListBox/PixiList fallback 분기 처리

| 파일 | 수정 위치 | 변경 |
|------|----------|------|
| `apps/builder/src/builder/workspace/canvas/ui/PixiListBox.tsx` | L114~118 (fallback 반환부) | `element.props?.dataBinding` 존재 시 빈 배열 `[]` 반환, 없으면 기존 하드코딩 유지 |
| `apps/builder/src/builder/workspace/canvas/ui/PixiList.tsx` | L56~63 (`parseListItems` fallback) | `props?.dataBinding` 존재 시 빈 배열 반환 |

---

### Phase 2: Factory 및 Empty State

#### 2-A. Factory 기본 아이템 제거

**`apps/builder/src/builder/factories/definitions/SelectionComponents.ts`**:
| 라인 | 대상 | 변경 후 |
|------|------|--------|
| L80~89 | SelectItem ×1 | children = [Label, SelectTrigger] |
| L172~181 | ComboBoxItem ×1 | children = [Label, ComboBoxWrapper] |
| L213~244 | ListBoxItem ×3 | children = [] |
| L274~315 | GridListItem ×4 | children = [] |

**`apps/builder/src/builder/factories/definitions/NavigationComponents.ts`**:
| 라인 | 대상 | 변경 후 |
|------|------|--------|
| L41~66 | MenuItem ×3 | children = [] |

#### 2-B. 공유 컴포넌트 Empty State 추가

| 파일 (`packages/shared/src/components/`) | 적용 방식 | 주요 수정 위치 |
|---|---|---|
| `ListBox.tsx` | `<AriaListBox renderEmptyState={...}>` | L554~558 등 모든 AriaListBox 호출부 |
| `GridList.tsx` | `<AriaGridList renderEmptyState={...}>` | L289~293 등 |
| `Select.tsx` | 내부 `<ListBox renderEmptyState={...}>` | L321~327 (popup ListBox) |
| `ComboBox.tsx` | 내부 `<ListBox renderEmptyState={...}>` | L155, 253, 309, 392 등 |
| `Menu.tsx` | `<Menu renderEmptyState={...}>` | L403 등 모든 Menu 호출부 |
| `Table.tsx` | `<tbody>` 내 `rows.length === 0` 분기 placeholder `<tr>` | L1359 (rowVirtualizer.map 앞) |

Empty state 메시지: `"데이터를 연결하세요"` (`.collection-empty-state` 클래스)

---

### Phase 3: Core Hook 및 UI

#### 3-A. useQuickConnect 훅 — 신규 생성

**`apps/builder/src/builder/hooks/useQuickConnect.ts`**

핵심 로직:
1. `useDataStore.getState()`로 stale closure 방지
2. 이름 고유성: `name.trim().toLowerCase()` 기준 중복 검사 → suffix
3. `createDataTable()` → `await onDataBindingChange(newBinding)`
4. 실패 시 롤백: `onDataBindingChange(prevBinding)` → `deleteDataTable(id)` (UUID)
5. preset이 null이면 빈 테이블 생성

재사용할 기존 코드:
- `useDataStore`: `stores/data.ts` — `createDataTable`, `deleteDataTable`, `dataTables`, `currentProjectId`
- `DataTableCreate` 타입: `types/builder/data.types.ts` L82~86
- `DataTablePreset` / `PRESET_CATEGORIES`: `panels/datatable/presets/index.ts`

#### 3-B. QuickConnectButton — 신규 생성 (2파일)

**`apps/builder/src/builder/components/property/QuickConnectButton.tsx`** + **`.css`**

UI 구조 (`ActionTypePicker` 패턴 참조):
```
DialogTrigger
  ├── Button "[Zap] Quick Connect"
  └── Popover (280px, @xstudio/shared/components/Popover)
      ├── 검색 input
      └── ListBox
          ├── "빈 테이블" 옵션
          ├── 구분선
          └── PRESET_CATEGORIES 5개 × DATATABLE_PRESETS
```

CSS: `@layer components { }` + BEM-like + M3 변수

---

### Phase 4: 에디터 통합

#### 4-A. ListBoxEditor 리팩토링

**`apps/builder/src/builder/panels/properties/editors/ListBoxEditor.tsx`**

제거:
- `inferFieldType` (L108~125), `handleAutoGenerateFields` (L128~223)
- `existingFields`, `templateItem`, `getChildElements` 관련 코드
- Auto-Generate 버튼 UI (L609~649)
- `handleDataBindingChange`의 Field 삭제 confirm 로직 (L278~293) → 단순화

추가: `useQuickConnect` 훅 + `<QuickConnectButton>` (PropertyDataBinding 위에)

#### 4-B. TableEditor 통합 (Column replace 포함)

**`apps/builder/src/builder/panels/properties/editors/TableEditor.tsx`**

추가:
- `useQuickConnect` 훅 호출
- `handleQuickConnect` 래퍼: 기존 Column+ColumnGroup 있으면 confirm → `removeElements(ids)` → `quickConnect(preset)` → `ADD_COLUMN_ELEMENTS` 파이프라인 자동 트리거
- `<QuickConnectButton onQuickConnect={handleQuickConnect}>` (Data Binding 섹션 L306~313)

재사용: `removeElements` (`elements.ts` L113), `columnCreationRequestedRef` 자동 초기화 (수동 reset 불필요)

#### 4-C. 나머지 4개 에디터 — 동일 패턴

| 파일 | componentTag | Data Binding 섹션 |
|------|-------------|-----------------|
| `GridListEditor.tsx` | `'GridList'` | L213~220 |
| `SelectEditor.tsx` | `'Select'` | L421~432 (useMemo) |
| `ComboBoxEditor.tsx` | `'ComboBox'` | L399~410 (useMemo) |
| `MenuEditor.tsx` | `'Menu'` | L70~77 |

각 에디터에 추가: import + `useQuickConnect` 훅 + `<QuickConnectButton>` (PropertyDataBinding 위)

---

### Phase 5: 마무리

#### 5-A. Barrel Export 업데이트

| 파일 | 추가 내용 |
|------|----------|
| `hooks/index.ts` | `export { useQuickConnect } from './useQuickConnect'` (Data Management 카테고리 L19 부근) |
| `components/property/index.ts` | `export { QuickConnectButton } from './QuickConnectButton'` (L12 이후) |
| `components/index.ts` | `QuickConnectButton` re-export 추가 (L23 PropertyDataBinding 다음) |

#### 5-B. 타입 체크

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

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
   - Table 재실행 → 기존 Column + ColumnGroup 교체 확인 다이얼로그 + 새 Column 정상 생성
   - PixiListBox 빈 상태 → 캔버스에 하드코딩 기본값 미표시 확인 (Preview와 일치)
   - Quick Connect 실패 시 → dataBinding 이전 값 복구 + orphan DataTable 미발생 (롤백 확인)

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
