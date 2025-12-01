# DataTable Preset System

## 개요

DataTable Preset System은 Data Panel에서 사용자가 빠르게 DataTable을 생성할 수 있도록 미리 정의된 스키마와 샘플 데이터를 제공합니다. Layout Preset 패턴과 동일한 UX를 따릅니다.

## 배경

### 문제
- 기존 `/mocks` 데이터가 개발 초기 컴포넌트 테스트용으로만 사용됨
- Data Panel에서 DataTable 생성 시 스키마를 처음부터 정의해야 함
- 공통 데이터 구조(Users, Products 등)를 반복 정의하는 비효율

### 해결
- `/mocks`의 데이터 타입들을 DataTable Preset으로 변환
- Preset 선택만으로 스키마 + 샘플 데이터 즉시 생성
- Layout Preset과 일관된 UX 제공

---

## Preset 카테고리

### Users & Auth (사용자/인증)
| Preset | 설명 | 주요 필드 |
|--------|------|-----------|
| Users | 사용자 목록 | id, name, email, phone, company, role, status |
| Roles | 역할 정의 | id, name, description, scope, permissionIds |
| Permissions | 권한 정의 | id, name, description, category |
| Invitations | 초대 관리 | email, roleId, status, expiresAt |

### Organization (조직)
| Preset | 설명 | 주요 필드 |
|--------|------|-----------|
| Organizations | 조직/회사 | id, name, industry, domain, plan |
| Departments | 부서 | id, organizationId, name, description |
| Projects | 프로젝트 | id, name, status, startDate, endDate, budget |

### E-commerce (이커머스)
| Preset | 설명 | 주요 필드 |
|--------|------|-----------|
| Products | 상품 | id, name, price, stock, category, description |
| Categories | 카테고리 | id, name, parentId, description |
| Orders | 주문 | id, userId, items, total, status, createdAt |

### Manufacturing (제조/PLM)
| Preset | 설명 | 주요 필드 |
|--------|------|-----------|
| Engines | 엔진/제품 | id, name, code, version, status, specifications |
| Components | 부품 (BOM) | id, engineId, parentId, name, type, quantity, cost |

### System (시스템)
| Preset | 설명 | 주요 필드 |
|--------|------|-----------|
| AuditLogs | 감사 로그 | actorUserId, entityType, action, timestamp |
| ProjectMemberships | 프로젝트 멤버십 | projectId, userId, roleId, allocation |

---

## UI/UX

### DataTable 추가 플로우

```
[Data Panel]
    │
    ├── [+ DataTable 추가] 클릭
    │
    ▼
┌─────────────────────────────────────────────────┐
│  DataTable 추가                                  │
├─────────────────────────────────────────────────┤
│  ○ 빈 테이블로 시작                               │
│  ● Preset에서 선택                                │
├─────────────────────────────────────────────────┤
│  [카테고리 탭]                                    │
│  Users | Organization | E-commerce | Mfg | Sys  │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 👤       │ │ 🔑       │ │ 🔒       │        │
│  │ Users    │ │ Roles    │ │ Perms    │        │
│  │ 사용자   │ │ 역할     │ │ 권한     │        │
│  │ 8 fields │ │ 5 fields │ │ 4 fields │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│  선택: Users                                      │
│  ┌─────────────────────────────────────────┐    │
│  │ Schema Preview                           │    │
│  │ • id (string) - 고유 식별자              │    │
│  │ • name (string) - 사용자 이름            │    │
│  │ • email (email) - 이메일 주소            │    │
│  │ • phone (string) - 전화번호              │    │
│  │ • company (string) - 소속 회사           │    │
│  │ • role (string) - 직책                   │    │
│  │ • status (string) - 상태                 │    │
│  │ • jobLevel (string) - 직급               │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  📊 샘플 데이터: 10개 생성                        │
│                                                  │
│  [취소]                           [생성]          │
└─────────────────────────────────────────────────┘
```

### Layout Preset과의 일관성

| Layout Preset | DataTable Preset |
|---------------|------------------|
| 카테고리: basic, sidebar, dashboard | 카테고리: users-auth, organization, ... |
| 미리보기: 레이아웃 다이어그램 | 미리보기: 스키마 필드 목록 |
| 생성 결과: Slot 컴포넌트들 | 생성 결과: DataTable + mockData |
| 위치: LayoutPresetSelector | 위치: DataTablePresetSelector |

---

## 기술 구현

### 타입 정의

```typescript
// src/builder/panels/data/presets/types.ts

import type { DataField } from "../../../../types/builder/data.types";

export type PresetCategory =
  | "users-auth"
  | "organization"
  | "ecommerce"
  | "manufacturing"
  | "system";

export interface PresetCategoryMeta {
  id: PresetCategory;
  name: string;
  icon: string;
}

export interface DataTablePreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  icon: string;
  schema: DataField[];
  generateSampleData: (count: number) => Record<string, unknown>[];
  defaultSampleCount: number;
}
```

### Preset 정의 예시

```typescript
// src/builder/panels/data/presets/dataTablePresets.ts

export const DATATABLE_PRESETS: Record<string, DataTablePreset> = {
  users: {
    id: "users",
    name: "Users",
    description: "사용자 정보 관리",
    category: "users-auth",
    icon: "👤",
    schema: [
      { key: "id", type: "string", label: "ID", required: true },
      { key: "name", type: "string", label: "이름", required: true },
      { key: "email", type: "email", label: "이메일", required: true },
      { key: "phone", type: "string", label: "전화번호" },
      { key: "company", type: "string", label: "회사" },
      { key: "role", type: "string", label: "직책" },
      { key: "status", type: "string", label: "상태" },
      { key: "jobLevel", type: "string", label: "직급" },
    ],
    generateSampleData: generateMockUsers,
    defaultSampleCount: 10,
  },
  // ... more presets
};
```

### 사용법

```typescript
// Data Panel에서 Preset 선택 후 DataTable 생성
const preset = DATATABLE_PRESETS.users;
const sampleData = preset.generateSampleData(preset.defaultSampleCount);

await createDataTable({
  name: "users",
  project_id: currentProjectId,
  schema: preset.schema,
  mockData: sampleData,
  useMockData: true,
});
```

---

## 파일 구조

```
src/builder/panels/data/
├── presets/
│   ├── index.ts                      # Export all
│   ├── types.ts                      # Type definitions
│   ├── dataTablePresets.ts           # Preset definitions
│   ├── DataTablePresetSelector.tsx   # UI component
│   └── DataTablePresetSelector.css   # Styles
├── DataTablePanel.tsx                # (수정) Preset 통합
└── ...
```

---

## 구현 일정

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 문서 작성 | ✅ 완료 |
| 2 | Preset 타입/정의 파일 생성 | 🔄 진행 예정 |
| 3 | UI 컴포넌트 구현 | 🔄 진행 예정 |
| 4 | Data Panel 통합 | 🔄 진행 예정 |
| 5 | 정리 및 테스트 | 🔄 진행 예정 |

---

## 참고

- Layout Preset: `src/builder/panels/properties/editors/LayoutPresetSelector/`
- Mock Data: `src/services/api/mocks/mockLargeDataV2.ts`
- DataTable 타입: `src/types/builder/data.types.ts`
- Data Store: `src/builder/stores/data.ts`
