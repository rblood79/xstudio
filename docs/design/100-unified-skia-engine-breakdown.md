# ADR-100 구현 상세: Unified Skia Rendering Engine

> 이 문서는 [ADR-100](../adr/100-unified-skia-rendering-engine.md)의 구현 상세입니다.

## 검증된 오픈소스 의존성 및 참조

> 리서치 완료 (2026-04-06). 모든 핵심 기능에 검증된 소스코드가 존재함.

### 직접 의존 (fork 또는 채택)

| 프로젝트          | License | 용도                                                                           | GitHub                                                                |
| ----------------- | ------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Taffy v0.10.0** | MIT     | Layout Engine 포크 기반 — flex/grid/block/areas 검증됨. **sticky만 추가 구현** | [DioxusLabs/taffy](https://github.com/DioxusLabs/taffy) ⭐3.1k        |
| **geo-index**     | MIT     | Spatial Index — R-tree, flatbush zero-copy 바이너리 호환, WASM 명시 지원       | [georust/geo-index](https://github.com/georust/geo-index)             |
| **Popmotion**     | MIT     | CSS transition/animation 코어 — DOM 비의존, spring/keyframe/easing (4.5kb)     | [Popmotion/popmotion](https://github.com/Popmotion/popmotion) ⭐20.2k |

### 아키텍처 패턴 참조

| 패턴                           | 참조 프로젝트                                                                 | 참조 위치                                        |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| CanvasKit scene graph 브리지   | **AntV G** (MIT, ⭐1.2k) — 유일한 CanvasKit 렌더러 보유 scene graph           | `antvis/G/packages/g-plugin-canvaskit-renderer/` |
| Dirty rectangle 알고리즘       | **ZRender** (BSD-3, ⭐6.3k) — ECharts 프로덕션 검증                           | `ecomfe/zrender/src/canvas/`                     |
| Skia WASM + 타일 캐싱          | **Penpot** render-wasm (MPL-2, ⭐38k)                                         | `penpot/penpot/render-wasm/`                     |
| backdrop-filter/mask 구현      | **React Native Skia** (MIT, ⭐8.3k) — saveLayer + ImageFilter 패턴            | `Shopify/react-native-skia/packages/skia/src/`   |
| position: sticky 알고리즘      | **Stickyfill** (MIT, ⭐2.3k) — 3단계 상태 전환 (normal→fixed→absolute-bottom) | `wilddeer/stickyfill/src/`                       |
| CanvasKit + WASM 레이아웃 통합 | **OpenPencil** (MIT, ⭐4k) — XStudio와 거의 동일 스택                         | `open-pencil/open-pencil/`                       |
| Rust 100% 에디터 아키텍처      | **Graphite** (Apache-2.0, ⭐25k) — Rust 렌더링 + JS thin UI                   | `GraphiteEditor/Graphite/`                       |
| JS-WASM 경계 최적화            | **Penpot** — 바이너리 직렬화 (104byte/shape), linear memory 직접 조작         | `penpot/penpot/render-wasm/src/`                 |
| Stylo+Taffy+Parley 통합 패턴   | **Blitz** (MIT, ⭐3.5k) — 모듈별 독립 사용 가능한 아키텍처                    | `DioxusLabs/blitz/`                              |

### CSS3 렌더링 — 추가 라이브러리 불필요

| 기능                  | CanvasKit 내장 API                                                 | 참조 구현                             |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| backdrop-filter       | `saveLayer(bounds, null, backdropFilter)` + `ImageFilter.MakeBlur` | React Native Skia `BackdropBlur`      |
| text-shadow           | `TextStyle.shadows` + `ImageFilter.MakeDropShadow`                 | CanvasKit Paragraph API               |
| mask-image            | `MaskFilter` + `RuntimeEffect.Make` (SkSL shader)                  | React Native Skia alpha mask          |
| sepia/invert          | `ColorFilter.MakeMatrix` (5x4 color matrix)                        | 이미 XStudio `effects.ts`에 패턴 존재 |
| outline-style         | `Paint.setPathEffect(DashPathEffect.Make)`                         | Skia 공식 API                         |
| background-blend-mode | `Paint.setBlendMode` (18종 이미 구현)                              | 이미 XStudio `blendModes.ts`          |

## 목차

1. [현재 아키텍처 분석](#1-현재-아키텍처-분석)
2. [목표 아키텍처](#2-목표-아키텍처)
3. [Layer 1: GPU Backend 추상화](#3-layer-1-gpu-backend-추상화)
4. [Layer 2: Custom Rust Layout Engine](#4-layer-2-custom-rust-css3-layout-engine)
5. [Layer 3: SceneGraph (Retained Mode)](#5-layer-3-scenegraph-retained-mode)
6. [Layer 4: SkiaRenderer 확장](#6-layer-4-skiarenderer-확장)
7. [Layer 5: Event System 재설계](#7-layer-5-event-system-재설계)
8. [Layer 6: CSS3 렌더링 확장](#8-layer-6-css3-렌더링-확장)
9. [텍스트 파이프라인 통합 (ADR-051)](#9-텍스트-파이프라인-통합)
10. [제거 대상 파일 목록](#10-제거-대상-파일-목록)
11. [Phase 계획](#11-phase-계획)
12. [성능 예산](#12-성능-예산)
13. [테스트 전략](#13-테스트-전략)

---

## 1. 현재 아키텍처 분석

### 제거 대상: PixiJS

| 파일                                  | 역할                                    | 대체                               |
| ------------------------------------- | --------------------------------------- | ---------------------------------- |
| `pixiSetup.ts`                        | Component catalog, resolution           | 삭제 (SceneGraph가 해상도 관리)    |
| `BuilderCanvas.tsx`                   | @pixi/react Application, extend         | 순수 React + canvas element        |
| `sprites/ElementSprite.tsx` (~3200줄) | 요소 타입 분기, store 구독, spec shapes | StoreBridge + SceneGraph           |
| `sprites/BoxSprite.tsx`               | 박스 렌더링 (pixi Graphics)             | Skia nodeRenderers (이미 존재)     |
| `sprites/TextSprite.tsx`              | 텍스트 위치 지정                        | Skia nodeRendererText (이미 존재)  |
| `sprites/ImageSprite.tsx`             | 이미지 위치 지정                        | Skia nodeRendererImage (이미 존재) |
| `components/ClickableBackground.tsx`  | pixi 배경 이벤트                        | DOM event handler                  |
| `components/ElementsLayer.tsx`        | 레이아웃 계산 + pixi 트리               | SceneGraph (layout 결과 소비)      |
| `components/PageContainer.tsx`        | 페이지 pixi 컨테이너                    | SceneGraph PageNode                |
| `selection/SelectionLayer.tsx`        | 선택 박스 (pixi)                        | Skia SelectionOverlay (이미 존재)  |
| `selection/SelectionBox.tsx`          | 히트 테스트 (pixi)                      | WASM SpatialIndex (이미 존재)      |
| `skia/SkiaOverlay.tsx`                | CanvasKit + pixi 조합                   | SkiaCanvas (단독)                  |
| `types/pixi-react.d.ts`               | 타입 선언                               | 삭제                               |

**총 삭제 예상**: ~8,000줄 (PixiJS 관련)

### 제거 대상: Taffy WASM

| 파일                                    | 역할              | 대체                      |
| --------------------------------------- | ----------------- | ------------------------- |
| `wasm-bindings/taffyLayout.ts`          | Taffy WASM 바인딩 | CSS3 Layout Engine 바인딩 |
| `layout/engines/BaseTaffyEngine.ts`     | Taffy 기본 엔진   | 새 LayoutEngine 래퍼      |
| `layout/engines/TaffyFlexEngine.ts`     | Flex 엔진         | CSS3 Engine flex 모드     |
| `layout/engines/TaffyGridEngine.ts`     | Grid 엔진         | CSS3 Engine grid 모드     |
| `layout/engines/TaffyBlockEngine.ts`    | Block 엔진        | CSS3 Engine block 모드    |
| `layout/engines/persistentTaffyTree.ts` | Taffy 트리 관리   | CSS3 Engine 내부 트리     |

**총 교체 예상**: ~4,000줄 (새 바인딩으로 교체)

### 유지/확장 대상

| 파일                                       | 역할                       | 변경                           |
| ------------------------------------------ | -------------------------- | ------------------------------ |
| `skia/SkiaRenderer.ts`                     | Dual-surface 렌더          | dirty region 추가              |
| `skia/nodeRenderer*.ts` (13개)             | Skia 개별 렌더러           | CSS3 확장 (backdrop-filter 등) |
| `skia/specShapeConverter.ts`               | Spec→SkiaNode 변환         | 유지                           |
| `skia/effects.ts`                          | blur, shadow, opacity      | CSS3 필터 확장                 |
| `skia/fills.ts`                            | gradient, image fill       | 유지                           |
| `skia/blendModes.ts`                       | 18 blend modes             | background-blend-mode 추가     |
| `wasm-bindings/spatialIndex.ts`            | 히트 테스트                | 유지                           |
| `hooks/useCentralCanvasPointerHandlers.ts` | DOM 이벤트                 | SceneGraph 연결로 변경         |
| `layout/engines/fullTreeLayout.ts`         | 레이아웃 오케스트레이션    | 새 엔진 호출로 교체            |
| `layout/engines/utils.ts`                  | enrichWithIntrinsicSize 등 | 텍스트 측정 경로 변경          |
| `utils/canvas2dSegmentCache.ts`            | Pretext 기반 측정          | 통합 확장                      |

---

## 2. 목표 아키텍처

### 데이터 흐름 (단방향)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Zustand Store                           │
│  elementsMap(O(1)) · childrenMap · pageIndex · selectedIds      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 구독 (selector diff)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        StoreBridge                              │
│  store 변경 감지 → SceneNode 생성/갱신/삭제 → dirty flag 설정   │
│  React 렌더 사이클 완전 우회 (requestAnimationFrame 기반)       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SceneGraph                               │
│  SceneNode 트리 (순수 TS 객체)                                  │
│  ├─ DocumentNode                                                │
│  │   ├─ PageNode (page1)                                        │
│  │   │   ├─ ElementNode (body) ─ children: [...]                │
│  │   │   │   ├─ ElementNode (div)                               │
│  │   │   │   │   ├─ ElementNode (text)                          │
│  │   │   │   │   └─ ElementNode (image)                         │
│  │   │   │   └─ ElementNode (button)                            │
│  │   │   └─ ...                                                 │
│  │   └─ PageNode (page2) ...                                    │
│  ├─ Dirty Set (변경된 노드 ID)                                  │
│  ├─ Layout Cache (node → ComputedLayout)                        │
│  └─ Stacking Context 관리                                       │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐  ┌───────────────────────────────────────────────┐
│ CSS3 Layout  │  │              SkiaRenderer                     │
│ Engine       │  │  ┌─ GPU Backend (WebGL2 / WebGPU)             │
│ (Rust WASM)  │  │  ├─ contentSurface (dirty region 단위)        │
│              │  │  ├─ mainSurface (합성)                        │
│ flex/grid    │  │  ├─ nodeRenderers (확장)                      │
│ block/inline │  │  │   ├─ box, text, image, border              │
│ float/table  │  │  │   ├─ backdrop-filter, mask, text-shadow    │
│ multicol     │  │  │   └─ transition interpolation              │
│ sticky       │  │  └─ Overlay (selection, grid, hover)          │
│              │──┘                                                │
│ 출력:        │     ┌────────────────────────────────────────────┐
│ ComputedLayout│     │          Event System                      │
│ per node     │     │  DOM pointer events                        │
│              │     │   → screenToCanvas 변환                    │
└──────────────┘     │   → WASM SpatialIndex hitTest              │
                     │   → SceneGraph node 조회                   │
                     │   → Zustand Store 업데이트                 │
                     └────────────────────────────────────────────┘
```

### 프레임 루프

```
requestAnimationFrame
  │
  ├─ 1. StoreBridge.flush()
  │     store 변경 큐 → SceneNode 갱신 → dirty set 수집
  │
  ├─ 2. Layout (dirty 노드만)
  │     CSS3 Engine.computeLayout(dirtySubtrees)
  │     → ComputedLayout 캐시 갱신
  │     → SpatialIndex 갱신 (변경된 bounds만)
  │
  ├─ 3. Transition/Animation tick
  │     진행 중 애니메이션의 현재 프레임 보간값 계산
  │     → 해당 SceneNode 속성 갱신 → dirty 추가
  │
  ├─ 4. Render (classifyFrame 유지)
  │     ├─ idle: 스킵
  │     ├─ camera-only: contentSnapshot blit + transform
  │     ├─ content: dirty region만 contentSurface 재렌더
  │     ├─ present: overlay만 재렌더
  │     └─ full: 전체 재렌더
  │
  └─ 5. Overlay
        selection box, hover highlight, grid, guides
```

---

## 3. Layer 1: GPU Backend 추상화

### 목적

현재 CanvasKit WebGL2 → 미래 WebGPU 전환을 위한 추상화.

### 인터페이스

```typescript
// gpu/GPUBackend.ts
interface GPUBackend {
  // Surface 관리
  createSurface(canvas: HTMLCanvasElement, width: number, height: number): GPUSurface;
  createOffscreenSurface(width: number, height: number): GPUSurface;
  resizeSurface(surface: GPUSurface, width: number, height: number): void;
  disposeSurface(surface: GPUSurface): void;

  // 렌더링 세션
  beginFrame(surface: GPUSurface): RenderContext;
  endFrame(surface: GPUSurface): void;

  // Texture 캐시
  createTextureFromImage(image: ImageBitmap | HTMLImageElement): GPUTexture;
  disposeTexture(texture: GPUTexture): void;

  // 컨텍스트 상태
  isContextLost(): boolean;
  onContextLost(callback: () => void): void;
  onContextRestored(callback: () => void): void;

  // 정보
  getMaxTextureSize(): number;
  getDevicePixelRatio(): number;
}

// 구현
class CanvasKitWebGLBackend implements GPUBackend { ... }
// 미래
class CanvasKitWebGPUBackend implements GPUBackend { ... }
```

### 구현 전략

- Phase 1에서는 `CanvasKitWebGLBackend`만 구현
- 기존 `createSurface.ts` + `SkiaRenderer.ts`의 Surface 로직을 이 인터페이스 뒤로 이동
- WebGPU 전환 시 `CanvasKitWebGPUBackend` 구현 + 팩토리 교체만으로 전환

---

## 4. Layer 2: Custom Rust CSS3 Layout Engine

### 목표

현대 웹 핵심 레이아웃 완전 지원 (ROI 기반 스코프). 단일 Rust WASM 바이너리.

> ROI ≈ 0 기능 삭제: float, clear, table layout, inline formatting context, multi-column, margin collapsing.
> 보류 경로 유지: 수요 발생 시 독립 모듈로 추가 가능한 구조.

### 구조

```
xstudio-layout/ (새 Rust crate)
├── Cargo.toml
├── src/
│   ├── lib.rs              # WASM 진입점, wasm-bindgen exports
│   ├── tree.rs             # Layout tree (노드, 스타일, 자식 관계)
│   ├── style.rs            # CSS 스타일 구조체
│   ├── computed.rs         # Computed 스타일 (cascade, inheritance)
│   ├── layout.rs           # Layout 디스패치 (display별 분기)
│   │
│   ├── flex/               # Flexbox (Taffy fork, 검증됨)
│   │   ├── mod.rs
│   │   ├── algorithm.rs
│   │   └── types.rs
│   │
│   ├── grid/               # CSS Grid (Taffy fork + areas)
│   │   ├── mod.rs
│   │   ├── algorithm.rs
│   │   ├── track_sizing.rs
│   │   └── placement.rs    # grid-template-areas 포함
│   │
│   ├── block/              # Block Flow (단순 — margin collapse 제외)
│   │   ├── mod.rs
│   │   └── algorithm.rs
│   │
│   ├── position/           # Positioning
│   │   ├── mod.rs
│   │   ├── sticky.rs       # position: sticky (NEW)
│   │   ├── absolute.rs     # position: absolute/fixed (Taffy fork)
│   │   └── stacking.rs     # stacking context, z-index
│   │
│   ├── sizing/             # Intrinsic Sizing (Taffy fork)
│   │   ├── mod.rs
│   │   ├── content_size.rs # min-content, max-content, fit-content
│   │   └── aspect_ratio.rs
│   │
│   ├── text/               # Text Measurement Interface
│   │   ├── mod.rs
│   │   └── measure.rs      # JS callback으로 텍스트 측정 위임
│   │
│   └── spatial/            # Spatial Index (기존 WASM 통합)
│       ├── mod.rs
│       └── grid_index.rs   # cell-based 256px grid
│
│   # 🗑️ 삭제됨 (ROI ≈ 0):
│   # ├── inline/           # IFC, line box, bidi → 노코드 불필요
│   # ├── float/            # float/clear → flex/grid 대체
│   # ├── table/            # CSS table layout → Grid 대체
│   # └── multicol/         # multi-column → 보류 (niche)
```

### CSS 속성 지원 매트릭스 (ROI 다이어트 후)

| 카테고리         | 속성                                                                                                                               | 소스                |  상태   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------- | :-----: |
| **Display**      | flex, inline-flex, grid, inline-grid, block, none                                                                                  | Taffy fork          |   ✅    |
| **Flexbox**      | flex-direction, flex-wrap, justify-content, align-items, align-content, flex-grow, flex-shrink, flex-basis, order, gap, align-self | Taffy fork          |   ✅    |
| **Grid**         | grid-template-columns/rows, **grid-template-areas**, grid-auto-columns/rows, grid-auto-flow, grid-column/row, justify-items/self   | Taffy fork + areas  |   ✅    |
| **Block**        | width auto, height auto (margin collapse 제외)                                                                                     | Taffy fork          |   ✅    |
| **Position**     | static, relative, absolute, fixed, **sticky**, top/right/bottom/left, inset, z-index                                               | Taffy fork + sticky |   ✅    |
| **Box Model**    | width, height, min/max-\*, margin, padding, border-width, box-sizing, aspect-ratio                                                 | Taffy fork          |   ✅    |
| **Overflow**     | overflow (visible/hidden/scroll/auto), overflow-x/y                                                                                | Taffy fork          |   ✅    |
| **Sizing**       | fit-content, min-content, max-content, auto, calc()                                                                                | Taffy fork          |   ✅    |
| **Visibility**   | visibility (visible/hidden), display:none                                                                                          | 신규                |   ✅    |
| ~~**Float**~~    | ~~float, clear~~                                                                                                                   | —                   | 🗑️ 삭제 |
| ~~**Inline**~~   | ~~IFC, line box, baseline, bidi~~                                                                                                  | —                   | 🗑️ 삭제 |
| ~~**Table**~~    | ~~table-layout, border-collapse~~                                                                                                  | —                   | 🗑️ 삭제 |
| ~~**Multicol**~~ | ~~column-count, column-width~~                                                                                                     | —                   | ⏸️ 보류 |

### WASM 인터페이스

```rust
// lib.rs — wasm-bindgen exports
#[wasm_bindgen]
pub struct LayoutEngine {
    tree: LayoutTree,
    spatial_index: SpatialIndex,
}

#[wasm_bindgen]
impl LayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self;

    // 트리 조작
    pub fn build_tree_batch(&mut self, data: &[u8]) -> Vec<u32>;
    pub fn update_node_style(&mut self, handle: u32, style_json: &str) -> bool;
    pub fn set_children(&mut self, handle: u32, children: &[u32]);
    pub fn remove_node(&mut self, handle: u32);
    pub fn mark_dirty(&mut self, handle: u32);

    // 레이아웃 계산
    pub fn compute_layout(&mut self, root: u32, avail_w: f32, avail_h: f32);
    pub fn compute_layout_incremental(&mut self, dirty_nodes: &[u32], avail_w: f32, avail_h: f32);
    pub fn get_layouts_batch(&self, handles: &[u32]) -> Vec<f32>; // [x,y,w,h, x,y,w,h, ...]

    // Spatial Index (통합)
    pub fn hit_test_point(&self, x: f32, y: f32) -> Vec<u32>;
    pub fn query_rect(&self, x: f32, y: f32, w: f32, h: f32) -> Vec<u32>;
    pub fn update_spatial(&mut self, handle: u32, x: f32, y: f32, w: f32, h: f32);

    // 텍스트 측정 콜백 등록
    pub fn set_text_measure_func(&mut self, callback: js_sys::Function);

    // 디버그
    pub fn get_layout_debug(&self, handle: u32) -> String; // JSON
    pub fn get_tree_stats(&self) -> String;
}
```

### 텍스트 측정 위임

레이아웃 엔진은 텍스트 크기를 알 수 없으므로 JS 콜백으로 위임:

```rust
// text/measure.rs
pub trait TextMeasure {
    fn measure(&self, text: &str, style: &TextStyle, max_width: f32) -> (f32, f32);
}

// WASM에서는 JS 함수를 콜백으로 등록
struct JsTextMeasure {
    callback: js_sys::Function,
}
```

JS 측:

```typescript
// layoutBridge.ts
engine.set_text_measure_func(
  (text: string, styleJson: string, maxWidth: number) => {
    const style = JSON.parse(styleJson);
    // ADR-051 Pretext 기반 Canvas 2D 측정
    const result = canvas2dSegmentCache.measureText(text, style, maxWidth);
    return [result.width, result.height];
  },
);
```

### 빌드 & 배포

```toml
# Cargo.toml
[package]
name = "xstudio-layout"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
# Layout — Taffy v0.10.0 fork (flex/grid/block/areas 검증됨)
# git = "https://github.com/xstudio/taffy-fork" or path = "../taffy-fork"
taffy = { version = "0.10", features = ["grid", "block_layout"] }

# Spatial Index — geo-index (flatbush zero-copy 바이너리 호환)
geo-index = "0.2"

# WASM 바인딩
wasm-bindgen = "0.2"
js-sys = "0.3"

# 직렬화 (JS-WASM 경계 최소화 — Penpot 패턴: 바이너리 직렬화 우선)
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
panic = "abort"      # unwind 제거
opt-level = "s"      # 크기 최적화
lto = true           # 링크 타임 최적화
codegen-units = 1    # 단일 유닛
strip = true         # 디버그 심볼 제거
```

빌드:

```bash
wasm-pack build --target web --release
# 후처리 (10-20% 추가 감소)
wasm-opt -Os -o xstudio_layout_opt.wasm xstudio_layout_bg.wasm
```

예상 WASM 크기: ~250-350KB (gzip ~100-140KB)

- Taffy flex/grid/block: ~150KB
- geo-index R-tree: ~50KB
- sticky + wasm-bindgen 글루: ~50-150KB

---

## 5. Layer 3: SceneGraph (Retained Mode)

### SceneNode 구조

```typescript
// sceneGraph/SceneNode.ts
interface SceneNode {
  // Identity
  id: string; // element ID
  tag: string; // HTML tag or component tag
  parentId: string | null;

  // Tree
  children: SceneNode[];
  childrenOrder: string[]; // ordered child IDs

  // Style (CSS properties → layout input)
  style: CSSStyleDeclaration; // 모든 CSS3 속성

  // Computed Layout (layout output)
  layout: ComputedLayout; // { x, y, width, height, ... }

  // Visual (Skia rendering input)
  visual: SceneNodeVisual; // fills, strokes, effects, transforms
  specShapes: SkiaNodeData[] | null; // spec-driven shapes

  // State
  dirty: DirtyFlags; // LAYOUT | VISUAL | CHILDREN | TRANSFORM
  visible: boolean; // viewport culling 결과
  stackingOrder: number; // z-index resolved

  // Interaction
  interactive: boolean; // pointer-events
  cursor: string;

  // Animation
  activeTransitions: Map<string, TransitionState> | null;
  activeAnimations: AnimationState[] | null;
}

// Dirty flags (비트 마스크)
const enum DirtyFlags {
  NONE = 0,
  LAYOUT = 1 << 0, // 레이아웃 재계산 필요
  VISUAL = 1 << 1, // 렌더링 재실행 필요
  CHILDREN = 1 << 2, // 자식 목록 변경
  TRANSFORM = 1 << 3, // transform 변경 (layout 불필요, 렌더만)
  SUBTREE = 1 << 4, // 하위 트리 전체 dirty
}
```

### SceneGraph 클래스

```typescript
// sceneGraph/SceneGraph.ts
class SceneGraph {
  private root: SceneNode; // DocumentNode
  private nodeMap: Map<string, SceneNode>; // O(1) lookup
  private dirtyNodes: Set<string>; // dirty 노드 수집
  private dirtyRegions: DirtyRegion[]; // 화면 dirty 영역

  // 노드 조작
  createNode(
    id: string,
    tag: string,
    style: CSSStyle,
    parentId: string,
  ): SceneNode;
  updateStyle(id: string, changes: Partial<CSSStyle>): void;
  updateVisual(id: string, visual: Partial<SceneNodeVisual>): void;
  moveNode(id: string, newParentId: string, index: number): void;
  removeNode(id: string): void;

  // Dirty 관리
  markDirty(id: string, flags: DirtyFlags): void;
  collectDirtySubtrees(): string[]; // layout 엔진에 전달할 dirty subtree roots
  clearDirty(): void;

  // 쿼리
  getNode(id: string): SceneNode | undefined;
  getVisibleNodes(viewport: DOMRect): SceneNode[]; // culling
  getNodesInRegion(rect: DOMRect): SceneNode[];

  // Stacking context
  resolveStackingOrder(): void;

  // Dirty region (렌더링용)
  getDirtyRegions(): DirtyRegion[];
  addDirtyRegion(rect: DOMRect): void;
}
```

### StoreBridge

Zustand Store 변경을 SceneGraph에 반영하는 브릿지. React 렌더 사이클을 우회.

```typescript
// sceneGraph/StoreBridge.ts
class StoreBridge {
  private graph: SceneGraph;
  private prevSnapshot: StoreSnapshot | null = null;
  private changeQueue: StoreChange[] = [];
  private unsubscribe: () => void;

  constructor(graph: SceneGraph, store: BuilderStore) {
    // Zustand subscribe로 변경 감지 (React 외부)
    this.unsubscribe = store.subscribe(
      (state) => this.onStoreChange(state),
      // selector: elementsMap, childrenMap, pageIndex만 구독
    );
  }

  private onStoreChange(state: BuilderState): void {
    // 변경사항을 큐에 추가 (RAF에서 일괄 처리)
    this.changeQueue.push(this.diffState(state));
  }

  // RAF에서 호출
  flush(): void {
    if (this.changeQueue.length === 0) return;

    for (const change of this.changeQueue) {
      switch (change.type) {
        case "create":
          this.graph.createNode(
            change.id,
            change.tag,
            change.style,
            change.parentId,
          );
          break;
        case "update":
          this.graph.updateStyle(change.id, change.styleChanges);
          if (change.visualChanges) {
            this.graph.updateVisual(change.id, change.visualChanges);
          }
          break;
        case "move":
          this.graph.moveNode(change.id, change.newParentId, change.index);
          break;
        case "remove":
          this.graph.removeNode(change.id);
          break;
      }
    }
    this.changeQueue.length = 0;
  }

  private diffState(state: BuilderState): StoreChange[] {
    // elementsMap diff → create/update/remove 변환
    // childrenMap diff → move 변환
    // 이전 스냅샷과 비교하여 최소 변경 계산
  }
}
```

---

## 6. Layer 4: SkiaRenderer 확장

### Dirty Region 렌더링

기존 `classifyFrame()` 5단계에 dirty region 최적화 추가:

```typescript
// 기존: content → 전체 contentSurface 재렌더
// 신규: content-partial → dirty region만 재렌더

classifyFrame(): FrameType {
  // ... 기존 idle/present/camera-only 로직 유지

  if (this.dirtyRegions.length > 0) {
    const totalDirtyArea = this.dirtyRegions.reduce((sum, r) => sum + r.area, 0);
    const totalArea = this.contentWidth * this.contentHeight;

    if (totalDirtyArea / totalArea < 0.3) {
      return 'content-partial';  // dirty region만 재렌더
    }
  }
  return 'content';  // 전체 재렌더 (dirty 비율 30% 초과)
}

renderContentPartial(canvas: Canvas, dirtyRegions: DirtyRegion[]): void {
  for (const region of dirtyRegions) {
    canvas.save();
    canvas.clipRect(region.toSkRect());

    // region 내 노드만 렌더
    const nodesInRegion = this.sceneGraph.getNodesInRegion(region);
    for (const node of nodesInRegion) {
      this.renderNode(canvas, node);
    }

    canvas.restore();
  }
}
```

### GPU Texture Cache

자주 변하지 않는 요소(이미지, 복잡한 그래디언트)를 GPU 텍스처로 캐싱:

```typescript
// skia/textureCache.ts
class GPUTextureCache {
  private cache: Map<string, CachedTexture>;
  private maxSize: number; // 최대 GPU 메모리 (기본 256MB)
  private currentSize: number;

  // 복잡한 노드를 오프스크린 서피스에 렌더 후 텍스처로 캐시
  cacheNode(
    nodeId: string,
    renderFn: (canvas: Canvas) => void,
    width: number,
    height: number,
  ): SkImage;

  // 캐시 히트
  getCachedTexture(nodeId: string, version: number): SkImage | null;

  // LRU 퇴출
  evict(): void;
}
```

---

## 7. Layer 5: Event System 재설계

### 현재 구조 (유지하는 부분)

```
DOM pointerdown/move/up (container div)
  → useCentralCanvasPointerHandlers
  → screenToCanvasPoint (zoom/pan 변환)
  → WASM SpatialIndex.hitTestPoint
  → resolveTopmostHitElementId
  → Zustand Store 업데이트
```

이 구조는 이미 PixiJS에 의존하지 않으므로 **대부분 유지**.

### 변경 사항

1. **PixiJS 이벤트 제거**: ElementSprite의 `onPointerDown/Over/Up/Leave` → SceneGraph에서 직접 처리

```typescript
// events/HoverManager.ts
class HoverManager {
  private graph: SceneGraph;
  private currentHoverId: string | null = null;

  onPointerMove(canvasPoint: Point): void {
    const hitIds = spatialIndex.hitTestPoint(canvasPoint.x, canvasPoint.y);
    const topId = resolveTopmostHitElementId(hitIds);

    if (topId !== this.currentHoverId) {
      if (this.currentHoverId) {
        this.graph.getNode(this.currentHoverId)?.setPreviewState(null);
      }
      if (topId) {
        this.graph.getNode(topId)?.setPreviewState("hover");
      }
      this.currentHoverId = topId;
    }
  }
}
```

2. **Cursor 관리**: PixiJS sprite cursor → DOM canvas element cursor

```typescript
// events/CursorManager.ts
class CursorManager {
  private canvasEl: HTMLCanvasElement;

  updateCursor(nodeId: string | null, handleHit: HandlePosition | null): void {
    if (handleHit) {
      this.canvasEl.style.cursor = handleToCursor(handleHit);
    } else if (nodeId) {
      const node = sceneGraph.getNode(nodeId);
      this.canvasEl.style.cursor = node?.cursor ?? "default";
    } else {
      this.canvasEl.style.cursor = "default";
    }
  }
}
```

3. **카메라 관리**: PixiJS Container → 순수 상태 객체

```typescript
// viewport/Camera.ts
class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;

  screenToCanvas(screenX: number, screenY: number, canvasRect: DOMRect): Point {
    return {
      x: (screenX - canvasRect.left - this.x) / this.zoom,
      y: (screenY - canvasRect.top - this.y) / this.zoom,
    };
  }

  applyToCanvas(canvas: SkiaCanvas): void {
    canvas.translate(this.x, this.y);
    canvas.scale(this.zoom, this.zoom);
  }
}
```

---

## 8. Layer 6: CSS3 렌더링 확장

### 신규 구현 항목

#### 8.1 backdrop-filter

```typescript
// nodeRendererEffects.ts (확장)
function renderBackdropFilter(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  filter: BackdropFilter,
): void {
  // 1. 현재 canvas 상태를 SaveLayer로 캡처
  const bounds = node.layout.toSkRect();
  const paint = new ck.Paint();

  // 2. backdrop 영역 추출 (뒤쪽 콘텐츠)
  canvas.saveLayer(bounds, null); // 기존 콘텐츠 캡처

  // 3. blur 적용
  const blurFilter = ck.ImageFilter.MakeBlur(
    filter.blur,
    filter.blur,
    ck.TileMode.Clamp,
    null,
  );
  const backdropPaint = new ck.Paint();
  backdropPaint.setImageFilter(blurFilter);

  // 4. SaveLayerRec로 backdrop에 필터 적용
  canvas.saveLayer(bounds, backdropPaint);
  canvas.restore(); // backdrop layer
  canvas.restore(); // original save

  // 5. 전경 콘텐츠 렌더
  renderNodeContent(ck, canvas, node);
}
```

#### 8.2 text-shadow

```typescript
// nodeRendererText.ts (확장)
function applyTextShadow(
  builder: ParagraphBuilder,
  shadows: TextShadow[],
): void {
  for (const shadow of shadows) {
    builder.addShadow({
      color: colorToFloat32(shadow.color),
      offset: [shadow.offsetX, shadow.offsetY],
      blurRadius: shadow.blur,
    });
  }
}
```

#### 8.3 mask-image

```typescript
// nodeRendererMask.ts (신규)
function renderWithMask(
  ck: CanvasKit,
  canvas: Canvas,
  node: SceneNode,
  mask: MaskImage,
): void {
  const maskShader = createMaskShader(ck, mask, node.layout);
  const paint = new ck.Paint();
  paint.setShader(maskShader);
  paint.setBlendMode(ck.BlendMode.DstIn); // mask intersection

  canvas.saveLayer(null, null);
  renderNodeContent(ck, canvas, node); // 원본 콘텐츠
  canvas.saveLayer(null, paint); // mask 적용
  canvas.restore();
  canvas.restore();
}
```

#### 8.4 CSS Transitions

```typescript
// animation/TransitionEngine.ts
class TransitionEngine {
  private active: Map<string, Map<string, TransitionState>> = new Map();

  // 스타일 변경 시 transition 시작
  onStyleChange(
    nodeId: string,
    prop: string,
    from: number,
    to: number,
    duration: number,
    easing: EasingFn,
  ): void {
    const state: TransitionState = {
      prop,
      from,
      to,
      duration,
      easing,
      startTime: performance.now(),
      current: from,
    };
    if (!this.active.has(nodeId)) this.active.set(nodeId, new Map());
    this.active.get(nodeId)!.set(prop, state);
  }

  // RAF tick에서 호출
  tick(now: number): string[] {
    const dirtyNodeIds: string[] = [];

    for (const [nodeId, transitions] of this.active) {
      for (const [prop, state] of transitions) {
        const elapsed = now - state.startTime;
        const t = Math.min(elapsed / state.duration, 1);
        state.current = state.from + (state.to - state.from) * state.easing(t);

        if (t >= 1) {
          transitions.delete(prop);
        }
        dirtyNodeIds.push(nodeId);
      }
      if (transitions.size === 0) this.active.delete(nodeId);
    }
    return dirtyNodeIds;
  }
}
```

#### 8.5 CSS Animations (@keyframes)

```typescript
// animation/AnimationEngine.ts
interface KeyframeAnimation {
  name: string;
  keyframes: Keyframe[]; // { offset: 0~1, style: Partial<CSSStyle> }
  duration: number;
  iterationCount: number | "infinite";
  direction: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fillMode: "none" | "forwards" | "backwards" | "both";
  easing: EasingFn;
}

class AnimationEngine {
  private active: Map<string, AnimationState[]> = new Map();

  start(nodeId: string, animation: KeyframeAnimation): void;
  tick(now: number): string[]; // dirty node IDs
  stop(nodeId: string, animationName: string): void;
  stopAll(nodeId: string): void;
}
```

#### 8.6 추가 필터 (sepia, invert)

```typescript
// effects.ts (확장)
function createSepiaMatrix(): Float32Array {
  return new Float32Array([
    0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131,
    0, 0, 0, 0, 0, 1, 0,
  ]);
}

function createInvertMatrix(): Float32Array {
  return new Float32Array([
    -1, 0, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, 0, 1, 0,
  ]);
}
```

---

## 9. 텍스트 파이프라인 통합

ADR-051의 Pretext 기반 Canvas 2D 측정을 새 아키텍처에 통합:

```
텍스트 측정 (Layout Engine 요청)
  ↓
JS 콜백 (engine.set_text_measure_func)
  ↓
canvas2dSegmentCache.ts
  ├─ Intl.Segmenter 토큰화
  ├─ Canvas 2D measureText() 캐시
  ├─ Greedy line-breaking + lineFitEpsilon
  └─ Line verification (Tier 2)
  ↓
결과: { width, height } → Rust Layout Engine
  ↓
렌더링 시 (nodeRendererText.ts)
  ├─ Break Hint (\n) 주입
  ├─ CanvasKit Paragraph 생성
  └─ post-layout getMaxIntrinsicWidth() 교정
```

---

## 10. 제거 대상 파일 목록

### 완전 삭제

```
apps/builder/src/builder/workspace/canvas/
├── pixiSetup.ts                          # PixiJS 초기화
├── sprites/
│   ├── ElementSprite.tsx                  # ~3200줄
│   ├── BoxSprite.tsx                      # ~150줄
│   ├── TextSprite.tsx                     # ~100줄
│   └── ImageSprite.tsx                    # ~100줄
├── components/
│   ├── ClickableBackground.tsx            # pixi 배경
│   ├── ElementsLayer.tsx                  # pixi 트리 (layout 로직은 이전)
│   └── PageContainer.tsx                  # pixi 페이지
├── selection/
│   ├── SelectionBox.tsx                   # pixi 선택 (Skia overlay로 대체)
│   └── (pixi 관련 부분)
└── types/pixi-react.d.ts                 # 타입

packages/layout-flow/ (또는 Taffy WASM 관련)
└── (Taffy 패키지 전체 → 새 xstudio-layout crate로 대체)

wasm-bindings/
└── taffyLayout.ts                        # → layoutEngine.ts로 교체

layout/engines/
├── BaseTaffyEngine.ts                    # 삭제
├── TaffyFlexEngine.ts                    # 삭제
├── TaffyGridEngine.ts                    # 삭제
├── TaffyBlockEngine.ts                   # 삭제
└── persistentTaffyTree.ts                # 삭제
```

### 패키지 의존성 제거

```json
// package.json에서 제거
"pixi.js": "^8.14.3",
"@pixi/react": "^8.x",
"@pixi/layout": "(이미 제거됨)"
```

---

## 11. Phase 계획 (ROI 다이어트 후 — 14주)

> 원본 21주 → 14주. Float/Inline(4주) + Table/Multicol(4주) 삭제, Sticky만 Phase 3에 통합.

### Phase 0: 기반 준비 + 벤치마크 (1주)

- [ ] Shadow Engine 브랜치 생성 (`feature/unified-skia-engine`)
- [ ] 현재 성능 baseline 측정 (FPS, 초기 로드, 메모리, 드래그 지연)
- [ ] GPU Backend 추상화 인터페이스 설계
- [ ] SceneGraph 타입 정의 + 단위 테스트 스캐폴딩
- [ ] Rust Layout Engine crate 초기화 + wasm-pack 빌드 파이프라인

**Gate G0**: baseline 측정 완료, WASM 빌드 파이프라인 동작 확인

### Phase 1: Rust Layout Engine — Flex/Grid/Block 패리티 (4주)

- [ ] Taffy flex 알고리즘 포크 + 단위 테스트 이식
- [ ] Taffy grid 알고리즘 포크 + **grid-template-areas** 추가
- [ ] Block 레이아웃 (margin collapse 제외 — 노코드 빌더는 gap/padding)
- [ ] 텍스트 측정 JS 콜백 인터페이스 구현
- [ ] Spatial Index 통합 (기존 WASM 코드 이식)
- [ ] 기존 Taffy 테스트 케이스 100% 통과 검증

**Gate G1**: flex/grid/block 레이아웃 기존 테스트 100% 통과

### Phase 2: SceneGraph + PixiJS 제거 (3주)

- [ ] SceneGraph 구현 (SceneNode, dirty flag, tree 관리)
- [ ] StoreBridge 구현 (Zustand→SceneGraph 동기화)
- [ ] GPU Backend (CanvasKitWebGLBackend) 구현
- [ ] SkiaRenderer를 SceneGraph에서 직접 렌더하도록 변경
- [ ] Event System 재설계 (HoverManager, CursorManager, Camera)
- [ ] PixiJS 의존성 전체 제거
- [ ] 기존 캔버스 기능 100% 동작 검증

**Gate G2**: PixiJS 없이 기존 기능 100% 동작, 60fps 유지

### Phase 3: Sticky + CSS3 렌더링 확장 (3주)

- [ ] **position: sticky** 구현 (스크롤 오프셋 비교, containing block 기준)
- [ ] **position: fixed** 구현 (viewport 기준 배치)
- [ ] backdrop-filter 구현 (SaveLayer + blur behind)
- [ ] text-shadow 구현 (CanvasKit ParagraphStyle shadow)
- [ ] mask-image 구현 (CanvasKit Shader mask)
- [ ] CSS transitions 엔진 구현
- [ ] CSS animations (@keyframes) 엔진 구현
- [ ] sepia, invert 필터 추가 (ColorMatrix)
- [ ] outline-style (dashed, dotted) 추가
- [ ] background-blend-mode 추가

**Gate G3**: sticky 동작 + 렌더링 확장 전부 동작

### Phase 4: 성능 최적화 + 벤치마크 (2주)

- [ ] Dirty region 렌더링 최적화
- [ ] GPU texture cache 구현
- [ ] 5000 요소 멀티페이지 프로파일링
- [ ] WASM 바이너리 크기 최적화 (wasm-opt)
- [ ] 성능 벤치마크 (vs baseline)
- [ ] hot path 병목 식별 + 최적화

**Gate G4**: 1000 요소 60fps, 5000 요소 50fps+, 초기 로드 <3초, 드래그 <16ms

### Phase 5: Shadow→Production 전환 (1주)

- [ ] 기능 동등성 최종 검증 (전체 컴포넌트 스펙 테스트)
- [ ] 엣지 케이스 수정 (스크롤, 중첩 overflow, 복합 레이아웃)
- [ ] ADR-051 (Pretext 텍스트 측정) 통합 최종 검증
- [ ] main 브랜치 머지 준비
- [ ] PixiJS/Taffy dead code 최종 정리
- [ ] 문서 업데이트 (RENDERING_ARCHITECTURE.md, COMPONENT_SPEC.md)

**Gate G5**: 기능 100% 동등 + 성능 동등 이상 → production 전환

### 보류 Phase (수요 발생 시)

- **Phase X-1: Multi-column** — column-count, column-width, column-gap, break rules
- **Phase X-2: Subgrid** — nested grid template inheritance
- **Phase X-3: Writing modes** — vertical-rl, direction: rtl, unicode-bidi

---

## 12. 성능 예산

### 목표 vs 현재

| 메트릭                     |         현재 (Dual Renderer)         |    목표 (Unified Skia)     |      개선       |
| -------------------------- | :----------------------------------: | :------------------------: | :-------------: |
| WebGL 컨텍스트             |                  2                   |             1              | -50% GPU 메모리 |
| WASM 모듈 초기화           | 3 (CanvasKit + Taffy + SpatialIndex) | 2 (CanvasKit + CSS3Engine) |      -33%       |
| 초기 로드 (WASM)           |                ~2.5초                |           <1.5초           |      -40%       |
| 100 요소 FPS               |                60fps                 |           60fps            |      유지       |
| 1000 요소 FPS              |               45-55fps               |           60fps            |     +15-30%     |
| 5000 요소 FPS              |               20-30fps               |          50-60fps          |      +100%      |
| 드래그 지연                |         ~12ms (동기화 포함)          |            <8ms            |      -33%       |
| 스타일 변경 → 렌더         |           ~20ms (3곳 갱신)           |        <10ms (1곳)         |      -50%       |
| React 컴포넌트 수 (캔버스) |             N (요소 수)              |             0              |      -100%      |
| JS 힙 메모리               |          ~150MB (1000 요소)          |           ~80MB            |      -47%       |
| 번들 (PixiJS)              |            ~450KB (gzip)             |             0              |     -450KB      |

### 프레임 예산 (16.67ms at 60fps)

```
StoreBridge.flush()          < 1ms   (diff + queue 처리)
Layout (dirty only)          < 3ms   (WASM compute_layout_incremental)
Transition tick              < 0.5ms (보간 계산)
Render (dirty region)        < 8ms   (Skia draw calls)
Overlay                      < 2ms   (selection, hover)
Present (GPU blit)           < 1ms   (surface composite)
─────────────────────────────────────
Total                        < 15.5ms ✓ (1.17ms 여유)
```

---

## 13. 테스트 전략

### 13.1 레이아웃 정합성 테스트

브라우저 CSS 렌더링 결과와 Rust CSS3 Engine 결과를 자동 비교:

```typescript
// tests/layout-parity/
// 각 CSS3 기능별 테스트 HTML 생성 → 브라우저에서 getBoundingClientRect() 수집
// → 동일 스타일로 Rust Engine computeLayout() → 결과 비교

describe("float layout parity", () => {
  test("float left with clear", async () => {
    const browserLayouts = await getBrowserLayouts("float-left-clear.html");
    const engineLayouts = engine.computeAndGetLayouts(floatLeftClearTree);
    assertLayoutsMatch(browserLayouts, engineLayouts, { tolerance: 1 }); // ≤1px
  });
});
```

### 13.2 렌더링 스크린샷 비교

Skia 렌더링 결과 vs CSS 브라우저 렌더링의 시각적 비교:

```
1. 테스트 HTML → headless Chrome 스크린샷
2. 동일 요소 트리 → Skia 렌더링 → PNG 출력
3. pixelmatch 비교 (허용 오차: 0.1%)
```

### 13.3 성능 회귀 테스트

```typescript
// tests/performance/
describe("canvas performance", () => {
  test("1000 elements at 60fps", () => {
    const fps = measureFPS(createScene(1000), { duration: 5000 });
    expect(fps.p95).toBeGreaterThanOrEqual(60);
  });

  test("drag latency < 16ms", () => {
    const latency = measureDragLatency(createScene(500));
    expect(latency.p95).toBeLessThan(16);
  });

  test("initial load < 3s", () => {
    const loadTime = measureInitialLoad();
    expect(loadTime).toBeLessThan(3000);
  });
});
```

### 13.4 Superseded ADR 검증

- ADR-003 (PixiJS): 모든 기존 기능이 PixiJS 없이 동작하는지 검증
- ADR-008 (Taffy): 모든 기존 레이아웃이 새 엔진에서 동일하게 계산되는지 검증
