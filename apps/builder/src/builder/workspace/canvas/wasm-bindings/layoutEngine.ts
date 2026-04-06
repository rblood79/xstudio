/**
 * New Layout Engine TypeScript Wrapper (ADR-100)
 *
 * xstudio-layout WASM을 TaffyLayout과 동일한 인터페이스로 래핑한다.
 * USE_RUST_LAYOUT_ENGINE feature flag 활성화 시 TaffyLayout 대신 사용된다.
 *
 * @see docs/adr/100-unified-skia-engine.md
 * @see packages/xstudio-layout/src/lib.rs
 */

// ─── Types ────────────────────────────────────────────────────────────

/** Opaque handle to a layout node. Mirrors TaffyNodeHandle. */
export type LayoutNodeHandle = number;

/** Computed layout result for a single node. Mirrors taffyLayout.ts LayoutResult. */
export interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Result of update_style().
 * - Unchanged: style hash identical, no re-layout needed
 * - Dirty: style changed, layout must be recomputed
 * - NeedsFullRebuild: display property changed, full tree rebuild required
 */
export const enum UpdateResult {
  Unchanged = 0,
  Dirty = 1,
  NeedsFullRebuild = 2,
}

// ─── WASM module interface ────────────────────────────────────────────

/**
 * TypeScript interface matching the wasm-bindgen generated LayoutEngine class.
 * Avoids `any` by explicitly typing the WASM module shape.
 */
interface WasmLayoutEngine {
  is_ready(): boolean;
  version(): string;
  create_node(style_json: string): number;
  create_node_with_children(style_json: string, children: Uint32Array): number;
  update_style(handle: number, style_json: string): number;
  set_children(handle: number, children: Uint32Array): void;
  remove_node(handle: number): void;
  mark_dirty(handle: number): void;
  compute_layout(
    handle: number,
    avail_width: number,
    avail_height: number,
  ): void;
  get_layout(handle: number): string;
  get_layouts_batch(handles: Uint32Array): Float32Array;
  build_tree_batch(nodes_json: string): Uint32Array;
  node_count(): number;
  clear(): void;
  spatial_upsert(id: number, x: number, y: number, w: number, h: number): void;
  spatial_remove(id: number): void;
  spatial_query_point(x: number, y: number): Uint32Array;
  spatial_query_rect(
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): Uint32Array;
  spatial_clear(): void;
  free(): void;
}

interface WasmModule {
  LayoutEngine: { new (): WasmLayoutEngine };
}

// ─── Module state ─────────────────────────────────────────────────────

let wasmEngine: WasmLayoutEngine | null = null;
let initPromise: Promise<void> | null = null;

// ─── Init ─────────────────────────────────────────────────────────────

/**
 * Initialize the xstudio-layout WASM module.
 * Call once at startup when USE_RUST_LAYOUT_ENGINE flag is enabled.
 * Subsequent calls are no-ops (idempotent).
 */
export async function initLayoutEngine(): Promise<void> {
  if (wasmEngine) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = (await import(
        /* webpackIgnore: true */
        /* @vite-ignore */
        "/packages/xstudio-layout/pkg/xstudio_layout.js"
      )) as unknown as { default: () => Promise<WasmModule> };

      const wasm = await mod.default();

      if (!wasm?.LayoutEngine || typeof wasm.LayoutEngine !== "function") {
        if (import.meta.env.DEV) {
          console.warn("[LayoutEngine] WASM 모듈 불완전 — LayoutEngine 미포함");
        }
        return;
      }

      wasmEngine = new wasm.LayoutEngine();

      if (import.meta.env.DEV) {
        console.log(
          `[ADR-100] LayoutEngine initialized: v${wasmEngine.version()}`,
        );
      }
    } catch (err) {
      wasmEngine = null; // HMR 잔류 방지
      if (import.meta.env.DEV) {
        console.warn("[ADR-100] LayoutEngine init failed, falling back:", err);
      }
    }
  })();

  return initPromise;
}

/** Whether the engine is ready for use. */
export function isLayoutEngineReady(): boolean {
  return wasmEngine !== null && wasmEngine.is_ready();
}

// ─── Layout API (mirrors TaffyLayout interface) ───────────────────────

/**
 * High-level TypeScript wrapper for the xstudio-layout WASM engine.
 *
 * API mirrors TaffyLayout so the two can be swapped via feature flag.
 *
 * Usage:
 * ```ts
 * await initLayoutEngine();
 * const engine = new XStudioLayout();
 * if (!engine.isAvailable()) return;
 *
 * const child = engine.createNodeRaw('{"width":"100px","height":"50px"}');
 * const root = engine.createNodeWithChildrenRaw(
 *   '{"display":"flex","width":"400px","height":"100px"}',
 *   [child],
 * );
 * engine.computeLayout(root, 400, 100);
 * const layout = engine.getLayout(child); // { x: 0, y: 0, width: 100, height: 50 }
 * ```
 */
export class XStudioLayout {
  /** Whether the WASM engine is available and initialized. */
  isAvailable(): boolean {
    return isLayoutEngineReady();
  }

  // ─── Node creation ──────────────────────────────────────────────────

