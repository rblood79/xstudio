> **⚠️ 레거시 문서**: 현재 아키텍처와 일치하지 않을 수 있습니다. 역사적 참조 목적.

# Dataset → DataTable 리네이밍 리팩토링 계획

**작성일**: 2025-12-08
**최종 수정**: 2025-12-08
**상태**: ✅ Implementation Complete
**문서 버전**: 3.3

---

## 1. 배경

- 내부에서 `Dataset`이라는 용어가 실제로는 테이블 중심의 데이터 모델을 가리키고 있어 용어 혼동이 발생함.
- `Dataset`은 통계/ML에서 사용하는 넓은 데이터 집합 개념이지만, 실제 구현은 DB 테이블 개념: 스키마 정의, CRUD, API 연동 등.
- 신규 컴포넌트 및 문서에서 이미 `DataTable` 명칭을 사용 중 (DataTableEditor, DataTableList, DataTablePresetSelector 등).
- API/스토리지/코드 전반에 동일한 네이밍을 적용해 유지보수성을 높이고, 신규 기여자의 온보딩 비용을 낮추기 위함.

---

## 2. 목표

1. 코드, API, 설정, 문서에서 `Dataset` → `DataTable`로 명칭을 통일한다.
2. 기능 변화 없이 네이밍만 교체한다. (개발 초기 단계이므로 호환성 레이어 불필요)
3. 빌드 및 테스트 통과를 검증한다.

---

## 3. 범위 (Scope)

### 3.1 포함 범위

| 영역 | 대상 |
|------|------|
| **프런트엔드** | React 컴포넌트, 훅, 컨텍스트, 스토어 키, 테스트 명칭 |
| **데이터 계층** | 타입 정의(TypeScript), 직렬화 포맷(JSON/LocalStorage), Supabase/DB 스키마 명칭 |
| **API 계약** | REST/RPC 경로, 요청/응답 payload 필드명, 타입 가드 |
| **이벤트 시스템** | Action Type, Action Editor, Variable Schema |
| **CSS** | 클래스명, data-* 속성 |
| **문서/가이드** | 개발자 문서, 마이그레이션 가이드, 예제 코드 |

### 3.2 비범위 (Non-goals)

- 데이터 모델 구조 변경(필드 추가/삭제, 타입 변경)은 포함하지 않는다.
- 퍼포먼스 최적화나 신규 기능 추가는 포함하지 않는다.
- Supabase 테이블 스키마 변경 (현재 테이블명이 `Dataset`이 아닌 `data_tables` 등 다른 명칭 사용 시 제외)
- DOM `element.dataset` API (HTML5 표준, 변경 불가)

---

## 4. 영향 분석

### 4.1 파일 영향 범위

| 카테고리 | 파일 수 | 비고 |
|----------|---------|------|
| Types & Store | 3 | 핵심 타입, Store |
| Panel 파일 | 28 | 폴더명 + 파일명 + 내용 |
| Component & Factory | 6 | 컴포넌트, 렌더러, 메타데이터 |
| Events 시스템 | 14 | Action Type, Editor, Utils |
| Hooks & Utils | 4 | 공통 훅 |
| CSS | 6 | 클래스명 변경 |
| 문서 | 15+ | CLAUDE.md, docs/ |
| **총계** | **~76개** | |

### 4.2 주요 네이밍 변경 - 전체 목록

#### 4.2.1 타입 (11개)

| Before | After |
|--------|-------|
| `DatasetStatus` | `DataTableStatus` |
| `DatasetTransform` | `DataTableTransform` |
| `DatasetConfig` | `DataTableConfig` |
| `DatasetState` | `DataTableState` |
| `DatasetStoreState` | `DataTableStoreState` |
| `DatasetStoreActions` | `DataTableStoreActions` |
| `DatasetStore` | `DataTableStore` |
| `DatasetProps` | `DataTableProps` |
| `DatasetConsumerProps` | `DataTableConsumerProps` |
| `UseDatasetResult` | `UseDataTableResult` |
| `isDatasetConfig()` | `isDataTableConfig()` |

#### 4.2.2 Store 함수/변수 (17개)

| Before | After |
|--------|-------|
| `useDatasetStore` | `useDataTableStore` |
| `datasets` (Map) | `dataTables` (Map) |
| `datasetStates` (Map) | `dataTableStates` (Map) |
| `registerDataset()` | `registerDataTable()` |
| `unregisterDataset()` | `unregisterDataTable()` |
| `loadDataset()` | `loadDataTable()` |
| `refreshDataset()` | `refreshDataTable()` |
| `refreshAllDatasets()` | `refreshAllDataTables()` |
| `getDatasetData()` | `getDataTableData()` |
| `getDatasetState()` | `getDataTableState()` |
| `updateDatasetConfig()` | `updateDataTableConfig()` |
| `clearAllDatasets()` | `clearAllDataTables()` |
| `useDataset()` | `useDataTable()` |
| `useDatasetActions()` | `useDataTableActions()` |
| `useAllDatasets()` | `useAllDataTables()` |
| `fetchDatasetData()` | `fetchDataTableData()` |
| `createInitialDatasetState()` | `createInitialDataTableState()` |

