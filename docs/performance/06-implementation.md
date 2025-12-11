# 구현 순서 및 체크리스트

> **관련 문서**: [05-supplement.md](./05-supplement.md) | [07-decisions.md](./07-decisions.md)
> **작성일**: 초안(2025-12-09) | **최종 수정**: 2025-12-11 (Phase 4 폐기, Phase 10 추가)

---

## 1. 우선순위별 구현 계획

### 1.1 P0 우선 작업 (즉시 시작)

| Phase | 작업                          | 예상 소요 | 효과             |
| ----- | ----------------------------- | --------- | ---------------- |
| **1** | Panel Gateway + MonitorPanel  | 6시간     | CPU 70% ↓        |
| **1** | PanelShell HOC 표준화         | 2시간     | 코드 일관성      |
| **6** | Request Deduplication + Abort | 4시간     | 네트워크 안정화  |
| ~~**4**~~ | ~~Canvas Backpressure 설계~~ | ~~3시간~~ | ⚠️ **Phase 10으로 대체** |

**P0 소요: 12시간 (약 1.5일)** *(Phase 4 제외)*

### 1.2 P1 핵심 최적화

| Phase | 작업                       | 예상 소요 | 효과         |
| ----- | -------------------------- | --------- | ------------ |
| **2** | Store 인덱스 시스템        | 8시간     | 조회 200x ↑  |
| **3** | History Diff + IndexedDB   | 8시간     | 메모리 97% ↓ |
| **7** | Error Boundary 스코프 적용 | 3시간     | 에러 격리    |
| **7** | 성능 모니터링 + 자동복구   | 4시간     | 안정성 확보  |

**P1 소요: 23시간 (약 3일)**

### 1.3 P2 대규모 최적화 + CI

| Phase | 작업                  | 예상 소요 | 효과           |
| ----- | --------------------- | --------- | -------------- |
| ~~**4**~~ | ~~Canvas Delta + Batch~~ | ~~4시간~~ | ⚠️ **Phase 10으로 대체** |
| **5** | Lazy Loading + LRU    | 6시간     | 초기로드 70% ↓ |
| **6** | React Query 전체 적용 | 4시간     | API 캐시 90% ↑ |
| **8** | 장시간 시뮬레이션 CI  | 6시간     | 회귀 검출      |

**P2 소요: 16시간 (약 2일)** *(Phase 4 제외)*

### 1.4 총 소요 예상

| 우선순위       | 예상 소요  | 누적                 |
| -------------- | ---------- | -------------------- |
| P0             | 12시간     | 12시간               |
| P1             | 23시간     | 35시간               |
| P2             | 16시간     | 51시간               |
| **Supplement** | **10시간** | **61시간 (~7.5일)**  |
| **🚀 Phase 10** | **80시간** | **141시간 (~17.5일)** |

> **Phase 9 상세**: 캔버스 가상화 4h + 웹 워커 2h + 추가 아이디어 4h = 10시간
> **Phase 10 상세**: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) 참조

⚠️ **Phase 4 (Delta Sync)는 Phase 10 (WebGL Builder)으로 대체되어 폐기됨**

---

## 2. Phase별 상세 체크리스트

### Phase 1: Panel Gateway 패턴 (6시간)

#### 1.1 MonitorPanel 수정 (2시간)

**파일**: `src/builder/panels/monitor/MonitorPanel.tsx`

- [ ] Gateway 패턴 적용
- [ ] `useMemoryStats.ts` - `enabled` 파라미터 추가
- [ ] `useWebVitals.ts` - `enabled` 파라미터 추가
- [ ] `useFPSMonitor.ts` 확인

**테스트 기준**:

- Before: CPU 15-25% (패널 비활성)
- After: CPU < 5%

#### 1.2 PropertiesPanel 수정 (1.5시간)

**파일**: `src/builder/panels/properties/PropertiesPanel.tsx`

- [ ] 현재 구조 분석 (5개 selector)
- [ ] Gateway 패턴 적용
- [ ] Content 컴포넌트로 selectors 이동

#### 1.3 StylesPanel 수정 (1시간)

**파일**: `src/builder/panels/styles/StylesPanel.tsx`

- [ ] Gateway 패턴 적용
- [ ] 모든 훅을 Content로 이동

#### 1.4 ComponentsPanel 수정 (1시간)

**파일**: `src/builder/panels/components/ComponentsPanel.tsx`

