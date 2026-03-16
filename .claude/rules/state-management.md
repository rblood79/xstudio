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

## batchUpdateElementProps DB 저장 패턴 (CRITICAL)

DB 저장 시 delta props가 아닌 **merged 전체 props**를 저장해야 한다.

```typescript
// 잘못된 패턴 — delta만 저장 → 새로고침 후 나머지 props 소실
await db.updateElement({ id, props: delta });

// 올바른 패턴 — merged 전체 저장
const merged = { ...existing.props, ...delta };
await db.updateElement({ id, props: merged });
```

- 위반 시: 새로고침 후 delta에 포함되지 않은 props가 사라짐

## pageElementsSnapshot 갱신 (CRITICAL)

요소 삭제(`executeRemoval`) 후 `pageElementsSnapshot`을 반드시 갱신해야 한다.

- 갱신 누락 시: 삭제된 요소가 레이어 트리(Layer Panel)에 유령 항목으로 남음
- 위치: `elementRemoval.ts`의 `executeRemoval` — 삭제 완료 후 snapshot 업데이트 필수

## 스타일 패널 (Zustand → Jotai Bridge)

### PropertyUnitInput 요소 전환 보호

- `handleInputFocus`에서 `selectedElementId`를 ref에 캡처
- `handleInputBlur`에서 blur 시점 `selectedElementId`와 비교 → 다르면 onChange 스킵
- 이벤트 순서: mousedown(선택 변경) → blur(입력 커밋) — blur 시점에 이미 새 요소 선택됨

### buildSelectedElement에 properties 전달 필수

- `useZustandJotaiBridge.ts`의 `StylePanelSelectedElement`에 `properties` 포함
- `effectiveProps`에서 `size`/`variant` 추출하여 `properties`로 전달
- 미전달 시: `computeSyntheticStyle`이 size를 모름 → 항상 md fallback → 잘못된 fontSize 표시

### SyntheticComputedStyle 확장 규칙

- Spec preset에 새 속성 추가 시 `SyntheticComputedStyle` 인터페이스에도 추가
- `typographyValuesAtom` + 개별 atom에 synthetic fallback 체인 추가
- 우선순위: inline → computed(상속) → synthetic(preset) → 글로벌 기본값
