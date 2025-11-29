# Data Panel System Design

**Status:** Draft (v2.0 - Redesigned)
**Created:** 2025-11-28
**Updated:** 2025-11-29
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

### 1.3 XStudio 포지셔닝 (업계 최고 수준)

| 기능 영역       | XStudio 접근법                            | 벤치마크         | 점수         |
| --------------- | ----------------------------------------- | ---------------- | ------------ |
| **데이터 저장** | DataTable (스키마 + Mock + Runtime)       | Bubble           | ⭐⭐⭐⭐     |
| **바인딩 UX**   | Visual Picker + 무스타쉬                  | Webflow + Retool | ⭐⭐⭐⭐⭐   |
| **변환**        | 3단계 하이브리드 (노코드→로우코드→풀코드) | Plasmic + Retool | ⭐⭐⭐⭐⭐   |
| **실시간**      | Event-driven Refresh                      | Appsmith         | ⭐⭐⭐       |
| **총점**        |                                           |                  | **21/25** 🏆 |

### 1.4 Design Principles

**참고한 빌더들의 장점 조합:**

- **Webflow**: 드래그 드랍 바인딩 UX (⭐ 쉬움)
- **Retool**: Query + Transformer 패턴
- **Plasmic**: Full JS/TS Code Component (⭐⭐⭐⭐⭐ 유연성)
- **Appsmith**: Datasource + 리액티브 바인딩 `{{}}`
- **Bubble**: Data Type 스키마 정의
- **FlutterFlow**: Mock → Real 전환 패턴

**핵심 원칙:**

1. **스키마 우선** - 데이터 구조를 먼저 정의
2. **Mock 데이터** - API 없이 UI 개발 가능
3. **Visual + Code** - 노코드 사용자와 개발자 모두 지원
4. **3단계 변환** - 복잡도에 따라 선택

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Data Panel Architecture (v2.0)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Data Panel (UI)                                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ ┌─────────────────┐ │ │
│  │  │ DataTables  │ │ API         │ │ Variables │ │ Transformers    │ │ │
│  │  │ Tab         │ │ Endpoints   │ │ Tab       │ │ Tab (NEW)       │ │ │
│  │  │             │ │ Tab         │ │           │ │                 │ │ │
│  │  └─────────────┘ └─────────────┘ └───────────┘ └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Data Store (Zustand)                             │ │
│  │                                                                     │ │
│  │  dataTables: Map<string, DataTable>                                 │ │
│  │  apiEndpoints: Map<string, ApiEndpoint>                             │ │
│  │  variables: Map<string, Variable>                                   │ │
│  │  transformers: Map<string, Transformer>  ← NEW (3단계 변환)         │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Runtime Engine                                   │ │
│  │                                                                     │ │
│  │  ┌─────────────┐  ┌──────────────────────────┐  ┌────────────────┐ │ │
│  │  │ API Caller  │  │ 3-Tier Transformer       │  │ Binding        │ │ │
│  │  │             │  │ ┌──────────────────────┐ │  │ Resolver       │ │ │
│  │  │             │  │ │L1: Response Mapping  │ │  │ (Visual Picker │ │ │
│  │  │             │  │ │L2: JS Transformer    │ │  │  + Mustache)   │ │ │
│  │  │             │  │ │L3: Custom Function   │ │  │                │ │ │
│  │  │             │  │ └──────────────────────┘ │  │                │ │ │
│  │  └─────────────┘  └──────────────────────────┘  └────────────────┘ │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Component Layer                                  │ │
│  │                                                                     │ │
│  │  ListBox ← dataSource: "users"                                      │ │
│  │  GridList ← dataSource: "products"                                  │ │
│  │  Text ← binding: "{{users[0].name}}"  (Visual Picker로 생성)        │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 DataTable (데이터 테이블)

**역할:** 데이터 스키마 정의 + Mock 데이터 저장 + 런타임 데이터 보관

```typescript
interface DataTable {
  id: string;
  name: string; // "users", "products"
  project_id: string;

  // Schema Definition
  schema: DataField[];

  // Mock Data (개발용)
  mockData: Record<string, unknown>[];

  // Runtime Data (API 응답 저장)
  // Note: 이 필드는 메모리에만 존재, DB에 저장 안함
  runtimeData?: Record<string, unknown>[];

  // Settings
  useMockData: boolean; // true면 mockData 사용, false면 API 결과 사용

  created_at?: string;
  updated_at?: string;
}

interface DataField {
  key: string; // "id", "name", "email"
  type: DataFieldType; // "string", "number", "boolean", "date", "array", "object"
  label?: string; // UI 표시용 레이블
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
    {
      "id": "u-001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    },
    {
      "id": "u-002",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "user"
    }
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
  name: string; // "getUsers", "createUser"
  project_id: string;

  // Request Configuration
  method: HttpMethod; // "GET", "POST", "PUT", "DELETE", "PATCH"
  baseUrl: string; // "https://api.example.com"
  path: string; // "/users" or "/users/{{userId}}"

  // Headers
  headers: ApiHeader[];

  // Query Parameters (GET)
  queryParams: ApiParam[];

  // Body (POST, PUT, PATCH)
  bodyType: "json" | "form-data" | "x-www-form-urlencoded" | "none";
  bodyTemplate?: string; // JSON template with variables

  // Response Handling
  responseMapping: ResponseMapping;

  // Target DataTable
  targetDataTable?: string; // DataTable name to populate

  // Settings
  timeout?: number; // ms, default 30000
  retryCount?: number; // default 0

  created_at?: string;
  updated_at?: string;
}

interface ApiHeader {
  key: string;
  value: string; // Can include variables: "Bearer {{authToken}}"
  enabled: boolean;
}

interface ApiParam {
  key: string;
  value: string; // Can include variables: "{{searchQuery}}"
  type: "string" | "number" | "boolean";
  required: boolean;
}

interface ResponseMapping {
  // JSON Path to data array/object
  dataPath: string; // "data", "response.items", "results"

  // Field mappings (optional, for renaming)
  fieldMappings?: {
    sourceKey: string; // API response field
    targetKey: string; // DataTable field
  }[];

  // Pagination (optional)
  pagination?: {
    type: "offset" | "cursor" | "page";
    totalPath?: string; // "meta.total"
    nextCursorPath?: string; // "meta.nextCursor"
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
    {
      "key": "Authorization",
      "value": "Bearer {{authToken}}",
      "enabled": true
    },
    { "key": "Content-Type", "value": "application/json", "enabled": true }
  ],
  "queryParams": [
    {
      "key": "page",
      "value": "{{currentPage}}",
      "type": "number",
      "required": false
    },
    { "key": "limit", "value": "20", "type": "number", "required": false },
    {
      "key": "search",
      "value": "{{searchQuery}}",
      "type": "string",
      "required": false
    }
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
  name: string; // "authToken", "currentUser", "theme"
  project_id: string;

  type: VariableType;
  defaultValue?: unknown;

  // Persistence
  persist: boolean; // localStorage에 저장할지

  // Scope
  scope: "global" | "page"; // 전역 또는 페이지 범위
  page_id?: string; // scope가 "page"인 경우

  created_at?: string;
  updated_at?: string;
}

type VariableType = "string" | "number" | "boolean" | "object" | "array";
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

### 3.4 DataBinding (데이터 바인딩) - Visual Picker 하이브리드

**역할:** 컴포넌트 속성과 데이터 연결 (노코드 UI + 고급 직접입력)

**XStudio 바인딩 UX (⭐⭐⭐⭐⭐ - Webflow 수준 쉬움 + Retool 파워)**

```
┌─────────────────────────────────────────────────────────────┐
│  🔗 Data Binding                                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔍 Search data source...                           ▼│    │  ← ComboBox (검색 가능)
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  📂 DataTables                                              │
│    └─ users                                                 │
│        ├─ id           ← 클릭 시 {{users[0].id}} 삽입       │
│        ├─ name         ← 클릭 시 {{users[0].name}} 삽입     │
│        ├─ email                                             │
│        └─ avatar                                            │
│  📂 Variables                                               │
│    ├─ authToken        ← 클릭 시 {{variables.authToken}}    │
│    ├─ currentPage                                           │
│    └─ selectedUserId                                        │
│  📂 API Responses                                           │
│    └─ getUsers.data                                         │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  Result: {{users[0].name}}                                  │  ← 자동 생성된 표현식
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  ☑️ Advanced Mode (직접 입력)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ {{users.filter(u => u.role === 'admin')[0].name}}   │    │  ← 복잡한 표현식 직접 작성
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  💡 자동완성: 입력 중 데이터 소스 제안                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**장점:**

