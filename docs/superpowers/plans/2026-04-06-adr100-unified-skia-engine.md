# ADR-100 Unified Skia Rendering Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PixiJS + Taffy를 제거하고 CanvasKit/Skia 단일 렌더링 엔진으로 전환. Feature flag 기반 점진 배포.

**Architecture:** Taffy v0.10.0 fork → 단일 Rust WASM (layout + spatial index). 순수 TS SceneGraph (retained mode, dirty flag). 기존 Skia nodeRenderers 유지+확장. DOM 이벤트 + WASM hit test 유지. React 렌더 사이클 완전 제거.

**Tech Stack:** Rust (wasm-pack), TypeScript, CanvasKit/Skia WASM, Zustand, Vitest

**Design Docs:**

- ADR: `docs/adr/100-unified-skia-rendering-engine.md`
- Breakdown: `docs/design/100-unified-skia-engine-breakdown.md`

---

## Master Plan — 6 Phase 개요

| Phase | 기간 | 핵심 산출물                                         | Feature Flag                                        | Gate                           |
| :---: | :--: | --------------------------------------------------- | --------------------------------------------------- | ------------------------------ |
| **0** | 1주  | 벤치마크 인프라 + baseline 실측 + Rust crate 초기화 | —                                                   | baseline 완료 + WASM 빌드 동작 |
| **1** | 4주  | Rust Layout Engine (flex/grid/block 패리티)         | `USE_RUST_LAYOUT_ENGINE`                            | Taffy 테스트 100% 통과         |
| **2** | 3주  | SceneGraph + PixiJS 제거                            | `USE_DOM_HOVER` → `USE_SCENE_GRAPH` → `REMOVE_PIXI` | 78개 기능 파리티               |
| **3** | 3주  | Sticky + CSS3 렌더링 확장 + 정합성 갭 수정          | `USE_HYBRID_TEXT`                                   | WPT 통과 + 시각 정합성 97%     |
| **4** | 2주  | 성능 최적화 + 벤치마크 검증                         | `USE_TILE_CACHE`                                    | 5000 요소 50fps+               |
| **5** | 1주  | Production 전환                                     | `UNIFIED_ENGINE` (100%)                             | 전체 기능 + 성능 + 시각        |

> **Phase 1~5 상세 계획은 Phase 0 Gate 통과 후 작성.** baseline 실측 데이터가 있어야 정확한 태스크 분해와 성능 목표 설정 가능.

---

## Phase 0: 기반 준비 + 벤치마크 인프라 (1주)

### Task 0.1: Feature Flag 인프라

**Files:**

- Modify: `apps/builder/src/builder/workspace/canvas/wasm-bindings/featureFlags.ts`

- [ ] **Step 1: 기존 featureFlags.ts 확인**

현재 `WASM_FLAGS`에 ADR-100 flag를 추가합니다.

- [ ] **Step 2: ADR-100 feature flag 추가**

```typescript
// featureFlags.ts — 기존 WASM_FLAGS 뒤에 추가

/** ADR-100: Unified Skia Engine — 점진 전환 flag */
export const UNIFIED_ENGINE_FLAGS = {
  // Phase 1: Layout Engine 교체
  USE_RUST_LAYOUT_ENGINE: false,

  // Phase 2: PixiJS 점진 제거
  USE_DOM_HOVER: false,
  USE_DOM_CURSOR: false,
  USE_CAMERA_OBJECT: false,
  USE_SCENE_GRAPH: false,
  REMOVE_PIXI: false,

  // Phase 3: 렌더링 확장
  USE_HYBRID_TEXT: false,
  USE_CSS3_EFFECTS: false,

  // Phase 4: 성능
  USE_TILE_CACHE: false,

  // 전체 전환
  UNIFIED_ENGINE: false,
} as const;

export type UnifiedEngineFlag = keyof typeof UNIFIED_ENGINE_FLAGS;

export function isUnifiedFlag(flag: UnifiedEngineFlag): boolean {
  if (UNIFIED_ENGINE_FLAGS.UNIFIED_ENGINE) return true;
  return UNIFIED_ENGINE_FLAGS[flag];
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/wasm-bindings/featureFlags.ts
git commit -m "feat(adr-100): add unified engine feature flags"
```

---

### Task 0.2: 벤치마크 프레임워크 구축

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/benchmarks/canvasBenchmark.ts`
- Create: `apps/builder/src/builder/workspace/canvas/benchmarks/scenarios.ts`
- Modify: `apps/builder/src/builder/workspace/canvas/utils/gpuProfilerCore.ts` (percentile 추가)

- [ ] **Step 1: gpuProfilerCore에 percentile 유틸 추가**

```typescript
// gpuProfilerCore.ts — 클래스 외부에 추가

