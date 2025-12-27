# Performance Optimization Tasks

> **Last Updated:** 2025-12-11 (전체 Track 완료 + 검증 완료)
> **📌 단일 진실 소스**: 이 문서가 Phase 진행 현황의 기준입니다
> **✅ 검증 완료**: 2025-12-11 전체 코드베이스 검증 완료

---

## Executive Summary

### 새로운 Phase 구조

기존 10개 Phase를 **3개 Track**으로 재조정:

```
┌─────────────────────────────────────────────────────────────┐
│                    Performance Optimization                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Track A: 즉시 실행 (전제조건 없음)              ✅ 100% 완료 │
│  ├── A1. 미사용 코드 통합 (Phase 1,2,5,7)                    │
│  └── A2. 네트워크 최적화 (Phase 6) → React Query로 대체      │
│                                                              │
│  Track B: WebGL Builder (Phase 10)              ✅ 100% 완료 │
│  ├── B0. 전제조건 충족                                       │
│  ├── B1. WebGL Canvas 구축                                   │
│  └── B2. Publish App 분리                                    │
│                                                              │
│  Track C: 검증 및 CI (Phase 8)                  ✅ 100% 완료 │
│  └── 장시간 시뮬레이션, SLO 검증                              │
│                                                              │
│  완료됨: Phase 3 (History Diff), Phase 9 부분 (CSS Containment)│
│  폐기됨: Phase 4 (Delta Sync → Phase 10으로 대체)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 실행 순서 요약

| 순서 | Track | 작업 | 예상 시간 | 상태 |
|------|-------|------|----------|------|
| **1** | A1 | 미사용 코드 통합 | 8hr | ✅ 완료 |
| **2** | A2 | 네트워크 최적화 | 4hr | ✅ 완료 (React Query) |
| **3** | B0 | Phase 10 전제조건 | 8hr | ✅ 완료 |
| **4** | B1 | WebGL Canvas 구축 | 56hr | ✅ 완료 |
| **5** | B2 | Publish App 분리 | 24hr | ✅ 완료 |
| **6** | C | CI 자동화 | 8hr | ✅ 완료 |

**총 예상 시간**: 108hr (~13.5일) → **완료**

---

## Track A: 즉시 실행 (전제조건 없음) ✅ 완료

> **목표**: 이미 구현된 코드를 실제 사용하도록 통합
> **상태**: 100% 완료

### A1. 미사용 코드 통합 ✅ 완료

기존 Phase 1, 2, 5, 7의 "구현만 완료" 상태를 "실제 사용"으로 전환

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| A1.1 | **Panel Gateway 적용** (3개 패널) | | ✅ |
| | - PropertiesPanel Gateway | `PropertiesPanel.tsx:241-247` | ✅ |
| | - StylesPanel Gateway | `StylesPanel.tsx:44-50` | ✅ |
| | - ComponentsPanel Gateway | `ComponentsPanel.tsx:27-33` | ✅ |
| A1.2 | **Store Index Migration** | | ✅ |
| | - `getPageElements()` O(1) 조회 | `stores/elements.ts:156-158` | ✅ |
| | - pageIndex 기반 인덱싱 | `stores/utils/elementIndexer.ts` | ✅ |
| A1.3 | **usePageLoader 통합** | | ✅ |
| | - BuilderCore에 usePageLoader 호출 | `BuilderCore.tsx:24,156` | ✅ |
| A1.4 | **useAutoRecovery 통합** | | ✅ |
| | - BuilderCore에 useAutoRecovery 호출 | `BuilderCore.tsx:25,164` | ✅ |

**구현 검증 (2025-12-11)**:
```typescript
// Panel Gateway 패턴 - 3개 패널 모두 적용됨
export function Panel({ isActive }: PanelProps) {
  if (!isActive) {
    return null;  // ✅ 비활성 시 훅 실행 방지
  }
  return <PanelContent />;
}
```

**완료 기준**:
- [x] 모든 패널 비활성 시 CPU 최소화 (Gateway 패턴)
- [x] `getPageElements()` 호출로 O(1) 조회
- [x] 성능 저하 시 자동 복구 (useAutoRecovery)

---

### A2. 네트워크 최적화 ✅ 완료 (React Query로 대체)

> **⚠️ 구현 방식 변경**: 별도 RequestManager 대신 **React Query**로 목표 달성

| # | 작업 | 구현 방식 | 상태 |
|---|------|----------|------|
| A2.1 | Request Deduplication | React Query 내장 기능 | ✅ |
| A2.2 | 캐시 관리 | React Query staleTime/gcTime | ✅ |
| A2.3 | 요청 취소 | React Query 자동 관리 | ✅ |

**실제 구현 (main.tsx)**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5분 캐시
      gcTime: 30 * 60 * 1000,    // 30분 GC
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

**React Query 사용처**:
- `src/builder/hooks/useDataQueries.ts` - useQuery, useMutation 활용
- `src/main.tsx` - QueryClientProvider 설정

**미사용 코드 (참고용)**:
- `src/utils/requestDeduplication.ts` - 별도 구현 (React Query로 대체됨)
- `src/builder/utils/QueryPersister.ts` - IndexedDB 캐시 (React Query 메모리 캐시로 충분)

**완료 기준**:
- [x] 중복 요청 방지 (React Query 자동 dedup)
- [x] 캐시 히트로 네트워크 요청 최소화
- [x] 5분 staleTime으로 불필요한 refetch 방지

---

## Track B: WebGL Builder (Phase 10) ✅ 완료

> **목표**: Builder Canvas를 WebGL로 전환, Publish App 분리
> **상세 문서**: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)

### B0. 전제조건 충족 ✅ 완료

| # | 전제조건 | 구현 파일 | 상태 |
|---|----------|----------|------|
| B0.1 | @pixi/react v8 호환성 | `workspace/PixiCanvasTest.tsx` | ✅ |
| B0.2 | Feature Flag 설정 | `src/utils/featureFlags.ts:58` | ✅ |
| B0.3 | 성능 베이스라인 측정 | `scripts/perf-benchmark.ts` | ✅ |
| B0.4 | pnpm workspace 전환 | `pnpm-workspace.yaml` | ✅ |
| B0.5 | CI/CD 파이프라인 수정 | `.github/workflows/performance-test.yml` | ✅ |

**Feature Flag 구현**:
```typescript
// src/utils/featureFlags.ts
export function useWebGLCanvas(): boolean {
  return parseBoolean(import.meta.env.VITE_USE_WEBGL_CANVAS, false);
}
```

---

### B1. WebGL Canvas 구축 ✅ 완료

| Sub-Phase | 작업 | 구현 파일 | 상태 |
|-----------|------|----------|------|
| **B1.1** | 기본 캔버스 | `workspace/canvas/BuilderCanvas.tsx` | ✅ |
| **B1.2** | ElementSprite 시스템 | `workspace/canvas/sprites/` | ✅ |
| **B1.3** | Selection + Transform | `workspace/canvas/selection/` | ✅ |
| **B1.4** | Zoom/Pan + Grid | `workspace/canvas/grid/` | ✅ |
| **B1.5** | Text Input 하이브리드 | `workspace/overlay/` | ✅ |

**구현 파일 상세**:

```
src/builder/workspace/
├── canvas/
│   ├── BuilderCanvas.tsx          # 메인 WebGL 캔버스
│   ├── store/
│   │   └── canvasStore.ts         # Direct Zustand Access
│   ├── sprites/
│   │   ├── BoxSprite.tsx          # 박스 렌더링
│   │   ├── TextSprite.tsx         # 텍스트 렌더링
│   │   ├── ImageSprite.tsx        # 이미지 렌더링
│   │   ├── ElementSprite.tsx      # 디스패처
│   │   └── styleConverter.ts      # Style → PixiJS 변환
│   ├── selection/
│   │   ├── SelectionBox.tsx       # 8방향 핸들
│   │   ├── TransformHandle.tsx    # 변형 핸들
│   │   ├── LassoSelection.tsx     # 다중 선택
│   │   ├── SelectionLayer.tsx     # 통합 레이어
│   │   └── useDragInteraction.ts  # 드래그 훅
│   ├── grid/
│   │   ├── GridLayer.tsx          # 동적 밀도 그리드
│   │   └── useZoomPan.ts          # 줌/팬 훅
│   └── utils/
│       └── gpuProfiler.ts         # GPU 프로파일링
├── overlay/
│   ├── TextEditOverlay.tsx        # 텍스트 편집 오버레이
│   └── useTextEdit.ts             # 텍스트 편집 훅
└── Workspace.tsx                  # 워크스페이스 컨테이너
```

---

### B2. Publish App 분리 ✅ 완료

| Sub-Phase | 작업 | 구현 파일 | 상태 |
|-----------|------|----------|------|
| **B2.1** | 모노레포 설정 | `pnpm-workspace.yaml` | ✅ |
| **B2.2** | packages/shared | `packages/shared/src/` | ✅ |
| **B2.3** | packages/publish | `packages/publish/src/` | ✅ |
| **B2.4** | postMessage 제거 | `@deprecated` 마킹 완료 | ✅ |

**모노레포 구조**:
```
packages/
├── shared/
│   └── src/
│       ├── index.ts
│       ├── types/
│       ├── utils/
│       └── components/
└── publish/
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── registry/
        │   └── ComponentRegistry.tsx
        ├── renderer/
        │   ├── PageRenderer.tsx
        │   └── ElementRenderer.tsx
        └── styles/