- **노코드 사용자**: 클릭만으로 바인딩 완성 (Webflow 수준)
- **개발자**: Advanced Mode에서 JavaScript 표현식 직접 작성
- **자동완성**: `{{` 입력 시 데이터 소스 자동 제안

```typescript
// Element.dataBinding 확장
interface DataBinding {
  // Collection Binding (ListBox, GridList 등)
  dataSource?: string; // DataTable name: "users"

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
  dataTable?: string; // "users"
  field?: string; // "name"
  index?: number | string; // 0 or "{{selectedIndex}}"

  // type: "variable"
  variable?: string; // "currentUser"
  path?: string; // "profile.name"

  // type: "expression"
  expression?: string; // "{{users.length > 0 ? users[0].name : 'No data'}}"
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

### 3.5 Transformer (3단계 변환 시스템) - NEW

**역할:** API 응답 데이터 변환 (Plasmic 수준 유연성 + 노코드 접근성)

**XStudio 변환 시스템 (⭐⭐⭐⭐⭐ - 업계 최고)**

```
┌─────────────────────────────────────────────────────────────────┐
│                    3단계 데이터 변환 시스템                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 1: 노코드 (Response Mapping)              👤 누구나       │
│  ────────────────────────────────────────────────────────────── │
│  │ Data Path:     [data.users                              ]│   │
│  │ Field Mappings:                                          │   │
│  │   user_name → name                                       │   │
│  │   user_email → email                                     │   │
│  │   created_at → createdAt                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Level 2: 로우코드 (Transformer)                 👨‍💻 기본 JS     │
│  ────────────────────────────────────────────────────────────── │
│  │ ┌────────────────────────────────────────────────────────┐│  │
│  │ │ return data.map(item => ({                            ││  │
│  │ │   ...item,                                            ││  │
│  │ │   fullName: `${item.firstName} ${item.lastName}`,     ││  │
│  │ │   formattedPrice: `$${item.price.toFixed(2)}`         ││  │
│  │ │ }))                                                   ││  │
│  │ └────────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Level 3: 풀코드 (Custom Function)               🧑‍💻 개발자      │
│  ────────────────────────────────────────────────────────────── │
│  │ ┌────────────────────────────────────────────────────────┐│  │
│  │ │ // TypeScript 지원, async/await, 외부 라이브러리       ││  │
│  │ │ export async function transformProducts(              ││  │
│  │ │   data: Product[],                                    ││  │
│  │ │   context: TransformContext                           ││  │
│  │ │ ): Promise<EnrichedProduct[]> {                       ││  │
│  │ │                                                       ││  │
│  │ │   const enriched = await Promise.all(                 ││  │
│  │ │     data.map(async (item) => {                        ││  │
│  │ │       const stock = await context.api.fetchStock(     ││  │
│  │ │         item.id                                       ││  │
│  │ │       );                                              ││  │
│  │ │       const rating = await context.api.fetchRating(   ││  │
│  │ │         item.id                                       ││  │
│  │ │       );                                              ││  │
│  │ │       return {                                        ││  │
│  │ │         ...item,                                      ││  │
│  │ │         stock,                                        ││  │
│  │ │         rating,                                       ││  │
│  │ │         available: stock > 0                          ││  │
│  │ │       };                                              ││  │
│  │ │     })                                                ││  │
│  │ │   );                                                  ││  │
│  │ │                                                       ││  │
│  │ │   return enriched                                     ││  │
│  │ │     .filter(p => p.available)                         ││  │
│  │ │     .sort((a, b) => b.rating - a.rating);             ││  │
│  │ │ }                                                     ││  │
│  │ └────────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  💡 차별점: Plasmic은 Level 3만 지원                             │
│            XStudio는 Level 1~3 모두 지원!                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// Transformer 타입 정의
interface Transformer {
  id: string;
  name: string;
  project_id: string;

  // 변환 레벨
  level: TransformLevel;

  // Level 1: Response Mapping (노코드)
  responseMapping?: {
    dataPath: string; // "data.users"
    fieldMappings: FieldMapping[]; // 필드명 변환
  };

  // Level 2: JS Transformer (로우코드)
  jsTransformer?: {
    code: string; // JavaScript 코드
    // 자동으로 `data`와 `context` 변수가 주입됨
  };

  // Level 3: Custom Function (풀코드)
  customFunction?: {
    code: string; // TypeScript 함수 전체
    functionName: string; // export된 함수명
    dependencies?: string[]; // 외부 라이브러리 (lodash, dayjs 등)
  };

  // 공통
  inputDataTable?: string; // 입력 DataTable
  outputDataTable?: string; // 출력 DataTable
  enabled: boolean;

  created_at?: string;
  updated_at?: string;
}

type TransformLevel = "level1_mapping" | "level2_transformer" | "level3_custom";

interface FieldMapping {
  sourceKey: string; // API 응답 필드명
  targetKey: string; // DataTable 필드명
  transform?:
    | "uppercase"
    | "lowercase"
    | "trim"
    | "number"
    | "boolean"
    | "date";
}

interface TransformContext {
  // 다른 DataTable 접근
  dataTables: Record<string, unknown[]>;