#### 4.2.3 Props (2개)

| Before | After | 파일 |
|--------|-------|------|
| `datasetId?: string` | `dataTableId?: string` | `DatasetConsumerProps`, `useCollectionData` |
| `datasetName: ''` | `dataTableName: ''` | `BlockActionEditor.tsx` 기본값 |

#### 4.2.4 Panel ID (2개)

| Before | After |
|--------|-------|
| `dataset` | `datatable` |
| `datasetEditor` | `datatableEditor` |

#### 4.2.5 Action Types (2개)

| Before | After |
|--------|-------|
| `loadDataset` | `loadDataTable` |
| `saveToDataset` | `saveToDataTable` |

#### 4.2.6 Variable Schema 키 (1개)

| Before | After |
|--------|-------|
| `dataset: { ... }` | `datatable: { ... }` |

#### 4.2.7 localStorage 키 패턴 (1개)

| Before | After |
|--------|-------|
| `xstudio_dataset_cache_*` | `xstudio_datatable_cache_*` |

#### 4.2.8 CSS 클래스 (28개)

**DatasetPanel.css → DataTablePanel.css**:
| Before | After |
|--------|-------|
| `.dataset-panel` | `.datatable-panel` |
| `.dataset-list-count` | `.datatable-list-count` |
| `.dataset-add-btn` | `.datatable-add-btn` |
| `.dataset-empty` | `.datatable-empty` |
| `.dataset-empty-icon` | `.datatable-empty-icon` |
| `.dataset-empty-text` | `.datatable-empty-text` |
| `.dataset-loading-overlay` | `.datatable-loading-overlay` |

**DatasetEditorPanel.css → DataTableEditorPanel.css**:
| Before | After |
|--------|-------|
| `.dataset-editor-panel` | `.datatable-editor-panel` |

**common/index.css**:
| Before | After |
|--------|-------|
| `.dataset-status-preview` | `.datatable-status-preview` |
| `.dataset-status-row` | `.datatable-status-row` |
| `.dataset-status-label` | `.datatable-status-label` |
| `.dataset-status-value` | `.datatable-status-value` |
| `.dataset-actions` | `.datatable-actions` |
| `.dataset-editor-info` | `.datatable-editor-info` |
| `.dataset-editor-info-text` | `.datatable-editor-info-text` |
| `.dataset-editor-info-list` | `.datatable-editor-info-list` |

**list-group.css**:
| Before | After |
|--------|-------|
| `[data-panel="dataset"]` | `[data-panel="datatable"]` |

**EventsPanel.css**:
| Before | After |
|--------|-------|
| `.binding-tag.binding-dataset` | `.binding-tag.binding-datatable` |
| `[data-theme="dark"] .binding-tag.binding-dataset` | `[data-theme="dark"] .binding-tag.binding-datatable` |

#### 4.2.9 기본값 문자열 (3개)

| 파일 | Before | After |
|------|--------|-------|
| `DataComponents.ts` | `dataset-${Date.now()}` | `datatable-${Date.now()}` |
| `DataComponents.ts` | `name: "New Dataset"` | `name: "New DataTable"` |
| `Dataset.tsx` | `id="users-dataset"` (주석) | `id="users-datatable"` |

#### 4.2.10 로그 메시지 (~35개)

| 파일 | Before | After |
|------|--------|-------|
| `dataset.ts` | `📊 Dataset registered:` | `📊 DataTable registered:` |
| `dataset.ts` | `🗑️ Dataset unregistered:` | `🗑️ DataTable unregistered:` |
| `dataset.ts` | `⚠️ Dataset not found:` | `⚠️ DataTable not found:` |
| `dataset.ts` | `📦 Dataset memory cache hit:` | `📦 DataTable memory cache hit:` |
| `dataset.ts` | `📦 Dataset localStorage cache hit:` | `📦 DataTable localStorage cache hit:` |
| `dataset.ts` | `🔄 Dataset loading:` | `🔄 DataTable loading:` |
| `dataset.ts` | `✅ Dataset loaded:` | `✅ DataTable loaded:` |
| `dataset.ts` | `❌ Dataset load error:` | `❌ DataTable load error:` |
| `dataset.ts` | `🔄 Refreshing all datasets` | `🔄 Refreshing all dataTables` |
| `dataset.ts` | `✅ All datasets refreshed` | `✅ All dataTables refreshed` |
| `dataset.ts` | `👥 Consumer added to` | (유지) |
| `dataset.ts` | `👤 Consumer removed from` | (유지) |
| `dataset.ts` | `📝 Dataset config updated:` | `📝 DataTable config updated:` |
| `dataset.ts` | `🧹 All datasets cleared` | `🧹 All dataTables cleared` |
| `dataset.ts` | `🗑️ Dataset cache expired:` | `🗑️ DataTable cache expired:` |
| `dataset.ts` | `📦 Dataset cache restored from localStorage:` | `📦 DataTable cache restored from localStorage:` |
| `dataset.ts` | `💾 Dataset cache saved to localStorage:` | `💾 DataTable cache saved to localStorage:` |
| `dataset.ts` | `🗑️ Dataset cache cleared:` | `🗑️ DataTable cache cleared:` |
| `Dataset.tsx` | `⚠️ Dataset: id prop is required` | `⚠️ DataTable: id prop is required` |
| `Dataset.tsx` | `⚠️ Dataset ${id}: dataBinding prop is required` | `⚠️ DataTable ${id}: dataBinding prop is required` |
| `Dataset.tsx` | `🔄 Dataset ${id}: dataBinding changed` | `🔄 DataTable ${id}: dataBinding changed` |
| `Dataset.tsx` | `⏱️ Dataset ${id}: Auto-refresh every` | `⏱️ DataTable ${id}: Auto-refresh every` |
| `DataRenderers.tsx` | `📊 [Canvas] Dataset loading:` | `📊 [Canvas] DataTable loading:` |
| `DataRenderers.tsx` | `✅ [Canvas] Dataset loaded:` | `✅ [Canvas] DataTable loaded:` |
| `DataRenderers.tsx` | `❌ [Canvas] Dataset error:` | `❌ [Canvas] DataTable error:` |
| `DataRenderers.tsx` | `⏱️ [Canvas] Dataset auto-refresh:` | `⏱️ [Canvas] DataTable auto-refresh:` |

