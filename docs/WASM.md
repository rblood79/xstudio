# xstudio WASM 렌더링 아키텍처 전환 계획

> 작성일: 2026-01-29
> 최종 수정: 2026-01-30 (최적성 검토 반영 — 8차 수정)
> 대상: `apps/builder/src/builder/workspace/canvas/`
> 현재 스택: PixiJS v8.14.3 + @pixi/react v8.0.5 + Yoga WASM v3.2.1 + Zustand
> 참고: Pencil Desktop v1.1.10 아키텍처 분석 기반 (`docs/PENCIL_APP_ANALYSIS.md` §11)

---

## ⚠️ 아키텍처 정정 (2026-01-30)

초기 분석에서 "PixiJS가 메인 렌더러, pencil.wasm이 보조 최적화"로 기술하여,
본 문서가 **PixiJS를 메인 렌더러로 유지하면서 보조 WASM 모듈만 추가하는 계획**으로 수립되었다.

그러나 `renderSkia()` 메서드 역공학 결과, 실제 Pencil 아키텍처는:

| 계층 | 역할 | 기술 |
|------|------|------|
| **메인 렌더러** | 모든 디자인 노드의 벡터/텍스트/이미지/이펙트 렌더링 | **CanvasKit/Skia WASM** (7.8MB) |
| 씬 그래프/이벤트 | 씬 트리 관리 + EventBoundary (Hit Testing) 전용 | PixiJS v8 |
| 레이아웃 | Flexbox 계산 | Yoga WASM |

```
Pencil 실제 구조:                    현재 xstudio:
┌──────────────────────┐             ┌──────────────────────┐
│ CanvasKit/Skia WASM  │ ← 메인      │ PixiJS v8 (WebGL)    │ ← 메인 (렌더링+씬+이벤트)
│ (renderSkia 파이프라인)│             │                      │
├──────────────────────┤             ├──────────────────────┤
│ PixiJS v8            │ ← 보조      │ Yoga WASM            │ ← 레이아웃만
│ (씬 그래프 + 이벤트)   │             │                      │
├──────────────────────┤             └──────────────────────┘
│ Yoga WASM            │ ← 레이아웃
└──────────────────────┘
```

**본 문서의 최종 목표:** Pencil §11 아키텍처를 xstudio에 적용하여, **CanvasKit/Skia WASM을 메인 렌더러로 도입**하고 PixiJS는 씬 그래프/이벤트 레이어로 전환한다.

- **Phase 0–4** (기존): 현재 PixiJS 아키텍처 위에서의 점진적 WASM 최적화 (Spatial Index, Layout 가속, Worker). CanvasKit 전환 전에도 독립적으로 유효하다.
- **Phase 5** (신규): CanvasKit/Skia WASM 메인 렌더러 도입 — Pencil의 renderSkia 패턴 적용
- **Phase 6** (신규): 고급 렌더링 기능 — 이중 Surface 캐싱, Dirty Rect, 이펙트 파이프라인

---

## CanvasKit/Skia 전환 장점 분석

### 렌더링 품질

| 영역 | 현재 (PixiJS) | 전환 후 (CanvasKit) | 개선 |
|------|--------------|-------------------|------|
| **벡터 도형** | PixiJS Graphics (제한적 Path) | Skia Path — 베지어, PathOp(Union/Intersect/Difference), Boolean 연산 | 디자인 툴 수준 벡터 정밀도 |
| **텍스트 렌더링** | 브라우저 Canvas2D 래스터 | ParagraphBuilder — 서브픽셀 렌더링, StrutStyle, 정밀 커닝 | Figma/Sketch 급 텍스트 품질 |
| **안티앨리어싱** | PixiJS 기본 (저사양 비활성화) | `paint.setAntiAlias(true)` + `font.setSubpixel(true)` 전역 적용 | 모든 도형/텍스트에 일관된 AA |
| **Fill 시스템** | Color, LinearGradient 정도 | 6종 Shader: Color/Linear/Radial/Angular/MeshGradient/Image | Figma Fill과 동등 |
| **블렌드 모드** | PixiJS 기본 (제한적) | 18종 네이티브 (Multiply, Screen, Overlay 등) | 포토샵급 합성 |
| **이펙트** | PixiJS 기본 필터 | saveLayer 기반 — Opacity, BackgroundBlur, LayerBlur, DropShadow(Inner+Outer) | 실시간 이펙트 파이프라인 |
| **Stroke** | 기본 선 그리기 | `path.makeStroked()` + PathOp으로 Inside/Outside/Center 정렬 | CSS stroke-alignment 구현 가능 |

### 렌더링 성능

| 영역 | 현재 (PixiJS) | 전환 후 (CanvasKit) | 예상 개선폭 |
|------|--------------|-------------------|-----------|
| **줌/패닝** | 매 프레임 전체 씬 재렌더링 | 이중 Surface 캐싱 — contentSurface 블리팅만 | **10x+** (< 1ms vs ~16ms) |
| **정적 프레임** | 변경 없어도 전체 렌더 | contentSurface 캐시 히트 → GPU 제출만 | **< 1ms** |
| **부분 변경** | 전체 캔버스 다시 그림 | Dirty Rect — 변경 영역만 재렌더링 | GPU 부하 **40-60% 감소** |
| **뷰포트 컬링** | JS에서 AABB 검사 | renderSkia() 첫 줄에서 네이티브 AABB 컬링 | WASM 내부에서 처리 |
| **텍스처 관리** | PixiJS 개별 텍스처 업로드 | CanvasKit 내부 GPU 리소스 관리 | 드로 콜 감소 |

### 아키텍처 이점

| 영역 | 현재 (PixiJS) | 전환 후 (CanvasKit) | 의미 |
|------|--------------|-------------------|------|
| **렌더링-이벤트 분리** | PixiJS가 렌더링+씬+이벤트 모두 담당 | 렌더링(CanvasKit) ↔ 이벤트(PixiJS) 완전 분리 | 각 계층 독립 최적화 가능 |
| **Export 품질** | PixiJS → Canvas2D → 이미지 | CanvasKit 오프스크린 Surface → 벡터 정밀 Export | PNG/JPEG/WEBP 고품질 Export |
| **플랫폼 일관성** | 브라우저 Canvas2D 의존 → 렌더링 차이 | Skia 엔진 직접 사용 → 모든 브라우저 동일 출력 | 크로스 브라우저 렌더링 일치 |
| **확장성** | 새 이펙트 = PixiJS 필터 제약 | CanvasKit API 직접 사용 → 자유로운 이펙트 | 커스텀 셰이더, 마스킹, 클리핑 |
| **Pencil 호환** | 렌더링 구조 상이 | 동일 아키텍처 → .pen 파일 렌더링 호환 가능 | 경쟁 제품 파일 호환 |

### 비용 및 리스크

| 항목 | 내용 | 심각도 | 완화 전략 |
|------|------|--------|----------|
| **번들 크기 증가** | +1.5MB (slim) ~ +3.5MB (full) | 중간 | Lazy loading + 브라우저 캐싱 |
| **초기 로드** | CanvasKit WASM 초기화 오버헤드 | 중간 | 병렬 초기화 + 프리로드 |
| **메모리 관리** | CanvasKit 객체 수동 `.delete()` 필요 (GC 아님) | 높음 | Disposable 패턴 래퍼 도입 |
| **학습 곡선** | Skia Canvas API 학습 필요 | 중간 | Google CanvasKit 공식 문서 + Pencil 코드 참조 |
| **이중 렌더러 복잡도** | PixiJS 씬 + CanvasKit 렌더 동기화 | 높음 | Feature Flag로 점진적 전환 |
| **PixiJS 생태계** | @pixi/react, @pixi/layout 등 활용도 감소 | 낮음 | 씬 그래프/이벤트 레이어로 유지 |
| **WebGL 컨텍스트 충돌** | hybrid 모드에서 PixiJS + CanvasKit 동시 WebGL 컨텍스트 (~16개 제한) | 중간 | §5.7.1 캔버스 오버레이 + 이벤트 포워딩 전략 |

### 종합 평가

| 평가 항목 | 점수 | 근거 |
|----------|------|------|
| 렌더링 품질 향상 | ★★★★★ | 벡터/텍스트/이펙트/Fill/블렌드 모두 디자인 툴 수준 |
| 성능 향상 | ★★★★☆ | 이중 Surface + Dirty Rect로 대폭 개선, 단 초기 로드 비용 |
| 아키텍처 정합성 | ★★★★★ | Pencil과 동일 구조 → 검증된 패턴 |
| 구현 난이도 | ★★★☆☆ | 점진적 전환(Feature Flag)으로 리스크 관리 가능 |
| 번들 비용 | ★★☆☆☆ | +1.5MB는 웹 앱에 부담이나, 디자인 툴 특성상 수용 가능 |

> **핵심 판단:** PixiJS는 **게임 엔진** 기반으로 디자인 툴에 필요한 벡터 정밀도, 이펙트, Fill 다양성이 부족하다.
> CanvasKit/Skia는 **2D 그래픽 엔진**으로 Figma, Pencil이 채택한 검증된 선택이며,
> xstudio가 디자인 툴 품질 경쟁력을 확보하려면 렌더러 전환이 필수적이다.

---

## 현황 요약

### 현재 WASM 사용

| 모듈 | 용도 | 초기화 위치 |
|------|------|------------|
| yoga-layout v3.2.1 | Flexbox 레이아웃 계산 | `layout/initYoga.ts` (92줄) |

### 기존 캐싱 메커니즘

`elementRegistry.ts`에 이미 2단계 캐시가 구현되어 있다:

| 레이어 | 구현 | 역할 |
|--------|------|------|
| `layoutBoundsRegistry` (Map) | `getElementBoundsSimple()`:109행에서 우선 조회 | 레이아웃 계산 결과 캐시, O(1) 조회 |
| `elementRegistry` (Map) | 캐시 미스 시 `container.getBounds()` 폴백 | PixiJS 디스플레이 트리 순회 (느림) |

> **참고:** 캐시 히트 시 `getBounds()` 트리 순회가 발생하지 않으므로, Bounds 조회 자체의 WASM 최적화 효과는 제한적이다.

### 성능 병목 분석

| 연산 | 현재 방식 | 실제 병목 | 영향도 |
|------|----------|----------|--------|
| Viewport Culling | `Array.filter()` O(n) 순회 | 요소 수 증가 시 선형 탐색 비용 | **높음** |
| Block 레이아웃 | JS 메인 루프 671줄 (margin collapse + baseline) | 복잡 중첩 레이아웃 재계산 비용 | **중간** |
| 히트 테스트 (라쏘/호버) | `SelectionLayer.utils.ts` `elements.filter()` O(n) 순회 | 라쏘 선택·호버 시 O(n) 탐색 (개별 클릭은 PixiJS `FederatedPointerEvent` 기반 O(1)~O(log n)으로 병목 아님) | **중간** |
| 텍스트 래스터라이즈 | `textRef.getBounds()` (브라우저 Canvas API 의존) | WASM으로 해결 불가 | **낮음 (WASM 부적합)** |
| CSS 파싱 | `parseCSSValue()` (V8 JIT 최적화됨) | WASM 경계 넘기 비용이 이득 상쇄 | **낮음 (WASM 부적합)** |

### 성능 목표

| 지표 | 목표 | 비고 |
|------|------|------|
| 1,000 요소 프레임 타임 | < 25ms | Phase 0 벤치마크에서 현재 기준선 측정 |
| 5,000 요소 @ 60fps | 안정 유지 | Phase 0 스트레스 테스트에서 확인 |
| 레이아웃 재계산 | < 150ms | 복잡 그리드 기준 |
| 줌/팬 응답 시간 | 항상 < 16ms | SpatialIndex 도입 효과 검증 |

> **원칙:** 성능 수치는 Phase 0 벤치마크 이후 실측값으로 대체한다. 사전 추정치는 "검증 대상"으로 취급한다.

---

## Phase 0: 환경 구축 및 벤치마크 기준선

### 0.1 Rust + wasm-pack 개발 환경 설정

**디렉토리 구조:**
```
apps/builder/src/builder/workspace/canvas/
├── wasm/                              # Rust WASM 프로젝트 루트
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                     # WASM 엔트리포인트
│   │   ├── spatial_index.rs           # Phase 1
│   │   ├── block_layout.rs            # Phase 2
│   │   └── grid_layout.rs             # Phase 2
│   └── tests/
│       ├── spatial_test.rs
│       └── layout_test.rs
├── wasm-bindings/                     # TypeScript 바인딩
│   ├── init.ts                        # 전체 WASM 초기화
│   ├── idMapper.ts                    # Phase 1 string↔u32 매핑
│   ├── spatialIndex.ts                # Phase 1 바인딩
│   ├── featureFlags.ts                # Feature Flag 관리
│   └── layoutAccelerator.ts           # Phase 2 바인딩
```

**Cargo.toml:**
```toml
[package]
name = "xstudio-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = "s"       # 바이너리 크기 최적화
lto = true
```

**빌드 스크립트 (package.json에 추가):**
```json
{
  "scripts": {
    "wasm:build": "wasm-pack build apps/builder/src/builder/workspace/canvas/wasm --target web --out-dir ../wasm-bindings/pkg",
    "wasm:dev": "wasm-pack build apps/builder/src/builder/workspace/canvas/wasm --target web --dev --out-dir ../wasm-bindings/pkg",
    "wasm:test": "wasm-pack test --node apps/builder/src/builder/workspace/canvas/wasm"
  }
}
```

**Vite 설정 추가 (`vite.config.ts`):**
```typescript
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    // ... 기존 플러그인
  ],
  optimizeDeps: {
    exclude: ['xstudio-wasm'],
  },
});
```

### 0.2 벤치마크 기준선 수집

`gpuProfilerCore.ts`를 확장하여 WASM 최적화 전후 비교 데이터를 수집한다.

**측정 항목:**
```typescript
interface WasmBenchmark {
  // Bounds 관련
  boundsLookupAvgMs: number;        // getElementBounds() 평균 소요 시간
  cullingFilterAvgMs: number;       // useViewportCulling 필터 소요 시간

  // 레이아웃 관련
  blockLayoutAvgMs: number;         // BlockEngine.calculate() 소요 시간
  gridLayoutAvgMs: number;          // GridEngine.calculate() 소요 시간
  marginCollapseAvgMs: number;      // collapseMargins() 호출 빈도 및 시간

  // 텍스트 관련
  textMeasureAvgMs: number;         // TextSprite getBounds() 소요 시간
  textDecorationAvgMs: number;      // drawTextDecoration() 소요 시간

  // 전체
  frameTimeAvgMs: number;           // 평균 프레임 타임
  elementCount: number;             // 현재 요소 수
}
```

**측정 방법:**
```typescript
// 각 핫 패스에 performance.mark/measure 삽입
performance.mark('bounds-lookup-start');
const bounds = container.getBounds();
performance.mark('bounds-lookup-end');
performance.measure('bounds-lookup', 'bounds-lookup-start', 'bounds-lookup-end');
```

**기준선 시나리오:**

| 시나리오 | 요소 수 | 측정 항목 |
|---------|---------|----------|
| 소규모 페이지 | 50개 | 프레임 타임, 레이아웃 시간 |
| 중규모 페이지 | 500개 | 프레임 타임, 컬링 비율, 레이아웃 시간 |
| 대규모 페이지 | 2,000개 | 프레임 타임, 컬링 비율, 메모리 사용량 |
| 스트레스 테스트 | 5,000개 | 프레임 드롭 시점, 최대 프레임 타임 |

**추가 측정 항목 (WASM 도입 효과 판단용):**