  // 변수 접근
  variables: Record<string, unknown>;

  // 추가 API 호출 (Level 3 전용)
  api: {
    fetch: (url: string, options?: RequestInit) => Promise<unknown>;
    fetchStock: (productId: string) => Promise<number>;
    fetchRating: (productId: string) => Promise<number>;
  };

  // 유틸리티
  utils: {
    formatDate: (date: string, format: string) => string;
    formatCurrency: (amount: number, currency: string) => string;
  };
}
```

**비교: XStudio vs 경쟁사**

| 빌더        | Level 1 | Level 2 | Level 3 | 총점       |
| ----------- | ------- | ------- | ------- | ---------- |
| **XStudio** | ✅      | ✅      | ✅      | ⭐⭐⭐⭐⭐ |
| Plasmic     | ❌      | ❌      | ✅      | ⭐⭐⭐     |
| Retool      | ❌      | ✅      | ❌      | ⭐⭐⭐     |
| Appsmith    | ❌      | ✅      | ❌      | ⭐⭐⭐     |
| Webflow     | ❌      | ❌      | ❌      | ⭐         |

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
const dataTablesStore = db.createObjectStore("dataTables", { keyPath: "id" });
dataTablesStore.createIndex("project_id", "project_id", { unique: false });
dataTablesStore.createIndex("name", "name", { unique: false });

const apiEndpointsStore = db.createObjectStore("apiEndpoints", {
  keyPath: "id",
});
apiEndpointsStore.createIndex("project_id", "project_id", { unique: false });
apiEndpointsStore.createIndex("name", "name", { unique: false });

const variablesStore = db.createObjectStore("variables", { keyPath: "id" });
variablesStore.createIndex("project_id", "project_id", { unique: false });
variablesStore.createIndex("name", "name", { unique: false });
variablesStore.createIndex("page_id", "page_id", { unique: false });
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
  transformerId?: string; // NEW: 연결된 Transformer
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
  transform?: FieldTransformType; // NEW: 필드 레벨 변환
}

// NEW: 필드 변환 타입
export type FieldTransformType =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "number"
  | "boolean"
  | "date"
  | "json";

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

// ============================================================
// NEW: 3단계 Transformer 타입 정의
// ============================================================

export interface Transformer {
  id: string;
  name: string;
  project_id: string;

  // 변환 레벨
  level: TransformLevel;

  // Level 1: Response Mapping (노코드)
  responseMapping?: Level1ResponseMapping;

  // Level 2: JS Transformer (로우코드)
  jsTransformer?: Level2JsTransformer;

  // Level 3: Custom Function (풀코드)
  customFunction?: Level3CustomFunction;

  // 공통
  inputDataTable?: string;
  outputDataTable?: string;
  enabled: boolean;

  created_at?: string;
  updated_at?: string;
}

export type TransformLevel =
  | "level1_mapping" // 노코드: 필드 매핑만
  | "level2_transformer" // 로우코드: 간단한 JS
  | "level3_custom"; // 풀코드: TypeScript + async

// Level 1: 노코드 필드 매핑
export interface Level1ResponseMapping {
  dataPath: string;
  fieldMappings: TransformFieldMapping[];
}

export interface TransformFieldMapping {
  sourceKey: string;
  targetKey: string;
  transform?: FieldTransformType;
  defaultValue?: unknown;
}

// Level 2: 로우코드 JavaScript
export interface Level2JsTransformer {
  code: string; // return data.map(...)
  // 자동 주입: data (입력), context (컨텍스트)
}

// Level 3: 풀코드 TypeScript
export interface Level3CustomFunction {
  code: string; // 전체 함수 코드
  functionName: string; // export된 함수명
  dependencies?: string[]; // ["lodash", "dayjs"]
}

// Transformer 실행 컨텍스트
export interface TransformContext {
  dataTables: Record<string, unknown[]>;
  variables: Record<string, unknown>;
  api: TransformApiContext;
  utils: TransformUtilsContext;
}

export interface TransformApiContext {
  fetch: (url: string, options?: RequestInit) => Promise<unknown>;
}

export interface TransformUtilsContext {
  formatDate: (date: string | Date, format: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  parseJSON: (str: string) => unknown;
  get: (obj: unknown, path: string, defaultValue?: unknown) => unknown;
}
```

---

## 6. Zustand Store

