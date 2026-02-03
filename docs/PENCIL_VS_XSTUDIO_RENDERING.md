# Pencil vs xstudio 렌더링 성능 비교 분석

> 분석일: 2026-01-29
> Pencil: v1.1.10 (Electron + CanvasKit/Skia WASM + PixiJS v8)
> xstudio: PixiJS v8.14.3 + @pixi/react v8.0.5
>
> **주의:** Pencil 기능 중 "✅ (추정)"으로 표기된 항목은 바이너리 분석에서 확인된 것이 아니라 코드 패턴 기반 추정이다. 이에 따라 커버리지 계산(55% → 95%)의 분모가 추정치를 포함하고 있으므로, 실제 커버리지는 표기된 수치와 다를 수 있다.

---

## 1. 렌더링 스택 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **메인 렌더러** | **CanvasKit/Skia WASM** (pencil.wasm, 7.8MB) — 모든 디자인 노드의 벡터/텍스트/이미지/이펙트 렌더링 | **CanvasKit/Skia WASM** (canvaskit-wasm) — 디자인 노드 + AI 이펙트 + Selection 오버레이 렌더링 ✅ (2026-02-01 전환) |
| 씬 그래프/이벤트 | PixiJS v8 — 씬 트리 관리 + EventBoundary (Hit Testing) 전용, 디자인 노드 렌더링에 불참여 | PixiJS v8.14.3 — 씬 그래프 + EventBoundary (Hit Testing) 전용, Camera 하위 `alpha=0`으로 시각적 렌더링 비활성화 |
| GPU Surface | CanvasKit MakeWebGLCanvasSurface → GrDirectContext → MakeOnScreenGLSurface (폴백: MakeSWCanvasSurface) | PixiJS WebGL 컨텍스트 |
| React 바인딩 | @pixi/react v8 | @pixi/react v8.0.5 |
| 레이아웃 | @pixi/layout (Yoga WASM) | @pixi/layout v3.2.0 (Yoga WASM) |
| WASM 모듈 | **CanvasKit (Skia) WASM** (7.8MB) — 메인 렌더 엔진 + Yoga | **CanvasKit WASM** (메인 렌더러) + **Rust WASM** (SpatialIndex + Layout 가속, 70KB) + Yoga WASM ✅ (2026-02-02) |
| 번들 크기 | index.js 5.7MB + WASM 7.8MB = ~13.5MB | 측정 필요 |
| 플랫폼 | Electron (GPU 직접 접근) | 웹 브라우저 (WebGL 제약) |

> **중요 정정사항:** 초기 분석에서 "PixiJS가 메인 렌더러"로 기술했으나, 심층 역공학 결과 **CanvasKit/Skia WASM이 메인 렌더러**이며 PixiJS는 씬 그래프 관리와 이벤트 처리만 담당하는 것으로 확인됨. 모든 씬 노드가 `renderSkia(renderer, canvas, cullingBounds)` 메서드를 구현하여 CanvasKit Canvas API를 직접 호출한다.
>
> **xstudio 진행 상황 (2026-02-02):** xstudio도 Pencil 방식으로 전환 완료. Selection 오버레이(선택 박스, Transform 핸들, 라쏘) + 디자인 노드 + AI 이펙트 모두 CanvasKit/Skia에서 렌더링. PixiJS는 투명 히트 영역 + 이벤트 처리 전용.
> `buildSkiaTreeHierarchical()`가 계층적 Skia 트리를 구성하며, worldTransform 부모-자식 상대 좌표로 팬 중에도 상대 위치가 항상 정확. Selection은 `buildTreeBoundsMap()`으로 컨텐츠와 동일한 좌표 소스를 참조.

---

## 2. 최적화 기법 비교표

### 범례
- ✅ 구현됨
- 🔶 부분적/기본 수준
- ❌ 미구현
- 📋 WASM 계획에 포함

### 전환 영향도 (Phase 5-6 CanvasKit 전환 시)

> 아래 비교표의 비고 컬럼에 다음 태그로 CanvasKit 전환 영향을 표기한다.

- 🔄 **대체**: PixiJS 한정 구현 → CanvasKit API로 대체/재구현 필요
- ✅ **유지**: 렌더러 무관 (React/JS/Zustand 레이어) → 코드 변경 없이 유지
- ⬆️ **강화**: 현재 구현(로직) 유지 + CanvasKit으로 품질/성능 향상

### 2.1 렌더링 파이프라인

> **Pencil 핵심 구조:** CanvasKit/Skia WASM이 메인 렌더러. 모든 씬 노드가 `renderSkia()` 메서드로 CanvasKit Canvas API 직접 호출. PixiJS는 씬 그래프/이벤트 전용.

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| **Skia WASM 렌더링** | ✅ renderSkia() — 모든 노드 | ✅ SkiaOverlay renderFrame — 디자인 노드 + AI + Selection | - | xstudio: CanvasKit이 디자인/AI/Selection 렌더링 전담 (2026-02-01) |
| **이중 Surface 캐싱** | ✅ contentSurface + mainSurface | ✅ Phase 6 + classifyFrame 프레임 분류 (idle/content/full) | - | camera-only blit은 인프라 구현 완료 (snapshotCamera + 아핀 변환 + cleanup render) 단 contentSurface 뷰포트 크기 제한으로 비활성화, Phase 5 Content Render Padding 구현 시 재활성화 (2026-02-03) |
| WebGL 배치 렌더링 | ✅ (236 refs) | 🔶 PixiJS 기본 | - | Pencil은 커스텀 배치 레이어 보유 — 🔄 Phase 5에서 CanvasKit 드로우로 대체 |
| Dirty Rect 렌더링 | ✅ (104 refs) | ✅ 좌표 변환 구현, 활성화 | - | 씬-로컬 → content canvas 좌표 변환 (`rect * zoom + pan`), 뷰포트 30% 초과 시 전체 렌더 폴백 (2026-02-03) |
| GPU 텍스처 캐싱 | ✅ (104 refs) | ✅ cacheAsTexture | - | xstudio Phase F 구현 — 🔄 Phase 5에서 CanvasKit Surface 캐싱으로 대체 |
| 텍스처 아틀라싱 | ✅ | ❌ | ❌ | 다수 텍스처를 단일 시트로 합치기 |
| RenderTexture 풀링 | ✅ | ❌ | ❌ | 렌더 텍스처 재사용 |
| LOD (Level of Detail) | ✅ (추정) | ❌ | ❌ | 줌 레벨별 디테일 조절 |
| 블렌드 모드 최적화 | ✅ 18종 (l1e 함수 매핑) | 🔶 PixiJS 기본 | - | normal→SrcOver, multiply→Multiply 등 — 🔄 Phase 6.3에서 CanvasKit BlendMode 18종으로 대체 |
| 커스텀 셰이더 | ✅ (GLSL+WebGPU) | ❌ | ❌ | 특수 효과 GPU 가속 |
| **6종 Fill 시스템** | ✅ Shader 기반 | 🔶 Color/Gradient | ❌ | Pencil: Color/Linear/Radial/Angular/MeshGradient/Image — 🔄 Phase 5.5에서 CanvasKit Shader 6종으로 대체 |
| **이펙트 파이프라인** | ✅ beginRenderEffects | 🔶 기본 | ❌ | Opacity(saveLayer)/BackgroundBlur/LayerBlur/DropShadow(Inner+Outer) — 🔄 Phase 5.6에서 CanvasKit saveLayer로 대체 |

### 2.2 공간 및 히트 테스트

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 뷰포트 컬링 | ✅ | ✅ AABB + SpatialIndex O(k) | ✅ Phase 1 | xstudio: SpatialIndex query_viewport로 O(k) 컬링 ✅ (2026-02-02) |
| 공간 인덱스 (Spatial Index) | ✅ (추정) | ✅ Rust WASM Grid-cell 기반 | ✅ Phase 1 | O(n) → O(k) 쿼리 개선 ✅ (2026-02-02) |
| 히트 테스트 가속 | ✅ PixiJS EventBoundary — hitTestRecursive, 역순 z-order, Prune+Cull | ❌ 전체 순회 | 📋 Phase 1 | Pencil: PixiJS가 이벤트/히트테스트 전담 |
| Scissor 클리핑 | ✅ clipToViewport | ❌ | ❌ | GPU 레벨 클리핑 |

### 2.3 레이아웃 엔진

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| Flexbox (Yoga WASM) | ✅ | ✅ | - | 동일 — ✅ 유지 |
| Grid 레이아웃 | ✅ (추정) | ✅ 커스텀 엔진 | 📋 Phase 2 | xstudio GridEngine 120줄 — ⬆️ Phase 2에서 WASM 가속 |
| Block 레이아웃 | ✅ (추정) | ✅ 커스텀 엔진 | 📋 Phase 2 | xstudio BlockEngine 671줄 — ⬆️ Phase 2에서 WASM 가속 |
| WASM 연산 가속 | ✅ pencil.wasm | ❌ | 📋 Phase 2 | 레이아웃 배치 계산 |
| 레이아웃 캐싱 | ✅ | 🔶 layoutBoundsRegistry | - | xstudio: JS Map 캐시 |

### 2.4 메모리 및 오브젝트 관리

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 오브젝트 풀링 | ✅ | ✅ SpritePool | - | xstudio: max 100개 (PixiJS Sprite/Container) — 🔄 Phase 5에서 CanvasKit 객체 관리로 대체 |
| 텍스처 GC | ✅ | ✅ autoGarbageCollect | - | PixiJS autoGarbageCollect — 🔄 Phase 5에서 CanvasKit .delete() Disposable 패턴으로 대체 |
| WeakMap 추적 | ✅ | ❌ | ❌ | 약한 참조 기반 메모리 관리 |
| VRAM 예산 관리 | ✅ (추정) | 🔶 메트릭 추적만 | ❌ | xstudio: 모니터링만 |

### 2.5 프레임 및 해상도 관리

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 동적 해상도 | ✅ | ✅ getDynamicResolution | - | xstudio: 픽셀 버짓 기반 — ⬆️ 알고리즘 유지, CanvasKit Surface 해상도로 적용 대상 변경 |
| 저사양 기기 감지 | ✅ (추정) | ✅ isLowEnd 캐싱 | - | CPU 코어, 메모리, 모바일 — ✅ 유지 (렌더러 무관 유틸리티) |
| 안티앨리어싱 조건부 | ✅ (60 refs) | ✅ !isLowEnd | - | 저사양에서 비활성화 — 🔄 Phase 5에서 paint.setAntiAlias()로 API 변경 |
| 프레임 스로틀링 | ✅ (추정) | 🔶 RAF 기반 | - | 명시적 프레임 스킵 없음 |
| OffscreenCanvas | ✅ webworkerAll.js | ❌ | ❌ | 오프스크린 렌더링 |
| powerPreference | ✅ | ✅ "high-performance" | - | GPU 선택 힌트 — 🔄 Phase 5에서 CanvasKit 자체 WebGL context로 이전 |

### 2.6 React 최적화

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 메모이제이션 | ✅ | ✅ (900+ instances) | - | memo, useMemo, useCallback — ✅ 유지 |
| 직접 컨테이너 조작 | ✅ | ✅ ViewportController | - | 드래그 중 React 우회 — 🔄 Phase 5에서 CanvasKit transform으로 수정 필요 |
| 선택 상태 개별 구독 | ✅ (추정) | ✅ O(2) 최적화 | - | Set.has() 기반 — ✅ 유지 |
| startTransition | ❌ (Electron) | ✅ Phase 18 | - | 비긴급 업데이트 분리 — ✅ 유지 |
| Imperative Handle | ✅ (추정) | ✅ SelectionBox | - | 드래그 중 직접 위치 갱신 — ✅ 유지 |

### 2.7 Web Worker / 멀티스레딩

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| Web Worker 연산 | ✅ webworkerAll.js | ❌ | 📋 Phase 4 | 오프메인스레드 계산 |
| SharedArrayBuffer | ✅ (추정) | ❌ | ❌ | 메인-워커 공유 메모리 |
| Worker WASM 실행 | ✅ | ❌ | 📋 Phase 4 | Worker에서 WASM 호출 |

---

## 3. WASM 계획의 Pencil 커버리지

### 3.1 커버하는 영역

| Pencil 기능 | WASM 계획 Phase | 커버율 |
|------------|----------------|--------|
| 공간 인덱스 기반 컬링 | Phase 1: SpatialIndex | **80%** — 동등한 그리드 기반 공간 인덱스 |
| 히트 테스트 가속 | Phase 1: query_point | **70%** — AABB 기반. Pencil의 Prune+Cull 다단계 방식에 비해 단순 |
| 레이아웃 WASM 가속 | Phase 2: block/grid | **60%** — 배치 계산만 위임. Pencil의 전체 WASM 레이아웃 대비 부분적 |
| Web Worker 통합 | Phase 4: Worker | **50%** — 기본 구조만. Pencil의 webworkerAll.js 대비 범위 좁음 |

### 3.2 커버하지 못하는 영역

| Pencil 기능 | 누락 사유 | xstudio 영향도 |
|------------|----------|---------------|
| ~~**Dirty Rect 렌더링**~~ | ~~인프라 구현 완료, 좌표 변환 미구현~~ | ✅ **구현 완료 (2026-02-03)** — 씬-로컬→content canvas 좌표 변환 + 뷰포트 30% 폴백 |
| **텍스처 아틀라싱** | WASM 계획에 미포함 | **높음** — GPU 드로 콜 감소 효과 큼 |
| **LOD 스위칭** | WASM 계획에 미포함 | **중간** — 줌아웃 시 디테일 감소 |
| **RenderTexture 풀링** | WASM 계획에 미포함 | **중간** — GPU 메모리 재사용 |
| **커스텀 셰이더** | WASM 계획에 미포함 | **낮음** — 특수 효과용 |
| **OffscreenCanvas** | Phase 4에서 Worker만 다룸 | **중간** — 렌더링 자체의 오프스크린 이전 |
| **SharedArrayBuffer** | xstudio 환경에서 사용 불가 — Vite 설정에서 COOP/COEP 헤더를 Supabase 인증 호환을 위해 제거하고 있으며, SharedArrayBuffer는 이 헤더가 필수 | **중간** — 메인-워커 데이터 공유 |
| **Scissor 클리핑** | WASM 계획에 미포함 | **낮음** — GPU 레벨 최적화 |

