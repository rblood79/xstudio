# ADR-029: Text Edit Overlay UX 개선

> 상태: Accepted (2026-03-08) — Phase 1 (전환 애니메이션) + Phase 2 (이벤트 기반 위치 추적) 구현 완료
> 날짜: 2026-03-07
> 관련: ADR-027 (Canvas Inline Text Editing)

## 컨텍스트

텍스트 편집 오버레이(Quill + DOM)의 핵심 기능 버그가 해결되었다:

- Pretendard 다중 weight 로드 (CanvasKit + CSS Preview)
- Spec 기반 스타일 추출 (폰트 일치)
- 수직 중앙 정렬 (verticalAlign)
- Enter/Escape 키보드 처리 (capture phase)

남은 UX 문제: Skia→DOM 전환 시 1~2px 위치 점프, rAF 매 프레임 폴링 비용.

## 결정: 2단계 개선

### Phase 1: 전환 애니메이션 (즉시)

Skia 텍스트 숨김 → DOM 오버레이 등장 사이 시각적 점프를 50ms 페이드인으로 감춘다.

**변경 파일**: `TextEditOverlay.tsx`

```tsx
// 컨테이너에 opacity 트랜지션 추가
const containerStyle: React.CSSProperties = {
  ...existing,
  opacity: 0,
  animation: "text-edit-fade-in 50ms ease-out forwards",
};
```

```css
/* overlay 전용 CSS (또는 인라인 keyframes) */
@keyframes text-edit-fade-in {
  to {
    opacity: 1;
  }
}
```

**효과**: Skia↔DOM 전환 시 미세 점프가 시각적으로 감춰짐.
**비용**: CSS 1줄. 리스크 없음.

### Phase 2: 이벤트 기반 위치 추적 (단기)

현재 rAF 매 프레임 폴링을 카메라/레이아웃 변경 시에만 업데이트하도록 전환한다.

**현재 (매 프레임 폴링)**:

```
rAF loop → getSceneBounds(elementId) → scene→screen 변환 → setState
60fps × 편집 중 전체 시간 동안 실행
```

**개선 (이벤트 기반)**:

```
layoutVersion 변경 → boundsMap 갱신 → 구독자 콜백 → setState
zoom/pan 변경 → refs 업데이트 → 위치 재계산
편집 중 타이핑만 하면 업데이트 0회 (위치 불변)
```

**변경 파일**: `renderCommands.ts`, `TextEditOverlay.tsx`

```typescript
// renderCommands.ts — boundsMap 변경 시 구독자 알림
type BoundsListener = (elementId: string, bounds: BoundingBox) => void;
const boundsListeners = new Map<string, Set<BoundsListener>>();

export function subscribeBounds(
  elementId: string,
  listener: BoundsListener,
): () => void {
  let set = boundsListeners.get(elementId);
  if (!set) {
    set = new Set();
    boundsListeners.set(elementId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) boundsListeners.delete(elementId);
  };
}

// buildRenderCommands 끝에서:
// _lastBoundsMap = boundsMap; 직후
for (const [id, listeners] of boundsListeners) {
  const bounds = boundsMap.get(id);
  if (bounds) {
    for (const fn of listeners) fn(id, bounds);
  }
}
```

```typescript
// TextEditOverlay.tsx — rAF 폴링 → 구독 방식
useEffect(() => {
  const update = (_id: string, sceneBounds: BoundingBox) => {
    const z = zoomRef.current;
    const pan = panOffsetRef.current;
    const sx = sceneBounds.x * z + pan.x;
    const sy = sceneBounds.y * z + pan.y;
    const sw = sceneBounds.width * z;
    const sh = sceneBounds.height * z;
    setLivePos((prev) =>
      prev.x !== sx || prev.y !== sy ? { x: sx, y: sy } : prev,
    );
    setLiveSize((prev) =>
      prev.width !== sw || prev.height !== sh
        ? { width: sw, height: sh }
        : prev,
    );
  };
  return subscribeBounds(elementId, update);
}, [elementId]);
```

**효과**: 편집 중 타이핑만 하면 rAF 콜백 0회. zoom/pan 시에만 업데이트.
**비용**: renderCommands에 리스너 Map 추가. 기존 동작 변경 없음.

## 범위 외 (현 시점 불필요)

| 항목                         | 이유                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| Quill → contenteditable 전환 | Quill 고유 문제 이미 해결. 전환 시 브라우저 비일관성 리스크 |
| EditContext API              | Firefox/Safari 미지원. 커서/셀렉션 Skia 렌더링 비용 과다    |
| Hidden textarea 방식         | 구현 복잡도 극히 높음 (커서, 셀렉션, IME 모두 직접 구현)    |

## 구현 순서

1. Phase 1 (전환 애니메이션) — 30분, 즉시 적용
2. Phase 2 (이벤트 기반 추적) — 1~2시간, 테스트 포함