| 항목 | 측정 방법 | 의의 |
|------|----------|------|
| panOffset 변경 빈도 | ViewportController.syncToReactState() 호출 횟수/초 | throttle 필요성 판단 |
| _rebuildIndexes 호출 빈도 | 배치 작업 시 호출 횟수 | 배치 리빌드 최적화 우선순위 |
| SpritePool 히트율 | acquire/release 비율 vs destroy 비율 | maxPoolSize 적정성 |
| CSS 파싱 반복률 | parseCSSValue 동일 입력 호출 비율 | 캐싱 ROI |

### 0.3 Feature Flag 인프라

```typescript
// wasm-bindings/featureFlags.ts

export const WASM_FLAGS = {
  SPATIAL_INDEX: import.meta.env.VITE_WASM_SPATIAL === 'true',
  LAYOUT_ENGINE: import.meta.env.VITE_WASM_LAYOUT === 'true',
} as const;

// .env.development
VITE_WASM_SPATIAL=true
VITE_WASM_LAYOUT=false
```

### 0.4 Phase 0 산출물

- [ ] Rust + wasm-pack 프로젝트 초기화
- [ ] Vite WASM 플러그인 설정
- [ ] 빌드 파이프라인 검증 (dev + production)
- [ ] 벤치마크 유틸리티 작성
- [ ] 기준선 데이터 수집 (4개 시나리오)
- [ ] Feature Flag 인프라 구축
- [ ] CI/CD에 `wasm:build` 스텝 추가

---

## Phase 1: Spatial Index (뷰포트 컬링 + 히트 테스트 가속)

> 목표: O(n) 선형 탐색을 공간 인덱스 쿼리로 대체
> 적용 대상: `useViewportCulling.ts`, 히트 테스트 로직
> ~~BoundsCache~~ → 제거: 기존 `layoutBoundsRegistry` (JS Map)가 이미 O(1) 캐시 제공
>
> ⚠️ **Phase 5 이후 역할 변경:** CanvasKit 도입(Phase 5) 후 `renderSkia()`가 각 노드의 AABB 컬링을
> 내부에서 처리하므로, SpatialIndex의 뷰포트 컬링(`query_viewport`) 역할은 대폭 축소된다.
> Phase 5 이후에는 **라쏘 선택(`query_rect`)** 및 **호버 히트 테스트(`query_point`) 가속**에 집중한다.

### 1.1 문제 정의

**실제 병목 (수정됨):**
- `getElementBoundsSimple()` 자체는 `layoutBoundsRegistry` 캐시로 O(1) → **병목 아님**
- **진짜 병목:** `useViewportCulling.ts:205`의 `elements.filter()` — 전체 배열을 O(n) 순회
- **진짜 병목:** 라쏘(드래그) 선택 — `SelectionLayer.utils.ts:11-16`의 `elements.filter()`로 O(n) 순회
- **병목 아님:** 개별 요소 클릭 — PixiJS `FederatedPointerEvent` + `eventMode="static"`으로 O(1)~O(log n) (PixiJS 내부 히트 테스트 시스템이 처리)

**호출 빈도:**
- `useViewportCulling` — 매 팬/줌 변경마다 (useMemo 의존성: zoom, panOffset)
- 라쏘 선택 — 드래그 종료 시 1회 (`findElementsInLasso()`)
- 개별 클릭 — PixiJS가 처리하므로 SpatialIndex 불필요

**범위 주의:** `elements` 배열은 **모든 페이지**의 요소를 단일 배열에 저장한다 (`elements.ts:41`).
SpatialIndex에 전체 페이지 요소를 등록하면 불필요한 메모리 사용과 쿼리 비용이 발생한다.
페이지 전환 시 `clearAll()` + 현재 페이지 요소만 `batch_upsert()` 하는 전략을 적용해야 한다.

### 1.2 WASM 모듈 설계

> BoundsCache WASM 모듈은 불필요하므로 제거. SpatialIndex만 구현한다.

**ID 매핑 전략:**

xstudio의 요소 ID는 string(UUID)이고 WASM은 u32를 사용하므로 매핑이 필요하다:

```typescript
// wasm-bindings/idMapper.ts
class ElementIdMapper {
  private stringToNum = new Map<string, number>();
  private numToString = new Map<number, string>();
  private nextId = 0;

  getNumericId(stringId: string): number {
    let numId = this.stringToNum.get(stringId);
    if (numId === undefined) {
      numId = this.nextId++;
      this.stringToNum.set(stringId, numId);
      this.numToString.set(numId, stringId);
    }
    return numId;
  }

  getStringId(numId: number): string | undefined {
    return this.numToString.get(numId);
  }

  /** 기존 매핑만 조회 (미존재 시 undefined 반환, 신규 할당하지 않음) */
  tryGetNumericId(stringId: string): number | undefined {
    return this.stringToNum.get(stringId);
  }

  remove(stringId: string): void {
    const numId = this.stringToNum.get(stringId);
    if (numId !== undefined) {
      this.stringToNum.delete(stringId);
      this.numToString.delete(numId);
    }
  }

  clear(): void {
    this.stringToNum.clear();
    this.numToString.clear();
    this.nextId = 0;
  }
}

export const idMapper = new ElementIdMapper();
```

**Spatial Index (`spatial_index.rs`):**

> `HashMap<(i32, i32), ...>` 튜플 키는 wasm_bindgen에서 지원되지 않으므로,
> `i64` 단일 키로 인코딩한다: `key = (cx as i64) << 32 | (cy as u32 as i64)`.
> 공개 API는 WASM-safe 타입(`&[f32]`, `Box<[u32]>`)만 사용한다.

```rust
use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use std::collections::HashSet;

fn cell_key(cx: i32, cy: i32) -> i64 {
    ((cx as i64) << 32) | (cy as u32 as i64)
}

#[wasm_bindgen]
pub struct SpatialIndex {
    cell_size: f32,
    cells: HashMap<i64, Vec<u32>>,
    element_cells: HashMap<u32, Vec<i64>>,
    // 히트 테스트용 내부 바운드 캐시
    bounds: HashMap<u32, [f32; 4]>,
}

#[wasm_bindgen]
impl SpatialIndex {
    #[wasm_bindgen(constructor)]
    pub fn new(cell_size: f32) -> SpatialIndex {
        SpatialIndex {
            cell_size,
            cells: HashMap::new(),
            element_cells: HashMap::new(),
            bounds: HashMap::new(),
        }
    }

    /// 요소 삽입/업데이트 (바운드 캐시도 함께 저장)
    pub fn upsert(&mut self, id: u32, x: f32, y: f32, w: f32, h: f32) {
        self.remove(id);
        self.bounds.insert(id, [x, y, w, h]);
        let keys = self.get_cell_keys(x, y, w, h);
        for &key in &keys {
            self.cells.entry(key).or_default().push(id);
        }
        self.element_cells.insert(id, keys);
    }

    /// 배치 업데이트 (Float32Array: [id, x, y, w, h, ...])
    pub fn batch_upsert(&mut self, data: &[f32]) {
        for chunk in data.chunks_exact(5) {
            let id = chunk[0] as u32;
            self.upsert(id, chunk[1], chunk[2], chunk[3], chunk[4]);
        }
    }

    /// 뷰포트 내 요소 ID 반환 (AABB 교차 검증 포함 — false positive 제거)
    /// ※ query_rect()와 로직이 동일함 — 향후 공통 내부 함수 _query_region()으로 추출 가능
    pub fn query_viewport(&self, left: f32, top: f32, right: f32, bottom: f32) -> Box<[u32]> {
        let mut result = Vec::new();
        let mut seen = HashSet::new();

        let min_cx = (left / self.cell_size).floor() as i32;
        let max_cx = (right / self.cell_size).floor() as i32;
        let min_cy = (top / self.cell_size).floor() as i32;
        let max_cy = (bottom / self.cell_size).floor() as i32;

        for cx in min_cx..=max_cx {
            for cy in min_cy..=max_cy {
                let key = cell_key(cx, cy);
                if let Some(ids) = self.cells.get(&key) {
                    for &id in ids {
                        if seen.insert(id) {
                            // 실제 AABB 교차 검증 — 셀 경계에 걸리지만
                            // 뷰포트와 겹치지 않는 요소를 제거
                            if let Some(b) = self.bounds.get(&id) {
                                let el_right = b[0] + b[2];
                                let el_bottom = b[1] + b[3];
                                if b[0] <= right && el_right >= left
                                    && b[1] <= bottom && el_bottom >= top
                                {
                                    result.push(id);
                                }
                            }
                        }
                    }
                }
            }
        }

        result.into_boxed_slice()
    }

    /// 포인트 히트 테스트 (내부 bounds 사용 — WASM 경계 넘기 없음)
    pub fn query_point(&self, px: f32, py: f32) -> Box<[u32]> {
        let cx = (px / self.cell_size).floor() as i32;
        let cy = (py / self.cell_size).floor() as i32;
        let key = cell_key(cx, cy);

        let mut hits = Vec::new();
        if let Some(ids) = self.cells.get(&key) {
            for &id in ids {
                if let Some(b) = self.bounds.get(&id) {
                    if px >= b[0] && px <= b[0] + b[2]
                        && py >= b[1] && py <= b[1] + b[3] {
                        hits.push(id);
                    }
                }
            }
        }

        hits.into_boxed_slice()
    }

    /// 영역 내 요소 반환 (라쏘 선택용 — 실제 AABB 교차 검증 포함)
    pub fn query_rect(&self, left: f32, top: f32, right: f32, bottom: f32) -> Box<[u32]> {
        let mut result = Vec::new();
        let mut seen = HashSet::new();

        let min_cx = (left / self.cell_size).floor() as i32;
        let max_cx = (right / self.cell_size).floor() as i32;
        let min_cy = (top / self.cell_size).floor() as i32;
        let max_cy = (bottom / self.cell_size).floor() as i32;

        for cx in min_cx..=max_cx {
            for cy in min_cy..=max_cy {
                let key = cell_key(cx, cy);
                if let Some(ids) = self.cells.get(&key) {
                    for &id in ids {
                        if seen.insert(id) {
                            // 실제 AABB 교차 검증
                            if let Some(b) = self.bounds.get(&id) {
                                let el_right = b[0] + b[2];
                                let el_bottom = b[1] + b[3];
                                if b[0] <= right && el_right >= left
                                    && b[1] <= bottom && el_bottom >= top
                                {
                                    result.push(id);
                                }
                            }
                        }
                    }
                }
            }
        }

        result.into_boxed_slice()
    }

    pub fn remove(&mut self, id: u32) {
        self.bounds.remove(&id);
        if let Some(keys) = self.element_cells.remove(&id) {
            for key in keys {
                if let Some(ids) = self.cells.get_mut(&key) {
                    ids.retain(|&i| i != id);
                }
            }
        }
    }

    pub fn clear(&mut self) {
        self.cells.clear();
        self.element_cells.clear();
        self.bounds.clear();
    }

    pub fn len(&self) -> u32 {
        self.element_cells.len() as u32
    }

    fn get_cell_keys(&self, x: f32, y: f32, w: f32, h: f32) -> Vec<i64> {
        let min_cx = (x / self.cell_size).floor() as i32;
        let max_cx = ((x + w) / self.cell_size).floor() as i32;
        let min_cy = (y / self.cell_size).floor() as i32;
        let max_cy = ((y + h) / self.cell_size).floor() as i32;

        let mut keys = Vec::new();
        for cx in min_cx..=max_cx {
            for cy in min_cy..=max_cy {
                keys.push(cell_key(cx, cy));
            }
        }
        keys
    }
}
```

### 1.3 TypeScript 바인딩

**`wasm-bindings/spatialIndex.ts`:**
```typescript
import init, { SpatialIndex } from './pkg/xstudio_wasm';
import { idMapper } from './idMapper';

let spatialIndex: SpatialIndex | null = null;
let initialized = false;

const SPATIAL_CELL_SIZE = 256;

export async function initSpatialWasm(): Promise<void> {
  if (initialized) return;
  await init();
  spatialIndex = new SpatialIndex(SPATIAL_CELL_SIZE);
  initialized = true;
}

export function updateElement(
  stringId: string, x: number, y: number, w: number, h: number
): void {
  if (!spatialIndex) return;
  const numId = idMapper.getNumericId(stringId);
  spatialIndex.upsert(numId, x, y, w, h);
}

export function batchUpdate(data: Float32Array): void {
  spatialIndex?.batch_upsert(data);
}

export function queryVisibleElements(
  left: number, top: number, right: number, bottom: number
): string[] {
  if (!spatialIndex) return [];
  const numIds = spatialIndex.query_viewport(left, top, right, bottom);
  return Array.from(numIds)
    .map(id => idMapper.getStringId(id))
    .filter((id): id is string => id !== undefined);
}

export function queryRect(
  left: number, top: number, right: number, bottom: number
): string[] {
  if (!spatialIndex) return [];
  const numIds = spatialIndex.query_rect(left, top, right, bottom);
  return Array.from(numIds)
    .map(id => idMapper.getStringId(id))
    .filter((id): id is string => id !== undefined);
}

export function hitTestPoint(x: number, y: number): string[] {
  if (!spatialIndex) return [];
  const numIds = spatialIndex.query_point(x, y);
  return Array.from(numIds)
    .map(id => idMapper.getStringId(id))
    .filter((id): id is string => id !== undefined);
}

export function removeElement(stringId: string): void {
  if (!spatialIndex) return;
  const numId = idMapper.tryGetNumericId(stringId);
  if (numId === undefined) return; // 미등록 ID — 신규 할당 방지
  spatialIndex.remove(numId);
  idMapper.remove(stringId);
}

export function clearAll(): void {
  spatialIndex?.clear();
  idMapper.clear();
}
```

### 1.4 기존 코드 통합 지점

**`useViewportCulling.ts` 수정:**
```typescript
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';
import { queryVisibleElements } from '../wasm-bindings/spatialIndex';

// useMemo 내부 (205행 대체):
if (WASM_FLAGS.SPATIAL_INDEX) {
  const viewport = calculateViewportBounds(screenWidth, screenHeight, zoom, panOffset);
  // SpatialIndex가 반환하는 ID 배열을 직접 사용 — O(k)
  const visibleIds = queryVisibleElements(
    viewport.left, viewport.top, viewport.right, viewport.bottom
  );
  // elementsMap(Zustand store)에서 O(1) 조회로 element 객체 수집 — 전체 O(k)
  const elementsMap = useStore.getState().elementsMap;
  const visibleElements = visibleIds
    .map(id => elementsMap.get(id))
    .filter((el): el is Element => el !== undefined);

  // ★ 렌더/스태킹 순서 보존:
  // SpatialIndex는 셀 순회 순서로 ID를 반환하므로 원래 렌더 순서가 유실된다.
  // elementOrderIndex(Map<id, number>)를 사용해 O(k log k) 정렬로 원래 순서를 복원한다.
  const orderIndex = useStore.getState().elementOrderIndex; // Map<string, number>
  visibleElements.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  // ...
}

// ※ 기존 elements.filter(el => ...) 경로는 WASM_FLAGS.SPATIAL_INDEX=false일 때만 실행 (JS 폴백)
```

> **⚠️ 사전 최적화 필요: ViewportController throttle**
> 현재 `ViewportController.updatePan()`은 마우스 move마다 호출되어 초당 60~240회
> `syncToReactState()`를 실행하고, 매번 새로운 panOffset 객체를 생성한다.
> 이로 인해 `useMemo` 의존성이 무효화되어 SpatialIndex 쿼리 + O(k log k) 정렬이
> 초당 240회 실행될 수 있다. WASM SpatialIndex 도입 전에 다음을 적용해야 한다:
> - `syncToReactState()`에 **16ms throttle** 적용 (60fps 상한)
> - panOffset 객체를 **shallow equal 비교**하여 값이 동일하면 React state 업데이트 스킵

