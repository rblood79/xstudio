# Dataset → DataTable 리네이밍 리팩토링 계획

**작성일**: 2025-12-08
**최종 수정**: 2025-12-08
**상태**: 📋 Planning Complete

---

## 1. 배경

- 내부에서 `Dataset`이라는 용어가 실제로는 테이블 중심의 데이터 모델을 가리키고 있어 용어 혼동이 발생함.
- `Dataset`은 통계/ML에서 사용하는 넓은 데이터 집합 개념이지만, 실제 구현은 DB 테이블 개념: 스키마 정의, CRUD, API 연동 등.
- 신규 컴포넌트 및 문서에서 이미 `DataTable` 명칭을 사용 중 (DataTableEditor, DataTableList, DataTablePresetSelector 등).
- API/스토리지/코드 전반에 동일한 네이밍을 적용해 유지보수성을 높이고, 신규 기여자의 온보딩 비용을 낮추기 위함.

---

## 2. 목표

1. 코드, API, 설정, 문서에서 `Dataset` → `DataTable`로 명칭을 통일한다.
2. 기능 변화 없이 네이밍만 교체하되, 기존 외부 사용자는 브레이킹 체인지 없이 점진적으로 마이그레이션 가능하게 한다.
3. 릴리스 후 회귀 테스트 및 모니터링 체계를 갖춘다.

---

## 3. 범위 (Scope)

### 3.1 포함 범위

| 영역 | 대상 |
|------|------|
| **프런트엔드** | React 컴포넌트, 훅, 컨텍스트, 스토어 키, 테스트 명칭 |
| **데이터 계층** | 타입 정의(TypeScript), 직렬화 포맷(JSON/LocalStorage), Supabase/DB 스키마 명칭 |
| **API 계약** | REST/RPC 경로, 요청/응답 payload 필드명, 타입 가드 |
| **이벤트 시스템** | Action Type, Action Editor, Variable Schema |
| **문서/가이드** | 개발자 문서, 마이그레이션 가이드, 예제 코드 |

### 3.2 비범위 (Non-goals)

- 데이터 모델 구조 변경(필드 추가/삭제, 타입 변경)은 포함하지 않는다.
- 퍼포먼스 최적화나 신규 기능 추가는 포함하지 않는다.
- Supabase 테이블 스키마 변경 (현재 테이블명이 `Dataset`이 아닌 `data_tables` 등 다른 명칭 사용 시 제외)

---

## 4. 영향 분석

### 4.1 파일 영향 범위

| 카테고리 | 파일 수 | 비고 |
|----------|---------|------|
| Types & Store | 3 | 핵심 타입, Store |
| Panel 파일 | 28 | 폴더명 + 파일명 + 내용 |
| Component & Factory | 5 | 컴포넌트, 렌더러, 메타데이터 |
| Events 시스템 | 12 | Action Type, Editor, Utils |
| Hooks & Utils | 4 | 공통 훅 |
| 문서 | 15+ | CLAUDE.md, docs/ |
| **총계** | **~70개** | |

### 4.2 주요 네이밍 변경

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
| **localStorage** | `xstudio_dataset_cache_*` | `xstudio_datatable_cache_*` |

---

## 5. 호환성 레이어 설계

### 5.1 localStorage 마이그레이션

기존 캐시 데이터의 손실을 방지하기 위한 마이그레이션 레이어:

```typescript
// src/builder/stores/datatable.ts

/**
 * localStorage 캐시 키 (신규)
 */
const getDataTableCacheKey = (id: string) => `xstudio_datatable_cache_${id}`;

/**
 * localStorage 캐시 키 (구, deprecated)
 */
const getLegacyDatasetCacheKey = (id: string) => `xstudio_dataset_cache_${id}`;

/**
 * 캐시 마이그레이션: 구 키 → 신규 키
 * 앱 시작 시 한 번 실행
 */
function migrateLegacyCache(): void {
  const keys = Object.keys(localStorage);
  const legacyKeys = keys.filter(k => k.startsWith('xstudio_dataset_cache_'));

  legacyKeys.forEach(legacyKey => {
    const id = legacyKey.replace('xstudio_dataset_cache_', '');
    const newKey = getDataTableCacheKey(id);

    // 신규 키가 없을 때만 마이그레이션
    if (!localStorage.getItem(newKey)) {
      const data = localStorage.getItem(legacyKey);
      if (data) {
        localStorage.setItem(newKey, data);
        console.log(`🔄 Migrated cache: ${legacyKey} → ${newKey}`);
      }
    }

    // 구 키 삭제
    localStorage.removeItem(legacyKey);
  });
}

// Store 초기화 시 호출
migrateLegacyCache();
```

