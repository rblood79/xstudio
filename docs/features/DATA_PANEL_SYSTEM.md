# Data Panel System Design

**Status:** Draft
**Created:** 2025-11-28
**Author:** Claude
**Related:** Event System, DataBinding, Collection Components

---

## 1. Overview

### 1.1 Problem Statement

현재 XStudio의 데이터 관리:
- `MOCK_DATA`는 컴포넌트 테스트용 샘플 데이터
- 실제 외부 API 연동 구조 없음
- Frontend 개발 시 Backend API 완성 전까지 화면 개발 어려움

### 1.2 Goal

Frontend 개발자가 Backend API 없이도 화면을 먼저 개발할 수 있는 **데이터 추상화 시스템** 구축

### 1.3 Design Principles

**참고한 빌더들:**
- **Retool**: Query + Transformer 패턴
- **Appsmith**: Datasource + 리액티브 바인딩
- **Bubble**: Data Type + Workflow
- **FlutterFlow**: Backend Query + Custom Data Type

**핵심 원칙:**
1. **스키마 우선** - 데이터 구조를 먼저 정의
2. **Mock 데이터** - API 없이 UI 개발 가능
3. **선언적 바인딩** - 컴포넌트와 데이터 연결
4. **이벤트 기반** - API 호출 시점 제어

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Panel Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Data Panel (UI)                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ DataTables  │ │ API         │ │ Variables           │ │   │
│  │  │ Tab         │ │ Endpoints   │ │ (Global State)      │ │   │
│  │  │             │ │ Tab         │ │ Tab                 │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Data Store (Zustand)                   │   │
│  │                                                           │   │
│  │  dataTables: Map<string, DataTable>                       │   │
│  │  apiEndpoints: Map<string, ApiEndpoint>                   │   │
│  │  variables: Map<string, Variable>                         │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Runtime Engine                         │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │ API Caller  │  │ Data        │  │ Binding         │   │   │
│  │  │             │  │ Transformer │  │ Resolver        │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Component Layer                        │   │
│  │                                                           │   │
│  │  ListBox ← dataSource: "users"                            │   │
│  │  GridList ← dataSource: "products"                        │   │
│  │  Text ← binding: "{{users[0].name}}"                      │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 DataTable (데이터 테이블)

**역할:** 데이터 스키마 정의 + Mock 데이터 저장 + 런타임 데이터 보관

```typescript
interface DataTable {
  id: string;
  name: string;                    // "users", "products"
  project_id: string;

  // Schema Definition
  schema: DataField[];

  // Mock Data (개발용)
  mockData: Record<string, unknown>[];

  // Runtime Data (API 응답 저장)
  // Note: 이 필드는 메모리에만 존재, DB에 저장 안함
  runtimeData?: Record<string, unknown>[];

  // Settings
  useMockData: boolean;            // true면 mockData 사용, false면 API 결과 사용

  created_at?: string;
  updated_at?: string;
}

interface DataField {
  key: string;                     // "id", "name", "email"
  type: DataFieldType;             // "string", "number", "boolean", "date", "array", "object"
  label?: string;                  // UI 표시용 레이블
  required?: boolean;
  defaultValue?: unknown;

  // Nested schema (type이 "object" 또는 "array"인 경우)
  children?: DataField[];
}

type DataFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "image"
  | "array"
  | "object";
```

**예시:**

```json
{
  "id": "dt-001",
  "name": "users",
  "project_id": "proj-001",
  "schema": [
    { "key": "id", "type": "string", "required": true },
    { "key": "name", "type": "string", "required": true, "label": "이름" },
    { "key": "email", "type": "email", "required": true },
    { "key": "role", "type": "string", "defaultValue": "user" },
    { "key": "createdAt", "type": "datetime" }
  ],
  "mockData": [
    { "id": "u-001", "name": "John Doe", "email": "john@example.com", "role": "admin" },
    { "id": "u-002", "name": "Jane Smith", "email": "jane@example.com", "role": "user" }
  ],
  "useMockData": true
}
```

---

### 3.2 API Endpoint (API 엔드포인트)

**역할:** 외부 API 연결 설정 + 응답 매핑