#### 4.2.11 events.types.ts 레이블 (2개)

| Before | After |
|--------|-------|
| `loadDataset: 'Dataset 로드'` | `loadDataTable: 'DataTable 로드'` |
| `saveToDataset: 'Dataset에 저장'` | `saveToDataTable: 'DataTable에 저장'` |

#### 4.2.12 useVariableSchema.ts 변수명 (2개)

| Before | After |
|--------|-------|
| `const datasetSchema` | `const dataTableSchema` |
| `dataset: datasetSchema` | `datatable: dataTableSchema` |

#### 4.2.13 VariableBindingEditor.tsx (2개)

| Before | After |
|--------|-------|
| `{ key: 'dataset', type: 'dataset', label: 'Dataset' }` | `{ key: 'datatable', type: 'datatable', label: 'DataTable' }` |
| `dataset?: Record<string, SchemaNode>` (interface) | `datatable?: Record<string, SchemaNode>` |

#### 4.2.14 metadata.ts (4개)

| Before | After |
|--------|-------|
| `type: "Dataset"` | `type: "DataTable"` |
| `label: "Dataset"` | `label: "DataTable"` |
| `editorName: "DatasetEditor"` | `editorName: "DataTableEditor"` |
| 컴포넌트 키 `Dataset: { ... }` | `DataTable: { ... }` |

---

## 5. Phase 계획

> **참고**: 개발 초기 단계이므로 호환성 레이어 및 데이터 마이그레이션은 불필요합니다. 단순 리네이밍으로 진행합니다.

### Phase 개요

| Phase | 내용 | 파일 수 | 위험도 | 예상 시간 |
|-------|------|---------|--------|----------|
| **Phase 1** | Types & Store 변경 | 3 | 🔴 High | 25분 |
| **Phase 2** | Panel 폴더/파일 변경 | 28 | 🟡 Medium | 35분 |
| **Phase 3** | Component & Factory 변경 | 6 | 🟡 Medium | 25분 |
| **Phase 4** | Events 시스템 변경 | 14 | 🟡 Medium | 30분 |
| **Phase 5** | Hooks & Utils 변경 | 4 | 🟢 Low | 15분 |
| **Phase 6** | CSS 변경 | 6 | 🟢 Low | 15분 |
| **Phase 7** | 문서 업데이트 | 15+ | 🟢 Low | 30분 |
| **Phase 8** | 테스트 & 검증 | - | 🟡 Medium | 25분 |
| **총계** | | **~76개** | | **~3시간 20분** |

---

### Phase 1: Types & Store 변경 🔴

**목표**: 핵심 타입 정의와 Store를 변경

#### 1.1 타입 파일 변경

**파일**: `src/types/dataset.types.ts` → `src/types/datatable.types.ts`

**변경 목록 (11개)**:
- [ ] `DatasetStatus` → `DataTableStatus`
- [ ] `DatasetTransform` → `DataTableTransform`
- [ ] `DatasetConfig` → `DataTableConfig`
- [ ] `DatasetState` → `DataTableState`
- [ ] `DatasetStoreState` → `DataTableStoreState`
- [ ] `DatasetStoreActions` → `DataTableStoreActions`
- [ ] `DatasetStore` → `DataTableStore`
- [ ] `DatasetProps` → `DataTableProps`
- [ ] `DatasetConsumerProps` → `DataTableConsumerProps`
- [ ] `UseDatasetResult` → `UseDataTableResult`
- [ ] `isDatasetConfig()` → `isDataTableConfig()`

**추가 변경**:
- [ ] `DatasetConsumerProps.datasetId` → `DataTableConsumerProps.dataTableId`