### 5.2 Action Type 호환성

기존 이벤트 핸들러가 깨지지 않도록 alias 유지:

```typescript
// src/types/events/events.registry.ts

export const IMPLEMENTED_ACTION_TYPES = [
  // ... 기존 액션들

  // DataTable Actions (신규, 권장)
  "loadDataTable",
  "saveToDataTable",

  // Dataset Actions (deprecated, 호환용)
  "loadDataset",      // @deprecated - use loadDataTable
  "saveToDataset",    // @deprecated - use saveToDataTable
] as const;
```

```typescript
// src/utils/eventEngine.ts

// Action 실행 시 alias 처리
function normalizeActionType(type: string): string {
  const aliases: Record<string, string> = {
    'loadDataset': 'loadDataTable',
    'saveToDataset': 'saveToDataTable',
  };

  if (aliases[type]) {
    console.warn(`⚠️ Deprecated action "${type}". Use "${aliases[type]}" instead.`);
  }

  return aliases[type] || type;
}
```

### 5.3 Variable Binding 호환성

Variable 참조 경로의 호환성 유지:

```typescript
// src/builder/events/utils/variableParser.ts

// 기존: {{dataset.users.data}}
// 신규: {{datatable.users.data}}

function normalizeVariablePath(path: string): string {
  // dataset. → datatable. 자동 변환
  if (path.startsWith('dataset.')) {
    console.warn(`⚠️ Deprecated variable path "dataset.*". Use "datatable.*" instead.`);
    return path.replace(/^dataset\./, 'datatable.');
  }
  return path;
}
```

---

## 6. Phase 계획

### Phase 개요

| Phase | 내용 | 파일 수 | 위험도 | 예상 시간 |
|-------|------|---------|--------|----------|
| **Phase 0** | 호환성 레이어 준비 | 3 | 🟢 Low | 15분 |
| **Phase 1** | Types & Store 변경 | 3 | 🔴 High | 20분 |
| **Phase 2** | Panel 폴더/파일 변경 | 28 | 🟡 Medium | 30분 |
| **Phase 3** | Component & Factory 변경 | 5 | 🟡 Medium | 20분 |
| **Phase 4** | Events 시스템 변경 | 12 | 🟡 Medium | 25분 |
| **Phase 5** | Hooks & Utils 변경 | 4 | 🟢 Low | 10분 |
| **Phase 6** | 데이터 마이그레이션 | 2 | 🟡 Medium | 15분 |
| **Phase 7** | 문서 업데이트 | 15+ | 🟢 Low | 25분 |
| **Phase 8** | 테스트 & 검증 | - | 🟡 Medium | 20분 |
| **총계** | | **~70개** | | **~3시간** |

---

### Phase 0: 호환성 레이어 준비 🟢

**목표**: 마이그레이션 레이어를 먼저 준비하여 브레이킹 체인지 방지

#### 0.1 localStorage 마이그레이션 함수 추가

**파일**: `src/builder/stores/dataset.ts` (임시, Phase 1에서 이동)

```typescript
// 마이그레이션 함수 추가 (위 5.1 참조)
function migrateLegacyCache(): void { ... }
```

#### 0.2 Action Type Alias 준비

**파일**: `src/types/events/events.registry.ts`

- `loadDataset`, `saveToDataset`을 deprecated로 표시
- 신규 `loadDataTable`, `saveToDataTable` 추가

#### 0.3 검증
- [ ] 기존 localStorage 데이터 읽기 테스트
- [ ] deprecated 경고 로그 확인

---

### Phase 1: Types & Store 변경 🔴

