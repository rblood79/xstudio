# Dataset → DataTable 리네이밍 리팩토링 계획

## 개요

**목적**: `Dataset` 네이밍을 `DataTable`로 변경하여 실제 구현 의미와 일치시킴

**배경**:
- 현재 `Dataset`이라는 이름은 통계/ML에서 사용하는 넓은 데이터 집합 개념
- 실제 구현은 DB 테이블 개념: 스키마 정의, CRUD, API 연동 등
- 내부 컴포넌트들이 이미 `DataTable*` 네이밍 사용 중 (DataTableEditor, DataTableList 등)

**영향 범위**: ~70개 파일

---

## Phase 계획

| Phase | 내용 | 파일 수 | 위험도 |
|-------|------|---------|--------|
| **Phase 1** | Types & Store 변경 | 3 | 🔴 High |
| **Phase 2** | Panel 폴더 및 파일 변경 | 28 | 🟡 Medium |
| **Phase 3** | Component & Factory 변경 | 5 | 🟡 Medium |
| **Phase 4** | Events 시스템 변경 | 12 | 🟡 Medium |
| **Phase 5** | Hooks & Utils 변경 | 4 | 🟢 Low |
| **Phase 6** | 문서 업데이트 | 15+ | 🟢 Low |

---

## Phase 1: Types & Store 변경 🔴

**목표**: 핵심 타입 정의와 Store를 먼저 변경

### 1.1 타입 파일 변경

**파일**: `src/types/dataset.types.ts` → `src/types/datatable.types.ts`

**변경 내용**:
```typescript
// 파일명 변경 + 내용 변경

// Before
export type DatasetStatus = 'idle' | 'loading' | 'success' | 'error';
export interface DatasetTransform { ... }
export interface DatasetConfig { ... }
export interface DatasetState { ... }
export interface DatasetStoreState { ... }
export interface DatasetStoreActions { ... }
export type DatasetStore = DatasetStoreState & DatasetStoreActions;
export interface DatasetProps { ... }
export interface DatasetConsumerProps { ... }
export interface UseDatasetResult { ... }
export function isDatasetConfig(config: unknown): config is DatasetConfig;

// After
export type DataTableStatus = 'idle' | 'loading' | 'success' | 'error';
export interface DataTableTransform { ... }
export interface DataTableConfig { ... }
export interface DataTableState { ... }
export interface DataTableStoreState { ... }
export interface DataTableStoreActions { ... }
export type DataTableStore = DataTableStoreState & DataTableStoreActions;
export interface DataTableProps { ... }
export interface DataTableConsumerProps { ... }
export interface UseDataTableResult { ... }
export function isDataTableConfig(config: unknown): config is DataTableConfig;
```

### 1.2 Store 파일 변경

**파일**: `src/builder/stores/dataset.ts` → `src/builder/stores/datatable.ts`

**변경 내용**:
```typescript
// 파일명 변경 + 내용 변경

// Before
import type { DatasetStore, DatasetConfig, ... } from '../../types/dataset.types';
export const useDatasetStore = create<DatasetStore>((set, get) => ({
  datasets: new Map<string, DatasetConfig>(),
  datasetStates: new Map<string, DatasetState>(),
  registerDataset: (config: DatasetConfig) => { ... },
  loadDataset: async (datasetId: string) => { ... },
  ...
}));
export const useDataset = (datasetId: string) => { ... };
export const useDatasetActions = () => { ... };
export const useAllDatasets = () => { ... };

// After
import type { DataTableStore, DataTableConfig, ... } from '../../types/datatable.types';
export const useDataTableStore = create<DataTableStore>((set, get) => ({
  dataTables: new Map<string, DataTableConfig>(),
  dataTableStates: new Map<string, DataTableState>(),
  registerDataTable: (config: DataTableConfig) => { ... },
  loadDataTable: async (dataTableId: string) => { ... },
  ...
}));
export const useDataTable = (dataTableId: string) => { ... };
export const useDataTableActions = () => { ... };
export const useAllDataTables = () => { ... };
```

### 1.3 검증
- [ ] TypeScript 컴파일 오류 확인
- [ ] 의존성 파일들 import 오류 수집

---

## Phase 2: Panel 폴더 및 파일 변경 🟡

**목표**: Panel 관련 폴더명, 파일명, 내용 변경

### 2.1 폴더명 변경

```
src/builder/panels/dataset/ → src/builder/panels/datatable/
```

### 2.2 파일명 변경 (Panel 내부)

| 현재 | 변경 후 |
|------|---------|
| `DatasetPanel.tsx` | `DataTablePanel.tsx` |
| `DatasetPanel.css` | `DataTablePanel.css` |
| `DatasetEditorPanel.tsx` | `DataTableEditorPanel.tsx` |
| `DatasetEditorPanel.css` | `DataTableEditorPanel.css` |
| `stores/datasetEditorStore.ts` | `stores/dataTableEditorStore.ts` |

