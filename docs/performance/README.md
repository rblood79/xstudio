# XStudio Builder 성능 최적화 가이드

> **작성일**: 2025-12-09
> **최종 수정**: 2025-12-11 (전체 완료 + 검증)
> **진행 현황**: [task.md](./task.md) 참조 (단일 진실 소스)
> **목표**: 엔터프라이즈급 10,000개+ 요소, 24시간+ 안정 사용

## 🎉 완료 현황

> **모든 Track 완료! (2025-12-11 검증)**

| Track | 설명 | 상태 |
|-------|------|------|
| **Track A** | Panel Gateway + React Query 네트워크 최적화 | ✅ 100% 완료 |
| **Track B** | WebGL Canvas + Publish App 분리 | ✅ 100% 완료 |
| **Track C** | Fixed Seed CI + SLO 검증 | ✅ 100% 완료 |

## 개요

XStudio Builder의 대규모 프로젝트 지원을 위한 성능 최적화 계획입니다.
Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리, 네트워크 정책을 다룹니다.

### 🚀 Major Architecture Change (Phase 10) ✅ 완료

Builder를 **WebGL 기반(@pixi/react)**으로 재구축하고, 기존 Canvas iframe을 **Publish App 전용**으로 분리하는 대규모 아키텍처 변경이 완료되었습니다.

```
현재: Builder (React DOM) ◄─── postMessage ───► Canvas iframe (Preview + Publish)
완료: Builder (WebGL/PixiJS) ─── Direct State ──► Zustand Store
      Publish App (React DOM) ← Export ← Builder (별도 프로젝트)
```

**모노레포 구조 (구현 완료)**:

```
xstudio/
├── packages/
│   ├── shared/           ← 공통 코드 (Types, Utils)
│   └── publish/          ← Publish App (SSR/SEO 지원)
├── src/builder/workspace/  ← WebGL Builder Canvas
└── pnpm-workspace.yaml
```

자세한 내용은 [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) 참조

## 문서 구조

| 문서                                               | 설명                                           | 상태            |
| -------------------------------------------------- | ---------------------------------------------- | --------------- |
| [01-problem-analysis.md](./01-problem-analysis.md) | 현재 문제 분석 및 목표 성능 지표               | ✅ 완료         |
| [02-architecture.md](./02-architecture.md)         | 아키텍처 설계                                  | ✅ 완료         |
| [03-phase-1-4.md](./03-phase-1-4.md)               | Phase 1-4: Panel, Store, History, Canvas       | ✅ 완료         |
| [04-phase-5-8.md](./04-phase-5-8.md)               | Phase 5-8: Lazy, React Query, Monitor, CI      | ✅ 완료         |
| [05-supplement.md](./05-supplement.md)             | 보완 제안: 캔버스 가상화, 웹 워커, 에셋 최적화 | 📋 참고용       |
| [06-implementation.md](./06-implementation.md)     | 구현 순서 및 체크리스트 (Phase 9 포함)         | ✅ 완료         |
| [07-decisions.md](./07-decisions.md)               | 결정 사항 (오픈 질문 해결)                     | ✅ 완료         |
| [08-additional-ideas.md](./08-additional-ideas.md) | 추가 최적화 아이디어                           | 📋 참고용       |
| [task.md](./task.md)                               | 작업 진행 현황 (Checklist)                     | ✅ **완료**     |
| **[10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)** | **🚀 WebGL Builder + Publish App 분리** | ✅ **완료** |
| **[11-canvas-resize-optimization.md](./11-canvas-resize-optimization.md)** | **🚀 Canvas Resize 최적화 (Panel 토글 성능)** | 📋 **계획** |

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

## 완료된 항목 요약

### Track A: 즉시 실행 ✅

| 항목 | 구현 위치 |
|------|----------|
| **A1.1 Panel Gateway** | `PropertiesPanel.tsx:241-247`, `StylesPanel.tsx:44-50`, `ComponentsPanel.tsx:27-33` |
| **A1.2 Store Index** | `stores/utils/elementIndexer.ts`, `stores/elements.ts:156-158` |
| **A1.3 usePageLoader** | `BuilderCore.tsx:24,156` |
| **A1.4 useAutoRecovery** | `BuilderCore.tsx:25,164` |
| **A2 네트워크 최적화** | React Query (`main.tsx`, `useDataQueries.ts`) |

### Track B: WebGL Builder ✅

| 항목 | 구현 위치 |
|------|----------|
| **B0 전제조건** | `pnpm-workspace.yaml`, `featureFlags.ts`, `perf-benchmark.ts` |
| **B1 WebGL Canvas** | `src/builder/workspace/canvas/` (BuilderCanvas, sprites/, selection/, grid/) |
| **B2 Publish App** | `packages/shared/`, `packages/publish/` |

### Track C: 검증 및 CI ✅

| 항목 | 구현 위치 |
|------|----------|
| **C1 Seed Generator** | `scripts/lib/seedRandom.ts` |
| **C2 Long Session** | `scripts/long-session-test.ts` |
| **C3 GitHub Actions** | `.github/workflows/performance-test.yml` |
| **C4 SLO 검증** | `scripts/verify-slo.ts` |

### 기존 완료 항목

| 항목 | 구현 위치 |
|------|----------|
| **Phase 3 History Diff** | `elementDiff.ts`, `historyIndexedDB.ts`, `commandDataStore.ts` |
| **Phase 9 CSS Containment** | `ListBox.css`, `ComboBox.css`, `Menu.css` 등 |
| **Phase 9 Virtualization** | `VirtualizedLayerTree.tsx`, `VirtualizedTree.tsx` |

## 폐기된 항목

| 항목 | 이유 |
|------|------|
| **Phase 4 Delta Sync** | WebGL Builder에서 postMessage 자체가 제거됨 |
| **requestDeduplication.ts** | React Query로 대체됨 |
| **QueryPersister.ts** | React Query 메모리 캐시로 충분 |

## 향후 개선 사항 (선택적)

### 🚀 Phase 11: Canvas Resize 최적화 (진행 예정)

> **문서**: [11-canvas-resize-optimization.md](./11-canvas-resize-optimization.md)

패널 토글 시 발생하는 Canvas resize로 인한 성능 저하 해결:

| 지표 | Before | After (목표) |
|------|--------|-------------|
| 패널 토글 시 resize | 10+ 회 | **0회** |
| 프레임 드랍 | 심각 | **없음** |
| FPS | <30 | **>55** |

**핵심 전략**: Canvas를 레이아웃에서 분리 (Figma 방식)

### 리뷰 코멘트 체크리스트

- [ ] **포커스 트랩 테스트**: Builder 내 키보드 포커스 경로 검증
- [ ] **GPU 프로파일링 통합**: `@pixi/stats` 또는 자체 VRAM 모니터
- [ ] **WebGL Context Lost 처리**: 자동 복구 로직
- [ ] **24시간 스트레스 테스트**: `npm run soak:webgl` 스크립트
- [ ] **번들 최적화**: `packages/shared` tree-shaking 점검

## 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 개발 가이드
- [COMPLETED_FEATURES.md](../COMPLETED_FEATURES.md) - 완료된 기능 목록
- [PLANNED_FEATURES.md](../PLANNED_FEATURES.md) - 계획된 기능 목록

---

> **문서 작성**: Claude AI
> **완료일**: 2025-12-11
> **검증**: 전체 코드베이스 대상 검증 완료