**목표**: 핵심 타입 정의와 Store를 변경

#### 1.1 타입 파일 변경

**파일**: `src/types/dataset.types.ts` → `src/types/datatable.types.ts`

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

#### 1.2 Store 파일 변경

**파일**: `src/builder/stores/dataset.ts` → `src/builder/stores/datatable.ts`

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

#### 1.3 localStorage 키 변경

```typescript
// Before
const getCacheKey = (id: string) => `xstudio_dataset_cache_${id}`;

// After
const getCacheKey = (id: string) => `xstudio_datatable_cache_${id}`;
```

#### 1.4 검증
- [ ] TypeScript 컴파일 오류 확인
- [ ] 의존성 파일들 import 오류 수집

---

### Phase 2: Panel 폴더 및 파일 변경 🟡

**목표**: Panel 관련 폴더명, 파일명, 내용 변경

#### 2.1 폴더명 변경

```
src/builder/panels/dataset/ → src/builder/panels/datatable/
```

#### 2.2 파일명 변경 (5개)

| 현재 | 변경 후 |
|------|---------|
| `DatasetPanel.tsx` | `DataTablePanel.tsx` |
| `DatasetPanel.css` | `DataTablePanel.css` |
| `DatasetEditorPanel.tsx` | `DataTableEditorPanel.tsx` |
| `DatasetEditorPanel.css` | `DataTableEditorPanel.css` |
| `stores/datasetEditorStore.ts` | `stores/dataTableEditorStore.ts` |

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

```typescript
// Before
import { DatasetPanel } from "../dataset/DatasetPanel";
import { DatasetEditorPanel } from "../dataset/DatasetEditorPanel";

{
  id: "dataset",
  name: "데이터셋",
  nameEn: "Dataset",
  ...
}

// After
import { DataTablePanel } from "../datatable/DataTablePanel";
import { DataTableEditorPanel } from "../datatable/DataTableEditorPanel";

{
  id: "datatable",
  name: "데이터테이블",
  nameEn: "DataTable",
  ...
}
```

#### 2.5 Panel Layout Store 변경

**파일**: `src/builder/stores/panelLayout.ts`

```typescript
// Before
defaultPanels: ['nodes', 'dataset'],

// After
defaultPanels: ['nodes', 'datatable'],
```

#### 2.6 CSS 클래스명 변경

**파일들**: `DataTablePanel.css`, `DataTableEditorPanel.css`

```css
/* Before */
.dataset-panel { }
.dataset-editor-panel { }

/* After */
.datatable-panel { }
.datatable-editor-panel { }
```

#### 2.7 내부 컴포넌트 import 변경

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

#### 2.8 검증
- [ ] Panel 렌더링 확인
- [ ] Panel 전환 동작 확인

---

### Phase 3: Component & Factory 변경 🟡

**목표**: Dataset 컴포넌트를 DataTable 컴포넌트로 변경

#### 3.1 Component 파일 변경

**파일**: `src/builder/components/Dataset.tsx` → `src/builder/components/DataTable.tsx`

```typescript
// Before
import type { DatasetProps } from '../../types/dataset.types';
export function Dataset({ ... }: DatasetProps) { ... }

// After
import type { DataTableProps } from '../../types/datatable.types';
export function DataTable({ ... }: DataTableProps) { ... }
```

#### 3.2 Inspector Editor 변경

**파일**: `src/builder/panels/properties/editors/DatasetEditor.tsx` → `DataTableEditor.tsx`

```typescript
// Before
export const DatasetEditor = memo(function DatasetEditor({ ... }) { ... });

// After
export const DataTableEditor = memo(function DataTableEditor({ ... }) { ... });
```

**파일**: `src/builder/panels/properties/editors/index.ts`

```typescript
// Before
export { DatasetEditor } from "./DatasetEditor";

// After
export { DataTableEditor } from "./DataTableEditor";
```

#### 3.3 Factory 변경

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
Dataset: createDatasetDefinition(),

// After
DataTable: createDataTableDefinition(),
```

#### 3.4 Canvas Renderer 변경

**파일**: `src/canvas/renderers/DataRenderers.tsx`

```typescript
// Before
export function DatasetRenderer({ element }) { ... }