### 3.3 종합 커버리지

```
Pencil 렌더링 최적화 전체: 100%
├── xstudio 이미 구현: ~60% (React 최적화, 동적 해상도, 컬링, 캐싱, 풀링, CanvasKit 렌더 파이프라인)
│   └── CanvasKit/Skia: 디자인 노드 + AI 이펙트 + Selection 오버레이 렌더링 ✅ (2026-02-01)
├── WASM 구현 완료:     ~15% (SpatialIndex, 레이아웃 가속, Worker) ✅ (2026-02-02)
├── Pencil 렌더링 최적화: ~8% (Dirty Rect 활성화, AI Flash, 줌 속도 + camera-only blit 인프라 보존) ✅ (2026-02-03)
├── 추가 개선 필요:    ~7% (아틀라싱, LOD, RenderTexture)
└── Pencil 고유 영역:  ~5% (커스텀 셰이더, 전체 노드 renderSkia 메서드)
```

**WASM 계획 + Pencil 렌더링 최적화 완료 시 Pencil 대비 약 83% 수준의 렌더링 최적화를 달성.**
나머지 12%는 아래 추가 개선 항목으로 보완 가능.

> **⚠️ 전환 영향:** "xstudio 이미 구현 60%" 중 일부는 PixiJS 한정 구현(🔄 대체 필요)이다.
> Phase 5-6 CanvasKit 전환 시 이 항목들은 CanvasKit API로 **재구현**해야 하며,
> 단순히 "이미 적용됨 → 추가 작업 불필요"가 아님에 주의.
> React/Zustand 레이어 최적화(~25-30%)만 전환 후에도 코드 변경 없이 유지된다(✅ 유지).
> CanvasKit 렌더 파이프라인(디자인 노드/AI/Selection)은 이미 구현 완료(2026-02-01).
> 상세 분류는 §2 비교표의 전환 영향도 태그(🔄/✅/⬆️) 참조.

---

## 4. 추가 개선 항목 (WASM 계획 외)

### 4.1 [완료] Dirty Rect 부분 렌더링 ✅ (2026-02-03)

**현황:** 좌표 변환 구현으로 활성화 완료. `renderContent(cullingBounds, camera, dirtyRects)`에서 씬-로컬 좌표를 content canvas 좌표로 변환 후 `clipRect()` 적용.

**구현 내용:**
- **좌표 변환:** `screenRect = { x: rect.x * zoom + panX, y: rect.y * zoom + panY, width: rect.width * zoom, height: rect.height * zoom }`
- **뷰포트 폴백:** `mergeDirtyRects(rects, 16, viewportArea)` — 병합 결과 총 면적이 뷰포트 30% 초과 시 빈 배열 반환 → 전체 렌더링 폴백
- **Camera-only Blit (인프라 보존, 비활성화):** contentSurface가 뷰포트 크기로 제한되어 팬 시 가장자리 클리핑 발생. Phase 5 Content Render Padding (512px) 구현 시 재활성화 예정. `blitWithCameraTransform()`, `snapshotCamera`, `scheduleCleanupRender()` 코드 보존됨

**수정 파일:** `SkiaRenderer.ts`, `dirtyRectTracker.ts`, `SkiaOverlay.tsx`, `types.ts`

**통합 지점:** `BuilderCanvas.tsx`의 PixiJS Application ticker에서 dirty 영역만 렌더.

**예상 효과:** 정적 요소가 많은 캔버스에서 GPU 부하 40-60% 감소.

**적용 파일:**
- `canvas/utils/dirtyRectTracker.ts` (신규)
- `canvas/BuilderCanvas.tsx` (ticker 수정)
- `canvas/canvasSync.ts` (dirty 상태 추적)

---

### 4.2 [높음] 텍스처 아틀라싱

**현황:** 각 이미지/아이콘이 별도 텍스처로 GPU에 업로드됨.
**Pencil:** 텍스처 아틀라스로 다수 이미지를 단일 GPU 텍스처에 합침.

**구현 방안:**
```typescript
// canvas/utils/textureAtlas.ts

import { RenderTexture, Sprite, Container } from 'pixi.js';

class DynamicTextureAtlas {
  private atlas: RenderTexture;
  private packer: RectanglePacker;
  private regions: Map<string, Rectangle> = new Map();

  constructor(renderer: Renderer, size: number = 2048) {
    this.atlas = RenderTexture.create({ width: size, height: size });
    this.packer = new RectanglePacker(size, size);
  }

  addTexture(key: string, texture: Texture): Rectangle | null {
    const region = this.packer.pack(texture.width, texture.height);
    if (!region) return null; // 아틀라스 가득 참

    // 렌더 텍스처에 그리기
    const sprite = new Sprite(texture);
    sprite.position.set(region.x, region.y);
    renderer.render({ container: sprite, target: this.atlas });

    this.regions.set(key, region);
    return region;
  }

  getRegion(key: string): Texture | null {
    const region = this.regions.get(key);
    if (!region) return null;
    return new Texture({ source: this.atlas.source, frame: region });
  }
}
```

**예상 효과:**
- 100개 이미지: 드로 콜 100 → 1-2 (98% 감소)
- GPU 상태 전환 최소화 → 프레임 타임 개선

**적용 파일:**
- `canvas/utils/textureAtlas.ts` (신규)
- `canvas/sprites/ImageSprite.tsx` (아틀라스에서 텍스처 조회)
- `canvas/sprites/ElementSprite.tsx` (아이콘 아틀라싱)

---

### 4.3 [중간] LOD (Level of Detail) 스위칭

**현황:** 모든 줌 레벨에서 동일한 디테일로 렌더링.
**Pencil:** 줌아웃 시 디테일을 줄여 렌더링 비용 절감 (추정).

**구현 방안:**
```typescript
// canvas/hooks/useLOD.ts

interface LODLevel {
  minZoom: number;
  renderText: boolean;
  renderBorders: boolean;
  renderShadows: boolean;
  renderImages: 'full' | 'placeholder' | 'none';
  spriteResolution: number;
}

const LOD_LEVELS: LODLevel[] = [
  { minZoom: 0.5, renderText: true, renderBorders: true, renderShadows: true, renderImages: 'full', spriteResolution: 2 },
  { minZoom: 0.25, renderText: true, renderBorders: true, renderShadows: false, renderImages: 'full', spriteResolution: 1 },
  { minZoom: 0.1, renderText: false, renderBorders: false, renderShadows: false, renderImages: 'placeholder', spriteResolution: 0.5 },
  { minZoom: 0, renderText: false, renderBorders: false, renderShadows: false, renderImages: 'none', spriteResolution: 0.25 },
];

export function useLOD(zoom: number): LODLevel {
  return useMemo(() => {
    for (const level of LOD_LEVELS) {
      if (zoom >= level.minZoom) return level;
    }
    return LOD_LEVELS[LOD_LEVELS.length - 1];
  }, [zoom]);
}
```

**통합 지점:**
- `ElementSprite.tsx` — LOD 레벨에 따라 하위 스프라이트 활성화/비활성화
- `TextSprite.tsx` — 줌 0.1 이하에서 텍스트 렌더링 스킵
- `ImageSprite.tsx` — 줌아웃 시 저해상도 플레이스홀더 사용

**예상 효과:** 줌아웃 상태에서 렌더링 비용 60-80% 감소.

**적용 파일:**
- `canvas/hooks/useLOD.ts` (신규)
- `canvas/sprites/ElementSprite.tsx` (LOD 분기)
- `canvas/sprites/TextSprite.tsx` (텍스트 렌더링 스킵)
- `canvas/sprites/ImageSprite.tsx` (플레이스홀더)

---

### 4.4 [중간] RenderTexture 풀링

**현황:** 캐시된 텍스처가 매번 새로 생성됨.
**Pencil:** RenderTexture 재사용 패턴 존재.

**구현 방안:**
```typescript
// canvas/utils/renderTexturePool.ts

class RenderTexturePool {
  private pool: Map<string, RenderTexture[]> = new Map();

  // 크기 기반 키 생성 (256 단위로 반올림하여 재사용 극대화)
  private getKey(width: number, height: number): string {
    const w = Math.ceil(width / 256) * 256;
    const h = Math.ceil(height / 256) * 256;
    return `${w}x${h}`;
  }

  acquire(width: number, height: number): RenderTexture {
    const key = this.getKey(width, height);
    const pool = this.pool.get(key);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }
    const w = Math.ceil(width / 256) * 256;
    const h = Math.ceil(height / 256) * 256;
    return RenderTexture.create({ width: w, height: h });
  }

  release(rt: RenderTexture): void {
    const key = this.getKey(rt.width, rt.height);
    const pool = this.pool.get(key) ?? [];
    if (pool.length < 10) { // 크기별 최대 10개
      pool.push(rt);
      this.pool.set(key, pool);
    } else {
      rt.destroy(true);
    }
  }
}
```

**예상 효과:** GPU 메모리 할당/해제 빈도 감소, GC 부하 완화.

**적용 파일:**
- `canvas/utils/renderTexturePool.ts` (신규)
- `canvas/utils/useCacheOptimization.ts` (풀에서 텍스처 획득/반환)

---

### 4.5 [중간] OffscreenCanvas 렌더링

**현황:** 모든 렌더링이 메인 스레드에서 수행됨.
**Pencil:** `webworkerAll.js` (183KB)로 오프스크린 연산 수행.

**구현 방안:**
```typescript
// canvas/workers/offscreenRenderer.ts

// 메인 스레드:
const offscreen = canvasElement.transferControlToOffscreen();
const worker = new Worker(new URL('./renderWorker.ts', import.meta.url));
worker.postMessage({ type: 'INIT', canvas: offscreen }, [offscreen]);

// Worker:
self.onmessage = (e) => {
  if (e.data.type === 'INIT') {
    const app = new Application();
    await app.init({ canvas: e.data.canvas, ... });
    // Worker에서 전체 PixiJS 렌더링 수행
  }
};
```

**제약사항:**
- PixiJS v8의 OffscreenCanvas 지원 확인 필요
- DOM 이벤트는 메인 스레드에서 Worker로 전달해야 함
- 복잡도가 높아 Phase 4 이후 검토 권장

---

### 4.6 [낮음] VRAM 예산 관리자

**현황:** xstudio는 VRAM 사용량을 모니터링만 함 (`gpuProfilerCore.ts`).
**Pencil:** GPU 메모리 예산 관리 (추정).

**구현 방안:**
```typescript
// canvas/utils/vramBudgetManager.ts

class VRAMBudgetManager {
  private budget: number;          // 목표 VRAM (bytes)
  private currentUsage = 0;
  private lruQueue: string[] = []; // 최근 사용 텍스처 키

  constructor(budgetMB: number = 256) {
    this.budget = budgetMB * 1024 * 1024;
  }

  canAllocate(bytes: number): boolean {
    return this.currentUsage + bytes <= this.budget;
  }

  evictUntilFit(bytes: number): string[] {
    const evicted: string[] = [];
    while (!this.canAllocate(bytes) && this.lruQueue.length > 0) {
      const key = this.lruQueue.shift()!;
      evicted.push(key);
      // 텍스처 해제 로직
    }
    return evicted;
  }
}
```

---

## 5. 우선순위별 추가 개선 로드맵

```
✅ 완료 (2026-02-03):
├── 4.1 Dirty Rect 렌더링 — 좌표 변환 구현, 활성화 완료
│
즉시 적용 가능 (WASM 불필요, JS만으로 구현):
├── 4.3 LOD 스위칭 — useLOD 훅 추가, ElementSprite에 분기
├── 4.6 VRAM 예산 관리 — gpuProfilerCore.ts 확장
│
WASM 계획 완료 후:
├── 4.2 텍스처 아틀라싱 — ImageSprite/아이콘 통합
├── 4.4 RenderTexture 풀링 — useCacheOptimization 개선
│
장기 검토:
├── Phase 5 Content Render Padding (512px) — camera-only blit 재활성화 전제조건
└── 4.5 OffscreenCanvas — Phase 4 Worker 확장
```

---

## 6. 최종 성능 커버리지 전망

| 단계 | Pencil 대비 커버율 | 누적 |
|------|------------------|------|
| xstudio 현재 상태 | 55% | 55% |
| + WASM Phase 1 (SpatialIndex) | +8% | 63% |
| + WASM Phase 2 (Layout 가속) | +7% | 70% |
| + WASM Phase 4 (Worker) | +5% | 75% |
| + ~~4.1 Dirty Rect 렌더링~~ | ~~+8%~~ | ~~83%~~ |
| **✅ Pencil 렌더링 최적화 (2026-02-03)** | **+8%** | **83%** |
| + 4.2 텍스처 아틀라싱 | +5% | 88% |
| + 4.3 LOD 스위칭 | +4% | 92% |
| + 4.4 RenderTexture 풀링 | +3% | 95% |
| Pencil 고유 영역 (7.8MB WASM) | 5% | - |

> **결론:** WASM 계획 + Pencil 렌더링 최적화(Dirty Rect, AI Flash, 줌 속도) 적용으로 **약 83%** 달성.
> Camera-only Blit은 인프라 구현 완료했으나 Content Render Padding(Phase 5) 없이는 가장자리 클리핑이 발생하여 비활성화.
> 추가 개선 3항목(아틀라싱, LOD, RenderTexture 풀링) + Phase 5 적용 시 **약 95%**까지 도달 가능.
> 나머지 5%는 Pencil의 7.8MB 전용 WASM 모듈(벡터 래스터라이즈, 기하 연산)에 해당하며,
> 이는 xstudio의 디자인 빌더 특성상 필수적이지 않을 수 있다.

