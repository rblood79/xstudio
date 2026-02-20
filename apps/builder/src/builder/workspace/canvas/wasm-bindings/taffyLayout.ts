/**
 * Taffy Layout Engine TypeScript Wrapper
 *
 * WASM TaffyLayoutEngine에 대한 타입 안전 래퍼.
 * JSON 기반 스타일 API로 WASM 경계 호출을 최소화한다.
 *
 * @see docs/adr/003-canvas-rendering.md
 * @see wasm/src/taffy_bridge.rs
 */

import { getRustWasm, isRustWasmReady } from './rustWasm';

// ─── Style types ─────────────────────────────────────────────────────

export type TaffyDisplay = 'flex' | 'grid' | 'block' | 'none';
export type TaffyPosition = 'relative' | 'absolute';
export type TaffyOverflow = 'visible' | 'hidden' | 'clip' | 'scroll';
export type TaffyFlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type TaffyFlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type TaffyJustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'start'
  | 'end'
  | 'stretch';
export type TaffyAlignItems =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'start'
  | 'end';
export type TaffyAlignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'start'
  | 'end';
export type TaffyAlignSelf =
  | 'auto'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'start'
  | 'end';
export type TaffyGridAutoFlow = 'row' | 'column' | 'row-dense' | 'column-dense';
export type TaffyJustifyItems =
  | 'start'
  | 'end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'flex-start'
  | 'flex-end';
export type TaffyJustifySelf =
  | 'auto'
  | 'start'
  | 'end'
  | 'center'
  | 'stretch'
  | 'baseline'
  | 'flex-start'
  | 'flex-end';

/** CSS-like dimension value: "100px", "50%", "auto", plain number (treated as px). */
export type TaffyDimensionValue = string | number;

/** Grid track definition: "1fr", "100px", "auto", "minmax(100px, 1fr)". */
export type TaffyTrackValue = string;

/** Grid placement: "1", "span 2", "auto", or a number. */
export type TaffyGridPlacement = string | number;

/**
 * Taffy style input matching the Rust `StyleInput` schema.
 * All fields are optional — unset fields use Taffy's Style::DEFAULT.
 */
export interface TaffyStyle {
  // Display & position
  display?: TaffyDisplay;
  position?: TaffyPosition;
  overflowX?: TaffyOverflow;
  overflowY?: TaffyOverflow;

  // Flex container
  flexDirection?: TaffyFlexDirection;
  flexWrap?: TaffyFlexWrap;
  justifyContent?: TaffyJustifyContent;
  justifyItems?: TaffyJustifyItems;
  alignItems?: TaffyAlignItems;
  alignContent?: TaffyAlignContent;

  // Flex item
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: TaffyDimensionValue;
  alignSelf?: TaffyAlignSelf;
  justifySelf?: TaffyJustifySelf;
  order?: number;

  // Grid container
  gridTemplateColumns?: TaffyTrackValue[];
  gridTemplateRows?: TaffyTrackValue[];
  gridAutoFlow?: TaffyGridAutoFlow;
  gridAutoColumns?: TaffyTrackValue[];
  gridAutoRows?: TaffyTrackValue[];

  // Grid item
  gridColumnStart?: TaffyGridPlacement;
  gridColumnEnd?: TaffyGridPlacement;
  gridRowStart?: TaffyGridPlacement;
  gridRowEnd?: TaffyGridPlacement;

  // Size
  width?: TaffyDimensionValue;
  height?: TaffyDimensionValue;
  minWidth?: TaffyDimensionValue;
  minHeight?: TaffyDimensionValue;
  maxWidth?: TaffyDimensionValue;
  maxHeight?: TaffyDimensionValue;

  // Margin
  marginTop?: TaffyDimensionValue;
  marginRight?: TaffyDimensionValue;
  marginBottom?: TaffyDimensionValue;
  marginLeft?: TaffyDimensionValue;

  // Padding
  paddingTop?: TaffyDimensionValue;
  paddingRight?: TaffyDimensionValue;
  paddingBottom?: TaffyDimensionValue;
  paddingLeft?: TaffyDimensionValue;

  // Border
  borderTop?: TaffyDimensionValue;
  borderRight?: TaffyDimensionValue;
  borderBottom?: TaffyDimensionValue;
  borderLeft?: TaffyDimensionValue;

  // Inset (position offsets)
  insetTop?: TaffyDimensionValue;
  insetRight?: TaffyDimensionValue;
  insetBottom?: TaffyDimensionValue;
  insetLeft?: TaffyDimensionValue;

  // Gap
  columnGap?: TaffyDimensionValue;
  rowGap?: TaffyDimensionValue;

  // Aspect ratio
  aspectRatio?: number;
}

/** Computed layout result for a single node. */
export interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Node handle type ────────────────────────────────────────────────

/** Opaque handle to a Taffy node. */
export type TaffyNodeHandle = number;

// ─── WASM engine interface ───────────────────────────────────────────

/**
 * TypeScript interface matching the wasm-bindgen generated class.
 * This avoids `any` by explicitly typing the WASM module shape.
 */