```typescript
// src/builder/stores/data.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DataTable,
  ApiEndpoint,
  Variable,
  Transformer, // NEW
  TransformContext, // NEW
  TransformLevel, // NEW
} from "../../types/builder/data.types";

interface DataState {
  // Collections
  dataTables: DataTable[];
  apiEndpoints: ApiEndpoint[];
  variables: Variable[];
  transformers: Transformer[]; // NEW: 3단계 변환기

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

  // Actions - Transformer (NEW)
  addTransformer: (transformer: Transformer) => void;
  updateTransformer: (id: string, updates: Partial<Transformer>) => void;
  deleteTransformer: (id: string) => void;
  executeTransformer: (id: string, inputData: unknown[]) => Promise<unknown[]>;

  // Actions - Runtime
  setRuntimeData: (
    dataTableName: string,
    data: Record<string, unknown>[]
  ) => void;
  clearRuntimeData: (dataTableName: string) => void;

  // Actions - API Execution (with Transformer integration)
  executeApi: (
    endpointId: string,
    params?: Record<string, unknown>
  ) => Promise<void>;

  // Getters
  getDataTableData: (name: string) => Record<string, unknown>[];
  getVariableValue: (name: string) => unknown;
  getTransformContext: () => TransformContext; // NEW
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      dataTables: [],
      apiEndpoints: [],
      variables: [],
      transformers: [], // NEW
      runtimeData: new Map(),
      loadingApis: new Set(),

      // DataTable Actions
      addDataTable: (dataTable) => {
        set((state) => ({
          dataTables: [...state.dataTables, dataTable],
        }));
      },

      updateDataTable: (id, updates) => {
        set((state) => ({
          dataTables: state.dataTables.map((dt) =>
            dt.id === id
              ? { ...dt, ...updates, updated_at: new Date().toISOString() }
              : dt
          ),
        }));
      },

      deleteDataTable: (id) => {
        set((state) => ({
          dataTables: state.dataTables.filter((dt) => dt.id !== id),
        }));
      },

      // API Endpoint Actions
      addApiEndpoint: (endpoint) => {
        set((state) => ({
          apiEndpoints: [...state.apiEndpoints, endpoint],
        }));
      },

      updateApiEndpoint: (id, updates) => {
        set((state) => ({
          apiEndpoints: state.apiEndpoints.map((ep) =>
            ep.id === id
              ? { ...ep, ...updates, updated_at: new Date().toISOString() }
              : ep
          ),
        }));
      },

      deleteApiEndpoint: (id) => {
        set((state) => ({
          apiEndpoints: state.apiEndpoints.filter((ep) => ep.id !== id),
        }));
      },

      // Variable Actions
      addVariable: (variable) => {
        set((state) => ({
          variables: [...state.variables, variable],
        }));
      },

      updateVariable: (id, updates) => {
        set((state) => ({
          variables: state.variables.map((v) =>
            v.id === id
              ? { ...v, ...updates, updated_at: new Date().toISOString() }
              : v
          ),
        }));
      },

      deleteVariable: (id) => {
        set((state) => ({
          variables: state.variables.filter((v) => v.id !== id),
        }));
      },

      setVariableValue: (name, value) => {
        const variable = get().variables.find((v) => v.name === name);
        if (variable) {
          set((state) => ({
            variables: state.variables.map((v) =>
              v.name === name ? { ...v, defaultValue: value } : v
            ),
          }));
        }
      },

      // ============================================================
      // NEW: Transformer Actions (3단계 변환)
      // ============================================================

      addTransformer: (transformer) => {
        set((state) => ({
          transformers: [...state.transformers, transformer],
        }));
      },

      updateTransformer: (id, updates) => {
        set((state) => ({
          transformers: state.transformers.map((t) =>
            t.id === id
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTransformer: (id) => {
        set((state) => ({
          transformers: state.transformers.filter((t) => t.id !== id),
        }));
      },

      executeTransformer: async (id, inputData) => {
        const transformer = get().transformers.find((t) => t.id === id);
        if (!transformer || !transformer.enabled) {
          return inputData;
        }

        const context = get().getTransformContext();

        switch (transformer.level) {
          case "level1_mapping": {
            // Level 1: 노코드 Response Mapping
            const { dataPath, fieldMappings } =
              transformer.responseMapping || {};

            let data = inputData;

            // Extract data from path
            if (dataPath) {
              const paths = dataPath.split(".");
              for (const path of paths) {
                data = (data as Record<string, unknown>)?.[path] as unknown[];
              }
            }

            // Apply field mappings
            if (Array.isArray(data) && fieldMappings?.length) {
              data = data.map((item: Record<string, unknown>) => {
                const mapped: Record<string, unknown> = {};
                fieldMappings.forEach((mapping) => {
                  const value = item[mapping.sourceKey];
                  mapped[mapping.targetKey] = applyFieldTransform(
                    value,
                    mapping.transform
                  );
                });
                return mapped;
              });
            }

            return data as unknown[];
          }

          case "level2_transformer": {
            // Level 2: 로우코드 JavaScript
            const { code } = transformer.jsTransformer || {};
            if (!code) return inputData;

            try {
              // 안전한 eval 대체 (new Function 사용)
              const fn = new Function("data", "context", code);
              return fn(inputData, context);
            } catch (error) {
              console.error("Transformer execution error:", error);
              return inputData;
            }
          }

          case "level3_custom": {
            // Level 3: 풀코드 TypeScript
            // 실제 구현 시 별도 모듈 로더 필요
            const { code, functionName } = transformer.customFunction || {};
            if (!code || !functionName) return inputData;

            try {
              // TODO: 별도의 샌드박스 환경에서 실행
              // 프로덕션에서는 Web Worker 또는 iframe 샌드박스 사용
              const fn = new Function(
                "data",
                "context",
                `
                ${code}
                return ${functionName}(data, context);
              `
              );
              return await fn(inputData, context);
            } catch (error) {
              console.error("Custom function execution error:", error);
              return inputData;
            }
          }

          default:
            return inputData;
        }
      },

      getTransformContext: () => ({
        dataTables: Object.fromEntries(
          get().dataTables.map((dt) => [
            dt.name,
            get().getDataTableData(dt.name),
          ])
        ),
        variables: Object.fromEntries(
          get().variables.map((v) => [v.name, v.defaultValue])
        ),
        api: {
          fetch: async (url, options) => {
            const response = await fetch(url, options);
            return response.json();
          },
        },
        utils: {
          formatDate: (date, format) => {
            // 간단한 날짜 포맷팅 (dayjs 사용 권장)
            return new Date(date).toLocaleDateString();
          },
          formatCurrency: (amount, currency = "USD") => {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
            }).format(amount);
          },
          parseJSON: (str) => JSON.parse(str),
          get: (obj, path, defaultValue) => {
            const keys = path.split(".");
            let result: unknown = obj;
            for (const key of keys) {
              result = (result as Record<string, unknown>)?.[key];
            }
            return result ?? defaultValue;
          },
        },
      }),

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
          loadingApis: new Set([...state.loadingApis, endpointId]),
        }));

        try {
          // Build URL with path parameters
          let url = `${endpoint.baseUrl}${endpoint.path}`;

          // Replace path variables
          url = url.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            return String(params[key] ?? get().getVariableValue(key) ?? "");
          });

          // Build query string
          const queryParams = new URLSearchParams();
          endpoint.queryParams.forEach((param) => {
            let value = param.value;
            value = value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
              return String(params[key] ?? get().getVariableValue(key) ?? "");
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
                return String(params[key] ?? get().getVariableValue(key) ?? "");
              });
              headers[header.key] = value;
            }
          });

          // Build body
          let body: string | undefined;
          if (endpoint.bodyType === "json" && endpoint.bodyTemplate) {
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
            const paths = endpoint.responseMapping.dataPath.split(".");
            for (const path of paths) {
              data = data?.[path];
            }
          }

          // Apply field mappings
          if (
            Array.isArray(data) &&
            endpoint.responseMapping.fieldMappings?.length
          ) {
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
            get().setRuntimeData(
              endpoint.targetDataTable,
              Array.isArray(data) ? data : [data]
            );
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
      name: "xstudio-data-store",
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
    endpointId: string; // API Endpoint ID
    params?: Record<string, unknown>; // Override parameters

    // 성공/실패 핸들링 (세분화)
    onSuccess?: string; // 다음 Action ID (2xx)
    onError?: string; // 일반 에러 시 Action ID (fallback)

    // ✅ NEW: 에러 코드별 세분화 핸들링
    errorHandlers?: {
      on400?: string; // 파라미터 검증 실패 (Bad Request)
      on401?: string; // 인증 실패 (Unauthorized)
      on403?: string; // 권한 없음 (Forbidden)
      on404?: string; // 리소스 없음 (Not Found)
      on422?: string; // 변환/바인딩 실패 (Unprocessable Entity)
      on429?: string; // 요청 제한 (Rate Limit)
      on5xx?: string; // 서버 에러 (500, 502, 503, 504)
      onNetwork?: string; // 네트워크 에러 (오프라인, 타임아웃)
    };
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
    apiEndpointId?: string; // Optional: specific API to call
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
// src/canvas/hooks/useDataSource.ts

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

| Task               | File                              | Priority |
| ------------------ | --------------------------------- | -------- |
| Type definitions   | `src/types/builder/data.types.ts` | P0       |
| Database migration | `supabase/migrations/`            | P0       |
| IndexedDB schema   | `src/lib/db/indexedDB/adapter.ts` | P0       |
| Zustand store      | `src/builder/stores/data.ts`      | P0       |

### Phase 2: DataTable UI - 1주

| Task                 | File                                          | Priority |
| -------------------- | --------------------------------------------- | -------- |
| Data Panel component | `src/builder/panels/data/DataPanel.tsx`       | P1       |
| DataTable list       | `src/builder/panels/data/DataTableList.tsx`   | P1       |
| DataTable editor     | `src/builder/panels/data/DataTableEditor.tsx` | P1       |
| Schema editor        | `src/builder/panels/data/SchemaEditor.tsx`    | P1       |
| Mock data editor     | `src/builder/panels/data/MockDataEditor.tsx`  | P1       |

### Phase 3: API Endpoint UI - 1주

| Task                 | File                                                | Priority |
| -------------------- | --------------------------------------------------- | -------- |
| API Endpoint list    | `src/builder/panels/data/ApiEndpointList.tsx`       | P1       |
| API Endpoint editor  | `src/builder/panels/data/ApiEndpointEditor.tsx`     | P1       |
| Request builder      | `src/builder/panels/data/RequestBuilder.tsx`        | P1       |
| Response mapping UI  | `src/builder/panels/data/ResponseMappingEditor.tsx` | P1       |
| Test request feature | `src/builder/panels/data/ApiTester.tsx`             | P2       |

### Phase 4: Variables UI - 0.5주

| Task            | File                                         | Priority |
| --------------- | -------------------------------------------- | -------- |
| Variables list  | `src/builder/panels/data/VariablesList.tsx`  | P1       |
| Variable editor | `src/builder/panels/data/VariableEditor.tsx` | P1       |

### Phase 5: Integration - 1주

| Task                        | File                                         | Priority |
| --------------------------- | -------------------------------------------- | -------- |
| DataSource hook             | `src/canvas/hooks/useDataSource.ts` | P1       |
| Collection renderers update | `src/canvas/renderers/`             | P1       |
| Event System actions        | `src/builder/events/actions/`      | P1       |
| Property Editor binding     | `src/builder/panels/properties/`          | P2       |

### Phase 6: Testing & Polish - 0.5주

| Task                | Priority |
| ------------------- | -------- |
| Unit tests          | P2       |
| E2E tests           | P2       |
| Documentation       | P2       |
| MOCK_DATA migration | P2       |

### ⚠️ Level 3 Transformer 점진적 출시 전략

**보안 리스크로 인해 Level 3 (Custom Function)은 Phase 2 샌드박스 완료 후 활성화합니다.**

```
┌─────────────────────────────────────────────────────────────┐
│              Transformer Level 출시 로드맵                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1 (기본 기능)                                         │
│  ────────────────────────────────────────────────────────── │
│  ✅ Level 1: Response Mapping (노코드)        → 즉시 사용   │
│  ✅ Level 2: JS Transformer (로우코드)        → 즉시 사용   │
│  ⛔ Level 3: Custom Function (풀코드)         → 비활성화    │
│                                                              │
│  Phase 2 (보안 샌드박스 완료 후)                             │
│  ────────────────────────────────────────────────────────── │
│  ✅ Level 3: Custom Function                  → 활성화      │
│     ├─ Web Worker/iframe 샌드박스 격리                       │
│     ├─ 실행 시간 제한 (30초)                                 │
│     ├─ 메모리 제한 (100MB)                                   │
│     ├─ 의존성 화이트리스트 (lodash, dayjs, zod)             │
│     └─ 감사 로그 기록                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UI 표시 (Phase 1):**