#### 1.2 Store 파일 변경

**파일**: `src/builder/stores/dataset.ts` → `src/builder/stores/datatable.ts`

**변경 목록 (17개)**:
- [ ] `useDatasetStore` → `useDataTableStore`
- [ ] `datasets` → `dataTables`
- [ ] `datasetStates` → `dataTableStates`
- [ ] `registerDataset()` → `registerDataTable()`
- [ ] `unregisterDataset()` → `unregisterDataTable()`
- [ ] `loadDataset()` → `loadDataTable()`
- [ ] `refreshDataset()` → `refreshDataTable()`
- [ ] `refreshAllDatasets()` → `refreshAllDataTables()`
- [ ] `getDatasetData()` → `getDataTableData()`
- [ ] `getDatasetState()` → `getDataTableState()`
- [ ] `updateDatasetConfig()` → `updateDataTableConfig()`
- [ ] `clearAllDatasets()` → `clearAllDataTables()`
- [ ] `useDataset()` → `useDataTable()`
- [ ] `useDatasetActions()` → `useDataTableActions()`
- [ ] `useAllDatasets()` → `useAllDataTables()`
- [ ] `fetchDatasetData()` → `fetchDataTableData()`
- [ ] `createInitialDatasetState()` → `createInitialDataTableState()`

#### 1.3 localStorage 키 변경

```typescript
// Before
const getCacheKey = (id: string) => `xstudio_dataset_cache_${id}`;

// After
const getCacheKey = (id: string) => `xstudio_datatable_cache_${id}`;
```

#### 1.4 로그 메시지 변경 (~18개)

**Store 내 모든 로그 메시지**:
- [ ] `📊 Dataset registered:` → `📊 DataTable registered:`
- [ ] `🗑️ Dataset unregistered:` → `🗑️ DataTable unregistered:`
- [ ] `⚠️ Dataset not found:` → `⚠️ DataTable not found:`
- [ ] `📦 Dataset memory cache hit:` → `📦 DataTable memory cache hit:`
- [ ] `📦 Dataset localStorage cache hit:` → `📦 DataTable localStorage cache hit:`
- [ ] `🔄 Dataset loading:` → `🔄 DataTable loading:`
- [ ] `✅ Dataset loaded:` → `✅ DataTable loaded:`
- [ ] `❌ Dataset load error:` → `❌ DataTable load error:`
- [ ] `🔄 Refreshing all datasets` → `🔄 Refreshing all dataTables`
- [ ] `✅ All datasets refreshed` → `✅ All dataTables refreshed`
- [ ] `📝 Dataset config updated:` → `📝 DataTable config updated:`
- [ ] `🧹 All datasets cleared` → `🧹 All dataTables cleared`
- [ ] `🗑️ Dataset cache expired:` → `🗑️ DataTable cache expired:`
- [ ] `📦 Dataset cache restored from localStorage:` → `📦 DataTable cache restored from localStorage:`
- [ ] `💾 Dataset cache saved to localStorage:` → `💾 DataTable cache saved to localStorage:`
- [ ] `🗑️ Dataset cache cleared:` → `🗑️ DataTable cache cleared:`

#### 1.5 검증
- [ ] TypeScript 컴파일 오류 확인
- [ ] 의존성 파일들 import 오류 수집

---

### Phase 2: Panel 폴더 및 파일 변경 🟡

**목표**: Panel 관련 폴더명, 파일명, 내용 변경

#### 2.1 폴더명 변경

```bash
mv src/builder/panels/dataset src/builder/panels/datatable
```

#### 2.2 파일명 변경 (5개)

```bash
mv DatasetPanel.tsx DataTablePanel.tsx
mv DatasetPanel.css DataTablePanel.css
mv DatasetEditorPanel.tsx DataTableEditorPanel.tsx
mv DatasetEditorPanel.css DataTableEditorPanel.css
mv stores/datasetEditorStore.ts stores/dataTableEditorStore.ts
```

#### 2.3 index.ts 변경

**파일**: `src/builder/panels/datatable/index.ts`

```typescript
// Before
export { DatasetPanel } from "./DatasetPanel";

// After
export { DataTablePanel } from "./DataTablePanel";
```

#### 2.4 Panel Config 변경

**파일**: `src/builder/panels/core/panelConfigs.ts`

**변경 사항**:
- [ ] import 경로 변경
- [ ] `id: "dataset"` → `id: "datatable"`
- [ ] `id: "datasetEditor"` → `id: "datatableEditor"`
- [ ] `name: "데이터셋"` → `name: "데이터테이블"`
- [ ] `nameEn: "Dataset"` → `nameEn: "DataTable"`
- [ ] `name: "데이터셋 에디터"` → `name: "데이터테이블 에디터"`
- [ ] `nameEn: "Dataset Editor"` → `nameEn: "DataTable Editor"`

#### 2.5 Panel Layout Store 변경

**파일**: `src/builder/stores/panelLayout.ts`

