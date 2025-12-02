# 미구현 기능 목록

> **Note**: 현재 비활성화되어 있거나 향후 구현 예정인 기능들입니다.
> 구현 완료 시 해당 섹션을 `docs/features/`로 이동합니다.

**최종 업데이트**: 2025-12-02

---

## 목차

1. [Transformer 보안 샌드박스](#1-transformer-보안-샌드박스)
2. [MOCK_DATA Migration](#2-mock_data-migration)
3. [Context Menu System](#3-context-menu-system)
4. [Layout Preset 개선](#4-layout-preset-개선)

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

## 2. MOCK_DATA Migration

**Status**: ⏳ 향후 작업으로 연기
**Priority**: P2
**Related**: DatasetPanel, Collection Components

### 설명

기존 하드코딩된 `MOCK_DATA` 엔드포인트들을 새로운 DataTable 시스템으로 마이그레이션

### 현재 상태

- `src/services/api/index.ts`에 20+ 개의 MOCK_DATA 엔드포인트 존재
- 컴포넌트에서 `baseUrl: "MOCK_DATA"` 형태로 직접 참조 중

### 마이그레이션 계획

1. 각 MOCK_DATA 엔드포인트를 DataTable로 변환
2. 기존 컴포넌트의 `dataBinding` 참조를 `datasetId`로 변경
3. MOCK_DATA 서비스 deprecated 처리

---

## 3. Context Menu System

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

## 4. Layout Preset 개선

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
| **P2** | MOCK_DATA Migration | ⏳ | 현재 동작에 문제 없음 |
| **Medium** | Context Menu System | 📋 | UX 개선 |
| **Low** | Layout Preset 개선 | 📋 | 편의 기능 |

---

**Note**: P0 항목도 현재 **비활성화 상태**이므로 즉시 구현 필요는 없습니다. Level 3 Custom Function을 활성화하려 할 때 선행 구현이 필요합니다.