**`elementOrderIndex` 생성 및 갱신:**

`elementOrderIndex`는 전체 요소의 렌더 순서(= DFS 트리 순회 순서)를
`Map<string, number>`로 캐시한 파생 인덱스이다.

```typescript
// store/derived/elementOrderIndex.ts

/**
 * elements 배열의 렌더 순서를 Map<id, index>로 캐시한다.
 * elements 배열은 이미 페이지 → 자식 순서의 DFS 트리 순회 결과이므로,
 * 배열 인덱스가 곧 렌더/스태킹 순서이다.
 *
 * 갱신 시점: elements 배열이 변경될 때 (요소 추가/삭제/순서 변경)
 * Zustand 미들웨어 또는 rebuildIndexes() 내부에서 호출.
 */
export function buildElementOrderIndex(elements: Element[]): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < elements.length; i++) {
    index.set(elements[i].id, i);
  }
  return index;
}

// Zustand store 슬라이스에서 파생 인덱스로 등록:
// (기존 elementsMap, childrenMap, pageIndex 리빌드와 동일한 시점)
rebuildIndexes(elements) {
  set({
    elementsMap: buildElementsMap(elements),
    childrenMap: buildChildrenMap(elements),
    pageIndex: buildPageIndex(elements),
    elementOrderIndex: buildElementOrderIndex(elements), // ← 추가
  });
}
```

> **갱신 비용:** O(n) 순회 1회. 기존 `rebuildIndexes()`에서 `elementsMap`을 빌드하는 것과
> 동일한 시점에 함께 수행하므로, 추가 비용은 Map.set() n회뿐이다.

> **⚠️ 배치 리빌드 주의:** 현재 `_rebuildIndexes()`는 14곳에서 호출된다
> (elements.ts, elementCreation.ts, elementUpdate.ts, elementRemoval.ts, elementLoader.ts, historyActions.ts).
> 배치 작업(복붙, 페이지 로드, Undo/Redo) 시 매 요소마다 호출되면
> O(n) × m = **O(n·m)** 비용이 발생한다 (m = 배치 내 요소 수).
> `elementOrderIndex` 추가로 인해 리빌드 비용이 기존 대비 ~25% 증가하므로,
> 배치 작업 시에는 개별 호출 대신 최종 1회만 리빌드하는 전략을 적용해야 한다:
> ```typescript
> // 배치 작업 패턴
> function batchOperation(operations: () => void) {
>   suspendIndexRebuild();   // _rebuildIndexes() 내부에서 early return
>   operations();            // 개별 요소 작업 (리빌드 스킵)
>   resumeAndRebuildIndexes(); // 최종 1회 O(n) 리빌드
> }
> ```

**`SelectionLayer.utils.ts` 수정 (라쏘 선택):**
```typescript
import { WASM_FLAGS } from '../../wasm-bindings/featureFlags';
import { queryRect } from '../../wasm-bindings/spatialIndex';

function findElementsInLasso(
  elements: Element[],
  lassoStart: Point,
  lassoCurrent: Point,
): string[] {
  const lassoBounds = getLassoBounds(lassoStart, lassoCurrent);

  if (WASM_FLAGS.SPATIAL_INDEX) {
    // SpatialIndex: O(k) — AABB 교차 검증 포함
    // ※ bounds 소스: SpatialIndex는 layoutBoundsRegistry 기준 (레이아웃 엔진 계산 결과).
    //   JS 폴백의 calculateBounds(style)와 다른 소스이므로, 결과가 미세하게 다를 수 있다.
    //   (예: style에 width:50%가 있으면 JS 폴백은 raw 값, WASM은 resolved px 값 사용)
    return queryRect(
      lassoBounds.x, lassoBounds.y,
      lassoBounds.x + lassoBounds.width,
      lassoBounds.y + lassoBounds.height,
    );
  }

  // JS 폴백: O(n) 전체 순회
  return elements
    .filter((el) => {
      const elementBounds = calculateBounds(el.props?.style);
      return boxesIntersect(lassoBounds, elementBounds);
    })
    .map((el) => el.id);
}
```

**`elementRegistry.ts`에 SpatialIndex 동기화 추가:**
```typescript
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';
import { updateElement, removeElement } from '../wasm-bindings/spatialIndex';

// updateElementBounds (61행) 수정 — 기존 layoutBoundsRegistry는 유지:
export function updateElementBounds(id: string, bounds: ElementBounds): void {
  layoutBoundsRegistry.set(id, bounds);
  // SpatialIndex 동기화
  if (WASM_FLAGS.SPATIAL_INDEX) {
    updateElement(id, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}

// unregisterElement (70행) 수정:
export function unregisterElement(id: string): void {
  elementRegistry.delete(id);
  layoutBoundsRegistry.delete(id);
  if (WASM_FLAGS.SPATIAL_INDEX) {
    removeElement(id);
  }
}
```

> **⚠️ RAF 타이밍 경쟁:**
> 현재 `updateElementBounds()`는 `BuilderCanvas.tsx:299-317`의 RAF 콜백 내에서 호출된다.
> SpatialIndex 동기화도 이 경로에 포함되므로, `useViewportCulling`의 `useMemo` 재계산이
> RAF 콜백보다 먼저 실행되면 **SpatialIndex가 이전 프레임 bounds를 반환**한다.
>
> **대책 (택 1):**
> 1. **VIEWPORT_MARGIN 확장:** 100px → 200px로 늘려 1프레임 지연을 시각적으로 흡수
> 2. **동기 갱신 경로:** 레이아웃 엔진이 bounds를 계산한 직후 SpatialIndex.upsert()를
>    동기적으로 호출하는 별도 경로 추가 (RAF 의존 제거)
> 3. **batch_upsert 타이밍:** PixiJS 렌더 루프(`Application.ticker`) 시작 시점에
>    변경된 요소들을 일괄 갱신하여 쿼리 전에 인덱스 최신화 보장

### 1.5 Phase 1 산출물

- [ ] `spatial_index.rs` 구현 (i64 키 인코딩, 내부 bounds 캐시 포함)
- [ ] `idMapper.ts` 구현 (string ↔ u32 양방향 매핑)
- [ ] `spatialIndex.ts` TypeScript 바인딩
- [ ] `elementRegistry.ts` 수정 (SpatialIndex 동기화 + RAF 타이밍 대책)
- [ ] `useViewportCulling.ts` 수정 (SpatialIndex 쿼리)
- [ ] `SelectionLayer.utils.ts` 수정 (라쏘 선택에 SpatialIndex `query_rect` 적용)
- [ ] 단위 테스트: Rust `wasm-pack test` (삽입, 삭제, 쿼리, query_rect, 엣지 케이스)
- [ ] 통합 테스트: 1,000개 요소 뷰포트 쿼리 벤치마크
- [ ] Feature Flag (`VITE_WASM_SPATIAL`)로 A/B 비교
- [ ] 페이지별 SpatialIndex 범위 관리 (페이지 전환 시 clearAll + 현재 페이지 batch_upsert)
- [ ] 배치 인덱스 리빌드 최적화 (suspendIndexRebuild/resumeAndRebuildIndexes 패턴)

### 1.6 성능 검증 대상

> 아래 수치는 Phase 0 벤치마크에서 실측 후 업데이트한다.

| 지표 | 현재 (추정) | 목표 | 검증 방법 |
|------|-----------|------|----------|
| Viewport Culling (1,000개) | 측정 필요 | O(n) → O(k) (k=뷰포트 내 요소) | performance.measure |
| 라쏘 선택 (1,000개) | 측정 필요 | O(n) → O(k) (query_rect) | performance.measure |
| SpatialIndex 메모리 오버헤드 | - | < 5MB (5,000개 기준) | Chrome DevTools |

---

## Phase 2: Layout Engine 배치 가속

> 목표: BlockEngine, GridEngine의 **전체 레이아웃 루프**를 WASM으로 이전
> 원칙: 개별 함수(collapseMargins, createsBFC)의 WASM 위임은 하지 않는다.
>        JS→WASM 경계 넘기는 배치 단위(1회/레이아웃)로만 수행한다.

### 2.1 문제 정의

**BlockEngine 핫 패스 (`BlockEngine.ts`):**
- 194-358행: 메인 레이아웃 루프 (164줄, margin collapse + inline-block 분기)
- 387-436행: LineBox baseline 계산 (수학 연산 집약)

> `collapseMargins()` (648행)은 단순 조건 분기(if/else 3분기)라 개별 WASM 위임 시
> 경계 넘기 오버헤드(~0.1-1μs/call)가 연산 비용을 초과한다.
> 따라서 `calculate()` 전체 루프를 WASM에서 일괄 수행하여 경계를 1회만 넘긴다.

**GridEngine 핫 패스 (`GridEngine.ts`):**
- 36-44행: Grid Template 파싱
- 60-70행: 셀 바운딩 계산

### 2.2 WASM 모듈 설계

**Block Layout (`block_layout.rs`):**
```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ElementStyle {
    pub display: u8,          // 0=block, 1=inline-block, 2=flex, 3=grid, 4=none
    pub width: f32,
    pub height: f32,
    pub margin_top: f32,
    pub margin_right: f32,
    pub margin_bottom: f32,
    pub margin_left: f32,
    pub padding_top: f32,
    pub padding_right: f32,
    pub padding_bottom: f32,
    pub padding_left: f32,
    pub border_width: f32,
    pub position: u8,         // 0=static, 1=relative, 2=absolute, 3=fixed
    pub overflow: u8,         // 0=visible, 1=hidden, 2=scroll, 3=auto
    pub float_type: u8,       // 0=none, 1=left, 2=right (xstudio 미지원 — CSS 명세 완전성을 위해 유지, 항상 0)
    pub vertical_align: u8,   // 0=baseline, 1=top, 2=middle, 3=bottom
}

#[derive(Serialize, Deserialize)]
pub struct ComputedLayout {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[wasm_bindgen]
pub struct BlockLayoutEngine {
    // 내부 상태
}

#[wasm_bindgen]
impl BlockLayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> BlockLayoutEngine {
        BlockLayoutEngine {}
    }

    /// Margin Collapse 계산
    /// CSS 2.1 §8.3.1 규칙 구현
    pub fn collapse_margins(&self, margin_a: f32, margin_b: f32) -> f32 {
        if margin_a >= 0.0 && margin_b >= 0.0 {
            margin_a.max(margin_b)
        } else if margin_a < 0.0 && margin_b < 0.0 {
            margin_a.min(margin_b)  // 더 큰 음수
        } else {
            margin_a + margin_b
        }
    }

    /// BFC (Block Formatting Context) 생성 여부 판별
    ///
    /// ※ 이 함수는 외부 API로 노출하지만, 실제 레이아웃 경로에서는
    ///   JS 측 `serializeChildren()`이 `createsBFC()` 결과를 `bfc_flag`로 사전 계산하여
    ///   `calculate()`의 children_data에 포함시킨다.
    ///   따라서 이 외부 API는 디버깅/테스트 용도이며,
    ///   핫 패스에서는 `serde_wasm_bindgen::from_value()` 디시리얼라이즈 오버헤드를 피한다.
    pub fn creates_bfc(&self, style: &JsValue) -> bool {
        let s: ElementStyle = serde_wasm_bindgen::from_value(style.clone()).unwrap();
        matches!(s.display, 2 | 3) ||         // flex, grid
        s.display == 1 ||                       // inline-block
        !matches!(s.overflow, 0) ||             // overflow != visible
        matches!(s.float_type, 1 | 2) ||        // float left/right
        matches!(s.position, 2 | 3)             // absolute, fixed
    }

    /// LineBox 계산 (inline-block 요소들의 baseline 정렬)
    pub fn calculate_line_box(
        &self,
        items_data: &[f32],  // [height, margin_top, margin_bottom, baseline, vertical_align, ...]
    ) -> Box<[f32]> {
        // items_data: 5개씩 묶음
        let item_count = items_data.len() / 5;
        let mut max_total_height: f32 = 0.0;
        let mut max_baseline_from_top: f32 = 0.0;
        let mut max_below_baseline: f32 = 0.0;

        for i in 0..item_count {
            let offset = i * 5;
            let height = items_data[offset];
            let margin_top = items_data[offset + 1];
            let margin_bottom = items_data[offset + 2];
            let baseline = items_data[offset + 3];
            let v_align = items_data[offset + 4] as u8;

            let total_height = height + margin_top + margin_bottom;
            max_total_height = max_total_height.max(total_height);

            if v_align == 0 {
                // baseline alignment
                let baseline_from_top = margin_top + baseline;
                let below = total_height - baseline_from_top;
                max_baseline_from_top = max_baseline_from_top.max(baseline_from_top);
                max_below_baseline = max_below_baseline.max(below);
            }
        }

        let line_height = max_baseline_from_top + max_below_baseline;
        let final_height = max_total_height.max(line_height);

        // [lineHeight, baselineFromTop]
        vec![final_height, max_baseline_from_top].into_boxed_slice()
    }

    /// **정규화된** 블록 자식의 배치 계산 (단순 수직 스태킹 + margin collapse)
    ///
    /// **WASM 범위:** 이 함수는 JS 측에서 전처리가 완료된 "정규화된 블록 흐름" 자식만 받는다.
    /// **JS 측 전처리 책임 (WASM에 넘기기 전):**
    ///   1. out-of-flow 요소 (absolute/fixed) 제외
    ///   2. display:none 제외
    ///   3. inline-block 요소는 LineBox로 그룹화하여 단일 블록으로 변환
    ///   4. CSS Blockification (flex/grid 자식의 inline → block)
    ///   5. BFC 경계 판별 — BFC를 생성하는 자식은 margin collapse를 차단
    ///
    ///   ※ float는 xstudio 노코드 빌더에서 지원하지 않으므로 전처리 범위에서 제외.
    ///
    /// 즉, WASM calculate()는 "이미 정규화된 block-level 박스의 수직 배치"만 수행하며,
    /// 복잡한 CSS 분기 로직은 JS BlockEngine.ts에 그대로 유지된다.
    ///
    /// children_data: 전처리된 평탄화 배열 [display, width, height, m_t, m_r, m_b, m_l, bfc_flag, ...]
    ///   bfc_flag: 0=collapse 허용, 1=BFC 경계(collapse 차단)
    /// 반환: [x, y, w, h, x, y, w, h, ...] 계산된 위치
    pub fn calculate(
        &self,
        available_width: f32,
        available_height: f32,
        children_data: &[f32],
        field_count: u32,
    ) -> Box<[f32]> {
        let fc = field_count as usize;
        let child_count = children_data.len() / fc;
        let mut layouts = Vec::with_capacity(child_count * 4);
        let mut current_y: f32 = 0.0;
        let mut prev_margin_bottom: f32 = 0.0;

        for i in 0..child_count {
            let offset = i * fc;
            let _display = children_data[offset] as u8;
            let child_width = children_data[offset + 1];
            let child_height = children_data[offset + 2];
            let margin_top = children_data[offset + 3];
            let margin_right = children_data[offset + 4];
            let margin_bottom = children_data[offset + 5];
            let margin_left = children_data[offset + 6];
            let bfc_flag = if fc > 7 { children_data[offset + 7] as u8 } else { 0 };

            // Margin collapse (BFC 경계에서는 차단)
            let effective_top = if bfc_flag == 1 {
                // BFC 자식: collapse 하지 않음 — 이전 마진 + 현재 마진 모두 적용
                prev_margin_bottom + margin_top
            } else {
                self.collapse_margins(prev_margin_bottom, margin_top)
            };
            current_y += effective_top;

            // Width: auto(≤0) → available_width - margin_left - margin_right (CSS 2.1 §10.3.3)
            let final_width = if child_width <= 0.0 {
                (available_width - margin_left - margin_right).max(0.0)
            } else {
                child_width
            };

            layouts.push(margin_left);              // x
            layouts.push(current_y);                // y
            layouts.push(final_width);              // width
            layouts.push(child_height);             // height

            current_y += child_height;
            prev_margin_bottom = margin_bottom;
        }

        layouts.into_boxed_slice()
    }
}
```

