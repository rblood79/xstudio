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

## Parent-delegated props 상속 (Canvas 엔진)

- CSS는 `data-*` 선택자로 부모 → 자식 프로퍼티를 자동 상속하지만, Canvas 엔진은 명시적 전파 필요
- `getChildElements`는 `elementsMap` 원본 반환 — 부모의 size/variant 등 위임 props 미포함
- 해결: `effectiveGetChildElements` 래퍼로 자식에 부모 props 주입 (TagGroup → Tag size 등)
- `enrichWithIntrinsicSize`의 `calculateContentWidth` 재귀 호출과 DFS `filteredChildren` 양쪽에 적용 필수
- **Select/ComboBox size delegation**: fullTreeLayout.ts에서 Select/ComboBox의 size를 SelectTrigger/ComboBoxWrapper에 주입 (L894-912)
- **Skia 렌더링 경로도 동기화 필수**: ElementSprite.tsx의 `parentDelegatedSize` selector가 부모/조부모에서 size를 읽어 Spec shapes에 전달

## Block-child normalization guard

- fullTreeLayout의 block-child 정규화(`width: 100%` 주입)에서 `enrichWithIntrinsicSize`가 이미 계산한 numeric/px 폭이 있으면 덮어쓰지 않음
- 가드: `typeof existingW === "number"` 또는 `existingW !== "auto" && existingW !== "100%"` 시 skip

## Taffy f32 정밀도 보정

- `enrichWithIntrinsicSize`에서 width 주입 시 `Math.ceil` 적용
- Taffy(f32)와 JS(f64) 간 부동소수점 정밀도 차이로 flex-wrap 컨테이너에서 불필요한 wrap 방지

## order_num 재정렬

- `batchUpdateElementOrders()` 사용 필수 (단일 set() + \_rebuildIndexes())
- setTimeout/queueMicrotask 안에서 반드시 `get()`으로 최신 상태 참조 (stale closure 방지)
