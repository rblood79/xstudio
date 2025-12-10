# XStudio IndexedDB Schema Documentation

> **Version**: 7 (2025-12)
> **Last Updated**: 2025-12-10
> **Database Name**: `xstudio`

## Overview

XStudio는 브라우저의 IndexedDB를 사용하여 모든 프로젝트 데이터를 로컬에 저장합니다. 이 문서는 데이터베이스 스키마, 테이블 구조, 관계 및 버전 관리에 대해 설명합니다.

### Key Features

- **오프라인 지원**: 네트워크 없이도 완전한 기능 사용 가능
- **빠른 저장**: 1-5ms의 빠른 저장 속도
- **LRU 캐시**: 자주 접근하는 데이터의 메모리 캐싱
- **Supabase 호환**: 동일한 인터페이스로 클라우드 동기화 지원

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Zustand Store│  │   Services   │  │   Factories  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Adapter Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DatabaseAdapter Interface                     │   │
│  │  - projects, pages, elements, layouts                     │   │
│  │  - design_tokens, design_themes                           │   │
│  │  - data_tables, api_endpoints, variables, transformers   │   │
│  │  - history, metadata                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IndexedDB Storage                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Database: "xstudio" (Version 7)                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│  │  │ projects │ │  pages   │ │ elements │ │ layouts  │      │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│  │  │ tokens   │ │ themes   │ │ history  │ │ metadata │      │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │ │
│  │  ┌───────────┐ ┌─────────────┐ ┌───────────┐ ┌────────────┐│ │
│  │  │data_tables│ │api_endpoints│ │ variables │ │transformers││ │
│  │  └───────────┘ └─────────────┘ └───────────┘ └────────────┘│ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Object Stores Summary

| Store Name | Key Path | Indexes | Description |
|------------|----------|---------|-------------|
| **projects** | `id` | — | 사용자 프로젝트 |
| **pages** | `id` | `project_id`, `order_num` | 프로젝트 내 페이지 |
| **elements** | `id` | `page_id`, `parent_id`, `order_num`, `layout_id` | UI 요소 트리 |
| **layouts** | `id` | `project_id`, `name`, `order_num`, `slug` | Layout/Slot 시스템 |
| **design_tokens** | `id` | `project_id`, `theme_id` | 디자인 토큰 |
| **design_themes** | `id` | `project_id`, `status` | 테마 설정 |
| **history** | `id` | `page_id`, `created_at` | Undo/Redo 히스토리 |
| **metadata** | `project_id` | — | 동기화 메타데이터 |
| **data_tables** | `id` | `project_id`, `name` | 데이터 테이블 (v7) |
| **api_endpoints** | `id` | `project_id`, `name`, `targetDataTable` | API 설정 (v7) |
| **variables** | `id` | `project_id`, `name`, `scope`, `page_id` | 전역/페이지 변수 (v7) |
| **transformers** | `id` | `project_id`, `name`, `level`, `inputDataTable`, `outputDataTable` | 데이터 변환 (v7) |

---

## Table Schemas

### 1. Projects

프로젝트의 기본 정보를 저장합니다.

```typescript
interface Project {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 프로젝트 이름
  created_by?: string;           // 생성자 ID
  domain?: string;               // 배포 도메인
  created_at?: string;           // 생성 시간 (ISO 8601)
  updated_at?: string;           // 수정 시간 (ISO 8601)
}
```

**Indexes**: None (Full scan by `id`)

**Example**:
```json
{
  "id": "proj_abc123",
  "name": "My Website",
  "created_by": "user_123",
  "domain": "mysite.xstudio.app",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-12-10T14:20:00Z"
}
```

---

### 2. Pages

프로젝트 내 페이지 정보를 저장합니다.

