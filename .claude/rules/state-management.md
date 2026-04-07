---
description: Zustand 상태 관리 관련 파일 작업 시 적용
globs:
  - "**/stores/**"
  - "**/slices/**"
  - "**/useStore*"
  - "**/store.ts"
---

# 상태 관리 규칙

> 구현 상세는 [state-details.md](.claude/skills/composition-patterns/reference/state-details.md) 참조

## Zustand 패턴

- StateCreator factory 패턴 + 슬라이스 개별 파일 분리
- O(1) 인덱스: elementsMap(요소), childrenMap(자식), pageIndex(페이지). 배열 순회 금지
- childrenMap은 구조 변경 시에만 갱신 → props는 elementsMap에서 최신 조회 필수. **Why**: childrenMap이 props stale
- selector에서 배열/객체 반환 시 `useRef` + `shallow` 캐싱. Zustand v5 `equalityFn` 무시됨 주의

## 파이프라인 순서 (필수 보존)

1. Memory Update (즉시) → 2. Index Rebuild → 3. History Record
2. DB Persist (백그라운드) → 5. Preview Sync → 6. Order Rebalance (batchUpdateElementOrders 단일 set())

## 핵심 규칙

- 상태 변경 전 히스토리 기록 필수 (Undo/Redo). **Why**: 기록 없이 변경 시 되돌리기 불가
- Stale closure 방지: setTimeout/queueMicrotask 안에서 `get()`으로 최신 상태 참조. **Why**: 외부 캡처 변수 stale
- DB 저장 시 merged 전체 props 저장 (delta만 저장 금지). **Why**: 새로고침 후 미포함 props 소실
- 요소 삭제 후 `pageElementsSnapshot` 갱신 필수. **Why**: 미갱신 시 레이어 패널에 유령 항목

## 스타일 패널 (Zustand → Jotai Bridge)

- PropertyUnitInput: focus 시 selectedElementId ref 캡처 → blur 시 비교 → 다르면 onChange 스킵. **Why**: mousedown→blur 이벤트 순서로 blur 시점에 이미 새 요소 선택됨
- buildSelectedElement에 `properties` 전달 필수. **Why**: 미전달 시 size를 모름 → md fallback → 잘못된 fontSize 표시
- SyntheticComputedStyle: Spec preset 속성 추가 시 인터페이스도 동기화. 우선순위: inline → computed → synthetic → 기본값

## 금지 패턴

- ❌ 배열 순회로 요소 검색 (elementsMap O(1) 사용)
- ❌ DB 저장 시 delta props만 저장 (merged 전체 필수)
- ❌ 히스토리 기록 없이 상태 변경
- ❌ setTimeout 내에서 외부 캡처 변수 사용 (get() 필수)