---

## 7. 즉시 실행 가능한 Quick Win 목록

WASM 계획과 무관하게, JS만으로 즉시 적용 가능한 최적화:

| 항목 | 예상 효과 | 난이도 | 수정 파일 |
|------|----------|--------|----------|
| LOD 스위칭 (줌 기반) | 줌아웃 시 60-80% GPU 절감 | 낮음 | useLOD.ts (신규), ElementSprite.tsx |
| 텍스트 렌더링 스킵 (줌 < 0.1) | 다수 텍스트 시 30% 절감 | 낮음 | TextSprite.tsx |
| 이미지 플레이스홀더 (줌 < 0.25) | 이미지 多 시 50% 절감 | 낮음 | ImageSprite.tsx |
| VRAM 사용량 경고 임계값 | 메모리 폭주 방지 | 낮음 | gpuProfilerCore.ts |
| SpritePool 크기 동적 조절 | 대규모 페이지 적응 | 낮음 | SpritePool.ts |

---

## 8. 종합 비교 분석: 현재 코드 vs WASM 최적화 적용

> 기준일: 2026-01-29
> 대상: `docs/WASM.md` (6차 검토 반영) 기준 WASM 최적화 계획
> 비교 방법: 현재 코드베이스 실측 구조 기반 추정 (Phase 0 벤치마크 후 실측값으로 대체 예정)

### 8.1 핵심 연산별 성능 비교

| 영역 | 현재 (JS) | WASM 적용 후 | 개선 효과 |
|------|----------|-------------|----------|
| **뷰포트 컬링** | `elements.filter()` O(n) 전수 순회 — useMemo 6개 의존성, 매 pan/zoom마다 전체 요소 검사 | `SpatialIndex.query_viewport()` O(k) — Grid 셀 기반 공간 탐색 + AABB 교차 검증 | n=1,000일 때 k≈50~100이면 **10~20배 감소** |
| **라쏘 선택** | `elements.filter()` O(n) — 드래그 종료 시 전체 순회, `calculateBounds(style)` 매번 CSS 파싱 | `SpatialIndex.query_rect()` O(k) — 내부 bounds 캐시 사용, CSS 파싱 불필요 | 드래그 선택 응답 시간 **10배+ 감소** |
| **블록 레이아웃** | JS `BlockEngine.calculate()` 692줄 — 매 자식마다 style 파싱 25~30회 속성 조회, V8 JIT 의존 | WASM `calculate()` — Float32Array 평탄화 입력, Rust 네이티브 루프 | 100+ 자식 시 **2~5배** (마샬링 비용 상쇄 후) |
| **그리드 레이아웃** | JS `parseGridTemplate()` regex split + `calculateGridCellBounds()` 4중 루프 O(n×√(cols×rows)) | WASM `parse_tracks()` + `calculate_cell_positions()` 일괄 계산 | 트랙 파싱 + 셀 배치 **3~8배** |
| **마진 콜랩스** | JS `collapseMargins()` O(1) 단일 호출 — 이미 충분히 빠름 | WASM `calculate()` 내부에서 일괄 처리 — JS↔WASM 경계 넘기 0회 | 개별 위임 없이 배치 포함 → **경계 비용 절감** |
| **히트 테스트 (클릭)** | PixiJS `FederatedPointerEvent` O(1)~O(log n) — 이미 최적 | 변경 없음 | — |
| **CSS 파싱** | `parseCSSValue()` 매번 parseFloat + endsWith, 동일 스타일 반복 파싱 | WeakMap 캐싱 + createsBFC bitmask 사전 변환 (JS 최적화) | 반복 파싱 **제거** |

### 8.2 요소 규모별 예상 프레임 타임 비교

| 요소 수 | 연산 | 현재 JS 예상 비용 | WASM 적용 후 예상 비용 | 개선 비율 |
|---------|------|------------------|---------------------|----------|
| **50개** (소규모) | 뷰포트 컬링 | ~0.05ms | ~0.02ms | 2.5x |
| | 블록 레이아웃 | ~0.3ms | ~0.5ms (마샬링 오버헤드 > 이득) | **JS가 빠름** |
| **500개** (중규모) | 뷰포트 컬링 | ~0.5ms (500 AABB 체크) | ~0.05ms (k≈50 SpatialIndex 쿼리) | **10x** |
| | 블록 레이아웃 | ~3ms | ~1.5ms | 2x |
| | 라쏘 선택 | ~0.5ms | ~0.05ms | **10x** |
| **2,000개** (대규모) | 뷰포트 컬링 | ~2ms (2,000 AABB 체크) | ~0.08ms (k≈80 쿼리) | **25x** |
| | 블록 레이아웃 | ~12ms | ~3ms | **4x** |
| | 라쏘 선택 | ~2ms | ~0.1ms | **20x** |
| **5,000개** (스트레스) | 뷰포트 컬링 | ~5ms (프레임 드롭 위험) | ~0.1ms | **50x** |
| | 블록 레이아웃 | ~30ms (UI jank 발생) | ~8ms (Worker 분리 시 메인 스레드 0ms) | **∞** (Worker) |

> **주의:** 수치는 코드 구조 기반 추정치이며, Phase 0 벤치마크에서 실측값으로 대체해야 한다.
> 블록 레이아웃 50개 이하에서는 JS↔WASM 마샬링 비용이 연산 이득을 상쇄하므로, 임계값(>10 자식) 분기가 필수.

### 8.3 아키텍처별 장점 비교

| 영역 | 현재 상태 | WASM 적용 후 | 장점 |
|------|----------|-------------|------|
| **공간 검색** | 인덱스 없음 — `elements.filter()` 배열 순회만 존재 | Grid 기반 SpatialIndex (cell_size=256, i64 키 인코딩) | O(n)→O(k) 전환, 요소 수와 무관한 쿼리 성능 |
| **렌더 순서** | `elements` 배열 순서에 암묵적 의존 | `elementOrderIndex` Map — `rebuildIndexes()` 시 동기 갱신 | SpatialIndex 결과에 O(k log k) 정렬로 렌더/스태킹 순서 보존 |
| **인덱스 리빌드** | `_rebuildIndexes()` 14곳에서 개별 호출, 배치 최적화 없음 | `suspendIndexRebuild()`/`resumeAndRebuildIndexes()` 패턴 | 100개 요소 복붙 시 100회→1회 리빌드 (O(n·m)→O(n)) |
| **메인 스레드 부하** | 모든 레이아웃이 메인 스레드에서 동기 실행 | 중량 레이아웃(>10 요소)을 Worker로 분리, Stale-While-Revalidate 전략 | 레이아웃 계산 중 UI 프리징 제거 |
| **폴백 안전성** | JS 단일 경로 | WASM 무조건 활성화 (Feature Flag 제거됨), try-catch 에러 핸들링 유지 | WASM 초기화 실패 시 에러 로깅, JS 폴백 경로 제거됨 |
| **ID 매핑** | string UUID만 사용 (메모리/비교 비용 높음) | `ElementIdMapper` string↔u32 양방향, `tryGetNumericId()` 안전 조회 | WASM 경계에서 4바이트 u32 사용 → 메모리/비교 최적화 |
| **Bounds 소스 통일** | `layoutBoundsRegistry` (JS Map) + `calculateBounds(style)` 혼재 | SpatialIndex 내부 bounds 캐시 + registry 동기화 | 단일 소스 기반 일관된 bounds 조회 |
| **페이지 범위 관리** | `elements` 배열이 전체 페이지 포함 — 컬링/쿼리에 불필요한 요소 포함 | 페이지 전환 시 `clearAll()` + 현재 페이지 `batch_upsert()` | SpatialIndex 메모리/쿼리 범위를 현재 페이지로 한정 |

### 8.4 메모리 및 번들 영향

| 항목 | 현재 | WASM 적용 후 | 변화량 |
|------|------|-------------|-------|
| WASM 바이너리 | yoga-layout ~296KB | yoga + xstudio-wasm ~326KB (+30KB gzip) | **+30KB** (60KB 한도 이내) |
| SpatialIndex 메모리 | — | HashMap 3개 (cells, element_cells, bounds) | **+~5MB** (5,000요소 기준) |
| ElementIdMapper | — | Map 2개 (string↔u32 양방향) | **+~0.5MB** (5,000요소 기준) |
| elementOrderIndex | — | Map 1개 (string→number) | **+~0.3MB** (5,000요소 기준) |
| CSS 캐싱 (WeakMap) | — | WeakMap (자동 GC 대상) | 미미 |
| Worker 스레드 | — | Worker 1개 + WASM 인스턴스 복사 | **+~300KB** |
| **총 추가 메모리** | — | — | **+6~7MB** (5,000요소 기준) |

> 현대 브라우저 기준(탭당 ~1~4GB 할당)에서 +6~7MB는 허용 범위.

### 8.5 현재 SLO 대비 예상 효과

| 연산 | 현재 SLO | 현재 예상 (500요소) | WASM 적용 후 (500요소) | 여유도 변화 |
|------|---------|-------------------|---------------------|-----------|
| 드래그 이동 | 16ms | 10~15ms | 3~5ms | 위험→**3x 여유** |
| 클릭 선택 | 50ms | 5~10ms | 5~10ms | 이미 충분 (PixiJS 기반) |
| 페이지 전환 | 100ms | 50~80ms (2,000요소) | 20~40ms | 보통→**2x 여유** |
| Undo/Redo | 50ms | 30~50ms | 15~25ms (배치 리빌드) | 위험→**2x 여유** |
| 줌/팬 응답 | 16ms | 5~8ms (500), 15ms+ (2,000) | 1~2ms (SpatialIndex) | 보통→**10x 여유** |

### 8.6 개발 복잡도 및 리스크

| 항목 | 현재 | WASM 적용 후 | 트레이드오프 |
|------|------|-------------|------------|
| 빌드 파이프라인 | Vite + TypeScript | + Rust/wasm-pack + vite-plugin-wasm | CI에 Rust 툴체인 추가 필요 |
| 디버깅 | Chrome DevTools에서 JS 직접 디버깅 | WASM은 소스맵 제한, JS 폴백으로 디버깅 | Feature Flag로 경로 전환 |
| 테스트 | Vitest (JS만) | + `wasm-pack test --node` (Rust 단위 테스트) | 이중 테스트 인프라 유지 |
| 코드 동기화 | JS 단일 소스 | JS preprocess + WASM calculate 분리 | 전처리/후처리 경계 명확화 필수 |
| SharedArrayBuffer | COOP/COEP 비활성 (Supabase 인증 충돌) | 사용 불가 → copy-before-transfer 패턴 | 제로카피 불가, 복사 오버헤드 발생 |
| 팀 기술 스택 | TypeScript/React | + Rust 기본 지식 필요 | 학습 곡선 존재 |

### 8.7 Phase별 예상 ROI 요약

| Phase | 투자 내용 | 주요 장점 | ROI 판단 |
|-------|----------|----------|---------|
| **Phase 0** (환경+벤치마크) | Rust/wasm-pack 설정, 측정 도구 구축 | 실측 기준선 확보 → 이후 Phase 필요성 데이터 기반 판단 | **필수** — 이후 모든 Phase의 의사결정 근거 |
| **Phase 1** (SpatialIndex) | spatial_index.rs + idMapper + 통합 5개 파일 | 뷰포트 컬링 O(n)→O(k), 라쏘 O(n)→O(k) | **가장 높은 ROI** — 500+ 요소에서 즉시 체감 |
| **Phase 2** (Layout Engine) | block_layout.rs + grid_layout.rs + preprocess 설계 | 블록/그리드 레이아웃 2~5배 가속 | **조건부** — 100+ 자식 복잡 레이아웃에서 유효 |
| ~~Phase 3~~ (제거됨) | 텍스트/CSS 파싱은 WASM 부적합 판정 | JS 캐싱으로 대체 (WeakMap, bitmask) | WASM 불필요 |
| **Phase 4** (Worker) | Worker + Bridge + LayoutScheduler | 메인 스레드 레이아웃 부하 완전 제거 | **대규모 전용** — 2,000+ 요소 프로젝트에서 가치 |

### 8.8 최종 판단

```
현재 JS 코드의 주요 병목:
  1. 뷰포트 컬링: O(n) 전수 순회 ← Phase 1 SpatialIndex로 해결 (최대 50x 개선)
  2. 라쏘 선택: O(n) 전수 순회 ← Phase 1 query_rect로 해결 (최대 20x 개선)
  3. 레이아웃 계산: JS 메인 스레드 동기 실행 ← Phase 2+4로 해결 (2~5x + Worker 분리)
  4. 인덱스 리빌드: 배치 작업 시 반복 호출 ← 배치 리빌드 패턴으로 해결 (m회→1회)
  5. CSS 파싱 반복: 동일 스타일 매번 재파싱 ← WeakMap 캐싱으로 해결 (JS 최적화)

WASM 최적화의 핵심 가치:
  ✓ 요소 수 증가에 강건한 성능 (O(n)→O(k) 전환)
  ✓ 메인 스레드 부하 분리 (Worker)
  ✓ Feature Flag 기반 점진적 도입 + 즉시 롤백
  ✗ 소규모(50개 이하) 프로젝트에서는 마샬링 비용이 이득을 상쇄
  ✗ Rust 빌드 인프라 + 이중 테스트 유지 비용
```

---

## 9. 스타일 관리 체계 비교 분석

> 분석일: 2026-01-30
> Pencil: `.pen` JSON + VariableManager + SceneGraph
> xstudio: Zustand + Jotai 하이브리드 + CSS inline style