- [ ] `defaultPanels` 배열 내 `'dataset'` → `'datatable'`

#### 2.6 내부 컴포넌트 import 변경

**파일들**:
- [ ] `components/DataTableList.tsx` - `useDatasetStore` → `useDataTableStore`
- [ ] `components/ApiEndpointList.tsx` - `useDatasetStore` → `useDataTableStore`
- [ ] `components/VariableList.tsx` - `useDatasetStore` → `useDataTableStore`
- [ ] `components/TransformerList.tsx` - `useDatasetStore` → `useDataTableStore`
- [ ] `editors/DataTableEditor.tsx` - 관련 import 변경
- [ ] `editors/ApiEndpointEditor.tsx` - 관련 import 변경
- [ ] `editors/VariableEditor.tsx` - 관련 import 변경
- [ ] `editors/DataTableCreator.tsx` - 관련 import 변경

#### 2.7 stores/dataTableEditorStore.ts 변경

- [ ] import 경로 변경
- [ ] 관련 타입 참조 변경

#### 2.8 types/editorTypes.ts 변경

**파일**: `src/builder/panels/datatable/types/editorTypes.ts`

- [ ] import 경로 변경 (`dataset.types` → `datatable.types`)
- [ ] 타입 참조 변경

#### 2.9 editors/index.ts 변경

**파일**: `src/builder/panels/datatable/editors/index.ts`

- [ ] export 문 변경

#### 2.10 검증
- [ ] Panel 렌더링 확인
- [ ] Panel 전환 동작 확인

---

### Phase 3: Component & Factory 변경 🟡

**목표**: Dataset 컴포넌트를 DataTable 컴포넌트로 변경

#### 3.1 Component 파일 변경

**파일**: `src/builder/components/Dataset.tsx` → `src/builder/components/DataTable.tsx`

**변경 사항**:
- [ ] import 타입 변경
- [ ] 컴포넌트명 `Dataset` → `DataTable`
- [ ] 함수명 참조 변경
- [ ] 주석 내 예시 변경 (`users-dataset` → `users-datatable`)
- [ ] 로그 메시지 변경 (4개)
- [ ] `DatasetMetadata` → `DataTableMetadata`
- [ ] `export default Dataset` → `export default DataTable`

#### 3.2 Inspector Editor 변경

**파일**: `src/builder/panels/properties/editors/DatasetEditor.tsx` → `DataTableEditor.tsx`

**변경 사항**:
- [ ] import 변경
- [ ] 컴포넌트명 `DatasetEditor` → `DataTableEditor`

**파일**: `src/builder/panels/properties/editors/index.ts`

- [ ] export 변경

#### 3.3 Factory 변경

**파일**: `src/builder/factories/definitions/DataComponents.ts`

**변경 사항**:
- [ ] 주석 변경
- [ ] `createDatasetDefinition` → `createDataTableDefinition`
- [ ] `const datasetId = \`dataset-${Date.now()}\`` → `const dataTableId = \`datatable-${Date.now()}\``
- [ ] `tag: "Dataset"` → `tag: "DataTable"`
- [ ] `id: datasetId` → `id: dataTableId`
- [ ] `name: "New Dataset"` → `name: "New DataTable"`

**파일**: `src/builder/factories/ComponentFactory.ts`

- [ ] import 변경
- [ ] `Dataset: ComponentFactory.createDataset` → `DataTable: ComponentFactory.createDataTable`
- [ ] `createDataset` 메서드 → `createDataTable`

#### 3.4 Canvas Renderer 변경

**파일**: `src/canvas/renderers/DataRenderers.tsx`

**변경 사항**:
- [ ] `DatasetComponent` → `DataTableComponent`
- [ ] `datasetId` 변수 → `dataTableId` (내부 변수)
- [ ] `renderDataset` → `renderDataTable`
- [ ] 로그 메시지 변경 (4개)

**파일**: `src/canvas/renderers/index.ts`

- [ ] `Dataset: DataRenderers.renderDataset` → `DataTable: DataRenderers.renderDataTable`

#### 3.5 Metadata 변경

**파일**: `src/shared/components/metadata.ts`

- [ ] `type: "Dataset"` → `type: "DataTable"`
- [ ] `label: "Dataset"` → `label: "DataTable"`
- [ ] `editorName: "DatasetEditor"` → `editorName: "DataTableEditor"`
- [ ] 컴포넌트 키 `Dataset: { ... }` → `DataTable: { ... }`

#### 3.6 검증
- [ ] 컴포넌트 드래그앤드롭
- [ ] Inspector 속성 편집
- [ ] Preview 렌더링

---

### Phase 4: Events 시스템 변경 🟡

**목표**: Event Action 이름과 관련 파일 변경

#### 4.1 Action Type Registry 변경

**파일**: `src/types/events/events.registry.ts`

- [ ] `loadDataset` → `loadDataTable`
- [ ] `saveToDataset` → `saveToDataTable`
- [ ] `ACTION_CATEGORIES.dataPanel.actions` 배열 업데이트

#### 4.2 Action Editor 파일 변경

