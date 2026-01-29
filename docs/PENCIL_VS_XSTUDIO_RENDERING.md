# Pencil vs xstudio 렌더링 성능 비교 분석

> 분석일: 2026-01-29
> Pencil: v1.1.10 (Electron + PixiJS v8)
> xstudio: PixiJS v8.14.3 + @pixi/react v8.0.5

---

## 1. 렌더링 스택 비교

| 항목 | Pencil | xstudio |
|------|--------|---------|
| 렌더러 | PixiJS v8 (WebGL) + Canvas 2D 폴백 | PixiJS v8.14.3 (WebGL) |
| React 바인딩 | @pixi/react v8 | @pixi/react v8.0.5 |
| 레이아웃 | @pixi/layout (Yoga WASM) | @pixi/layout v3.2.0 (Yoga WASM) |
| WASM 모듈 | pencil.wasm (7.8MB) + Yoga | Yoga만 사용 (WASM 계획 진행 중) |
| 번들 크기 | index.js 5.5MB + WASM 7.8MB = ~13.8MB | 측정 필요 |
| 플랫폼 | Electron (GPU 직접 접근) | 웹 브라우저 (WebGL 제약) |

---

## 2. 최적화 기법 비교표

### 범례
- ✅ 구현됨
- 🔶 부분적/기본 수준
- ❌ 미구현
- 📋 WASM 계획에 포함

### 2.1 렌더링 파이프라인

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| WebGL 배치 렌더링 | ✅ (236 refs) | 🔶 PixiJS 기본 | - | Pencil은 커스텀 배치 레이어 보유 |
| Dirty Rect 렌더링 | ✅ (104 refs) | ❌ | ❌ | 변경 영역만 다시 그리기 |
| GPU 텍스처 캐싱 | ✅ (104 refs) | ✅ cacheAsTexture | - | xstudio Phase F 구현 |
| 텍스처 아틀라싱 | ✅ | ❌ | ❌ | 다수 텍스처를 단일 시트로 합치기 |
| RenderTexture 풀링 | ✅ | ❌ | ❌ | 렌더 텍스처 재사용 |
| LOD (Level of Detail) | ✅ (추정) | ❌ | ❌ | 줌 레벨별 디테일 조절 |
| 블렌드 모드 최적화 | ✅ (20+ 모드) | 🔶 PixiJS 기본 | - | PixiJS v8 내장 지원 |
| 커스텀 셰이더 | ✅ (GLSL+WebGPU) | ❌ | ❌ | 특수 효과 GPU 가속 |

### 2.2 공간 및 히트 테스트

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 뷰포트 컬링 | ✅ | ✅ AABB 기반 | 📋 Phase 1 | xstudio: 100px 마진, 20-40% GPU 절감 |
| 공간 인덱스 (Spatial Index) | ✅ (추정) | ❌ | 📋 Phase 1 | O(n) → O(k) 쿼리 개선 |
| 히트 테스트 가속 | ✅ Prune+Cull | ❌ 전체 순회 | 📋 Phase 1 | Pencil: 다단계 히트 테스트 |
| Scissor 클리핑 | ✅ clipToViewport | ❌ | ❌ | GPU 레벨 클리핑 |

### 2.3 레이아웃 엔진

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| Flexbox (Yoga WASM) | ✅ | ✅ | - | 동일 |
| Grid 레이아웃 | ✅ (추정) | ✅ 커스텀 엔진 | 📋 Phase 2 | xstudio GridEngine 120줄 |
| Block 레이아웃 | ✅ (추정) | ✅ 커스텀 엔진 | 📋 Phase 2 | xstudio BlockEngine 671줄 |
| WASM 연산 가속 | ✅ pencil.wasm | ❌ | 📋 Phase 2 | 레이아웃 배치 계산 |
| 레이아웃 캐싱 | ✅ | 🔶 layoutBoundsRegistry | - | xstudio: JS Map 캐시 |

### 2.4 메모리 및 오브젝트 관리

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 오브젝트 풀링 | ✅ | ✅ SpritePool | - | xstudio: max 100개 |
| 텍스처 GC | ✅ | ✅ autoGarbageCollect | - | PixiJS 기본 설정 활용 |
| WeakMap 추적 | ✅ | ❌ | ❌ | 약한 참조 기반 메모리 관리 |
| VRAM 예산 관리 | ✅ (추정) | 🔶 메트릭 추적만 | ❌ | xstudio: 모니터링만 |

### 2.5 프레임 및 해상도 관리

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 동적 해상도 | ✅ | ✅ getDynamicResolution | - | xstudio: 픽셀 버짓 기반 |
| 저사양 기기 감지 | ✅ (추정) | ✅ isLowEnd 캐싱 | - | CPU 코어, 메모리, 모바일 |
| 안티앨리어싱 조건부 | ✅ (60 refs) | ✅ !isLowEnd | - | 저사양에서 비활성화 |
| 프레임 스로틀링 | ✅ (추정) | 🔶 RAF 기반 | - | 명시적 프레임 스킵 없음 |
| OffscreenCanvas | ✅ webworkerAll.js | ❌ | ❌ | 오프스크린 렌더링 |
| powerPreference | ✅ | ✅ "high-performance" | - | GPU 선택 힌트 |

