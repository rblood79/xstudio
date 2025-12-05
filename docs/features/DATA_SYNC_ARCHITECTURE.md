# Data Sync Architecture

> **Status**: 📋 Planning Phase → 🔍 Analysis Complete
> **Created**: 2025-12-05
> **Updated**: 2025-12-06 (현재 구현 상태 분석 추가)
> **Related**: [DATA_PANEL_SYSTEM.md](DATA_PANEL_SYSTEM.md), [useAsyncList](https://react-spectrum.adobe.com/react-stately/useAsyncList.html)

---

## 목차

1. [Overview](#overview)
2. [현재 아키텍처 분석](#현재-아키텍처-분석)
3. [문제점 및 요구사항](#문제점-및-요구사항)
4. [현재 구현 상태 상세 분석](#현재-구현-상태-상세-분석) 🆕
5. [Builder 루틴 체크 (UX 관점)](#builder-루틴-체크-ux-관점)
6. [즉시 해결 필요 사항 (Hotfix)](#즉시-해결-필요-사항-hotfix) 🆕
7. [제안 아키텍처](#제안-아키텍처)
8. [구현 계획](#구현-계획)
9. [API 설계](#api-설계)
10. [파일 구조](#파일-구조)
11. [마이그레이션 가이드](#마이그레이션-가이드)

---

## Overview

### 목적

컴포넌트 데이터 바인딩과 이벤트 시스템 간의 데이터 동기화(Sync) 아키텍처를 정의합니다.

### 핵심 질문

| 질문 | 제안 |
|------|------|
| PropertiesPanel에서 데이터바인딩 sync 옵션 추가? | ✅ `refreshMode` 옵션으로 선언적 설정 |
| EventsPanel에서 async 데이터 로드? | ✅ `loadDataset`, `syncComponent` 액션 추가 |
| API 호출 후 Dataset으로 보낼 때? | ✅ `saveToDataTable` 옵션 + 이벤트 체이닝 |

### 관련 패널

```
┌─────────────────────────────────────────────────────────────────┐
│                        Panel 역할 분리                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DatasetPanel (프로젝트 레벨)                                     │
│  └─ DataTable, API Endpoint, Variables, Transformers 관리        │
│                                                                  │
│  DatasetEditPanel (상세 편집)                                     │
│  └─ 스키마 정의, Mock 데이터, API 테스트                           │
│                                                                  │
│  PropertiesPanel (컴포넌트 레벨)                                  │
│  └─ PropertyDataBinding 설정, refreshMode 옵션 🆕                 │
│                                                                  │
│  EventsPanel (행동 레벨)                                          │
│  └─ apiCall, loadDataset 🆕, syncComponent 🆕 액션                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 현재 아키텍처 분석

### 데이터 흐름

```
┌──────────────────────────────────────────────────────────────────┐
│                     현재 데이터 흐름                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Builder Store (useDataStore)                                     │
│  ├─ dataTables: Map<string, DataTable>                           │
│  ├─ apiEndpoints: Map<string, ApiEndpoint>                       │
│  └─ variables: Map<string, Variable>                             │
│                                                                   │
│         │ postMessage                                             │
│         ▼                                                         │
│                                                                   │
│  Canvas Runtime Store (runtimeStore)                              │
│  ├─ dataTables: RuntimeDataTable[]                               │
│  ├─ apiEndpoints: RuntimeApiEndpoint[]                           │
│  └─ variables: RuntimeVariable[]                                 │
│                                                                   │
│         │ useCollectionData hook                                  │
│         ▼                                                         │
│                                                                   │
│  Collection Components (ListBox, Select, etc.)                    │
│  └─ dataBinding: PropertyDataBinding                             │
│      ├─ source: 'dataTable' → sync load (mockData/runtimeData)   │
│      └─ source: 'api' → async load (REST call)                   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### PropertyDataBinding 현재 구조

```typescript
// src/builder/panels/common/PropertyDataBinding.tsx

interface PropertyDataBinding {
  source: 'dataTable' | 'api' | 'variable' | 'route';
  name: string;           // DataTable/API/Variable 이름
  path?: string;          // 중첩 필드 접근 (e.g., 'items[0].name')
}
```

### useCollectionData 현재 로직

```typescript
// src/builder/hooks/useCollectionData.ts

// 데이터 소스 우선순위
1. PropertyDataBinding (source: 'dataTable')
   └─ 동기 로드: mockData 또는 runtimeData 반환

2. PropertyDataBinding (source: 'api')
   └─ 비동기 로드: executeApiEndpoint() 호출

3. Dataset (datasetId prop)
   └─ DatasetStore에서 캐시된 데이터 반환

4. DataBinding (type: 'collection')
   └─ useAsyncList로 static/api 데이터 로드
```

### EventsPanel 현재 액션 목록

```typescript
// src/utils/events/eventEngine.ts - 21개 액션 타입

// State Management
'setState' | 'updateState' | 'setComponentState'

// Navigation
'navigate' | 'scrollTo'

// UI Control
'showModal' | 'hideModal' | 'showToast' | 'toggleVisibility'

// Form Actions
'submitForm' | 'validateForm' | 'resetForm' | 'updateFormField'

// Data Operations
'apiCall' | 'filterCollection' | 'selectItem' | 'clearSelection'

// Component Actions
'triggerComponent'

// Utilities
'customFunction' | 'copyToClipboard'
```

---

## 문제점 및 요구사항

### 현재 문제점

| 문제 | 영향 | 심각도 |
|------|------|--------|
| **데이터 갱신 제어 부재** | 컴포넌트별 갱신 전략 설정 불가 | 🔴 High |
| **API→DataTable 연결 복잡** | 수동으로 setState 체이닝 필요 | 🟡 Medium |
| **컴포넌트 간 동기화 없음** | 같은 데이터 사용해도 독립적 fetch | 🔴 High |
| **이벤트 기반 새로고침 어려움** | 버튼 클릭 → 특정 컴포넌트 리프레시 복잡 | 🟡 Medium |

### 사용자 시나리오

#### 시나리오 1: 대시보드 자동 갱신
```
요구사항: 대시보드의 차트/테이블이 30초마다 자동 갱신
현재: 불가능 (수동 새로고침만 가능)
제안: refreshMode: 'interval' + refreshInterval: 30000
```

#### 시나리오 2: 버튼 클릭으로 데이터 새로고침
```
요구사항: "새로고침" 버튼 클릭 시 ListBox 데이터 리로드
현재: apiCall → setState → 복잡한 상태 관리
제안: loadDataset 액션으로 단순화
```

#### 시나리오 3: API 응답을 여러 컴포넌트에서 공유
```
요구사항: 사용자 API 호출 → ListBox, Select, Badge에서 동시 표시
현재: 각 컴포넌트가 독립적으로 fetch (3번 호출)
제안: saveToDataTable 옵션으로 DataTable에 캐시 → 공유
```

#### 시나리오 4: 폼 제출 후 목록 자동 갱신
```
요구사항: 새 아이템 생성 API 성공 → 목록 자동 리프레시
현재: 수동으로 상태 업데이트 필요
제안: apiCall.onSuccess → syncComponent 액션 체이닝
```

---

## 현재 구현 상태 상세 분석

> **분석일**: 2025-12-06
> **분석 대상**: Pokemon API (`https://pokeapi.co/api/v2/pokemon`) 워크플로우

### 워크플로우별 현재 상태

#### 1. API 호출 → DataTable 저장 워크플로우

```
기대 워크플로우 (자동):
Dataset Panel > API 추가 > Response 설정 > Target DataTable 지정 > 자동 저장

현재 워크플로우 (수동):
Dataset Panel > API 추가 > Test 실행 > Success > Column 선택 > "Import to DataTable" 버튼 클릭
```

| 단계 | 현재 상태 | 코드 위치 | 문제점 |
|------|----------|-----------|--------|
| API 호출 | ✅ 성공 | `executeApiEndpoint()` | - |
| Response → Data Path | ✅ 가능 | `responseMapping.dataPath` | - |
| Target DataTable 필드 | ⚠️ UI만 있음 | `ApiEndpointEditor.tsx:594-602` | 저장 로직 미구현 |
| Field Mapping | ⚠️ 수동만 가능 | `FieldMappingEditor` | 자동 매핑 없음 |
| DataTable 생성 | ⚠️ Test 탭 수동 | `handleImport()` :200-248 | 자동화 없음 |

**핵심 문제**: `targetDataTable` 필드는 Response 탭에 존재하지만, `executeApiEndpoint()`가 결과를 해당 DataTable에 저장하는 로직이 **없음**.

#### 2. Component 데이터 바인딩 워크플로우

```
기대 워크플로우:
Component 선택 > Data Binding > DataTable 선택 > 필드 자동 생성

현재 워크플로우:
Component 선택 > Data Binding > DataTable 선택 > (수동으로 Field 추가 필요)
```

| 단계 | 현재 상태 | 코드 위치 | 문제점 |
|------|----------|-----------|--------|
| DataTable 선택 | ✅ 가능 | `PropertyDataBinding.tsx` | - |
| 스키마 조회 | ✅ 가능 | `useCollectionData.ts:336-341` | `schema` 반환됨 |
| Field 자동 생성 | ❌ 미구현 | - | 수동 추가 필요 |

**핵심 문제**: `useCollectionData`가 `schema`를 반환하지만, 이를 기반으로 Field 컴포넌트를 자동 생성하는 로직이 **없음**.

### 오류 분석: "DataTable을 찾을 수 없습니다"

**발생 위치**: `useCollectionData.ts:343`

```typescript
const table = dataTables.find(dt => dt.name === binding.name);
if (!table) {
  console.warn(`⚠️ ${componentName}: DataTable '${binding.name}'을 찾을 수 없습니다`);
}
```

**원인 분석**:

| 원인 | 설명 | 발생 조건 |
|------|------|----------|
| **Canvas 동기화 지연** | Builder에서 DataTable 생성 후 Canvas에 전파 안됨 | DataTable 생성 직후 Preview 확인 시 |
| **postMessage 누락** | `createDataTable` 시 Canvas로 메시지 미전송 | 항상 |
| **이름 불일치** | API Import 테이블명 ≠ PropertyDataBinding 선택 이름 | 수동 입력 오류 |
| **Store 미초기화** | Canvas `runtimeStore.dataTables`가 빈 배열 | 페이지 새로고침 후 |

**현재 동기화 흐름**:
```
Builder Store (useDataStore)
├─ dataTables: Map<string, DataTable>  ← 여기에 저장됨
│
│   ❌ postMessage 없음!
│
Canvas Runtime Store (runtimeStore)
├─ dataTables: RuntimeDataTable[]      ← 비어있음
```

### 코드 레벨 분석

#### ApiEndpointEditor.tsx - 핵심 함수

```typescript
// :141-189 - handleTest: API 호출 + Column Detection
const handleTest = useCallback(async () => {
  const result = await executeApiEndpoint(endpoint.id);
  setTestResult({ success: true, data: result });

  // Column 자동 감지
  const columns = detectColumns(dataToAnalyze);
  setDetectedColumns(columns);
  // ⚠️ 여기서 끝남. targetDataTable에 저장하지 않음!
}, [...]);

// :200-248 - handleImport: 수동 DataTable 생성
const handleImport = useCallback(async (columns, tableName) => {
  const schema = columnsToSchema(columns);
  const mockData = extractSelectedData(dataToImport, selectedKeys);

  await createDataTable({
    name: tableName,
    schema,
    mockData,
    useMockData: false,  // API 데이터이므로 false
  });
  // ⚠️ "Import to DataTable" 버튼 클릭 시에만 실행됨
}, [...]);
```

#### useCollectionData.ts - 데이터 소스 우선순위

```typescript
// :514-529 - 데이터 소스 우선순위
if (dataTableData && dataTableData.length > 0) {
  sourceData = dataTableData;  // 1순위: DataTable (동기)
} else if (apiEndpointData && apiEndpointData.length > 0) {
  sourceData = apiEndpointData;  // 2순위: API Endpoint (비동기)
} else if (datasetId && datasetState) {
  sourceData = datasetState.data;  // 3순위: Dataset
} else {
  sourceData = list.items;  // 4순위: AsyncList
}
```

---

## Builder 루틴 체크 (UX 관점)

### 1) Dataset > API 추가 → Response → DataTable 매핑 (자동화)
- Base URL 저장 후 Endpoint 경로만 교체할 수 있도록 API 모델을 분리합니다. (예: Base `https://pokeapi.co/api/v2`, Endpoint `/pokemon`)
- API 테스트 성공 시 Response에서 Data Path를 지정하면 Target DataTable이 자동 생성/선택되고 스키마 필드가 추출됩니다.
  - 데이터 타입 추론 + Field Mapping 자동 생성 (데이터가 배열이면 첫 요소를 기준으로 컬럼 자동 감지)
  - 기존 DataTable과 이름이 충돌하면 `api_<endpoint>` 같은 규칙으로 신규 생성
- 매핑 완료 후 `saveToDataTable`까지 한 번에 설정되어 재호출 시 바로 DataTable을 갱신합니다.

### 2) 컴포넌트(ListBox 등) 데이터 바인딩 자동 필드 생성
- DataTable에 스키마/컬럼이 존재하면 컬렉션 컴포넌트에서 dataBinding 설정 시 컬럼 옵션을 자동 노출합니다.
- 새로 생성된 DataTable이라도 API 응답 기반 스키마가 저장되면 즉시 바인딩 필드가 채워집니다. (mockData 없이도 컬럼 감지)

### 3) 오류: "DataTable을 찾을 수 없습니다" 방지
- DataPath까지 설정했는데 DataTable 미생성/삭제로 오류가 나는 경우 자동 복구 루틴을 둡니다.
  - DataPath로부터 재추론해 임시 DataTable을 생성하고 컬럼을 다시 매핑
  - 동일 이름의 DataTable이 존재하지만 runtimeData만 없는 경우 스키마는 유지하되 mockData/runtimeData를 빈 배열로 초기화
  - 예외 발생 시에도 builder 패널에서 원인(미생성/삭제/권한)과 자동 조치 로그를 바로 표시

### 4) Base URL 유지 + Endpoint 교체 흐름
- Dataset API 편집 UI에 Base URL과 Endpoint를 분리해 관리하며, Endpoint만 바꿔도 기존 DataTable 매핑을 재사용합니다.
- Response Data Path가 동일하면 스키마 재생성 없이 runtimeData만 교체하고, 달라지면 새 스키마 후보를 diff로 제안하여 선택적으로 갱신합니다.

### 5) Base URL이 여러 개인 경우
- API 엔드포인트를 Base URL 그룹 단위로 관리하고, DataTable 매핑은 `(baseGroup, endpoint)` 키로 보존합니다.
- 동일한 DataTable을 여러 Base URL이 공유할 수 있도록 `targetDataTable`을 분리 저장하고, 충돌 시 별도 DataTable로 분기할 수 있는 옵션을 제공합니다. (예: `pokemon_default`, `pokemon_alt1`)
- 이벤트 액션에서 Base URL 그룹을 선택할 수 있게 해 동일 Endpoint라도 다른 Base를 호출하는 시나리오를 대비합니다.

---

## 즉시 해결 필요 사항 (Hotfix)

### Hotfix 1: API 결과 → targetDataTable 자동 저장

**우선순위**: 🔴 Critical
**영향 파일**: `src/builder/stores/utils/dataActions.ts`

```typescript
// executeApiEndpoint 확장
export const createExecuteApiEndpointAction = (set, get) =>
  async (id: string): Promise<unknown> => {
    const endpoint = get().apiEndpoints.get(id);
    const result = await fetchApi(endpoint);

    // 🆕 targetDataTable이 있으면 자동 저장
    if (endpoint.targetDataTable) {
      const data = extractDataPath(result, endpoint.responseMapping?.dataPath);

      // runtimeData 업데이트
      const dataTable = get().dataTables.get(endpoint.targetDataTable);
      if (dataTable) {
        set((state) => ({
          dataTables: new Map(state.dataTables).set(dataTable.id, {
            ...dataTable,
            runtimeData: Array.isArray(data) ? data : [data],
          }),
        }));

        // Canvas에 동기화
        window.postMessage({
          type: 'UPDATE_DATA_TABLE_RUNTIME',
          dataTableName: endpoint.targetDataTable,
          data: Array.isArray(data) ? data : [data],
        }, '*');
      }
    }

    return result;
  };
```

### Hotfix 2: DataTable 생성 시 Canvas 동기화

**우선순위**: 🔴 Critical
**영향 파일**: `src/builder/stores/utils/dataActions.ts`

```typescript
// createDataTable 확장
export const createCreateDataTableAction = (set, get) =>
  async (data: CreateDataTableInput): Promise<DataTable> => {
    // ... 기존 로직

    // 🆕 Canvas에 동기화
    const allDataTables = Array.from(get().dataTables.values());
    window.postMessage({
      type: 'SYNC_DATA_TABLES',
      dataTables: allDataTables.map(dt => ({
        id: dt.id,
        name: dt.name,
        schema: dt.schema,
        mockData: dt.mockData,
        runtimeData: dt.runtimeData,
        useMockData: dt.useMockData,
      })),
    }, '*');

    return newDataTable;
  };
```

### Hotfix 3: Canvas messageHandler 확장

**우선순위**: 🔴 Critical
**영향 파일**: `src/canvas/messaging/messageHandler.ts`

```typescript
// 새 메시지 타입 처리
case 'SYNC_DATA_TABLES':
  useRuntimeStore.getState().setDataTables(message.dataTables);
  break;

case 'UPDATE_DATA_TABLE_RUNTIME':
  useRuntimeStore.getState().updateDataTableRuntime(
    message.dataTableName,
    message.data
  );
  break;
```

---

## 제안 아키텍처

### 통합 데이터 Sync 아키텍처

```
┌──────────────────────────────────────────────────────────────────────┐
│                     제안 데이터 Sync 아키텍처                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │DatasetPanel │     │Properties   │     │EventsPanel  │            │
│  │             │     │Panel        │     │             │            │
│  │ • DataTable │     │ • refreshMode│    │ • apiCall   │            │
│  │ • API설정   │     │   옵션 추가  │    │   (확장)    │            │
│  │ • 스키마    │     │             │     │ • loadDataset│           │
│  └──────┬──────┘     └──────┬──────┘     │ • syncComponent│          │
│         │                   │            └──────┬──────┘            │
│         ▼                   ▼                   ▼                    │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              useCollectionData (확장)                     │       │
│  │                                                           │       │
│  │  • useAsyncList 내부 사용 (React Stately)                 │       │
│  │  • refreshMode에 따른 자동 갱신 로직                       │       │
│  │  • Consumer 등록으로 syncComponent 액션 수신               │       │
│  │  • reload() 함수 노출                                     │       │
│  └──────────────────────────────────────────────────────────┘       │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  DataTable   │  │  API Direct  │  │   Dataset    │              │
│  │  (mockData / │  │  (on-demand) │  │  (consumer   │              │
│  │  runtimeData)│  │              │  │   구독)      │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │              DataSyncManager (신규)                       │       │
│  │                                                           │       │
│  │  • refreshMode별 스케줄러 관리                             │       │
│  │  • Consumer 레지스트리 (componentId → dataSource 매핑)     │       │
│  │  • syncComponent 액션 수신 → reload() 호출                │       │
│  │  • API 응답 → DataTable runtimeData 저장                  │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Builder 플로우 반영 (API → DataTable → 컴포넌트)

1) DatasetPanel에서 API 등록
- Base URL과 Endpoint를 분리 저장하여 Base는 고정, Endpoint만 교체 가능.
- API 테스트 성공 시 Response Data Path 선택 → Target DataTable 자동 생성/선택 + 필드 매핑 자동 추출(배열이면 첫 요소 기준).
- 동일 이름 충돌 시 규칙적 네이밍(`api_<endpoint>`)으로 신규 생성, runtimeData는 빈 배열로 초기화.

2) 다중 Base URL 대비
- Base URL 그룹을 관리하고 `(baseGroup, endpoint)`로 매핑을 보관.
- 동일 Endpoint라도 다른 Base로 호출 가능하며, DataTable을 공유하거나 분기(`pokemon_default`, `pokemon_alt1`)할 옵션 제공.

3) 컴포넌트 데이터 바인딩
- DataTable 스키마를 즉시 반영해 ListBox 등 컬렉션 컴포넌트의 데이터 바인딩 필드 옵션을 자동 노출.
- DataTable이 삭제/누락되면 Data Path로 재추론해 임시 DataTable 생성 후 바인딩 유지(사용자에게 자동 조치 로그 표시).

4) 이벤트·동기화 라우팅
- apiCall 성공 시 `saveToDataTable`로 runtimeData 갱신 → 같은 DataTable을 쓰는 컴포넌트에 syncComponent 브로드캐스트.
- loadDataset/syncComponent 액션으로 특정 컴포넌트, DataTable, Dataset 단위로 리로드를 지시.

### 핵심 개념

#### 1. RefreshMode (선언적 갱신 설정)

```typescript
type RefreshMode =
  | 'manual'     // 수동 갱신만 (기본값)
  | 'onMount'    // 컴포넌트 마운트 시 1회
  | 'interval'   // 주기적 갱신
  | 'realtime';  // WebSocket/Supabase Realtime (향후)

interface PropertyDataBindingExtended extends PropertyDataBinding {
  refreshMode?: RefreshMode;
  refreshInterval?: number;  // interval 모드일 때 (ms)
}
```

#### 2. DataSyncManager (중앙 동기화 관리)

```typescript
// 신규: src/builder/services/DataSyncManager.ts

class DataSyncManager {
  private consumers: Map<string, ConsumerInfo>;  // componentId → dataSource
  private schedulers: Map<string, NodeJS.Timeout>;  // interval 관리

  // Consumer 등록
  registerConsumer(componentId: string, dataSource: DataSource): void;
  unregisterConsumer(componentId: string): void;

  // 데이터 갱신
  syncComponent(componentId: string): Promise<void>;
  syncDataSource(dataSource: DataSource): Promise<void>;

  // 스케줄러
  startInterval(componentId: string, interval: number): void;
  stopInterval(componentId: string): void;
}
```

#### 3. 새로운 Event Actions

```typescript
// 신규 액션 타입

// loadDataset: 특정 Dataset 또는 컴포넌트 데이터 로드
interface LoadDatasetAction {
  type: 'loadDataset';
  config: {
    datasetId?: string;      // Dataset ID
    componentId?: string;    // 특정 컴포넌트
    target?: 'self' | 'all'; // 현재 컴포넌트 or 같은 데이터 사용하는 모든 컴포넌트
  };
}

// syncComponent: 특정 컴포넌트 데이터 새로고침
interface SyncComponentAction {
  type: 'syncComponent';
  config: {
    componentId?: string;     // 타겟 컴포넌트 (없으면 self)
    dataTableName?: string;   // DataTable 사용하는 모든 컴포넌트 동기화
  };
}

// apiCall 확장: 응답을 DataTable에 저장
interface ApiCallActionExtended {
  type: 'apiCall';
  config: {
    apiEndpointId: string;
    params?: Record<string, unknown>;

    // 🆕 신규 옵션
    saveToDataTable?: string;  // 응답을 저장할 DataTable 이름
    resultPath?: string;       // 응답에서 추출할 경로 (e.g., 'data.items')
    mergeMode?: 'replace' | 'append' | 'prepend';  // 기존 데이터와 병합 방식

    onSuccess?: ActionConfig;  // 성공 시 다음 액션
    onError?: ActionConfig;    // 실패 시 다음 액션
  };
}
```

---

## 구현 계획

### Phase 1: PropertyDataBinding 확장 (High Priority)

**Goal**: 선언적 갱신 설정 추가

**Files to Modify**:
- `src/builder/panels/common/PropertyDataBinding.tsx`
- `src/types/builder/unified.types.ts`

**구현 내용**:

| 기능 | 설명 | 복잡도 |
|------|------|--------|
| `refreshMode` 옵션 | manual/onMount/interval 선택 | 낮음 |
| `refreshInterval` 입력 | interval 모드 시 주기 설정 | 낮음 |
| UI 필드 추가 | Select + NumberField | 낮음 |

**UI 설계**:
```
┌─────────────────────────────────────────┐
│ Data Binding                            │
├─────────────────────────────────────────┤
│ Source:    [DataTable ▼]                │
│ Name:      [users     ▼]                │
│ Path:      [items              ]        │
│                                         │
│ ─── Refresh Settings ───                │
│ Mode:      [Interval  ▼]                │
│ Interval:  [30000     ] ms              │
└─────────────────────────────────────────┘
```

**코드 변경**:

```typescript
// src/types/builder/unified.types.ts

export type RefreshMode = 'manual' | 'onMount' | 'interval' | 'realtime';

export interface PropertyDataBinding {
  source: 'dataTable' | 'api' | 'variable' | 'route';
  name: string;
  path?: string;

  // 🆕 Refresh 설정
  refreshMode?: RefreshMode;
  refreshInterval?: number;
}
```

```tsx
// src/builder/panels/common/PropertyDataBinding.tsx (수정)

<fieldset className="properties-group">
  <legend>Refresh Settings</legend>

  <PropertySelect
    label="Mode"
    value={binding.refreshMode || 'manual'}
    onChange={(value) => updateBinding({ refreshMode: value as RefreshMode })}
    options={[
      { value: 'manual', label: 'Manual' },
      { value: 'onMount', label: 'On Mount' },
      { value: 'interval', label: 'Interval' },
    ]}
  />

  {binding.refreshMode === 'interval' && (
    <PropertyInput
      label="Interval (ms)"
      type="number"
      value={String(binding.refreshInterval || 30000)}
      onChange={(value) => updateBinding({ refreshInterval: Number(value) })}
      placeholder="30000"
    />
  )}
</fieldset>
```

---

### Phase 2: useCollectionData 확장 (High Priority)

**Goal**: refreshMode 지원 + reload 함수 노출

**Files to Modify**:
- `src/builder/hooks/useCollectionData.ts`

**구현 내용**:

| 기능 | 설명 | 복잡도 |
|------|------|--------|
| `refreshMode` 처리 | onMount/interval 로직 | 중간 |
| `reload()` 노출 | 외부에서 새로고침 호출 가능 | 낮음 |
| `useAsyncList` 통합 | React Stately 활용 | 중간 |
| AbortController | 언마운트 시 요청 취소 | 낮음 |

**코드 변경**:

```typescript
// src/builder/hooks/useCollectionData.ts (확장)

interface UseCollectionDataOptions {
  dataBinding?: DataBinding;
  componentName: string;
  fallbackData?: Record<string, unknown>[];
  datasetId?: string;
  elementId?: string;

  // 🆕 Refresh 옵션
  refreshMode?: RefreshMode;
  refreshInterval?: number;
}

interface UseCollectionDataResult {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;

  // 🆕 Refresh 함수
  reload: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}

export function useCollectionData(options: UseCollectionDataOptions): UseCollectionDataResult {
  const {
    refreshMode = 'manual',
    refreshInterval = 30000,
    elementId,
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // useAsyncList from React Stately
  const list = useAsyncList({
    async load({ signal }) {
      abortControllerRef.current = new AbortController();
      const data = await fetchData(options, signal);
      setLastRefreshedAt(Date.now());
      return { items: data };
    },
  });

  // reload 함수
  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await list.reload();
    } finally {
      setIsRefreshing(false);
    }
  }, [list]);

  // onMount 모드
  useEffect(() => {
    if (refreshMode === 'onMount') {
      reload();
    }
  }, [refreshMode, reload]);

  // interval 모드
  useEffect(() => {
    if (refreshMode !== 'interval') return;

    const timer = setInterval(() => {
      reload();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshMode, refreshInterval, reload]);

  // Consumer 등록 (DataSyncManager 연동)
  useEffect(() => {
    if (elementId) {
      dataSyncManager.registerConsumer(elementId, {
        reload,
        dataBinding: options.dataBinding,
      });

      return () => dataSyncManager.unregisterConsumer(elementId);
    }
  }, [elementId, reload, options.dataBinding]);

  return {
    data: list.items,
    loading: list.isLoading,
    error: list.error?.message || null,
    reload,
    isRefreshing,
    lastRefreshedAt,
  };
}
```

---

### Phase 3: DataSyncManager 구현 (Medium Priority)

**Goal**: 중앙 동기화 관리 서비스

**Files to Create**:
- `src/builder/services/DataSyncManager.ts`
- `src/types/dataSync.types.ts`

**구현 내용**:

| 기능 | 설명 | 복잡도 |
|------|------|--------|
| Consumer Registry | componentId → reload 함수 매핑 | 낮음 |
| syncComponent | 특정 컴포넌트 새로고침 | 낮음 |
| syncDataSource | 특정 데이터 소스 사용하는 모든 컴포넌트 새로고침 | 중간 |
| Interval Scheduler | 주기적 갱신 관리 | 중간 |

**코드**:

```typescript
// src/types/dataSync.types.ts

export interface ConsumerInfo {
  componentId: string;
  reload: () => Promise<void>;
  dataBinding?: PropertyDataBinding;
  datasetId?: string;
}

export interface DataSyncManagerState {
  consumers: Map<string, ConsumerInfo>;
  schedulers: Map<string, NodeJS.Timeout>;
}
```

```typescript
// src/builder/services/DataSyncManager.ts

class DataSyncManager {
  private consumers = new Map<string, ConsumerInfo>();
  private schedulers = new Map<string, NodeJS.Timeout>();

  // Consumer 등록
  registerConsumer(componentId: string, info: Omit<ConsumerInfo, 'componentId'>) {
    this.consumers.set(componentId, { componentId, ...info });
  }

  unregisterConsumer(componentId: string) {
    this.consumers.delete(componentId);
    this.stopInterval(componentId);
  }

  // 특정 컴포넌트 새로고침
  async syncComponent(componentId: string): Promise<void> {
    const consumer = this.consumers.get(componentId);
    if (consumer) {
      await consumer.reload();
    }
  }

  // 특정 DataTable 사용하는 모든 컴포넌트 새로고침
  async syncDataTable(dataTableName: string): Promise<void> {
    const promises: Promise<void>[] = [];

    this.consumers.forEach((consumer) => {
      if (consumer.dataBinding?.source === 'dataTable' &&
          consumer.dataBinding?.name === dataTableName) {
        promises.push(consumer.reload());
      }
    });

    await Promise.all(promises);
  }

  // 특정 Dataset 사용하는 모든 컴포넌트 새로고침
  async syncDataset(datasetId: string): Promise<void> {
    const promises: Promise<void>[] = [];

    this.consumers.forEach((consumer) => {
      if (consumer.datasetId === datasetId) {
        promises.push(consumer.reload());
      }
    });

    await Promise.all(promises);
  }

  // Interval 관리
  startInterval(componentId: string, interval: number) {
    this.stopInterval(componentId);

    const timer = setInterval(() => {
      this.syncComponent(componentId);
    }, interval);

    this.schedulers.set(componentId, timer);
  }

  stopInterval(componentId: string) {
    const timer = this.schedulers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.schedulers.delete(componentId);
    }
  }
}

export const dataSyncManager = new DataSyncManager();
```

---

### Phase 4: Event Actions 확장 (Medium Priority)

**Goal**: loadDataset, syncComponent, apiCall 확장

**Files to Modify**:
- `src/utils/events/eventEngine.ts`
- `src/builder/inspector/events/actions/` (새 에디터 추가)
- `src/builder/inspector/events/data/actionMetadata.ts`

**구현 내용**:

| 액션 | 설명 | 복잡도 |
|------|------|--------|
| `loadDataset` | Dataset/컴포넌트 데이터 로드 | 중간 |
| `syncComponent` | 컴포넌트 새로고침 | 낮음 |
| `apiCall.saveToDataTable` | API 응답을 DataTable에 저장 | 중간 |

**loadDataset 액션 에디터**:

```tsx
// src/builder/inspector/events/actions/LoadDatasetActionEditor.tsx

export function LoadDatasetActionEditor({ config, onUpdate }: ActionEditorProps) {
  return (
    <div className="action-editor">
      <PropertySelect
        label="Target Type"
        value={config.targetType || 'dataset'}
        onChange={(value) => onUpdate({ ...config, targetType: value })}
        options={[
          { value: 'dataset', label: 'Dataset' },
          { value: 'component', label: 'Component' },
          { value: 'dataTable', label: 'DataTable' },
        ]}
      />

      {config.targetType === 'dataset' && (
        <PropertySelect
          label="Dataset"
          value={config.datasetId || ''}
          onChange={(value) => onUpdate({ ...config, datasetId: value })}
          options={datasetOptions}
        />
      )}

      {config.targetType === 'component' && (
        <ComponentSelector
          label="Component"
          value={config.componentId}
          onChange={(value) => onUpdate({ ...config, componentId: value })}
          filter={(el) => hasDataBinding(el)}
        />
      )}

      {config.targetType === 'dataTable' && (
        <PropertySelect
          label="DataTable"
          value={config.dataTableName || ''}
          onChange={(value) => onUpdate({ ...config, dataTableName: value })}
          options={dataTableOptions}
        />
      )}
    </div>
  );
}
```

**EventEngine 확장**:

```typescript
// src/utils/events/eventEngine.ts (확장)

// loadDataset 액션 핸들러
private async executeLoadDataset(config: LoadDatasetActionConfig): Promise<void> {
  const { targetType, datasetId, componentId, dataTableName } = config;

  switch (targetType) {
    case 'dataset':
      await dataSyncManager.syncDataset(datasetId!);
      break;
    case 'component':
      await dataSyncManager.syncComponent(componentId!);
      break;
    case 'dataTable':
      await dataSyncManager.syncDataTable(dataTableName!);
      break;
  }
}

// syncComponent 액션 핸들러
private async executeSyncComponent(config: SyncComponentActionConfig): Promise<void> {
  const { componentId, dataTableName } = config;

  if (componentId) {
    await dataSyncManager.syncComponent(componentId);
  } else if (dataTableName) {
    await dataSyncManager.syncDataTable(dataTableName);
  }
}

// apiCall 확장 (saveToDataTable)
private async executeApiCall(config: ApiCallActionConfig): Promise<unknown> {
  const response = await this.callApi(config);

  // 🆕 DataTable에 저장
  if (config.saveToDataTable) {
    const data = config.resultPath
      ? getNestedValue(response, config.resultPath)
      : response;

    const dataStore = useDataStore.getState();
    const dataTable = dataStore.getDataTableByName(config.saveToDataTable);

    if (dataTable) {
      let newData: Record<string, unknown>[];

      switch (config.mergeMode) {
        case 'append':
          newData = [...(dataTable.runtimeData || []), ...toArray(data)];
          break;
        case 'prepend':
          newData = [...toArray(data), ...(dataTable.runtimeData || [])];
          break;
        case 'replace':
        default:
          newData = toArray(data);
      }

      dataStore.updateDataTable(dataTable.id, { runtimeData: newData });

      // 관련 컴포넌트 동기화
      await dataSyncManager.syncDataTable(config.saveToDataTable);
    }
  }

  return response;
}
```

---

### Phase 5: Canvas Integration (Medium Priority)

**Goal**: Preview iframe에서 데이터 동기화 지원

**Files to Modify**:
- `src/canvas/store/runtimeStore.ts`
- `src/canvas/messaging/messageHandler.ts`
- `src/builder/hooks/useIframeMessenger.ts`

**새로운 Message Types**:

```typescript
// Builder → Canvas
| { type: 'SYNC_COMPONENT'; componentId: string }
| { type: 'SYNC_DATA_TABLE'; dataTableName: string }
| { type: 'UPDATE_DATA_TABLE_RUNTIME'; dataTableName: string; data: unknown[] }

// Canvas → Builder
| { type: 'DATA_SYNC_COMPLETE'; componentId: string }
| { type: 'DATA_SYNC_ERROR'; componentId: string; error: string }
```

**구현 내용**:

| 기능 | 설명 | 복잡도 |
|------|------|--------|
| SYNC_COMPONENT 메시지 | 특정 컴포넌트 리로드 | 중간 |
| SYNC_DATA_TABLE 메시지 | DataTable 업데이트 전파 | 중간 |
| runtimeData 동기화 | API 응답을 Canvas에 전파 | 중간 |

---

### Phase 6: Advanced Features (Low Priority)

**Goal**: 실시간 동기화 + 에러 복구

| 기능 | 설명 | 복잡도 | 우선순위 |
|------|------|--------|----------|
| Realtime Mode | Supabase Realtime 연동 | 높음 | 낮음 |
| Retry Logic | 실패 시 자동 재시도 | 중간 | 중간 |
| Optimistic Updates | 낙관적 업데이트 | 높음 | 낮음 |
| Conflict Resolution | 동시 수정 충돌 해결 | 높음 | 낮음 |

---

## API 설계

### PropertyDataBinding (확장)

```typescript
interface PropertyDataBinding {
  // 기존
  source: 'dataTable' | 'api' | 'variable' | 'route';
  name: string;
  path?: string;

  // 🆕 신규
  refreshMode?: 'manual' | 'onMount' | 'interval' | 'realtime';
  refreshInterval?: number;  // ms (기본: 30000)
}
```

### useCollectionData (확장)

```typescript
interface UseCollectionDataOptions {
  // 기존
  dataBinding?: DataBinding;
  componentName: string;
  fallbackData?: Record<string, unknown>[];
  datasetId?: string;
  elementId?: string;

  // 🆕 신규
  refreshMode?: RefreshMode;
  refreshInterval?: number;
}

interface UseCollectionDataResult {
  // 기존
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  sort?: (descriptor: SortDescriptor) => void;
  filterText?: string;
  setFilterText?: (text: string) => void;
  loadMore?: () => void;
  hasMore?: boolean;

  // 🆕 신규
  reload: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
}
```

### Event Actions (신규)

```typescript
// loadDataset
interface LoadDatasetActionConfig {
  targetType: 'dataset' | 'component' | 'dataTable';
  datasetId?: string;
  componentId?: string;
  dataTableName?: string;
}

// syncComponent
interface SyncComponentActionConfig {
  componentId?: string;
  dataTableName?: string;
}

// apiCall (확장)
interface ApiCallActionConfig {
  // 기존
  apiEndpointId: string;
  params?: Record<string, unknown>;
  onSuccess?: ActionConfig;
  onError?: ActionConfig;

  // 🆕 신규
  saveToDataTable?: string;
  resultPath?: string;
  mergeMode?: 'replace' | 'append' | 'prepend';
}
```

### DataSyncManager

```typescript
interface DataSyncManager {
  // Consumer 관리
  registerConsumer(componentId: string, info: ConsumerInfo): void;
  unregisterConsumer(componentId: string): void;

  // 동기화
  syncComponent(componentId: string): Promise<void>;
  syncDataTable(dataTableName: string): Promise<void>;
  syncDataset(datasetId: string): Promise<void>;

  // Interval 관리
  startInterval(componentId: string, interval: number): void;
  stopInterval(componentId: string): void;
  stopAllIntervals(): void;
}
```

---

## 파일 구조

```
src/
├── types/
│   ├── dataSync.types.ts              # 🆕 Data Sync 타입 정의
│   └── builder/
│       └── unified.types.ts           # PropertyDataBinding 확장
│
├── builder/
│   ├── services/
│   │   └── DataSyncManager.ts         # 🆕 중앙 동기화 관리
│   │
│   ├── hooks/
│   │   └── useCollectionData.ts       # 수정: refreshMode, reload
│   │
│   ├── panels/
│   │   └── common/
│   │       └── PropertyDataBinding.tsx # 수정: Refresh Settings UI
│   │
│   └── inspector/
│       └── events/
│           ├── actions/
│           │   ├── LoadDatasetActionEditor.tsx    # 🆕
│           │   ├── SyncComponentActionEditor.tsx  # 🆕
│           │   └── APICallActionEditor.tsx        # 수정: saveToDataTable
│           └── data/
│               └── actionMetadata.ts   # 수정: 새 액션 메타데이터
│
├── canvas/
│   ├── store/
│   │   └── runtimeStore.ts            # 수정: sync 관련 상태
│   └── messaging/
│       └── messageHandler.ts          # 수정: SYNC_* 메시지 처리
│
└── utils/
    └── events/
        └── eventEngine.ts             # 수정: 새 액션 핸들러
```

---

## 마이그레이션 가이드

### 기존 코드 영향

| 영역 | 영향 | 대응 |
|------|------|------|
| PropertyDataBinding | 호환 (신규 필드 optional) | 변경 없음 |
| useCollectionData | 호환 (신규 옵션 optional) | 변경 없음 |
| Event Actions | 호환 (기존 apiCall 동작 유지) | 변경 없음 |

### 점진적 적용

1. **Phase 1-2 완료 후**: 기존 컴포넌트에 `refreshMode` 추가 가능
2. **Phase 3 완료 후**: `syncComponent` 액션으로 수동 새로고침 가능
3. **Phase 4 완료 후**: `apiCall.saveToDataTable`로 데이터 공유 가능

### Breaking Changes

- 없음 (모든 신규 기능은 opt-in)

---

## 구현 우선순위 요약

| 순위 | Phase | 기능 | 복잡도 | 효과 |
|------|-------|------|--------|------|
| **1** | Phase 1 | `refreshMode` 옵션 | 낮음 | 선언적 갱신 설정 |
| **2** | Phase 2 | `useCollectionData` 확장 | 중간 | 자동 갱신 + reload |
| **3** | Phase 3 | `DataSyncManager` | 중간 | 중앙 동기화 관리 |
| **4** | Phase 4 | Event Actions 확장 | 중간 | 이벤트 기반 동기화 |
| **5** | Phase 5 | Canvas Integration | 중간 | Preview 동기화 |
| **6** | Phase 6 | Advanced Features | 높음 | 실시간 + 에러 복구 |

---

## 참고 자료

- [React Stately useAsyncList](https://react-spectrum.adobe.com/react-stately/useAsyncList.html)
- [DATA_PANEL_SYSTEM.md](DATA_PANEL_SYSTEM.md)
- [COLLECTION_COMPONENTS_DATA_BINDING.md](COLLECTION_COMPONENTS_DATA_BINDING.md)
- [CANVAS_RUNTIME_ISOLATION.md](CANVAS_RUNTIME_ISOLATION.md)

---

**Remember:** 이 아키텍처는 기존 코드와 완전 호환되며, 모든 신규 기능은 opt-in 방식으로 점진적 적용이 가능합니다.