**파일명 변경**:
```bash
mv LoadDatasetActionEditor.tsx LoadDataTableActionEditor.tsx
mv SaveToDatasetActionEditor.tsx SaveToDataTableActionEditor.tsx
```

**내용 변경**:
- [ ] `LoadDatasetActionEditor` → `LoadDataTableActionEditor`
- [ ] `SaveToDatasetActionEditor` → `SaveToDataTableActionEditor`

#### 4.3 ActionEditor.tsx 변경

**파일**: `src/builder/events/actions/ActionEditor.tsx`

- [ ] import 변경: `LoadDatasetActionEditor` → `LoadDataTableActionEditor`
- [ ] import 변경: `SaveToDatasetActionEditor` → `SaveToDataTableActionEditor`
- [ ] import 타입 변경: `LoadDatasetConfig` → `LoadDataTableConfig`
- [ ] import 타입 변경: `SaveToDatasetConfig` → `SaveToDataTableConfig`
- [ ] options 배열: `{ value: "loadDataset", label: "Load Dataset" }` → `{ value: "loadDataTable", label: "Load DataTable" }`
- [ ] options 배열: `{ value: "saveToDataset", label: "Save to Dataset" }` → `{ value: "saveToDataTable", label: "Save to DataTable" }`
- [ ] defaultConfigs: `loadDataset: { datasetName: "" }` → `loadDataTable: { dataTableName: "" }`
- [ ] defaultConfigs: `saveToDataset: { datasetName: "" }` → `saveToDataTable: { dataTableName: "" }`
- [ ] case 문: `action.type === "loadDataset"` → `action.type === "loadDataTable"`
- [ ] case 문: `action.type === "saveToDataset"` → `action.type === "saveToDataTable"`

#### 4.4 events/index.ts 변경

**파일**: `src/builder/events/index.ts`

- [ ] export 변경

#### 4.5 BlockActionEditor 변경

**파일**: `src/builder/panels/events/editors/BlockActionEditor.tsx`

- [ ] `loadDataset: { datasetName: '' }` → `loadDataTable: { dataTableName: '' }`
- [ ] 관련 case 문 변경/추가

#### 4.6 events.types.ts 변경

**파일**: `src/types/events/events.types.ts`

- [ ] `loadDataset: 'Dataset 로드'` → `loadDataTable: 'DataTable 로드'`
- [ ] `saveToDataset: 'Dataset에 저장'` → `saveToDataTable: 'DataTable에 저장'`

#### 4.7 Variable Schema 변경

**파일**: `src/builder/events/hooks/useVariableSchema.ts`

- [ ] `const datasetSchema` → `const dataTableSchema`
- [ ] `dataset: datasetSchema` → `datatable: dataTableSchema`

#### 4.8 Binding Validator 변경

**파일**: `src/builder/events/utils/bindingValidator.ts`

- [ ] `dataset.*` → `datatable.*` 참조 변경

#### 4.9 Variable Parser 변경

**파일**: `src/builder/events/utils/variableParser.ts`

- [ ] `dataset.*` → `datatable.*` 참조 변경

#### 4.10 VariableBindingEditor 변경

**파일**: `src/builder/panels/events/editors/VariableBindingEditor.tsx`

- [ ] `{ key: 'dataset', type: 'dataset', label: 'Dataset' }` → `{ key: 'datatable', type: 'datatable', label: 'DataTable' }`
- [ ] interface `dataset?: Record<string, SchemaNode>` → `datatable?: Record<string, SchemaNode>`

#### 4.11 CodePreviewPanel 변경

**파일**: `src/builder/panels/events/preview/CodePreviewPanel.tsx`

- [ ] 관련 참조 변경

#### 4.12 EventDebugger 변경

**파일**: `src/builder/panels/events/preview/EventDebugger.tsx`

- [ ] 관련 참조 변경

#### 4.13 검증
- [ ] Event 추가/편집
- [ ] Action 실행
- [ ] Variable 바인딩

---

### Phase 5: Hooks & Utils 변경 🟢

**목표**: 공통 훅과 유틸리티 함수 변경

#### 5.1 useCollectionData 변경

**파일**: `src/builder/hooks/useCollectionData.ts`

**변경 사항**:
- [ ] import 경로 변경 (`../stores/dataset` → `../stores/datatable`)
- [ ] `useDatasetStore` → `useDataTableStore`
- [ ] `datasetId` prop → `dataTableId` prop
- [ ] `datasetState` → `dataTableState`
- [ ] 관련 주석 변경
- [ ] 모든 `datasetId` 참조 → `dataTableId`

#### 5.2 ConditionEditor 변경

**파일**: `src/builder/events/components/ConditionEditor.tsx`

- [ ] 예시 문자열 확인 (DOM `element.dataset`은 유지)
- [ ] 관련 참조 변경

#### 5.3 검증
- [ ] Collection 데이터 로드
- [ ] Condition 평가

---

### Phase 6: CSS 변경 🟢

**목표**: 모든 CSS 클래스명 및 data-* 속성 변경

