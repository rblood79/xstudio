# xstudio WASM 최적화 계획

> 작성일: 2026-01-29
> 최종 수정: 2026-01-29 (3차 검토 반영 — JS 전처리/WASM 범위 분리, init import 누락, O(k) elementsMap 경로, Worker SpatialIndex 제거, 음수 마진 폴백)
> 대상: `apps/builder/src/builder/workspace/canvas/`
> 현재 스택: PixiJS v8.14.3 + @pixi/react v8.0.5 + Yoga WASM v3.2.1 + Zustand
> 참고: Pencil Desktop v1.1.10 아키텍처 분석 기반

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
  // childrenMap(부모→자식 ID 배열)의 순서가 곧 렌더 순서이므로,
  // visibleElements를 원본 children 배열 내 인덱스 기준으로 정렬해야 한다.
  // 방법: 부모별 childrenMap 인덱스를 조회하거나,
  //       전체 elements 배열의 인덱스를 사전에 Map<id, index>로 캐시해 O(k log k) 정렬.
  const orderIndex = useStore.getState().elementOrderIndex; // Map<string, number>
  visibleElements.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
  // ...
}

// ※ 기존 elements.filter(el => ...) 경로는 WASM_FLAGS.SPATIAL_INDEX=false일 때만 실행 (JS 폴백)
```

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

### 1.5 Phase 1 산출물

- [ ] `spatial_index.rs` 구현 (i64 키 인코딩, 내부 bounds 캐시 포함)
- [ ] `idMapper.ts` 구현 (string ↔ u32 양방향 매핑)
- [ ] `spatialIndex.ts` TypeScript 바인딩
- [ ] `elementRegistry.ts` 수정 (SpatialIndex 동기화)
- [ ] `useViewportCulling.ts` 수정 (SpatialIndex 쿼리)
- [ ] `SelectionLayer.utils.ts` 수정 (라쏘 선택에 SpatialIndex `query_rect` 적용)
- [ ] 단위 테스트: Rust `wasm-pack test` (삽입, 삭제, 쿼리, query_rect, 엣지 케이스)
- [ ] 통합 테스트: 1,000개 요소 뷰포트 쿼리 벤치마크
- [ ] Feature Flag (`VITE_WASM_SPATIAL`)로 A/B 비교

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

> `collapseMargins()` (626행)은 3줄 산술 연산이라 개별 WASM 위임 시
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
    pub float_type: u8,       // 0=none, 1=left, 2=right
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
    ///   6. float 요소 별도 처리
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

            // Width: auto(≤0) → available_width, 아니면 지정값
            let final_width = if child_width <= 0.0 { available_width } else { child_width };

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

    // out-of-flow + inline LineBox + block 레이아웃 병합
    return [...blockLayouts, ...outOfFlowLayouts, ...lineBoxLayouts];
  }
  // 기존 JS 로직 유지 (폴백)
  // ...
}

// JS 전처리: 복잡한 CSS 분기를 처리하고 정규화된 블록 레벨 자식만 반환
// WASM calculate()는 "모든 자식이 블록 레벨"인 정규화된 입력만 처리한다.
// 따라서 아래 5가지 책임을 모두 이 단계에서 해결해야 한다.
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
      this.flushInlineBuffer(inlineBuffer, lineBoxLayouts, parent); // 누적 inline 처리
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
    this.flushInlineBuffer(inlineBuffer, lineBoxLayouts, parent);

    // 4. CSS Blockification: flex/grid 컨테이너의 자식 중
    //    inline 레벨이 블록으로 승격되는 경우 (§9.7)
    //    → 이미 isInlineLevel 분기에서 걸러졌으므로, 여기 도달한 요소는 블록 레벨
    const blockified = this.applyBlockification(child, parent);

    // 5. BFC 경계 판별 → serializeChildren에서 bfc_flag로 WASM에 전달
    //    (createsBFC 결과는 serializeChildren 단계에서 읽음)
    normalizedChildren.push(blockified);
  }

  // 마지막 inline 버퍼 flush
  this.flushInlineBuffer(inlineBuffer, lineBoxLayouts, parent);

  return { normalizedChildren, outOfFlowLayouts, lineBoxLayouts };
}

// inline-block 버퍼를 LineBox로 변환 (기존 JS calculateLineBox 로직 위임)
private flushInlineBuffer(
  buffer: Element[], lineBoxLayouts: ComputedLayout[], parent: Element
): void {
  if (buffer.length === 0) return;
  lineBoxLayouts.push(...this.calculateLineBox(buffer, parent));
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
- [ ] 벤치마크: 요소 수별(10, 50, 100, 500) 레이아웃 재계산 시간 비교

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

> **제거 사유:** 대상 연산이 WASM 최적화에 부적합하다.
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
- `styleToLayout()` — 전체 변환 (357줄)

### 3.2 대안: WASM 대신 권장하는 최적화

| 병목 | WASM 대신 권장 방법 | 이유 |
|------|-------------------|------|
| 텍스트 렌더링 | PixiJS BitmapText 전환 | 래스터 기반, GPU 텍스처 캐시 활용 |
| CSS 파싱 반복 | 결과 메모이제이션 (JS Map 캐시) | 동일 스타일 반복 파싱 방지 |
| 데코레이션 계산 | 결과 캐싱 (fontSize+textHeight 키) | 변경 시에만 재계산 |

> Phase 3의 Rust/TS 구현 코드와 통합 코드는 제거됨 (WASM 부적합 판정).
> Phase 0 벤치마크에서 이 영역이 병목으로 확인되면 위 대안 표의 JS 최적화를 먼저 적용한다.

---

## Phase 4: Web Worker 통합 및 최종 최적화

> 목표: 무거운 WASM 연산을 메인 스레드에서 분리
> 핵심 과제: **비동기 레이아웃 결과의 동기 렌더링 파이프라인 통합**

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
      .then(result => {
        // RAF에서 적용 (렌더 타이밍에 맞춤)
        this.pendingRequest = requestAnimationFrame(() => {
          this.applyLayout(children, result);
          this.pendingRequest = null;
        });
      });
  }

  // 현재 유효한 레이아웃 반환 (동기)
  getLayout(elementId: string): ComputedLayout | null {
    return this.lastValidLayout.get(elementId) ?? null;
  }

  private applyLayout(children: Element[], result: Float32Array): void {
    children.forEach((child, i) => {
      const layout = {
        x: result[i * 4], y: result[i * 4 + 1],
        width: result[i * 4 + 2], height: result[i * 4 + 3],
      };
      this.lastValidLayout.set(child.id, layout);
      // 메인 스레드 SpatialIndex 갱신 (4.7절: 인덱스는 메인 스레드에만 존재)
      updateElement(child.id, layout.x, layout.y, layout.width, layout.height);
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
  | { type: 'BLOCK_LAYOUT_RESULT'; layouts: Float32Array }
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
      const childrenData = serializeChildren(children);
      const wasmResult = blockEngine.calculate(width, height, childrenData, 7);
      // WASM 반환값은 선형 메모리의 뷰이므로 직접 transfer하면 메모리가 분리된다.
      // 반드시 새 버퍼에 복사한 뒤 transfer해야 한다.
      const result = new Float32Array(wasmResult);
      self.postMessage(
        { type: 'BLOCK_LAYOUT_RESULT', layouts: result },
        { transfer: [result.buffer] }
      );
      break;
    }

    case 'CALCULATE_GRID_LAYOUT': {
      const { parent, children, width, height } = event.data;
      const style = parent.props?.style;
      const tracksX = gridEngine.parse_tracks(style.gridTemplateColumns, width, 0);
      const tracksY = gridEngine.parse_tracks(style.gridTemplateRows ?? 'auto', height, 0);
      const wasmResult = gridEngine.calculate_cell_positions(tracksX, tracksY, 0, 0, children.length);
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

## WASM 초기화 통합

### 전체 초기화 순서

```typescript
// wasm-bindings/init.ts