```tsx
// TransformerEditor.tsx
<RadioGroup value={level} onChange={setLevel}>
  <Radio value="level1_mapping">Level 1: Response Mapping (노코드)</Radio>
  <Radio value="level2_transformer">Level 2: JS Transformer (로우코드)</Radio>
  <Radio value="level3_custom" isDisabled>
    Level 3: Custom Function (풀코드)
    <span className="coming-soon">🔒 Coming Soon - 보안 샌드박스 준비 중</span>
  </Radio>
</RadioGroup>
```

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

### 12.3 Server-side Action (NEW)

현재 설계는 클라이언트 사이드 중심이라 **API Key 노출 위험**이 있습니다. Retool, Bubble처럼 비밀키 보호가 필요한 API 호출을 위해 Server-side Action이 필요합니다.

#### 문제점

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 클라이언트 사이드 호출                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser (Preview iframe)                                   │
│     ↓                                                        │
│  API Call: GET https://api.stripe.com/v1/charges            │
│  Header: Authorization: Bearer sk_live_xxxxx  ← ⚠️ 노출!    │
│     ↓                                                        │
│  External API                                                │
│                                                              │
│  문제:                                                       │
│  - API 키가 브라우저 DevTools에서 보임                       │
│  - 네트워크 탭에서 헤더 확인 가능                            │
│  - 악의적 사용자가 키를 탈취할 수 있음                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 해결 방안: Server-side Action

```
┌─────────────────────────────────────────────────────────────┐
│                    Server-side Action 아키텍처               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser (Preview iframe)                                   │
│     ↓                                                        │
│  API Call: POST /api/proxy/stripe-charges                   │
│  Header: Authorization: Bearer <user_session_token>         │
│     ↓                                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Supabase Edge Function (Server)                       │  │
│  │                                                        │  │
│  │  1. 세션 토큰 검증                                      │  │
│  │  2. 프로젝트 권한 확인                                  │  │
│  │  3. Vault에서 API 키 조회 (sk_live_xxxxx)              │  │
│  │  4. 실제 외부 API 호출                                  │  │
│  │  5. 응답 반환 (민감 정보 필터링)                        │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│     ↓                                                        │
│  External API (Stripe, OpenAI, etc.)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### ApiEndpoint 타입 확장

```typescript
interface ApiEndpoint {
  // ... 기존 필드

  // ✅ NEW: 실행 환경 설정
  executionMode: "client" | "server";

  // server 모드 전용
  serverConfig?: {
    // Supabase Edge Function 이름
    edgeFunctionName: string;

    // Vault 시크릿 키 매핑
    secretMappings?: {
      headerKey: string; // "Authorization"
      vaultKey: string; // "stripe_api_key"
      format?: string; // "Bearer {{value}}"
    }[];

    // 응답 필터링 (민감 정보 제거)
    responseFilter?: {
      removeFields?: string[]; // ["customer.email", "card.number"]
      allowFields?: string[]; // 화이트리스트 모드
    };
  };
}
```

#### UI 설정 화면

```
┌─────────────────────────────────────────────────────────────┐
│  🔗 API Endpoint: stripeCharges                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ▼ Execution Mode                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ○ Client-side (브라우저에서 직접 호출)               │   │
│  │   ⚠️ API 키가 노출될 수 있음                         │   │
│  │                                                       │   │
│  │ ● Server-side (Edge Function 통해 호출)              │   │
│  │   ✅ API 키가 서버에서만 사용됨                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ▼ Server Configuration (Server-side 선택 시)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Edge Function: [api-proxy              ▼]            │   │
│  │                                                       │   │
│  │ Secret Mappings:                          [+ Add]    │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ Header: Authorization                          │   │   │
│  │ │ Vault Key: [stripe_api_key        ]            │   │   │
│  │ │ Format: Bearer {{value}}                       │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Supabase Vault 연동

