# 결정 사항 (오픈 질문 해결)

> **관련 문서**: [06-implementation.md](./06-implementation.md) | [README.md](./README.md) > **최종 수정**: 2025-12-10

본 문서는 성능 최적화 계획 수립 과정에서 제기된 오픈 질문들에 대한 명확한 결정 사항을 기록합니다.

---

## 1. 장시간 세션 기준

**결정**: **12시간** 기준 적용

| 기준                 | 값               | 근거                                           |
| -------------------- | ---------------- | ---------------------------------------------- |
| **Primary Target**   | 12시간           | 엔터프라이즈 업무일 기준 (오전 9시 ~ 오후 9시) |
| **Extended Target**  | 24시간           | 야간 작업 시나리오 대응                        |
| **SLO 측정 시점**    | 0h, 4h, 8h, 12h  | 4시간 간격 체크포인트                          |
| **자동 복구 트리거** | healthScore < 30 | 성능 저하 시 자동 대응                         |

**멀티 프로젝트 전환**:

- 측정 **포함** (프로젝트 전환 시 메모리 누수 감지 필요)
- 전환 시 이전 프로젝트 리소스 정리 검증

---

## 2. 브라우저별 분리 추적

**결정**: **Chrome (Chromium) 우선**, 점진적 확대

| 브라우저    | 우선순위 | 테스트 범위              |
| ----------- | -------- | ------------------------ |
| **Chrome**  | P0       | 12시간 Nightly, PR 30분  |
| **Firefox** | P1       | Weekly Nightly (선택적)  |
| **Safari**  | P2       | Manual 검증              |
| **Edge**    | -        | Chrome과 동일 (Chromium) |

**근거**:

- Chrome이 엔터프라이즈 환경에서 90%+ 점유율
- `performance.memory` API가 Chromium에서만 정확
- Firefox/Safari는 메모리 측정 제한적

---

## 3. Supabase 캐싱 위치

**결정**: **클라이언트 캐싱 (React Query) + 영속화 (Persister)**

| 레이어         | 캐시 적용      | 근거                                      |
| -------------- | -------------- | ----------------------------------------- |
| **클라이언트** | ✅ React Query | 즉시 적용 가능, 백엔드 변경 없음          |
| **영속화**     | ✅ IndexedDB   | 새로고침 후에도 캐시 유지 (Offline-first) |
| **동기화**     | ✅ Realtime    | 서버 변경사항 수신 시 캐시 무효화         |

**3.1 영속화 설정 (PersistQueryClient, IndexedDB 우선)**:

```typescript
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import localforage from "localforage"; // IndexedDB 기반 스토리지

const idbPersister = createAsyncStoragePersister({
  storage: localforage, // IndexedDB → 새로고침/오프라인 복구
});

const fallbackPersister = createSyncStoragePersister({
  storage: window.localStorage, // IndexedDB 불가 환경 fallback
});

persistQueryClient({
  queryClient,
  persister: idbPersister ?? fallbackPersister,
});
```

**3.2 캐시 무효화 (Realtime)**:

- `Supabase` 구독 이벤트를 React Query의 `invalidateQueries`와 연결하여 데이터 신선도 유지.

**3.3 라우트 전환 최적화**:

- 라우트 변경 (`UserNavigate`) 시, 진행 중인 무거운 쿼리는 `requestManager.abortByPattern` 또는 QueryClient의 `cancelQueries`로 즉시 중단.

---

## 4. 우선순위 재정의 (P0 → P2)

> **⚠️ Phase 10 (WebGL Builder) 결정 반영됨** - Phase 4 폐기, DOM 최적화 → Publish App 전용