```

**@deprecated 마킹 완료**:
- `src/builder/hooks/useIframeMessenger.ts:4` - WebGL로 마이그레이션 중
- `src/builder/hooks/useDeltaMessenger.ts:4,15` - WebGL로 대체
- `src/canvas/messaging/messageHandler.ts:4` - WebGL로 마이그레이션 중

---

## Track C: 검증 및 CI (Phase 8) ✅ 완료

> **목표**: 장시간 안정성 검증

| # | 작업 | 구현 파일 | 상태 |
|---|------|----------|------|
| C1 | Fixed Seed Generator | `scripts/lib/seedRandom.ts` | ✅ |
| C2 | Long Session Simulation | `scripts/long-session-test.ts` | ✅ |
| C3 | GitHub Actions Workflow | `.github/workflows/performance-test.yml` | ✅ |
| C4 | SLO Verification 자동화 | `scripts/verify-slo.ts` | ✅ |

**구현 상세**:

```typescript
// scripts/lib/seedRandom.ts - Mulberry32 PRNG
export const DEFAULT_TEST_SEED = 20251211;
export function createSeededRandom(seed?: number): SeededRandom {
  // next(), nextInt(), gaussian(), pick(), shuffle() 등 제공
}
```

**CI 워크플로우 (performance-test.yml)**:
- `workflow_dispatch` 수동 트리거 (seed 파라미터)
- `push`/`pull_request` 자동 트리거
- `schedule` nightly 빌드 (매일 00:00 UTC)

**완료 기준**:
- [x] Fixed Seed Generator로 재현 가능한 테스트
- [x] Seeded Random 기반 Long Session Simulation
- [x] GitHub Actions 워크플로우 (PR/Push/Nightly)
- [x] SLO 검증 자동화 (verify-slo.ts)

---

## 완료된 기존 항목

### ✅ Phase 3: History Diff System (100%)

| 항목 | 파일 위치 |
|------|----------|
| Element Diff Utility | `src/builder/stores/utils/elementDiff.ts` |
| History IndexedDB | `src/builder/stores/history/historyIndexedDB.ts` |
| Command Data Store | `src/builder/stores/commandDataStore.ts` |

### ✅ Phase 9: CSS Containment + Virtualization (100%)

| 항목 | 파일 위치 |
|------|----------|
| CSS Containment | `ComboBox.css`, `DatePicker.css`, `ListBox.css`, `Select.css`, `Menu.css` |
| Tree Virtualization | `src/builder/sidebar/VirtualizedLayerTree.tsx` |
| Tree Virtualization | `src/builder/sidebar/components/VirtualizedTree.tsx` |

**CSS Containment 적용 예시**:
```css
/* src/shared/components/styles/ListBox.css */
.react-aria-ListBox {
  contain: strict;
}
.react-aria-ListBoxItem {
  contain: content;
}
```

---

## 폐기된 항목

### ⚠️ Phase 4: Canvas Delta Sync

> **폐기 이유**: Phase 10 (WebGL Builder)에서 postMessage 자체가 제거됨
> **대체**: Direct Zustand State (WebGL → Store 직접 접근)

### ⚠️ 미사용 코드 (참고용)

다음 파일들은 구현되었으나 React Query로 대체되어 사용되지 않음:
- `src/utils/requestDeduplication.ts` - Request Deduplicator 클래스
- `src/builder/utils/QueryPersister.ts` - IndexedDB 기반 캐시

---

## 검증 요약 (2025-12-11)

### 검증 방법

```bash
# 1. Panel Gateway 검증
grep -n "isActive" src/builder/panels/*/

# 2. React Query 검증
grep -rn "@tanstack/react-query" src/

# 3. WebGL 구조 검증
ls -la src/builder/workspace/canvas/

# 4. CI 스크립트 검증
ls -la scripts/*.ts
```

### 최종 완료 현황

| Track | 완료율 | 검증 상태 |
|-------|--------|----------|
| **Track A** | 100% | ✅ 코드 검증 완료 |
| **Track B** | 100% | ✅ 코드 검증 완료 |
| **Track C** | 100% | ✅ 코드 검증 완료 |

---

> **🎉 Performance Optimization 전체 완료!**
>
> - Track A: Panel Gateway + React Query 네트워크 최적화
> - Track B: WebGL Canvas + Publish App 분리
> - Track C: Fixed Seed CI + SLO 검증
>
> **검증 완료일**: 2025-12-11