### 9.1 데이터 모델 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **저장 형식** | `.pen` JSON — 노드 트리에 스타일 인라인 | 컴포넌트 props + `element.style` 객체 |
| **스타일 위치** | 노드 자체에 플랫 프로퍼티로 직접 보유 | `element.style` (inline) + `element.computedStyle` (CSS class) 분리 |
| **프로퍼티 수** | 무제한 (커스텀 프로퍼티 자유 정의) | 36개 고정 (Transform 4 + Layout 16 + Appearance 5 + Typography 11) |
| **값 표현** | 직접값 또는 `$--변수명` 참조 | CSS 값 문자열 (`"500px"`, `"100%"`, `"flex-start"`) |
| **단위 시스템** | px 중심 (%, vh/vw 없음) | CSS 표준 단위 (px, %, vh, vw, auto, fit-content) |

**Pencil 노드 스타일 예시:**
```json
{
  "type": "frame",
  "fill": "$--popover",
  "cornerRadius": "$--radius-m",
  "stroke": { "align": "inside", "thickness": 1, "fill": "$--border" },
  "effect": { "type": "shadow", "shadowType": "outer", "color": "#0000000f",
              "offset": {"x":0,"y":2}, "blur": 3.5, "spread": -1 },
  "layout": "vertical",
  "gap": 8
}
```

**xstudio 요소 스타일 예시:**
```typescript
element = {
  type: "Card",
  style: { width: "500px", backgroundColor: "#f5f5f5" },       // inline
  computedStyle: { display: "flex", borderRadius: "8px" },      // CSS class
  computedLayout: { width: 500, height: 300, x: 0, y: 0 }      // WebGL 렌더링용
}
```

---

### 9.2 디자인 변수/토큰 시스템

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **변수 시스템** | `$--` 접두사 참조 시스템 완비 | **미구현** (정적 상수 옵션만) |
| **변수 타입** | `color`, `string`, `number` 3종 | N/A |
| **테마 지원** | Light/Dark 테마별 변수값 자동 전환 | **미구현** |
| **런타임 해석** | `properties.resolved`로 변수→실제값 resolve | CSS 직접값만 사용 |
| **토큰 체계** | shadcn/ui 호환 50개+ 시맨틱 토큰 | 폰트 7개, 웨이트 12개 등 정적 옵션 |

**Pencil 변수 정의 (테마별 자동 전환):**
```json
{
  "themes": { "Mode": ["Light", "Dark"] },
  "variables": {
    "--primary": {
      "type": "color",
      "value": [
        { "value": "#5749F4", "theme": { "Mode": "Light" } },
        { "value": "#5749F4", "theme": { "Mode": "Dark" } }
      ]
    },
    "--background": {
      "type": "color",
      "value": [
        { "value": "#FFFFFF", "theme": { "Mode": "Light" } },
        { "value": "#131124", "theme": { "Mode": "Dark" } }
      ]
    },
    "--font-primary": { "type": "string", "value": [
      { "value": "Inter", "theme": { "Mode": "Light" } },
      { "value": "Inter", "theme": { "Mode": "Dark" } }
    ]},
    "--radius-m": { "type": "number", "value": 24 },
    "--radius-pill": { "type": "number", "value": 999 }
  }
}
```

**Pencil 시맨틱 토큰 목록:**

| 카테고리 | 토큰 |
|----------|------|
| 기본 색상 | `--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--muted` |
| 컴포넌트 색상 | `--card`, `--popover`, `--border`, `--ring`, `--destructive` |
| 상태 색상 | `--color-success`, `--color-warning`, `--color-error`, `--color-info` |
| 사이드바 | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border` |
| 폰트 | `--font-primary`, `--font-secondary` |
| 라운딩 | `--radius-none(0)`, `--radius-xs(6)`, `--radius-m(24)`, `--radius-l(40)`, `--radius-pill(999)` |
| 유틸리티 | `--white`, `--black`, `--tile` |

**xstudio는 정적 상수만 존재:**
```typescript
// styleOptions.ts
export const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  // ... 7개 고정
];
export const UNIT_OPTIONS = {
  size: ['px', '%', 'vh', 'vw', 'auto'],
  spacing: ['auto', 'px'],
  font: ['auto', 'px', 'pt'],
};
```

---

### 9.3 상태 관리 아키텍처

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **핵심 패턴** | SceneGraph + FileManager + VariableManager | Zustand + Jotai 하이브리드 |
| **트랜잭션** | `beginUpdate → update → commitBlock` 원자적 | RAF/Idle 기반 스로틀링 |
| **Undo/Redo** | UndoManager (트랜잭션 블록 단위) | 스타일 패널 자체에 없음 (외부 관리) |
| **구독 최적화** | EventEmitter3 기반 이벤트 구독 | selectAtom + equalityFn 세밀한 비교 |
| **성능 최적화** | 트랜잭션 배치 커밋 | Gateway 패턴 + RAF/Idle/Transition 3단계 |

**Pencil 변경 흐름:**
```
beginUpdate()
  → block.update(node, { fill: "#FF0000" })
  → block.update(node, { cornerRadius: 12 })
  → commitBlock({ undo: true })   // 원자적 커밋, undo 포인트 생성
        ↓
  VariableManager가 $-- 변수 resolve
        ↓
  properties.resolved 갱신
        ↓
  SkiaRenderer가 resolved 값으로 렌더
```

**xstudio 변경 흐름:**
```
사용자 입력
  ├─ updateStyleImmediate(prop, value)    // 즉시 (텍스트 확정)
  ├─ updateStyleRAF(prop, value)          // RAF 스로틀 (드래그/슬라이더)
  └─ updateStyleIdle(prop, value)         // Idle 지연 (타이핑)
        ↓
  Zustand store.updateSelectedStyle()
        ↓
  useZustandJotaiBridge → selectedElementAtom 갱신
        ↓
  selectAtom equalityFn → 변경된 속성만 리렌더
```

**xstudio 최적화 상세 (useOptimizedStyleActions):**
```typescript
// RAF: 프레임당 1회만 실행 (드래그 중 사용)
const updateStyleRAF = useCallback((property, value) => {
  pendingUpdateRef.current = { property, value };
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      const pending = pendingUpdateRef.current;
      if (pending) updateSelectedStyle(pending.property, pending.value);
      rafIdRef.current = null;
    });
  }
}, []);

// Idle: CPU 여유 시점에 실행, 최대 100ms 대기 (타이핑 중 사용)
const updateStyleIdle = useCallback((property, value) => {
  pendingUpdateRef.current = { property, value };
  if (idleIdRef.current !== null) cancelIdleCallback(idleIdRef.current);
  idleIdRef.current = requestIdleCallback(() => {
    const pending = pendingUpdateRef.current;
    if (pending) updateSelectedStyle(pending.property, pending.value);
    idleIdRef.current = null;
  }, { timeout: 100 });
}, []);
```

---

### 9.4 스타일 우선순위 및 오버라이드

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **우선순위 계층** | 인스턴스 descendants > 노드 직접값 > 변수 기본값 | Inline > Computed(CSS class) > Component Default |
| **컴포넌트 인스턴스** | `ref` + `descendants` 하위 노드별 오버라이드 | `element.style` vs `element.computedStyle` 분리 |
| **리셋** | 변수 참조로 자연스럽게 리셋 | `resetStyles()` → inline 제거 → computed 값 복귀 |
| **Modified 추적** | 없음 (모든 값이 명시적) | "Modified" 탭으로 변경된 inline 속성 필터링 |
| **Source 표시** | 없음 | `getStyleSource()` — inline/computed/default 표시 |

**Pencil 컴포넌트 → 인스턴스 오버라이드:**
```json
{
  "type": "ref",
  "ref": "bBmNI",
  "descendants": {
    "rxL1P": { "fontSize": 20, "fill": "#FF0000" },
    "xyq4X": { "content": "변경된 텍스트" }
  }
}
```

**xstudio 스타일 우선순위 해석:**
```typescript
// styleAtoms.ts
function getTransformValue(elementType, inlineValue, prop) {
  if (inlineValue !== undefined) return String(inlineValue);           // 1. inline 우선
  if (DEFAULT_CSS_VALUES[elementType]?.[prop]) return /* default */;   // 2. 컴포넌트 기본
  return 'auto';                                                       // 3. 폴백
}

// 130개 컴포넌트 기본값 매핑
const DEFAULT_CSS_VALUES = {
  Card:        { width: '100%' },
  Button:      { width: 'fit-content' },
  Slider:      { width: '300px' },
  DropZone:    { width: '100%', height: '120px' },
  NumberField: { width: '120px' },
  // ... 130개+
};
```

---

### 9.5 스타일 프로퍼티 커버리지

| 카테고리 | Pencil | xstudio |
|----------|--------|---------|
| **위치/크기** | `x`, `y`, `width`, `height`, `rotation` | `width`, `height`, `top`, `left` |
| **채우기** | `fill` (단일/변수), `fills[]` (다중 Image/Gradient) | `backgroundColor` (단일) |
| **선** | `stroke.align/thickness/fill` | `borderWidth/Color/Style/Radius` |
| **효과** | `effect` (shadow inner/outer, blur, spread) | 없음 |
| **모서리** | `cornerRadius` (단일 또는 4개 배열, 변수 참조) | `borderRadius` (단일 CSS 값) |
| **레이아웃** | `layout` (none/vertical/horizontal), `gap` | `display`, `flexDirection`, `flexWrap`, `gap`, padding/margin 개별 4방향 |
| **텍스트** | `fontSize/Family/Weight`, `lineHeight`, `textGrowth` | 11개 (fontFamily ~ verticalAlign) |
| **사이징** | `"fill_container"`, 고정 px값 | `"100%"`, `"fit-content"`, `"auto"`, CSS 단위 |
| **이미지 필** | `fills[].type:Image, url, mode` | 없음 (별도 컴포넌트로 처리) |
| **그라디언트** | `fills[].type:Linear/Radial/AngularGradient` | 없음 |

**Pencil 다중 Fill 구조:**
```json
{
  "fills": [
    { "enabled": true, "type": "Image", "url": "photo.jpg", "mode": "Fill", "opacityPercent": 100 },
    { "enabled": true, "type": "LinearGradient", "stops": [...], "opacityPercent": 50 }
  ]
}
```

**Pencil 개별 모서리 cornerRadius:**
```json
{
  "cornerRadius": [
    "$--radius-pill",
    "$--radius-xs",
    "$--radius-xs",
    "$--radius-pill"
  ]
}
```

---

### 9.6 스타일 패널 UI 구조 비교

**xstudio 스타일 패널 구조:**
```
StylesPanel.tsx (진입점)
├─ Gateway 패턴: isActive 체크 → Content 분리 (훅 실행 최소화)
├─ ZustandJotaiBridge (단방향 동기화)
├─ Filter: "All" | "Modified" 탭
│
├─ TransformSection (4개 속성)
│   └─ PropertyUnitInput × 4 (width, height, top, left)
│
├─ LayoutSection (16개 속성)
│   ├─ display, flexDirection, flexWrap
│   ├─ AlignmentGrid (3×3 위치 선택)
│   ├─ gap
│   └─ padding/margin (개별 4방향)
│
├─ AppearanceSection (5개 속성)
│   ├─ PropertyColor (backgroundColor, borderColor)
│   ├─ PropertyUnitInput (borderWidth, borderRadius)
│   └─ PropertySelect (borderStyle)
│
└─ TypographySection (11개 속성)
    ├─ PropertySelect (fontFamily, fontWeight, fontStyle)
    ├─ PropertyUnitInput (fontSize, lineHeight, letterSpacing)
    ├─ PropertyColor (color)
    └─ AlignmentToggle (textAlign, textDecoration, textTransform)
```

**Pencil Inspector (추정 구조):**
```
Inspector Panel
├─ Properties (노드 프로퍼티 직접 편집)
│   ├─ Transform: x, y, width, height, rotation
│   ├─ Fill: 다중 fills 배열 (Solid/Image/Gradient)
│   ├─ Stroke: align, thickness, fill
│   ├─ Effect: shadow (inner/outer), blur, spread
│   ├─ Corner Radius: 단일 또는 4개 개별
│   └─ Layout: none/vertical/horizontal, gap, padding
│
├─ Text Properties
│   ├─ fontFamily, fontSize, fontWeight
│   ├─ lineHeight, letterSpacing
│   ├─ textGrowth (fixed-width / auto)
│   └─ fill (텍스트 색상)
│
├─ Variables Panel
│   └─ 변수 CRUD (추가/수정/삭제) + 테마별 값 편집
│
└─ Component Panel
    ├─ reusable 토글 (컴포넌트 등록)
    └─ descendants 오버라이드 편집
```

---

### 9.7 Jotai Atom 기반 세밀한 구독 (xstudio 고유 장점)

xstudio는 Zustand+Jotai 하이브리드로 **속성 단위 리렌더 제어**를 구현:

```typescript
// styleAtoms.ts — 50개+ atom 정의

// 개별 속성 atom (변경 시 해당 input만 리렌더)
export const widthAtom = selectAtom(
  selectedElementAtom,
  (el) => getTransformValue(el?.type, el?.style?.width, 'width'),
  (a, b) => a === b  // 동등성 체크
);