export function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
```

- [ ] **Step 2: 벤치마크 시나리오 정의**

```typescript
// benchmarks/scenarios.ts
export interface BenchmarkScenario {
  name: string;
  elements: number;
  mutationsPerFrame: number;
  duration: number; // ms
  drag?: boolean;
  zoom?: boolean;
  pages?: number;
}

export const SCENARIOS: BenchmarkScenario[] = [
  // 정적 렌더링
  { name: "static-100", elements: 100, mutationsPerFrame: 0, duration: 5000 },
  { name: "static-1000", elements: 1000, mutationsPerFrame: 0, duration: 5000 },
  { name: "static-5000", elements: 5000, mutationsPerFrame: 0, duration: 5000 },

  // 실시간 변경
  {
    name: "mutate-1000x10",
    elements: 1000,
    mutationsPerFrame: 10,
    duration: 5000,
  },
  {
    name: "mutate-5000x10",
    elements: 5000,
    mutationsPerFrame: 10,
    duration: 5000,
  },

  // 드래그
  {
    name: "drag-500",
    elements: 500,
    mutationsPerFrame: 1,
    duration: 3000,
    drag: true,
  },
  {
    name: "drag-2000",
    elements: 2000,
    mutationsPerFrame: 1,
    duration: 3000,
    drag: true,
  },

  // 줌
  {
    name: "zoom-1000",
    elements: 1000,
    mutationsPerFrame: 0,
    duration: 3000,
    zoom: true,
  },

  // 멀티페이지
  {
    name: "multipage-3x1000",
    elements: 1000,
    mutationsPerFrame: 0,
    duration: 5000,
    pages: 3,
  },
];
```

- [ ] **Step 3: 벤치마크 러너 구현**

```typescript
// benchmarks/canvasBenchmark.ts
import { percentile } from "../utils/gpuProfilerCore";
import type { BenchmarkScenario } from "./scenarios";

export interface BenchmarkResult {
  scenario: string;
  fps: { p50: number; p95: number; p99: number };
  frameTime: { p50: number; p95: number; p99: number };
  memory: { jsHeapMB: number };
  scalingExponent?: number;
}

export function runBenchmark(
  scenario: BenchmarkScenario,
  onFrame: () => void,
): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const frameTimes: number[] = [];
    let lastTime = performance.now();
    let elapsed = 0;

    function tick() {
      const now = performance.now();
      const dt = now - lastTime;
      frameTimes.push(dt);
      lastTime = now;
      elapsed += dt;

      onFrame();

      if (elapsed < scenario.duration) {
        requestAnimationFrame(tick);
      } else {
        const mem = (
          performance as unknown as { memory?: { usedJSHeapSize: number } }
        ).memory;
        resolve({
          scenario: scenario.name,
          fps: {
            p50: Math.round(1000 / percentile(frameTimes, 50)),
            p95: Math.round(1000 / percentile(frameTimes, 95)),
            p99: Math.round(1000 / percentile(frameTimes, 99)),
          },
          frameTime: {
            p50: Math.round(percentile(frameTimes, 50) * 100) / 100,
            p95: Math.round(percentile(frameTimes, 95) * 100) / 100,
            p99: Math.round(percentile(frameTimes, 99) * 100) / 100,
          },
          memory: {
            jsHeapMB: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : -1,
          },
        });
      }
    }

    requestAnimationFrame(tick);
  });
}

export function computeScalingExponent(results: BenchmarkResult[]): number {
  // log-log regression: log(frameTime) = b * log(elements) + log(a)
  const points = results
    .filter((r) => r.scenario.startsWith("static-"))
    .map((r) => ({
      logN: Math.log(parseInt(r.scenario.split("-")[1])),
      logT: Math.log(r.frameTime.p50),
    }));

  if (points.length < 2) return 1;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.logN, 0);
  const sumY = points.reduce((s, p) => s + p.logT, 0);
  const sumXY = points.reduce((s, p) => s + p.logN * p.logT, 0);
  const sumXX = points.reduce((s, p) => s + p.logN * p.logN, 0);

  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/benchmarks/ apps/builder/src/builder/workspace/canvas/utils/gpuProfilerCore.ts
git commit -m "feat(adr-100): add benchmark framework with scenarios and scaling exponent"
```

---

### Task 0.3: Baseline 측정 실행 + 문서 교체

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/benchmarks/runBaseline.ts`
- Modify: `docs/design/100-unified-skia-engine-breakdown.md` (추정치 → 실측치)

- [ ] **Step 1: baseline 실행 스크립트**

