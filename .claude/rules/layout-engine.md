---
description: 레이아웃 엔진 관련 파일 작업 시 적용
globs:
  - "packages/layout-flow/**"
  - "**/layout/**"
  - "**/engines/**"
  - "**/LayoutContainer*"
---

# 레이아웃 엔진 규칙

## 엔진 선택

- `display: flex` → TaffyFlexEngine (WASM)
- `display: grid` → TaffyGridEngine (WASM)
- `display: block` / `undefined` → TaffyBlockEngine (WASM)
- 단일 Taffy WASM 엔진 체계

## layoutVersion 계약

- `fullTreeLayoutMap` useMemo는 `layoutVersion` 카운터에 의존
- 레이아웃에 영향을 주는 **모든 코드 경로**에서 `layoutVersion + 1` 증가 필수
- Store 내부: `set((state) => ({ ..., layoutVersion: state.layoutVersion + 1 }))` 패턴
- Store 외부: `useStore.getState().invalidateLayout()` 호출
- `LAYOUT_AFFECTING_PROPS` Set에 해당하는 프로퍼티 변경 시 필수

## CONTAINER_TAGS

- children을 내부에서 렌더링하는 컴포넌트 (Card, Panel 등)
- height: `'auto'` + `minHeight` → Taffy가 children 높이 계산
- 고정 height 사용 금지 (children 겹침)

## calculateContentHeight

- content-box 높이만 반환 (padding 제외)
- padding은 외부에서 추가

## order_num 재정렬

- `batchUpdateElementOrders()` 사용 필수 (단일 set() + \_rebuildIndexes())
- setTimeout/queueMicrotask 안에서 반드시 `get()`으로 최신 상태 참조 (stale closure 방지)