```typescript
// supabase/functions/api-proxy/index.ts

import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. 사용자 세션 검증
  const authHeader = req.headers.get("Authorization");
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader?.replace("Bearer ", "")
  );
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Vault에서 시크릿 조회
  const { data: secret } = await supabase.rpc("vault_get_secret", {
    secret_name: "stripe_api_key",
  });

  // 3. 실제 API 호출
  const body = await req.json();
  const response = await fetch(body.url, {
    method: body.method,
    headers: {
      ...body.headers,
      Authorization: `Bearer ${secret.decrypted_secret}`,
    },
    body: body.body ? JSON.stringify(body.body) : undefined,
  });

  // 4. 응답 반환 (민감 정보 필터링 적용)
  const data = await response.json();
  return new Response(JSON.stringify(filterSensitiveData(data)), {
    headers: { "Content-Type": "application/json" },
  });
});
```

#### 구현 우선순위

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| executionMode 필드 추가 | **P1** | client/server 선택 |
| Supabase Edge Function 템플릿 | **P1** | api-proxy 기본 구현 |
| Vault 시크릿 연동 | **P1** | 비밀키 안전 저장 |
| UI 설정 화면 | **P2** | Server Configuration |
| 응답 필터링 | **P2** | 민감 정보 제거 |

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
  interval?: number; // polling interval
}
```

### 13.3 Data Transformers (v2)

```typescript
interface DataTransformer {
  id: string;
  name: string;
  inputDataTable: string;
  outputDataTable: string;
  transformFn: string; // JavaScript function
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

### Phase 1: 기본 기능 (P0)

**DataTable:**
- [ ] DataTable CRUD 기능 동작
- [ ] Schema Editor UI 완성
- [ ] Mock Data Editor UI 완성
- [ ] useMockData 토글로 Mock/API 전환

**API Endpoint:**
- [ ] API Endpoint 설정 UI 완성
- [ ] Request Builder (Method, URL, Headers, Query, Body)
- [ ] Response Mapping (dataPath, fieldMappings)
- [ ] Test Request 기능

**Variables:**
- [ ] Variables CRUD 기능 동작
- [ ] Global/Page scope 지원
- [ ] persist 옵션 (localStorage 저장)

**Integration:**
- [ ] Collection 컴포넌트에서 dataSource 바인딩
- [ ] Event에서 API Call → DataTable 업데이트
- [ ] Visual Picker UI (데이터 소스 선택)
- [ ] 기존 dataBinding 하위 호환

### Phase 1: Transformer (P1)

- [ ] Level 1: Response Mapping (노코드) 동작
- [ ] Level 2: JS Transformer (로우코드) 동작
- [ ] ⛔ Level 3: Custom Function - Phase 2까지 비활성화
- [ ] Transformer Editor UI 완성

### Phase 2: 보안 (P0)

- [ ] Level 2 Web Worker 격리 실행
- [ ] Level 3 iframe sandbox 격리 실행
- [ ] 실행 시간/메모리 제한 적용
- [ ] 의존성 화이트리스트 적용
- [ ] 비밀값(isSecret) 마스킹 처리

### Phase 2: Server-side Action (P1)

- [ ] ApiEndpoint.executionMode (client/server) 필드
- [ ] Supabase Edge Function 템플릿 (api-proxy)
- [ ] Vault 시크릿 연동
- [ ] Server Configuration UI

### Phase 3: 신뢰성 (P1)

- [ ] 재시도/백오프 정책 (retryPolicy)
- [ ] 캐싱 정책 (cachePolicy)
- [ ] 서킷브레이커 (circuitBreaker)
- [ ] 에러 코드별 핸들링 (400/401/403/404/422/429/5xx)

### Phase 4: 데이터 품질 (P1)

- [ ] Zod 기반 스키마 검증
- [ ] 검증 시점 설정 (apiResponse, beforeTransform 등)
- [ ] 검증 실패 시 동작 (throw/warn/coerce/fallback)

### Phase 5: 관측성 (P2)

- [ ] ExecutionLog 시스템
- [ ] 실행 로그 UI (Data Panel 내)
- [ ] 메트릭 수집 (성공률, 평균 응답 시간)

### Phase 6: 버전 관리 (P2)

- [ ] 스키마 버전 관리 (VersionedEntity)
- [ ] 변경 이력 (changelog)
- [ ] 마이그레이션 정책 (MigrationPolicy)

---

## 16. 리스크 및 보완 계획 (v2.1 로드맵)

### 16.0 재점검 코멘트 (v2.1 세부 보완 제안)

- **샌드박스 실행 보증 강화:** 리소스 제한만으로는 부족하므로, (1) 의존성 해시 화이트리스트 및 NPM install 금지, (2) 빌드된 번들에 대한 무결성 체크섬 검증, (3) 무한 루프 탐지를 위한 step counter/`Worker.terminate()` 강제 종료 절차를 명시하면 운영 리스크를 줄일 수 있습니다.
- **공격 표면 축소:** `context` 객체로만 입출력을 허용하고, `globalThis`, `eval`, `Function` 재정의 등 위험한 전역 접근을 프리플라이트 시점에 static linting으로 차단하는 규칙(ESLint 플러그인 수준)과 런타임 gate(Proxy 기반 접근 탐지)를 병행하는 것이 안전합니다.
- **재시도·백오프 정합성:** 현재 재시도 설계에 *idempotency*와 _jitter_ 규칙이 없으므로, `retryPolicy`에 `jitter: 'full' | 'equal'`, `idempotent: boolean`을 추가하고, 비-idempotent 요청은 재시도 제한/사용자 확인이 필요함을 명시하세요. 또한 취소 가능한 요청(`AbortController`)과 in-flight dedupe(`cacheKey` 기준) 플래그를 함께 두면 중복 실행을 줄일 수 있습니다.
- **스키마 검증 파이프라인 명확화:** Zod 기반 검증을 도입했다면, (1) 스키마 버전별 캐싱(파싱 비용 절감), (2) DataField → Zod 변환 실패 시 로그/알람 경로, (3) `coerce` 동작 시 타입 변환 규칙(숫자/날짜)과 손실 위험에 대한 정책을 명문화하는 것이 필요합니다.
- **관측성 연결:** 샌드박스/재시도/검증 결과를 ExecutionLog에 구조화해 저장(샌드박스 종료 사유, 재시도 횟수, 검증 실패 필드 목록)하면 운영자가 문제를 재현 없이 파악할 수 있습니다.

### 16.1 보안 리스크 (P0 - 즉시 해결 필요)

#### Transformer 샌드박스 설계

```
현재 문제:
- Level 2/3 Transformer가 `new Function`으로 실행
- XSS, 권한 상승, 무한 루프 등 보안 취약점

해결 계획:
┌─────────────────────────────────────────────────────────────┐
│                 Transformer Sandbox Architecture             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Level 2 (로우코드)                                          │
│  ────────────────────────────────────────────────────────── │
│  ├─ Web Worker 격리 실행                                     │
│  ├─ 실행 시간 제한: 5초                                       │
│  ├─ 메모리 제한: 50MB                                         │
│  ├─ 네트워크 접근: 차단                                       │
│  └─ 허용 API: Array, Object, String, Math, Date만            │
│                                                              │
│  Level 3 (풀코드)                                            │
│  ────────────────────────────────────────────────────────── │
│  ├─ iframe sandbox 격리                                      │
│  ├─ 실행 시간 제한: 30초                                      │
│  ├─ 메모리 제한: 100MB                                        │
│  ├─ 네트워크 화이트리스트: context.api.fetch만               │
│  ├─ 의존성 화이트리스트: lodash, dayjs, zod만                │
│  └─ 감사 로그: 실행 시작/종료/오류 기록                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// 샌드박스 실행 인터페이스 (Phase 2에서 구현)
interface SandboxConfig {
  timeoutMs: number; // 실행 시간 제한
  memoryLimitMb: number; // 메모리 제한
  allowedGlobals: string[]; // 허용된 전역 객체
  networkWhitelist: string[]; // 허용된 도메인
  dependencyWhitelist: string[]; // 허용된 라이브러리
  blockedTokens?: string[]; // 금지된 글로벌 식별자 (window, document 등)
}

interface SandboxResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
    type: "timeout" | "memory" | "syntax" | "runtime";
  };
  metrics: {
    executionTimeMs: number;
    memoryUsedMb: number;
  };
}
```

**추가 보완 체크리스트 (샌드박스 실행 전/후):**

- 사전 정적 분석으로 `import`, `require`, `while(true)` 등 블랙리스트 토큰 탐지 → 실패 시 실행 거부.
- `allowedGlobals` 외 모든 전역 객체를 `Proxy`로 감시, 접근 시 오류/로그 남기기.
- Web Worker/iframe 종료 시점에 메모리 스냅샷을 찍어 `memoryUsedMb` 이상 누수 감지 → 반복 초과 시 엔진 재시작.
- 샌드박스 버전·해시를 Execution Log에 기록하여 동일 코드 재현성 확보.

// ✅ 리뷰 코멘트 (보완 필요)
// - 샌드박스 초기화 시 dependencyWhitelist에 버전 고정(semver range 금지) 및 무결성 해시 체크 필요
// - Web Worker/iframe 종료 후에도 dangling promise 방지용 abort hook 필요
// - memoryLimit 초과 측정은 브라우저별 지원 여부가 달라, fallback(데이터 사이즈 상한) 정의 필요
// - sandbox 내부 로그는 ExecutionLog에 적재하되, isSecret 변수는 반드시 마스킹 처리해야 함
// - transform 컨텍스트에서 route/page 스코프 객체 접근 허용 범위를 명시적으로 정의해야 함

#### API 비밀값 관리

```
현재 문제:
- 헤더에 {{authToken}} 직접 치환
- localStorage에 persist 저장 시 노출 위험

해결 계획:
┌─────────────────────────────────────────────────────────────┐
│                    Secrets Management                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Variable 확장                                               │
│  ────────────────────────────────────────────────────────── │
│  {                                                           │
│    name: "authToken",                                        │
│    type: "string",                                           │
│    isSecret: true,          // NEW: 비밀값 플래그            │
│    persist: false,          // 비밀값은 persist 불가         │
│    storage: "sessionOnly",  // sessionStorage만 허용         │
│    maskInLogs: true,        // 로그에서 마스킹               │
│  }                                                           │
│                                                              │
│  보안 정책                                                   │
│  ────────────────────────────────────────────────────────── │
│  ├─ isSecret=true인 변수는 persist=true 불가                 │
│  ├─ API 테스트 시 비밀값 마스킹 (●●●●●●)                     │
│  ├─ 콘솔/로그에서 자동 마스킹                                │
│  ├─ 프로덕션: Supabase Edge Function 통해 프록시 권장        │
│  └─ 감사 로그: 비밀값 접근 시점 기록                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 16.2 신뢰성 리스크 (P0)

#### API 재시도/백오프 정책

```typescript
// ApiEndpoint 확장
interface ApiEndpoint {
  // ... 기존 필드