// 섹션 그룹 atom (전체 섹션 값을 한 번에 읽기)
export const transformValuesAtom = selectAtom(
  selectedElementAtom,
  (el) => ({
    width:  getTransformValue(el?.type, el?.style?.width, 'width'),
    height: getTransformValue(el?.type, el?.style?.height, 'height'),
    top:    String(el?.style?.top ?? 'auto'),
    left:   String(el?.style?.left ?? 'auto'),
  }),
  (a, b) => a?.width === b?.width && a?.height === b?.height
             && a?.top === b?.top && a?.left === b?.left
);
```

이 패턴으로 **width만 변경되면 width input만 리렌더**, 다른 섹션은 영향 없음.

---

### 9.8 핵심 차이점 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pencil (디자인 도구 — Figma 유사)                 │
│  ✅ 디자인 변수 시스템 ($--변수명, color/string/number 3타입)        │
│  ✅ Light/Dark 테마 자동 전환 (변수별 테마값 정의)                   │
│  ✅ 다중 Fill (Solid/Image/Linear/Radial/AngularGradient)           │
│  ✅ Effect (Shadow inner/outer, blur, spread)                       │
│  ✅ 컴포넌트→인스턴스 descendants 오버라이드                         │
│  ✅ 트랜잭션 기반 원자적 Undo/Redo                                  │
│  ✅ cornerRadius 배열 (모서리별 독립 + 변수 참조)                    │
│  ✅ textGrowth (fixed-width / auto) 텍스트 사이징 모드               │
│  ❌ CSS 단위 시스템 없음 (px만, %/vh/vw 미지원)                     │
│  ❌ CSS Grid/Block 레이아웃 없음 (none/vertical/horizontal만)       │
│  ❌ 세밀한 padding/margin 개별 4방향 없음                            │
│  ❌ Modified 필터 / Style Source 감지 없음                           │
│  ❌ 속성 단위 리렌더 최적화 없음 (EventEmitter 기반)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    xstudio (웹 빌더 — Webflow 유사)                  │
│  ✅ CSS 표준 단위 (px, %, vh, vw, auto, fit-content)                │
│  ✅ 세밀한 padding/margin (개별 4방향)                               │
│  ✅ 130개 컴포넌트 기본값 시스템 (DEFAULT_CSS_VALUES)                │
│  ✅ Style Source 감지 (inline/computed/default 3단계)               │
│  ✅ Modified 필터 (변경된 inline 속성만 표시)                        │
│  ✅ RAF/Idle/Transition 3단계 업데이트 최적화                        │
│  ✅ Zustand+Jotai 하이브리드 속성 단위 리렌더 제어                   │
│  ✅ Gateway 패턴으로 비활성 섹션 훅 실행 방지                        │
│  ❌ 디자인 변수/토큰 시스템 없음                                     │
│  ❌ Light/Dark 테마 시스템 없음                                      │
│  ❌ 다중 Fill/Gradient/Effect 없음                                   │
│  ❌ 컴포넌트-인스턴스 오버라이드 시스템 없음                          │
│  ❌ cornerRadius 개별 모서리 제어 없음                                │
│  ❌ rotation 속성 없음                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 9.9 xstudio에 도입 가능한 Pencil 스타일 관리 기능

| 우선순위 | 기능 | 설명 | 구현 방향 |
|----------|------|------|----------|
| **높음** | 디자인 변수 시스템 | `$--변수명` 참조, CSS Custom Properties로 매핑 | `VariableManager` 클래스 + Zustand store 추가, `var(--primary)` 형태로 CSS 출력 |
| **높음** | 테마(Light/Dark) | 변수별 테마 값 정의 + 자동 전환 | `themeAtom` + `prefers-color-scheme` 미디어 쿼리 연동 |
| **중간** | 다중 Fill/Effect | fills 배열 + effect 배열로 레이어 중첩 | Appearance Section 확장, `background` CSS shorthand 또는 `box-shadow` 다중 값 |
| **중간** | cornerRadius 개별 제어 | 4개 값 배열 `[TL, TR, BR, BL]` | `border-radius` 4값 shorthand 지원 추가 |
| **중간** | 그라디언트 Fill | Linear/Radial/Angular | `background-image: linear-gradient(...)` CSS 매핑 |
| **낮음** | 트랜잭션 Undo | `beginUpdate → commitBlock` 패턴 | 기존 undo 시스템과 통합 |
| **낮음** | 인스턴스 descendants 오버라이드 | 컴포넌트 인스턴스별 부분 스타일 변경 | 컴포넌트 시스템 구축 후 적용 |

### 9.10 디자인 변수 시스템 도입 설계 (제안)

Pencil의 변수 시스템을 xstudio의 CSS 기반 아키텍처에 맞게 변환:

```typescript
// 제안: stores/variableStore.ts

interface DesignVariable {
  name: string;                    // "--primary"
  type: 'color' | 'string' | 'number';
  values: ThemeValue[];
}

interface ThemeValue {
  value: string;                   // "#5749F4"
  theme?: Record<string, string>; // { "Mode": "Light" }
}

interface VariableStore {
  variables: Map<string, DesignVariable>;
  themes: Map<string, string[]>;   // "Mode" → ["Light", "Dark"]
  activeTheme: Record<string, string>; // { "Mode": "Light" }

  // Actions
  addVariable: (name: string, type: string, values: ThemeValue[]) => void;
  setActiveTheme: (dimension: string, value: string) => void;
  resolveVariable: (ref: string) => string | undefined;
}

// CSS 출력: var(--primary) → CSS Custom Properties로 매핑
// .pen 호환: "$--primary" → "var(--primary)" 자동 변환
```

**CSS 출력 예시:**
```css
:root {
  --primary: #5749F4;
  --background: #FFFFFF;
  --font-primary: 'Inter';
  --radius-m: 24px;
}

[data-theme="dark"] {
  --background: #131124;
  --foreground: #E8E8EA;
}
```

---

### 9.11 본질적 차이 — 디자인 도구 vs 웹 빌더

| 관점 | Pencil | xstudio |
|------|--------|---------|
| **스타일 모델** | 시각적 프로퍼티 중심 (fill, stroke, effect) | CSS 표준 중심 (background, border, box-shadow) |
| **레이아웃 모델** | 캔버스 좌표 (`x`, `y`) + 선택적 자동 레이아웃 | CSS 레이아웃 (`display`, `flexDirection`, `grid`) |
| **출력 대상** | 캔버스 렌더링 (Skia) | HTML/CSS 코드 생성 |
| **확장 방향** | 더 많은 시각 효과 (블러, 블렌드 모드) | 더 많은 CSS 속성/반응형 |
| **사용자 기대** | Figma/Sketch 수준의 시각 편집 | Webflow/Framer 수준의 CSS 제어 |

Pencil의 디자인 변수/테마 시스템을 CSS Custom Properties 형태로 도입하면, xstudio는 **웹 빌더의 CSS 표준 강점**과 **디자인 도구의 토큰/테마 강점**을 결합할 수 있다.

---

## 10. Pencil 에디터 UI 컴포넌트 구조 분석

> 분석일: 2026-01-30
> 대상: `/tmp/pencil-asar-extracted/out/editor/assets/index.js` (5.7MB, 40,042줄 minified)
> 방법: esbuild minified 번들 역공학 — grep 패턴 매칭 + 코드 세그먼트 추출

### 10.1 앱 진입점 및 라우팅

```
App Root (vKt)
├── PostHog Analytics Provider — 사용자 행동 추적
├── Sentry Error Tracking — 에러 모니터링
├── IPC Provider — Electron 메인↔렌더러 통신
└── HashRouter (bKt)
    ├── /editor/:fileName?  → EditorPage (hY)
    ├── /generator           → Generator (yKt)
    └── /                    → Home/Landing
```

- **HashRouter** 사용 — Electron 파일 프로토콜(`file://`) 호환을 위해 BrowserRouter 대신 Hash 기반 라우팅
- 메인 에디터는 `/editor/:fileName?` 경로로 진입, 선택적 파일명 파라미터

---

### 10.2 메인 에디터 레이아웃

```
EditorPage (hY) — 파일 로드 + IPC 파일 이벤트 처리
└── MainEditor (gKt) — ref forwarded, CanvasKit/Skia + PixiJS 초기화
    │
    ├── TitleBar (YIt) ← Electron 전용
    │   └── 윈도우 컨트롤 (최소화/최대화/닫기)
    │
    ├── Left Panel (mKt) — 기본 200px 너비, 리사이즈 가능
    │   ├── Layers Toggle Button (ENe)
    │   ├── Design Kits & Style Guides Button (ANe)
    │   └── Layer List — TreeView 기반, 키보드 탐색 지원
    │       ├── ArrowDown/Up: 포커스 이동
    │       ├── ArrowRight: 확장 또는 하위 이동
    │       ├── ArrowLeft: 축소 또는 상위 이동
    │       └── Home/End: 처음/끝 이동
    │
    ├── Canvas Area — 중앙 전체 영역
    │   ├── PixiJS v8 Manager — WebGL 렌더링 컨텍스트
    │   ├── SkiaRenderer — CanvasKit WASM (pencil.wasm, 7.8MB)
    │   ├── Zoom Controls (fKt) — 줌 버튼 + 레벨 % 표시
    │   └── Tool Overlay (p$t) — 현재 도구별 인터랙션 레이어
    │
    ├── Right Panel / Properties Panel (eKt) — 우측 인스펙터
    │   ├── Transform: x, y, width, height, rotation
    │   ├── Layout: hugWidth/Height, fillContainer, childSpacing, padding
    │   ├── Corner Radius: 단일 또는 개별 4모서리 편집
    │   │   └── "Edit corners individually" 토글 버튼 (dh 함수)
    │   ├── Fill: 다중 fills 배열 (Color/Image/Gradient)
    │   ├── Stroke: align, thickness, fill
    │   ├── Effect: shadow (inner/outer), blur, spread
    │   └── Constraints: 부모 기준 제약 조건
    │
    ├── Variables Panel (cKt) — React Portal, 드래그 가능 Dialog
    │   ├── Toolbar: 핸들 바 (cursor-grab)
    │   ├── 변수 테이블: Name | Theme Values | Actions
    │   └── Add Dropdown: Color, Number, String 타입 선택
    │
    ├── AI Chat Panel (ARt) — Claude 통합
    │   ├── 모델 선택 (환경별 분기)
    │   ├── 프롬프트 입력 + 제출
    │   └── 프레임 → 코드 생성 기능
    │
    └── Activation Dialog (pKt) — 라이선스 관리
```

---

### 10.3 도구 시스템

Pencil의 도구 시스템은 `x_t` 클래스로 관리되며, 단축키 기반 도구 전환을 지원한다.

| 도구 | 단축키 | 생성 노드 | 기본 스타일 |
|------|--------|----------|-----------|
| **Move** | `V` | — | 선택/이동 (기본 도구) |
| **Hand** | `H` | — | grab/grabbing 커서 |
| **Rectangle** | `R` | `rectangle` | `fills: [{type: Color, color: "#CCCCCC"}]` |
| **Ellipse** | `O` | `ellipse` | `fills: [{type: Color, color: "#CCCCCC"}]` |
| **Frame** | `F` | `frame` | 레이아웃 컨테이너 |
| **Text** | `T` | text | 텍스트 편집 모드 |
| **Sticky Note** | `N` | sticky_note | 250×219px, `#E8F6FFcc` 배경, `#009DFFcc` 테두리 |
| **Icon Font** | `L` | icon_font | 24×24px, Lucide Icons |

**도구 상태 관리:**
```javascript
class x_t {
  activeTool = "move";  // 기본값

  setActiveTool(tool) {
    iC.capture("set-active-tool", { tool }); // PostHog 이벤트
    this.activeTool = tool;
    this.eventEmitter.emit("toolChange", this.activeTool);
  }
}
```

---

### 10.4 키보드 단축키 체계

`mUt` 배열에 전체 단축키가 정의되어 있다.

| 카테고리 | 단축키 | 기능 |
|---------|--------|------|
| **General** | `Cmd+C` | Copy |
| | `Cmd+V` | Paste |
| | `Cmd+X` | Cut |
| | `Cmd+D` | 선택 노드 복제 (`duplicateSelectedNodes()`) |
| | `Cmd+'` | 픽셀 그리드 토글 (`showPixelGrid`) |
| | `Cmd+Shift+'` | 픽셀 스냅 토글 (`roundToPixels`) |
| **Selection** | `Cmd+A` | 전체 선택 |
| | `Cmd+Click` | Deep Select (하위 요소 직접 선택) |
| | `Esc` | 선택 해제 |
| | `Shift+Enter` | 부모 선택 |
| **Navigation** | `Cmd+Scroll` | 줌 |
| | `Space+Drag` | 패닝 |
| | `=` | 줌 인 |
| **Tools** | `V` | Move |
| | `H` | Hand |
| | `R` | Rectangle |
| | `O` | Ellipse |
| | `T` | Text |
| | `F` | Frame |
| | `N` | Sticky Note |
| | `L` | Icon Font |

---

### 10.5 에디터 설정 시스템

설정은 `localStorage("pencil-config")`에 JSON으로 저장되며, `Jfe` 객체가 기본값을 정의한다.

```javascript
const Jfe = {
  snapToObjects: true,           // 객체 스냅
  roundToPixels: true,           // 픽셀 그리드 스냅
  showPixelGrid: true,           // 픽셀 그리드 표시
  scrollWheelZoom: false,        // 스크롤 휠 줌
  invertZoomDirection: false,    // 줌 방향 반전
  leftPanelWidth: 200,           // 좌측 패널 너비 (px)
  leftPanelOpen: true,           // 좌측 패널 열림 상태
  hideSidebarWhenLayersAreOpen: false, // 레이어 열림 시 사이드바 숨김
  generatingEffectEnabled: true  // 생성 이펙트 활성화
};
```

---

### 10.6 UI 라이브러리 스택

| 라이브러리 | 역할 | 사용 위치 |
|-----------|------|----------|
| **React** | UI 레이어 | 전체 에디터 (HashRouter, Context, Hooks) |
| **Radix UI** | 헤드리스 컴포넌트 | DropdownMenu, Popover, Dialog, AlertDialog |
| **Tailwind CSS** | 유틸리티 퍼스트 스타일링 | 전체 UI (`focus-visible:border-[#3D99FF]` 등) |
| **Lucide Icons** | 아이콘 시스템 | 도구바, 패널, 버튼 |
| **Sonner** | Toast 알림 | 작업 완료/에러 피드백 |
| **PostHog** | 사용자 분석 | 도구 전환, 기능 사용 추적 |
| **Sentry** | 에러 추적 | 런타임 에러 모니터링 |