### 2.3 index.ts 변경

**파일**: `src/builder/panels/datatable/index.ts`

```typescript
// Before
export { DatasetPanel } from "./DatasetPanel";

// After
export { DataTablePanel } from "./DataTablePanel";
```

### 2.4 Panel Config 변경

**파일**: `src/builder/panels/core/panelConfigs.ts`

```typescript
// Before
import { DatasetPanel } from "../dataset/DatasetPanel";
import { DatasetEditorPanel } from "../dataset/DatasetEditorPanel";

{
  id: "dataset",
  name: "데이터셋",
  nameEn: "Dataset",
  component: DatasetPanel,
  ...
},
{
  id: "datasetEditor",
  name: "데이터셋 에디터",
  nameEn: "Dataset Editor",
  component: DatasetEditorPanel,
  ...
}

// After
import { DataTablePanel } from "../datatable/DataTablePanel";
import { DataTableEditorPanel } from "../datatable/DataTableEditorPanel";

{
  id: "datatable",
  name: "데이터테이블",
  nameEn: "DataTable",
  component: DataTablePanel,
  ...
},
{
  id: "datatableEditor",
  name: "데이터테이블 에디터",
  nameEn: "DataTable Editor",
  component: DataTableEditorPanel,
  ...
}
```

### 2.5 Panel Layout Store 변경

**파일**: `src/builder/stores/panelLayout.ts`

```typescript
// Before
defaultPanels: ['nodes', 'dataset'],
// Panel ID 참조 변경

// After
defaultPanels: ['nodes', 'datatable'],
```

### 2.6 CSS 클래스명 변경

**파일들**:
- `DataTablePanel.css`
- `DataTableEditorPanel.css`

```css
/* Before */
.dataset-panel { }
.dataset-editor-panel { }

/* After */
.datatable-panel { }
.datatable-editor-panel { }
```

### 2.7 내부 컴포넌트 import 변경

**파일들**:
- `components/DataTableList.tsx`
- `components/ApiEndpointList.tsx`
- `components/VariableList.tsx`
- `components/TransformerList.tsx`
- `editors/DataTableEditor.tsx`
- `editors/ApiEndpointEditor.tsx`
- `editors/VariableEditor.tsx`
- `editors/DataTableCreator.tsx`

모든 `useDatasetStore` → `useDataTableStore` 참조 변경

### 2.8 검증
- [ ] Panel 렌더링 확인
- [ ] Panel 전환 동작 확인

---

## Phase 3: Component & Factory 변경 🟡

**목표**: Dataset 컴포넌트를 DataTable 컴포넌트로 변경

### 3.1 Component 파일 변경

**파일**: `src/builder/components/Dataset.tsx` → `src/builder/components/DataTable.tsx`

```typescript
// Before
import type { DatasetProps } from '../../types/dataset.types';
export function Dataset({ id, name, dataBinding, ... }: DatasetProps) { ... }

// After
import type { DataTableProps } from '../../types/datatable.types';
export function DataTable({ id, name, dataBinding, ... }: DataTableProps) { ... }
```

### 3.2 Inspector Editor 변경

**파일**: `src/builder/panels/properties/editors/DatasetEditor.tsx` → `DataTableEditor.tsx`

```typescript
// Before
import { useDatasetStore } from "../../../stores/dataset";
export const DatasetEditor = memo(function DatasetEditor({ ... }) { ... });

// After
import { useDataTableStore } from "../../../stores/datatable";
export const DataTableEditor = memo(function DataTableEditor({ ... }) { ... });
```

**파일**: `src/builder/panels/properties/editors/index.ts`

```typescript
// Before
export { DatasetEditor } from "./DatasetEditor";

// After
export { DataTableEditor } from "./DataTableEditor";
```

### 3.3 Factory 변경

**파일**: `src/builder/factories/definitions/DataComponents.ts`

```typescript
// Before
export function createDatasetDefinition(): ComponentDefinition { ... }

// After
export function createDataTableDefinition(): ComponentDefinition { ... }
```

**파일**: `src/builder/factories/ComponentFactory.ts`

```typescript
// Before
import { createDatasetDefinition } from './definitions/DataComponents';
Dataset: createDatasetDefinition(),

// After
import { createDataTableDefinition } from './definitions/DataComponents';
DataTable: createDataTableDefinition(),
```

### 3.4 Canvas Renderer 변경

**파일**: `src/canvas/renderers/DataRenderers.tsx`

```typescript
// Before
export function DatasetRenderer({ element }: { element: Element }) { ... }

// After
export function DataTableRenderer({ element }: { element: Element }) { ... }
```