- [ ] 6개 selector 분석
- [ ] Gateway 패턴 적용

#### 1.5 Phase 1 검증 (0.5시간)

- [ ] 모든 패널 기능 테스트
- [ ] DevTools로 re-render 횟수 확인
- [ ] CPU 사용량 비교 측정

---

### Phase 2: Store 인덱스 시스템 (8시간)

#### 2.1 타입 정의 (1시간)

- [ ] ElementIndexes interface 정의
- [ ] ElementIndexActions interface 정의

#### 2.2 인덱서 유틸리티 (2시간)

**파일**: `src/builder/stores/utils/elementIndexer.ts`

- [ ] `indexElement()` 함수 구현
- [ ] `unindexElement()` 함수 구현
- [ ] `getPageElements()` 함수 구현 (캐시 포함)
- [ ] `getChildElements()` 함수 구현
- [ ] `rebuildIndexes()` 함수 구현

#### 2.3 Store 통합 (3시간)

- [ ] State에 인덱스 필드 추가
- [ ] `addElement` 수정 - 인덱스 업데이트
- [ ] `removeElement` 수정 - 인덱스 제거
- [ ] `updateElement` 수정 - parent_id 변경 시 인덱스 업데이트
- [ ] `setElements` 수정 - 인덱스 재구축
- [ ] `getPageElements` action 추가

#### 2.4 기존 코드 마이그레이션 (1.5시간)

- [ ] `elements.filter()` 검색 및 교체
- [ ] `useMemo` 감싸진 필터링 제거

#### 2.5 Phase 2 검증 (0.5시간)

- [ ] 5,000개 요소 테스트
- [ ] `getPageElements()` 성능 측정 (목표: < 1ms)

---

### Phase 3: History Diff 시스템 (8시간)

#### 3.1 Command 타입 정의 (1시간)

- [ ] CommandType enum 정의
- [ ] Command interface 정의
- [ ] CommandPayload interface 정의

#### 3.2 DiffHistoryManager 구현 (3시간)

- [ ] `computeDiff()` 메서드 구현
- [ ] `recordUpdate()` 메서드 구현
- [ ] `recordAdd()` 메서드 구현
- [ ] `recordDelete()` 메서드 구현
- [ ] `undo()` / `redo()` 메서드 구현
- [ ] `getMemoryUsage()` 메서드 구현

#### 3.3 Store 통합 (2시간)

- [ ] 기존 historyManager 참조 교체
- [ ] 각 action에서 record 함수 호출

#### 3.4 IndexedDB 영속화 (선택, 1.5시간)

- [ ] IndexedDB 스키마 정의
- [ ] `saveHistory()` / `loadHistory()` 구현

#### 3.5 Phase 3 검증 (0.5시간)

- [ ] 메모리 사용량 측정 (100회 Undo 후)
- [ ] Undo/Redo 동작 테스트

---

### ~~Phase 4: Canvas Delta 업데이트~~ ⚠️ 폐기됨

> **⚠️ Phase 10 (WebGL Builder)으로 대체됨**
> - WebGL 전환 시 postMessage 자체가 제거되므로 Delta Sync 불필요
> - 상세: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md)

<details>
<summary>기존 계획 (참고용)</summary>

#### 4.1 Delta 타입 정의 (0.5시간)

- [ ] DeltaType 정의
- [ ] DeltaMessage interface 정의

#### 4.2 Delta Sync 훅 구현 (2시간)

- [ ] `sendElementUpdate()` 구현
- [ ] `sendElementAdd()` 구현
- [ ] `sendElementDelete()` 구현
- [ ] `scheduleFlush()` RAF 배치 구현
- [ ] `sendFullSync()` 구현

#### 4.3 Canvas Runtime 수신기 (1.5시간)

- [ ] message handler 구현
- [ ] BATCH_DELTA / FULL_SYNC 처리

#### 4.4 기존 postMessage 마이그레이션 (1.5시간)

- [ ] 현재 postMessage 호출 위치 검색
- [ ] Delta 함수로 교체

#### 4.5 Phase 4 검증 (0.5시간)

- [ ] postMessage 크기 측정
- [ ] 연속 변경 시 배치 동작 확인

</details>

---

### Phase 5: Lazy Loading + LRU 캐시 (6시간)

#### 5.1 LRU 캐시 구현 (1시간)

- [ ] 클래스 기본 구조
- [ ] `access()` 메서드 구현