```typescript
interface ApiEndpoint {
  id: string;
  name: string;                    // "getUsers", "createUser"
  project_id: string;

  // Request Configuration
  method: HttpMethod;              // "GET", "POST", "PUT", "DELETE", "PATCH"
  baseUrl: string;                 // "https://api.example.com"
  path: string;                    // "/users" or "/users/{{userId}}"

  // Headers
  headers: ApiHeader[];

  // Query Parameters (GET)
  queryParams: ApiParam[];

  // Body (POST, PUT, PATCH)
  bodyType: "json" | "form-data" | "x-www-form-urlencoded" | "none";
  bodyTemplate?: string;           // JSON template with variables

  // Response Handling
  responseMapping: ResponseMapping;

  // Target DataTable
  targetDataTable?: string;        // DataTable name to populate

  // Settings
  timeout?: number;                // ms, default 30000
  retryCount?: number;             // default 0

  created_at?: string;
  updated_at?: string;
}

interface ApiHeader {
  key: string;
  value: string;                   // Can include variables: "Bearer {{authToken}}"
  enabled: boolean;
}

interface ApiParam {
  key: string;
  value: string;                   // Can include variables: "{{searchQuery}}"
  type: "string" | "number" | "boolean";
  required: boolean;
}

interface ResponseMapping {
  // JSON Path to data array/object
  dataPath: string;                // "data", "response.items", "results"

  // Field mappings (optional, for renaming)
  fieldMappings?: {
    sourceKey: string;             // API response field
    targetKey: string;             // DataTable field
  }[];

  // Pagination (optional)
  pagination?: {
    type: "offset" | "cursor" | "page";
    totalPath?: string;            // "meta.total"
    nextCursorPath?: string;       // "meta.nextCursor"
  };
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
```

**예시:**

```json
{
  "id": "api-001",
  "name": "getUsers",
  "project_id": "proj-001",
  "method": "GET",
  "baseUrl": "https://api.example.com",
  "path": "/users",
  "headers": [
    { "key": "Authorization", "value": "Bearer {{authToken}}", "enabled": true },
    { "key": "Content-Type", "value": "application/json", "enabled": true }
  ],
  "queryParams": [
    { "key": "page", "value": "{{currentPage}}", "type": "number", "required": false },
    { "key": "limit", "value": "20", "type": "number", "required": false },
    { "key": "search", "value": "{{searchQuery}}", "type": "string", "required": false }
  ],
  "bodyType": "none",
  "responseMapping": {
    "dataPath": "data.users",
    "fieldMappings": [
      { "sourceKey": "user_name", "targetKey": "name" },
      { "sourceKey": "user_email", "targetKey": "email" }
    ],
    "pagination": {
      "type": "offset",
      "totalPath": "data.total"
    }
  },
  "targetDataTable": "users",
  "timeout": 30000
}
```

---

### 3.3 Variable (전역 변수)

**역할:** 앱 전역 상태 관리 (인증 토큰, 현재 사용자, 설정 등)

```typescript
interface Variable {
  id: string;
  name: string;                    // "authToken", "currentUser", "theme"
  project_id: string;

  type: VariableType;
  defaultValue?: unknown;

  // Persistence
  persist: boolean;                // localStorage에 저장할지

  // Scope
  scope: "global" | "page";        // 전역 또는 페이지 범위
  page_id?: string;                // scope가 "page"인 경우

  created_at?: string;
  updated_at?: string;
}

type VariableType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";
```

**예시:**

```json
{
  "id": "var-001",
  "name": "authToken",
  "project_id": "proj-001",
  "type": "string",
  "defaultValue": "",
  "persist": true,
  "scope": "global"
}
```

---

### 3.4 DataBinding (데이터 바인딩)

**역할:** 컴포넌트 속성과 데이터 연결

```typescript
// Element.dataBinding 확장
interface DataBinding {
  // Collection Binding (ListBox, GridList 등)
  dataSource?: string;             // DataTable name: "users"

  // Field Bindings
  bindings?: {
    [propKey: string]: BindingExpression;
  };
}

interface BindingExpression {
  type: "static" | "dataTable" | "variable" | "expression";

  // type: "static"
  value?: unknown;

  // type: "dataTable"
  dataTable?: string;              // "users"
  field?: string;                  // "name"
  index?: number | string;         // 0 or "{{selectedIndex}}"

  // type: "variable"
  variable?: string;               // "currentUser"
  path?: string;                   // "profile.name"

  // type: "expression"
  expression?: string;             // "{{users.length > 0 ? users[0].name : 'No data'}}"
}
```

