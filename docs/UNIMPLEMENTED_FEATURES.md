# 미구현 기능 목록

> **Note**: 현재 비활성화되어 있거나 향후 구현 예정인 기능들입니다.
> 구현 완료 시 해당 섹션을 `docs/features/`로 이동합니다.

**최종 업데이트**: 2025-12-02

---

## 목차

1. [Transformer 보안 샌드박스](#1-transformer-보안-샌드박스)
2. ~~[MOCK_DATA Migration](#2-mock_data-migration)~~ ✅ 완료
3. [Server-side Action](#3-server-side-action)
4. [Context Menu System](#4-context-menu-system)
5. [Layout Preset 개선](#5-layout-preset-개선)

---

## 1. Transformer 보안 샌드박스

**Status**: ⛔ Level 3 비활성화 중 (보안 샌드박스 구현 전까지)
**Priority**: P0 (Level 3 활성화 전제 조건)
**Related**: DatasetPanel > Transformers 탭

### 현재 상태

```
Transformer Levels:
├─ Level 1: Response Mapping  ✅ 사용 가능 (노코드)
├─ Level 2: JS Transformer    ✅ 사용 가능 (로우코드, 제한된 표현식)
└─ Level 3: Custom Function   ⛔ UI에서 비활성화 (풀코드)
```

### Level 3 비활성화 이유

- 사용자가 **임의의 JavaScript 코드** 작성 가능
- 현재 구현: `new Function()`으로 직접 실행 → **보안 위험**
- 악의적 코드 실행, 무한 루프, 메모리 누수 등 위험

### 구현 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Web Worker/iframe 격리 | 메인 스레드와 분리된 샌드박스 환경 | P0 |
| 실행 시간 제한 | 30초 타임아웃 후 강제 종료 | P0 |
| 메모리 제한 | 100MB 상한 | P0 |
| 의존성 화이트리스트 | lodash, dayjs, zod만 허용 | P0 |
| 전역 객체 차단 | `eval`, `Function`, `globalThis` 접근 금지 | P0 |
| 감사 로그 | Execution Log에 실행 기록 | P1 |

### 샌드박스 설계

```typescript
// 샌드박스 실행 인터페이스 (구현 예정)
interface SandboxConfig {
  timeoutMs: number;        // 실행 시간 제한 (기본 30000)
  memoryLimitMb: number;    // 메모리 제한 (기본 100)
  allowedGlobals: string[]; // 허용된 전역 객체
  dependencyWhitelist: string[]; // 허용된 의존성
}

interface SandboxResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
  memoryUsedMb: number;
}
```

### 보완 체크리스트

- [ ] 사전 정적 분석: `import`, `require`, `while(true)` 등 블랙리스트 토큰 탐지
- [ ] `allowedGlobals` 외 전역 객체 Proxy로 감시
- [ ] Web Worker/iframe 종료 시 메모리 스냅샷 체크
- [ ] 샌드박스 버전·해시를 Execution Log에 기록
- [ ] 의존성 버전 고정 (semver range 금지) 및 무결성 해시 체크

### 관련 파일

- `src/builder/stores/data.ts` - Transformer 실행 로직 (TODO 주석 있음)
- `docs/features/DATA_PANEL_SYSTEM.md` - 상세 설계 문서

---

## 2. ~~MOCK_DATA Migration~~ ✅ 완료

**Status**: ✅ DataTable Preset 시스템으로 구현 완료
**Priority**: ~~P2~~
**Related**: DatasetPanel, Collection Components

### 구현 완료

DataTable Preset 시스템으로 대체 구현됨:

**위치**: `src/builder/panels/dataset/presets/dataTablePresets.ts`

**14개 프리셋 제공**:

| 카테고리 | 프리셋 |
|----------|--------|
| Users & Auth | `users`, `roles`, `permissions`, `invitations` |
| Organization | `organizations`, `departments`, `projects` |
| E-commerce | `products`, `categories`, `orders` |
| Manufacturing | `engines`, `components` |
| System | `auditLogs`, `projectMemberships` |

### 사용 방법

DatasetPanel > New DataTable > Preset 선택 시 자동 스키마 및 샘플 데이터 생성

### 기존 MOCK_DATA 현황

- `src/services/api/index.ts`의 MOCK_DATA 엔드포인트는 하위 호환성을 위해 유지
- 신규 개발 시 DataTable Preset 사용 권장

---

## 3. Server-side Action

**Status**: 📋 Planning Phase
**Priority**: P1
**Related**: DatasetPanel > ApiEndpoint

### 문제점

현재 설계는 클라이언트 사이드 중심이라 **API Key 노출 위험**이 있습니다.

```
현재 클라이언트 사이드 호출:

Browser (Preview iframe)
    ↓
API Call: GET https://api.stripe.com/v1/charges
Header: Authorization: Bearer sk_live_xxxxx  ← ⚠️ DevTools에서 노출!
    ↓
External API

문제:
- API 키가 브라우저 DevTools에서 보임
- 네트워크 탭에서 헤더 확인 가능
- 악의적 사용자가 키를 탈취할 수 있음
```

### 해결 방안

Supabase Edge Function을 통한 서버 사이드 프록시:

```
Server-side Action 아키텍처:

Browser (Preview iframe)
    ↓
API Call: POST /api/proxy/stripe-charges
Header: Authorization: Bearer <user_session_token>
    ↓
┌───────────────────────────────────────────────────────┐
│  Supabase Edge Function (Server)                       │
│                                                        │
│  1. 세션 토큰 검증                                      │
│  2. 프로젝트 권한 확인                                  │
│  3. Vault에서 API 키 조회 (sk_live_xxxxx)              │
│  4. 실제 외부 API 호출                                  │
│  5. 응답 반환 (민감 정보 필터링)                        │
│                                                        │
└───────────────────────────────────────────────────────┘
    ↓
External API (Stripe, OpenAI, etc.)
```

### 구현 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| executionMode 필드 | ApiEndpoint에 `client` / `server` 선택 | P1 |
| Edge Function 템플릿 | api-proxy Edge Function 코드 | P1 |
| Vault 연동 | Supabase Vault에서 시크릿 조회 | P1 |
| Server Configuration UI | Inspector에서 서버 설정 UI | P1 |

### ApiEndpoint 타입 확장

```typescript
interface ApiEndpoint {
  // ... 기존 필드

  // 실행 환경 설정
  executionMode: "client" | "server";

  // server 모드 전용
  serverConfig?: {
    edgeFunctionName: string;
    secretMappings?: {
      headerKey: string;   // "Authorization"
      vaultKey: string;    // "stripe_api_key"
      format?: string;     // "Bearer {{value}}"
    }[];
    responseFilter?: {
      excludeFields: string[];  // 민감 정보 필드 제거
    };
  };
}
```

### 관련 파일

- `docs/features/DATA_PANEL_SYSTEM.md` - 상세 설계 (섹션 12.3)

---

## 4. Context Menu System

**Status**: 📋 Planning Phase (전체 미구현)
**Priority**: Medium
**Related**: Preview, Sidebar, Inspector

### 설명

Element/Area/Multi-select에 대한 컨텍스트 메뉴 시스템

### 구현 필요 Phase

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | Core Infrastructure (Component, Hook, Types) | ⏳ |
| Phase 2 | Element-Specific Menus | ⏳ |
| Phase 3 | Area-Specific Menus (Preview, Sidebar, Inspector) | ⏳ |
| Phase 4 | Multi-Select Menu | ⏳ |
| Phase 5 | System Integration (iframe, Overlay, Shortcuts) | ⏳ |
| Phase 6 | Advanced Features (Smart Menus, Search) | ⏳ |

### 상세 설계

`docs/PLANNED_FEATURES.md` 참조

---

## 5. Layout Preset 개선

**Status**: 📋 Planning Phase
**Priority**: Low
**Related**: Layout System, Body Editor

### 구현 필요 항목

| 항목 | 설명 | 상태 |
|------|------|------|
| 프리셋 커스터마이징 | 사용자 정의 레이아웃을 프리셋으로 저장 | ⏳ |
| Grid/Flex 시각적 편집 | 코드 없이 Grid/Flex 레이아웃 구조 편집 | ⏳ |

### 프리셋 저장 Database Schema

```sql
CREATE TABLE custom_presets (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'custom',
  slots JSONB NOT NULL,
  container_style JSONB,
  preview_areas JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 상세 설계

`docs/PLANNED_FEATURES.md` 참조

---

## 우선순위 요약

| 순위 | 기능 | 상태 | 비고 |
|------|------|------|------|
| **P0** | Transformer 샌드박스 | ⛔ | Level 3 활성화 전제 조건 |
| **P1** | Server-side Action | 📋 | API Key 보호 |
| ~~**P2**~~ | ~~MOCK_DATA Migration~~ | ✅ | DataTable Preset으로 구현 완료 |
| **Medium** | Context Menu System | 📋 | UX 개선 |
| **Low** | Layout Preset 개선 | 📋 | 편의 기능 |

---

**Note**: P0 항목도 현재 **비활성화 상태**이므로 즉시 구현 필요는 없습니다. Level 3 Custom Function을 활성화하려 할 때 선행 구현이 필요합니다.