  /**
   * Create a leaf node with a pre-serialized JSON style string.
   * Mirrors TaffyLayout.createNodeRaw().
   */
  createNodeRaw(styleJson: string): LayoutNodeHandle {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    return wasmEngine.create_node(styleJson);
  }

  /**
   * Create a node with children using a pre-serialized JSON style string.
   * Mirrors TaffyLayout.createNodeWithChildren() — accepts raw JSON for
   * consistency with createNodeRaw().
   */
  createNodeWithChildrenRaw(
    styleJson: string,
    children: LayoutNodeHandle[],
  ): LayoutNodeHandle {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    return wasmEngine.create_node_with_children(
      styleJson,
      new Uint32Array(children),
    );
  }

  // ─── Style update ───────────────────────────────────────────────────

  /**
   * Update node style with a pre-serialized JSON string.
   * Returns UpdateResult indicating whether re-layout is needed.
   * Mirrors TaffyLayout.updateStyleRaw() but also returns an UpdateResult
   * (the new WASM exposes this; TaffyLayout's update_style returns void).
   */
  updateStyleRaw(handle: LayoutNodeHandle, styleJson: string): UpdateResult {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    return wasmEngine.update_style(handle, styleJson) as UpdateResult;
  }

  // ─── Tree management ────────────────────────────────────────────────

  /** Set children for a node (replaces existing children). */
  setChildren(handle: LayoutNodeHandle, children: LayoutNodeHandle[]): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.set_children(handle, new Uint32Array(children));
  }

  /** Remove a node from the tree and free its handle. */
  removeNode(handle: LayoutNodeHandle): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.remove_node(handle);
  }

  /**
   * Mark a node as dirty for the next computeLayout() call.
   * updateStyleRaw() and setChildren() call mark_dirty() internally —
   * use this only for explicit cache invalidation.
   */
  markDirty(handle: LayoutNodeHandle): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.mark_dirty(handle);
  }

  // ─── Layout compute ─────────────────────────────────────────────────

  /** Compute layout for the tree rooted at the given node. */
  computeLayout(
    root: LayoutNodeHandle,
    availableWidth: number,
    availableHeight: number,
  ): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.compute_layout(root, availableWidth, availableHeight);
  }

  /** Get the computed layout for a single node. */
  getLayout(handle: LayoutNodeHandle): LayoutResult {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    const json = wasmEngine.get_layout(handle);
    try {
      return JSON.parse(json) as LayoutResult;
    } catch {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  /**
   * Batch retrieve layouts for multiple nodes.
   * More efficient than calling getLayout() in a loop.
   * Returns a Map of handle → LayoutResult. Mirrors TaffyLayout.getLayoutsBatch().
   */
  getLayoutsBatch(
    handles: LayoutNodeHandle[],
  ): Map<LayoutNodeHandle, LayoutResult> {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    const floats = wasmEngine.get_layouts_batch(new Uint32Array(handles));
    const result = new Map<LayoutNodeHandle, LayoutResult>();

    for (let i = 0; i < handles.length; i++) {
      const offset = i * 4;
      result.set(handles[i], {
        x: floats[offset],
        y: floats[offset + 1],
        width: floats[offset + 2],
        height: floats[offset + 3],
      });
    }

    return result;
  }

  /**
   * Batch-build an entire node tree from a JSON array.
   * Each entry is { style, children } where children are indices into the
   * same array (post-order: leaves first, root last).
   * Returns an array of node handles in the same order as the input.
   * Mirrors TaffyLayout.buildTreeBatch().
   */
  buildTreeBatch(nodesJson: string): LayoutNodeHandle[] {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    const raw = wasmEngine.build_tree_batch(nodesJson);
    return Array.from(raw);
  }

  // ─── Utility ────────────────────────────────────────────────────────

  /** Return the total number of active nodes. */
  nodeCount(): number {
    if (!wasmEngine) return 0;
    return wasmEngine.node_count();
  }

  /** Clear the entire tree and reset all handles. */
  clear(): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.clear();
  }

  /** Free the WASM engine instance. Call when disposing. */
  dispose(): void {
    if (wasmEngine) {
      wasmEngine.free();
      wasmEngine = null;
      initPromise = null;
    }
  }

  // ─── Spatial Index API ──────────────────────────────────────────────

  /**
   * Upsert a bounding box into the spatial index.
   * Replaces any existing entry for the given id.
   */
  spatialUpsert(id: number, x: number, y: number, w: number, h: number): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.spatial_upsert(id, x, y, w, h);
  }

  /** Remove an entry from the spatial index. */
  spatialRemove(id: number): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.spatial_remove(id);
  }

  /** Query all nodes whose bounding boxes contain the given point. */
  spatialQueryPoint(x: number, y: number): Uint32Array {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    return wasmEngine.spatial_query_point(x, y);
  }

  /** Query all nodes whose bounding boxes intersect the given rect. */
  spatialQueryRect(
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): Uint32Array {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    return wasmEngine.spatial_query_rect(left, top, right, bottom);
  }

  /** Clear the spatial index. */
  spatialClear(): void {
    if (!wasmEngine)
      throw new Error("XStudioLayout: WASM engine not initialized");
    wasmEngine.spatial_clear();
  }
}