**예시:**

```json
{
  "dataSource": "users",
  "bindings": {
    "labelField": { "type": "static", "value": "name" },
    "valueField": { "type": "static", "value": "id" },
    "disabled": {
      "type": "expression",
      "expression": "{{users.length === 0}}"
    },
    "selectedValue": {
      "type": "variable",
      "variable": "selectedUserId"
    }
  }
}
```

---

## 4. Database Schema

### 4.1 Supabase Migration

```sql
-- supabase/migrations/YYYYMMDD_data_panel_system.sql

-- 1. DataTables
CREATE TABLE data_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  schema JSONB NOT NULL DEFAULT '[]',
  mock_data JSONB NOT NULL DEFAULT '[]',
  use_mock_data BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_datatable_name_per_project UNIQUE (project_id, name)
);

CREATE INDEX idx_data_tables_project ON data_tables(project_id);

-- 2. API Endpoints
CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  method TEXT NOT NULL DEFAULT 'GET',
  base_url TEXT NOT NULL,
  path TEXT NOT NULL,

  headers JSONB NOT NULL DEFAULT '[]',
  query_params JSONB NOT NULL DEFAULT '[]',
  body_type TEXT NOT NULL DEFAULT 'none',
  body_template TEXT,

  response_mapping JSONB NOT NULL DEFAULT '{}',
  target_data_table TEXT,

  timeout INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_apiendpoint_name_per_project UNIQUE (project_id, name)
);

CREATE INDEX idx_api_endpoints_project ON api_endpoints(project_id);

-- 3. Variables
CREATE TABLE variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  type TEXT NOT NULL DEFAULT 'string',
  default_value JSONB,

  persist BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'global',
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_variable_name_per_project UNIQUE (project_id, name)
);

CREATE INDEX idx_variables_project ON variables(project_id);
CREATE INDEX idx_variables_page ON variables(page_id) WHERE page_id IS NOT NULL;

-- 4. RLS Policies
ALTER TABLE data_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

-- Policies (similar to existing tables)
CREATE POLICY "Users can manage own project data_tables"
  ON data_tables FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

CREATE POLICY "Users can manage own project api_endpoints"
  ON api_endpoints FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));

CREATE POLICY "Users can manage own project variables"
  ON variables FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()));
```

### 4.2 IndexedDB Schema

```typescript
// src/lib/db/indexedDB/adapter.ts 확장

// Store 생성
const dataTablesStore = db.createObjectStore('dataTables', { keyPath: 'id' });
dataTablesStore.createIndex('project_id', 'project_id', { unique: false });
dataTablesStore.createIndex('name', 'name', { unique: false });

const apiEndpointsStore = db.createObjectStore('apiEndpoints', { keyPath: 'id' });
apiEndpointsStore.createIndex('project_id', 'project_id', { unique: false });
apiEndpointsStore.createIndex('name', 'name', { unique: false });

const variablesStore = db.createObjectStore('variables', { keyPath: 'id' });
variablesStore.createIndex('project_id', 'project_id', { unique: false });
variablesStore.createIndex('name', 'name', { unique: false });
variablesStore.createIndex('page_id', 'page_id', { unique: false });
```

---

## 5. Type Definitions

```typescript
// src/types/builder/data.types.ts

export interface DataTable {
  id: string;
  name: string;
  project_id: string;
  schema: DataField[];
  mockData: Record<string, unknown>[];
  useMockData: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DataField {
  key: string;
  type: DataFieldType;
  label?: string;
  required?: boolean;
  defaultValue?: unknown;
  children?: DataField[];
}

export type DataFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "image"
  | "array"
  | "object";

export interface ApiEndpoint {
  id: string;
  name: string;
  project_id: string;
  method: HttpMethod;
  baseUrl: string;
  path: string;
  headers: ApiHeader[];
  queryParams: ApiParam[];
  bodyType: BodyType;
  bodyTemplate?: string;
  responseMapping: ResponseMapping;
  targetDataTable?: string;
  timeout?: number;
  retryCount?: number;
  created_at?: string;
  updated_at?: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type BodyType = "json" | "form-data" | "x-www-form-urlencoded" | "none";

export interface ApiHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiParam {
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
  required: boolean;
}

export interface ResponseMapping {
  dataPath: string;
  fieldMappings?: FieldMapping[];
  pagination?: PaginationConfig;
}

export interface FieldMapping {
  sourceKey: string;
  targetKey: string;
}

export interface PaginationConfig {
  type: "offset" | "cursor" | "page";
  totalPath?: string;
  nextCursorPath?: string;
}

export interface Variable {
  id: string;
  name: string;
  project_id: string;
  type: VariableType;
  defaultValue?: unknown;
  persist: boolean;
  scope: "global" | "page";
  page_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type VariableType = "string" | "number" | "boolean" | "object" | "array";
```