> **⚠️ Float32 정밀도:**
> Rust `f32`는 IEEE 754 single precision (유효 숫자 ~7자리).
> JS의 `number`(Float64, ~15자리)와 미세한 차이가 누적될 수 있다.
> - `current_y`가 수백 요소를 거치면서 f32 반올림이 누적 → 최대 ~0.5px 오차
> - JS 폴백과의 출력 비교 테스트에서 false negative 발생 가능
>
> **대책:**
> 1. 통합 테스트에서 epsilon 허용 범위 적용: `|js_y - wasm_y| < 0.5px`
> 2. 정밀도가 중요한 경우 `f64`로 전환 가능 (WASM에서 f64는 f32 대비 ~10% 느림, 허용 범위)
> 3. `children_data`를 `&[f64]`로 변경 시 마샬링은 `Float64Array` 사용

**Grid Layout (`grid_layout.rs`):**
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GridLayoutEngine {}

#[wasm_bindgen]
impl GridLayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GridLayoutEngine {
        GridLayoutEngine {}
    }

    /// Grid Template 트랙 크기 계산
    /// template: "1fr 2fr 200px" 형태의 문자열 (auto 지원)
    /// available: 사용 가능한 공간 (px)
    pub fn parse_tracks(&self, template: &str, available: f32, gap: f32) -> Box<[f32]> {
        // "auto"만 전달된 경우 → 단일 트랙(전체 공간) 반환
        let trimmed = template.trim();
        if trimmed == "auto" || trimmed.is_empty() {
            return vec![available].into_boxed_slice();
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        let track_count = parts.len();
        let total_gap = gap * (track_count as f32 - 1.0).max(0.0);
        let remaining = available - total_gap;

        let mut fixed_total: f32 = 0.0;
        let mut fr_total: f32 = 0.0;
        let mut tracks: Vec<(bool, f32)> = Vec::new(); // (is_fr, value)

        for part in &parts {
            if *part == "auto" {
                // auto는 1fr와 동일하게 처리 (남은 공간을 균등 분배)
                fr_total += 1.0;
                tracks.push((true, 1.0));
            } else if part.ends_with("fr") {
                let fr: f32 = part.trim_end_matches("fr").parse().unwrap_or(1.0);
                fr_total += fr;
                tracks.push((true, fr));
            } else if part.ends_with("px") {
                let px: f32 = part.trim_end_matches("px").parse().unwrap_or(0.0);
                fixed_total += px;
                tracks.push((false, px));
            } else if part.ends_with('%') {
                let pct: f32 = part.trim_end_matches('%').parse().unwrap_or(0.0);
                let px = available * pct / 100.0;
                fixed_total += px;
                tracks.push((false, px));
            } else if let Ok(px) = part.parse::<f32>() {
                fixed_total += px;
                tracks.push((false, px));
            }
        }

        let fr_space = (remaining - fixed_total).max(0.0);
        let fr_unit = if fr_total > 0.0 { fr_space / fr_total } else { 0.0 };

        tracks.iter()
            .map(|(is_fr, val)| if *is_fr { val * fr_unit } else { *val })
            .collect::<Vec<f32>>()
            .into_boxed_slice()
    }

    /// Grid 셀 위치 계산
    /// tracks_x, tracks_y: 각 트랙의 크기 배열
    /// 반환: [x, y, w, h, ...] 각 셀의 위치
    pub fn calculate_cell_positions(
        &self,
        tracks_x: &[f32],
        tracks_y: &[f32],
        col_gap: f32,
        row_gap: f32,
        child_count: u32,
    ) -> Box<[f32]> {
        let cols = tracks_x.len();
        let mut result = Vec::with_capacity(child_count as usize * 4);

        for i in 0..child_count as usize {
            let col = i % cols;
            let row = i / cols;

            let x: f32 = tracks_x[..col].iter().sum::<f32>() + col as f32 * col_gap;
            let y: f32 = if row < tracks_y.len() {
                tracks_y[..row].iter().sum::<f32>() + row as f32 * row_gap
            } else {
                0.0
            };
            let w = if col < tracks_x.len() { tracks_x[col] } else { 0.0 };
            let h = if row < tracks_y.len() { tracks_y[row] } else { 0.0 };

            result.push(x);
            result.push(y);
            result.push(w);
            result.push(h);
        }

        result.into_boxed_slice()
    }
}
```

### 2.3 TypeScript 바인딩

**`wasm-bindings/layoutAccelerator.ts`:**
```typescript
import init, { BlockLayoutEngine, GridLayoutEngine } from './pkg/xstudio_wasm';
import { WASM_FLAGS } from './featureFlags';

let blockEngine: BlockLayoutEngine | null = null;
let gridEngine: GridLayoutEngine | null = null;

export async function initLayoutWasm(): Promise<void> {
  if (!WASM_FLAGS.LAYOUT_ENGINE) return;
  await init(); // WASM 바이너리 로드 (SPATIAL=false일 때도 독립 초기화 보장)
  blockEngine = new BlockLayoutEngine();
  gridEngine = new GridLayoutEngine();
}

// --- Block Layout ---

export function wasmCollapseMargins(a: number, b: number): number {
  if (!blockEngine) {
    // JS 폴백 — CSS 2.1 §8.3.1 margin collapse 규칙 준수
    if (a >= 0 && b >= 0) return Math.max(a, b);
    if (a < 0 && b < 0) return Math.min(a, b);
    return a + b;
  }
  return blockEngine.collapse_margins(a, b);
}

export function wasmCalculateLineBox(
  items: { height: number; marginTop: number; marginBottom: number; baseline: number; verticalAlign: number }[]
): { lineHeight: number; baselineFromTop: number } {
  if (!blockEngine) throw new Error('WASM not initialized');

  const data = new Float32Array(items.length * 5);
  items.forEach((item, i) => {
    const o = i * 5;
    data[o] = item.height;
    data[o + 1] = item.marginTop;
    data[o + 2] = item.marginBottom;
    data[o + 3] = item.baseline;
    data[o + 4] = item.verticalAlign;
  });

  const result = blockEngine.calculate_line_box(data);
  return { lineHeight: result[0], baselineFromTop: result[1] };
}

export function wasmBlockLayout(
  availableWidth: number,
  availableHeight: number,
  children: Float32Array,
  fieldCount: number,
): Float32Array {
  if (!blockEngine) throw new Error('WASM not initialized');
  return new Float32Array(blockEngine.calculate(availableWidth, availableHeight, children, fieldCount));
}

// --- Grid Layout ---

export function wasmParseTracks(template: string, available: number, gap: number): Float32Array {
  if (!gridEngine) throw new Error('WASM not initialized');
  return new Float32Array(gridEngine.parse_tracks(template, available, gap));
}

export function wasmGridCellPositions(
  tracksX: Float32Array,
  tracksY: Float32Array,
  colGap: number,
  rowGap: number,
  childCount: number,
): Float32Array {
  if (!gridEngine) throw new Error('WASM not initialized');
  return new Float32Array(gridEngine.calculate_cell_positions(tracksX, tracksY, colGap, rowGap, childCount));
}
```

### 2.4 기존 코드 통합 지점

> **원칙:** `collapseMargins()`, `createsBFC()` 등 개별 함수는 JS에 유지한다.
> WASM 경계는 `calculate()` 진입점에서 1회만 넘기고, 내부에서 모든 연산을 일괄 수행한다.

**`BlockEngine.ts` 수정 (calculate 메서드만):**
```typescript
import { WASM_FLAGS } from '../../wasm-bindings/featureFlags';
import { wasmBlockLayout } from '../../wasm-bindings/layoutAccelerator';

// calculate() 또는 calculateWithMarginInfo() 진입점에서 배치 위임
calculate(parent, children, availableWidth, availableHeight, context?): ComputedLayout[] {
  if (WASM_FLAGS.LAYOUT_ENGINE && children.length > 10) {
    // 요소 10개 이하에서는 JS가 더 빠름 (경계 넘기 + 마샬링 비용)

    // ★ JS 전처리: WASM에 넘기기 전에 복잡한 CSS 분기를 처리한다.
    //   1. out-of-flow (absolute/fixed) 요소 분리 → JS에서 별도 배치
    //   2. display:none 제외
    //   3. inline-block 요소 → LineBox로 그룹화 (JS calculateLineBox 유지)
    //   4. CSS Blockification 적용
    //   5. BFC 경계 판별 → bfc_flag로 WASM에 전달
    const { normalizedChildren, outOfFlowLayouts, lineBoxLayouts } = this.preprocess(children, parent);

    const childrenData = this.serializeChildren(normalizedChildren);
    const result = wasmBlockLayout(availableWidth, availableHeight, childrenData, 8); // 8 fields
    const blockLayouts = this.deserializeLayouts(normalizedChildren, result);

    // ★ synthetic LineBox의 y좌표를 개별 inline-block 요소에 전파
    const resolvedLineBoxLayouts = this.resolveLineBoxPositions(blockLayouts, lineBoxLayouts);

    // out-of-flow + inline LineBox(위치 확정) + block 레이아웃 병합
    // synthetic LineBox 자체는 최종 결과에서 제거 (실제 렌더 대상 아님)
    const realBlockLayouts = blockLayouts.filter(l => !l.elementId.startsWith('__linebox_'));
    return [...realBlockLayouts, ...outOfFlowLayouts, ...resolvedLineBoxLayouts];
  }
  // 기존 JS 로직 유지 (폴백)
  // ...
}

// JS 전처리: 복잡한 CSS 분기를 처리하고 정규화된 블록 레벨 자식만 반환
// WASM calculate()는 "모든 자식이 블록 레벨"인 정규화된 입력만 처리한다.
// 따라서 아래 5가지 책임을 모두 이 단계에서 해결해야 한다.
// (float는 xstudio에서 미지원이므로 전처리 범위 밖)
private preprocess(children: Element[], parent: Element): {
  normalizedChildren: Element[];
  outOfFlowLayouts: ComputedLayout[];
  lineBoxLayouts: ComputedLayout[];
} {
  const normalizedChildren: Element[] = [];
  const outOfFlowLayouts: ComputedLayout[] = [];
  const inlineBuffer: Element[] = []; // inline-block 연속 요소 누적용
  const lineBoxLayouts: ComputedLayout[] = [];

  for (const child of children) {
    const style = child.props?.style;

    // 1. out-of-flow (absolute/fixed) → JS에서 별도 배치, WASM 입력에서 제외
    if (style?.position === 'absolute' || style?.position === 'fixed') {
      this.flushInlineBuffer(inlineBuffer, normalizedChildren, lineBoxLayouts, parent);
      outOfFlowLayouts.push(this.computeOutOfFlowLayout(child, parent));
      continue;
    }

    // 2. display:none → 제외
    if (style?.display === 'none') continue;

    // 3. inline-block 요소 → LineBox로 그룹화 (기존 JS calculateLineBox 유지)
    //    연속된 inline-block 요소를 버퍼에 모아, 블록 레벨 요소를 만나면 flush
    if (this.isInlineLevel(child)) {
      inlineBuffer.push(child);
      continue;
    }

    // 블록 레벨 요소를 만났으므로 누적된 inline 버퍼를 LineBox로 변환
    this.flushInlineBuffer(inlineBuffer, normalizedChildren, lineBoxLayouts, parent);

    // 4. CSS Blockification: flex/grid 컨테이너의 자식 중
    //    inline 레벨이 블록으로 승격되는 경우 (§9.7)
    //    → 이미 isInlineLevel 분기에서 걸러졌으므로, 여기 도달한 요소는 블록 레벨
    const blockified = this.applyBlockification(child, parent);

    // 5. BFC 경계 판별 → serializeChildren에서 bfc_flag로 WASM에 전달
    //    (createsBFC 결과는 serializeChildren 단계에서 읽음)
    normalizedChildren.push(blockified);
  }

  // 마지막 inline 버퍼 flush
  this.flushInlineBuffer(inlineBuffer, normalizedChildren, lineBoxLayouts, parent);

  return { normalizedChildren, outOfFlowLayouts, lineBoxLayouts };
}

// inline-block 버퍼를 LineBox로 변환하고, synthetic 블록 요소를 normalizedChildren에 삽입
// ★ LineBox가 차지하는 수직 공간을 WASM calculate()에 반영하기 위해
//   normalizedChildren에 synthetic 블록 요소를 추가한다.
//   이렇게 하지 않으면 inline-block 요소 뒤의 블록 요소 y좌표가 잘못 계산된다.
//
// 예시: [blockA, inlineB, inlineC, blockD]
//   → normalizedChildren = [A, syntheticLineBox(height=30), D]
//   → WASM 결과: A@y=0, syntheticLineBox@y=50, D@y=80+margin (올바른 흐름)
//   → syntheticLineBox의 y좌표를 lineBoxLayouts의 개별 요소에 전파
private flushInlineBuffer(
  buffer: Element[],
  normalizedChildren: Element[],
  lineBoxLayouts: ComputedLayout[],
  parent: Element
): void {
  if (buffer.length === 0) return;

  // 1. LineBox 내부 배치 계산 (기존 JS calculateLineBox — baseline 정렬 포함)
  const lineBoxResult = this.calculateLineBox(buffer, parent);

  // 2. Synthetic 블록 요소 생성 — WASM이 수직 공간을 할당하도록
  //    LineBox는 margin collapse에 참여하지 않으므로 margin=0으로 설정
  const syntheticId = `__linebox_${normalizedChildren.length}`;
  const syntheticLineBox: Element = {
    id: syntheticId,
    type: '__synthetic_linebox',
    props: { style: {
      display: 'block',
      width: '100%',
      height: `${lineBoxResult.lineHeight}px`,
    }},
  };
  normalizedChildren.push(syntheticLineBox);

  // 3. lineBoxLayouts에 저장 (y좌표는 WASM 결과에서 역전파)
  //    각 inline-block 요소의 lineBox 내부 상대 위치 + syntheticId를 기록
  lineBoxLayouts.push({
    syntheticId,
    elements: lineBoxResult.elements, // 개별 요소의 lineBox 내부 상대 좌표
  });

  buffer.length = 0;
}

// 데이터 마샬링 헬퍼:
private serializeChildren(children: Element[]): Float32Array {
  const FIELDS = 8; // display, width, height, m_top, m_right, m_bottom, m_left, bfc_flag
  const data = new Float32Array(children.length * FIELDS);
  children.forEach((child, i) => {
    const style = child.props?.style;
    const boxModel = this.computeBoxModel(child);
    const offset = i * FIELDS;
    data[offset] = displayToNum(style?.display);
    data[offset + 1] = boxModel.width ?? -1;  // -1 = auto
    data[offset + 2] = boxModel.height ?? 0;
    data[offset + 3] = boxModel.margin.top;
    data[offset + 4] = boxModel.margin.right;
    data[offset + 5] = boxModel.margin.bottom;
    data[offset + 6] = boxModel.margin.left;
    data[offset + 7] = this.createsBFC(style) ? 1 : 0; // BFC 경계 플래그
  });
  return data;
}

private deserializeLayouts(children: Element[], result: Float32Array): ComputedLayout[] {
  return children.map((child, i) => ({
    elementId: child.id,
    x: result[i * 4],
    y: result[i * 4 + 1],
    width: result[i * 4 + 2],
    height: result[i * 4 + 3],
  }));
}