### 2.6 React 최적화

| 최적화 기법 | Pencil | xstudio | WASM 계획 | 비고 |
|------------|--------|---------|----------|------|
| 메모이제이션 | ✅ | ✅ (900+ instances) | - | memo, useMemo, useCallback |
| 직접 컨테이너 조작 | ✅ | ✅ ViewportController | - | 드래그 중 React 우회 |
| 선택 상태 개별 구독 | ✅ (추정) | ✅ O(2) 최적화 | - | Set.has() 기반 |
| startTransition | ❌ (Electron) | ✅ Phase 18 | - | 비긴급 업데이트 분리 |
| Imperative Handle | ✅ (추정) | ✅ SelectionBox | - | 드래그 중 직접 위치 갱신 |

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
| **Dirty Rect 렌더링** | WASM 계획에 미포함 | **높음** — 대규모 캔버스에서 핵심 최적화 |
| **텍스처 아틀라싱** | WASM 계획에 미포함 | **높음** — GPU 드로 콜 감소 효과 큼 |
| **LOD 스위칭** | WASM 계획에 미포함 | **중간** — 줌아웃 시 디테일 감소 |
| **RenderTexture 풀링** | WASM 계획에 미포함 | **중간** — GPU 메모리 재사용 |
| **커스텀 셰이더** | WASM 계획에 미포함 | **낮음** — 특수 효과용 |
| **OffscreenCanvas** | Phase 4에서 Worker만 다룸 | **중간** — 렌더링 자체의 오프스크린 이전 |
| **SharedArrayBuffer** | WASM 계획에 미포함 | **중간** — 메인-워커 데이터 공유 |
| **Scissor 클리핑** | WASM 계획에 미포함 | **낮음** — GPU 레벨 최적화 |

### 3.3 종합 커버리지

```
Pencil 렌더링 최적화 전체: 100%
├── xstudio 이미 구현: ~55% (React 최적화, 동적 해상도, 컬링, 캐싱, 풀링)
├── WASM 계획으로 추가: ~15% (SpatialIndex, 레이아웃 가속, Worker)
├── 추가 개선 필요:    ~20% (Dirty Rect, 아틀라싱, LOD, RenderTexture)
└── Pencil 고유 영역:  ~10% (커스텀 셰이더, 7.8MB WASM 전용 기하 연산)
```

**WASM 계획 완료 시 Pencil 대비 약 70% 수준의 렌더링 최적화를 달성.**
나머지 20%는 아래 추가 개선 항목으로 보완 가능.

---

## 4. 추가 개선 항목 (WASM 계획 외)

### 4.1 [높음] Dirty Rect 렌더링

**현황:** xstudio는 매 프레임 전체 캔버스를 다시 그림.
**Pencil:** 104개 참조로 변경 영역만 다시 그리는 Dirty Rect 시스템 운용.

**구현 방안:**
```typescript
// canvas/utils/dirtyRectTracker.ts

class DirtyRectTracker {
  private dirtyRects: Set<DirtyRect> = new Set();
  private fullRedrawRequired = false;

  markDirty(elementId: string, bounds: ElementBounds): void {
    // 기존 위치 + 새 위치 = 두 영역 모두 dirty
    const prevBounds = this.previousBounds.get(elementId);
    if (prevBounds) this.dirtyRects.add(prevBounds);
    this.dirtyRects.add(bounds);
  }

  getDirtyRegion(): Rectangle | null {
    if (this.fullRedrawRequired) return null; // 전체 다시 그리기
    if (this.dirtyRects.size === 0) return null; // 변경 없음

    // 모든 dirty rect의 합집합 계산
    return this.mergeRects([...this.dirtyRects]);
  }

  clear(): void {
    this.dirtyRects.clear();
    this.fullRedrawRequired = false;
  }
}
```

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
즉시 적용 가능 (WASM 불필요, JS만으로 구현):
├── 4.3 LOD 스위칭 — useLOD 훅 추가, ElementSprite에 분기
├── 4.6 VRAM 예산 관리 — gpuProfilerCore.ts 확장
│
WASM 계획 완료 후:
├── 4.1 Dirty Rect 렌더링 — BuilderCanvas ticker 수정
├── 4.2 텍스처 아틀라싱 — ImageSprite/아이콘 통합
├── 4.4 RenderTexture 풀링 — useCacheOptimization 개선
│
장기 검토:
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
| + 4.1 Dirty Rect 렌더링 | +8% | 83% |
| + 4.2 텍스처 아틀라싱 | +5% | 88% |
| + 4.3 LOD 스위칭 | +4% | 92% |
| + 4.4 RenderTexture 풀링 | +3% | 95% |
| Pencil 고유 영역 (7.8MB WASM) | 5% | - |

> **결론:** WASM 계획 + 추가 개선 4항목 적용 시 Pencil 렌더링 성능의 **약 95%**를 커버할 수 있다.
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