// After
export function DataTableRenderer({ element }) { ... }
```

**파일**: `src/canvas/renderers/index.ts`

```typescript
// Before
Dataset: DatasetRenderer,

// After
DataTable: DataTableRenderer,
```

#### 3.5 Metadata 변경

**파일**: `src/shared/components/metadata.ts`

```typescript
// Before
Dataset: { ... }

// After
DataTable: { ... }
```

#### 3.6 검증
- [ ] 컴포넌트 드래그앤드롭
- [ ] Inspector 속성 편집
- [ ] Preview 렌더링

---

### Phase 4: Events 시스템 변경 🟡

**목표**: Event Action 이름과 관련 파일 변경

#### 4.1 Action Type 변경

**파일**: `src/types/events/events.registry.ts`

```typescript
// 신규 추가 (권장)
"loadDataTable",
"saveToDataTable",

// 기존 유지 (deprecated, 호환용)
"loadDataset",      // @deprecated
"saveToDataset",    // @deprecated
```

#### 4.2 Action Editor 파일 변경

| 현재 | 변경 후 |
|------|---------|
| `LoadDatasetActionEditor.tsx` | `LoadDataTableActionEditor.tsx` |
| `SaveToDatasetActionEditor.tsx` | `SaveToDataTableActionEditor.tsx` |

**경로**: `src/builder/events/actions/`

#### 4.3 ActionEditor.tsx 변경

**파일**: `src/builder/events/actions/ActionEditor.tsx`

```typescript
// 신규 case 추가
case "loadDataTable":
  return <LoadDataTableActionEditor ... />;
case "saveToDataTable":
  return <SaveToDataTableActionEditor ... />;

// 기존 case 유지 (deprecated 호환)
case "loadDataset":
  console.warn('⚠️ "loadDataset" is deprecated. Use "loadDataTable".');
  return <LoadDataTableActionEditor ... />;
case "saveToDataset":
  console.warn('⚠️ "saveToDataset" is deprecated. Use "saveToDataTable".');
  return <SaveToDataTableActionEditor ... />;
```

#### 4.4 events/index.ts 변경

**파일**: `src/builder/events/index.ts`

```typescript
// Before
export { LoadDatasetActionEditor } from './actions/LoadDatasetActionEditor';
export { SaveToDatasetActionEditor } from './actions/SaveToDatasetActionEditor';

// After
export { LoadDataTableActionEditor } from './actions/LoadDataTableActionEditor';
export { SaveToDataTableActionEditor } from './actions/SaveToDataTableActionEditor';
```

#### 4.5 BlockActionEditor 변경

**파일**: `src/builder/panels/events/editors/BlockActionEditor.tsx`

관련 case문 및 import 변경

#### 4.6 events.types.ts 변경

**파일**: `src/types/events/events.types.ts`

관련 타입 및 인터페이스 변경

#### 4.7 Variable Schema 변경

**파일**: `src/builder/events/hooks/useVariableSchema.ts`

```typescript
// Before
dataset: { ... }

// After
datatable: { ... }
```

#### 4.8 Binding Validator 변경

**파일**: `src/builder/events/utils/bindingValidator.ts`

- `dataset.*` → `datatable.*` 변수 경로 변경
- 기존 `dataset.*` 경로에 대한 호환 레이어 추가

#### 4.9 Variable Parser 변경

**파일**: `src/builder/events/utils/variableParser.ts`

- 자동 변환 레이어 추가 (5.3 참조)

#### 4.10 검증
- [ ] Event 추가/편집
- [ ] Action 실행
- [ ] Variable 바인딩

---

### Phase 5: Hooks & Utils 변경 🟢

**목표**: 공통 훅과 유틸리티 함수 변경

#### 5.1 useCollectionData 변경

**파일**: `src/builder/hooks/useCollectionData.ts`

```typescript
// Before
import { useDatasetStore } from '../stores/dataset';
// datasetId prop 관련 로직

