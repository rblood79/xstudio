---
title: Use Inline Styles for Inspector Overlays
impact: HIGH
impactDescription: 실시간 업데이트, 성능, DOM 독립성
tags: [inspector, ui, canvas]
---

Inspector 오버레이(선택 박스, 가이드라인)는 CSS 대신 인라인 스타일을 사용합니다.

## Incorrect

```tsx
// ❌ CSS 클래스 사용
// styles.css
.selection-box {
  position: absolute;
  border: 2px solid blue;
}

// Component
function SelectionOverlay({ bounds }) {
  return (
    <div
      className="selection-box"
      style={{ left: bounds.x, top: bounds.y }}  // 혼합 사용
    />
  );
}
```

## Correct

```tsx
// ✅ 완전한 인라인 스타일
function SelectionOverlay({ bounds, isMultiple }: SelectionOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        border: `2px solid ${isMultiple ? '#6366f1' : '#3b82f6'}`,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  );
}

// ✅ 스타일 객체 분리 (재사용 시)
const overlayStyles = {
  base: {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    zIndex: 1000,
  },
  selection: (bounds: Bounds) => ({
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }),
};

function SelectionOverlay({ bounds }: { bounds: Bounds }) {
  return (
    <div style={{ ...overlayStyles.base, ...overlayStyles.selection(bounds) }} />
  );
}
```
