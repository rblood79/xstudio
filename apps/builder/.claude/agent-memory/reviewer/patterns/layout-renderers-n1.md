---
name: LayoutRenderers N+1 탐색 패턴
description: 신규 렌더러에서 elements.filter(parent_id) 선형 탐색 반복 — childrenMap 인덱스 미사용
type: feedback
---

## 패턴

신규 렌더러(`renderActionMenu`, `renderNav`, `renderAccordion`, `renderDisclosureGroup`, `renderDisclosure`, `renderDisclosureContent`, `renderColorSwatchPicker`)가 모두 아래 패턴을 사용:

```typescript
const children = elements
  .filter((child) => child.parent_id === element.id)
  .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
```

`RenderContext.elements`는 `PreviewElement[]` 배열이므로 O(N) 탐색.

**Why:** `childrenMap`이 `RenderContext`에 없고, 기존 렌더러들도 동일한 패턴을 사용해 관행처럼 굳어짐.

**How to apply:** 신규 렌더러 리뷰 시 최우선으로 체크. `RenderContext`에 `childrenMap: Map<string, PreviewElement[]>` 도입 제안과 연결.

발견일: 2026-03-27 (composition-review-diff2.txt, 8개 파일)