import { initSpatialWasm } from './spatialIndex';
import { initLayoutWasm } from './layoutAccelerator';
import { WASM_FLAGS } from './featureFlags';

let wasmReady = false;

export async function initAllWasm(): Promise<void> {
  if (wasmReady) return;

  try {
    const tasks: Promise<void>[] = [];

    // 각 init*Wasm()이 내부에서 init()을 호출하므로
    // 어떤 플래그 조합이든 WASM 바이너리 로드가 보장된다.
    // wasm-pack의 init()은 멱등(중복 호출 안전)하므로 병렬 실행해도 무방하다.
    if (WASM_FLAGS.SPATIAL_INDEX) tasks.push(initSpatialWasm());
    if (WASM_FLAGS.LAYOUT_ENGINE) tasks.push(initLayoutWasm());

    await Promise.all(tasks);
    wasmReady = true;
    console.log('[WASM] 모듈 초기화 완료', {
      spatial: WASM_FLAGS.SPATIAL_INDEX,
      layout: WASM_FLAGS.LAYOUT_ENGINE,
    });
  } catch (error) {
    console.error('[WASM] 초기화 실패, JS 폴백 사용:', error);
  }
}

export function isWasmReady(): boolean {
  return wasmReady;
}
```

**Feature Flag (수정됨):**
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

**앱 진입점에서 호출:**
```typescript
// BuilderCanvas.tsx 또는 Workspace.tsx

import { initAllWasm } from '../wasm-bindings/init';
import { initYoga } from '../canvas/layout/initYoga';

useEffect(() => {
  // Yoga와 커스텀 WASM 모듈 병렬 초기화
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

### WASM 바이너리 크기 예산 (수정됨)

| 모듈 | 예상 크기 (gzip) | 한도 |
|------|-----------------|------|
| spatial_index | ~10KB | 20KB |
| block_layout + grid_layout | ~20KB | 40KB |
| **합계** | **~30KB** | **60KB** |

> Phase 3(text_engine + css_parser)이 제거되어 바이너리 크기가 ~15KB 감소.

---

## 전체 로드맵 요약 (수정됨)

```
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
```

### 성능 목표 (Phase 0 이후 업데이트)

| 지표 | 목표 | 검증 시점 |
|------|------|----------|
| Viewport Culling | O(n) → O(k) | Phase 1 완료 후 |
| 라쏘 선택 | O(n) → O(k) (query_rect) | Phase 1 완료 후 |
| 레이아웃 재계산 | 실측 기준선 대비 개선 | Phase 2 완료 후 |
| 메인 스레드 부하 | UI jank 제거 | Phase 4 완료 후 |
| WASM 바이너리 | < 60KB (gzip) | 전체 |

> **핵심 원칙:**
> 1. 벤치마크 없는 추정치를 신뢰하지 않는다 — Phase 0에서 실측한다.
> 2. WASM 경계 넘기는 최소화한다 — 배치 단위로만 호출한다.
> 3. 기존 JS 캐시로 충분하면 WASM을 도입하지 않는다 — 복잡도 비용을 고려한다.
> 4. 모든 WASM 경로에 JS 폴백을 유지한다 — Feature Flag로 즉시 롤백 가능.

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