---

## 6. Zustand Store

```typescript
// src/builder/stores/data.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DataTable, ApiEndpoint, Variable } from '../../types/builder/data.types';

interface DataState {
  // Collections
  dataTables: DataTable[];
  apiEndpoints: ApiEndpoint[];
  variables: Variable[];

  // Runtime Data (메모리에만 존재)
  runtimeData: Map<string, Record<string, unknown>[]>;

  // Loading States
  loadingApis: Set<string>;

  // Actions - DataTable
  addDataTable: (dataTable: DataTable) => void;
  updateDataTable: (id: string, updates: Partial<DataTable>) => void;
  deleteDataTable: (id: string) => void;

  // Actions - API Endpoint
  addApiEndpoint: (endpoint: ApiEndpoint) => void;
  updateApiEndpoint: (id: string, updates: Partial<ApiEndpoint>) => void;
  deleteApiEndpoint: (id: string) => void;

  // Actions - Variable
  addVariable: (variable: Variable) => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  deleteVariable: (id: string) => void;
  setVariableValue: (name: string, value: unknown) => void;

  // Actions - Runtime
  setRuntimeData: (dataTableName: string, data: Record<string, unknown>[]) => void;
  clearRuntimeData: (dataTableName: string) => void;

  // Actions - API Execution
  executeApi: (endpointId: string, params?: Record<string, unknown>) => Promise<void>;

  // Getters
  getDataTableData: (name: string) => Record<string, unknown>[];
  getVariableValue: (name: string) => unknown;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      dataTables: [],
      apiEndpoints: [],
      variables: [],
      runtimeData: new Map(),
      loadingApis: new Set(),

      // DataTable Actions
      addDataTable: (dataTable) => {
        set((state) => ({
          dataTables: [...state.dataTables, dataTable]
        }));
      },

      updateDataTable: (id, updates) => {
        set((state) => ({
          dataTables: state.dataTables.map((dt) =>
            dt.id === id ? { ...dt, ...updates, updated_at: new Date().toISOString() } : dt
          )
        }));
      },

      deleteDataTable: (id) => {
        set((state) => ({
          dataTables: state.dataTables.filter((dt) => dt.id !== id)
        }));
      },

      // API Endpoint Actions
      addApiEndpoint: (endpoint) => {
        set((state) => ({
          apiEndpoints: [...state.apiEndpoints, endpoint]
        }));
      },

      updateApiEndpoint: (id, updates) => {
        set((state) => ({
          apiEndpoints: state.apiEndpoints.map((ep) =>
            ep.id === id ? { ...ep, ...updates, updated_at: new Date().toISOString() } : ep
          )
        }));
      },

      deleteApiEndpoint: (id) => {
        set((state) => ({
          apiEndpoints: state.apiEndpoints.filter((ep) => ep.id !== id)
        }));
      },

      // Variable Actions
      addVariable: (variable) => {
        set((state) => ({
          variables: [...state.variables, variable]
        }));
      },

      updateVariable: (id, updates) => {
        set((state) => ({
          variables: state.variables.map((v) =>
            v.id === id ? { ...v, ...updates, updated_at: new Date().toISOString() } : v
          )
        }));
      },

      deleteVariable: (id) => {
        set((state) => ({
          variables: state.variables.filter((v) => v.id !== id)
        }));
      },

      setVariableValue: (name, value) => {
        const variable = get().variables.find((v) => v.name === name);
        if (variable) {
          set((state) => ({
            variables: state.variables.map((v) =>
              v.name === name ? { ...v, defaultValue: value } : v
            )
          }));
        }
      },

      // Runtime Actions
      setRuntimeData: (dataTableName, data) => {
        set((state) => {
          const newMap = new Map(state.runtimeData);
          newMap.set(dataTableName, data);
          return { runtimeData: newMap };
        });
      },

      clearRuntimeData: (dataTableName) => {
        set((state) => {
          const newMap = new Map(state.runtimeData);
          newMap.delete(dataTableName);
          return { runtimeData: newMap };
        });
      },

      // API Execution
      executeApi: async (endpointId, params = {}) => {
        const endpoint = get().apiEndpoints.find((ep) => ep.id === endpointId);
        if (!endpoint) {
          throw new Error(`API Endpoint not found: ${endpointId}`);
        }

        // Mark as loading
        set((state) => ({
          loadingApis: new Set([...state.loadingApis, endpointId])
        }));

        try {
          // Build URL with path parameters
          let url = `${endpoint.baseUrl}${endpoint.path}`;

          // Replace path variables
          url = url.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return String(params[key] ?? get().getVariableValue(key) ?? '');
          });

          // Build query string
          const queryParams = new URLSearchParams();
          endpoint.queryParams.forEach((param) => {
            let value = param.value;
            value = value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
              return String(params[key] ?? get().getVariableValue(key) ?? '');
            });
            if (value) {
              queryParams.append(param.key, value);
            }
          });

          if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
          }

          // Build headers
          const headers: Record<string, string> = {};
          endpoint.headers.forEach((header) => {
            if (header.enabled) {
              let value = header.value;
              value = value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                return String(params[key] ?? get().getVariableValue(key) ?? '');
              });
              headers[header.key] = value;
            }
          });

          // Build body
          let body: string | undefined;
          if (endpoint.bodyType === 'json' && endpoint.bodyTemplate) {
            let bodyStr = endpoint.bodyTemplate;
            bodyStr = bodyStr.replace(/\{\{(\w+)\}\}/g, (_, key) => {
              const value = params[key] ?? get().getVariableValue(key);
              return JSON.stringify(value);
            });
            body = bodyStr;
          }

          // Execute request
          const response = await fetch(url, {
            method: endpoint.method,
            headers,
            body,
            signal: AbortSignal.timeout(endpoint.timeout || 30000),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const json = await response.json();

          // Extract data using dataPath
          let data = json;
          if (endpoint.responseMapping.dataPath) {
            const paths = endpoint.responseMapping.dataPath.split('.');
            for (const path of paths) {
              data = data?.[path];
            }
          }

          // Apply field mappings
          if (Array.isArray(data) && endpoint.responseMapping.fieldMappings?.length) {
            data = data.map((item: Record<string, unknown>) => {
              const mapped: Record<string, unknown> = { ...item };
              endpoint.responseMapping.fieldMappings!.forEach((mapping) => {
                if (mapping.sourceKey in item) {
                  mapped[mapping.targetKey] = item[mapping.sourceKey];
                  if (mapping.sourceKey !== mapping.targetKey) {
                    delete mapped[mapping.sourceKey];
                  }
                }
              });
              return mapped;
            });
          }

          // Store in runtime data
          if (endpoint.targetDataTable) {
            get().setRuntimeData(endpoint.targetDataTable, Array.isArray(data) ? data : [data]);
          }

        } finally {
          // Clear loading state
          set((state) => {
            const newSet = new Set(state.loadingApis);
            newSet.delete(endpointId);
            return { loadingApis: newSet };
          });
        }
      },

      // Getters
      getDataTableData: (name) => {
        const dataTable = get().dataTables.find((dt) => dt.name === name);
        if (!dataTable) return [];

        if (dataTable.useMockData) {
          return dataTable.mockData;
        }

        return get().runtimeData.get(name) || [];
      },

      getVariableValue: (name) => {
        const variable = get().variables.find((v) => v.name === name);
        return variable?.defaultValue;
      },
    }),
    {
      name: 'xstudio-data-store',
      partialize: (state) => ({
        dataTables: state.dataTables,
        apiEndpoints: state.apiEndpoints,
        variables: state.variables.filter((v) => v.persist),
      }),
    }
  )
);
```