#### 5.2 Element Loader 구현 (2.5시간)

- [ ] `loadPageElements()` 구현
- [ ] `unloadPage()` 구현
- [ ] `preloadAdjacentPages()` 구현 (선택)

#### 5.3 Store 통합 (1.5시간)

- [ ] `loadedPages`, `loadingPages` 상태 추가
- [ ] 페이지 전환 시 자동 로드/언로드

#### 5.4 Phase 5 검증 (0.5시간)

- [ ] 50페이지 프로젝트 테스트
- [ ] 메모리 사용량 측정

---

### Phase 6: React Query 서버 상태 (4시간)

#### 6.1 설치 및 설정 (0.5시간)

- [x] 패키지 설치
- [x] QueryProvider 추가

#### 6.2 DataTablePanel ✅ 완료 (2025-12-10)

- [x] useDataPanelQuery 통합 훅 구현
- [x] React Query + Zustand Store 이중 레이어 적용
- [x] 패널 활성화 시 Zustand Store 초기화
- [x] IndexedDB 새로고침 후 데이터 복원 이슈 해결

#### 6.3 기타 API 호출 최적화 (1시간)

- [ ] 테마 로드 → useQuery
- [ ] 프로젝트 설정 로드 → useQuery

#### 6.4 Phase 6 검증 (0.5시간)

- [ ] DevTools에서 캐시 상태 확인
- [ ] 패널 전환 시 네트워크 요청 확인

---

### Phase 7: 성능 모니터링 + 자동 복구 (4시간)

#### 7.1 PerformanceMonitor 구현 (2시간)

- [ ] PerformanceMetrics interface 정의
- [ ] `collect()` 메서드 구현
- [ ] `calculateHealthScore()` 구현
- [ ] `generateWarnings()` 구현

#### 7.2 자동 복구 구현 (1.5시간)

- [ ] 30초 interval 모니터링
- [ ] healthScore < 30 시 복구 로직
- [ ] 사용자 알림 (Toast)

#### 7.3 Phase 7 검증 (0.5시간)

- [ ] 의도적 메모리 압박 테스트
- [ ] 자동 복구 동작 확인

---

### Phase 8: CI 자동화 + 대규모 테스트 (6시간)

#### 8.1 시뮬레이션 환경 구축 (2시간)

- [ ] `scripts/generate-large-project.ts` 생성
  - [ ] `faker.seed(12345)` 고정 시드 적용
  - [ ] 5,000개 요소 생성 로직 (Depth 10+)
- [ ] **실행 가이드 추가**: `node scripts/generate-large-project.ts --elements 5000 --pages 50 --seed 12345 --out test-data/perf/seed-12345.json`
- [ ] 데이터 준비 체크리스트 작성

#### 8.2 시뮬레이션 스크립트 (2시간)

- [ ] 랜덤 작업 수행 함수(드래그, 선택, 수정) 구현
- [ ] 메트릭 수집 함수 구현
- [ ] SLO 위반 감지(P99) 로직

#### 8.3 GitHub Actions 설정 (2시간)

- [ ] PR용 단시간 테스트
- [ ] Nightly 장시간 테스트 (12시간)
- [ ] 아티팩트 업로드

#### 8.4 Phase 8 검증 (1시간)

- [ ] CI 파이프라인 테스트
- [ ] 리포트 생성 확인

---

### Phase 9: 보완 최적화 (Supplement) (8시간)

> **관련 문서**: [05-supplement.md](./05-supplement.md) | [08-additional-ideas.md](./08-additional-ideas.md)
>
> **⚠️ Phase 10 (WebGL Builder) 결정에 따라 재분류됨**
> - DOM 최적화 → Publish App 전용
> - CSS Containment, Web Worker → Builder + Publish 공통

#### 9.1 CSS Containment (Builder + Publish, 0.5시간)

- [ ] **CSS Containment**: 주요 컨테이너에 `content-visibility: auto` 적용
  - 파일: 기존 CSS 파일에 추가
  - 이미 `ListBox.css`에서 부분 사용 중
  - Builder UI 패널 + Publish App 모두 적용

#### 9.2 웹 워커 오프로딩 (Builder + Publish, 2시간)

- [ ] `data.worker.ts` 생성 및 Comlink 설정
- [ ] **Worker Fallback**: 초기화 실패/미지원 시 메인 스레드 실행 경로 구현
- [ ] Diff/Index 로직 이관

#### 9.3 📦 Publish App 전용 (5.5시간)