// ★ synthetic LineBox의 WASM 계산 결과(y좌표)를 개별 inline-block 요소에 전파
private resolveLineBoxPositions(
  blockLayouts: ComputedLayout[],
  lineBoxGroups: { syntheticId: string; elements: ComputedLayout[] }[],
): ComputedLayout[] {
  const resolved: ComputedLayout[] = [];

  for (const group of lineBoxGroups) {
    // synthetic 블록 요소의 WASM 결과에서 y좌표 추출
    const syntheticLayout = blockLayouts.find(l => l.elementId === group.syntheticId);
    if (!syntheticLayout) continue;

    // 각 inline-block 요소의 lineBox 내부 상대 좌표에 synthetic y를 더함
    for (const el of group.elements) {
      resolved.push({
        elementId: el.elementId,
        x: syntheticLayout.x + el.x,       // lineBox x + 내부 x offset
        y: syntheticLayout.y + el.y,        // lineBox y + 내부 baseline 정렬 y offset
        width: el.width,
        height: el.height,
      });
    }
  }

  return resolved;
}
```

**`GridEngine.ts` 수정 (배치 계산):**
```typescript
import { WASM_FLAGS } from '../../wasm-bindings/featureFlags';
import { wasmParseTracks, wasmGridCellPositions } from '../../wasm-bindings/layoutAccelerator';

calculate(parent, children, availableWidth, availableHeight): ComputedLayout[] {
  const style = parent.props?.style;

  if (WASM_FLAGS.LAYOUT_ENGINE && style?.gridTemplateColumns) {
    const columnTracks = wasmParseTracks(
      style.gridTemplateColumns, availableWidth, parseGap(style.columnGap) ?? 0
    );
    const rowTracks = wasmParseTracks(
      style.gridTemplateRows ?? 'auto', availableHeight, parseGap(style.rowGap) ?? 0
    );
    const positions = wasmGridCellPositions(
      columnTracks, rowTracks,
      parseGap(style.columnGap) ?? 0,
      parseGap(style.rowGap) ?? 0,
      children.length
    );

    return children.map((child, i) => ({
      elementId: child.id,
      x: positions[i * 4],
      y: positions[i * 4 + 1],
      width: positions[i * 4 + 2],
      height: positions[i * 4 + 3],
    }));
  }

  // 기존 JS 로직 유지 (폴백)
  // ...
}
```

### 2.5 Phase 2 산출물

- [ ] `block_layout.rs` 구현 (전체 레이아웃 루프, margin collapse 내장)
- [ ] `grid_layout.rs` 구현 (트랙 파싱, 셀 위치 계산)
- [ ] `layoutAccelerator.ts` TypeScript 바인딩 (배치 API만 노출)
- [ ] `BlockEngine.ts` — `calculate()` 진입점에 WASM 배치 위임 추가
- [ ] `GridEngine.ts` — `calculate()` 진입점에 WASM 배치 위임 추가
- [ ] 데이터 마샬링 헬퍼 (`serialize/deserialize`) 구현
- [ ] 최소 요소 수 임계값 결정 (마샬링 비용 > WASM 이득인 경계점)
- [ ] 단위 테스트: margin collapse, LineBox, BFC 엣지 케이스
- [ ] 통합 테스트: JS vs WASM 레이아웃 출력 일치 검증 (아래 edge case 필수 포함)
  - [ ] inline-block 요소 판별 (input, button, img, span, a 등 — `BlockEngine.ts:48-71`)
  - [ ] CSS Blockification (flex/grid 자식의 inline → block 변환 — `BlockEngine.ts:483-512`)
  - [ ] BFC(Block Formatting Context) 생성 조건 — `BlockEngine.ts:526-568`
  - [ ] out-of-flow 요소 제외 (absolute/fixed — `BlockEngine.ts:493-497`)
  - [ ] vertical-align 4종 (baseline/top/bottom/middle — `BlockEngine.ts:445-467`)
  - [ ] margin collapse 중첩: 부모-자식, 형제 간, 빈 블록 — `BlockEngine.ts:273-355`
  - [ ] Float32 정밀도 테스트: 100+ 요소 수직 스태킹에서 JS(f64) vs WASM(f32) 누적 오차 < 0.5px
- [ ] 벤치마크: 요소 수별(10, 50, 100, 500) 레이아웃 재계산 시간 비교
- [ ] CSS 파싱 결과 캐싱 (preprocess/serializeChildren에서 반복 파싱 방지 — WeakMap 기반)

### 2.6 성능 검증 대상

> 아래 수치는 Phase 0 벤치마크에서 실측 후 업데이트한다.

| 지표 | 현재 (추정) | 검증 포인트 |
|------|-----------|------------|
| Block 레이아웃 (100개 자식) | 측정 필요 | WASM 배치가 JS보다 빠른 최소 요소 수 |
| Grid 셀 계산 (3×10) | 측정 필요 | 트랙 파싱 + 셀 위치 일괄 계산 |
| 마샬링 오버헤드 | 측정 필요 | Float32Array 변환 비용 vs WASM 이득 |

> **주의:** `collapseMargins()` 같은 단일 호출(~0.005ms)의 개별 WASM 위임은
> 경계 넘기 오버헤드(~0.1μs)가 연산 비용과 비슷하여 이점이 없다.

---

## ~~Phase 3: Text Engine + CSS Parser~~ → 제거 (후순위)

> **원래 제안:** `docs/PENCIL_APP_ANALYSIS.md` §13.5에서 "Phase 3: 텍스트 메트릭 WASM 모듈 (fontkit-wasm 또는 커스텀 구축)"로 제안됨.
> **제거 사유:** 성능 병목 분석(본 문서 §성능 병목 분석) 결과, 대상 연산이 WASM 최적화에 부적합하다.
>
> 1. **텍스트 데코레이션** (`TextSprite.tsx:139-160`): 곱셈 1회 + 직선 그리기.
>    WASM 경계 넘기 비용이 연산 비용을 초과한다.
> 2. **CSS 값 파싱** (`styleToLayout.ts:100-120`): `parseFloat()` + `endsWith()`.
>    V8 JIT가 이미 최적화하며, WASM 문자열 마샬링 비용이 이득을 상쇄한다.
> 3. **텍스트 측정** (`textRef.getBounds()`): 브라우저 Canvas API 의존.
>    WASM으로 대체 불가. 텍스트 성능이 병목이면 **PixiJS BitmapText** 전환이 효과적이다.
>
> Phase 0 벤치마크에서 텍스트/CSS 파싱이 예상 외로 병목으로 나타나면 재검토한다.

### 3.1 (참고용) 원래 문제 정의

**TextSprite.tsx 핫 패스:**
- 129행: `textRef.current.getBounds()` — 매 렌더마다 텍스트 바운딩 재계산
- 56-67행: `parseTextDecoration()` — 문자열 파싱 반복
- 122-163행: `drawTextDecoration()` — 데코레이션 라인 좌표 계산

**styleToLayout.ts 핫 패스:**
- `parseCSSValue()` — 요소별 반복 호출
- `parseFlexShorthand()` — flex 축약형 파싱
- `styleToLayout()` — Flexbox 레이아웃 변환 (약 140줄)

### 3.2 대안: WASM 대신 권장하는 최적화

| 병목 | WASM 대신 권장 방법 | 이유 |
|------|-------------------|------|
| 텍스트 렌더링 | PixiJS BitmapText 전환 | 래스터 기반, GPU 텍스처 캐시 활용 |
| CSS 파싱 반복 | 결과 메모이제이션 (JS Map 캐시) | 동일 스타일 반복 파싱 방지 |
| 데코레이션 계산 | 결과 캐싱 (fontSize+textHeight 키) | 변경 시에만 재계산 |
| createsBFC contain 파싱 | bitmask 사전 변환 | `contain.split(/\s+/)` 정규식+배열 할당 제거 |

> Phase 3의 Rust/TS 구현 코드와 통합 코드는 제거됨 (WASM 부적합 판정).
> Phase 0 벤치마크에서 이 영역이 병목으로 확인되면 위 대안 표의 JS 최적화를 먼저 적용한다.

> **⚠️ Phase 2 사전 조건:** CSS 파싱 캐싱은 Phase 2 `preprocess()` + `serializeChildren()`의
> 성능에 직접 영향을 준다. 현재 `parseCSSValue()`, `parseBoxModel()`, `createsBFC()`가
> 매 자식마다 호출되어 동일 스타일을 반복 파싱한다.
> Phase 2 착수 전에 최소한 `WeakMap<CSSStyleObject, ParsedResult>` 기반 캐싱을 적용해야
> WASM 경계 넘기 전 JS 측 병목을 제거할 수 있다.

---

## Phase 4: Web Worker 통합 및 최종 최적화

> 목표: 무거운 WASM 연산을 메인 스레드에서 분리
> 핵심 과제: **비동기 레이아웃 결과의 동기 렌더링 파이프라인 통합**
> **제약:** SharedArrayBuffer 사용 불가 — xstudio는 Supabase 인증 호환을 위해 Vite 설정에서 COOP/COEP 헤더를 제거하고 있으며, SharedArrayBuffer는 이 헤더가 필수이다 (`docs/PENCIL_VS_XSTUDIO_RENDERING.md` §3.2 참조). Worker 통신은 `postMessage` + `Transferable` (ArrayBuffer transfer)로 한정한다.

### 4.1 Worker 아키텍처

```
┌─────────────────────────────────────────────┐
│              Main Thread                     │
│  React + PixiJS + 사용자 인터랙션            │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │ WASM (동기 호출 - 경량 연산)     │        │
│  │ - hitTestPoint (< 0.1ms)        │        │
│  │ - queryViewport (< 0.5ms)       │        │
│  └─────────────────────────────────┘        │
│           ↕ postMessage                      │
│  ┌─────────────────────────────────┐        │
│  │ Web Worker (비동기 - 중량 연산)  │        │
│  │ - calculateBlockLayout          │        │
│  │ - calculateGridLayout           │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### 4.1.1 비동기 동기화 전략 (Stale-While-Revalidate)

레이아웃을 Worker에서 비동기 계산하면, PixiJS 렌더 루프에 동기적으로
레이아웃 위치를 공급해야 하는 문제가 발생한다.

**전략:**
```
1. 초기 레이아웃: 메인 스레드에서 동기적으로 계산 (첫 렌더 보장)
2. 변경 감지: 요소 추가/삭제/속성 변경 시 Worker에 비동기 재계산 요청
3. 이전 레이아웃 유지: Worker 결과가 도착할 때까지 마지막 유효 레이아웃 사용
4. 결과 적용: Worker 결과 도착 시 requestAnimationFrame에서 레이아웃 교체
5. 레이아웃 점프 방지: 변경이 작으면 transition 적용, 크면 즉시 교체
```

**구현 패턴:**
```typescript
class LayoutScheduler {
  private lastValidLayout = new Map<string, ComputedLayout>();
  private pendingRequest: number | null = null;

  requestLayout(parent: Element, children: Element[], width: number, height: number): void {
    // 이전 요청 취소 (debounce)
    if (this.pendingRequest !== null) {
      cancelAnimationFrame(this.pendingRequest);
    }

    // Worker에 비동기 요청
    wasmBridge.calculateBlockLayout(parent, children, width, height)
      .then(({ layouts, outOfFlowLayouts, lineBoxLayouts }) => {
        // RAF에서 적용 (렌더 타이밍에 맞춤)
        this.pendingRequest = requestAnimationFrame(() => {
          this.applyLayout(layouts, outOfFlowLayouts, lineBoxLayouts);
          this.pendingRequest = null;
        });
      });
  }

  // 현재 유효한 레이아웃 반환 (동기)
  getLayout(elementId: string): ComputedLayout | null {
    return this.lastValidLayout.get(elementId) ?? null;
  }

  // ★ preprocess 3그룹(block + outOfFlow + lineBox)을 모두 처리
  //   Worker가 preprocess()를 수행하고 3그룹을 모두 반환하므로,
  //   이 메서드는 각 그룹의 레이아웃을 적용한다.
  private applyLayout(
    blockLayouts: ComputedLayout[],
    outOfFlowLayouts: ComputedLayout[],
    lineBoxLayouts: ComputedLayout[],
  ): void {
    const allLayouts = [...blockLayouts, ...outOfFlowLayouts, ...lineBoxLayouts];
    allLayouts.forEach(layout => {
      this.lastValidLayout.set(layout.elementId, layout);
      // 메인 스레드 SpatialIndex 갱신 (4.7절: 인덱스는 메인 스레드에만 존재)
      updateElement(layout.elementId, layout.x, layout.y, layout.width, layout.height);
    });
    // renderVersion 증가 → React 리렌더 트리거
  }
}
```

### 4.2 Worker 메시지 프로토콜

```typescript
// wasm-worker/protocol.ts

type WorkerRequest =
  | { type: 'CALCULATE_BLOCK_LAYOUT'; parent: SerializedElement; children: SerializedElement[]; width: number; height: number }
  | { type: 'CALCULATE_GRID_LAYOUT'; parent: SerializedElement; children: SerializedElement[]; width: number; height: number };

type WorkerResponse =
  | { type: 'BLOCK_LAYOUT_RESULT'; layouts: Float32Array; outOfFlowLayouts: ComputedLayout[]; lineBoxLayouts: ComputedLayout[] }
  | { type: 'GRID_LAYOUT_RESULT'; layouts: Float32Array };
```

### 4.3 Worker 구현

```typescript
// wasm-worker/layoutWorker.ts

import init, { BlockLayoutEngine, GridLayoutEngine } from '../wasm-bindings/pkg/xstudio_wasm';
// SpatialIndex는 메인 스레드 전용 — Worker에서는 사용하지 않음 (4.7절 참조)

let blockEngine: BlockLayoutEngine;
let gridEngine: GridLayoutEngine;

async function initialize() {
  await init();
  blockEngine = new BlockLayoutEngine();
  gridEngine = new GridLayoutEngine();
}

const initPromise = initialize();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  await initPromise;
  const { type } = event.data;

  switch (type) {
    case 'CALCULATE_BLOCK_LAYOUT': {
      const { parent, children, width, height } = event.data;
      // ★ 메인 스레드와 동일한 전처리 수행 — raw children을 직접 WASM에 넘기면 안 됨
      //   (absolute/fixed, display:none, inline-block 요소가 블록 흐름에 혼입)
      const { normalizedChildren, outOfFlowLayouts, lineBoxLayouts } = preprocess(children, parent);
      const childrenData = serializeChildren(normalizedChildren);
      const wasmResult = blockEngine.calculate(width, height, childrenData, 8); // 8 fields (bfc_flag 포함)
      // WASM 반환값은 선형 메모리의 뷰이므로 직접 transfer하면 메모리가 분리된다.
      // 반드시 새 버퍼에 복사한 뒤 transfer해야 한다.
      const result = new Float32Array(wasmResult);
      self.postMessage(
        { type: 'BLOCK_LAYOUT_RESULT', layouts: result, outOfFlowLayouts, lineBoxLayouts },
        { transfer: [result.buffer] }
      );
      break;
    }

    case 'CALCULATE_GRID_LAYOUT': {
      const { parent, children, width, height } = event.data;
      const style = parent.props?.style;
      const columnGap = parseGap(style?.columnGap) ?? parseGap(style?.gap) ?? 0;
      const rowGap = parseGap(style?.rowGap) ?? parseGap(style?.gap) ?? 0;
      const tracksX = gridEngine.parse_tracks(style.gridTemplateColumns, width, columnGap);
      const tracksY = gridEngine.parse_tracks(style.gridTemplateRows ?? 'auto', height, rowGap);
      const wasmResult = gridEngine.calculate_cell_positions(tracksX, tracksY, columnGap, rowGap, children.length);
      const result = new Float32Array(wasmResult); // WASM 메모리에서 복사
      self.postMessage(
        { type: 'GRID_LAYOUT_RESULT', layouts: result },
        { transfer: [result.buffer] }
      );
      break;
    }
  }
};
```

