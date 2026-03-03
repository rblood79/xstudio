---
description: Zustand 상태 관리 관련 파일 작업 시 적용
globs:
  - "**/stores/**"
  - "**/slices/**"
  - "**/useStore*"
  - "**/store.ts"
---

# 상태 관리 규칙

## Zustand 패턴

- StateCreator factory 패턴 준수
- 슬라이스를 개별 파일로 분리
- O(1) 인덱스: elementsMap(요소 검색), childrenMap(자식 조회), pageIndex(페이지 조회)
- 요소 검색에 배열 순회 금지 — elementsMap 사용 필수

## childrenMap Staleness

- `childrenMap`은 props 변경 시 갱신 안 됨 (구조 변경 시에만 `_rebuildIndexes()`)
- `childrenMap`에서 읽은 Element의 props는 stale → `elementsMap`에서 최신 조회 필수
- selector에서 배열/객체 반환 시 `useRef` + `shallow`로 내부 캐싱
- Zustand v5의 `useStore(selector, equalityFn)` → `equalityFn` 무시됨 → 무한 루프 주의

## 파이프라인 순서 (필수 보존)

1. Memory Update (즉시)
2. Index Rebuild (즉시)
3. History Record (즉시)
4. DB Persist (백그라운드)
5. Preview Sync (백그라운드)
6. Order Rebalance (백그라운드) - batchUpdateElementOrders 단일 set()

## 히스토리

- 상태 변경 전 반드시 기록 (Undo/Redo)
- 기록 없이 상태 변경 금지

## Stale Closure 방지

- setTimeout/queueMicrotask 안에서 반드시 `get()`으로 최신 상태 참조
- 외부 캡처된 elements/updateElementOrder 사용 금지
