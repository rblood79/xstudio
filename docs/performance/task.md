# Performance Optimization Tasks

> **Last Updated:** 2025-12-11 (Track A 완료: A1 미사용 코드 통합 + A2 네트워크 최적화)
> **📌 단일 진실 소스**: 이 문서가 Phase 진행 현황의 기준입니다

---

## Executive Summary

### 새로운 Phase 구조

기존 10개 Phase를 **3개 Track**으로 재조정:

```
┌─────────────────────────────────────────────────────────────┐
│                    Performance Optimization                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Track A: 즉시 실행 (전제조건 없음)                            │
│  ├── A1. 미사용 코드 통합 (Phase 1,2,5,7)                      │
│  └── A2. 네트워크 최적화 (Phase 6)                             │
│                                                              │
│  Track B: WebGL Builder (Phase 10)                           │
│  ├── B0. 전제조건 충족                                        │
│  ├── B1. WebGL Canvas 구축                                   │
│  └── B2. Publish App 분리                                    │
│                                                              │
│  Track C: 검증 및 CI (Phase 8)                                │
│  └── 장시간 시뮬레이션, SLO 검증                               │
│                                                              │
│  완료됨: Phase 3 (History Diff), Phase 9 부분 (CSS Containment)│
│  폐기됨: Phase 4 (Delta Sync → Phase 10으로 대체)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 실행 순서 요약

| 순서 | Track | 작업 | 예상 시간 | 우선순위 |
|------|-------|------|----------|----------|
| **1** | A1 | 미사용 코드 통합 | 8hr | 🔴 P0 |
| **2** | A2 | 네트워크 최적화 | 4hr | 🟡 P1 |
| **3** | B0 | Phase 10 전제조건 | 8hr | 🔴 P0 |
| **4** | B1 | WebGL Canvas 구축 | 56hr | 🔴 P0 |
| **5** | B2 | Publish App 분리 | 24hr | 🟡 P1 |
| **6** | C | CI 자동화 | 8hr | 🟢 P2 |

**총 예상 시간**: 108hr (~13.5일)

---

## Track A: 즉시 실행 (전제조건 없음)

> **목표**: 이미 구현된 코드를 실제 사용하도록 통합
> **예상 시간**: 12hr (~1.5일)

### A1. 미사용 코드 통합 (8hr)

기존 Phase 1, 2, 5, 7의 "구현만 완료" 상태를 "실제 사용"으로 전환

| # | 작업 | 파일 | 시간 | 상태 |
|---|------|------|------|------|
| A1.1 | **Panel Gateway 적용** (3개 패널) | | 3hr | ✅ |
| | - PropertiesPanel Gateway | `PropertiesPanel.tsx` | 1hr | ✅ |
| | - StylesPanel Gateway | `StylesPanel.tsx` | 1hr | ✅ |
| | - ComponentsPanel Gateway | `ComponentsPanel.tsx` | 1hr | ✅ |
| A1.2 | **Store Index Migration** (7곳) | | 2hr | ✅ |
| | - `.filter(page_id)` → `getPageElements()` | 7개 파일 | 2hr | ✅ |
| A1.3 | **usePageLoader 통합** | | 1.5hr | ✅ |
| | - BuilderCore에 usePageLoader 호출 | `BuilderCore.tsx` | 1hr | ✅ |
| | - 페이지 전환 시 loadPageIfNeeded() | `usePageManager.ts` | 0.5hr | ✅ |
| A1.4 | **useAutoRecovery 통합** | | 1.5hr | ✅ |
| | - BuilderCore에 useAutoRecovery 호출 | `BuilderCore.tsx` | 0.5hr | ✅ |
| | - Toast 알림 연동 | `BuilderCore.tsx` | 1hr | ✅ |

**완료 기준**:
- [ ] 모든 패널 비활성 시 CPU < 5%
- [ ] `getPageElements()` 호출로 O(1) 조회
- [ ] 성능 저하 시 자동 복구 Toast 표시

**상세 파일 목록** (A1.2 Store Index Migration):
```
stores/index.ts:115
stores/elements.ts:436 (useCurrentPageElements)
panels/events/editors/ElementPicker.tsx:72
panels/nodes/NodesPanel.tsx:99
panels/properties/PropertiesPanel.tsx:258,523
stores/utils/elementReorder.ts:42
panels/components/ComponentsPanel.tsx:78
```

---

### A2. 네트워크 최적화 (4hr)

기존 Phase 6의 남은 작업

| # | 작업 | 파일 | 시간 | 상태 |
|---|------|------|------|------|
| A2.1 | Request Manager 구현 | `RequestManager.ts` | 2hr | ✅ |
| | - Deduplication 로직 | | | ✅ |
| | - AbortController 통합 | | | ✅ |
| A2.2 | 패널 전환 시 요청 취소 | `useRequestManager` hook | 1hr | ✅ |
| A2.3 | Persister 구현 (IndexedDB) | `QueryPersister.ts` | 1hr | ✅ |

**완료 기준**:
- [ ] 패널 전환 시 네트워크 요청 0회 (캐시 히트)
- [ ] 중복 요청 방지
- [ ] 새로고침 후 캐시 복원

---

## Track B: WebGL Builder (Phase 10)

> **목표**: Builder Canvas를 WebGL로 전환, Publish App 분리
> **예상 시간**: 88hr (~11일)
> **상세 문서**: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)

### B0. 전제조건 충족 (8hr)

**⚠️ B1/B2 착수 전 필수 완료**

| # | 전제조건 | 시간 | 상태 | 완료 기준 |
|---|----------|------|------|----------|
| B0.1 | @pixi/react v8 호환성 확인 | 2hr | ❓ | npm 설치 + 기본 렌더링 테스트 |
| B0.2 | Feature Flag 설정 | 1hr | ❌ | `VITE_USE_WEBGL_CANVAS` 환경변수 |
| B0.3 | 성능 베이스라인 측정 | 2hr | 🔄 | `scripts/perf-benchmark.ts` 실측 |
| B0.4 | pnpm workspace 전환 | 2hr | ❌ | 기존 빌드 통과 |
| B0.5 | CI/CD 파이프라인 수정 | 1hr | ❌ | packages/* 분리 빌드 |

**롤백 전략**: Feature Flag OFF → 기존 iframe Canvas로 즉시 복구

---

### B1. WebGL Canvas 구축 (56hr)

| Sub-Phase | 작업 | 시간 | 의존성 | 상태 |
|-----------|------|------|--------|------|
| **B1.1** | @pixi/react 설정 + 기본 캔버스 | 8hr | B0 완료 | 📋 |
| **B1.2** | ElementSprite 렌더링 시스템 | 16hr | B1.1 | 📋 |
| **B1.3** | Selection + Transform 핸들 | 12hr | B1.2 | 📋 |
| **B1.4** | Zoom/Pan + Grid | 8hr | B1.2 | 📋 |
| **B1.5** | Text Input 하이브리드 | 12hr | B1.2 | 📋 |

**B1.1 상세 체크리스트**:
- [ ] `packages/builder/workspace/` 디렉토리 구조 생성
- [ ] `BuilderCanvas.tsx` 생성
- [ ] `canvasSync.ts` 스토어 생성
- [ ] GPU 프로파일링 설정

**B1.2 상세 체크리스트**:
- [ ] `sprites/` 디렉토리 생성
- [ ] BoxSprite, TextSprite, ImageSprite 구현
- [ ] Style → PixiJS 속성 변환 유틸리티

---

### B2. Publish App 분리 (24hr)

| Sub-Phase | 작업 | 시간 | 의존성 | 상태 |
|-----------|------|------|--------|------|
| **B2.1** | 모노레포 설정 | 4hr | B0.4 | 📋 |
| **B2.2** | `packages/shared/` 공통 코드 | 4hr | B2.1 | 📋 |
| **B2.3** | `packages/publish/` 앱 생성 | 8hr | B2.2 | 📋 |
| **B2.4** | postMessage 제거 + 마이그레이션 | 8hr | B1 완료 | 📋 |

**B2.3 상세 체크리스트**:
- [ ] ComponentRegistry 생성 (`src/canvas/renderers/*` 이전)
- [ ] PageRenderer 구현
- [ ] JSON Export 기능
- [ ] 접근성 테스트

---

## Track C: 검증 및 CI (Phase 8)

> **목표**: 장시간 안정성 검증
> **예상 시간**: 8hr (~1일)
> **의존성**: Track A 완료 후 실행 권장

| # | 작업 | 시간 | 상태 |
|---|------|------|------|
| C1 | Fixed Seed Generator | 2hr | ❌ |
| C2 | Long Session Simulation (12hr) | 3hr | ❌ |
| C3 | GitHub Actions Workflow | 2hr | ❌ |
| C4 | SLO Verification 자동화 | 1hr | ❌ |

**완료 기준**:
- [ ] 12시간 세션 안정성 테스트 통과
- [ ] 5,000개 요소 시나리오 통과
- [ ] 메모리 증가율 < 8MB/h
- [ ] SLO 위반 0건

---

## 완료된 항목

### ✅ Phase 3: History Diff System (100%)

| 항목 | 파일 위치 |
|------|----------|
| Element Diff Utility | `elementDiff.ts` (497줄) |
| History IndexedDB | `historyIndexedDB.ts` (533줄) |
| History Integration | `history.ts:273,282,361,363,659` |
| Command Data Store | `commandDataStore.ts` |

### ✅ Phase 9 부분: CSS Containment (60%)

| 항목 | 파일 위치 |
|------|----------|
| CSS Containment | `Menu.css`, `ListBox.css`, `ComboBox.css` 등 |
| Canvas Virtualization | `VirtualizedTree.tsx`, `VirtualizedLayerTree.tsx` |

---

## 폐기된 항목

### ⚠️ Phase 4: Canvas Delta Sync

> **폐기 이유**: Phase 10 (WebGL Builder)에서 postMessage 자체가 제거됨
> **대체**: Direct Zustand State (WebGL → Store 직접 접근)

<details>
<summary>📦 기존 구현 (참고용)</summary>

| 항목 | 파일 위치 |
|------|----------|
| Delta Message Types | `canvasDeltaMessenger.ts:19-53` |
| useDeltaMessenger Hook | `useDeltaMessenger.ts` (346줄) |
| Canvas Receiver | `messageHandler.ts:323-336,457-558` |
| Backpressure | `canvasDeltaMessenger.ts` |

</details>

---

## 실행 가이드

### Step 1: Track A 실행 (즉시 시작 가능)

```bash
# 1. A1.1 Panel Gateway 적용
# PropertiesPanel.tsx, StylesPanel.tsx, ComponentsPanel.tsx 수정

# 2. A1.2 Store Index Migration
# 10곳의 .filter(page_id) → getPageElements() 변경

# 3. A1.4 useAutoRecovery 통합
# BuilderCore.tsx에 useAutoRecovery() 추가

# 4. 검증
npm run type-check
npm run dev  # CPU 사용량 확인
```

### Step 2: Track B0 전제조건 확인

```bash
# 1. @pixi/react 호환성 테스트
npm install @pixi/react@latest pixi.js@latest --save-dev
# 기본 렌더링 테스트 작성

# 2. Feature Flag 설정
echo "VITE_USE_WEBGL_CANVAS=false" >> .env.local

# 3. 성능 베이스라인 측정
npx tsx scripts/perf-benchmark.ts --elements=1000 --output=baseline.json
```

### Step 3: Track B1 WebGL 구축 (B0 완료 후)

```bash
# Feature Flag ON으로 점진적 전환
VITE_USE_WEBGL_CANVAS=true npm run dev
```

---

## 진행 현황 Summary

| Track | 완료율 | 다음 작업 |
|-------|--------|----------|
| **A (즉시 실행)** | 100% | ✅ 완료 |
| **B0 (전제조건)** | 20% | B0.1 @pixi/react 호환성 확인 |
| **B1 (WebGL)** | 0% | B0 완료 대기 |
| **B2 (Publish)** | 0% | B1 완료 대기 |
| **C (CI)** | 0% | A 완료 후 시작 권장 |

---

> **다음 단계**: Track B0 (Phase 10 전제조건) 또는 Track C (CI 자동화) 시작
> **담당자 배정 필요**: 각 Track별 담당자 지정