---

## 7. UI Design

### 7.1 Data Panel Structure

```
┌─────────────────────────────────────────────────────────┐
│  Data                                              [+]  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │DataTables│ │   API   │ │Variables│                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 users                                    [⋮]        │
│     └─ 3 fields, 5 mock records                        │
│                                                         │
│  📋 products                                 [⋮]        │
│     └─ 6 fields, 12 mock records                       │
│                                                         │
│  📋 orders                                   [⋮]        │
│     └─ 8 fields, 0 mock records                        │
│                                                         │
│  ─────────────────────────────────────────────         │
│  [+ Add DataTable]                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 DataTable Editor

```
┌─────────────────────────────────────────────────────────┐
│  📋 DataTable: users                              [×]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ users                                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Schema                                    [+ Field]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Key          │ Type      │ Required │ Actions   │   │
│  ├──────────────┼───────────┼──────────┼───────────┤   │
│  │ id           │ string    │ ✓        │ [⋮]       │   │
│  │ name         │ string    │ ✓        │ [⋮]       │   │
│  │ email        │ email     │ ✓        │ [⋮]       │   │
│  │ role         │ string    │          │ [⋮]       │   │
│  │ createdAt    │ datetime  │          │ [⋮]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Mock Data                          [+ Row] [Import]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ id      │ name       │ email           │ role   │   │
│  ├─────────┼────────────┼─────────────────┼────────┤   │
│  │ u-001   │ John Doe   │ john@example... │ admin  │   │
│  │ u-002   │ Jane Smith │ jane@example... │ user   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Settings                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ □ Use Mock Data (uncheck to use API response)   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Cancel]    [Save]         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 API Endpoint Editor