**파일**: `src/canvas/renderers/index.ts`

```typescript
// Before
Dataset: DatasetRenderer,

// After
DataTable: DataTableRenderer,
```

### 3.5 Metadata 변경

**파일**: `src/shared/components/metadata.ts`

```typescript
// Before
Dataset: { ... }

// After
DataTable: { ... }
```

### 3.6 검증
- [ ] 컴포넌트 드래그앤드롭
- [ ] Inspector 속성 편집
- [ ] Preview 렌더링

---

## Phase 4: Events 시스템 변경 🟡

**목표**: Event Action 이름과 관련 파일 변경

### 4.1 Action Type 변경

**파일**: `src/types/events/events.registry.ts`

```typescript
// Before
"loadDataset",
"saveToDataset",

// After
"loadDataTable",
"saveToDataTable",
```

### 4.2 Action Editor 파일 변경

| 현재 | 변경 후 |
|------|---------|
| `LoadDatasetActionEditor.tsx` | `LoadDataTableActionEditor.tsx` |
| `SaveToDatasetActionEditor.tsx` | `SaveToDataTableActionEditor.tsx` |

**경로**: `src/builder/events/actions/`

### 4.3 ActionEditor.tsx 변경

**파일**: `src/builder/events/actions/ActionEditor.tsx`

```typescript
// Before
case "loadDataset":
  return <LoadDatasetActionEditor ... />;
case "saveToDataset":
  return <SaveToDatasetActionEditor ... />;

// After
case "loadDataTable":
  return <LoadDataTableActionEditor ... />;
case "saveToDataTable":
  return <SaveToDataTableActionEditor ... />;
```

### 4.4 events/index.ts 변경

**파일**: `src/builder/events/index.ts`

```typescript
// Before
export { LoadDatasetActionEditor } from './actions/LoadDatasetActionEditor';
export { SaveToDatasetActionEditor } from './actions/SaveToDatasetActionEditor';

// After
export { LoadDataTableActionEditor } from './actions/LoadDataTableActionEditor';
export { SaveToDataTableActionEditor } from './actions/SaveToDataTableActionEditor';
```

### 4.5 BlockActionEditor 변경

**파일**: `src/builder/panels/events/editors/BlockActionEditor.tsx`

관련 case문 및 import 변경

### 4.6 events.types.ts 변경

**파일**: `src/types/events/events.types.ts`

관련 타입 및 인터페이스 변경

### 4.7 Variable Schema 변경

**파일**: `src/builder/events/hooks/useVariableSchema.ts`

```typescript
// Before
dataset: { ... }

// After
datatable: { ... }
```

### 4.8 Binding Validator 변경

**파일**: `src/builder/events/utils/bindingValidator.ts`

관련 변수명 변경

### 4.9 Variable Parser 변경

**파일**: `src/builder/events/utils/variableParser.ts`

관련 변수명 변경

### 4.10 검증
- [ ] Event 추가/편집
- [ ] Action 실행
- [ ] Variable 바인딩

---

## Phase 5: Hooks & Utils 변경 🟢

**목표**: 공통 훅과 유틸리티 함수 변경

### 5.1 useCollectionData 변경

**파일**: `src/builder/hooks/useCollectionData.ts`

```typescript
// Before
import { useDatasetStore } from '../stores/dataset';
// datasetId prop 관련 로직

// After
import { useDataTableStore } from '../stores/datatable';
// dataTableId prop 관련 로직
```

### 5.2 ConditionEditor 변경

**파일**: `src/builder/events/components/ConditionEditor.tsx`

관련 참조 변경

### 5.3 검증
- [ ] Collection 데이터 로드
- [ ] Condition 평가

---

## Phase 6: 문서 업데이트 🟢

**목표**: 모든 관련 문서 업데이트

### 6.1 CLAUDE.md 변경

**섹션**:
- Dataset Component Architecture → DataTable Component Architecture
- 모든 `dataset` 참조를 `datatable`로 변경

### 6.2 docs/ 문서 변경

| 파일 | 변경 내용 |
|------|----------|
| `PLANNED_FEATURES.md` | Dataset → DataTable |
| `COMPLETED_FEATURES.md` | Dataset → DataTable |
| `features/DATATABLE_PRESET_SYSTEM.md` | 유지 (이미 DataTable) |
| `features/DATA_PANEL_SYSTEM.md` | Dataset 참조 변경 |
| `features/DATA_SYNC_ARCHITECTURE.md` | Dataset 참조 변경 |
| `PANEL_SYSTEM.md` | Dataset → DataTable |
| `CHANGELOG.md` | 이번 변경 추가 |
| `EVENTS_PANEL_REDESIGN.md` | loadDataset → loadDataTable |
| `event-test-guide.md` | 관련 예시 변경 |
| `guides/TREE_COMPONENT_GUIDE.md` | 관련 참조 변경 |