// After
import { useDataTableStore } from '../stores/datatable';
// dataTableId prop 관련 로직
```

#### 5.2 ConditionEditor 변경

**파일**: `src/builder/events/components/ConditionEditor.tsx`

관련 참조 변경

#### 5.3 검증
- [ ] Collection 데이터 로드
- [ ] Condition 평가

---

### Phase 6: 데이터 마이그레이션 🟡

**목표**: 기존 데이터 호환성 보장

#### 6.1 localStorage 마이그레이션

**파일**: `src/builder/stores/datatable.ts`

```typescript
/**
 * 앱 시작 시 localStorage 캐시 마이그레이션
 */
function migrateLegacyCacheOnInit(): void {
  try {
    const keys = Object.keys(localStorage);
    const legacyKeys = keys.filter(k => k.startsWith('xstudio_dataset_cache_'));

    if (legacyKeys.length > 0) {
      console.log(`🔄 Migrating ${legacyKeys.length} legacy cache entries...`);

      legacyKeys.forEach(legacyKey => {
        const id = legacyKey.replace('xstudio_dataset_cache_', '');
        const newKey = `xstudio_datatable_cache_${id}`;

        if (!localStorage.getItem(newKey)) {
          const data = localStorage.getItem(legacyKey);
          if (data) {
            localStorage.setItem(newKey, data);
          }
        }
        localStorage.removeItem(legacyKey);
      });

      console.log(`✅ Cache migration complete`);
    }
  } catch (error) {
    console.warn('⚠️ Cache migration failed:', error);
  }
}

// Store 생성 시 호출
migrateLegacyCacheOnInit();
```

#### 6.2 Supabase/DB 스키마 (해당 시)

현재 Supabase 테이블명 확인 필요:
- 테이블명이 `datasets`인 경우: 뷰(View) 또는 시노님(Synonym) 추가 검토
- 테이블명이 `data_tables`인 경우: 변경 불필요

**확인 사항**:
- [ ] Supabase 테이블명 확인
- [ ] 필요 시 마이그레이션 스크립트 작성

#### 6.3 검증
- [ ] 기존 localStorage 데이터 마이그레이션 확인
- [ ] 앱 재시작 후 데이터 유지 확인

---

### Phase 7: 문서 업데이트 🟢

**목표**: 모든 관련 문서 업데이트

#### 7.1 CLAUDE.md 변경

**섹션**:
- Dataset Component Architecture → DataTable Component Architecture
- 모든 `dataset` 참조를 `datatable`로 변경
- Quick Reference 테이블 업데이트

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
| `MIGRATION_GUIDE.md` | Dataset → DataTable 마이그레이션 안내 추가 |

#### 7.3 마이그레이션 가이드 추가

**파일**: `docs/MIGRATION_GUIDE.md` (섹션 추가)

```markdown
## Dataset → DataTable 마이그레이션

### 변경 사항
- `useDatasetStore` → `useDataTableStore`
- `loadDataset` 액션 → `loadDataTable` 액션
- `{{dataset.*}}` 변수 → `{{datatable.*}}` 변수

### 자동 마이그레이션
- localStorage 캐시는 자동으로 마이그레이션됩니다.
- 기존 `loadDataset`, `saveToDataset` 액션은 deprecated이지만 계속 작동합니다.