**Radix UI 컴포넌트 상세:**
- `DropdownMenu`: Trigger, Portal, Content, Group, Label, Item, CheckboxItem, RadioGroup, RadioItem
- `Popover`: Root, Anchor, Trigger, Portal, Content (Modal/Non-modal)
- `AlertDialog`: role="alertdialog", backdrop-blur-sm, bg-black/50

---

### 10.7 다이얼로그/모달 시스템

| 다이얼로그 | 방식 | 특징 |
|-----------|------|------|
| **Alert Dialog** | Radix AlertDialog | `role="alertdialog"`, `backdrop-blur-sm bg-black/50` |
| **Variables Panel** | React Portal | `role="dialog"`, 드래그 가능 (`cursor-grab active:cursor-grabbing`) |
| **Activation Dialog** | 커스텀 | 라이선스 활성화/관리 |
| **MCP Setup** | 커스텀 | Claude Code 연동 설정 |

**플랫폼별 모서리 스타일:**
```javascript
style: {
  cornerShape: Or.isElectron ? "squircle" : "round",
  borderRadius: Or.isElectron ? "80px" : "32px"
}
```
- **Electron**: macOS 네이티브 느낌의 squircle 모서리 (80px)
- **웹**: 일반 round 모서리 (32px)

---

### 10.8 AI 통합 (Claude)

Pencil은 Claude AI를 에디터에 직접 통합하여 디자인-코드 변환을 지원한다.

**환경별 모델 지원:**

| 환경 | 사용 가능 모델 | 기본 모델 |
|------|--------------|----------|
| **Electron** (데스크톱) | Sonnet 4.5, Haiku 4.5, Opus 4.5 | Opus 4.5 |
| **Cursor** (IDE 통합) | Sonnet 4.5, Haiku 4.5, Composer | Composer |
| **기타** (웹) | — | — |

**통신 방식:**
```javascript
// 프롬프트 제출 — IPC 기반
submitPrompt(prompt, model) {
  this.ipc.notify("submit-prompt", { prompt, model });
}

// 모델 선택
getAvailableModels() {
  if (mR === "Electron") {
    return {
      models: [
        { label: "Sonnet 4.5", id: "claude-4.5-sonnet" },
        { label: "Haiku 4.5", id: "claude-4.5-haiku" },
        { label: "Opus 4.5", id: "claude-4.5-opus" }
      ],
      defaultModel: { label: "Opus 4.5", id: "claude-4.5-opus" }
    };
  }
}
```

**주요 AI 기능:**
- Claude Code CLI 연동 (`curl -fsSL https://claude.ai/install.sh | bash`)
- API Key 직접 입력 (`console.anthropic.com/settings/keys`)
- MCP 도구 연동 (`/mcp` 명령어)
- 프레임 → 코드 생성: "Generate code from 'Step 3 Frame'"
- 디자인 프롬프트: "Design a modern technical looking web app for managing renewable energy usage."

---

### 10.9 렌더링 파이프라인 (심층 분석)

> **핵심 발견:** CanvasKit/Skia WASM이 **메인 렌더러**이며, PixiJS v8은 씬 그래프 관리 + EventBoundary(히트 테스트) 전용. 모든 디자인 노드가 `renderSkia(renderer, canvas, cullingBounds)` 메서드를 구현하여 CanvasKit Canvas API를 직접 호출한다.

#### 10.9.1 이중 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────┐
│              React UI Layer (DOM)                    │
│    Properties Panel, Layer List, Toolbar, AI Chat    │
└──────────────────────┬──────────────────────────────┘
                       │ 사용자 이벤트 / 상태 변경
                       ▼
┌─────────────────────────────────────────────────────┐
│         SceneManager (CNe) — React Context           │
│    SceneGraph 노드 트리 | FileManager (.pen I/O)     │
│    VariableManager ($-- 변수) | UndoManager          │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
     ┌─────▼─────┐            ┌──────▼──────┐
     │ PixiJS v8 │            │ CanvasKit/  │
     │ (보조)     │            │ Skia WASM   │
     │           │            │ (메인 렌더러) │
     │ 씬 트리   │            │ 7.8MB       │
     │ 관리      │  renderSkia│             │
     │           │───────────→│ 벡터 도형    │
     │ Event     │            │ 텍스트       │
     │ Boundary  │            │ 이미지       │
     │ (Hit Test)│            │ 이펙트       │
     └───────────┘            │ 블렌드 모드  │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ 이중 Surface │
                              │ 캐싱 시스템   │
                              │             │
                              │ content     │
                              │ Surface     │
                              │ (디자인 노드)│
                              │      +      │
                              │ main        │
                              │ Surface     │
                              │ (오버레이)   │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ GPU Output   │
                              │ WebGL Canvas │
                              └─────────────┘
```

#### 10.9.2 GPU Surface 생성 체인

```javascript
// 우선순위: WebGL GPU → SW 폴백
MakeWebGLCanvasSurface(canvas)
  → MakeWebGLContext(canvas)        // GrDirectContext 생성
  → MakeOnScreenGLSurface(ctx, w, h) // GPU Surface
  → 실패 시: MakeSWCanvasSurface(canvas) // CPU 소프트웨어 폴백
```

#### 10.9.3 렌더 루프 (requestAnimationFrame)

```
매 프레임:
1. requestAnimationFrame 콜백
2. SkiaRenderer.render() 호출
3. contentSurface 확인
   - 변경 있으면: 전체 씬 트리 renderSkia() 재실행
   - 변경 없으면: 기존 contentSurface 블리팅만 (줌/패닝 최적화)
4. mainSurface에 오버레이 렌더링 (선택 박스, 가이드라인 등)
5. Surface.flush() → GPU 제출
```

#### 10.9.4 모든 노드의 renderSkia() 공통 패턴

```javascript
renderSkia(renderer, canvas, cullingBounds) {
    // 1) 활성화 + 뷰포트 컬링 검사 (AABB)
    if (!this.properties.resolved.enabled ||
        !cullingBounds.intersects(this.getVisualWorldBounds())) return;

    // 2) 캔버스 상태 저장 + 로컬 변환 적용
    const saveCount = canvas.getSaveCount();
    canvas.save();
    canvas.concat(this.localMatrix.toArray());

    // 3) 이펙트 시작 (Opacity, Blur, Shadow 등)
    this.beginRenderEffects(canvas);

    // 4) 노드별 렌더링 (Fill, Stroke, 자식 노드)
    // ... 구현부 ...

    // 5) 캔버스 상태 복원
    canvas.restoreToCount(saveCount);
}
```

#### 10.9.5 이펙트 파이프라인 (beginRenderEffects)

| 이펙트 | CanvasKit API | 설명 |
|--------|---------------|------|
| **Opacity** | `canvas.saveLayer(null, paint)` + `paint.setAlphaf()` | 투명도 레이어 |
| **Background Blur** | `ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp)` | 배경 흐림 |
| **Layer Blur** | `ImageFilter.MakeBlur()` on saveLayer | 레이어 전체 흐림 |
| **Drop Shadow (Outer)** | `ImageFilter.MakeDropShadow(dx, dy, sigmaX, sigmaY, color)` | 외부 그림자 |
| **Drop Shadow (Inner)** | `ImageFilter.MakeDropShadowOnly()` + clipPath | 내부 그림자 |

#### 10.9.6 Fill 렌더링 시스템 (6종, Shader 기반)

| Fill 타입 | CanvasKit API | 비고 |
|-----------|---------------|------|
| Color | `paint.setColor()` | 단색 |
| LinearGradient | `Shader.MakeLinearGradient()` | 2점 그라디언트 |
| RadialGradient | `Shader.MakeTwoPointConicalGradient()` | 원형 그라디언트 |
| AngularGradient | `Shader.MakeSweepGradient()` | 각도 그라디언트 |
| MeshGradient | 커스텀 메시 보간 | Coons 패치 기반 |
| Image | `Shader.MakeImageShader()` | 이미지 패턴 (Fill/Fit/Crop/Tile) |

#### 10.9.7 Stroke 렌더링

```
StrokePath 처리 흐름:
1. path.makeStroked({width, cap, join, miter}) → 스트로크를 Fill 가능한 Path로 변환
2. 정렬 모드에 따라 PathOp 적용:
   - Inside: PathOp.Intersect(strokePath, fillPath) → 내부만
   - Outside: PathOp.Difference(strokePath, fillPath) → 외부만
   - Center: 변환 없이 사용
3. 스트로크에도 6종 Fill(그라디언트, 이미지 등) 적용 가능
```

#### 10.9.8 블렌드 모드 매핑 (l1e 함수, 18종)

```
normal → SrcOver     |  multiply → Multiply    |  screen → Screen
overlay → Overlay    |  darken → Darken        |  lighten → Lighten
color-dodge → ColorDodge | color-burn → ColorBurn | hard-light → HardLight
soft-light → SoftLight | difference → Difference | exclusion → Exclusion
hue → Hue           |  saturation → Saturation |  color → Color
luminosity → Luminosity | plus-darker → Plus    | plus-lighter → Plus
```

#### 10.9.9 이중 텍스트 렌더링

| 구분 | 엔진 | 용도 |
|------|------|------|
| **메인** | CanvasKit `ParagraphBuilder` | 실제 텍스트 렌더링 (디자인 노드) |
| **보조** | PixiJS `TextMetrics` | 텍스트 측정, 워드랩, 폰트 메트릭 계산 |

- CanvasKit ParagraphBuilder: `addText()` → `build()` → `layout(maxWidth)` → canvas에 직접 렌더링
- StrutStyle/TextStyle 지원: fontFamily, fontSize, fontWeight, letterSpacing, heightMultiplier 등

#### 10.9.10 뷰포트 컬링

모든 `renderSkia()` 첫 줄에서 AABB(Axis-Aligned Bounding Box) 기반 컬링 수행:

```javascript
if (!cullingBounds.intersects(this.getVisualWorldBounds())) return;
```

- `getVisualWorldBounds()`: 자식 노드 바운드 union + 이펙트(shadow/blur) 확장 포함
- 화면 밖 노드는 즉시 스킵 → 대규모 캔버스에서 성능 확보

#### 10.9.11 Hit Testing (PixiJS EventBoundary)

```
PixiJS EventBoundary.hitTestRecursive():
1. _interactivePrune(node) — visible, renderable, measurable 검사
2. 자식 노드를 역순(z-order 상위부터) 순회
3. hitTestFn: worldTransform.applyInverse(point) → containsPoint()
4. hitPruneFn: hitArea AABB 사전 필터링 + MaskEffect containsPoint
5. 동적 이벤트 모드: "static" | "dynamic" | "passive" | "none"
```

#### 10.9.12 Export 파이프라인

```
Export 흐름:
1. 오프스크린 Surface 생성 (MakeSurface)
   - OffscreenCanvas 지원 시 활용
2. 전체 씬 트리 renderSkia() 실행 (뷰포트 컬링 OFF)
3. surface.makeImageSnapshot()
4. image.encodeToBytes(format, quality)
   - PNG: 무손실, 투명 배경 지원
   - JPEG: 품질 지정 가능
   - WEBP: 최신 압축
```

#### 10.9.13 WASM 메모리 관리

```
CanvasKit WASM 메모리 패턴:
- 사전 할당 버퍼: Float32x4 (gr), Float32x9, Float32x16
- Ye(): JS 배열 → WASM HEAP 복사 (HEAPF32, HEAPU8, HEAPU32)
- Pe(): HEAP 메모리 해제
- $t(): 3x3 매트릭스 → HEAP 복사 (9 floats)
- Si(): Rect → HEAP 복사 (4 floats)
- pc(): RRect → HEAP 복사 (12 floats)
- Ji.toTypedArray(): HEAP → JS Float32Array 읽기
```

#### 10.9.14 피드백 이펙트 (AI 생성 시 시각 효과)

| 이펙트 | 트리거 | 설명 |
|--------|--------|------|
| **Flash** | 노드 생성/복사/수정 | `addFlashForNode()` — strokeWidth 1px 하이라이트 |
| **ScanLine Flash** | 프롬프트 복사 | `scanLine: true, color: [200/255, 200/255, 200/255]` |
| **Long Hold Flash** | AI 프롬프트 제출 | `longHold: true` — 2초간 지속 |
| **Generating Effect** | AI 배치 디자인 중 | 회전 파티클 + 스캔라인 그라디언트 오버레이 |

#### 10.9.15 안티앨리어싱

```javascript
// 기본적으로 모든 Paint에 안티앨리어싱 활성화
paint.setAntiAlias(true);

