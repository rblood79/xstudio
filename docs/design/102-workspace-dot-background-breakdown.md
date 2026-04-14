# ADR-102 Breakdown: Workspace Dot Background Layer — 구현 상세

> 본 문서는 [ADR-102](../adr/102-workspace-dot-background-layer.md) 의 구현 상세 분리본. ADR 본문에는 포인터만 둔다.

## Phase 구성

| Phase  | 목표                                  | 결과물                                         |
| ------ | ------------------------------------- | ---------------------------------------------- |
| **P1** | DotBackground 컴포넌트 + CSS 스캐폴딩 | 컴포넌트 1개, CSS 블록 1개, BuilderCanvas 통합 |
| **P2** | Viewport 동기화 (pan/zoom → CSS 변수) | `useViewportSyncStore` 구독, gap/offset 계산   |
| **P3** | 커서 글로우 (pointermove → mask)      | rAF 스로틀 핸들러, opacity 페이드              |
| **P4** | 다크모드/토큰 검증                    | 시맨틱 변수 매핑 확인, 시각 테스트             |

## 파일 변경 목록

### 신규

| 경로                                                              | 내용                                               | LoC 추정 |
| ----------------------------------------------------------------- | -------------------------------------------------- | -------- |
| `apps/builder/src/builder/workspace/components/DotBackground.tsx` | 컴포넌트 본체 (viewport 구독 + pointermove 핸들러) | ~70      |

### 수정

| 경로                                                          | 변경                                                                                                                                             | LoC 추정 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` | `.canvas-container` 내부 `<SkiaCanvasLazy/>` 와 형제로 `<DotBackground/>` 삽입 (실제 `<canvas>` 는 `SkiaCanvas.tsx` 내부이므로 이 경계에서 삽입) | +2       |
| `apps/builder/src/builder/workspace/Workspace.css`            | `.dot-background`, `.dot-background--base`, `.dot-background--glow` 블록 추가                                                                    | ~40      |

### 건드리지 않음 (명시)

- `packages/specs/**` — D3 비적용
- `apps/preview/**`, `apps/publish/**` — Builder 전용 UI
- `apps/builder/src/builder/workspace/canvas/skia/**` — Skia 렌더 경로 불간섭
- `ViewportController.ts`, `viewportActions.ts` — 기존 이벤트 경로 무변경

## 핵심 구현

### DotBackground.tsx

```tsx
import { useEffect, useRef } from "react";
import {
  useViewportSyncStore,
  selectCanvasViewportSnapshot,
  isCanvasViewportSnapshotEqual,
} from "../canvas/stores/viewportSync";

const BASE_GAP = 20;
const DOT_SIZE = 1;
const GLOW_RADIUS = 140;

export function DotBackground() {
  const baseRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // viewport → CSS 변수
  useEffect(() => {
    const apply = (s: {
      panOffset: { x: number; y: number };
      zoom: number;
    }) => {
      const gap = BASE_GAP * s.zoom;
      const ox = ((s.panOffset.x % gap) + gap) % gap;
      const oy = ((s.panOffset.y % gap) + gap) % gap;
      for (const el of [baseRef.current, glowRef.current]) {
        if (!el) continue;
        el.style.setProperty("--dot-gap", `${gap}px`);
        el.style.setProperty("--dot-offset-x", `${ox}px`);
        el.style.setProperty("--dot-offset-y", `${oy}px`);
        el.style.setProperty("--dot-size", `${DOT_SIZE * s.zoom}px`);
      }
    };
    apply(selectCanvasViewportSnapshot(useViewportSyncStore.getState()));
    return useViewportSyncStore.subscribe(selectCanvasViewportSnapshot, apply, {
      equalityFn: isCanvasViewportSnapshotEqual,
    });
  }, []);

  // 커서 글로우
  useEffect(() => {
    const host = baseRef.current?.parentElement;
    const glow = glowRef.current;
    if (!host || !glow) return;

    const onMove = (e: PointerEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        glow.style.setProperty("--cx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--cy", `${e.clientY - r.top}px`);
        glow.style.opacity = "1";
        rafRef.current = 0;
      });
    };
    const onLeave = () => {
      glow.style.opacity = "0";
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={baseRef}
        className="dot-background dot-background--base"
        aria-hidden
      />
      <div
        ref={glowRef}
        className="dot-background dot-background--glow"
        style={{ "--glow-r": `${GLOW_RADIUS}px` } as React.CSSProperties}
        aria-hidden
      />
    </>
  );
}
```

### Workspace.css 추가 블록

```css
/* ============================================
 * Dot Background (ADR-102) — Builder workspace 전용
 * Skia canvas 아래 레이어, pointer-events 무간섭
 * ============================================ */

/* z-index 스택 격리: 후속 형제 삽입에도 stacking context 안정 */
.canvas-container {
  isolation: isolate;
}

.dot-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(
    circle,
    var(--dot-color) var(--dot-size, 1px),
    transparent calc(var(--dot-size, 1px) + 0.5px)
  );
  background-size: var(--dot-gap, 20px) var(--dot-gap, 20px);
  background-position: var(--dot-offset-x, 0) var(--dot-offset-y, 0);
}