```
┌─────────────────────────────────────────────────────────┐
│  🔗 API Endpoint: getUsers                        [×]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Name                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ getUsers                                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Request                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Method    Base URL                              │   │
│  │ ┌──────┐  ┌─────────────────────────────────┐  │   │
│  │ │GET ▼│  │ https://api.example.com         │  │   │
│  │ └──────┘  └─────────────────────────────────┘  │   │
│  │                                                 │   │
│  │ Path                                            │   │
│  │ ┌─────────────────────────────────────────────┐│   │
│  │ │ /users                                      ││   │
│  │ └─────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Headers                                   [+ Header] │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ☑ Authorization │ Bearer {{authToken}}         │   │
│  │ ☑ Content-Type  │ application/json             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Query Parameters                           [+ Param] │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Key      │ Value            │ Type    │ Req    │   │
│  ├──────────┼──────────────────┼─────────┼────────┤   │
│  │ page     │ {{currentPage}}  │ number  │        │   │
│  │ limit    │ 20               │ number  │        │   │
│  │ search   │ {{searchQuery}}  │ string  │        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Response Mapping                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Data Path: [data.users                        ] │   │
│  │                                                 │   │
│  │ Target DataTable: [users                    ▼] │   │
│  │                                                 │   │
│  │ Field Mappings (optional):          [+ Mapping] │   │
│  │ user_name → name                               │   │
│  │ user_email → email                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ▼ Test                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Test Request]                                  │   │
│  │                                                 │   │
│  │ Response Preview:                               │   │
│  │ ┌───────────────────────────────────────────┐  │   │
│  │ │ { "data": { "users": [...] } }            │  │   │
│  │ └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Cancel]    [Save]         │
└─────────────────────────────────────────────────────────┘
```

### 7.4 Variables Tab

```
┌─────────────────────────────────────────────────────────┐
│  Variables                                  [+ Variable]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔷 Global Variables                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ authToken      │ string  │ "eyJhbG..."  │ 💾   │   │
│  │ currentUserId  │ string  │ ""           │      │   │
│  │ theme          │ string  │ "light"      │ 💾   │   │
│  │ apiBaseUrl     │ string  │ "https://..."│      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📄 Page Variables (Current Page)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ searchQuery    │ string  │ ""           │      │   │
│  │ currentPage    │ number  │ 1            │      │   │
│  │ selectedItem   │ object  │ null         │      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💾 = Persisted to localStorage                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Event System Integration

### 8.1 New Action Types

```typescript
// 기존 Event System에 추가할 Action Types

// API Call Action (기존 확장)
interface ApiCallAction {
  type: "apiCall";
  config: {
    endpointId: string;           // API Endpoint ID
    params?: Record<string, unknown>;  // Override parameters

    // 성공/실패 핸들링
    onSuccess?: string;           // 다음 Action ID
    onError?: string;             // 에러 시 Action ID
  };
}

// Set Variable Action
interface SetVariableAction {
  type: "setVariable";
  config: {
    variableName: string;
    value: unknown | BindingExpression;
  };
}