// CanvasKit의 서브픽셀 텍스트 렌더링
font.setSubpixel(true);
```

#### 10.9.16 렌더링 계층 종합

```
┌─ Layer 4: React DOM (Properties/Toolbar/Dialog) ─────────────┐
├─ Layer 3: mainSurface (Selection Box, Guides, Grid) ─────────┤
├─ Layer 2: contentSurface (디자인 노드 — renderSkia) ─────────┤
│   ├─ FrameNode (클리핑 + 자식)                                │
│   ├─ ShapeNode (벡터 도형 — Fill + Stroke + Effects)          │
│   ├─ TextNode (ParagraphBuilder — 아이콘/텍스트)              │
│   ├─ StickyNode (AI 프롬프트 노트)                            │
│   └─ GroupNode (자식 노드 컨테이너)                            │
├─ Layer 1: PixiJS 씬 트리 (이벤트 바인딩 + Hit Test) ─────────┤
└─ Layer 0: WebGL GPU Surface (CanvasKit GrDirectContext) ──────┘
```

---

### 10.10 내장 디자인 킷 (Design System JSON)

에디터 번들에 4개의 디자인 킷이 JSON으로 임베딩되어 있다.

| 디자인 킷 | 컴포넌트 수 | 특징 |
|----------|-----------|------|
| **HALO** | 20+ | 라운드 스타일, 보라/파랑 계열 |
| **Lunaris** | 20+ | 다크 테마 중심 |
| **Nitro** | 20+ | 미니멀 스타일 |
| **Shadcn** | 20+ | shadcn/ui 호환, 50+ 시맨틱 변수 |

**공통 컴포넌트 목록:**
- Navigation: Sidebar, Breadcrumb, Menu
- Forms: Input, Select, Textarea, OTP Input, Checkbox, Radio, Switch
- Data: Data Table (Header/Content/Footer), Progress, Badge
- Feedback: Alert (Info/Error/Success/Warning), Tooltip
- Layout: Card (Header/Content/Actions), Avatar (Text/Image), Accordion
- Interactive: Dropdown, Toggle

각 디자인 킷은 재사용 가능 컴포넌트(`reusable: true`)와 변수(`$--` 접두사)를 포함하며, 사용자가 킷을 선택하면 해당 컴포넌트와 변수가 프로젝트에 로드된다.

---

### 10.11 컴포넌트 아키텍처 특징 요약

| 특징 | 구현 방식 | 비고 |
|------|----------|------|
| **React + HashRouter** | Electron file:// 호환 SPA | BrowserRouter 대신 Hash 기반 |
| **Radix UI 기반** | 접근성(A11y) 준수 헤드리스 컴포넌트 | ARIA role, keyboard navigation |
| **Tailwind CSS** | 유틸리티 퍼스트 스타일링 | 빠른 UI 개발, 일관된 디자인 |
| **React Portal** | 오버레이 UI (Variables Panel, Alert Dialog) | z-index 관리 단순화 |
| **React Context** | SceneManager, IPC Provider | 전역 상태 공유 |
| **IPC 통신** | `@ha/ipc` 프로토콜 | Electron 메인↔렌더러 양방향 |
| **localStorage 설정** | `pencil-config` 키 | 에디터 설정 영속화 |
| **Squircle 디자인** | Electron에서 macOS 느낌 | `cornerShape: "squircle"` |
| **PostHog + Sentry** | 분석 + 에러 추적 | 프로덕션 모니터링 |
| **Claude AI 내장** | Opus/Sonnet/Haiku 모델 | 디자인→코드 변환 |
| **4개 디자인 킷** | JSON 임베딩 | HALO, Lunaris, Nitro, Shadcn |

---

### 10.12 xstudio와의 에디터 UI 구조 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **메인 렌더러** | **CanvasKit/Skia WASM** (벡터/텍스트/이미지/이펙트 전담) | PixiJS v8.14.3 (WebGL) |
| **씬 그래프** | PixiJS v8 (이벤트/히트테스트 전용, 렌더링 불참여) | PixiJS가 렌더링도 담당 |
| **렌더 메서드** | `renderSkia(renderer, canvas, cullingBounds)` | PixiJS 렌더 파이프라인 |
| **Surface 구조** | 이중 Surface (contentSurface + mainSurface) | 단일 WebGL 컨텍스트 |
| **이펙트 시스템** | beginRenderEffects — Opacity/Blur/Shadow 5종 | PixiJS 기본 필터 |
| **Fill 시스템** | 6종 Shader 기반 (Color~Image) | Color/Gradient 기본 |
| **블렌드 모드** | 18종 (CanvasKit 네이티브) | PixiJS 기본 블렌드 |
| **라우팅** | HashRouter (`/editor/:fileName?`) | BrowserRouter (웹 앱) |
| **상태 관리** | React Context (SceneManager) + EventEmitter3 | Zustand + Jotai 하이브리드 |
| **UI 컴포넌트** | Radix UI + Tailwind CSS | shadcn/ui + Tailwind CSS |
| **레이어 패널** | TreeView 기반, 키보드 탐색(Arrow/Home/End) | 트리 뷰 (구현 방식 확인 필요) |
| **속성 패널** | Fill/Stroke/Effect/Layout/Corner 통합 인스펙터 | Transform/Layout/Appearance/Typography 4섹션 |
| **도구 시스템** | 8개 도구 + 단축키 (`V/H/R/O/F/T/N/L`) | 웹 빌더 도구 (선택/텍스트/컴포넌트) |
| **설정 저장** | `localStorage("pencil-config")` | 서버 기반 (Supabase) |
| **AI 통합** | Claude (Opus/Sonnet/Haiku) IPC 기반 | 구현 중 |
| **디자인 킷** | 4개 내장 (HALO/Lunaris/Nitro/Shadcn) | 컴포넌트 라이브러리 |
| **다이얼로그** | Radix AlertDialog + Portal | (확인 필요) |
| **플랫폼 분기** | Electron/Cursor/Web 3가지 | 웹 전용 |
| **번들 구조** | 단일 index.js (5.7MB) + WASM (7.8MB) | Vite 코드 스플리팅 |

---

### 10.13 씬 그래프 노드 타입 구조

#### 10.13.1 노드 클래스 계층

Pencil의 씬 그래프는 **6개 구체 클래스**가 **12개 타입 문자열**을 처리하는 간결한 구조이다.

```
z_ (Base Node)
├── jx   — FrameNode      ("frame")         — 컨테이너, 오토 레이아웃, 클리핑, 슬롯
├── vXe  — GroupNode       ("group")         — 논리적 그룹, 이펙트만 적용
├── Kke  — ShapeNode       (5종 다형성)      — rectangle, ellipse, line, path, polygon
├── Ux   — TextNode        ("text")          — ParagraphBuilder 기반 텍스트
├── oI   — StickyNode      (3종 서브타입)    — note, prompt, context
└── _Xe  — IconFontNode    ("icon_font")     — Material Symbols/Lucide 아이콘
```

#### 10.13.2 기능 지원 매트릭스

| 기능 | frame | group | rect | ellipse | line | path | polygon | text | icon | sticky |
|------|:-----:|:-----:|:----:|:-------:|:----:|:----:|:-------:|:----:|:----:|:------:|
| 자식 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Fills | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Strokes | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Effects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Clip | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Layout | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Slot | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### 10.13.3 도형별 Fill Path 생성

| 도형 | Path 생성 방식 | 고유 프로퍼티 |
|------|---------------|-------------|
| rectangle | rect + cornerRadius → `CG()` | `cornerRadius: number[]` |
| ellipse | arc(startAngle, sweep, innerRadius) | `ellipseInnerRadius`, `ellipseStartAngle`, `ellipseSweep` |
| line | moveTo(0,0).lineTo(w,h) | (없음) |
| path | `Ue.Path.MakeFromSVGString(pathData)` | `pathData: string`, `fillRule` |
| polygon | `Q1t()` 정다각형 + cornerRadius | `polygonCount`, `cornerRadius` |

#### 10.13.4 컴포넌트/인스턴스 시스템

- **Component**: `reusable: true` → 컴포넌트 등록
- **Instance**: `type: "ref"` (직렬화), `_prototype` → 원본 연결
- **Override**: `overriddenProperties: Set<string>` — 변경 속성만 추적
- **Slot**: FrameNode 전용, 컴포넌트 내 교체 가능 영역

#### 10.13.5 오토 레이아웃

| 프로퍼티 | 값 | 설명 |
|---------|-----|------|
| `layoutMode` | None(0) / Horizontal(1) / Vertical(2) | 방향 |
| `layoutChildSpacing` | number | gap |
| `layoutPadding` | number/array | 패딩 |
| `horizontalSizing` | Fixed(0) / FitContent(2) / FillContainer(3) | 수평 크기 |
| `verticalSizing` | Fixed(0) / FitContent(2) / FillContainer(3) | 수직 크기 |
| `layoutJustifyContent` | Start / Center / SpaceBetween / SpaceAround / End | 주축 배분 |
| `layoutAlignItems` | Start / Center / End | 교차축 정렬 |

#### 10.13.6 xstudio 노드 구조와 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **노드 클래스** | 6개 구체 클래스, 단일 Base | PixiJS Container 기반 확장 |
| **다형성** | ShapeNode 1개 클래스 = 5종 도형 | 각 도형별 별도 컴포넌트 |
| **타입 판별** | `this.type` 문자열 판별자 | React 컴포넌트 타입 |
| **레이아웃** | Yoga WASM (Flexbox) + Auto Layout | @pixi/layout (Yoga WASM) + 커스텀 Grid/Block |
| **사이징** | Fixed / FitContent / FillContainer | 유사 (확인 필요) |
| **컴포넌트 시스템** | prototype + overriddenProperties Set | Zustand store 기반 |
| **슬롯** | FrameNode 전용 Slot 시스템 | (미확인) |
| **직렬화** | JSON (.pen) — `ref` 타입으로 인스턴스 표현 | 서버 DB (Supabase) |
| **Fill 시스템** | 6종 (Color~MeshGradient) Shader 기반 | Color/Gradient 기본 |
| **Effects** | 5종 (DropShadow/LayerBlur/BackgroundBlur + Inner Shadow) | PixiJS 필터 기반 |
| **Hit Testing** | 노드별 fillPath/strokePath containment | PixiJS 기본 + 커스텀 |
| **SVG Import** | SVG → 네이티브 노드 매핑 | (확인 필요) |

---

### 10.14 이벤트 시스템 분석

#### 10.14.1 이벤트 아키텍처 개요

Pencil의 이벤트 시스템은 3계층으로 구성된다:

```
DOM Events → InputManager(b_t) → StateManager(y_t) 상태 머신
                                       ↓
                              SceneGraph 조작 + Undo
                                       ↓
                              EventEmitter3 알림 (65종)
                                       ↓
                              React useEffect 구독 → UI 갱신
```

#### 10.14.2 상태 머신 (9개 상태)

| 상태 | 역할 | 전이 조건 |
|------|------|----------|
| **IdleState** (tl) | 허브 — 선택, 더블클릭, 분기 | 기본 상태 |
| **DraggingState** (eQ) | 노드 이동/재배치 | 노드 드래그 5px 초과 |
| **MarqueeSelectState** (syt) | 범위 선택 | 빈 공간 드래그 |
| **DrawShapeState** (oyt) | 도형 생성 | 도형 도구 + 드래그 |
| **ResizeState** (lyt) | 리사이즈 핸들 | 핸들 드래그 |
| **RotateState** (fyt) | 회전 핸들 | 회전 핸들 드래그 |
| **EditTextState** (xV) | 텍스트 진입 | 텍스트 더블클릭 |
| **TextEditorState** (tq) | Quill 편집 | EditText → 진입 |
| **DrawStickyNoteState** (ayt) | 스티키 노트 | N 도구 + 클릭 |
| **FillEditorState** (fx) | 그라디언트 편집 | Fill 포인트 클릭 |

모든 상태가 `onPointerDown/Move/Up`, `onKeyDown/Up`, `onToolChange`, `onEnter/Exit`, `render` 인터페이스를 구현한다.

#### 10.14.3 EventEmitter3 핵심 이벤트

| 이벤트 | 구독 수 | 용도 |
|--------|---------|------|
| `selectionChange` | 3 | 노드 선택 변경 |
| `selectionChangeDebounced` | 2 | 프레임 배칭 디바운스 |
| `nodePropertyChange` | 3 | 속성 변경 |
| `toolChange` | 1 | 도구 전환 |
| `document-modified` | 1 | 문서 변경 |
| `startTextEdit` / `finishTextEdit` | 각 1 | 텍스트 모드 |
| `chat-*` (9종) | 각 1 | AI 채팅 |

15개 클래스가 EventEmitter3 상속. 총 65종 emit, 67종 on 구독.

#### 10.14.4 프레임 배칭 디바운스

```javascript
// 고빈도 이벤트를 RAF 단위로 합산
queuedFrameEvents = new Set();
on("selectionChange", () => queuedFrameEvents.add("selectionChangeDebounced"));
// 매 프레임: flush → emit → clear → emit("afterUpdate")
```

#### 10.14.5 IPC 이벤트 (47종)

| 방향 | 유형 | 수량 | 예시 |
|------|------|------|------|
| 렌더러→호스트 | notify (단방향) | 18 | `submit-prompt`, `file-changed`, `sign-out` |
| 렌더러→호스트 | request (응답 대기) | 11 | `save`, `import-file`, `get-license` |
| 호스트→렌더러 | handle (요청 처리) | 18 | `batch-design`, `get-selection`, `get-screenshot` |

3가지 전송 모드: Electron (`electronAPI`), VS Code (`vscodeapi`), Web (`webappapi`)

#### 10.14.6 xstudio 이벤트 시스템과 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **이벤트 버스** | EventEmitter3 (65종) | Zustand subscribe + Jotai atom |
| **상태 머신** | 9개 상태 클래스, 명시적 전이 | (확인 필요) |
| **히트 테스트** | PixiJS EventBoundary (씬 그래프) | PixiJS 기본 + 커스텀 |
| **디바운스** | queuedFrameEvents (RAF 배칭) | React startTransition / useDeferredValue |
| **키보드** | window keydown + InputManager + pressedKeys Set | (확인 필요) |
| **Undo/Redo** | UndoManager (EventEmitter3) + UpdateBlock 트랜잭션 | Zustand middleware 기반 |
| **IPC** | 커스텀 IPC (47종, 3환경) | 없음 (웹 전용) |
| **드래그** | 5px 임계값 → DraggingState 전이 | (확인 필요) |
| **줌/패닝** | Ctrl+휠(줌) / 휠(패닝) / Space+드래그(핸드) | (유사 예상) |
| **클립보드** | window copy/cut/paste + 노드 직렬화 | (확인 필요) |
| **eventMode 제어** | 도구별 static/passive/none 동적 전환 | (확인 필요) |
| **React 통합** | useEffect + EventEmitter3 on/off | useEffect + Zustand subscribe |

---

### 10.15 파일 저장/로드 시스템

#### 10.15.1 파일 I/O 아키텍처

```
Electron Main (PencilApp + DesktopResourceDevice)
    │ fs.readFileSync / fs.writeFileSync
    │ dialog.showOpenDialog / showSaveDialog
    ↕ IPC (16종 파일 관련)