### 4.4 메인 스레드 ↔ Worker 브릿지

```typescript
// wasm-worker/bridge.ts

class WasmWorkerBridge {
  private worker: Worker;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    this.worker = new Worker(
      new URL('./layoutWorker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    // 응답 매칭 및 Promise resolve
  }

  async calculateBlockLayout(
    parent: SerializedElement,
    children: SerializedElement[],
    width: number,
    height: number,
  ): Promise<Float32Array> {
    return this.send({ type: 'CALCULATE_BLOCK_LAYOUT', parent, children, width, height });
  }

  terminate() {
    this.worker.terminate();
  }
}

export const wasmBridge = new WasmWorkerBridge();
```

### 4.5 Phase 4 산출물

- [ ] `layoutWorker.ts` Web Worker 구현
- [ ] `protocol.ts` 메시지 프로토콜 정의
- [ ] `bridge.ts` 메인 스레드 브릿지
- [ ] Transferable 객체 활용 (WASM 결과를 새 Float32Array에 복사 후 transfer — WASM 선형 메모리 직접 transfer 금지)
- [ ] Worker 초기화 실패 시 메인 스레드 폴백
- [ ] 메인 스레드 WASM 호출과 Worker 비동기 호출 분리 기준 문서화
- [ ] 통합 테스트: Worker 통신 안정성
- [ ] 벤치마크: 메인 스레드 프레임 드롭 비교

### 4.6 동기/비동기 분리 기준

| 연산 | 실행 위치 | 이유 |
|------|----------|------|
| queryPoint / queryRect | 메인 스레드 (동기) | 라쏘/호버 응답 즉시 필요 (< 0.1ms) |
| queryViewport | 메인 스레드 (동기) | 렌더링 루프 내 사용 |
| collapseMargins | 메인 스레드 (동기) | 단일 연산 (< 0.01ms) |
| calculateBlockLayout | Worker (비동기) | 복잡한 레이아웃 계산 (> 5ms) |
| calculateGridLayout | Worker (비동기) | 트랙 파싱 + 셀 계산 |

### 4.7 SpatialIndex 인스턴스 역할 분리

> **핵심:** SpatialIndex는 **메인 스레드에만 존재**한다. Worker는 SpatialIndex를 보유하지 않는다.

```
┌─────────────────────────────────────────────────────────┐
│  Main Thread                                            │
│  ┌──────────────────────────────────┐                  │
│  │ SpatialIndex (유일한 인스턴스)     │                  │
│  │ - queryViewport (컬링)           │                  │
│  │ - queryRect (라쏘)               │                  │
│  │ - queryPoint (호버)              │                  │
│  │ - upsert/remove (요소 변경 시)   │                  │
│  └──────────────────────────────────┘                  │
│           ↕ postMessage                                 │
│  ┌──────────────────────────────────┐                  │
│  │ Worker (레이아웃 전용)            │                  │
│  │ - calculateBlockLayout           │                  │
│  │ - calculateGridLayout            │                  │
│  │ - SpatialIndex 없음              │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  레이아웃 결과 수신 후 메인 스레드에서:                   │
│  → SpatialIndex.upsert() 호출하여 인덱스 갱신           │
└─────────────────────────────────────────────────────────┘
```

**흐름:**
1. 요소 변경 → 메인 스레드 `SpatialIndex.upsert()` (즉시 반영)
2. 복잡 레이아웃 필요 → Worker에 `calculateBlockLayout` 요청
3. Worker 결과 수신 → 메인 스레드에서 `SpatialIndex.upsert()` 로 위치 갱신
4. 동기 쿼리(queryViewport 등) → 항상 메인 스레드 인덱스를 사용

이 구조는 스테일 데이터 문제를 방지한다:
- SpatialIndex는 메인 스레드에서만 읽기/쓰기하므로 동기화 이슈가 없다
- Worker는 레이아웃 계산만 수행하고, 결과를 메인 스레드에 반환할 뿐이다

---

## Phase 5: CanvasKit/Skia WASM 메인 렌더러 도입

> **목표:** Pencil §11 아키텍처를 적용하여 CanvasKit/Skia WASM을 메인 렌더러로 도입.
> PixiJS는 씬 그래프 관리 + EventBoundary(Hit Testing)에만 사용하고, 모든 디자인 노드의 실제 렌더링은 CanvasKit이 담당한다.
> **전제 조건:** Phase 0 벤치마크 완료 (현재 PixiJS 렌더링 성능 기준선 확보)
> **참고:** `docs/PENCIL_APP_ANALYSIS.md` §11, `docs/PENCIL_VS_XSTUDIO_RENDERING.md` §10.9

### 5.1 아키텍처 전환 개요

**현재 (단일 렌더러):**
```
React Component → @pixi/react → PixiJS Container → PixiJS WebGL 렌더링
```

**목표 (이중 렌더러 — Pencil 패턴):**
```
React Component → @pixi/react → PixiJS Container (씬 그래프 + 이벤트만)
                                      │
                                      ▼ renderSkia()
                              CanvasKit Surface → GPU 출력
```

### 5.2 CanvasKit WASM 로드 및 Surface 생성

**의존성:**
```json
{
  "dependencies": {
    "canvaskit-wasm": "^0.39.0"
  }
}
```

> `canvaskit-wasm`은 Google 공식 npm 패키지이며, Skia의 WebAssembly 빌드이다.
> gzip 기준 ~3.5MB (full) 또는 ~1.5MB (slim — GPU 전용, CPU 폴백 제외).
>
> **빌드 선택 기준:**
> - **초기 도입: full 빌드 사용** — CPU 폴백(SW 렌더링)을 포함하여 WebGL 미지원 환경에서도 렌더링을 보장한다.
>   xstudio는 웹 앱이므로 다양한 디바이스/브라우저에서 접근 가능하며, slim 빌드는 WebGL 실패 시 완전히 렌더링 불가.
> - **slim 전환 조건:** Phase 5 완료 후 실사용 WebGL 지원율 데이터를 수집하고,
>   WebGL 가용률 99%+ 확인 시 slim으로 전환하여 번들 크기 ~2MB 절감.
>   `createSurface.ts`의 SW 폴백 호출 빈도를 모니터링하여 판단한다.

**초기화:**
```typescript
// canvas/skia/initCanvasKit.ts

import CanvasKitInit from 'canvaskit-wasm';
import type { CanvasKit, Surface, Canvas } from 'canvaskit-wasm';

let canvasKit: CanvasKit | null = null;

export async function initCanvasKit(): Promise<CanvasKit> {
  if (canvasKit) return canvasKit;

  canvasKit = await CanvasKitInit({
    locateFile: (file: string) => `/wasm/${file}`,
  });

  return canvasKit;
}

export function getCanvasKit(): CanvasKit {
  if (!canvasKit) throw new Error('CanvasKit not initialized');
  return canvasKit;
}
```

**Surface 생성 (Pencil §10.9.2 패턴):**
```typescript
// canvas/skia/createSurface.ts

export function createGPUSurface(
  ck: CanvasKit,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Surface {
  // 우선순위: WebGL GPU → SW 폴백 (Pencil 동일 패턴)
  const surface = ck.MakeWebGLCanvasSurface(canvas);
  if (surface) return surface;

  console.warn('[Skia] WebGL surface 생성 실패, SW 폴백');
  const swSurface = ck.MakeSWCanvasSurface(canvas);
  if (swSurface) return swSurface;

  throw new Error('Surface 생성 불가');
}
```

### 5.3 renderSkia() 패턴 도입

Pencil의 모든 씬 노드가 구현하는 `renderSkia(renderer, canvas, cullingBounds)` 패턴을
xstudio의 Sprite 계층에 도입한다.

**인터페이스:**
```typescript
// canvas/skia/types.ts

import type { Canvas, Paint, Path } from 'canvaskit-wasm';

interface SkiaRenderable {
  /** CanvasKit Canvas에 직접 렌더링 */
  renderSkia(canvas: Canvas, cullingBounds: DOMRect): void;
}

interface SkiaRenderContext {
  canvasKit: CanvasKit;
  canvas: Canvas;
  cullingBounds: DOMRect;
}
```

**ElementSprite 확장 (공통 패턴):**
```typescript
// Pencil renderSkia() 공통 패턴 — xstudio 적용
renderSkia(canvas: Canvas, cullingBounds: DOMRect): void {
  // 1) 활성화 + 뷰포트 컬링 (AABB)
  if (!this.visible || !intersectsAABB(cullingBounds, this.getWorldBounds())) return;

  // 2) 캔버스 상태 저장 + 로컬 변환
  const saveCount = canvas.getSaveCount();
  canvas.save();
  canvas.concat(this.getLocalMatrix());

  // 3) 이펙트 시작 (Opacity, Blur, Shadow)
  this.beginRenderEffects(canvas);

  // 4) 노드별 렌더링 (Fill, Stroke, 자식)
  this.renderContent(canvas, cullingBounds);

  // 5) 자식 노드 재귀 렌더링
  for (const child of this.children) {
    if ('renderSkia' in child) {
      (child as SkiaRenderable).renderSkia(canvas, cullingBounds);
    }
  }

  // 6) 캔버스 상태 복원
  canvas.restoreToCount(saveCount);
}
```

**노드별 renderContent 구현:**

| 노드 타입 | CanvasKit API | 현재 xstudio 대응 |
|----------|---------------|-------------------|
| BoxSprite | `canvas.drawRRect()`, `canvas.drawPath()` | PixiJS Graphics |
| TextSprite | `ParagraphBuilder` → `canvas.drawParagraph()` | PixiJS Text |
| ImageSprite | `canvas.drawImageRect()` | PixiJS Sprite |
| 컨테이너 | 자식 재귀 renderSkia() | PixiJS Container |

### 5.4 SkiaRenderer 렌더 루프

Pencil §10.9.3의 렌더 루프를 xstudio에 적용한다.

```typescript
// canvas/skia/SkiaRenderer.ts

export class SkiaRenderer {
  private surface: Surface;
  private canvas: Canvas;
  private rootNode: SkiaRenderable;

  render(cullingBounds: DOMRect): void {
    // CanvasKit Canvas에 직접 렌더링
    this.canvas.clear(this.backgroundColor);

    // 전체 씬 트리 renderSkia() 실행
    this.rootNode.renderSkia(this.canvas, cullingBounds);

    // GPU 제출
    this.surface.flush();
  }
}
```

**PixiJS 렌더 루프와의 통합:**
```
매 프레임 (requestAnimationFrame):
1. PixiJS ticker 콜백
2. Zustand 상태 → PixiJS 씬 그래프 동기화 (기존 canvasSync.ts)
3. PixiJS 씬 그래프에서 변경 감지
4. ★ SkiaRenderer.render() 호출 — CanvasKit이 실제 렌더링 수행
5. PixiJS는 씬 그래프/이벤트만 유지 (자체 렌더링 비활성화)
```

### 5.5 Fill 시스템 (6종, Shader 기반)

Pencil §10.9.6의 Fill 시스템을 구현한다.

```typescript
// canvas/skia/fills.ts

export function applyFill(
  ck: CanvasKit,
  paint: Paint,
  fill: FillStyle,
  bounds: Rect,
): void {
  switch (fill.type) {
    case 'color':
      paint.setColor(ck.Color4f(...fill.rgba));
      break;
    case 'linear-gradient':
      paint.setShader(ck.Shader.MakeLinearGradient(
        fill.start, fill.end, fill.colors, fill.positions, ck.TileMode.Clamp,
      ));
      break;
    case 'radial-gradient':
      paint.setShader(ck.Shader.MakeTwoPointConicalGradient(
        fill.center, fill.startRadius, fill.center, fill.endRadius,
        fill.colors, fill.positions, ck.TileMode.Clamp,
      ));
      break;
    case 'angular-gradient':
      paint.setShader(ck.Shader.MakeSweepGradient(
        fill.cx, fill.cy, fill.colors, fill.positions,
      ));
      break;
    case 'image':
      // MakeImageShader — Fill/Fit/Crop/Tile 모드
      paint.setShader(ck.Shader.MakeImageShader(
        fill.image, fill.tileMode, fill.tileMode, fill.sampling, fill.matrix,
      ));
      break;
    case 'mesh-gradient':
      // Coons 패치 기반 메시 보간 (향후)
      break;
  }
}
```

### 5.6 이펙트 파이프라인 (beginRenderEffects)

Pencil §10.9.5의 이펙트 파이프라인을 구현한다.

```typescript
// canvas/skia/effects.ts

export function beginRenderEffects(
  ck: CanvasKit,
  canvas: Canvas,
  effects: EffectStyle[],
): number {
  let layerCount = 0;

  for (const effect of effects) {
    switch (effect.type) {
      case 'opacity': {
        const paint = new ck.Paint();
        paint.setAlphaf(effect.value);
        canvas.saveLayer(null, paint);
        paint.delete();
        layerCount++;
        break;
      }
      case 'background-blur': {
        const filter = ck.ImageFilter.MakeBlur(
          effect.sigma, effect.sigma, ck.TileMode.Clamp, null,
        );
        const paint = new ck.Paint();
        paint.setImageFilter(filter);
        canvas.saveLayer(null, paint);
        filter.delete();
        paint.delete();
        layerCount++;
        break;
      }
      case 'drop-shadow': {
        const filter = effect.inner
          ? ck.ImageFilter.MakeDropShadowOnly(
              effect.dx, effect.dy, effect.sigmaX, effect.sigmaY, effect.color,
            )
          : ck.ImageFilter.MakeDropShadow(
              effect.dx, effect.dy, effect.sigmaX, effect.sigmaY, effect.color,
            );
        const paint = new ck.Paint();
        paint.setImageFilter(filter);
        canvas.saveLayer(null, paint);
        filter.delete();
        paint.delete();
        layerCount++;
        break;
      }
    }
  }

  return layerCount;
}
```

### 5.7 PixiJS 역할 전환

CanvasKit 도입 후 PixiJS의 역할을 제한한다:

| 기능 | 전환 전 (현재) | 전환 후 (목표) | 대체되는 기존 구현 |
|------|---------------|---------------|-------------------|
| 디자인 노드 렌더링 | PixiJS WebGL | CanvasKit/Skia WASM | cacheAsTexture, 배치 렌더링, Fill/이펙트 |
| 씬 그래프 관리 | PixiJS Container | PixiJS Container (유지) | — |
| Hit Testing | PixiJS EventBoundary | PixiJS EventBoundary (유지) | — |
| 텍스트 렌더링 | PixiJS Text | CanvasKit ParagraphBuilder | — |
| 텍스트 측정 | PixiJS TextMetrics | PixiJS TextMetrics (유지 — 보조) | — |
| 텍스처 캐싱 | PixiJS cacheAsTexture | CanvasKit Surface 캐싱 | SpritePool, autoGarbageCollect |
| 뷰포트 컬링 | JS AABB Array.filter() | renderSkia() 내부 네이티브 AABB | useViewportCulling.ts |
| 뷰포트 조작 | ViewportController (Container.x/y) | canvas.concat(matrix) | ViewportController.ts 수정 필요 |

**PixiJS 렌더링 비활성화:**
```typescript
// BuilderCanvas.tsx에서 PixiJS 자체 렌더링을 중지하고
// CanvasKit 렌더 루프로 대체

// 방법 1: PixiJS renderer를 headless 모드로 전환
app.renderer.render = () => {}; // 렌더링 noop 처리
// PixiJS 씬 그래프는 유지 (이벤트, hit test용)

// 방법 2: 별도 캔버스에 CanvasKit Surface 생성
// PixiJS 캔버스 위에 CanvasKit 캔버스를 오버레이
```