> Builder는 Phase 10 (WebGL)로 대체되므로 아래 항목은 Publish App에만 적용

**캔버스 가상화 (4시간)**

- [ ] `@tanstack/react-virtual` + `LayoutRenderers` 가상화 도입
- [ ] **Hitbox Layer 분리**: 가상화된 요소의 드래그 타겟 유지
- [ ] `VirtualizedContainer` 컴포넌트 구현
- [ ] 가시성 판단(Viewport Culling) 로직 구현

**Event Delegation (1시간)**

- [ ] Canvas Root 리스너 단일화
  - 파일: `packages/publish/utils/delegatedEventHandler.ts` (신규)
  - 리스너 10,000개 → 10개로 감소

**Selection Overlay (0.5시간)**

- [ ] Preview 측 선택 렌더링 분리
  - 파일: `packages/publish/components/PreviewSelectionOverlay.tsx` (신규)

---

## 3. 기대 효과

> **⚠️ Phase 10 (WebGL Builder) 결정 반영**
> - Canvas 전송량 지표는 Phase 4 폐기로 제거 (WebGL 전환 시 postMessage 자체 제거)
> - WebGL 전용 메트릭 추가

### 3.1 성능 개선 요약

| 지표                 | 현재     | 최적화 후   | 개선율   | 비고 |
| -------------------- | -------- | ----------- | -------- | ---- |
| **페이지 요소 조회** | O(n) 2ms | O(1) 0.01ms | **200x** | Phase 2 |
| **History 메모리**   | 500MB    | 3MB         | **99%**  | Phase 3 |
| **메모리 (24시간)**  | 200MB+   | < 50MB      | **75%**  | Phase 1,5,7 |
| **CPU (유휴)**       | 15-25%   | < 5%        | **80%**  | Phase 1 |
| **API 호출**         | 매번     | 캐시 히트   | **90%**  | Phase 6 |
| **🚀 WebGL 렌더링** | N/A      | 60fps @5K요소 | **∞**   | Phase 10 |
| **🚀 VRAM 사용량**  | N/A      | < 256MB     | -        | Phase 10 |

### 3.2 지원 규모

| 규모        | 현재     | 최적화 후      |
| ----------- | -------- | -------------- |
| 500 요소    | ⚠️ 6시간 | ✅ 24시간+     |
| 1,000 요소  | 🔴 2시간 | ✅ 24시간+     |
| 5,000 요소  | ❌ 불가  | ✅ 24시간+     |
| 10,000 요소 | ❌ 불가  | ⚠️ 테스트 필요 |

---

## 4. 구현 파일 목록

| 파일                                                 | 작업             | Phase |
| ---------------------------------------------------- | ---------------- | ----- |
| `src/builder/panels/monitor/MonitorPanel.tsx`        | Gateway 패턴     | 1     |
| `src/builder/panels/monitor/hooks/useMemoryStats.ts` | enabled 파라미터 | 1     |
| `src/builder/panels/monitor/hooks/useWebVitals.ts`   | enabled 파라미터 | 1     |
| `src/builder/panels/properties/PropertiesPanel.tsx`  | Gateway 패턴     | 1     |
| `src/builder/panels/styles/StylesPanel.tsx`          | Gateway 패턴     | 1     |
| `src/builder/panels/components/ComponentsPanel.tsx`  | Gateway 패턴     | 1     |
| `src/builder/stores/elements.ts`                     | 인덱스 시스템    | 2     |
| `src/builder/stores/utils/elementIndexer.ts`         | 인덱스 유틸      | 2     |
| `src/builder/stores/history/diffHistory.ts`          | Diff 히스토리    | 3     |
| `src/builder/hooks/useCanvasDeltaSync.ts`            | Delta 동기화     | 4     |
| `src/canvas/hooks/useDeltaReceiver.ts`               | Delta 수신       | 4     |
| `src/builder/stores/elementLoader.ts`                | Lazy Loading     | 5     |
| `src/builder/utils/LRUPageCache.ts`                  | LRU 캐시         | 5     |
| `src/main.tsx`                                       | QueryProvider    | 6     |
| `src/builder/panels/datatable/DataTablePanel.tsx`    | React Query 적용 | 6     |
| `src/builder/utils/performanceMonitor.ts`            | 성능 모니터      | 7     |

---

> **다음 문서**: [07-decisions.md](./07-decisions.md) - 결정 사항