#### 6.1 DataTablePanel.css 변경 (이전 DatasetPanel.css)

- [ ] `.dataset-panel` → `.datatable-panel`
- [ ] `.dataset-list-count` → `.datatable-list-count`
- [ ] `.dataset-add-btn` → `.datatable-add-btn`
- [ ] `.dataset-empty` → `.datatable-empty`
- [ ] `.dataset-empty-icon` → `.datatable-empty-icon`
- [ ] `.dataset-empty-text` → `.datatable-empty-text`
- [ ] `.dataset-loading-overlay` → `.datatable-loading-overlay`

#### 6.2 DataTableEditorPanel.css 변경 (이전 DatasetEditorPanel.css)

- [ ] `.dataset-editor-panel` → `.datatable-editor-panel`
- [ ] 주석 변경

#### 6.3 common/index.css 변경

- [ ] `.dataset-status-preview` → `.datatable-status-preview`
- [ ] `.dataset-status-row` → `.datatable-status-row`
- [ ] `.dataset-status-label` → `.datatable-status-label`
- [ ] `.dataset-status-value` → `.datatable-status-value`
- [ ] `.dataset-actions` → `.datatable-actions`
- [ ] `.dataset-editor-info` → `.datatable-editor-info`
- [ ] `.dataset-editor-info-text` → `.datatable-editor-info-text`
- [ ] `.dataset-editor-info-list` → `.datatable-editor-info-list`
- [ ] 섹션 주석 변경

#### 6.4 list-group.css 변경

- [ ] `[data-panel="dataset"]` → `[data-panel="datatable"]`
- [ ] 주석 변경

#### 6.5 EventsPanel.css 변경

- [ ] `.binding-tag.binding-dataset` → `.binding-tag.binding-datatable`
- [ ] `[data-theme="dark"] .binding-tag.binding-dataset` → `[data-theme="dark"] .binding-tag.binding-datatable`

#### 6.6 Panel 내부 Editor CSS 주석 변경

**파일들** (`src/builder/panels/datatable/editors/`):
- [ ] `ApiEndpointEditor.css` - 주석 내 `DatasetPanel` → `DataTablePanel`, `DatasetEditorPanel` → `DataTableEditorPanel`
- [ ] `VariableEditor.css` - 주석 내 `DatasetPanel` → `DataTablePanel`
- [ ] `DataTableEditor.css` - 주석 내 `DatasetPanel` → `DataTablePanel`
- [ ] `DataTableCreator.css` - 주석 확인 및 변경

#### 6.7 TSX 파일 className 변경

**파일들**:
- [ ] `DataTablePanel.tsx` - `className="dataset-panel"` → `className="datatable-panel"`
- [ ] `DataTableEditorPanel.tsx` - `className="dataset-editor-panel"` → `className="datatable-editor-panel"`
- [ ] 관련 컴포넌트 내 클래스명 참조

#### 6.8 검증
- [ ] 스타일 적용 확인
- [ ] 다크 모드 스타일 확인

---

### Phase 7: 문서 업데이트 🟢

**목표**: 모든 관련 문서 업데이트

#### 7.1 CLAUDE.md 변경

- [ ] "Dataset Component Architecture" → "DataTable Component Architecture"
- [ ] 모든 `dataset` 참조를 `datatable`로 변경
- [ ] Quick Reference 테이블 업데이트
- [ ] 예제 코드 업데이트

#### 7.2 docs/ 문서 변경

| 파일 | 변경 내용 |
|------|----------|
| `PLANNED_FEATURES.md` | Dataset → DataTable |
| `COMPLETED_FEATURES.md` | Dataset → DataTable |
| `features/DATATABLE_PRESET_SYSTEM.md` | 유지 (이미 DataTable) |
| `features/DATA_PANEL_SYSTEM.md` | Dataset 참조 변경 |
| `features/DATA_SYNC_ARCHITECTURE.md` | Dataset 참조 변경 |
| `PANEL_SYSTEM.md` | Dataset → DataTable |
| `EVENTS_PANEL_REDESIGN.md` | loadDataset → loadDataTable |
| `event-test-guide.md` | 관련 예시 변경 |
| `guides/TREE_COMPONENT_GUIDE.md` | 관련 참조 변경 |
| `CHANGELOG.md` | 이번 변경 내역 추가 |

#### 7.3 검증
- [ ] 문서 링크 유효성
- [ ] 코드 예시 정확성

---

### Phase 8: 테스트 & 검증 🟡

**목표**: 전체 시스템 회귀 테스트

#### 8.1 빌드 검증

```bash
# TypeScript 컴파일
npm run type-check

# Lint 검사
npm run lint

# 프로덕션 빌드
npm run build
```

#### 8.2 기능 테스트

| 테스트 항목 | 확인 사항 |
|-------------|----------|
| **Panel** | DataTable Panel 열기/닫기, Editor Panel 전환 |
| **Component** | DataTable 컴포넌트 드래그앤드롭, Preview 렌더링 |
| **Inspector** | DataTable 속성 편집, DataBinding 설정 |
| **Events** | loadDataTable 액션 추가/실행 |
| **Variable** | `{{datatable.*}}` 바인딩 |
| **CSS** | 스타일 적용, 다크 모드 |