```typescript
interface Page {
  id: string;                    // Primary Key (UUID)
  project_id: string;            // FK → projects.id
  title: string;                 // 페이지 제목
  slug: string;                  // URL 경로 (예: "/about")
  parent_id?: string | null;     // 페이지 계층 구조 (FK → pages.id)
  order_num?: number;            // 정렬 순서
  layout_id?: string | null;     // FK → layouts.id (적용할 레이아웃)
  created_at?: string;           // 생성 시간
  updated_at?: string;           // 수정 시간
}
```

**Indexes**:
- `project_id`: 프로젝트별 페이지 조회
- `order_num`: 정렬 순서 조회

**Constraints**:
- `layout_id`가 설정되면 해당 Layout이 적용됨
- `parent_id`로 페이지 계층 구조 표현 가능

**Example**:
```json
{
  "id": "page_home_001",
  "project_id": "proj_abc123",
  "title": "Home",
  "slug": "/",
  "parent_id": null,
  "order_num": 1,
  "layout_id": "layout_main_001",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 3. Elements (Core Table)

UI 요소의 트리 구조를 저장합니다. 가장 핵심적인 테이블입니다.

```typescript
interface Element {
  id: string;                    // Primary Key (UUID)
  tag: string;                   // 컴포넌트 타입 ('Button', 'TextField', 'Div', etc.)
  props: ComponentElementProps;  // 컴포넌트 속성 (JSON)
  customId?: string;             // 사용자 정의 ID (이벤트, CSS 선택자용)

  // 트리 구조
  parent_id?: string | null;     // FK → elements.id (부모 요소)
  order_num?: number;            // 형제 요소 간 정렬 순서

  // Page/Layout 소속 (상호 배타적)
  page_id?: string | null;       // FK → pages.id (Page 요소인 경우)
  layout_id?: string | null;     // FK → layouts.id (Layout 요소인 경우)

  // Layout/Slot System
  slot_name?: string | null;     // Slot 이름 (Page element가 들어갈 Slot)

  // Data Binding
  dataBinding?: DataBinding;     // Collection 컴포넌트 데이터 바인딩

  // Event Handlers
  events?: unknown[];            // 이벤트 핸들러 목록

  // Metadata
  deleted?: boolean;             // 소프트 삭제 플래그
  created_at?: string;
  updated_at?: string;
}

// DataBinding 타입
interface DataBinding {
  type: 'collection' | 'value' | 'field';
  source: 'supabase' | 'api' | 'state' | 'static' | 'parent';
  config: Record<string, unknown>;
}
```

**Indexes**:
- `page_id`: 페이지별 요소 조회
- `parent_id`: 자식 요소 조회 (트리 구축)
- `order_num`: 렌더링 순서
- `layout_id`: 레이아웃별 요소 조회

**Constraints**:
- `page_id`와 `layout_id`는 상호 배타적 (하나만 설정 가능)
- `slot_name`은 `page_id`가 설정된 요소에서만 유효

**Example (Page Element)**:
```json
{
  "id": "elem_btn_001",
  "tag": "Button",
  "props": {
    "children": "Click me",
    "variant": "primary",
    "size": "md"
  },
  "customId": "submit_button",
  "parent_id": "elem_form_001",
  "page_id": "page_home_001",
  "layout_id": null,
  "order_num": 1,
  "created_at": "2024-01-15T10:35:00Z"
}
```

**Example (Layout Element with Slot)**:
```json
{
  "id": "elem_slot_001",
  "tag": "Slot",
  "props": {
    "name": "content",
    "required": true,
    "description": "Main content area"
  },
  "parent_id": "elem_main_001",
  "page_id": null,
  "layout_id": "layout_main_001",
  "order_num": 2
}
```

---

### 4. Layouts

Layout/Slot 시스템의 레이아웃 정의를 저장합니다.

```typescript
interface Layout {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 레이아웃 이름
  project_id: string;            // FK → projects.id
  description?: string;          // 설명

  // Nested Routes & Slug System
  order_num?: number;            // 정렬 순서
  slug?: string;                 // URL base path (예: "/products")

