# Phase 11: WebGL Canvas Resize 최적화

> **작성일**: 2025-12-19
> **상태**: 계획 (Plan)
> **관련 문서**: [10-webgl-builder-architecture.md](./10-webgl-builder-architecture.md) | [task.md](./task.md)
> **목표**: 패널 토글 시 Canvas resize 0회, 60fps 유지

---

## 1. Executive Summary

### 1.1 문제 정의

**현상**: WebGL 모드에서 패널을 열고 닫을 때마다 심각한 프레임 드랍과 성능 저하 발생

**iframe vs WebGL 비교**:

| 구분 | iframe 모드 | WebGL 모드 |
|------|------------|------------|
| 패널 열기/닫기 | CSS transition만 발생 | Canvas resize 트리거 |
| 프레임 드랍 | 없음 | 심각 (300ms+) |
| 내부 객체 | DOM 유지 | GPU 버퍼 재생성 |
| 사용자 경험 | 부드러움 | 끊김/버벅임 |

### 1.2 근본 원인

```
Panel Toggle → CSS Transition (0.3s) → Container 크기 변화
    → ResizeObserver 연속 발생 (10+ 회)
    → renderer.resize() 호출
    → Framebuffer 재생성
    → GPU 컨텍스트 재할당
    → 프레임 드랍
```

**핵심 문제**: Canvas가 CSS Grid 레이아웃에 참여하여 패널 크기 변화에 영향받음

### 1.3 해결 방향

```
❌ 증상 완화: resize 타이밍 조절 (setTimeout, debounce, transitionend)
   → 여전히 resize 발생, 근본 해결 아님

✅ 근본 해결: Canvas를 레이아웃에서 완전 분리
   → Panel 토글 시 resize 0회
   → Figma, Webflow, Framer가 사용하는 방식
```

### 1.4 목표 지표

| 지표 | Before | After (목표) |
|------|--------|-------------|
| 패널 토글 시 resize | 10+ 회 | **0회** |
| 프레임 드랍 | 심각 | **없음** |
| 평균 프레임 시간 | 100ms+ | **<16ms** |
| FPS | <30 | **>55** |
| Framebuffer 재생성 | 매번 | **없음** |

---

## 2. 업계 리서치

### 2.1 Figma 접근법