// Update DataTable Action
interface UpdateDataTableAction {
  type: "updateDataTable";
  config: {
    dataTableName: string;
    operation: "set" | "append" | "prepend" | "clear";
    data?: unknown | BindingExpression;
  };
}

// Refresh DataTable Action
interface RefreshDataTableAction {
  type: "refreshDataTable";
  config: {
    dataTableName: string;
    apiEndpointId?: string;       // Optional: specific API to call
  };
}
```

### 8.2 Event Flow Example

```
Page Load Event
    ↓
┌─────────────────────────┐
│ Action 1: API Call      │
│ endpoint: "getUsers"    │
│ → users DataTable       │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Action 2: Set Variable  │
│ "isLoaded" = true       │
└─────────────────────────┘

Button Click Event
    ↓
┌─────────────────────────┐
│ Action 1: Set Variable  │
│ "searchQuery" = input   │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ Action 2: API Call      │
│ endpoint: "searchUsers" │
│ params: { q: {{search}} }│
└─────────────────────────┘
```

---

## 9. Component DataBinding Integration

### 9.1 Collection Components

```typescript
// ListBox, GridList, Select, ComboBox 등 Collection 컴포넌트

// 현재 방식 (dataBinding prop)
<ListBox
  dataBinding={{
    baseUrl: "MOCK_DATA",
    endpoint: "/users",
    dataMapping: { idField: "id", labelField: "name" }
  }}
/>

// 새로운 방식 (dataSource prop)
<ListBox
  dataSource="users"              // DataTable 이름
  labelField="name"
  valueField="id"
/>
```

### 9.2 DataSource Resolution

```typescript
// src/builder/preview/hooks/useDataSource.ts

export function useDataSource(dataSourceName: string) {
  const getDataTableData = useDataStore((s) => s.getDataTableData);
  const loadingApis = useDataStore((s) => s.loadingApis);

  const data = useMemo(() => {
    return getDataTableData(dataSourceName);
  }, [dataSourceName, getDataTableData]);

  const isLoading = useMemo(() => {
    // Check if any API targeting this DataTable is loading
    // Implementation depends on how we track API -> DataTable relationships
    return false;
  }, [loadingApis, dataSourceName]);

  return { data, isLoading };
}
```

### 9.3 Preview Renderer Update

```typescript
// ListBox 렌더링 예시

function renderListBox(element: Element, children: React.ReactNode) {
  const { dataSource, labelField, valueField, ...props } = element.props;

  // 새로운 dataSource 방식
  if (dataSource) {
    return (
      <DataSourceProvider dataSource={dataSource}>
        <ListBox {...props}>
          {(item) => (
            <ListBoxItem key={item[valueField]} textValue={item[labelField]}>
              {item[labelField]}
            </ListBoxItem>
          )}
        </ListBox>
      </DataSourceProvider>
    );
  }

  // 기존 dataBinding 방식 (하위 호환)
  if (element.dataBinding) {
    // 기존 로직...
  }

  // Static children
  return <ListBox {...props}>{children}</ListBox>;
}
```

---

## 10. Implementation Plan

### Phase 1: Foundation (기반 작업) - 1주

| Task | File | Priority |
|------|------|----------|
| Type definitions | `src/types/builder/data.types.ts` | P0 |
| Database migration | `supabase/migrations/` | P0 |
| IndexedDB schema | `src/lib/db/indexedDB/adapter.ts` | P0 |
| Zustand store | `src/builder/stores/data.ts` | P0 |

### Phase 2: DataTable UI - 1주

| Task | File | Priority |
|------|------|----------|
| Data Panel component | `src/builder/panels/data/DataPanel.tsx` | P1 |
| DataTable list | `src/builder/panels/data/DataTableList.tsx` | P1 |
| DataTable editor | `src/builder/panels/data/DataTableEditor.tsx` | P1 |
| Schema editor | `src/builder/panels/data/SchemaEditor.tsx` | P1 |
| Mock data editor | `src/builder/panels/data/MockDataEditor.tsx` | P1 |

### Phase 3: API Endpoint UI - 1주

| Task | File | Priority |
|------|------|----------|
| API Endpoint list | `src/builder/panels/data/ApiEndpointList.tsx` | P1 |
| API Endpoint editor | `src/builder/panels/data/ApiEndpointEditor.tsx` | P1 |
| Request builder | `src/builder/panels/data/RequestBuilder.tsx` | P1 |
| Response mapping UI | `src/builder/panels/data/ResponseMappingEditor.tsx` | P1 |
| Test request feature | `src/builder/panels/data/ApiTester.tsx` | P2 |

### Phase 4: Variables UI - 0.5주

| Task | File | Priority |
|------|------|----------|
| Variables list | `src/builder/panels/data/VariablesList.tsx` | P1 |
| Variable editor | `src/builder/panels/data/VariableEditor.tsx` | P1 |

### Phase 5: Integration - 1주

| Task | File | Priority |
|------|------|----------|
| DataSource hook | `src/builder/preview/hooks/useDataSource.ts` | P1 |
| Collection renderers update | `src/builder/preview/renderers/` | P1 |
| Event System actions | `src/builder/inspector/events/actions/` | P1 |
| Property Editor binding | `src/builder/inspector/properties/` | P2 |

### Phase 6: Testing & Polish - 0.5주

| Task | Priority |
|------|----------|
| Unit tests | P2 |
| E2E tests | P2 |
| Documentation | P2 |
| MOCK_DATA migration | P2 |

---

## 11. Migration Strategy

### 11.1 MOCK_DATA → DataTable

기존 `MOCK_DATA` 엔드포인트를 DataTable로 변환:

```typescript
// 기존 MOCK_DATA
{
  baseUrl: "MOCK_DATA",
  endpoint: "/users",
  dataMapping: { idField: "id", labelField: "name" }
}