  // 404 Page Strategy
  notFoundPageId?: string;       // 레이아웃 전용 404 페이지 ID
  inheritNotFound?: boolean;     // 프로젝트 기본 404 상속 여부

  created_at?: string;
  updated_at?: string;
}
```

**Indexes**:
- `project_id`: 프로젝트별 레이아웃 조회
- `name`: 이름으로 조회
- `order_num`: 정렬 순서
- `slug`: URL 매칭

**Example**:
```json
{
  "id": "layout_main_001",
  "name": "Main Layout",
  "project_id": "proj_abc123",
  "description": "Header + Sidebar + Content layout",
  "order_num": 1,
  "slug": "/",
  "inheritNotFound": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 5. Design Tokens

디자인 토큰 (색상, 타이포그래피, 간격 등)을 저장합니다.

```typescript
interface DesignToken {
  id: string;                    // Primary Key (UUID)
  project_id: string;            // FK → projects.id
  theme_id: string;              // FK → design_themes.id
  name: string;                  // 토큰 이름 (예: "color.brand.primary")
  type: TokenType;               // 토큰 타입
  value: TokenValue;             // 토큰 값 (JSON)
  scope: 'raw' | 'semantic';     // Raw 토큰 or Semantic 토큰
  alias_of?: string | null;      // 다른 토큰 참조 (semantic 토큰용)
  css_variable?: string;         // CSS 변수명 (예: "--color-primary")
  created_at?: string;
  updated_at?: string;
}

type TokenType =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'shadow'
  | 'border'
  | 'radius'
  | 'font'
  | 'size'
  | 'motion'
  | 'other';

// TokenValue varies by type
type TokenValue = string | number | {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  lineHeight?: string;
  letterSpacing?: string;
} | {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
};
```

**Indexes**:
- `project_id`: 프로젝트별 토큰 조회
- `theme_id`: 테마별 토큰 조회

**Example**:
```json
{
  "id": "token_color_001",
  "project_id": "proj_abc123",
  "theme_id": "theme_light_001",
  "name": "color.brand.primary",
  "type": "color",
  "value": "#3b82f6",
  "scope": "raw",
  "css_variable": "--color-primary-600",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 6. Design Themes

테마 설정을 저장합니다.

```typescript
interface DesignTheme {
  id: string;                    // Primary Key (UUID)
  project_id: string;            // FK → projects.id
  name: string;                  // 테마 이름 (예: "Light", "Dark")
  status: 'active' | 'draft' | 'archived';
  version: number;               // 버전 번호
  parent_theme_id?: string;      // 부모 테마 ID (상속용)
  supports_dark_mode?: boolean;  // 다크 모드 지원 여부
  created_at: string;
  updated_at: string;
}
```

**Indexes**:
- `project_id`: 프로젝트별 테마 조회
- `status`: 활성 테마 조회

**Example**:
```json
{
  "id": "theme_light_001",
  "project_id": "proj_abc123",
  "name": "Light Theme",
  "status": "active",
  "version": 1,
  "supports_dark_mode": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 7. History

Undo/Redo 히스토리를 저장합니다.

```typescript
interface HistoryEntry {
  id: string;                    // Primary Key (UUID)
  page_id: string;               // FK → pages.id
  type: HistoryType;             // 변경 타입
  element_id: string;            // 주요 대상 요소 ID
  element_ids?: string[];        // 배치 작업시 여러 요소 ID
  data: HistoryData;             // 변경 데이터
  created_at: string;            // 생성 시간
}

type HistoryType =
  | 'add'      // 요소 추가
  | 'update'   // 요소 수정
  | 'remove'   // 요소 삭제
  | 'move'     // 요소 이동
  | 'batch'    // 배치 수정
  | 'group'    // 그룹화
  | 'ungroup'; // 그룹 해제

interface HistoryData {
  element?: Element;             // 추가/삭제된 요소
  prevElement?: Element;         // 이전 상태 (수정 시)
  elements?: Element[];          // 배치 추가/삭제
  prevElements?: Element[];      // 배치 이전 상태
  batchUpdates?: Array<{
    elementId: string;
    prevProps: Record<string, unknown>;
    newProps: Record<string, unknown>;
  }>;
  groupData?: {
    groupId: string;
    childIds: string[];
  };
}
```

**Indexes**:
- `page_id`: 페이지별 히스토리 조회
- `created_at`: 시간순 정렬

**Example**:
```json
{
  "id": "history_001",
  "page_id": "page_home_001",
  "type": "update",
  "element_id": "elem_btn_001",
  "data": {
    "prevElement": { "props": { "variant": "default" } },
    "element": { "props": { "variant": "primary" } }
  },
  "created_at": "2024-01-15T10:40:00Z"
}
```

---

### 8. Metadata

동기화 상태 메타데이터를 저장합니다.

```typescript
interface SyncMetadata {
  project_id: string;            // Primary Key
  sync_enabled: boolean;         // 클라우드 동기화 활성화 여부
  last_sync_at: string | null;   // 마지막 동기화 시간
  local_updated_at: string;      // 로컬 마지막 수정 시간
  cloud_updated_at: string | null; // 클라우드 마지막 수정 시간
  sync_status: SyncStatus;       // 동기화 상태
}

type SyncStatus =
  | 'local-only'  // 로컬에만 존재
  | 'synced'      // 동기화됨
  | 'conflict'    // 충돌 발생
  | 'pending';    // 동기화 대기 중
```

**Example**:
```json
{
  "project_id": "proj_abc123",
  "sync_enabled": true,
  "last_sync_at": "2024-01-15T10:45:00Z",
  "local_updated_at": "2024-01-15T10:50:00Z",
  "cloud_updated_at": "2024-01-15T10:45:00Z",
  "sync_status": "pending"
}
```

---

### 9. Data Tables (v7)

Data Panel 시스템의 데이터 테이블을 저장합니다.

```typescript
interface DataTable {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 테이블 이름 (예: "users", "products")
  project_id: string;            // FK → projects.id

  schema: DataField[];           // 스키마 정의
  mockData: Record<string, unknown>[]; // Mock 데이터 (개발용)
  runtimeData?: Record<string, unknown>[]; // 런타임 데이터 (메모리만)
  useMockData: boolean;          // Mock 데이터 사용 여부

  created_at?: string;
  updated_at?: string;
}

interface DataField {
  key: string;                   // 필드 키
  type: DataFieldType;           // 필드 타입
  label?: string;                // UI 표시 레이블
  required?: boolean;            // 필수 여부
  defaultValue?: unknown;        // 기본값
  children?: DataField[];        // 중첩 스키마 (object/array)
}

type DataFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'image'
  | 'array'
  | 'object';
```

**Indexes**:
- `project_id`: 프로젝트별 데이터 테이블 조회
- `name`: 이름으로 조회

**Example**:
```json
{
  "id": "dt_users_001",
  "name": "users",
  "project_id": "proj_abc123",
  "schema": [
    { "key": "id", "type": "string", "required": true },
    { "key": "name", "type": "string", "label": "Full Name" },
    { "key": "email", "type": "email", "required": true },
    { "key": "avatar", "type": "image" },
    { "key": "createdAt", "type": "datetime" }
  ],
  "mockData": [
    { "id": "1", "name": "John Doe", "email": "john@example.com" }
  ],
  "useMockData": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 10. API Endpoints (v7)

외부 API 연결 설정을 저장합니다.

```typescript
interface ApiEndpoint {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 엔드포인트 이름 (예: "getUsers")
  project_id: string;            // FK → projects.id

  // Request Configuration
  method: HttpMethod;            // HTTP 메서드
  baseUrl: string;               // 기본 URL
  path: string;                  // 경로 (변수 포함 가능: "/users/{{userId}}")

  headers: ApiHeader[];          // 헤더
  queryParams: ApiParam[];       // 쿼리 파라미터
  bodyType: BodyType;            // Body 타입
  bodyTemplate?: string;         // Body 템플릿 (JSON)

  // Response Handling
  responseMapping: ResponseMapping;
  targetDataTable?: string;      // 대상 DataTable 이름

  // Execution Mode
  executionMode: ExecutionMode;  // 클라이언트 or 서버
  serverConfig?: ServerConfig;   // 서버 실행 설정 (API 키 보호용)

  timeout?: number;              // 타임아웃 (ms)
  retryCount?: number;           // 재시도 횟수

  created_at?: string;
  updated_at?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type BodyType = 'json' | 'form-data' | 'x-www-form-urlencoded' | 'none';
type ExecutionMode = 'client' | 'server';

interface ApiHeader {
  key: string;
  value: string;                 // 변수 포함 가능: "Bearer {{authToken}}"
  enabled: boolean;
}

interface ApiParam {
  key: string;
  value: string;                 // 변수 포함 가능: "{{searchQuery}}"
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

interface ResponseMapping {
  dataPath: string;              // 데이터 경로 (예: "data.users")
  fieldMappings?: Array<{
    sourceKey: string;
    targetKey: string;
  }>;
  pagination?: PaginationConfig;
}
```

**Indexes**:
- `project_id`: 프로젝트별 조회
- `name`: 이름으로 조회
- `targetDataTable`: 대상 DataTable로 조회

**Example**:
```json
{
  "id": "api_users_001",
  "name": "getUsers",
  "project_id": "proj_abc123",
  "method": "GET",
  "baseUrl": "https://api.example.com",
  "path": "/users",
  "headers": [
    { "key": "Authorization", "value": "Bearer {{authToken}}", "enabled": true }
  ],
  "queryParams": [
    { "key": "page", "value": "{{currentPage}}", "type": "number", "required": false }
  ],
  "bodyType": "none",
  "responseMapping": {
    "dataPath": "data.users",
    "fieldMappings": [
      { "sourceKey": "full_name", "targetKey": "name" }
    ]
  },
  "targetDataTable": "users",
  "executionMode": "client",
  "timeout": 30000,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 11. Variables (v7)

전역/페이지 변수를 저장합니다.

```typescript
interface Variable {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 변수 이름 (예: "authToken", "theme")
  project_id: string;            // FK → projects.id

  type: VariableType;            // 변수 타입
  defaultValue?: unknown;        // 기본값
  persist: boolean;              // localStorage 저장 여부

  scope: VariableScope;          // 스코프
  page_id?: string;              // FK → pages.id (scope가 'page'인 경우)

  validation?: VariableValidation; // 유효성 검사 규칙
  transform?: string;            // 변환 함수 코드

  created_at?: string;
  updated_at?: string;
}

type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';
type VariableScope = 'global' | 'page' | 'component';

interface VariableValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  schema?: string;               // JSON Schema (object/array용)
}
```

**Indexes**:
- `project_id`: 프로젝트별 조회
- `name`: 이름으로 조회
- `scope`: 스코프별 조회
- `page_id`: 페이지별 변수 조회

**Example**:
```json
{
  "id": "var_auth_001",
  "name": "authToken",
  "project_id": "proj_abc123",
  "type": "string",
  "defaultValue": null,
  "persist": true,
  "scope": "global",
  "validation": {
    "required": true,
    "minLength": 10
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 12. Transformers (v7)

데이터 변환 로직을 저장합니다.

```typescript
interface Transformer {
  id: string;                    // Primary Key (UUID)
  name: string;                  // 변환기 이름
  project_id: string;            // FK → projects.id

  level: TransformLevel;         // 변환 레벨

  // Level 1: Response Mapping (노코드)
  responseMapping?: ResponseMappingConfig;

  // Level 2: JS Transformer (로우코드)
  jsTransformer?: JsTransformerConfig;

  // Level 3: Custom Function (풀코드)
  customFunction?: CustomFunctionConfig;

  inputDataTable?: string;       // 입력 DataTable
  outputDataTable?: string;      // 출력 DataTable
  enabled: boolean;              // 활성화 여부

  created_at?: string;
  updated_at?: string;
}

type TransformLevel =
  | 'level1_mapping'      // 노코드 Response Mapping
  | 'level2_transformer'  // 로우코드 JS Transformer
  | 'level3_custom';      // 풀코드 TypeScript Custom Function

interface JsTransformerConfig {
  code: string;                  // JavaScript 코드
}

interface CustomFunctionConfig {
  code: string;                  // TypeScript 함수 코드
  functionName: string;          // export된 함수명
  dependencies?: string[];       // 외부 라이브러리 (lodash, dayjs 등)
}
```

**Indexes**:
- `project_id`: 프로젝트별 조회
- `name`: 이름으로 조회
- `level`: 레벨별 조회
- `inputDataTable`: 입력 DataTable로 조회
- `outputDataTable`: 출력 DataTable로 조회

**Example**:
```json
{
  "id": "trans_user_001",
  "name": "formatUserData",
  "project_id": "proj_abc123",
  "level": "level2_transformer",
  "jsTransformer": {
    "code": "return data.map(user => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }))"
  },
  "inputDataTable": "rawUsers",
  "outputDataTable": "users",
  "enabled": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Entity Relationships

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              projects                                       │
│  (id, name, created_by, domain, created_at, updated_at)                   │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │ 1:N
       ┌───────────────────────┼───────────────────────────────────┐
       │                       │                                   │
       ▼                       ▼                                   ▼
┌──────────────┐      ┌──────────────┐                    ┌──────────────┐
│    pages     │      │   layouts    │                    │design_themes │
│              │      │              │                    │              │
│ project_id ──┼──────│ project_id ──┼────────────────────│ project_id ──│
│ layout_id ───┼──────│              │                    │              │
│ parent_id ◄──┤      │              │                    │              │
└──────┬───────┘      └──────┬───────┘                    └──────┬───────┘
       │                     │                                   │
       │ 1:N                 │ 1:N                               │ 1:N
       ▼                     ▼                                   ▼
┌──────────────────────────────────────┐                  ┌──────────────┐
│             elements                  │                  │design_tokens │
│                                       │                  │              │
│ page_id (Page 소속) ─────────────────│                  │ project_id ──│
│ layout_id (Layout 소속) ─────────────│                  │ theme_id ────│
│ parent_id (트리 구조) ◄──────────────│                  └──────────────┘
│ slot_name (Slot 지정) ───────────────│
│ dataBinding (데이터 바인딩) ─────────│
└──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Data Panel System (v7)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │ data_tables  │◄─────│api_endpoints │      │  variables   │              │
│  │              │      │              │      │              │              │
│  │ project_id ──┤      │ project_id ──┤      │ project_id ──┤              │
│  │ schema       │      │targetDataTable      │ scope        │              │
│  │ mockData     │      │responseMapping      │ page_id ─────│──► pages     │
│  │ runtimeData  │      │              │      │              │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│         ▲                                                                   │
│         │                                                                   │
│         │                    ┌──────────────┐                               │
│         └────────────────────│ transformers │                               │
│                              │              │                               │
│                              │ project_id ──│                               │
│                              │inputDataTable│                               │
│                              │outputDataTable                               │
│                              └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Supporting Tables                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                      ┌──────────────┐                     │
│  │   history    │                      │   metadata   │                     │
│  │              │                      │              │                     │
│  │ page_id ─────│──► pages             │ project_id ──│──► projects         │
│  │ element_id   │                      │ sync_status  │                     │
│  │ type         │                      │              │                     │
│  └──────────────┘                      └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Changes |
|---------|---------|
| **v1-2** | 초기 스키마 (projects, pages, elements, design_tokens, history, metadata) |
| **v3** | `design_tokens`에 `theme_id` 인덱스 추가 |
| **v4** | `layouts` 스토어 추가 (Layout/Slot System) |
| **v5** | `elements`에 `layout_id` 인덱스 추가 |
| **v6** | `layouts`에 `order_num`, `slug` 인덱스 추가 (Nested Routes) |
| **v7** | Data Panel 스토어 추가: `data_tables`, `api_endpoints`, `variables`, `transformers` |

### Migration Pattern

```typescript
request.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;

  // 새 스토어 생성
  if (!db.objectStoreNames.contains('storeName')) {
    const store = db.createObjectStore('storeName', { keyPath: 'id' });
    store.createIndex('indexName', 'fieldName', { unique: false });
  }

  // 기존 스토어에 인덱스 추가
  else {
    const transaction = (event.target as IDBOpenDBRequest).transaction;
    if (transaction) {
      const store = transaction.objectStore('storeName');
      if (!store.indexNames.contains('newIndex')) {
        store.createIndex('newIndex', 'fieldName', { unique: false });
      }
    }
  }
};
```

---

## LRU Cache System

자주 접근하는 데이터의 성능 최적화를 위한 LRU (Least Recently Used) 캐시 시스템입니다.

### Cache Configuration

| Cache | Capacity | Estimated Memory |
|-------|----------|------------------|
| `elementCache` | 1,000 items | ~2MB |
| `pageCache` | 100 items | ~200KB |
| `projectCache` | 10 items | ~20KB |

### Cache Operations

```typescript
// Cache-first 읽기 패턴
async getById(id: string): Promise<Element | null> {
  // 1. 캐시 확인
  const cached = this.elementCache.get(id);
  if (cached) return cached;  // 캐시 히트: <1ms

  // 2. 캐시 미스 - DB 조회
  const element = await this.getFromStore('elements', id);  // 5-10ms

  // 3. 캐시에 저장
  if (element) {
    this.elementCache.set(id, element);
  }

  return element;
}
```

### Cache Statistics

```typescript
interface CacheStats {
  size: number;       // 현재 아이템 수
  capacity: number;   // 최대 용량
  hits: number;       // 캐시 히트 횟수
  misses: number;     // 캐시 미스 횟수
  hitRate: string;    // 히트율 (%)
  memoryUsage: string; // 추정 메모리 사용량
}

// 개발 모드에서 통계 확인
const stats = await getCacheStats();
console.log(stats.elements);  // { size: 150, hitRate: "85.2%", ... }
```

---

## File References

| File | Description |
|------|-------------|
| `src/lib/db/index.ts` | 데이터베이스 인스턴스 매니저 (싱글톤) |
| `src/lib/db/types.ts` | DatabaseAdapter 인터페이스 정의 |
| `src/lib/db/indexedDB/adapter.ts` | IndexedDB 어댑터 구현 |
| `src/lib/db/indexedDB/LRUCache.ts` | LRU 캐시 구현 |
| `src/types/core/store.types.ts` | Element, Page 타입 |
| `src/types/builder/unified.types.ts` | 통합 타입 정의 |
| `src/types/builder/layout.types.ts` | Layout 시스템 타입 |
| `src/types/builder/data.types.ts` | Data Panel 시스템 타입 |
| `src/types/theme.ts` | DesignToken, DesignTheme 타입 |

---

## Usage Examples

### Basic CRUD Operations

```typescript
import { getDB } from '@/lib/db';

// 데이터베이스 가져오기
const db = await getDB();

// 프로젝트 생성
const project = await db.projects.insert({
  id: 'proj_001',
  name: 'My Project',
  created_by: 'user_001'
});

// 페이지 생성
const page = await db.pages.insert({
  id: 'page_001',
  project_id: 'proj_001',
  title: 'Home',
  slug: '/',
  order_num: 1
});

// 요소 생성
const element = await db.elements.insert({
  id: 'elem_001',
  tag: 'Button',
  props: { children: 'Click me', variant: 'primary' },
  page_id: 'page_001',
  order_num: 1
});

// 요소 조회
const pageElements = await db.elements.getByPage('page_001');
const children = await db.elements.getChildren('elem_001');

// 배치 업데이트
await db.elements.updateMany([
  { id: 'elem_001', data: { props: { variant: 'secondary' } } },
  { id: 'elem_002', data: { order_num: 2 } }
]);
```

### Data Panel Operations

```typescript
// DataTable 생성
const dataTable = await db.data_tables.insert({
  id: 'dt_users',
  name: 'users',
  project_id: 'proj_001',
  schema: [
    { key: 'id', type: 'string', required: true },
    { key: 'name', type: 'string', label: 'Full Name' },
    { key: 'email', type: 'email', required: true }
  ],
  mockData: [],
  useMockData: true
});

// API Endpoint 생성
const apiEndpoint = await db.api_endpoints.insert({
  id: 'api_users',
  name: 'getUsers',
  project_id: 'proj_001',
  method: 'GET',
  baseUrl: 'https://api.example.com',
  path: '/users',
  headers: [],
  queryParams: [],
  bodyType: 'none',
  responseMapping: { dataPath: 'data' },
  targetDataTable: 'users',
  executionMode: 'client'
});

// Variable 생성
const variable = await db.variables.insert({
  id: 'var_token',
  name: 'authToken',
  project_id: 'proj_001',
  type: 'string',
  scope: 'global',
  persist: true
});
```

---

## Best Practices

### 1. 트랜잭션 패턴

여러 작업을 원자적으로 처리해야 할 때:

```typescript
// 단일 트랜잭션으로 배치 처리
const db = this.ensureDB();
const tx = db.transaction(['elements'], 'readwrite');
const store = tx.objectStore('elements');

elements.forEach(el => store.put(el));

tx.oncomplete = () => console.log('All elements saved');
tx.onerror = () => console.error('Transaction failed');
```

### 2. 인덱스 활용

전체 스캔 대신 인덱스를 사용:

```typescript
// ❌ 느림 - 전체 스캔
const allElements = await db.elements.getAll();
const filtered = allElements.filter(el => el.page_id === pageId);

// ✅ 빠름 - 인덱스 사용
const pageElements = await db.elements.getByPage(pageId);
```

### 3. 캐시 최적화

캐시를 효과적으로 활용:

```typescript
// 자주 접근하는 데이터는 캐시에서 가져옴
const element = await db.elements.getById(id);  // 캐시 히트 시 <1ms

// 대량 삽입 후 캐시 업데이트
await db.elements.insertMany(elements);  // 자동으로 캐시에 추가됨
```

### 4. 에러 처리

```typescript
try {
  const element = await db.elements.getById(id);
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
} catch (error) {
  console.error('Database error:', error);
  // 에러 로깅, 사용자 알림 등
}
```

---

## Troubleshooting

### 일반적인 문제

1. **"Database not initialized"**
   - `getDB()` 호출 전에 `init()` 확인
   - 싱글톤 패턴으로 자동 초기화됨

2. **인덱스 조회 실패**
   - 버전 업그레이드 확인 (onupgradeneeded)
   - 인덱스 이름 정확히 확인

3. **캐시 불일치**
   - `cache.clear()` 호출로 캐시 초기화
   - 외부에서 직접 DB 수정 시 캐시 무효화 필요

### 디버깅

```typescript
// 캐시 통계 확인
const stats = await getCacheStats();
console.log('Element cache:', stats.elements);

// 캐시 초기화
await clearCache();
```

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 전체 가이드
- [COMPLETED_FEATURES.md](./COMPLETED_FEATURES.md) - 완료된 기능 목록
- [PLANNED_FEATURES.md](./PLANNED_FEATURES.md) - 계획된 기능
