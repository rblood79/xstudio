# XStudio Builder 성능 최적화 가이드

> **작성일**: 2025-12-09
> **최종 수정**: 2025-12-11 (모노레포 구조 확정)
> **목표**: 엔터프라이즈급 10,000개+ 요소, 24시간+ 안정 사용

## 개요

XStudio Builder의 대규모 프로젝트 지원을 위한 성능 최적화 계획입니다.
Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리, 네트워크 정책을 다룹니다.

### 🚀 Major Architecture Change (Phase 10)

**2025-12-11 추가**: Builder를 **WebGL 기반(@pixi/react)**으로 재구축하고, 기존 Canvas iframe을 **Publish App 전용**으로 분리하는 대규모 아키텍처 변경이 계획되었습니다.

```
현재: Builder (React DOM) ◄─── postMessage ───► Canvas iframe (Preview + Publish)
목표: Builder (WebGL/PixiJS) ─── Direct State ──► Zustand Store
      Publish App (React DOM) ← Export ← Builder (별도 프로젝트)
```

**모노레포 구조 (확정)**:
```
xstudio/
├── packages/
│   ├── builder/           ← WebGL Builder (현재 src/ 이전)
│   │   └── workspace/
│   │       └── canvas/    ← PixiJS 렌더링 (DOM 구조 반영)
│   ├── publish/           ← Publish App (SSR/SEO 지원)
│   └── shared/            ← 공통 코드 (React Aria, Types)
└── pnpm-workspace.yaml
```

자세한 내용은 [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) 참조

## 문서 구조

| 문서                                               | 설명                                           | 상태            |
| -------------------------------------------------- | ---------------------------------------------- | --------------- |
| [01-problem-analysis.md](./01-problem-analysis.md) | 현재 문제 분석 및 목표 성능 지표               | 📋 계획         |
| [02-architecture.md](./02-architecture.md)         | 아키텍처 설계                                  | 📋 계획         |
| [03-phase-1-4.md](./03-phase-1-4.md)               | Phase 1-4: Panel, Store, History, Canvas       | 📋 계획         |
| [04-phase-5-8.md](./04-phase-5-8.md)               | Phase 5-8: Lazy, React Query, Monitor, CI      | ✅ Phase 6 완료 |
| [05-supplement.md](./05-supplement.md)             | 보완 제안: 캔버스 가상화, 웹 워커, 에셋 최적화 | 📋 계획         |
| [06-implementation.md](./06-implementation.md)     | 구현 순서 및 체크리스트 (Phase 9 포함)         | 📋 계획         |
| [07-decisions.md](./07-decisions.md)               | 결정 사항 (오픈 질문 해결)                     | ✅ 완료         |
| [08-additional-ideas.md](./08-additional-ideas.md) | 추가 최적화 아이디어                           | 🆕 신규         |
| [task.md](./task.md)                               | 작업 진행 현황 (Checklist)                     | 🔄 진행중       |
| **[10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)** | **🚀 WebGL Builder + Publish App 분리** | **🆕 NEW** |

## 목표 성능 지표

| 지표                | 현재 (DOM) | 목표 (Phase 1-9) | **목표 (Phase 10 WebGL)** |
| ------------------- | ---------- | ---------------- | ------------------------- |
| **5,000개 렌더링**  | 불가능     | < 1초            | **< 16ms (60fps)**        |
| **10,000개 렌더링** | 불가능     | -                | **< 33ms (30fps)**        |
| **요소 선택**       | 50-100ms   | < 30ms           | **< 5ms**                 |
| **줌/팬 반응**      | 100-200ms  | -                | **< 16ms**                |
| **메모리 (24시간)** | +200MB     | < +50MB          | **GPU VRAM 활용**         |
| **CPU (유휴)**      | 15-25%     | < 5%             | **< 2% (GPU 오프로드)**   |
| **안정 사용**       | 2-3시간    | **24시간+**      | **24시간+**               |

## Phase 요약

