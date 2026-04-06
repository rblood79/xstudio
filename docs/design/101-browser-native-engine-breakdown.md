# ADR-101 구현 상세: Browser-Native Rendering Engine

> 이 문서는 [ADR-101](../adr/101-browser-native-rendering-engine.md)의 구현 상세입니다.
> "Delete, delete, delete. If you're not adding back 10% of what you deleted, you're not deleting enough." — Elon Musk

## 목차

1. [삭제 목록](#1-삭제-목록)
2. [목표 아키텍처](#2-목표-아키텍처)
3. [Layer 1: Live DOM Renderer](#3-layer-1-live-dom-renderer)
4. [Layer 2: CSS Isolation](#4-layer-2-css-isolation)
5. [Layer 3: Zoom/Pan Engine](#5-layer-3-zoompan-engine)
6. [Layer 4: Interaction Overlay](#6-layer-4-interaction-overlay)
7. [Layer 5: DOM Pooling (Virtualization)](#7-layer-5-dom-pooling)
8. [Layer 6: Performance Engineering](#8-layer-6-performance-engineering)
9. [Spec→CSS 변환 전략](#9-speccss-변환-전략)
10. [Phase 계획](#10-phase-계획)
11. [성능 예산](#11-성능-예산)
12. [테스트 전략](#12-테스트-전략)

---

## 1. 삭제 목록

### 완전 삭제 (WASM)

| 패키지            | 크기        | 파일                         |
| ----------------- | ----------- | ---------------------------- |
| canvaskit-wasm    | 6MB         | `public/wasm/canvaskit.wasm` |
| Taffy WASM        | ~200KB      | `wasm/pkg/`                  |
| SpatialIndex WASM | ~50KB       | `wasm/pkg/`                  |
| **합계**          | **~6.25MB** |                              |

### 완전 삭제 (TypeScript)

```
apps/builder/src/builder/workspace/canvas/
├── skia/                           # 전체 삭제 (~8,000줄)
│   ├── initCanvasKit.ts
│   ├── SkiaRenderer.ts
│   ├── SkiaOverlay.tsx
│   ├── createSurface.ts
│   ├── skiaFramePipeline.ts
│   ├── skiaOverlayBuilder.ts
│   ├── skiaTreeBuilder.ts
│   ├── renderCommands.ts
│   ├── renderInvalidation.ts
│   ├── specShapeConverter.ts       # 10,000줄
│   ├── nodeRendererTree.ts
│   ├── nodeRendererText.ts
│   ├── nodeRendererBorders.ts
│   ├── nodeRendererShapes.ts
│   ├── nodeRendererImage.ts
│   ├── nodeRendererClip.ts
│   ├── nodeRendererState.ts
│   ├── nodeRendererTypes.ts
│   ├── nodeRenderers.ts
│   ├── effects.ts
│   ├── fills.ts
│   ├── blendModes.ts
│   ├── gridRenderer.ts
│   └── imageCache.ts
│
├── sprites/                        # 전체 삭제 (~3,500줄)
│   ├── ElementSprite.tsx
│   ├── BoxSprite.tsx
│   ├── TextSprite.tsx
│   └── ImageSprite.tsx
│
├── pixiSetup.ts                    # 삭제
├── components/ElementsLayer.tsx    # DOMBridge로 교체
├── components/PageContainer.tsx    # DOM 페이지로 교체
├── components/ClickableBackground.tsx  # 삭제
│
├── wasm-bindings/                  # 전체 삭제
│   ├── taffyLayout.ts
│   ├── spatialIndex.ts
│   ├── rustWasm.ts
│   └── init.ts
│
├── layout/engines/                 # 전체 삭제 (~4,000줄)
│   ├── BaseTaffyEngine.ts
│   ├── TaffyFlexEngine.ts
│   ├── TaffyGridEngine.ts
│   ├── TaffyBlockEngine.ts
│   ├── persistentTaffyTree.ts
│   └── fullTreeLayout.ts          # DOMBridge로 교체
│
├── utils/
│   └── canvas2dSegmentCache.ts     # 삭제 (브라우저가 텍스트 측정)
│
└── types/pixi-react.d.ts          # 삭제
```

**삭제 합계: ~39,000줄 TypeScript + 6.25MB WASM**

### 패키지 의존성 제거

```json
// 제거
"pixi.js": "^8.14.3",
"@pixi/react": "^8.x",
"canvaskit-wasm": "^0.40.0"
// Cargo.toml (Taffy, SpatialIndex) 전체
```

### 유지

```
├── hooks/useCentralCanvasPointerHandlers.ts  # DOM 이벤트 (리팩토링)
├── interaction/selectionModel.ts              # 선택 로직 (유지)
├── selection/useDragInteraction.ts            # 드래그 (유지)
├── viewport/ViewportController.ts             # 줌/팬 (CSS transform으로 변경)
```

---

## 2. 목표 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                          Builder UI                              │
│  React Panels (StylePanel, LayersPanel, etc.)                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Canvas Viewport                         │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │         Interaction Overlay (position:absolute)       │  │  │
│  │  │         SVG/DOM: selection, handles, guides           │  │  │
│  │  │         z-index: 10                                   │  │  │
│  │  ├──────────────────────────────────────────────────────┤  │  │
│  │  │         Live DOM Canvas (CSS transform zoom/pan)      │  │  │
│  │  │         ┌─ Page 1 (Shadow DOM or iframe)             │  │  │
│  │  │         │   ├─ <div> body                            │  │  │
│  │  │         │   │   ├─ <div> flex container              │  │  │
│  │  │         │   │   │   ├─ <p> text                      │  │  │
│  │  │         │   │   │   ├─ <img> image                   │  │  │
│  │  │         │   │   │   └─ <button> button               │  │  │
│  │  │         │   │   └─ <table> table                     │  │  │
│  │  │         │   └─ ...                                   │  │  │
│  │  │         ├─ Page 2 (Shadow DOM or iframe)             │  │  │
│  │  │         └─ ...                                       │  │  │
│  │  │         z-index: 1                                    │  │  │
│  │  │         pointer-events: none (이벤트는 Overlay에서)   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

데이터 흐름:
  Zustand Store → DOMBridge → Live DOM 요소 mutation
                             → getBoundingClientRect() (레이아웃 쿼리)
                             → Interaction Overlay 업데이트
```

### 3개 레이어만 존재

```
Layer 1: Live DOM (실제 요소, 브라우저 렌더링)
Layer 2: CSS Transform (zoom/pan, GPU 가속)
Layer 3: Interaction Overlay (SVG 선택/핸들)
```

비교: 기존 아키텍처는 6개 레이어 (Store → Taffy → PixiJS → Skia → SpatialIndex → DOM Events)

---

## 3. Layer 1: Live DOM Renderer

### DOMBridge (StoreBridge 대체)

```typescript
// dom/DOMBridge.ts
class DOMBridge {
  private store: BuilderStore;
  private containerEl: HTMLElement;
  private elementMap: Map<string, HTMLElement> = new Map(); // O(1) lookup
  private pendingUpdates: DOMUpdate[] = [];
  private rafId: number = 0;

  constructor(store: BuilderStore, container: HTMLElement) {
    this.store = store;
    this.containerEl = container;

    // Zustand 구독 — React 렌더 사이클 우회
    this.store.subscribe((state, prevState) => {
      this.diffAndQueue(state, prevState);
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.flush();
      this.rafId = 0;
    });
  }

  private flush(): void {
    // DOM 배치 업데이트 (reflow 최소화)
    // 1. 모든 읽기(getBoundingClientRect) 먼저
    // 2. 모든 쓰기(style, attribute) 한꺼번에
    const reads: LayoutRead[] = [];
    const writes: DOMWrite[] = [];

    for (const update of this.pendingUpdates) {
      switch (update.type) {
        case "create":
          writes.push(() => this.createElement(update));
          break;
        case "update-style":
          writes.push(() => this.updateElementStyle(update));
          break;
        case "update-content":
          writes.push(() => this.updateContent(update));
          break;
        case "move":
          writes.push(() => this.moveElement(update));
          break;
        case "remove":
          writes.push(() => this.removeElement(update));
          break;
      }
    }

    // 쓰기 일괄 실행 (single reflow)
    for (const write of writes) write();

    this.pendingUpdates.length = 0;
  }

  private createElement(update: CreateUpdate): void {
    const el = document.createElement(tagToHTML(update.tag));
    el.dataset.elementId = update.id;
    this.applyStyles(el, update.style);
    this.applyContent(el, update.props);

    const parentEl = this.elementMap.get(update.parentId) ?? this.containerEl;
    parentEl.appendChild(el);
    this.elementMap.set(update.id, el);
  }

  private updateElementStyle(update: StyleUpdate): void {
    const el = this.elementMap.get(update.id);
    if (!el) return;

    // 변경된 속성만 적용
    for (const [prop, value] of Object.entries(update.changes)) {
      el.style.setProperty(cssProperty(prop), cssValue(value));
    }
  }

  // 레이아웃 쿼리 (hit test, bounds)
  getElementBounds(id: string): DOMRect | null {
    return this.elementMap.get(id)?.getBoundingClientRect() ?? null;
  }

  getElementAtPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement;
    return el?.closest("[data-element-id]")?.dataset.elementId ?? null;
  }
}
```

### Tag → HTML 매핑

```typescript
// dom/tagMapping.ts
function tagToHTML(tag: string): string {
  const map: Record<string, string> = {
    // 기본 요소
    Box: "div",
    Text: "p",
    Heading: "h2",
    Image: "img",
    Button: "button",
    Link: "a",
    Input: "input",
    TextArea: "textarea",
    Select: "select",

    // 테이블 (CSS3 Level 3 — 자동 지원!)
    Table: "table",
    TableRow: "tr",
    TableCell: "td",
    TableHeader: "th",

    // 리스트
    List: "ul",
    ListItem: "li",

    // 시맨틱
    Section: "section",
    Article: "article",
    Nav: "nav",
    Header: "header",
    Footer: "footer",
    Main: "main",
    Aside: "aside",

    // 폼
    Form: "form",
    Label: "label",
    Checkbox: "input", // type="checkbox"
    Radio: "input", // type="radio"

    // 기본값
    default: "div",
  };

  return map[tag] ?? map["default"];
}
```

---

## 4. Layer 2: CSS Isolation

Builder UI CSS와 사용자 콘텐츠 CSS가 충돌하면 안 된다.

### 전략 A: Shadow DOM (추천)

```typescript
// dom/PageRenderer.ts
class PageRenderer {
  private shadowRoot: ShadowRoot;
  private styleEl: HTMLStyleElement;

  constructor(hostEl: HTMLElement) {
    this.shadowRoot = hostEl.attachShadow({ mode: "open" });

    // 사용자 콘텐츠 CSS 주입
    this.styleEl = document.createElement("style");
    this.shadowRoot.appendChild(this.styleEl);
  }

  setStyles(css: string): void {
    // Preview에서 사용하는 동일한 CSS를 주입
    this.styleEl.textContent = css;
  }

  get root(): ShadowRoot {
    return this.shadowRoot;
  }
}
```

**장점:**

- 완전한 CSS 격리 (Builder CSS ↔ 사용자 CSS)
- Preview와 동일한 CSS 적용 가능
- `@layer` 없이도 격리

**주의:**

- Shadow DOM 내부에서 외부 CSS 변수 접근 불가 → CSS 변수를 host element에 설정
- 폰트는 document 레벨에서 로드 → Shadow DOM 내에서도 사용 가능

### 전략 B: iframe (대안)

```html
<iframe
  id="page-canvas"
  srcdoc="..."
  style="transform: scale(var(--zoom)); transform-origin: 0 0;"
  sandbox="allow-same-origin"
></iframe>
```

**장점:** 완전한 격리, 기존 Preview iframe 패턴 재활용
**단점:** iframe 통신 오버헤드, postMessage 지연

### 결정: Shadow DOM

iframe보다 빠르고 DOM 직접 접근 가능. 단, 고도의 격리가 필요한 경우 iframe fallback.

---

## 5. Layer 3: Zoom/Pan Engine

### CSS Transform 기반

```typescript
// viewport/ZoomPanEngine.ts
class ZoomPanEngine {
  private containerEl: HTMLElement;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;

  constructor(container: HTMLElement) {
    this.containerEl = container;
    this.setupListeners();
  }

  private applyTransform(): void {
    // GPU 가속 (will-change: transform)
    this.containerEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  private setupListeners(): void {
    // 휠 줌
    this.containerEl.parentElement!.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = -e.deltaY * 0.001;
          const newZoom = Math.max(0.1, Math.min(10, this.zoom * (1 + delta)));

          // 커서 위치 기준 줌 (focal point)
          const rect = this.containerEl.parentElement!.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;

          this.panX = cx - (cx - this.panX) * (newZoom / this.zoom);
          this.panY = cy - (cy - this.panY) * (newZoom / this.zoom);
          this.zoom = newZoom;

          this.applyTransform();
        }
      },
      { passive: false },
    );

    // 스페이스+드래그 팬
    // ... (기존 ViewportController 로직 재활용)
  }

  // 좌표 변환 (오버레이↔캔버스)
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.containerEl.parentElement!.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.panX) / this.zoom,
      y: (screenY - rect.top - this.panY) / this.zoom,
    };
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.containerEl.parentElement!.getBoundingClientRect();
    return {
      x: canvasX * this.zoom + this.panX + rect.left,
      y: canvasY * this.zoom + this.panY + rect.top,
    };
  }
}
```

### 고배율 선명도

CSS transform scale은 비트맵 스케일링 → 고배율에서 흐림. 해결:

```typescript
// 줌 레벨에 따라 DOM 컨텐츠 해상도 조정
private updateSharpness(): void {
  if (this.zoom > 2) {
    // 고배율: 내부 스케일 올려서 선명도 유지
    const internalScale = Math.ceil(this.zoom);
    this.containerEl.style.transform =
      `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom / internalScale})`;
    this.containerEl.style.zoom = `${internalScale}`;
  } else {
    this.containerEl.style.zoom = '1';
    this.applyTransform();
  }
}
```

---

## 6. Layer 4: Interaction Overlay

### SVG 기반 선택/핸들

```typescript
// interaction/InteractionOverlay.tsx
function InteractionOverlay({ selectedIds, zoom, panX, panY }: Props) {
  const overlayRef = useRef<SVGSVGElement>(null);

  // 선택 박스 렌더링
  return (
    <svg
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',  // 기본적으로 이벤트 통과
      }}
    >
      {selectedIds.map(id => {
        const bounds = domBridge.getElementBounds(id);
        if (!bounds) return null;

        return (
          <g key={id}>
            {/* 선택 박스 */}
            <rect
              x={bounds.x} y={bounds.y}
              width={bounds.width} height={bounds.height}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1 / zoom}
            />
            {/* 리사이즈 핸들 */}
            {HANDLE_POSITIONS.map(pos => (
              <rect
                key={pos}
                x={handleX(bounds, pos) - 3 / zoom}
                y={handleY(bounds, pos) - 3 / zoom}
                width={6 / zoom}
                height={6 / zoom}
                fill="white"
                stroke="var(--accent)"
                strokeWidth={1 / zoom}
                style={{ pointerEvents: 'all', cursor: handleCursor(pos) }}
              />
            ))}
          </g>
        );
      })}

      {/* 가이드 라인 */}
      {guides.map(guide => (
        <line key={guide.id} ... />
      ))}

      {/* 드래그 선택 영역 */}
      {lassoRect && (
        <rect ... fill="rgba(59,130,246,0.1)" stroke="var(--accent)" />
      )}
    </svg>
  );
}
```

### Hit Testing (elementFromPoint 기반)

```typescript
// interaction/hitTest.ts
function hitTestAtPoint(
  screenX: number,
  screenY: number,
  overlayEl: SVGSVGElement,
  canvasEl: HTMLElement,
): HitResult {
  // 1. 오버레이 핸들 체크 (SVG)
  const overlayHit = document.elementFromPoint(screenX, screenY);
  if (overlayHit?.dataset.handleId) {
    return { type: "handle", handleId: overlayHit.dataset.handleId };
  }

  // 2. 캔버스 요소 체크
  // pointer-events를 일시적으로 활성화하거나, 좌표 변환 후 조회
  overlayEl.style.pointerEvents = "none";
  const canvasHit = document.elementFromPoint(screenX, screenY) as HTMLElement;
  overlayEl.style.pointerEvents = "";

  const elementId = canvasHit?.closest("[data-element-id]")?.dataset.elementId;
  if (elementId) {
    return { type: "element", elementId };
  }

  return { type: "canvas" }; // 빈 영역
}
```

---

## 7. Layer 5: DOM Pooling

### 가상화 전략

뷰포트 밖 요소는 DOM에서 제거하여 reflow 비용 절감.

```typescript
// dom/DOMPool.ts
class DOMPool {
  private domBridge: DOMBridge;
  private viewport: DOMRect;
  private activeElements: Set<string> = new Set();
  private elementBounds: Map<string, DOMRect> = new Map(); // 캐시

  // 뷰포트 변경 시 호출
  onViewportChange(viewport: DOMRect): void {
    this.viewport = viewport;
    this.reconcile();
  }

  private reconcile(): void {
    const allElements = this.store.getState().elementsMap;
    const margin = 200; // 뷰포트 여백 (스크롤 예측)
    const expandedViewport = expandRect(this.viewport, margin);

    const toMount: string[] = [];
    const toUnmount: string[] = [];

    for (const [id, element] of allElements) {
      const bounds = this.elementBounds.get(id);
      const isVisible = bounds
        ? rectsIntersect(bounds, expandedViewport)
        : true; // bounds 없으면 일단 마운트

      if (isVisible && !this.activeElements.has(id)) {
        toMount.push(id);
      } else if (!isVisible && this.activeElements.has(id)) {
        toUnmount.push(id);
      }
    }

    // 배치 DOM 조작
    for (const id of toUnmount) {
      this.domBridge.detachElement(id); // DOM에서 분리 (삭제 아님)
      this.activeElements.delete(id);
    }

    for (const id of toMount) {
      this.domBridge.attachElement(id); // DOM에 재부착
      this.activeElements.add(id);
    }
  }
}
```

### CSS Containment (reflow 격리)

```css
/* 각 페이지 루트에 containment 적용 */
[data-page-root] {
  contain: layout style paint; /* reflow를 이 서브트리 내로 격리 */
  content-visibility: auto; /* 뷰포트 밖이면 렌더 스킵 */
  contain-intrinsic-size: auto 800px 600px; /* 스킵 시 예상 크기 */
}

/* 개별 요소에 will-change (드래그 중만) */
[data-dragging="true"] {
  will-change: transform;
}
```

---

## 8. Layer 6: Performance Engineering

### Read/Write 분리 (Layout Thrashing 방지)

```typescript
// dom/BatchScheduler.ts
class BatchScheduler {
  private reads: (() => void)[] = [];
  private writes: (() => void)[] = [];

  // 읽기 예약 (getBoundingClientRect 등)
  scheduleRead(fn: () => void): void {
    this.reads.push(fn);
    this.scheduleFlush();
  }

  // 쓰기 예약 (style 변경 등)
  scheduleWrite(fn: () => void): void {
    this.writes.push(fn);
    this.scheduleFlush();
  }

  private flush(): void {
    // 모든 읽기 먼저 (reflow 1회)
    for (const read of this.reads) read();
    this.reads.length = 0;

    // 모든 쓰기 한꺼번에 (reflow 0~1회)
    for (const write of this.writes) write();
    this.writes.length = 0;
  }
}
```

### 드래그 최적화 (transform only)

```typescript
// 드래그 중: style.left/top 대신 transform 사용 (reflow 0)
function onDragMove(dx: number, dy: number): void {
  const el = domBridge.getElement(dragState.elementId);
  if (!el) return;

  // transform은 합성 레이어에서 처리 → reflow 없음
  el.style.transform = `translate(${dx}px, ${dy}px)`;
}

// 드래그 끝: transform → 실제 위치로 commit
function onDragEnd(): void {
  const el = domBridge.getElement(dragState.elementId);
  if (!el) return;

  el.style.transform = "";
  // 실제 위치를 store에 반영
  store.updateElementStyle(dragState.elementId, {
    left: `${newX}px`,
    top: `${newY}px`,
  });
}
```

### 벤치마크 예상

| 시나리오      | DOM (이 접근법) | Skia+WASM (ADR-100) | 비고                              |
| ------------- | :-------------: | :-----------------: | --------------------------------- |
| 초기 로드     |   **~0.5초**    |       ~1.5초        | WASM 0 vs WASM 2개                |
| 100 요소 FPS  |    **60fps**    |        60fps        | 동일                              |
| 500 요소 FPS  |    **60fps**    |        60fps        | DOM containment                   |
| 1000 요소 FPS |  **55-60fps**   |        60fps        | DOM 풀링 + containment            |
| 5000 요소 FPS |    30-45fps     |    **50-60fps**     | DOM의 한계, 풀링으로 완화         |
| 드래그 지연   |    **<4ms**     |        <8ms         | transform only vs WASM round-trip |
| 스타일 변경   |    **<5ms**     |        <10ms        | DOM mutation vs WASM+Skia         |
| CSS3 커버리지 |  **100%+미래**  |     구현한 만큼     | 자동 vs 수동                      |
| 번들 크기     |    **~50KB**    |  ~200KB(+6MB WASM)  | JS만 vs WASM                      |

---

## 9. Spec→CSS 변환 전략

현재 ComponentSpec은 Skia shapes로 렌더링된다. 이것을 CSS로 변환해야 한다.

### 현재: Spec → Skia

```typescript
// 현재 specShapeConverter.ts
shapes = ButtonSpec.render.shapes(props, size);
// → SkiaNodeData[] → nodeRenderers로 Skia 그리기
```

### 목표: Spec → CSS (이미 존재!)

ADR-036 (Spec-First Single Source)에서 **이미 Spec→CSS 자동 생성이 구현되어 있다.**

```typescript
// packages/specs/src/css/CSSGenerator.ts
// Spec에서 CSS를 자동 생성하는 기존 시스템
generateComponentCSS(spec: ComponentSpec): string;
```

현재 이 CSS는 Preview iframe에서만 사용. Builder Canvas에서도 동일한 CSS를 사용하면 된다.

**변경 사항:**

1. `CSSGenerator` 출력을 Shadow DOM `<style>`에 주입
2. Preview CSS와 Builder Canvas CSS가 **동일한 소스** → 100% 정합성 보장
3. `skipCSSGeneration: true`인 Container/Composite 컴포넌트도 동일한 수동 CSS 사용

**Spec shapes (Skia 전용) 처리:**

- Leaf 컴포넌트: CSS가 이미 존재 (CSSGenerator) → 그대로 사용
- Custom shapes (Arc, ProgressCircle 등): CSS로 표현 불가한 것만 소규모 `<canvas>` 또는 SVG inline으로 대체
- 대부분의 shapes는 CSS border, background-image, gradient, box-shadow로 표현 가능

---

## 10. Phase 계획

### Phase 0: Proof of Concept (3일)

- [ ] Shadow DOM 페이지 렌더러 프로토타입
- [ ] Preview CSS를 Shadow DOM에 주입
- [ ] 10개 요소 + CSS transform zoom/pan 동작 확인
- [ ] `elementFromPoint()` hit testing 동작 확인
- [ ] FPS 측정 (Chrome DevTools Performance)

**Gate G0**: 10개 요소가 Preview와 시각적으로 동일하게 렌더링, 줌/팬 60fps

### Phase 1: Live DOM Renderer (1주)

- [ ] DOMBridge 구현 (Store→DOM 동기화)
- [ ] Tag→HTML 매핑 (모든 XStudio 컴포넌트)
- [ ] CSS 스타일 적용 (인라인 + 클래스)
- [ ] Shadow DOM CSS 격리
- [ ] 100개 요소 렌더링 검증

**Gate G1**: 100개 요소 Preview와 픽셀 동일, CSS3 속성 전부 동작

### Phase 2: Zoom/Pan + Interaction (1주)

- [ ] ZoomPanEngine (CSS transform, focal point zoom)
- [ ] 고배율 선명도 처리
- [ ] InteractionOverlay (SVG 선택 박스, 핸들)
- [ ] Hit testing (elementFromPoint)
- [ ] 드래그/리사이즈 구현
- [ ] 멀티 선택 (Ctrl+클릭, 라쏘)

**Gate G2**: 줌/팬 60fps, 선택/드래그/리사이즈 기존 UX와 동일

### Phase 3: DOM Pooling + Performance (1주)

- [ ] DOMPool 가상화 구현
- [ ] CSS containment 적용
- [ ] BatchScheduler (read/write 분리)
- [ ] 1000 요소 성능 테스트
- [ ] content-visibility: auto 적용
- [ ] 드래그 중 transform-only 최적화

**Gate G3**: 1000 요소 55fps 이상, 드래그 <8ms

### Phase 4: 전체 기능 마이그레이션 (2주)

- [ ] 인라인 텍스트 편집 (contentEditable)
- [ ] Spec 컴포넌트 CSS 렌더링 (CSSGenerator 재활용)
- [ ] Custom shapes → SVG/mini-canvas fallback
- [ ] 멀티페이지 렌더링
- [ ] 오버플로우 스크롤
- [ ] 테마/다크모드 (CSS 변수 주입)
- [ ] 이미지 렌더링 (object-fit)
- [ ] 폰트 로딩 (document.fonts)
- [ ] 모든 기존 기능 동등성 검증

**Gate G4**: 기존 Builder 기능 100% 동작

### Phase 5: Production 전환 (1주)

- [ ] PixiJS/Skia/Taffy 코드 삭제
- [ ] 패키지 의존성 제거
- [ ] 번들 크기 검증 (<500KB)
- [ ] 성능 최종 벤치마크
- [ ] 문서 업데이트

**Gate G5**: 전체 기능 + 성능 기준 충족 → production

**총 기간: ~6주** (vs ADR-100: ~21주)

---

## 11. 성능 예산

### 프레임 예산 (16.67ms at 60fps)

```
DOMBridge.flush()            < 2ms   (배치 DOM mutation)
Browser Style Recalc         < 2ms   (변경 서브트리만)
Browser Layout               < 3ms   (CSS containment 격리)
Browser Paint                < 2ms   (합성 레이어)
Browser Composite            < 1ms   (GPU)
InteractionOverlay update    < 1ms   (SVG 업데이트)
─────────────────────────────────────
Total                        < 11ms  ✓ (5.67ms 여유)
```

### 리소스 예산

| 리소스         |      ADR-100 (Unified Skia)      | ADR-101 (Browser-Native) |
| -------------- | :------------------------------: | :----------------------: |
| WASM           | ~6.4MB (CanvasKit + CSS3 Engine) |          **0**           |
| JS 번들        |              ~200KB              |        **~50KB**         |
| WebGL 컨텍스트 |                1                 |          **0**           |
| GPU 메모리     |            ~100-200MB            | **브라우저 관리** (자동) |
| JS 힙          |        ~80MB (1000 요소)         |   **~40MB** (DOM 풀링)   |

---

## 12. 테스트 전략

### 12.1 시각적 정합성 (Preview ≡ Canvas)

```typescript
// 같은 CSS를 사용하므로 100% 정합성 보장
// 그래도 검증:
test("canvas renders identically to preview", async () => {
  const previewScreenshot = await capturePreview(page);
  const canvasScreenshot = await captureCanvas(page);
  expect(pixelmatch(previewScreenshot, canvasScreenshot)).toBe(0); // 0px 차이
});
```

### 12.2 성능 회귀

```typescript
test("1000 elements maintain 55fps", async () => {
  const fps = await measureFPS(page, { elements: 1000, duration: 5000 });
  expect(fps.p95).toBeGreaterThanOrEqual(55);
});

test("initial load under 1 second", async () => {
  const loadTime = await measureInitialLoad(page);
  expect(loadTime).toBeLessThan(1000);
});
```

### 12.3 인터랙션 동등성

```typescript
test("drag and drop works", async () => {
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();

  const bounds = await page.evaluate(() =>
    document.querySelector('[data-element-id="el1"]')?.getBoundingClientRect(),
  );
  expect(bounds.x).toBeCloseTo(200, 0);
  expect(bounds.y).toBeCloseTo(200, 0);
});
```