  // NEW: 재시도 정책
  retryPolicy?: {
    maxRetries: number; // 최대 재시도 횟수 (기본: 3)
    backoffType: "exponential" | "linear" | "fixed";
    initialDelayMs: number; // 초기 대기 시간 (기본: 1000)
    maxDelayMs: number; // 최대 대기 시간 (기본: 30000)
    retryableStatuses: number[]; // 재시도할 HTTP 상태 (기본: [408, 429, 500, 502, 503, 504])
  };

  // NEW: 캐시 정책
  cachePolicy?: {
    enabled: boolean;
    ttlSeconds: number; // 캐시 유효 시간
    staleWhileRevalidate: boolean; // 백그라운드 갱신
    cacheKey?: string; // 커스텀 캐시 키 (기본: URL + params)
  };

  // NEW: 서킷브레이커
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number; // 연속 실패 횟수 (기본: 5)
    resetTimeoutMs: number; // 리셋 대기 시간 (기본: 30000)
  };
}
```

```
API 호출 흐름 (신뢰성 강화)
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Request                                                     │
│     ↓                                                        │
│  ┌─────────────┐   열림    ┌─────────────┐                  │
│  │서킷브레이커 │ ────────→ │ 즉시 실패    │                  │
│  │   체크      │           │ (fallback)  │                  │
│  └─────────────┘           └─────────────┘                  │
│     ↓ 닫힘                                                   │
│  ┌─────────────┐   히트    ┌─────────────┐                  │
│  │캐시 체크    │ ────────→ │ 캐시 반환    │                  │
│  └─────────────┘           └─────────────┘                  │
│     ↓ 미스                                                   │
│  ┌─────────────┐                                            │
│  │ API 호출    │ ←──────── 재시도 (지수 백오프)             │
│  └─────────────┘                                            │
│     ↓ 성공                                                   │
│  ┌─────────────┐                                            │
│  │ 캐시 저장   │                                            │
│  │ 응답 반환   │                                            │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**재시도/백오프 설계 보완:**