```typescript
// benchmarks/runBaseline.ts
import { SCENARIOS } from "./scenarios";
import {
  runBenchmark,
  computeScalingExponent,
  type BenchmarkResult,
} from "./canvasBenchmark";

export async function runFullBaseline(): Promise<void> {
  console.log("=== ADR-100 Baseline Benchmark ===\n");

  const results: BenchmarkResult[] = [];

  for (const scenario of SCENARIOS) {
    console.log(`Running: ${scenario.name}...`);
    // onFrame은 현재 렌더 루프가 자동 호출하므로 noop
    const result = await runBenchmark(scenario, () => {});
    results.push(result);

    console.log(
      `  FPS: p50=${result.fps.p50} p95=${result.fps.p95} p99=${result.fps.p99}`,
    );
    console.log(
      `  Frame: p50=${result.frameTime.p50}ms p95=${result.frameTime.p95}ms`,
    );
    console.log(`  Memory: ${result.memory.jsHeapMB}MB`);
  }

  const b = computeScalingExponent(results);
  console.log(`\nScaling exponent (b): ${b.toFixed(3)}`);
  console.log(`  b < 1.0 = sub-linear (good)`);
  console.log(`  b > 1.0 = super-linear (problem)`);

  console.log("\n=== Results JSON ===");
  console.log(
    JSON.stringify(
      { timestamp: new Date().toISOString(), results, scalingExponent: b },
      null,
      2,
    ),
  );
}
```

- [ ] **Step 2: 브라우저 콘솔에서 baseline 실행**

```
// 개발 서버 실행 후 브라우저 콘솔에서:
import('/src/builder/workspace/canvas/benchmarks/runBaseline').then(m => m.runFullBaseline())
```

- [ ] **Step 3: 실측값으로 design breakdown 성능 예산 표 교체**

`docs/design/100-unified-skia-engine-breakdown.md` 섹션 12의 "현재" 열을 실측값으로 교체.

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/benchmarks/runBaseline.ts docs/design/100-unified-skia-engine-breakdown.md
git commit -m "feat(adr-100): baseline benchmark runner + replace estimates with measurements"
```

---

### Task 0.4: Margin Collapse 사용률 감사

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/benchmarks/marginCollapseAudit.ts`

- [ ] **Step 1: 감사 스크립트 작성**

```typescript
// benchmarks/marginCollapseAudit.ts
// Supabase에서 전체 프로젝트를 스캔하여 block + adjacent margin 패턴 비율 측정

import { createClient } from "@supabase/supabase-js";

interface AuditResult {
  totalElements: number;
  blockWithAdjacentMargins: number;
  ratio: string;
  conclusion: "SAFE_TO_SKIP" | "NEEDS_IMPLEMENTATION";
}

export async function auditMarginCollapse(): Promise<AuditResult> {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  let totalElements = 0;
  let blockWithAdjacentMargins = 0;

  const { data: projects } = await supabase.from("projects").select("id");
  if (!projects)
    return {
      totalElements: 0,
      blockWithAdjacentMargins: 0,
      ratio: "0%",
      conclusion: "SAFE_TO_SKIP",
    };

  for (const project of projects) {
    const { data: elements } = await supabase
      .from("elements")
      .select("tag, properties")
      .eq("project_id", project.id);

    if (!elements) continue;

    for (const el of elements) {
      totalElements++;
      const style = el.properties?.style;
      if (
        style?.display === "block" &&
        (style?.marginTop || style?.marginBottom)
      ) {
        blockWithAdjacentMargins++;
      }
    }
  }

  const ratio =
    totalElements > 0
      ? ((blockWithAdjacentMargins / totalElements) * 100).toFixed(3)
      : "0";

  return {
    totalElements,
    blockWithAdjacentMargins,
    ratio: `${ratio}%`,
    conclusion:
      parseFloat(ratio) < 0.1 ? "SAFE_TO_SKIP" : "NEEDS_IMPLEMENTATION",
  };
}
```

- [ ] **Step 2: 실행 및 결과 기록**

```
// 브라우저 콘솔에서:
import('/src/builder/workspace/canvas/benchmarks/marginCollapseAudit').then(m => m.auditMarginCollapse().then(console.log))

// 예상 출력:
// { totalElements: 15234, blockWithAdjacentMargins: 8, ratio: "0.053%", conclusion: "SAFE_TO_SKIP" }
```