### 6.3 검증
- [ ] 문서 링크 유효성
- [ ] 코드 예시 정확성

---

## 실행 체크리스트

### 사전 준비
- [ ] 현재 브랜치 확인: `claude/rename-dataset-to-datatable-*`
- [ ] 작업 전 커밋 완료
- [ ] TypeScript 컴파일 성공 확인

### Phase별 실행

**Phase 1: Types & Store**
- [ ] `dataset.types.ts` → `datatable.types.ts` 변경
- [ ] `dataset.ts` → `datatable.ts` 변경
- [ ] TypeScript 컴파일 확인

**Phase 2: Panel**
- [ ] 폴더명 변경: `dataset/` → `datatable/`
- [ ] 파일명 변경 (5개)
- [ ] `panelConfigs.ts` 업데이트
- [ ] `panelLayout.ts` 업데이트
- [ ] CSS 클래스명 변경
- [ ] 내부 import 수정

**Phase 3: Component & Factory**
- [ ] `Dataset.tsx` → `DataTable.tsx`
- [ ] Inspector `DatasetEditor.tsx` → `DataTableEditor.tsx`
- [ ] Factory 정의 변경
- [ ] Renderer 변경
- [ ] Metadata 변경

**Phase 4: Events**
- [ ] `events.registry.ts` 액션 타입 변경
- [ ] Action Editor 파일명 변경 (2개)
- [ ] `ActionEditor.tsx` case문 변경
- [ ] Variable/Binding 유틸 변경

**Phase 5: Hooks & Utils**
- [ ] `useCollectionData.ts` 변경
- [ ] `ConditionEditor.tsx` 변경

**Phase 6: 문서**
- [ ] `CLAUDE.md` 업데이트
- [ ] `docs/` 문서들 업데이트
- [ ] `CHANGELOG.md` 추가

### 최종 검증
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 개발 서버에서 기능 테스트

---

## 롤백 계획

문제 발생 시:
```bash
git checkout -- .
git clean -fd
```

또는 특정 Phase까지만 롤백:
```bash
git revert <commit-hash>
```

---

## 예상 소요 시간

| Phase | 예상 시간 |
|-------|----------|
| Phase 1 | 15분 |
| Phase 2 | 30분 |
| Phase 3 | 20분 |
| Phase 4 | 25분 |
| Phase 5 | 10분 |
| Phase 6 | 20분 |
| **총계** | **~2시간** |

---

## 변경 요약

### 파일명 변경 (총 12개)

| # | 현재 경로 | 변경 후 경로 |
|---|----------|-------------|
| 1 | `src/types/dataset.types.ts` | `src/types/datatable.types.ts` |
| 2 | `src/builder/stores/dataset.ts` | `src/builder/stores/datatable.ts` |
| 3 | `src/builder/panels/dataset/` | `src/builder/panels/datatable/` |
| 4 | `DatasetPanel.tsx` | `DataTablePanel.tsx` |
| 5 | `DatasetPanel.css` | `DataTablePanel.css` |
| 6 | `DatasetEditorPanel.tsx` | `DataTableEditorPanel.tsx` |
| 7 | `DatasetEditorPanel.css` | `DataTableEditorPanel.css` |
| 8 | `stores/datasetEditorStore.ts` | `stores/dataTableEditorStore.ts` |
| 9 | `src/builder/components/Dataset.tsx` | `src/builder/components/DataTable.tsx` |
| 10 | `src/builder/panels/properties/editors/DatasetEditor.tsx` | `DataTableEditor.tsx` |
| 11 | `LoadDatasetActionEditor.tsx` | `LoadDataTableActionEditor.tsx` |
| 12 | `SaveToDatasetActionEditor.tsx` | `SaveToDataTableActionEditor.tsx` |

### 주요 네이밍 변경

| 카테고리 | Before | After |
|----------|--------|-------|
| **타입** | `DatasetConfig` | `DataTableConfig` |
| **타입** | `DatasetState` | `DataTableState` |
| **타입** | `DatasetStore` | `DataTableStore` |
| **Store** | `useDatasetStore` | `useDataTableStore` |
| **Hook** | `useDataset` | `useDataTable` |
| **함수** | `registerDataset` | `registerDataTable` |
| **함수** | `loadDataset` | `loadDataTable` |
| **액션** | `loadDataset` | `loadDataTable` |
| **액션** | `saveToDataset` | `saveToDataTable` |
| **Panel ID** | `dataset` | `datatable` |
| **Panel ID** | `datasetEditor` | `datatableEditor` |
| **CSS** | `.dataset-panel` | `.datatable-panel` |

---

**작성일**: 2025-12-08
**작성자**: Claude
**상태**: 📋 Planning Complete