.dot-background--base {
  --dot-color: var(--fg-muted);
  opacity: 0.4;
  z-index: 0;
}

.dot-background--glow {
  --dot-color: var(--accent);
  opacity: 0;
  z-index: 1;
  transition: opacity 200ms ease;
  -webkit-mask-image: radial-gradient(
    circle var(--glow-r, 140px) at var(--cx, -9999px) var(--cy, -9999px),
    #000 0%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle var(--glow-r, 140px) at var(--cx, -9999px) var(--cy, -9999px),
    #000 0%,
    transparent 100%
  );
}
```

### BuilderCanvas.tsx 수정 지점

```tsx
// BuilderCanvas.tsx — .canvas-container 내부
// 기존: <SkiaCanvasLazy/> (내부에 실제 <canvas>), <ViewportControlBridge/>
{containerEl && (
  <SkiaCanvasLazy ... />
)}
<DotBackground />   {/* ← SkiaCanvasLazy 와 형제로 삽입 */}
{containerEl && (
  <ViewportControlBridge ... />
)}
```

실제 `<canvas>` 엘리먼트는 `SkiaCanvas.tsx` 내부에 있으므로, `DotBackground` 는 `.canvas-container` 직계 자식 레벨에서 `SkiaCanvasLazy` 와 **형제**로 삽입한다. DOM 순서상 Skia보다 뒤에 오지만 z-index(`canvas: 2` / `base: 0` / `glow: 1`)로 시각 스택은 배경이 아래가 된다.

## pan/zoom 수학 설명

React Flow가 `<pattern x y>` 속성을 업데이트하는 것과 수학적으로 동등한 것을 CSS `background-position` 으로 표현:

```
gap        = BASE_GAP * zoom              // 줌 시 도트 간격 확대/축소
offset_x   = mod(panOffset.x, gap)        // 타일 경계 내 위치
offset_y   = mod(panOffset.y, gap)
```

`background-size`가 타일 크기 → 브라우저가 무한 타일링. `background-position` 이동만으로 "도트가 패닝에 따라 흐르는" 효과 달성.

`((x % gap) + gap) % gap` 패턴은 음수 panOffset 에서도 양수 오프셋 보장 (JS `%` 는 음수 반환 가능).

## 검증 체크리스트

### 시각

- [ ] 베이스 도트가 canvas 영역 전체에 균일 노출
- [ ] pan(휠/드래그) 시 도트가 패닝 방향으로 자연스럽게 흐름
- [ ] zoom(Ctrl+휠) 시 도트 간격이 줌 비율에 맞춰 변화
- [ ] 마우스가 canvas 안에 있을 때 커서 주변 반경 ~140px 안에서 accent 색 도트 노출
- [ ] 마우스가 canvas 밖으로 나가면 200ms 페이드아웃
- [ ] 다크모드 전환 시 토큰값에 따라 색 자동 변경

### 성능

- [ ] **배경 on/off 비교**: DotBackground 장착/제거 상태에서 동일 조작(hover, pan, zoom) 시 Skia invalidation 카운트 증가 **0건** (기존 hover 경로의 RAF는 허용, 배경 때문에 추가된 invalidation만 검출)
- [ ] DotBackground의 pointermove 핸들러 frame budget **< 2ms**
- [ ] 뷰포트 full 영역에서 60fps 유지 (배경 on 상태에서 기존 편집 캔버스와 동등)

### 정합성

- [ ] pointer-events 기존 ViewportController/Pixi 이벤트 레이어와 충돌 없음 (드래그/선택/휠 zoom 동작 확인)
- [ ] `pointermove` bubble이 `.canvas-container`에 도달 (canvas target에서 `stopPropagation()` 호출 여부 확인 — ViewportController 내 이벤트 처리 경로 점검)
- [ ] `.canvas-container`에 `isolation: isolate` 적용 후 z-index 스택 안정 (패널/툴바 드래그 시 배경 레이어 삐져나옴 없음)
- [ ] `.canvas-container` 외 영역(scrollbar, toggle bar) 침범 없음
- [ ] 비교 모드(compareMode): 좌측 CSS fallback 패널은 현상 유지(도트 배경 없음), 우측 Canvas 패널은 도트 배경 포함 정상 동작

### 브라우저

- [ ] Chrome/Edge: mask-image 정상
- [ ] Safari: `-webkit-mask-image` 폴백 확인
- [ ] Firefox: `mask-image` 정상

## 롤백 플랜

1. `BuilderCanvas.tsx` 의 `<DotBackground />` 한 줄 제거
2. `DotBackground.tsx` 파일 삭제
3. `Workspace.css` 의 `.dot-background*` 블록 삭제

번들 -~1.5KB, 런타임 영향 0.

## Out of Scope (본 ADR 미포함)

- on/off 토글 UI (필요 시 후속 ADR)
- 간격/반경/색상 사용자 설정 (필요 시 후속 ADR)
- 다중 테마별 별도 커스터마이즈 (현재는 시맨틱 토큰 자동 전환으로 충분)
- Preview/Publish 적용 (D3 아님, 의도적 제외)