#### 5.7.1 WebGL 컨텍스트 충돌 전략

`hybrid` 모드에서 PixiJS와 CanvasKit이 **동시에 별도 WebGL 컨텍스트**를 사용한다.
브라우저는 보통 ~16개 WebGL 컨텍스트를 허용하며, 동일 `<canvas>` 엘리먼트에 두 렌더러가 공존할 수 없다.

**권장 전략: 캔버스 오버레이 + 이벤트 포워딩**

```
┌─────────────────────────────────┐
│ CanvasKit <canvas>               │  z-index: 2  ← 실제 GPU 렌더링
│ pointer-events: auto             │  사용자 이벤트 수신
├─────────────────────────────────┤
│ PixiJS <canvas>                  │  z-index: 1  ← 숨김 (렌더링 비활성화)
│ pointer-events: none             │  씬 그래프 + 이벤트 시스템만 유지
│ visibility: hidden               │
└─────────────────────────────────┘
```

**구현:**
1. CanvasKit 전용 `<canvas>` 엘리먼트를 PixiJS 캔버스 **위에** 오버레이 (`position: absolute; z-index` 사용)
2. PixiJS 캔버스: `visibility: hidden; pointer-events: none` — WebGL 컨텍스트는 유지하되 렌더링은 noop 처리
3. CanvasKit 캔버스에서 수신한 포인터 이벤트를 PixiJS `EventBoundary`로 포워딩:
   ```typescript
   canvaskitCanvas.addEventListener('pointermove', (e) => {
     // PixiJS EventBoundary에 합성 이벤트 전달
     app.renderer.events.rootBoundary.mapEvent(
       new FederatedPointerEvent(app.renderer.events, e)
     );
   });
   ```
4. `skia` 모드(단독)에서는 PixiJS WebGL 컨텍스트를 `loseContext()`로 해제하여 GPU 리소스 회수

> **`pixi` 모드 전환 시:** CanvasKit 캔버스를 제거하고 PixiJS 캔버스를 활성화한다.
> Feature Flag 전환은 페이지 리로드 없이 동적으로 수행 가능하도록 설계한다.

### 5.8 전환 전략 (점진적)

한 번에 전체 전환하지 않고 노드 타입별로 점진적 전환한다:

```
Step 1: BoxSprite → renderSkia (가장 단순한 도형)
Step 2: ImageSprite → renderSkia
Step 3: TextSprite → renderSkia (ParagraphBuilder 전환)
Step 4: 컨테이너/재귀 렌더링 완성
Step 5: PixiJS 자체 렌더링 비활성화
```

각 Step에서 Feature Flag로 CanvasKit/PixiJS 렌더링 경로를 선택할 수 있다:
```typescript
const RENDER_MODE = import.meta.env.VITE_RENDER_MODE; // 'pixi' | 'skia' | 'hybrid'
```

### 5.9 Phase 5 산출물

| 산출물 | 내용 |
|--------|------|
| `canvas/skia/initCanvasKit.ts` | CanvasKit WASM 초기화 |
| `canvas/skia/createSurface.ts` | GPU Surface 생성 (WebGL → SW 폴백) |
| `canvas/skia/SkiaRenderer.ts` | 렌더 루프 (renderSkia 트리 순회) |
| `canvas/skia/fills.ts` | 6종 Fill Shader 구현 |
| `canvas/skia/effects.ts` | 이펙트 파이프라인 (opacity, blur, shadow) |
| `canvas/skia/types.ts` | SkiaRenderable 인터페이스 |
| `canvas/skia/disposable.ts` | CanvasKit 리소스 수동 해제 래퍼 (Disposable 패턴) |
| `canvas/skia/fontManager.ts` | CanvasKit 폰트 등록/캐싱 파이프라인 |
| BoxSprite renderSkia() | 사각형/RoundedRect CanvasKit 렌더링 |
| TextSprite renderSkia() | ParagraphBuilder 텍스트 렌더링 |
| ImageSprite renderSkia() | drawImageRect 이미지 렌더링 |
| Feature Flag | `VITE_RENDER_MODE=pixi\|skia\|hybrid` |

#### 5.9.1 Disposable 패턴 (`canvas/skia/disposable.ts`)

CanvasKit의 Paint, Path, Surface, Image 등은 모두 C++ 힙 객체로 JS GC가 관리하지 않는다.
수동 `.delete()` 누락 시 WASM 메모리 누수가 발생한다.

```typescript
class SkiaDisposable implements Disposable {
  private resources: Set<{ delete(): void }> = new Set();

  track<T extends { delete(): void }>(resource: T): T {
    this.resources.add(resource);
    return resource;
  }

  [Symbol.dispose](): void {
    for (const r of this.resources) r.delete();
    this.resources.clear();
  }
}

// renderSkia() 내에서 사용 (TC39 Explicit Resource Management):
function renderNode(ck: CanvasKit, canvas: Canvas): void {
  using scope = new SkiaDisposable();
  const paint = scope.track(new ck.Paint());
  paint.setColor(ck.Color4f(1, 0, 0, 1));
  canvas.drawRect(rect, paint);
  // 스코프 종료 시 paint.delete() 자동 호출
}
```

> **TC39 미지원 환경:** TypeScript 5.2+ `using` 미사용 시 try/finally로 폴백:
> ```typescript
> const scope = new SkiaDisposable();
> try { /* ... */ } finally { scope[Symbol.dispose](); }
> ```

#### 5.9.2 폰트 관리 파이프라인 (`canvas/skia/fontManager.ts`)

CanvasKit은 브라우저의 CSS `@font-face`를 사용할 수 없다.
`Typeface.MakeFreeTypeFaceFromData(fontBuffer)`로 폰트 바이너리를 직접 로드해야 한다.

**현재 xstudio:** `useCanvasFonts.ts`에서 `document.fonts.ready`로 브라우저 폰트 로딩을 감지.
이 방식은 CanvasKit에서 작동하지 않으므로 별도 폰트 관리가 필요하다.

```typescript
class SkiaFontManager {
  private fontMgr: FontMgr | null = null;
  private cache: Map<string, ArrayBuffer> = new Map();

  async loadFont(family: string, url: string): Promise<void> {
    // 1. IndexedDB 캐시 확인
    let buffer = await this.getFromCache(family);
    if (!buffer) {
      // 2. 네트워크에서 .woff2/.ttf fetch
      const response = await fetch(url);
      buffer = await response.arrayBuffer();
      await this.saveToCache(family, buffer);
    }
    // 3. CanvasKit에 등록
    const ck = getCanvasKit();
    const typeface = ck.Typeface.MakeFreeTypeFaceFromData(buffer);
    if (!typeface) throw new Error(`Failed to load font: ${family}`);
    this.cache.set(family, buffer);
  }

  getFontMgr(): FontMgr {
    if (!this.fontMgr) {
      const ck = getCanvasKit();
      const buffers = Array.from(this.cache.values());
      this.fontMgr = ck.FontMgr.FromData(...buffers)!;
    }
    return this.fontMgr;
  }
}
```

> `ParagraphBuilder`에서 `getFontMgr()` 반환값을 사용하여 텍스트를 렌더링한다.

### 5.10 성능 검증 대상

| 지표 | 기준 (PixiJS) | 목표 (CanvasKit) | 비고 |
|------|---------------|------------------|------|
| 프레임 타임 1,000 요소 | Phase 0 실측 | 동등 이상 | 전환 초기에는 PixiJS와 동등하면 충분 |
| 텍스트 렌더링 품질 | 브라우저 Canvas2D | CanvasKit ParagraphBuilder | 서브픽셀 렌더링 품질 향상 기대 |
| 벡터 도형 정밀도 | PixiJS Graphics | CanvasKit Path | 베지어/클리핑 정밀도 향상 |
| GPU 메모리 | Phase 0 실측 | +3.5MB (CanvasKit WASM) | slim 빌드 사용 시 ~1.5MB |
| 초기 로드 | < 3초 목표 | CanvasKit 초기화 오버헤드 측정 | Lazy loading으로 완화 |

---

## Phase 6: 고급 렌더링 기능 (CanvasKit 활용)

> **목표:** CanvasKit 메인 렌더러 도입 후, Pencil의 고급 렌더링 최적화를 적용한다.
> **전제 조건:** Phase 5 완료 (CanvasKit 렌더 루프 동작)
> **참고:** `docs/PENCIL_VS_XSTUDIO_RENDERING.md` §2.1, §4

### 6.1 이중 Surface 캐싱 (Pencil §10.9.1)

Pencil의 핵심 최적화: contentSurface + mainSurface 분리.

```
┌─────────────────────────────────┐
│ contentSurface                   │
│ (모든 디자인 노드 renderSkia)     │
│                                  │
│ 변경 시에만 전체 재렌더링          │
│ 줌/패닝 시 블리팅만 수행           │
└──────────────┬──────────────────┘
               │ blit
┌──────────────▼──────────────────┐
│ mainSurface                      │
│ (오버레이: 선택 박스, 가이드라인)   │
│                                  │
│ 매 프레임 갱신                    │
└──────────────┬──────────────────┘
               │ flush
         ┌─────▼─────┐
         │ GPU Output │
         └───────────┘
```

**효과:**
- 줌/패닝 시 전체 씬 재렌더링 불필요 → contentSurface 블리팅만 수행
- 오버레이(선택 박스, 가이드라인)만 mainSurface에서 재렌더링
- 대규모 캔버스에서 줌/패닝 응답 시간 대폭 개선

### 6.2 Dirty Rect 렌더링

변경된 영역만 다시 렌더링하는 최적화.

```
전체 렌더링 (현재):           Dirty Rect (목표):
┌─────────────────┐         ┌─────────────────┐
│ ██████████████  │         │ ·····█████····  │
│ ██████████████  │         │ ·····█████····  │
│ ██████████████  │    →    │ ·············   │
│ ██████████████  │         │ ·············   │
└─────────────────┘         └─────────────────┘
GPU 전체 사용                변경 영역만 GPU 사용
```

CanvasKit의 `canvas.clipRect()` + `canvas.save()/restore()`로 구현:
```typescript
renderDirtyRect(canvas: Canvas, dirtyRect: Rect): void {
  canvas.save();
  canvas.clipRect(dirtyRect, ck.ClipOp.Intersect, false);
  // dirtyRect과 교차하는 노드만 renderSkia()
  this.rootNode.renderSkia(canvas, dirtyRectToDOMRect(dirtyRect));
  canvas.restore();
}
```

### 6.3 블렌드 모드 (18종, Pencil §10.9.8)

```typescript
// canvas/skia/blendModes.ts

const BLEND_MODE_MAP: Record<string, BlendMode> = {
  'normal': ck.BlendMode.SrcOver,
  'multiply': ck.BlendMode.Multiply,
  'screen': ck.BlendMode.Screen,
  'overlay': ck.BlendMode.Overlay,
  'darken': ck.BlendMode.Darken,
  'lighten': ck.BlendMode.Lighten,
  'color-dodge': ck.BlendMode.ColorDodge,
  'color-burn': ck.BlendMode.ColorBurn,
  'hard-light': ck.BlendMode.HardLight,
  'soft-light': ck.BlendMode.SoftLight,
  'difference': ck.BlendMode.Difference,
  'exclusion': ck.BlendMode.Exclusion,
  'hue': ck.BlendMode.Hue,
  'saturation': ck.BlendMode.Saturation,
  'color': ck.BlendMode.Color,
  'luminosity': ck.BlendMode.Luminosity,
  'plus-darker': ck.BlendMode.Plus,
  'plus-lighter': ck.BlendMode.Plus,
};
```

### 6.4 Export 파이프라인 (Pencil §10.9.12)

CanvasKit 기반 고품질 이미지 Export:

```typescript
// canvas/skia/export.ts

export function exportToImage(
  ck: CanvasKit,
  rootNode: SkiaRenderable,
  width: number,
  height: number,
  format: 'png' | 'jpeg' | 'webp',
  quality?: number,
): Uint8Array {
  // 1) 오프스크린 Surface 생성
  const surface = ck.MakeSurface(width, height);
  const canvas = surface.getCanvas();

  // 2) 전체 씬 렌더링 (뷰포트 컬링 OFF)
  const fullBounds = new DOMRect(0, 0, width, height);
  rootNode.renderSkia(canvas, fullBounds);

  // 3) 이미지 스냅샷
  const image = surface.makeImageSnapshot();

  // 4) 인코딩
  const encoded = image.encodeToBytes(
    format === 'png' ? ck.ImageFormat.PNG
      : format === 'jpeg' ? ck.ImageFormat.JPEG
      : ck.ImageFormat.WEBP,
    quality ?? 100,
  );

  // 5) 리소스 정리
  image.delete();
  surface.delete();

  return encoded;
}
```

> **향후 확장 (SVG/PDF):**
> CanvasKit은 `SkPictureRecorder`를 통해 벡터 기반 SVG 생성과, `SkDocument::MakePDF()`를 통해
> PDF 생성을 지원한다. 디자인 툴 수준의 Export 지원(PNG, JPEG, SVG, PDF)을 위해
> Phase 6.4 완료 후 SVG/PDF Export를 별도 태스크로 추가한다.
> - **SVG:** `SkPictureRecorder` → `SkPicture` → SVG serializer
> - **PDF:** `CanvasKit.MakePDFDocument()` → 페이지별 렌더링 → PDF 바이너리

### 6.5 Phase 6 산출물

| 산출물 | 내용 |
|--------|------|
| 이중 Surface 캐싱 | contentSurface + mainSurface 분리 |
| Dirty Rect 렌더링 | 변경 영역만 재렌더링 |
| 블렌드 모드 18종 | CanvasKit BlendMode 매핑 |
| Export 파이프라인 | PNG/JPEG/WEBP 오프스크린 Export + SVG/PDF 향후 확장 |

### 6.6 성능 검증 대상

| 지표 | 목표 | 비고 |
|------|------|------|
| 줌/패닝 프레임 타임 | < 8ms (120fps) | 이중 Surface 블리팅 |
| 변경 없는 프레임 | < 1ms | contentSurface 캐시 히트 |
| Dirty Rect 효율 | GPU 사용량 40-60% 감소 | 부분 영역만 렌더링 |
| Export 품질 | 벡터 정밀도 보장 | CanvasKit Path 기반 |

---

## WASM 초기화 통합

### 전체 초기화 순서 (수정됨 — Phase 5 포함)

```typescript
// wasm-bindings/init.ts

import { initSpatialWasm } from './spatialIndex';
import { initLayoutWasm } from './layoutAccelerator';
import { initCanvasKit } from '../skia/initCanvasKit';
import { WASM_FLAGS } from './featureFlags';

let wasmReady = false;

export async function initAllWasm(): Promise<void> {
  if (wasmReady) return;

  try {
    const tasks: Promise<void>[] = [];

    // Phase 1-2: 커스텀 Rust WASM 모듈
    if (WASM_FLAGS.SPATIAL_INDEX) tasks.push(initSpatialWasm());
    if (WASM_FLAGS.LAYOUT_ENGINE) tasks.push(initLayoutWasm());

    // Phase 5: CanvasKit/Skia WASM (메인 렌더러)
    if (WASM_FLAGS.CANVASKIT_RENDERER) tasks.push(initCanvasKit().then(() => {}));

    await Promise.all(tasks);
    wasmReady = true;
    console.log('[WASM] 모듈 초기화 완료', {
      spatial: WASM_FLAGS.SPATIAL_INDEX,
      layout: WASM_FLAGS.LAYOUT_ENGINE,
      canvaskit: WASM_FLAGS.CANVASKIT_RENDERER,
    });
  } catch (error) {
    console.error('[WASM] 초기화 실패, JS 폴백 사용:', error);
  }
}

export function isWasmReady(): boolean {
  return wasmReady;
}
```

