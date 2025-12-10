# XStudio Builder 성능 최적화 가이드

> **작성일**: 2025-12-09
> **최종 수정**: 2025-12-10
> **목표**: 엔터프라이즈급 5,000개+ 요소, 12시간+ 안정 사용

## 개요

XStudio Builder의 대규모 프로젝트 지원을 위한 성능 최적화 계획입니다.
Panel 시스템, Store 아키텍처, History, Canvas 통신, 메모리 관리, 네트워크 정책을 다룹니다.

## 문서 구조

| 문서 | 설명 | 상태 |
|------|------|------|
| [01-problem-analysis.md](./01-problem-analysis.md) | 현재 문제 분석 및 목표 성능 지표 | 📋 계획 |
| [02-architecture.md](./02-architecture.md) | 아키텍처 설계 | 📋 계획 |
| [03-phase-1-4.md](./03-phase-1-4.md) | Phase 1-4: Panel, Store, History, Canvas | 📋 계획 |
| [04-phase-5-8.md](./04-phase-5-8.md) | Phase 5-8: Lazy, React Query, Monitor, CI | ✅ Phase 6 완료 |
| [05-supplement.md](./05-supplement.md) | 보완 제안: 캔버스 가상화, 웹 워커, 에셋 최적화 | 📋 계획 |
| [06-implementation.md](./06-implementation.md) | 구현 순서 및 체크리스트 | 📋 계획 |
| [07-decisions.md](./07-decisions.md) | 결정 사항 (오픈 질문 해결) | ✅ 완료 |

## 목표 성능 지표

| 지표 | 현재 (1,000개) | 목표 (5,000개) |
|------|---------------|----------------|
| **초기 로드** | 1-2초 | < 1초 |
| **페이지 전환** | 200-500ms | < 100ms |
| **요소 선택** | 50-100ms | < 30ms |
| **메모리 (24시간)** | 100-200MB 증가 | < 50MB 증가 |
| **CPU (유휴)** | 15-25% | < 5% |
| **안정 사용** | 2-3시간 | **24시간+** |

## Phase 요약

| Phase | 작업 | 예상 효과 | 상태 |
|-------|------|----------|------|
| **1** | Panel Gateway 패턴 | CPU 70% ↓ | 📋 계획 |
| **2** | Store 인덱스 시스템 | 조회 200x ↑ | 📋 계획 |
| **3** | History Diff 시스템 | 메모리 99% ↓ | 📋 계획 |
| **4** | Canvas Delta 업데이트 | 전송량 95% ↓ | 📋 계획 |
| **5** | Lazy Loading + LRU | 대규모 지원 | 📋 계획 |
| **6** | React Query 서버 상태 | API 캐시 90% ↑ | ✅ DataTablePanel 완료 |
| **7** | 성능 모니터링 + 자동 복구 | 안정성 확보 | 📋 계획 |
| **8** | CI 자동화 + 장시간 테스트 | 회귀 방지 | 📋 계획 |

## P0 우선 작업 (필수)

1. **MonitorPanel Gateway + enabled** (Phase 1)
   - CPU 70% 감소 효과
   - 파일: `src/builder/panels/monitor/MonitorPanel.tsx`

2. **캔버스 가상화** (보완 제안)
   - 5,000개 요소 렌더링의 유일한 해결책
   - `@tanstack/react-virtual` 활용

3. **Request Deduplication + Abort** (Phase 6)
   - 네트워크 안정화
   - React Query 적용

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