interface WasmTaffyLayoutEngine {
  new (): WasmTaffyLayoutEngine;
  create_node(style_json: string): number;
  create_node_with_children(style_json: string, children_handles: Uint32Array): number;
  update_style(handle: number, style_json: string): void;
  set_children(handle: number, children_handles: Uint32Array): void;
  compute_layout(handle: number, available_width: number, available_height: number): void;
  get_layout(handle: number): string;
  get_layouts_batch(handles: Uint32Array): Float32Array;
  remove_node(handle: number): void;
  clear(): void;
  node_count(): number;
  free(): void;
}

interface WasmModuleWithTaffy {
  TaffyLayoutEngine: { new (): WasmTaffyLayoutEngine };
}

// ─── Helper ──────────────────────────────────────────────────────────

/** Convert a TaffyDimensionValue to string for JSON serialization. */
function dimToString(v: TaffyDimensionValue): string {
  if (typeof v === 'number') return `${v}px`;
  return v;
}

/** Normalize style values for JSON serialization to Rust. */
function normalizeStyle(style: TaffyStyle): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Direct string/number fields
  if (style.display !== undefined) result.display = style.display;
  if (style.position !== undefined) result.position = style.position;
  if (style.overflowX !== undefined) result.overflowX = style.overflowX;
  if (style.overflowY !== undefined) result.overflowY = style.overflowY;
  if (style.flexDirection !== undefined) result.flexDirection = style.flexDirection;
  if (style.flexWrap !== undefined) result.flexWrap = style.flexWrap;
  if (style.justifyContent !== undefined) result.justifyContent = style.justifyContent;
  if (style.justifyItems !== undefined) result.justifyItems = style.justifyItems;
  if (style.alignItems !== undefined) result.alignItems = style.alignItems;
  if (style.alignContent !== undefined) result.alignContent = style.alignContent;
  if (style.flexGrow !== undefined) result.flexGrow = style.flexGrow;
  if (style.flexShrink !== undefined) result.flexShrink = style.flexShrink;
  if (style.alignSelf !== undefined) result.alignSelf = style.alignSelf;
  if (style.justifySelf !== undefined) result.justifySelf = style.justifySelf;
  if (style.order !== undefined) result.order = style.order;
  if (style.gridAutoFlow !== undefined) result.gridAutoFlow = style.gridAutoFlow;
  if (style.aspectRatio !== undefined) result.aspectRatio = style.aspectRatio;

  // Dimension values (number → "Npx")
  if (style.flexBasis !== undefined) result.flexBasis = dimToString(style.flexBasis);
  if (style.width !== undefined) result.width = dimToString(style.width);
  if (style.height !== undefined) result.height = dimToString(style.height);
  if (style.minWidth !== undefined) result.minWidth = dimToString(style.minWidth);
  if (style.minHeight !== undefined) result.minHeight = dimToString(style.minHeight);
  if (style.maxWidth !== undefined) result.maxWidth = dimToString(style.maxWidth);
  if (style.maxHeight !== undefined) result.maxHeight = dimToString(style.maxHeight);
  if (style.marginTop !== undefined) result.marginTop = dimToString(style.marginTop);
  if (style.marginRight !== undefined) result.marginRight = dimToString(style.marginRight);
  if (style.marginBottom !== undefined) result.marginBottom = dimToString(style.marginBottom);
  if (style.marginLeft !== undefined) result.marginLeft = dimToString(style.marginLeft);
  if (style.paddingTop !== undefined) result.paddingTop = dimToString(style.paddingTop);
  if (style.paddingRight !== undefined) result.paddingRight = dimToString(style.paddingRight);
  if (style.paddingBottom !== undefined) result.paddingBottom = dimToString(style.paddingBottom);
  if (style.paddingLeft !== undefined) result.paddingLeft = dimToString(style.paddingLeft);
  if (style.borderTop !== undefined) result.borderTop = dimToString(style.borderTop);
  if (style.borderRight !== undefined) result.borderRight = dimToString(style.borderRight);
  if (style.borderBottom !== undefined) result.borderBottom = dimToString(style.borderBottom);
  if (style.borderLeft !== undefined) result.borderLeft = dimToString(style.borderLeft);
  if (style.insetTop !== undefined) result.insetTop = dimToString(style.insetTop);
  if (style.insetRight !== undefined) result.insetRight = dimToString(style.insetRight);
  if (style.insetBottom !== undefined) result.insetBottom = dimToString(style.insetBottom);
  if (style.insetLeft !== undefined) result.insetLeft = dimToString(style.insetLeft);
  if (style.columnGap !== undefined) result.columnGap = dimToString(style.columnGap);
  if (style.rowGap !== undefined) result.rowGap = dimToString(style.rowGap);

  // Grid track arrays (string[] → string[])
  if (style.gridTemplateColumns !== undefined)
    result.gridTemplateColumns = style.gridTemplateColumns;
  if (style.gridTemplateRows !== undefined) result.gridTemplateRows = style.gridTemplateRows;
  if (style.gridAutoColumns !== undefined) result.gridAutoColumns = style.gridAutoColumns;
  if (style.gridAutoRows !== undefined) result.gridAutoRows = style.gridAutoRows;

  // Grid placement (number → string)
  if (style.gridColumnStart !== undefined)
    result.gridColumnStart = String(style.gridColumnStart);
  if (style.gridColumnEnd !== undefined) result.gridColumnEnd = String(style.gridColumnEnd);
  if (style.gridRowStart !== undefined) result.gridRowStart = String(style.gridRowStart);
  if (style.gridRowEnd !== undefined) result.gridRowEnd = String(style.gridRowEnd);

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * High-level TypeScript wrapper for the Taffy WASM layout engine.
 *
 * Usage:
 * ```ts
 * const taffy = new TaffyLayout();
 * if (!taffy.isAvailable()) return; // WASM not loaded
 *
 * const child = taffy.createNode({ width: 100, height: 50 });
 * const root = taffy.createNodeWithChildren(
 *   { display: 'flex', flexDirection: 'row', width: 400, height: 100 },
 *   [child],
 * );
 * taffy.computeLayout(root, 400, 100);
 * const layout = taffy.getLayout(child); // { x: 0, y: 0, width: 100, height: 50 }
 * ```
 */