- [ ] **Step 3: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/benchmarks/marginCollapseAudit.ts
git commit -m "feat(adr-100): margin collapse usage audit script"
```

---

### Task 0.5: Rust WASM Crate 초기화

**Files:**

- Create: `packages/xstudio-layout/Cargo.toml`
- Create: `packages/xstudio-layout/src/lib.rs`
- Create: `packages/xstudio-layout/.cargo/config.toml`
- Modify: `package.json` (wasm 빌드 스크립트)

**Prerequisites:** `rustup`, `wasm-pack` 설치 필요.

- [ ] **Step 1: Rust 툴체인 확인**

```bash
rustup --version
wasm-pack --version
# 없으면:
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# cargo install wasm-pack
```

- [ ] **Step 2: Cargo.toml 생성**

```toml
# packages/xstudio-layout/Cargo.toml
[package]
name = "xstudio-layout"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
# 유일한 외부 의존성 — Taffy v0.10.0 fork
taffy = { version = "0.10", features = ["grid", "block_layout"] }

# WASM 바인딩
wasm-bindgen = "0.2"
js-sys = "0.3"

# 직렬화
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
panic = "abort"
opt-level = "s"
lto = true
codegen-units = 1
strip = true
```

- [ ] **Step 3: lib.rs 스켈레톤 생성**

```rust
// packages/xstudio-layout/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct LayoutEngine {
    // Phase 1에서 Taffy tree로 교체
    initialized: bool,
}

#[wasm_bindgen]
impl LayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { initialized: true }
    }

    pub fn is_ready(&self) -> bool {
        self.initialized
    }

    pub fn version(&self) -> String {
        "0.1.0-alpha".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_initializes() {
        let engine = LayoutEngine::new();
        assert!(engine.is_ready());
    }
}
```

- [ ] **Step 4: .cargo/config.toml (WASM 타겟 설정)**

```toml
# packages/xstudio-layout/.cargo/config.toml
[build]
target = "wasm32-unknown-unknown"
```

- [ ] **Step 5: 빌드 테스트**

```bash
cd packages/xstudio-layout
cargo test  # 네이티브 테스트
wasm-pack build --target web --release  # WASM 빌드
ls pkg/  # xstudio_layout.js, xstudio_layout_bg.wasm 확인
```

Expected: WASM 빌드 성공, pkg/ 디렉토리에 .js + .wasm 파일 생성.

- [ ] **Step 6: pnpm 빌드 스크립트 추가**

```json
// package.json (루트) — scripts에 추가
"build:layout": "cd packages/xstudio-layout && wasm-pack build --target web --release && wasm-opt -Os -o pkg/xstudio_layout_opt.wasm pkg/xstudio_layout_bg.wasm"
```

- [ ] **Step 7: 커밋**

```bash
git add packages/xstudio-layout/ package.json
git commit -m "feat(adr-100): initialize xstudio-layout Rust WASM crate with Taffy dependency"
```

---

### Task 0.6: SceneGraph 타입 정의 + 테스트 스캐폴딩

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/types.ts`
- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/__tests__/sceneGraph.test.ts`

- [ ] **Step 1: SceneNode 타입 정의**

```typescript
// sceneGraph/types.ts

export const enum DirtyFlags {
  NONE = 0,
  LAYOUT = 1 << 0,
  VISUAL = 1 << 1,
  CHILDREN = 1 << 2,
  TRANSFORM = 1 << 3,
  SUBTREE = 1 << 4,
}

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  tag: string;
  parentId: string | null;
  children: string[]; // child IDs (ordered)
  style: Record<string, unknown>;
  layout: ComputedLayout;
  dirty: DirtyFlags;
  visible: boolean;
  interactive: boolean;
  cursor: string;
  stackingOrder: number;
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 2: 테스트 스캐폴딩**

```typescript
// sceneGraph/__tests__/sceneGraph.test.ts
import { describe, test, expect } from "vitest";
import { DirtyFlags, type SceneNode } from "../types";

describe("SceneGraph types", () => {
  test("DirtyFlags bitwise operations", () => {
    let flags = DirtyFlags.NONE;
    flags |= DirtyFlags.LAYOUT;
    flags |= DirtyFlags.VISUAL;

    expect(flags & DirtyFlags.LAYOUT).toBeTruthy();
    expect(flags & DirtyFlags.VISUAL).toBeTruthy();
    expect(flags & DirtyFlags.CHILDREN).toBeFalsy();
  });

  test("SceneNode structure", () => {
    const node: SceneNode = {
      id: "test-1",
      tag: "Box",
      parentId: null,
      children: [],
      style: { display: "flex" },
      layout: { x: 0, y: 0, width: 100, height: 50 },
      dirty: DirtyFlags.NONE,
      visible: true,
      interactive: true,
      cursor: "default",
      stackingOrder: 0,
    };

    expect(node.id).toBe("test-1");
    expect(node.dirty).toBe(DirtyFlags.NONE);
  });
});
```