**Feature Flag (수정됨 — Phase 5 포함):**
```typescript
// wasm-bindings/featureFlags.ts

export const WASM_FLAGS = {
  SPATIAL_INDEX: import.meta.env.VITE_WASM_SPATIAL === 'true',
  LAYOUT_ENGINE: import.meta.env.VITE_WASM_LAYOUT === 'true',
  CANVASKIT_RENDERER: import.meta.env.VITE_RENDER_MODE === 'skia'
    || import.meta.env.VITE_RENDER_MODE === 'hybrid',
} as const;

// .env.development
VITE_WASM_SPATIAL=true
VITE_WASM_LAYOUT=false
VITE_RENDER_MODE=pixi          // 'pixi' | 'skia' | 'hybrid'
```

**앱 진입점에서 호출:**
```typescript
// BuilderCanvas.tsx 또는 Workspace.tsx

import { initAllWasm } from '../wasm-bindings/init';
import { initYoga } from '../canvas/layout/initYoga';

useEffect(() => {
  // Yoga와 모든 WASM 모듈 병렬 초기화 (Phase 1-2 + Phase 5)
  Promise.all([initYoga(), initAllWasm()]);
}, []);
```

---

## 리스크 관리

### 폴백 전략

모든 WASM 호출은 JS 폴백을 유지한다. Feature Flag가 `false`이거나 WASM 초기화 실패 시 기존 JS 로직이 실행된다.

```typescript
// 패턴:
function someOperation(args) {
  if (WASM_FLAGS.XXX && wasmModule) {
    return wasmModule.operation(args);  // WASM 경로
  }
  return jsImplementation(args);        // JS 폴백 (기존 코드 그대로)
}
```

### 테스트 전략

| 수준 | 방법 | 검증 항목 |
|------|------|----------|
| Rust 단위 테스트 | `wasm-pack test --node` | 알고리즘 정확성 |
| TS 바인딩 테스트 | Vitest | 타입 안전성, 데이터 마샬링 |
| 렌더링 일치 테스트 | 스크린샷 비교 | WASM vs JS 출력 동일성 |
| 성능 회귀 테스트 | 벤치마크 자동화 | 프레임 타임 임계값 |
| 메모리 누수 테스트 | Chrome DevTools | WASM 메모리 증가 추적 |

### WASM 바이너리 크기 예산 (수정됨 — Phase 5 포함)

| 모듈 | Phase | 예상 크기 (gzip) | 한도 |
|------|-------|-----------------|------|
| spatial_index | 1 | ~10KB | 20KB |
| block_layout + grid_layout | 2 | ~20KB | 40KB |
| **Phase 1-4 소계** | - | **~30KB** | **60KB** |
| canvaskit-wasm (slim) | 5 | ~1.5MB | 2MB |
| canvaskit-wasm (full) | 5 | ~3.5MB | 4MB |
| **Phase 5 포함 합계** | - | **~1.53MB (slim)** | **~2.06MB** |

> **주의:** Phase 5 CanvasKit WASM은 기존 Phase 1-4의 커스텀 Rust WASM (~30KB)과는 규모가 다르다.
> Pencil 앱의 pencil.wasm이 7.8MB인 점과 비교하면, Google 공식 canvaskit-wasm slim 빌드 (~1.5MB)는 합리적이다.
> Lazy loading + 캐싱으로 초기 로드 영향을 최소화한다.

---

## 전체 로드맵 요약 (수정됨 — Phase 5-6 추가, 병렬 경로 명시)

```
═══════════════════════════════════════════════════════════════
  실행 경로 (Phase 0 이후 병렬)
═══════════════════════════════════════════════════════════════

  Phase 0 (환경 구축 + 벤치마크)
      │
      ├──── 품질 경로 (최우선) ──────────────────────────────
      │     Phase 5 → Phase 6
      │     (CanvasKit/Skia 메인 렌더러 → 고급 렌더링)
      │     ★ 핵심 목표: 렌더링 품질 Pencil 수준 달성
      │
      └──── 성능 경로 (병렬) ───────────────────────────────
            Phase 1 → Phase 2 → Phase 4
            (SpatialIndex → Layout WASM → Worker)
            ★ PixiJS 아키텍처 위 점진적 WASM 최적화

  두 경로는 독립적으로 진행 가능하다.
  Phase 5는 Phase 1-4에 의존하지 않으며, Phase 0만 전제 조건이다.

═══════════════════════════════════════════════════════════════
  성능 경로: Phase 0–4 (현재 PixiJS 아키텍처 위 점진적 WASM 최적화)
═══════════════════════════════════════════════════════════════

Phase 0: 환경 구축 및 벤치마크 기준선
  └─ Rust + wasm-pack 설정
  └─ Vite WASM 플러그인
  └─ 벤치마크 유틸리티
  └─ Feature Flag 인프라
  └─ 실측 기준선 수집 → 이후 Phase 필요성 판단
      │
Phase 1: Spatial Index (축소됨)
  └─ spatial_index.rs (i64 키 인코딩, AABB 교차 검증 포함)
  └─ idMapper.ts (string ↔ u32 양방향 매핑, tryGetNumericId 안전 조회)
  └─ elementRegistry.ts — SpatialIndex 동기화 추가
  └─ useViewportCulling.ts — query_viewport로 대체
  └─ SelectionLayer.utils.ts — query_rect로 라쏘 선택 O(n) → O(k)
  └─ ~~BoundsCache~~ 제거 (기존 layoutBoundsRegistry로 충분)
      │
Phase 2: Layout Engine 배치 가속 (수정됨)
  └─ block_layout.rs — 정규화된 블록 배치 (수직 스태킹 + margin collapse + BFC 경계)
  └─ grid_layout.rs — 트랙 파싱(auto 포함) + 셀 위치 계산
  └─ JS 전처리 책임: out-of-flow 분리, inline-block LineBox 그룹화, blockification, BFC 판별
  └─ WASM calculate()는 전처리된 데이터만 수신 (경계 넘기 1회)
  └─ 데이터 마샬링 헬퍼 (serialize/deserialize, 8 fields with bfc_flag)
  └─ 최소 요소 수 임계값 결정 (마샬링 비용 경계점)
      │
Phase 3: 제거됨
  └─ 텍스트 데코레이션, CSS 파싱은 WASM 부적합
  └─ 대안: BitmapText 전환, JS 캐시 메모이제이션
      │
Phase 4: Web Worker 통합 (수정됨)
  └─ layoutWorker.ts
  └─ Stale-While-Revalidate 동기화 전략
  └─ 초기 레이아웃은 메인 스레드, 변경분만 Worker
  └─ LayoutScheduler 구현 (RAF 기반 결과 적용)

═══════════════════════════════════════════════════════════════
  품질 경로: Phase 5–6 (CanvasKit/Skia WASM 메인 렌더러 전환)
═══════════════════════════════════════════════════════════════
      │
Phase 5: CanvasKit/Skia WASM 메인 렌더러 도입
  └─ canvaskit-wasm 의존성 추가 (~1.5MB slim)
  └─ initCanvasKit.ts — WASM 초기화
  └─ createSurface.ts — GPU Surface 생성 (WebGL → SW 폴백)
  └─ SkiaRenderer.ts — 렌더 루프 (renderSkia 트리 순회)
  └─ fills.ts — 6종 Fill Shader (Color/Linear/Radial/Angular/Mesh/Image)
  └─ effects.ts — 이펙트 파이프라인 (Opacity/Blur/Shadow)
  └─ 노드별 renderSkia() — BoxSprite, TextSprite, ImageSprite
  └─ PixiJS → 씬 그래프/이벤트 전용으로 역할 축소
  └─ Feature Flag: VITE_RENDER_MODE=pixi|skia|hybrid
  └─ 점진적 전환: Box → Image → Text → 컨테이너 → PixiJS 렌더링 비활성화
      │
Phase 6: 고급 렌더링 기능 (CanvasKit 활용)
  └─ 이중 Surface 캐싱 (contentSurface + mainSurface)
  └─ Dirty Rect 렌더링 (변경 영역만 재렌더링)
  └─ 블렌드 모드 18종 (CanvasKit BlendMode)
  └─ Export 파이프라인 (PNG/JPEG/WEBP 오프스크린)

═══════════════════════════════════════════════════════════════
  추가 개선 항목 (WASM 불필요, JS 구현)
  → 상세: docs/PENCIL_VS_XSTUDIO_RENDERING.md §4, §7
═══════════════════════════════════════════════════════════════

  [높음] LOD 스위칭 — 줌 레벨별 디테일 조절 (§4.3)
  [높음] 텍스처 아틀라싱 — 다수 이미지를 단일 GPU 텍스처로 합침 (§4.2)
  [중간] RenderTexture 풀링 — GPU 텍스처 재사용 (§4.4)
  [중간] OffscreenCanvas — 오프스크린 렌더링 (§4.5, Phase 4 Worker 확장)
  [낮음] VRAM 예산 관리 — GPU 메모리 LRU 관리 (§4.6)
```

### 성능 목표 (Phase 0 이후 업데이트)

| 지표 | 목표 | 검증 시점 |
|------|------|----------|
| Viewport Culling | O(n) → O(k) | Phase 1 완료 후 |
| 라쏘 선택 | O(n) → O(k) (query_rect) | Phase 1 완료 후 |
| 레이아웃 재계산 | 실측 기준선 대비 개선 | Phase 2 완료 후 |
| 메인 스레드 부하 | UI jank 제거 | Phase 4 완료 후 |
| Phase 1-4 WASM 바이너리 | < 60KB (gzip) | Phase 4 완료 후 |
| **렌더링 품질** | **Pencil 동등 수준** (벡터/텍스트/이펙트) | **Phase 5 완료 후** |
| **줌/패닝 프레임 타임** | **< 8ms** (이중 Surface 블리팅) | **Phase 6 완료 후** |
| **Dirty Rect 효율** | **GPU 사용량 40-60% 감소** | **Phase 6 완료 후** |

> **핵심 원칙:**
> 1. 벤치마크 없는 추정치를 신뢰하지 않는다 — Phase 0에서 실측한다.
> 2. WASM 경계 넘기는 최소화한다 — 배치 단위로만 호출한다.
> 3. 기존 JS 캐시로 충분하면 WASM을 도입하지 않는다 — 복잡도 비용을 고려한다.
> 4. 모든 WASM 경로에 JS 폴백을 유지한다 — Feature Flag로 즉시 롤백 가능.
> 5. **Phase 5-6은 Phase 0-4와 독립적으로 진행 가능하다** — CanvasKit 도입은 커스텀 WASM 모듈과 병행한다.

---

## 검토 Q&A

### Q1: SpatialIndex 결과를 O(k)로 활용하기 위해 id → element 맵을 별도 유지할 계획인가?

`query_viewport`와 `query_rect`는 string ID 배열을 반환한다.
별도 맵은 불필요하며, Zustand store의 기존 `elementsMap` (O(1) 인덱스)을 `useStore.getState().elementsMap`으로 조회한다.

**useViewportCulling에서의 O(k) 수집 경로:**
```typescript
const visibleIds = queryVisibleElements(...);                  // O(k) — SpatialIndex 반환
const elementsMap = useStore.getState().elementsMap;            // 구독이 아닌 getState() 직접 조회
const visibleElements = visibleIds
  .map(id => elementsMap.get(id))                              // O(1) × k = O(k)
  .filter((el): el is Element => el !== undefined);
```
`getState()` 경로를 사용하는 이유: `useViewportCulling`은 `useMemo` 내부에서 실행되므로
`elementsMap`을 React 구독 대상으로 추가하면 불필요한 리렌더가 발생한다.
`getState()`는 스냅샷 조회만 수행하여 리렌더 의존성을 추가하지 않는다.

라쏘 선택의 경우 `queryRect`가 직접 ID 배열을 반환하므로 element 순회 자체가 불필요하다.

### Q2: Grid 템플릿 파싱 지원 범위

현재 Phase 2 범위:
- **지원:** `fr`, `px`, `%`, 숫자 리터럴, `auto`
- **미지원:** `minmax()`, `repeat()`, `fit-content()`, `min-content`, `max-content`

`minmax()`/`repeat()`은 xstudio의 GridEngine.ts에서도 미지원이므로 WASM 포팅 범위에서 제외한다.
향후 GridEngine.ts에 해당 기능이 추가되면 `grid_layout.rs`도 함께 확장한다.

### Q3: Worker 결과 전달 방식

`result.buffer`를 직접 transfer하면 WASM 선형 메모리(WebAssembly.Memory)가 분리되어 이후 모든 WASM 호출이 실패한다.
본 문서의 Worker 구현을 **"복사 후 transfer"** 패턴으로 수정 완료하였다:
```typescript
const wasmResult = blockEngine.calculate(...);
const result = new Float32Array(wasmResult); // WASM 메모리에서 JS 힙으로 복사
self.postMessage({ layouts: result }, { transfer: [result.buffer] }); // 복사본만 transfer
```

### Q4: Worker rebuildSpatialIndex의 역할

3차 검토에서 역할 분리를 명확히 하였다 (4.7절 참조):
- **SpatialIndex는 메인 스레드에만 존재한다.** Worker에는 SpatialIndex 인스턴스가 없다.
- Worker는 **레이아웃 계산(Block/Grid)만** 수행하고 결과를 메인 스레드에 반환한다.
- 레이아웃 결과 수신 후 메인 스레드의 `LayoutScheduler.applyLayout()`에서 `SpatialIndex.upsert()`를 호출하여 인덱스를 갱신한다.
- 이 구조는 두 인덱스 간 동기화 문제를 원천 제거한다.

### Q5: useViewportCulling에서 elementsMap 접근 경로

`useStore.getState().elementsMap`으로 직접 조회한다 (구독이 아닌 스냅샷).
`useMemo` 내부에서 실행되므로 `useStore(state => state.elementsMap)` 구독을 사용하면
elementsMap 변경 시 불필요한 리렌더가 발생한다. `getState()`는 리렌더 의존성을 추가하지 않으므로
기존 `useMemo` 의존성(zoom, panOffset)만으로 재계산 타이밍을 제어할 수 있다.

---

## 범위 외 항목 (렌더링 외 기능 — 본 문서 범위 밖)

본 문서는 **렌더링 품질/성능 최적화**에 집중한다. 아래 항목들은 디자인 툴 완성도에 필요하지만
별도 ADR/설계 문서에서 다뤄야 한다.

| 기능 | 중요도 | 현재 상태 | 필요한 조치 |
|------|--------|----------|------------|
| 컴포넌트/인스턴스 시스템 | 높음 | 미구현 | 별도 ADR 필요 — 마스터 컴포넌트 ↔ 인스턴스 동기화 |
| Constraint 시스템 | 중간 | Yoga Flexbox만 | Layout 확장 검토 — absolute+constraint 혼합 |
| Auto Layout 고급 기능 | 중간 | 기본 Flexbox | min/max, wrap 등 고급 레이아웃 |
| 실시간 협업 (CRDT) | 후순위 | 미구현 | 별도 아키텍처 설계 — Yjs/Automerge 등 |
| 프로토타이핑/인터랙션 | 후순위 | 미구현 | 별도 런타임 엔진 필요 |
| 외부 파일 임포트 | 후순위 | 미구현 | .fig/.sketch 파서 (서비스 런칭 후 검토) |

> 이 항목들은 Phase 5-6 렌더링 전환과 독립적이며, 별도 로드맵에서 우선순위를 결정한다.