export class TaffyLayout {
  private engine: WasmTaffyLayoutEngine | null = null;
  private initFailed = false;

  constructor() {
    this.tryInit();
  }

  /** Attempt to initialize from the already-loaded WASM module. */
  private tryInit(): void {
    if (this.initFailed) return;
    if (!isRustWasmReady()) return;

    const wasm = getRustWasm() as WasmModuleWithTaffy | null;
    if (!wasm?.TaffyLayoutEngine) return;

    try {
      this.engine = new wasm.TaffyLayoutEngine();
    } catch (err) {
      this.initFailed = true;
      if (import.meta.env.DEV) {
        console.warn('[TaffyLayout] WASM engine instantiation failed, falling back:', err);
      }
      this.engine = null;
    }
  }

  /** Whether the WASM engine is available and initialized. */
  isAvailable(): boolean {
    if (!this.engine && !this.initFailed && isRustWasmReady()) {
      this.tryInit();
    }
    return this.engine !== null;
  }

  /** Create a leaf node with the given style. Returns a node handle. */
  createNode(style: TaffyStyle): TaffyNodeHandle {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const json = JSON.stringify(normalizeStyle(style));
    return this.engine.create_node(json);
  }

  /** Create a node with children. Returns a node handle. */
  createNodeWithChildren(style: TaffyStyle, children: TaffyNodeHandle[]): TaffyNodeHandle {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const json = JSON.stringify(normalizeStyle(style));
    const arr = new Uint32Array(children);
    return this.engine.create_node_with_children(json, arr);
  }

  /** Update the style of an existing node. */
  updateStyle(handle: TaffyNodeHandle, style: TaffyStyle): void {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const json = JSON.stringify(normalizeStyle(style));
    this.engine.update_style(handle, json);
  }

  /** Set children for a node (replaces existing children). */
  setChildren(handle: TaffyNodeHandle, children: TaffyNodeHandle[]): void {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const arr = new Uint32Array(children);
    this.engine.set_children(handle, arr);
  }

  /** Compute layout for the tree rooted at the given node. */
  computeLayout(root: TaffyNodeHandle, availableWidth: number, availableHeight: number): void {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    this.engine.compute_layout(root, availableWidth, availableHeight);
  }

  /** Get the computed layout for a single node. */
  getLayout(handle: TaffyNodeHandle): LayoutResult {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const json = this.engine.get_layout(handle);
    return JSON.parse(json) as LayoutResult;
  }

  /**
   * Batch retrieve layouts for multiple nodes.
   * More efficient than calling getLayout() in a loop.
   * Returns a Map of handle → LayoutResult.
   */
  getLayoutsBatch(handles: TaffyNodeHandle[]): Map<TaffyNodeHandle, LayoutResult> {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    const arr = new Uint32Array(handles);
    const flat = this.engine.get_layouts_batch(arr);
    const result = new Map<TaffyNodeHandle, LayoutResult>();

    for (let i = 0; i < handles.length; i++) {
      const off = i * 4;
      result.set(handles[i], {
        x: flat[off],
        y: flat[off + 1],
        width: flat[off + 2],
        height: flat[off + 3],
      });
    }

    return result;
  }

  /** Remove a node from the tree and free its handle. */
  removeNode(handle: TaffyNodeHandle): void {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    this.engine.remove_node(handle);
  }

  /** Clear the entire tree and reset all handles. */
  clear(): void {
    if (!this.engine) throw new Error('TaffyLayout: WASM engine not initialized');
    this.engine.clear();
  }

  /** Return the total number of active nodes. */
  nodeCount(): number {
    if (!this.engine) return 0;
    return this.engine.node_count();
  }

  /** Free the WASM engine instance. Call when disposing. */
  dispose(): void {
    if (this.engine) {
      this.engine.free();
      this.engine = null;
    }
  }
}