- [ ] **Step 3: 테스트 실행**

```bash
pnpm vitest run apps/builder/src/builder/workspace/canvas/sceneGraph/__tests__/sceneGraph.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/sceneGraph/
git commit -m "feat(adr-100): SceneGraph type definitions + test scaffolding"
```

---

### Task 0.7: GPU Backend 인터페이스 정의

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/gpu/GPUBackend.ts`

- [ ] **Step 1: 인터페이스 정의**

```typescript
// gpu/GPUBackend.ts

export interface GPUSurface {
  readonly width: number;
  readonly height: number;
  getCanvas(): unknown; // CanvasKit Canvas
  makeImageSnapshot(): unknown; // CanvasKit Image
  flush(): void;
  dispose(): void;
}

export interface GPUBackend {
  // Surface
  createSurface(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ): GPUSurface | null;
  createOffscreenSurface(width: number, height: number): GPUSurface | null;
  resizeSurface(
    surface: GPUSurface,
    width: number,
    height: number,
  ): GPUSurface | null;
  disposeSurface(surface: GPUSurface): void;

  // Frame
  beginFrame(surface: GPUSurface): void;
  endFrame(surface: GPUSurface): void;

  // Context
  isContextLost(): boolean;
  onContextLost(callback: () => void): void;
  onContextRestored(callback: () => void): void;

  // Info
  getMaxTextureSize(): number;
  getDevicePixelRatio(): number;

  // Cleanup
  dispose(): void;
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/gpu/
git commit -m "feat(adr-100): GPUBackend abstraction interface for WebGL/WebGPU migration path"
```

---

### Task 0.8: Constitutional Invariants 자동 검증

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/benchmarks/constitutional.ts`

- [ ] **Step 1: 불변량 정의 + 검증 함수**

```typescript
// benchmarks/constitutional.ts

export interface ConstitutionalResult {
  invariant: string;
  passed: boolean;
  actual: number;
  threshold: number;
}

export const INVARIANTS = {
  fps_p95_min: 30, // 절대 하한
  dragLatency_p99_max: 50, // ms
  initialLoad_max: 3000, // ms
  featureParity_min: 78, // 78개 기능 전부
  screenshotDiff_max: 0.001, // 0.1%
} as const;

export function checkConstitution(
  metrics: Record<string, number>,
): ConstitutionalResult[] {
  const results: ConstitutionalResult[] = [];

  for (const [key, threshold] of Object.entries(INVARIANTS)) {
    const actual = metrics[key] ?? 0;
    const isMin = key.endsWith("_min");
    const passed = isMin ? actual >= threshold : actual <= threshold;

    results.push({ invariant: key, passed, actual, threshold });
  }

  return results;
}

export function allPassed(results: ConstitutionalResult[]): boolean {
  return results.every((r) => r.passed);
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/benchmarks/constitutional.ts
git commit -m "feat(adr-100): constitutional invariants for auto-rollback"
```

---

### Task 0.9: Phase 0 Gate 검증

- [ ] **Step 1: 체크리스트 확인**

| Gate 항목              | 검증 방법                                   |
| ---------------------- | ------------------------------------------- |
| baseline 측정 완료     | `runFullBaseline()` 결과 JSON 존재          |
| 벤치마크 자동화        | `canvasBenchmark.ts` import 성공            |
| margin collapse <0.1%  | `auditMarginCollapse()` 결과 `SAFE_TO_SKIP` |
| WASM 빌드 동작         | `wasm-pack build` 성공, .wasm 파일 존재     |
| SceneGraph 타입        | vitest 2 tests PASS                         |
| GPU Backend 인터페이스 | type-check 통과                             |
| Constitutional         | `checkConstitution()` 함수 존재             |

- [ ] **Step 2: 전체 type-check**

```bash
pnpm type-check
```

Expected: 0 errors.

- [ ] **Step 3: Gate 통과 커밋**

```bash
git add -A
git commit -m "feat(adr-100): Phase 0 complete — baseline + benchmarks + Rust crate + SceneGraph types + GPU backend"
```

---

## Phase 1~5: Gate 통과 후 상세화

> Phase 0 Gate에서 baseline 실측 데이터를 확보한 후, 각 Phase의 구체적 성능 목표와 태스크를 정의합니다.
>
> **Phase 1 계획 작성 시점**: Phase 0 Gate 통과 직후
> **트리거**: baseline 스케일링 지수(b)에 따라 Phase 4 범위 조정
> **각 Phase 계획 파일**: `docs/superpowers/plans/2026-MM-DD-adr100-phase-N.md`