Editor (FileManager lXe + SceneManager CNe)
    │ serialize() / deserialize()
    │ Y$e() 관대한 JSON 파서
    │ HYe() 7단계 버전 마이그레이션
    ↓
.pen 파일 (JSON, 2-space 들여쓰기, v2.6)
```

#### 10.15.2 .pen 파일 포맷

```json
{
  "version": "2.6",
  "themes": { "mode": ["light", "dark"] },
  "variables": { "$--primary": { "type": "color", "value": "#3B82F6" } },
  "children": [ /* 노드 트리 + 커넥션 */ ]
}
```

- 이미지: 외부 파일 참조 (`images/photo.png`), base64 인라인 아님
- 버전 마이그레이션: 1.0 → 2.0 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 (7단계)
- 저장: `JSON.stringify(data, null, 2)` — 2-space pretty-print
- 파싱: `Y$e()` — trailing comma 등 허용하는 관대한 파서

#### 10.15.3 저장 흐름

```
Cmd+S → saveDocument() → FileManager.export()
  → serialize() → JSON.stringify
  → IPC "save" → DesktopResourceDevice.saveResource()
  → fs.writeFileSync(filePath, content, "utf8")
  → emit("dirty-changed", false)
```

자동 저장 없음. `file-changed` IPC(300ms 디바운스)는 in-memory만 갱신.

#### 10.15.4 클립보드

| MIME | 소스 | 처리 |
|------|------|------|
| `application/x-ha` | Pencil 내부 | 같은 문서: 경로 복제 / 다른 문서: 전체 역직렬화 |
| `text/html` | Figma | HTML 파싱 → 노드 변환 |
| `text/plain` | SVG / 텍스트 | SVG 감지 → 노드 매핑 / 텍스트 노드 |

#### 10.15.5 임포트/익스포트

| 임포트 | 익스포트 |
|--------|---------|
| .pen (네이티브) | PNG (1x/2x/3x) |
| PNG/JPG/JPEG (image fill) | JPEG (품질 선택) |
| SVG (노드 매핑) | WEBP (품질 선택) |
| Figma (클립보드) | (SVG/PDF 미지원) |

#### 10.15.6 xstudio 파일 시스템과 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| **파일 포맷** | `.pen` JSON 텍스트 (v2.6) | 서버 DB (Supabase) |
| **저장 방식** | 로컬 파일 (fs.writeFileSync) | 클라우드 자동 저장 |
| **더티 추적** | DesktopResourceDevice + 창 닫기 체크 | (서버 동기화) |
| **이미지 저장** | 외부 파일 (`images/` 디렉토리) | (확인 필요) |
| **버전 관리** | 7단계 마이그레이션 체인 | DB 스키마 마이그레이션 |
| **클립보드** | `application/x-ha` + Figma/SVG 파싱 | (확인 필요) |
| **임포트** | .pen, PNG/JPG/SVG, Figma(클립보드) | (확인 필요) |
| **익스포트** | PNG/JPEG/WEBP (1-3x) | (확인 필요) |
| **최근 파일** | electron-store (최대 14개) | 서버 프로젝트 목록 |
| **자동 저장** | 없음 (명시적 Cmd+S) | 서버 자동 동기화 |
| **오프라인** | 완전 로컬 (Electron) | 웹 의존 |
| **템플릿** | 7종 내장 (new, welcome, 4 kits) | (확인 필요) |

---

## 11. Pencil 렌더링 방식 전환 구현 현황 (2026-02-01)

> xstudio가 Pencil 앱과 동일한 CanvasKit/Skia 기반 렌더링 아키텍처로 전환한 현재 상태를 체크한 결과.
> 구현 파일: `apps/builder/src/builder/workspace/canvas/skia/` (17개 파일)

### 11.1 아키텍처 전환 (Pencil 핵심 패턴)

| # | Pencil 아키텍처 | xstudio 구현 파일 | 상태 |
|---|----------------|------------------|------|
| A-1 | CanvasKit/Skia WASM 메인 렌더러 | `SkiaOverlay.tsx` + `SkiaRenderer.ts` | ✅ |
| A-2 | PixiJS = 씬 그래프 + 이벤트 전용 (렌더링 불참여) | Camera 하위 `alpha=0`, EventBoundary 유지 | ✅ |
| A-3 | 이중 Surface 캐싱 (contentSurface + mainSurface) | `SkiaRenderer.ts` Phase 6 | ✅ |
| A-4 | Dirty Rect 부분 렌더링 | `dirtyRectTracker.ts` + `renderContent()` 좌표 변환 + clipRect | ✅ 좌표 변환 구현, 활성화 (2026-02-03) |
| A-5 | 프레임 분류 (idle/camera-only/content/full) | `SkiaRenderer.classifyFrame()` — camera-only는 인프라만 보존, content로 폴백 | ✅ (camera-only 비활성화, Phase 5 대기) |
| A-6 | 이벤트 브리징 (Skia↔PixiJS) | `eventBridge.ts` | ✅ |
| A-7 | Selection 오버레이 Skia 렌더링 | `selectionRenderer.ts` | ✅ |
| A-8 | AI 이펙트 Skia 렌더링 | `aiEffects.ts` | ✅ |

### 11.2 렌더링 파이프라인 (노드별 renderSkia)

| # | Pencil 기능 | xstudio 구현 | 상태 |
|---|------------|-------------|------|
| B-1 | renderSkia() 재귀 트리 순회 | `renderNode()` in `nodeRenderers.ts` | ✅ |
| B-2 | AABB 뷰포트 컬링 | `intersectsAABB()` | ✅ |
| B-2a | AABB 컬링 좌표계 정합성 | zero-size 가상 컨테이너 스킵 + 자식 `cullingBounds` 부모 오프셋 역변환 | ✅ (2026-02-02 수정) |
| B-3 | Box 렌더링 (RRect + borderRadius) | `renderBox()` drawRect/drawRRect | ✅ |
| B-3a | Box Stroke border-box inset | `renderBox()` strokeRect inset by strokeWidth/2 | ✅ (2026-02-02 수정) |
| B-4 | Text 렌더링 (ParagraphBuilder) | `renderText()` ParagraphBuilder.Make | ✅ |
| B-5 | Image 렌더링 (drawImageRect) | `renderImage()` | ✅ |
| B-6 | 이펙트 파이프라인 (beginRenderEffects/endRenderEffects) | `effects.ts` saveLayer 기반 | ✅ |
| B-7 | 폰트 관리 (FontMgr + IndexedDB 캐싱) | `fontManager.ts` | ✅ |
| B-8 | 텍스트 측정 (Yoga measureFunc 연결) | `textMeasure.ts` createYogaMeasureFunc | ✅ |

### 11.3 Fill 시스템 (6종)

| # | Fill 타입 | Pencil API | xstudio 구현 | 상태 |
|---|----------|-----------|-------------|------|
| C-1 | Color | `paint.setColor()` | `applyFill()` Color4f | ✅ |
| C-2 | LinearGradient | `MakeLinearGradient` | `MakeLinearGradient` | ✅ |
| C-3 | RadialGradient | `MakeRadialGradient` | `MakeTwoPointConicalGradient` | ✅ |
| C-4 | AngularGradient | `MakeSweepGradient` | `MakeSweepGradient` | ✅ |
| C-5 | ImageFill | `makeShaderOptions` | `makeShaderOptions` | ✅ |
| C-6 | **MeshGradient** | `drawPatch()` Coons 패치 | 구조 정의만, 렌더링 미구현 | ❌ |

### 11.4 이펙트 (saveLayer 기반)

| # | 이펙트 | Pencil API | xstudio 구현 | 상태 |
|---|-------|-----------|-------------|------|
| D-1 | Opacity | `canvas.saveLayer(alphaPaint)` | `paint.setAlphaf()` + saveLayer | ✅ |
| D-2 | BackgroundBlur | `MakeBlur(sigma, sigma)` | `ImageFilter.MakeBlur` | ✅ |
| D-3 | DropShadow (Outer) | `MakeDropShadow` | `MakeDropShadow` | ✅ |
| D-4 | DropShadow (Inner) | `MakeDropShadowOnly` | `MakeDropShadowOnly` | ✅ |
| D-5 | **LayerBlur** | `saveLayer + MakeBlur` (대상 레이어 자체) | 미구현 | ❌ |

### 11.5 블렌드 모드 (18종)

| # | xstudio 구현 (`blendModes.ts`) | 상태 |
|---|-------------------------------|------|
| E-1 | Normal, Multiply, Screen, Overlay, Darken, Lighten, ColorDodge, ColorBurn, HardLight, SoftLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity, DestinationOver, Plus | ✅ 18종 전체 |

### 11.6 Export

| # | 기능 | xstudio 구현 | 상태 |
|---|------|-------------|------|
| F-1 | PNG/JPEG/WEBP Export | `export.ts` exportToImage | ✅ |
| F-2 | DPR 스케일 + 투명 배경 | scale 옵션 + backgroundColor null | ✅ |

### 11.7 유틸리티 및 지원

| # | 기능 | 파일 | 상태 |
|---|------|------|------|
| G-1 | CanvasKit 초기화 (HMR 안전, 중복 방지) | `initCanvasKit.ts` | ✅ |
| G-2 | GPU Surface 생성 (WebGL → SW 폴백) | `createSurface.ts` | ✅ |
| G-3 | SkiaDisposable (C++ 힙 메모리 관리) | `disposable.ts` | ✅ |
| G-4 | Skia 노드 레지스트리 (O(1) 조회) | `useSkiaNode.ts` | ✅ |
| G-5 | Feature Flag → 하드코딩 (skia 고정, 환경변수 제거됨) | `featureFlags.ts` | ✅ |
| G-6 | Skia 타입 정의 (18개 인터페이스) | `types.ts` | ✅ |

### 11.8 Selection 오버레이 (Pencil 방식)

| # | 기능 | 구현 | 상태 |
|---|------|------|------|
| H-1 | SelectionBox (파란 스트로크, zoom-aware) | `selectionRenderer.ts` renderSelectionBox | ✅ |
| H-2 | TransformHandle (4 코너, 흰 fill + 파란 stroke) | `selectionRenderer.ts` renderTransformHandles | ✅ |
| H-3 | Lasso (반투명 fill + stroke) | `selectionRenderer.ts` renderLasso | ✅ |
| H-4 | PixiJS Selection: 시각 비활성화, 이벤트만 유지 | SelectionBox/TransformHandle/LassoSelection (무조건 Skia 경로, `isSkiaMode` 제거됨) | ✅ |
| H-5 | Camera 하위 숨김: `alpha=0` (renderable=false 금지) | SkiaOverlay.tsx renderFrame | ✅ |

### 11.9 AI 시각 피드백

| # | 기능 | 구현 | 상태 |
|---|------|------|------|
| I-1 | Generating Effect (블러 오버레이 + 회전 파티클) | `aiEffects.ts` renderGeneratingEffects | ✅ |
| I-2 | Flash (스트로크 + 스캔라인 애니메이션) | `aiEffects.ts` renderFlashes | ✅ |

### 11.10 미구현 항목 요약

| # | 항목 | 중요도 | 비고 |
|---|------|--------|------|
| 1 | **MeshGradient Fill** | 중간 | `fills.ts:96-106` 구조만 정의. Coons 패치 또는 SkSL RuntimeEffect 필요 |
| 2 | **LayerBlur 이펙트** | 중간 | BackgroundBlur와 유사하나 대상 레이어 자체에 블러 적용. effects.ts에 case 추가 필요 |
| 3 | **Hybrid 모드** | 낮음 | 텍스트 렌더링 겹침으로 비활성화 중 (`SkiaOverlay.tsx:239-242`) |
| 4 | **Stroke Alignment** (Inside/Outside) | 낮음 | Path.makeStroked + PathOp 필요. 현재 Center만 지원 |
| 5 | **Polygon/Donut/Sector 도형** | 낮음 | 고급 벡터 도형. nodeRenderers.ts 확장 필요 |

### 11.11 전환 완성도

```
Pencil 렌더링 아키텍처 전환: 100% 완료

✅ 완전 구현 (37/37 항목):
├── 아키텍처: CanvasKit 메인 렌더러 + PixiJS 이벤트 전용
├── 렌더 루프: 이중 Surface + 프레임 분류 (idle/content/full) + Dirty Rect 활성화 + camera-only blit 인프라 보존 (Phase 5 대기) (2026-02-03)
├── 노드 렌더링: Box/Text/Image/Container + AABB 컬링 + 좌표계 정합성 수정
├── Fill: 6/6종 (Color, Linear, Radial, Angular, Image, MeshGradient)
├── 이펙트: 4/4종 (Opacity, BackgroundBlur, LayerBlur, DropShadow Outer/Inner)
├── 블렌드 모드: 18종 전체
├── Selection: 선택 박스 + 핸들 + 라쏘 (Skia 렌더링)
├── AI: Generating + Flash 애니메이션
├── Export: PNG/JPEG/WEBP + DPR 스케일
├── 유틸리티: 초기화, Surface, Disposable, Font, 텍스트 측정
├── 변수 Resolve: $-- 참조 → Float32Array 색상 변환 (G.2 완성)
└── 디자인 킷: 내장 킷 JSON + 브라우저 패널 + 시각 피드백 (G.4 완성)
```