#### 8.3 E2E 테스트 (해당 시)

```bash
npm run test:e2e
```

#### 8.4 검증 체크리스트
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 개발 서버에서 기능 테스트 완료

---

## 6. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| **대량 파일 변경** | 코드리뷰 가독성 저하 | Phase별 분리 커밋 + PR 설명 |
| **테스트 스냅샷 변경** | CI 실패 | 스냅샷 일괄 업데이트 |
| **CSS 누락** | 스타일 깨짐 | 전체 CSS 클래스 목록 체크리스트 |

---

## 7. 완료 정의 (Definition of Done)

- [ ] 코드/문서에서 `Dataset` 레퍼런스가 모두 `DataTable`로 교체됨
- [ ] 빌드/테스트가 모두 통과함
- [ ] CHANGELOG.md에 변경 내역 추가됨
- [ ] CSS 스타일이 정상 적용됨

---

## 8. 실행 체크리스트

### 사전 준비
- [ ] 현재 브랜치 확인: `claude/rename-dataset-to-datatable-*`
- [ ] 작업 전 커밋 완료
- [ ] TypeScript 컴파일 성공 확인

### Phase별 실행

**Phase 1: Types & Store**
- [ ] `dataset.types.ts` → `datatable.types.ts` (11개 타입)
- [ ] `dataset.ts` → `datatable.ts` (17개 함수/변수)
- [ ] localStorage 키 변경
- [ ] 로그 메시지 변경 (18개)
- [ ] TypeScript 컴파일 확인

**Phase 2: Panel**
- [ ] 폴더명 변경: `dataset/` → `datatable/`
- [ ] 파일명 변경 (5개)
- [ ] `index.ts` 변경
- [ ] `panelConfigs.ts` 업데이트
- [ ] `panelLayout.ts` 업데이트
- [ ] 내부 컴포넌트 import 변경 (8개 파일)

**Phase 3: Component & Factory**
- [ ] `Dataset.tsx` → `DataTable.tsx`
- [ ] Inspector `DatasetEditor.tsx` → `DataTableEditor.tsx`
- [ ] Factory 정의 변경 (DataComponents.ts)
- [ ] Factory 등록 변경 (ComponentFactory.ts)
- [ ] Renderer 변경 (DataRenderers.tsx, index.ts)
- [ ] Metadata 변경

**Phase 4: Events**
- [ ] `events.registry.ts` 액션 타입 변경 (`loadDataset` → `loadDataTable`)
- [ ] Action Editor 파일명 변경 (2개)
- [ ] `ActionEditor.tsx` case문 변경
- [ ] `events/index.ts` export 변경
- [ ] `BlockActionEditor.tsx` 변경
- [ ] `events.types.ts` 레이블 변경
- [ ] `useVariableSchema.ts` 변경
- [ ] `bindingValidator.ts` 변경
- [ ] `variableParser.ts` 변경
- [ ] `VariableBindingEditor.tsx` 변경

**Phase 5: Hooks & Utils**
- [ ] `useCollectionData.ts` 변경 (import, prop, 변수명)
- [ ] `ConditionEditor.tsx` 확인

**Phase 6: CSS**
- [ ] `DataTablePanel.css` 클래스명 변경 (7개)
- [ ] `DataTableEditorPanel.css` 클래스명 변경 (1개)
- [ ] `common/index.css` 클래스명 변경 (8개)
- [ ] `list-group.css` data-* 속성 변경 (1개)
- [ ] `EventsPanel.css` 클래스명 변경 (2개)
- [ ] Panel 내부 Editor CSS 주석 변경 (4개 파일)
- [ ] TSX 파일 className 변경

**Phase 7: 문서**
- [ ] `CLAUDE.md` 업데이트
- [ ] `docs/` 문서들 업데이트 (10개 파일)
- [ ] `CHANGELOG.md` 추가

**Phase 8: 테스트 & 검증**
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 개발 서버에서 기능 테스트
- [ ] CSS 스타일 테스트

---

## 9. 롤백 계획

### 전체 롤백

```bash
git checkout -- .
git clean -fd
```

### 특정 Phase 롤백

```bash
git revert <commit-hash>
```

---

## 10. 파일 변경 요약

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

### 변경 항목 통계

| 카테고리 | 개수 |
|----------|------|
| 타입 변경 | 11 |
| Store 함수/변수 변경 | 17 |
| Props 변경 | 2 |
| Panel ID 변경 | 2 |
| Action Type 변경 | 2 |
| CSS 클래스 변경 | 28 |
| 로그 메시지 변경 | ~35 |
| 기본값 문자열 변경 | 3 |
| Variable Schema 변경 | 2 |
| 문서 파일 변경 | 10+ |
| **총 변경 항목** | **~112개** |

---

**문서 버전**: 3.2
**작성자**: Claude
**검토자**: -