> Sources: [Figma Blog - Keeping Figma Fast](https://www.figma.com/blog/keeping-figma-fast/), [Building a professional design tool](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/)

**핵심 전략**:
- **Fixed Canvas + Viewport Clipping**: Canvas는 고정 크기, 보이는 영역만 클리핑
- **Tile-based Rendering**: 타일 단위로 렌더링하여 필요한 부분만 업데이트
- **C++ → WebAssembly**: asm.js로 렌더링 성능 극대화
- **Panel은 DOM**: Canvas 위에 absolute로 오버레이

```
┌──────────────────────────────────────────────┐
│        Canvas (position: fixed, 100vw)       │  ← 레이아웃 무관
│  ┌─────────┐                    ┌─────────┐  │
│  │ Panel L │                    │ Panel R │  │  ← position: absolute
│  │ z-index │                    │ z-index │  │     (Canvas 위 오버레이)
│  └─────────┘                    └─────────┘  │
└──────────────────────────────────────────────┘
```

### 2.2 PixiJS 권장 패턴

> Sources: [PixiJS Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips), [PixiJS Optimization Guide](https://medium.com/@turkmergin/maximising-performance-a-deep-dive-into-pixijs-optimization-6689688ead93)

**Resize 관련**:
```javascript
// ❌ Anti-pattern: 빈번한 resize
renderer.resize(width, height); // 매우 비싼 연산 - Framebuffer 재생성

// ✅ Best Practice: resize 최소화
// 초기화 시 한 번만 설정, 윈도우 resize만 처리
```

**추가 최적화**:
- `cacheAsBitmap`: 정적 콘텐츠를 GPU 텍스처로 캐싱
- Culling: 화면 밖 객체는 렌더링하지 않음
- Batching: Sprite sheet로 draw call 최소화
- Rectangle Mask (scissor rect)가 가장 빠름

### 2.3 WebGL Canvas Resize 원리

> Sources: [WebGL Fundamentals](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html), [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

```javascript
// Canvas Resize = Framebuffer 재생성
// "When the page resizes the canvas, this calls WebGLContext::SetDimensions
// which does gl->ResizeOffscreenFBO which recreates a fresh new FBO,
// losing the current rendered frame"
```

**iOS Safari 이슈**: Canvas resize 시 메모리 누수 발생 가능

---

## 3. 아키텍처 설계

### 3.1 현재 구조 (문제)

```
┌──────────────────────────────────────────────┐
│                   Grid Layout                 │
├─────────┬────────────────────────┬───────────┤
│ Panel L │   Canvas (resize됨)    │  Panel R  │
│  233px  │     flex: 1 (가변)     │   233px   │
└─────────┴────────────────────────┴───────────┘

문제: Panel 토글 → Grid 재계산 → Canvas 크기 변경 → renderer.resize()
```

**현재 파일 구조**:
- `src/builder/styles/4-layout/canvas.css`: Grid 레이아웃 정의
- `src/builder/workspace/Workspace.tsx`: ResizeObserver로 크기 추적
- `src/builder/workspace/canvas/BuilderCanvas.tsx`: CanvasSmoothResizeBridge

### 3.2 목표 구조 (해결)

```
┌──────────────────────────────────────────────┐
│        Canvas (position: fixed, 100%)        │  ← 레이아웃 무관
│  ┌─────────┐                    ┌─────────┐  │
│  │ Panel L │                    │ Panel R │  │  ← position: fixed
│  │ z-index │                    │ z-index │  │     (Canvas 위 오버레이)
│  └─────────┘                    └─────────┘  │
└──────────────────────────────────────────────┘

해결: Panel 토글 → Panel만 이동 → Canvas 크기 변경 없음 → resize 0회
```

### 3.3 레이어 구조

```
z-index 계층:
┌─────────────────────────────────────────────┐
│  z-100: Header (position: fixed)            │
├─────────────────────────────────────────────┤
│  z-10: Panels (position: fixed, overlay)    │
│    - Sidebar (left: 0)                      │
│    - Inspector (right: 0)                   │
│    - Bottom Panel (bottom: 0)               │
├─────────────────────────────────────────────┤
│  z-1: Workspace/Canvas (position: fixed)    │
│    - WebGL Canvas (고정 크기)               │
│    - DOM Overlay (TextEditOverlay 등)       │
└─────────────────────────────────────────────┘
```

### 3.4 뷰포트 오프셋 보정

패널이 Canvas 위에 오버레이되므로, 실제 작업 영역을 보정해야 함:

```typescript
// 패널 상태에 따른 작업 영역 계산
const workableArea = {
  left: showLeft ? leftPanelWidth : 0,
  right: showRight ? rightPanelWidth : 0,
  top: HEADER_HEIGHT,
  bottom: showBottom ? bottomPanelHeight : 0,
};

// Camera position 보정
cameraContainer.x = panOffset.x + workableArea.left;
cameraContainer.y = panOffset.y + workableArea.top;
```

---

## 4. 구현 Phase

### 4.1 Phase 요약

| Phase | 목표 | 유형 | 예상 효과 |
|-------|------|------|----------|
| **A** | CSS 레이아웃 분리 | 🔴 근본 해결 | resize 제거 |
| **B** | Canvas 고정 크기 | 🔴 근본 해결 | Framebuffer 재생성 제거 |
| **C** | 뷰포트 오프셋 보정 | 🔴 근본 해결 | UX 정상화 |
| **D** | 윈도우 resize만 처리 | 🟡 안정화 | 브라우저 resize 대응 |
| **E** | 메모리 풀링 | 🟢 추가 최적화 | GC 부담 감소 |
| **F** | 정적 요소 캐싱 | 🟢 추가 최적화 | 렌더링 성능 향상 |
| **G** | 상태 관리 분리 | 🟢 추가 최적화 | 불필요한 리렌더 제거 |
| **H** | 벤치마크 및 검증 | 🔵 검증 | 성능 기준 확립 |

### 4.2 Phase 의존성

```
Phase A (레이아웃 분리)
    │
    ├──→ Phase B (Canvas 고정)
    │        │
    │        └──→ Phase C (뷰포트 보정)
    │                 │
    │                 └──→ Phase D (윈도우 resize)
    │
    └──→ Phase G (상태 분리) ←── 병렬 가능

Phase E (메모리 풀링) ←── 독립적, 언제든 가능

Phase F (정적 캐싱) ←── 독립적, 언제든 가능

Phase H (벤치마크) ←── 모든 Phase 전후 측정
```

### 4.3 구현 순서 권장

| 순서 | Phase | 이유 |
|------|-------|------|
| 1️⃣ | **H (벤치마크)** | 현재 상태 기준선 측정 |
| 2️⃣ | **A → B → C** | 근본 해결 (순차적 의존성) |
| 3️⃣ | **D** | 윈도우 resize 안정화 |
| 4️⃣ | **H** | 개선 효과 검증 |
| 5️⃣ | **E, F, G** | 추가 최적화 (병렬 가능) |
| 6️⃣ | **H** | 최종 검증 |

---

## 5. Phase A: CSS 레이아웃 분리

### 5.1 목표

Canvas를 Grid/Flex 레이아웃에서 완전히 분리하여 패널 토글이 Canvas 크기에 영향을 주지 않도록 함

### 5.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/builder/styles/4-layout/app.css` | Grid → position 기반 레이아웃 |
| `src/builder/styles/4-layout/canvas.css` | main 영역 fixed 처리 |
| `src/builder/styles/5-modules/panel-container.css` | 패널 fixed 오버레이 |
| `src/builder/workspace/Workspace.css` | workspace fixed 처리 |

### 5.3 구현 상세

#### A-1. 전체 레이아웃 구조 변경

```css
/* src/builder/styles/4-layout/app.css */

/* 기존 */
.app {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main inspector"
    "footer footer footer";
  grid-template-columns: auto 1fr auto;
}

/* 개선 */
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height, 48px);
  z-index: 100;
}
```

#### A-2. Workspace (Canvas 영역) 고정

```css
/* src/builder/workspace/Workspace.css */

.workspace {
  position: fixed;
  top: var(--header-height, 48px);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  /* 패널과 완전히 독립 - 크기 변경 없음 */
}

.canvas-container {
  width: 100%;
  height: 100%;
}
```

#### A-3. 패널을 오버레이로 배치

```css
/* src/builder/styles/5-modules/panel-container.css */

.sidebar {
  position: fixed;
  top: var(--header-height, 48px);
  left: 0;
  bottom: 0;
  z-index: 10;  /* Canvas 위 */
}

.inspector {
  position: fixed;
  top: var(--header-height, 48px);
  right: 0;
  bottom: 0;
  z-index: 10;
}

/* 패널 숨김 - transform만 사용, position 변경 없음 */
.panel-container[data-show="false"] {
  transform: translateX(-100%);
  /* position: absolute 제거 - 레이아웃 재계산 방지 */
}

.panel-container[data-side="right"][data-show="false"] {
  transform: translateX(100%);
}
```

### 5.4 체크리스트

- [ ] `.app` Grid 레이아웃 제거
- [ ] `.app header` position: fixed 적용
- [ ] `.workspace` position: fixed 적용
- [ ] `.sidebar` position: fixed 적용
- [ ] `.inspector` position: fixed 적용
- [ ] 패널 숨김 시 absolute → transform만 사용
- [ ] Bottom 패널도 동일하게 처리
- [ ] z-index 계층 정리

---

## 6. Phase B: Canvas 고정 크기

### 6.1 목표

PixiJS Application 크기를 고정하여 resize 호출 완전 제거

### 6.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/builder/workspace/canvas/BuilderCanvas.tsx` | resizeTo 제거, 고정 크기 |
| `src/builder/workspace/Workspace.tsx` | ResizeObserver 간소화 |

### 6.3 구현 상세

#### B-1. resizeTo 제거 및 고정 크기 설정

```tsx
// src/builder/workspace/canvas/BuilderCanvas.tsx

// 기존
<Application
  resizeTo={containerEl}  // ❌ 제거
  // ...
>

// 개선
const CANVAS_SIZE = {
  width: Math.max(window.innerWidth, 1920),
  height: Math.max(window.innerHeight, 1080),
};

<Application
  width={CANVAS_SIZE.width}
  height={CANVAS_SIZE.height}
  // resizeTo 없음 - 크기 고정
  background={backgroundColor}
  antialias={true}
  resolution={window.devicePixelRatio || 1}
  autoDensity={true}
>
```

#### B-2. CanvasSmoothResizeBridge 제거

```tsx
// 기존: 복잡한 resize 로직
<CanvasSmoothResizeBridge containerEl={containerEl} />

// 개선: 완전 제거 (패널 토글 시 resize 불필요)
// CanvasSmoothResizeBridge 컴포넌트 삭제
```

### 6.4 체크리스트

- [ ] `resizeTo` 옵션 제거
- [ ] 고정 width/height 설정
- [ ] `CanvasSmoothResizeBridge` 컴포넌트 제거
- [ ] 패널 관련 ResizeObserver 코드 제거

---

## 7. Phase C: 뷰포트 오프셋 보정

### 7.1 목표

패널 상태에 따라 Camera 위치를 조정하여 작업 영역이 패널에 가려지지 않도록 함

### 7.2 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/builder/workspace/canvas/viewport/useViewportOffset.ts` | 뷰포트 오프셋 계산 훅 |

### 7.3 구현 상세

#### C-1. 뷰포트 오프셋 계산

```tsx
// src/builder/workspace/canvas/viewport/useViewportOffset.ts

import { useMemo } from 'react';
import { useStore } from '../../../stores';

const LEFT_PANEL_WIDTH = 233;
const RIGHT_PANEL_WIDTH = 233;
const HEADER_HEIGHT = 48;

export function useViewportOffset() {
  const showLeft = useStore((state) => state.showLeft);
  const showRight = useStore((state) => state.showRight);
  const activeLeftPanels = useStore((state) => state.activeLeftPanels);
  const activeRightPanels = useStore((state) => state.activeRightPanels);

  return useMemo(() => {
    const leftWidth = showLeft ? activeLeftPanels.length * LEFT_PANEL_WIDTH : 0;
    const rightWidth = showRight ? activeRightPanels.length * RIGHT_PANEL_WIDTH : 0;

    return {
      left: leftWidth,
      right: rightWidth,
      top: HEADER_HEIGHT,
      bottom: 0,
      // Canvas 중앙 보정값
      centerOffsetX: (leftWidth - rightWidth) / 2,
    };
  }, [showLeft, showRight, activeLeftPanels.length, activeRightPanels.length]);
}
```

#### C-2. Camera 위치 보정 적용

```tsx
// src/builder/workspace/canvas/viewport/ViewportControlBridge.tsx

import { useViewportOffset } from './useViewportOffset';

function ViewportControlBridge({ containerEl, cameraLabel }) {
  const { centerOffsetX } = useViewportOffset();
  const panOffset = useCanvasSyncStore((state) => state.panOffset);

  useEffect(() => {
    const camera = app.stage.getChildByLabel(cameraLabel);
    if (!camera) return;

    // 패널 오프셋 보정 적용
    camera.x = panOffset.x + centerOffsetX;
    camera.y = panOffset.y;
  }, [panOffset, centerOffsetX]);
}
```

#### C-3. 클릭/드래그 좌표 변환

```tsx
// 화면 좌표 → 캔버스 좌표 변환 시 오프셋 반영
const screenToCanvas = useCallback((screenX: number, screenY: number) => {
  const { left, top } = viewportOffset;
  return {
    x: (screenX - panOffset.x - left) / zoom,
    y: (screenY - panOffset.y - top) / zoom,
  };
}, [zoom, panOffset, viewportOffset]);
```

### 7.4 체크리스트

- [ ] `useViewportOffset` 훅 생성
- [ ] `ViewportControlBridge`에 오프셋 적용
- [ ] 클릭/드래그 좌표 변환 로직 수정
- [ ] Lasso 선택 좌표 변환 수정
- [ ] 텍스트 편집 오버레이 위치 수정

---

## 8. Phase D: 윈도우 Resize만 처리

### 8.1 목표

브라우저 창 크기 변경 시에만 Canvas resize 수행

### 8.2 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/builder/workspace/canvas/hooks/useWindowResize.ts` | 윈도우 resize 전용 훅 |

### 8.3 구현 상세

```tsx
// src/builder/workspace/canvas/hooks/useWindowResize.ts

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function useWindowResize(app: Application | null) {
  const lastSize = useRef({ width: 0, height: 0 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!app?.renderer) return;

    const handleResize = () => {
      // RAF로 throttle
      if (rafId.current !== null) return;

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // 크기 변경 시에만
        if (lastSize.current.width !== width || lastSize.current.height !== height) {
          lastSize.current = { width, height };

          app.renderer.resize(
            Math.max(width, 1920),
            Math.max(height, 1080)
          );
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [app]);
}
```

### 8.4 체크리스트

- [ ] `useWindowResize` 훅 생성
- [ ] BuilderCanvas에 적용
- [ ] 패널 토글과 완전히 분리 확인

---

## 9. Phase E: 메모리 풀링

### 9.1 목표

Sprite 재사용으로 GC 부담 감소

### 9.2 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/builder/workspace/canvas/utils/SpritePool.ts` | 스프라이트 풀 매니저 |

### 9.3 구현 상세

```tsx
// src/builder/workspace/canvas/utils/SpritePool.ts

import { Sprite, Texture, Container } from 'pixi.js';

class SpritePool {
  private pools: Map<string, Sprite[]> = new Map();
  private containerPool: Container[] = [];

  acquireSprite(textureKey: string): Sprite {
    const pool = this.pools.get(textureKey);
    if (pool && pool.length > 0) {
      const sprite = pool.pop()!;
      sprite.visible = true;
      return sprite;
    }
    return new Sprite(Texture.from(textureKey));
  }

  releaseSprite(sprite: Sprite, textureKey: string): void {
    sprite.visible = false;
    sprite.removeFromParent();

    const pool = this.pools.get(textureKey) || [];
    pool.push(sprite);
    this.pools.set(textureKey, pool);
  }

  acquireContainer(): Container {
    if (this.containerPool.length > 0) {
      const container = this.containerPool.pop()!;
      container.visible = true;
      return container;
    }
    return new Container();
  }

  releaseContainer(container: Container): void {
    container.visible = false;
    container.removeChildren();
    container.removeFromParent();
    this.containerPool.push(container);
  }

  clear(): void {
    this.pools.clear();
    this.containerPool = [];
  }
}

export const spritePool = new SpritePool();
```

### 9.4 체크리스트

- [ ] `SpritePool` 클래스 생성
- [ ] `ElementSprite`에서 풀 사용
- [ ] 요소 삭제 시 풀에 반환
- [ ] 페이지 전환 시 풀 정리

---

## 10. Phase F: 정적 요소 캐싱

### 10.1 목표

변경되지 않는 요소를 GPU 텍스처로 캐싱하여 렌더링 성능 향상

### 10.2 구현 상세

```tsx
// src/builder/workspace/canvas/sprites/ElementSprite.tsx

const ElementSprite = memo(function ElementSprite({ element, layoutPosition }) {
  const containerRef = useRef<Container>(null);
  const isDragging = useDragState((state) => state.elementId === element.id);
  const isSelected = useStore((state) => state.selectedElementIds.includes(element.id));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 정적 상태일 때 캐싱 활성화
    if (!isDragging && !isSelected) {
      const timer = setTimeout(() => {
        container.cacheAsBitmap = true;
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // 동적 상태일 때 캐싱 해제
      container.cacheAsBitmap = false;
    }
  }, [isDragging, isSelected]);

  return <pixiContainer ref={containerRef}>...</pixiContainer>;
});
```

### 10.3 cacheAsBitmap 사용 가이드

```
❌ 사용 금지 (자주 변경되는 요소):
- 드래그 중인 요소
- 애니메이션 중인 요소
- 텍스트 편집 중인 요소

✅ 적극 사용 (정적 요소):
- 배경 이미지
- 고정 아이콘
- GridLayer (줌 변경 시만 해제)
- BodyLayer
```

### 10.4 체크리스트

- [ ] `ElementSprite`에 cacheAsBitmap 로직 추가
- [ ] 드래그/선택 상태에서 캐싱 해제
- [ ] `GridLayer`에 캐싱 적용
- [ ] `BodyLayer`에 캐싱 적용

---

## 11. Phase G: 상태 관리 분리

### 11.1 목표

WebGL 렌더링 상태와 UI 레이아웃 상태를 분리하여 불필요한 리렌더링 제거

### 11.2 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/builder/stores/renderState.ts` | WebGL 렌더링 전용 상태 |
| `src/builder/stores/layoutState.ts` | UI 레이아웃 전용 상태 |

### 11.3 구현 상세

```tsx
// src/builder/stores/renderState.ts
import { create } from 'zustand';

interface RenderState {
  isRendering: boolean;
  frameCount: number;
  lastRenderTime: number;
  contextLost: boolean;

  setRendering: (value: boolean) => void;
  incrementFrame: () => void;
  setContextLost: (value: boolean) => void;
}

export const useRenderState = create<RenderState>((set) => ({
  isRendering: false,
  frameCount: 0,
  lastRenderTime: 0,
  contextLost: false,

  setRendering: (value) => set({ isRendering: value }),
  incrementFrame: () => set((s) => ({
    frameCount: s.frameCount + 1,
    lastRenderTime: performance.now()
  })),
  setContextLost: (value) => set({ contextLost: value }),
}));
```

```tsx
// src/builder/stores/layoutState.ts
import { create } from 'zustand';

interface LayoutState {
  viewportSize: { width: number; height: number };
  panelWidths: { left: number; right: number; bottom: number };

  setViewportSize: (size: { width: number; height: number }) => void;
  setPanelWidth: (side: 'left' | 'right' | 'bottom', width: number) => void;
}

export const useLayoutState = create<LayoutState>((set) => ({
  viewportSize: { width: 0, height: 0 },
  panelWidths: { left: 233, right: 233, bottom: 200 },

  setViewportSize: (size) => set({ viewportSize: size }),
  setPanelWidth: (side, width) => set((s) => ({
    panelWidths: { ...s.panelWidths, [side]: width }
  })),
}));
```

### 11.4 체크리스트

- [ ] `useRenderState` 스토어 생성
- [ ] `useLayoutState` 스토어 생성
- [ ] `canvasSync.ts`에서 렌더링 관련 상태 분리
- [ ] 관련 컴포넌트 import 수정

---

## 12. Phase H: 벤치마크 및 검증

### 12.1 목표

성능 개선 검증 및 회귀 방지를 위한 벤치마크 시스템 구축

### 12.2 새로 생성할 파일

| 파일 | 설명 |
|------|------|
| `src/utils/canvasBenchmark.ts` | 벤치마크 유틸리티 |

### 12.3 구현 상세

```tsx
// src/utils/canvasBenchmark.ts

interface BenchmarkResult {
  testName: string;
  totalTime: number;
  avgFrameTime: number;
  maxFrameTime: number;
  minFrameTime: number;
  resizeCalls: number;
  passed: boolean;
}

class CanvasBenchmark {
  private resizeCallCount = 0;
  private originalResize: Function | null = null;

  // resize 호출 횟수 추적
  startTracking(renderer: any): void {
    this.resizeCallCount = 0;
    this.originalResize = renderer.resize.bind(renderer);

    renderer.resize = (...args: any[]) => {
      this.resizeCallCount++;
      console.log(`[Benchmark] resize called: ${this.resizeCallCount}`);
      return this.originalResize!(...args);
    };
  }

  stopTracking(renderer: any): void {
    if (this.originalResize) {
      renderer.resize = this.originalResize;
    }
  }

  // 패널 토글 테스트
  async runPanelToggleTest(
    toggleFn: () => void,
    count = 50
  ): Promise<BenchmarkResult> {
    const frameTimes: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const frameStart = performance.now();
      toggleFn();

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 350)); // 애니메이션 대기

      frameTimes.push(performance.now() - frameStart);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

    return {
      testName: 'Panel Toggle Test',
      totalTime: performance.now() - startTime,
      avgFrameTime,
      maxFrameTime: Math.max(...frameTimes),
      minFrameTime: Math.min(...frameTimes),
      resizeCalls: this.resizeCallCount,
      passed: this.resizeCallCount === 0 && avgFrameTime < 400,
    };
  }
}

export const canvasBenchmark = new CanvasBenchmark();
```

### 12.4 성능 기준

```tsx
export const BENCHMARK_CRITERIA = {
  // 필수 기준 (근본 해결 후)
  maxResizePerToggle: 0,      // 패널 토글당 resize 0회
  minFPS: 55,                 // 최소 55 FPS 유지
  maxFrameTime: 18,           // 최대 프레임 시간 18ms

  // 권장 기준
  maxMemoryGrowth: 10,        // MB, 50회 토글 후 메모리 증가량
  maxGCPause: 50,             // ms, GC 일시정지 최대 시간
};
```

### 12.5 체크리스트

- [ ] `CanvasBenchmark` 클래스 생성
- [ ] resize 호출 추적 기능
- [ ] 패널 토글 50회 테스트
- [ ] 성능 기준 정의
- [ ] CI 통합 테스트 (선택적)

---

## 13. 롤백 전략

### 13.1 Feature Flag

```typescript
// src/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_FIXED_CANVAS: import.meta.env.VITE_USE_FIXED_CANVAS === 'true',
};
```

### 13.2 롤백 시나리오

| Phase | 롤백 조건 | 롤백 액션 |
|-------|----------|----------|
| A | CSS 레이아웃 깨짐 | Git revert, 기존 Grid 레이아웃 복원 |
| B | Canvas 렌더링 문제 | Feature Flag OFF, resizeTo 복원 |
| C | 좌표 변환 버그 | 오프셋 로직만 롤백 |
| D | 윈도우 resize 문제 | useWindowResize 비활성화 |
| E-G | 추가 최적화 문제 | 해당 Phase만 롤백 |

---

## 14. 리스크 및 대응

### 14.1 기술적 리스크

| 리스크 | 가능성 | 영향 | 대응 방안 |
|--------|--------|------|----------|
| CSS 레이아웃 호환성 | 중 | 높음 | 단계적 적용, Feature Flag |
| 좌표 변환 버그 | 중 | 중 | 단위 테스트, E2E 테스트 |
| 메모리 누수 | 낮음 | 중 | 풀링 패턴, 정기 정리 |
| Safari 호환성 | 낮음 | 낮음 | 폴리필, 대체 구현 |

### 14.2 테스트 체크리스트

- [ ] 패널 토글 50회 연속 테스트
- [ ] 모든 패널 조합 테스트 (L, R, L+R, Bottom)
- [ ] 줌/팬 동시 패널 토글
- [ ] 요소 선택/드래그 중 패널 토글
- [ ] 텍스트 편집 중 패널 토글
- [ ] 브라우저 resize + 패널 토글 동시

---

## 15. 참고 자료

### 공식 문서
- [PixiJS Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [WebGL Fundamentals - Resizing](https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html)
- [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

### 외부 사례
- [Figma Blog - Keeping Figma Fast](https://www.figma.com/blog/keeping-figma-fast/)
- [Figma Blog - Building a professional design tool](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/)
- [PixiJS Optimization Guide](https://medium.com/@turkmergin/maximising-performance-a-deep-dive-into-pixijs-optimization-6689688ead93)

### 디버깅/프로파일링
- [Debouncing with requestAnimationFrame](https://gomakethings.com/debouncing-events-with-requestanimationframe-for-better-performance/)

---

> **문서 작성**: Claude AI
> **작성일**: 2025-12-19
> **상태**: 계획 승인 대기