| Phase | 작업                      | 예상 효과        | 상태                   |
| ----- | ------------------------- | ---------------- | ---------------------- |
| **1** | Panel Gateway 패턴        | CPU 70% ↓        | 🔴 20% 완료            |
| **2** | Store 인덱스 시스템       | 조회 200x ↑      | 🔴 구현만 완료         |
| **3** | History Diff 시스템       | 메모리 99% ↓     | ✅ 완료                |
| **4** | ~~Canvas Delta 업데이트~~ | ~~전송량 95% ↓~~ | ⚠️ Phase 10으로 대체   |
| **5** | Lazy Loading + LRU        | 대규모 지원      | 🟡 구현만 완료         |
| **6** | React Query 서버 상태     | API 캐시 90% ↑   | ✅ DataTablePanel 완료 |
| **7** | 성능 모니터링 + 자동 복구 | 안정성 확보      | 🟡 구현만 완료         |
| **8** | CI 자동화 + 장시간 테스트 | 회귀 방지        | ❌ 미착수              |
| **9** | 보완 최적화 (Supplement)  | 추가 최적화      | 🔄 60% 완료            |
| **🚀 10** | **WebGL Builder + Publish 분리** | **10x 성능 향상** | **🆕 계획** |

### Phase 10 Sub-Phases (80hr 예상)

| Sub | 작업 | 시간 | 우선순위 | 상태 |
|-----|------|------|----------|------|
| 10.1 | @pixi/react v8 설정 | 8hr | P0 | 📋 |
| 10.2 | ElementSprite 렌더링 | 16hr | P0 | 📋 |
| 10.3 | Selection + Transform | 12hr | P1 | 📋 |
| 10.4 | Zoom/Pan + Grid | 8hr | P1 | 📋 |
| 10.5 | Text Input 하이브리드 | 12hr | P1 | 📋 |
| 10.7 | Publish App 분리 | 16hr | P0 | 📋 |
| 10.8 | Migration 완료 | 8hr | P2 | 📋 |

> **Note**: 10.6 (접근성 레이어) 제거 - 빌더는 시각적 도구, Publish App에서 자동 지원

## P0 우선 작업 (수정된 우선순위)

### 단기 (Phase 1-9 기반)
1. **Panel Gateway 수정** (Phase 1)
   - PropertiesPanel, StylesPanel, ComponentsPanel에 Content 분리 필요
   - 현재 hook이 isActive 체크 전에 호출됨

2. **Store Index Migration** (Phase 2)
   - `getPageElements()` 정의됨, 실제 사용 안 함
   - 10곳의 `.filter(page_id)` → `getPageElements()` 전환

3. **구현된 훅 통합** (Phase 5, 7)
   - `usePageLoader` → 페이지 전환에 통합
   - `useAutoRecovery` → BuilderApp에 통합

### 중장기 (Phase 10: WebGL 마이그레이션)
4. **🚀 @pixi/react v8 설정** (Phase 10.1)
   - React 19 업그레이드 필요
   - `packages/builder/workspace/canvas/` 구조 생성
   - WebGL 기반 Builder Canvas 구축

5. **🚀 ElementSprite 시스템** (Phase 10.2)
   - `packages/builder/workspace/canvas/sprites/`
   - Box, Text, Image 등 기본 렌더링
   - 5,000개+ 요소 60fps 목표

6. **🚀 Publish App 분리** (Phase 10.7)
   - 모노레포 구조: `packages/publish/`
   - 기존 Canvas iframe 코드 → `packages/publish/components/`
   - SEO + 접근성 최적화된 별도 앱

## 추가 최적화 아이디어 (08-additional-ideas.md)

| 아이디어              | 난이도 | 효과                                           |
| --------------------- | ------ | ---------------------------------------------- |
| **이벤트 위임**       | 중     | 메모리 ↓, 초기 로딩 ↑ (리스너 10,000개 → 10개) |
| **CSS Containment**   | 하     | 렌더링 성능 ↑ (`content-visibility: auto`)     |
| **Selection Overlay** | 상     | 선택 반응성 ↑ (0개 요소 리렌더링)              |

## 구현 완료 항목

### Phase 6: DataTablePanel (2025-12-10) ✅

**문제**: 페이지 새로고침 후 DataTable 목록이 비어있음 (IndexedDB에는 데이터 존재)

**해결**: React Query + Zustand Store 이중 레이어 동기화

```typescript
// 패널 활성화 시 Zustand Store 초기화
useEffect(() => {
  if (isActive && projectId && initialLoadedRef.current !== projectId) {
    initialLoadedRef.current = projectId;
    Promise.all([
      fetchDataTables(projectId),
      fetchApiEndpoints(projectId),
      fetchVariables(projectId),
      fetchTransformers(projectId),
    ]);
  }
}, [isActive, projectId, ...]);
```

## 관련 문서

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
- [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md) - 완료된 기능 목록
- [PLANNED_FEATURES.md](../PLANNED_FEATURES.md) - 계획된 기능 목록

---

> **문서 작성**: Claude AI
> **다음 단계**: P0 작업 우선 시작 (MonitorPanel + 캔버스 가상화)