// 새로운 DataTable
{
  name: "mockUsers",
  schema: [
    { key: "id", type: "string" },
    { key: "name", type: "string" }
  ],
  mockData: [...],  // MOCK_DATA에서 가져온 데이터
  useMockData: true
}
```

### 11.2 Backward Compatibility

- 기존 `dataBinding` prop은 계속 지원
- 새로운 `dataSource` prop 추가
- 점진적 마이그레이션 가능

---

## 12. Security Considerations

### 12.1 API Keys & Secrets

```
⚠️ API 키는 클라이언트에 노출됨

권장:
1. Backend proxy 사용 (API 키 서버에서 관리)
2. Public API만 직접 호출
3. 민감한 API는 Supabase Edge Function 사용
```

### 12.2 CORS

```
Preview iframe에서 외부 API 호출 시 CORS 이슈 가능

해결책:
1. API 서버에서 CORS 허용
2. Proxy 서버 사용
3. Supabase Edge Function으로 우회
```

---

## 13. Future Enhancements

### 13.1 GraphQL Support (v2)

```typescript
interface GraphQLEndpoint extends ApiEndpoint {
  type: "graphql";
  query: string;
  variables: Record<string, unknown>;
}
```

### 13.2 Real-time Subscriptions (v2)

```typescript
interface RealtimeConfig {
  type: "websocket" | "sse" | "polling";
  url: string;
  interval?: number;  // polling interval
}
```

### 13.3 Data Transformers (v2)

```typescript
interface DataTransformer {
  id: string;
  name: string;
  inputDataTable: string;
  outputDataTable: string;
  transformFn: string;  // JavaScript function
}
```

### 13.4 Oracle DB Connector (v3)

```
외부 DB 직접 연결은 보안상 위험
→ Backend API 또는 Supabase Edge Function 통해 연결 권장
```

---

## 14. References

- [Retool Transformers](https://docs.retool.com/queries/guides/transformers)
- [Appsmith Data Binding](https://docs.appsmith.com/core-concepts/building-ui/dynamic-ui)
- [Bubble Data Types](https://manual.bubble.io/help-guides/data/the-database/data-types-and-fields)
- [FlutterFlow Backend Query](https://docs.flutterflow.io/resources/backend-query/)
- [Plasmic DataProvider](https://docs.plasmic.app/learn/data-provider/)
- [Framer Fetch](https://www.framer.com/help/articles/how-to-use-fetch/)

---

## 15. Success Criteria

- [ ] DataTable CRUD 기능 동작
- [ ] API Endpoint 설정 및 테스트 가능
- [ ] Variables 전역 상태 관리
- [ ] Collection 컴포넌트에서 DataTable 바인딩
- [ ] Event에서 API Call → DataTable 업데이트
- [ ] Mock 데이터로 UI 개발 가능
- [ ] 실제 API 전환 시 useMockData 토글만으로 전환
- [ ] 기존 dataBinding 하위 호환