- 기본값: `maxRetries=3`, `backoffType='exponential'` + **풀 지터**(`initialDelayMs=200`, `maxDelayMs=5000`).
- **Idempotency-Key 자동 주입**: `method`가 `POST|PATCH|PUT`이고 `retryPolicy` 설정 시 `headers['Idempotency-Key']` 생성 옵션 제공.
- **서킷 브레이커 상태 공유**: `circuitBreaker` 상태를 프로젝트 단위 메모리 스토어에 저장하여 동일 엔드포인트를 쓰는 위젯 간 일관성 확보.
- **Fallback 동작**: 재시도/서킷 실패 시 `cachePolicy`가 켜져 있으면 `stale` 데이터 반환, 없으면 DataTable `lastSuccessfulData`를 반환하도록 옵션화.
- **운영 모니터링**: ExecutionLog에 재시도 횟수, 백오프 지연, 서킷 상태 변화를 기록해 SLA 알람 연동.

#### 동시성/경합 처리

```typescript
// DataTable 동시 접근 정책
interface ConcurrencyPolicy {
  // 동일 DataTable에 복수 API 응답 시
  mergeStrategy: "replace" | "merge" | "append" | "queue";

  // Optimistic Update
  optimisticUpdate?: {
    enabled: boolean;
    rollbackOnFailure: boolean;
    conflictResolution: "server-wins" | "client-wins" | "manual";
  };

  // 요청 중복 방지
  deduplication?: {
    enabled: boolean;
    windowMs: number; // 중복 판단 시간 창
  };
}
```

// ✅ 리뷰 코멘트 (보완 필요)
// - mergeStrategy 별 멱등성(idempotency) 요구사항을 표로 정의하면, PATCH/POST 호출 시 위험도를 낮출 수 있음
// - deduplication window를 탭/세션 단위로 공유할지 여부를 명시하고, 로컬 캐시 키 구성식을 추가해야 함
// - optimisticUpdate가 실패했을 때 rollback 전후 데이터 상태를 ExecutionLog에 남기고, UI revert 애니메이션 여부 결정 필요
// - circuitBreaker와의 연계(연속 실패 시 optimisticUpdate 차단 등) 정책을 정의하면 일관성 확보에 도움

---

### 16.3 데이터 품질 리스크 (P1)

#### 스키마 검증 레이어

```typescript
// 런타임 검증 (Zod 기반)
interface SchemaValidation {
  enabled: boolean;

  // 검증 시점
  validateOn: {
    apiResponse: boolean; // API 응답 수신 시
    mockDataLoad: boolean; // Mock 데이터 로드 시
    beforeTransform: boolean; // 변환 전
    afterTransform: boolean; // 변환 후
  };

  // 실패 시 동작
  onValidationError: "throw" | "warn" | "coerce" | "fallback";

  // 스키마에서 Zod 스키마 자동 생성
  // DataField[] → z.object({...})
}

// 검증 결과
interface ValidationResult {
  valid: boolean;
  errors: {
    field: string;
    expected: string;
    received: string;
    message: string;
  }[];
  coercedData?: unknown[]; // onValidationError='coerce' 시
}
```

**스키마 검증 확장 포인트:**

- `DataField`에 `enum`, `minLength`, `maxLength`, `pattern`, `relation`(refTable/refField) 메타데이터를 추가하고 Zod 스키마 생성 시 반영.
- `beforeTransform` 단계에서 **필수 필드 누락·타입 오류**가 발생하고 `onValidationError='fallback'`이면 `mockData`로 대체해 UI 무중단 렌더링.
- **환경별 정책**: dev 기본값 `warn`, prod 기본값 `throw`로 설정하여 조기 탐지와 운영 안전성을 동시에 달성.
- **검증 통계**: ValidationResult를 ExecutionLog에 연계, 필드별 오류율을 메트릭으로 수집해 DataTable 품질 지표에 노출.

---

### 16.4 관측성/디버깅 (P1)

#### 실행 로그 시스템

```typescript
interface ExecutionLog {
  id: string;
  timestamp: string;

  // 실행 유형
  type: "api_call" | "transform" | "binding_resolve";

  // 상태
  status: "pending" | "success" | "failure" | "timeout";

  // 상세 정보
  details: {
    // API 호출
    endpoint?: string;
    method?: string;
    responseTime?: number;
    statusCode?: number;

    // 변환
    transformerId?: string;
    transformLevel?: TransformLevel;
    inputCount?: number;
    outputCount?: number;

    // 오류
    error?: {
      message: string;
      stack?: string;
    };
  };

  // 메트릭
  metrics: {
    durationMs: number;
    memoryDelta?: number;
  };
}
```

```
Data Panel 실행 로그 UI
┌─────────────────────────────────────────────────────────────┐
│  📊 Execution Logs                           [Clear] [Export]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ 10:23:45  API: getUsers          200   142ms            │
│  ✅ 10:23:45  Transform: userMapper  L1    12ms   50→50     │
│  ⚠️ 10:23:46  API: getProducts       429   Retry 1/3...     │
│  ✅ 10:23:48  API: getProducts       200   892ms            │
│  ❌ 10:23:49  Transform: priceCalc   L2    Error: NaN       │
│     └─ Stack: priceCalc.js:12 - item.price is undefined     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Last 1h: 45 calls | 42 success | 3 failures | Avg: 234ms   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 16.5 버전 관리/마이그레이션 (P1)

```typescript
// 스키마 버전 관리
interface VersionedEntity {
  version: number; // 스키마 버전
  createdAt: string;
  updatedAt: string;
  updatedBy?: string; // 수정자 ID

  // 변경 이력 (최근 10개)
  changelog?: {
    version: number;
    timestamp: string;
    changes: string[]; // "Added field: email", "Removed field: legacy_id"
    author?: string;
  }[];
}

// 마이그레이션 정책
interface MigrationPolicy {
  // 스키마 변경 시
  onSchemaChange: "auto-migrate" | "manual" | "reject";

  // 필드 추가
  newFieldDefault: "null" | "schema-default" | "prompt";

  // 필드 삭제
  removedFieldAction: "drop" | "archive" | "reject";

  // 타입 변경
  typeChangeAction: "coerce" | "reject";
}
```

---

### 16.6 구현 우선순위 (권장)

| Phase       | 항목                        | 예상 기간 | 의존성    |
| ----------- | --------------------------- | --------- | --------- |
| **Phase 1** | 기본 기능 (현재 설계)       | 5주       | -         |
| **Phase 2** | 보안 샌드박스 + 비밀값 관리 | 2주       | Phase 1   |
| **Phase 3** | 재시도/캐싱/서킷브레이커    | 1.5주     | Phase 1   |
| **Phase 4** | 스키마 검증 (Zod 통합)      | 1주       | Phase 1   |
| **Phase 5** | 실행 로그 UI                | 1주       | Phase 1   |
| **Phase 6** | 버전 관리/마이그레이션      | 1.5주     | Phase 4   |
| **Phase 7** | 테스트 가이드/템플릿        | 1주       | Phase 1-4 |

**총 예상: 13주 (기본 5주 + 보완 8주)**

---

## 17. 참고 자료
