---
title: Viewport Culling Pattern
impact: HIGH
impactDescription: 잘못된 culling = 요소 깜빡임, 화면 내 요소 사라짐
tags: [pixi, canvas, performance, culling]
---

Viewport 외부 요소를 렌더링에서 제외하여 GPU 부하를 줄입니다.
좌표 시스템 일관성과 부모-자식 관계를 올바르게 처리해야 합니다.

## 핵심 원칙

### 1. 스크린 좌표 기반 비교

뷰포트와 요소 bounds를 **동일한 좌표계**로 비교해야 합니다.
`container.getBounds()`는 스크린(글로벌) 좌표를 반환하므로, 뷰포트도 스크린 좌표로 계산:

```typescript
// ✅ 뷰포트: 스크린 좌표 (좌표 변환 불필요)
const viewport = {
  left: -margin,
  top: -margin,
  right: screenWidth + margin,
  bottom: screenHeight + margin,
};

// ✅ 요소: 실시간 스크린 좌표
const bounds = container.getBounds();
const isVisible = isElementInViewport(bounds, viewport);
```

### 2. 실시간 getBounds() 사용

`layoutBoundsRegistry`는 layout 시점의 좌표를 캐싱하므로, **pan/zoom 후에는 stale**:

```typescript
// ❌ stale 좌표 — pan 이동량만큼 오차 발생
const bounds = getElementBoundsSimple(element.id);  // layoutBoundsRegistry

// ✅ 실시간 좌표 — 현재 카메라 위치 반영
const container = getElementContainer(element.id);
const bounds = container.getBounds();
```

### 3. 부모 가시성 체크 (Cull/Render cycle 방지)

요소가 culled → unmount → unregister → container 없음 → 다음 frame 포함 → render → register → cull → 무한 반복:

```typescript
// ✅ 부모가 화면에 있으면 자식은 항상 포함
// - overflow: visible (CSS 기본값)로 자식이 부모 밖에서 보일 수 있음
// - cull/render 무한 cycle 방지
const visibleElements = elements.filter((element) => {
  const container = getElementContainer(element.id);
  if (!container) return true;  // 미등록 → 포함 (cull하지 않음)

  const bounds = container.getBounds();
  if (isElementInViewport(bounds, viewport)) return true;  // 뷰포트 내
  if (isParentOnScreen(element.parent_id)) return true;    // 부모 가시 → 포함

  return false;  // 뷰포트 밖 + 부모도 밖 → cull
});
```

## Incorrect

```typescript
// ❌ 로컬 좌표 뷰포트 vs 글로벌 좌표 bounds — 좌표계 불일치
const viewport = {
  left: (-panOffset.x) / zoom - margin,
  top: (-panOffset.y) / zoom - margin,
  right: (screenWidth - panOffset.x) / zoom + margin,
  bottom: (screenHeight - panOffset.y) / zoom + margin,
};
const bounds = container.getBounds();  // 글로벌 좌표
isElementInViewport(bounds, viewport);  // ❌ 비교 불가

// ❌ 부모 가시성 미체크 — cull/render cycle + overflow 무시
const visibleElements = elements.filter((element) => {
  const bounds = container.getBounds();
  return isElementInViewport(bounds, viewport);
});
```

## Correct

```typescript
// ✅ 스크린 좌표 통일 + 부모 가시성 체크
const viewport = calculateViewportBounds(screenWidth, screenHeight);

const parentVisibilityCache = new Map<string, boolean>();

const visibleElements = elements.filter((element) => {
  const container = getElementContainer(element.id);
  if (!container) return true;

  try {
    const bounds = container.getBounds();
    if (bounds.width <= 0 && bounds.height <= 0) return true;
    if (isElementInViewport(bounds, viewport)) return true;
    if (isParentOnScreen(element.parent_id)) return true;
    return false;
  } catch {
    return true;
  }
});
```

## 참조 파일

- `apps/builder/src/builder/workspace/canvas/hooks/useViewportCulling.ts` - Viewport Culling Hook
- `apps/builder/src/builder/workspace/canvas/elementRegistry.ts` - Element Container/Bounds 레지스트리