| 우선순위 | 작업                           | Phase | 영향도              | 비고 |
| -------- | ------------------------------ | ----- | ------------------- | ---- |
| **P0**   | MonitorPanel Gateway + enabled | 1     | CPU 70% ↓           | ✅ 완료 |
| **P0**   | Request Deduplication + Abort  | 6     | 네트워크 안정화     | |
| ~~P0~~   | ~~Canvas Backpressure 설계~~   | ~~4~~ | ~~메시지 큐 안정화~~ | ⚠️ Phase 10으로 대체 |
| **P0**   | **🚀 WebGL Builder 전환**      | 10    | 10x 성능 향상       | 🆕 |
| 📦       | **캔버스 가상화**              | 보완  | 5,000개 렌더링      | Publish App 전용 |
| **P1**   | PanelShell HOC 표준화          | 1     | 코드 일관성         | |
| **P1**   | Error Boundary 스코프 적용     | 7     | 에러 격리           | |
| **P1**   | Store 인덱스 시스템            | 2     | 조회 성능           | |
| **P1**   | History Diff 시스템            | 3     | 메모리 절감         | ✅ 완료 |
| **P1**   | **웹 워커 오프로딩**           | 보완  | UX 반응성           | Builder + Publish |
| **P2**   | 장시간 시뮬레이션 CI           | 8     | 회귀 검출           | |
| **P2**   | LRU 페이지 언로드              | 5     | 대규모 최적화       | |
| 📦       | **에셋 최적화**                | 보완  | 초기 로딩           | Publish App 전용 |

---

## 5. 추가 결정 사항

### 5.1 가상 스크롤 keep-alive 정책

- NodesPanel: 이미 VirtualizedLayerTree 적용됨
- 메모리 잔존 비용: 허용 (실측 후 필요 시 파셜 언마운트)
- 측정 방법: Phase 7 성능 모니터에서 추적

### 5.2 Re-render 방지 기준

- Selector 분리 필수 (`local/no-zustand-grouped-selectors` ESLint 규칙)
- `useMemo`/`useCallback`: 복잡한 계산 또는 이벤트 핸들러만
- Micro-benchmark 기준: 노드 트리 클릭 1,000회 시 5초 미만

### 5.3 DataTablePanel 캐싱 전략 ✅ 결정됨

**아키텍처**: React Query + Zustand Store 이중 레이어

```
IndexedDB → React Query (캐시) → Zustand Store → UI
```

| 레이어            | 역할           | 특징                         |
| ----------------- | -------------- | ---------------------------- |
| **React Query**   | 서버 상태 캐싱 | staleTime 5분, 자동 dedupe   |
| **Zustand Store** | UI 상태 관리   | 즉시 업데이트, Canvas 동기화 |
| **IndexedDB**     | 영속성 저장소  | 오프라인 지원                |

---

## 6. 롤백 계획

각 Phase는 독립적으로 롤백 가능하도록 설계됨.

| Phase | 롤백 방법                                         |
| ----- | ------------------------------------------------- |
| 1     | Gateway 패턴 제거, 기존 구조로 복원               |
| 2     | 인덱스 필드 제거, filter() 복원                   |
| 3     | DiffHistoryManager 제거, 기존 historyManager 사용 |
| 4     | Delta 함수 제거, SET_ELEMENTS 복원                |
| 5     | Lazy Loading 제거, 전체 로드 복원                 |
| 6     | useQuery 제거, useEffect 복원                     |
| 7     | 모니터링 비활성화                                 |

---

## 7. 성능 측정 방법

### CPU 측정

```javascript
// Chrome DevTools > Performance 탭
// 1. Record 시작
// 2. 30초 대기 (패널 비활성 상태)
// 3. Record 중지
// 4. Summary에서 Scripting % 확인
```

### 메모리 측정

```javascript
// Chrome DevTools > Memory 탭
// 1. Heap Snapshot 촬영
// 2. 1시간 사용
// 3. Heap Snapshot 재촬영
// 4. 차이 비교
```

### 렌더링 측정

```javascript
// React DevTools > Profiler 탭
// 1. Record 시작
// 2. 작업 수행 (요소 선택, 패널 전환 등)
// 3. Record 중지
// 4. Commit별 렌더링 시간 확인
```

---

> **문서 작성**: Claude AI
> **최종 수정**: 2025-12-10
> **다음 단계**: P0 작업 우선 시작 (MonitorPanel + 캔버스 가상화)