### 수동 마이그레이션 권장 사항
1. 이벤트 핸들러에서 `loadDataset` → `loadDataTable`로 변경
2. Variable 바인딩에서 `{{dataset.*}}` → `{{datatable.*}}`로 변경
```

#### 7.4 검증
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
| **호환성** | 기존 `loadDataset` 액션 동작 확인 |
| **데이터** | localStorage 캐시 마이그레이션 |

#### 8.3 E2E 테스트 (해당 시)

```bash
npm run test:e2e
```

#### 8.4 검증 체크리스트
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 개발 서버에서 기능 테스트 완료
- [ ] 기존 데이터 호환성 확인

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| **브레이킹 체인지** | 기존 이벤트 핸들러 동작 중단 | Action Type alias 유지 + deprecated 경고 |
| **localStorage 데이터 손실** | 캐시된 데이터 유실 | 마이그레이션 함수로 자동 변환 |
| **Variable 바인딩 깨짐** | `{{dataset.*}}` 참조 실패 | 자동 변환 레이어 + 경고 로그 |
| **대량 파일 변경** | 코드리뷰 가독성 저하 | Phase별 분리 커밋 + PR 설명 |
| **테스트 스냅샷 변경** | CI 실패 | 스냅샷 일괄 업데이트 |

---

## 8. 롤아웃 계획

### 8.1 단계별 배포

| 단계 | 내용 | 기간 |
|------|------|------|
| **Stage 1** | 내부 빌드 적용, 로그/모니터링으로 호환성 확인 | 1-2일 |
| **Stage 2** | 베타 릴리스, deprecated 경고 로그 노출 | 1주 |
| **Stage 3** | 정식 릴리스, 구 API 유지 | - |
| **Stage 4** | 구 API 제거 공지 (다음 메이저 버전) | 추후 |

### 8.2 Deprecation 경고

```typescript
// 콘솔 경고 출력
console.warn('⚠️ Deprecated: "loadDataset" action. Use "loadDataTable" instead.');
console.warn('⚠️ Deprecated: "dataset.*" variable path. Use "datatable.*" instead.');
```

---

## 9. 완료 정의 (Definition of Done)

- [ ] 코드/문서에서 `Dataset` 레퍼런스가 모두 `DataTable`로 교체됨
- [ ] 빌드/테스트가 모두 통과함
- [ ] 구 API/직렬화 키에 대한 호환 레이어가 존재함
- [ ] deprecated 경고 로그가 정상 출력됨
- [ ] localStorage 마이그레이션이 정상 동작함
- [ ] 릴리스 노트와 개발자 가이드에 변경 사항 반영됨
- [ ] CHANGELOG.md에 변경 내역 추가됨

---

## 10. 실행 체크리스트

### 사전 준비
- [ ] 현재 브랜치 확인: `claude/rename-dataset-to-datatable-*`
- [ ] 작업 전 커밋 완료
- [ ] TypeScript 컴파일 성공 확인

### Phase별 실행

**Phase 0: 호환성 레이어**
- [ ] localStorage 마이그레이션 함수 추가
- [ ] Action Type alias 추가

**Phase 1: Types & Store**
- [ ] `dataset.types.ts` → `datatable.types.ts`
- [ ] `dataset.ts` → `datatable.ts`
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
- [ ] `events.registry.ts` 액션 타입 추가 (호환 유지)
- [ ] Action Editor 파일명 변경 (2개)
- [ ] `ActionEditor.tsx` case문 변경
- [ ] Variable/Binding 유틸 변경

**Phase 5: Hooks & Utils**
- [ ] `useCollectionData.ts` 변경
- [ ] `ConditionEditor.tsx` 변경

**Phase 6: 데이터 마이그레이션**
- [ ] localStorage 마이그레이션 코드 적용
- [ ] Supabase 스키마 확인 (필요 시)

**Phase 7: 문서**
- [ ] `CLAUDE.md` 업데이트
- [ ] `docs/` 문서들 업데이트
- [ ] `CHANGELOG.md` 추가
- [ ] `MIGRATION_GUIDE.md` 섹션 추가

**Phase 8: 테스트 & 검증**
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 개발 서버에서 기능 테스트

---

## 11. 롤백 계획

### 전체 롤백

```bash
git checkout -- .
git clean -fd
```

### 특정 Phase 롤백

```bash
git revert <commit-hash>
```

### 데이터 롤백 (localStorage)

```typescript
// 긴급 롤백 시 실행
function rollbackCacheKeys(): void {
  const keys = Object.keys(localStorage);
  keys.filter(k => k.startsWith('xstudio_datatable_cache_')).forEach(key => {
    const id = key.replace('xstudio_datatable_cache_', '');
    const oldKey = `xstudio_dataset_cache_${id}`;
    const data = localStorage.getItem(key);
    if (data) {
      localStorage.setItem(oldKey, data);
    }
  });
}
```

---

## 12. 파일 변경 요약

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

---

**문서 버전**: 2.0
**작성자**: Claude
**검토자**: -
