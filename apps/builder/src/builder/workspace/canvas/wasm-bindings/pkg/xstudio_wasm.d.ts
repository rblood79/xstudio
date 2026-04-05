/* tslint:disable */
/* eslint-disable */

/**
 * Grid-cell based spatial index for O(k) viewport culling and lasso selection.
 *
 * Elements are stored in scene coordinates. Queries transform viewport/lasso
 * bounds to scene space before lookup.
 *
 * Cell key encoding: `(cx as i64) << 32 | (cy as u32 as i64)`
 */
export class SpatialIndex {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Batch insert/update from a flat Float32Array.
     * Format: [id, x, y, w, h, id, x, y, w, h, ...]
     * Each record is 5 floats. The id is cast to u32.
     */
    batch_upsert(data: Float32Array): void;
    /**
     * Clear all elements from the index.
     */
    clear(): void;
    /**
     * Return the number of indexed elements.
     */
    count(): number;
    /**
     * Create a new SpatialIndex with the given cell size (in scene pixels).
     * Recommended: 256 for typical canvas applications.
     */
    constructor(cell_size: number);
    /**
     * Query elements containing a specific point (scene coordinates).
     * Returns element IDs (front-to-back order not guaranteed).
     */
    query_point(px: number, py: number): Uint32Array;
    /**
     * Query elements intersecting a lasso/selection rectangle (scene coordinates).
     * Returns a deduplicated array of element IDs.
     */
    query_rect(left: number, top: number, right: number, bottom: number): Uint32Array;
    /**
     * Query elements intersecting a viewport rectangle (scene coordinates).
     * Returns a deduplicated array of element IDs.
     */
    query_viewport(left: number, top: number, right: number, bottom: number): Uint32Array;
    /**
     * Remove an element from the index.
     */
    remove(id: number): void;
    /**
     * Insert or update an element's bounds in the index.
     */
    upsert(id: number, x: number, y: number, w: number, h: number): void;
}

/**
 * Maps external usize handles to internal `NodeId`s.
 * Handles are stable across tree mutations; removed slots are recycled.
 */
export class TaffyLayoutEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Build an entire tree in a single WASM call.
     *
     * Input: JSON array of nodes in topological order (leaves first, root last).
     * Returns: handle for each node (1:1 correspondence with input indices).
     *
     * Compared to individual create_node() calls:
     * - WASM boundary crossings: N → 1
     * - JSON parsing: N → 1 (single serde_json::from_str)
     * - Vec allocation: N → 1 (pre-allocated capacity)
     *
     * Error policy: returns Result::Err on parse failure, child index out of range,
     * or Taffy node creation failure. No silent drops (filter_map) or panics (unwrap).
     */
    build_tree_batch(nodes_json: string): Uint32Array;
    /**
     * Build an entire tree from a binary-encoded buffer in a single WASM call.
     *
     * Replaces `build_tree_batch()` with zero JSON parsing:
     * - TypeScript encodes styles as TypedArray via `encodeBatchBinary()`
     * - Rust decodes directly to `taffy::Style` (no StyleInput/convert_style)
     * - Grid track arrays are passed as JSON sideband within the binary buffer
     *
     * Returns: handle for each node (1:1 correspondence with input).
     */
    build_tree_batch_binary(data: Uint8Array): Uint32Array;
    /**
     * Clear the entire tree and reset all handles.
     */
    clear(): void;
    /**
     * Compute layout for the tree rooted at `handle`.
     */
    compute_layout(handle: number, available_width: number, available_height: number): void;
    /**
     * Create a leaf node with the given style JSON and return its handle.
     */
    create_node(style_json: string): number;
    /**
     * Create a node with the given style JSON and child handles.
     */
    create_node_with_children(style_json: string, children_handles: Uint32Array): number;
    /**
     * Retrieve the computed layout for a node as a JSON string.
     */
    get_layout(handle: number): string;
    /**
     * Batch retrieve layouts for multiple nodes as a flat Float32Array.
     * Returns [x0, y0, w0, h0, x1, y1, w1, h1, ...].
     */
    get_layouts_batch(handles: Uint32Array): Float32Array;
    /**
     * Mark a node as dirty so the next compute_layout() recalculates it.
     *
     * Taffy propagates dirty flags up to ancestors automatically,
     * so only the directly changed node needs to be marked.
     *
     * Note: set_style() and set_children() call mark_dirty() internally,
     * so this method is only needed for explicit cache invalidation.
     */
    mark_dirty(handle: number): void;
    /**
     * Create a new Taffy layout engine instance.
     */
    constructor();
    /**
     * Return the total number of active (non-freed) nodes.
     */
    node_count(): number;
    /**
     * Remove a node from the tree and free its handle for reuse.
     */
    remove_node(handle: number): void;
    /**
     * Set the children of a node (replaces existing children).
     */
    set_children(handle: number, children_handles: Uint32Array): void;
    /**
     * Update the style of an existing node.
     */
    update_style(handle: number, style_json: string): void;
}

/**
 * Simple addition for WASM pipeline verification.
 */
export function add(a: number, b: number): number;

/**
 * Calculate block layout for pre-processed children.
 *
 * # Arguments
 * * `data` - Flat Float32Array with FIELD_COUNT fields per child
 * * `available_width` - Parent's available content width
 * * `available_height` - Parent's available content height
 * * `can_collapse_top` - Whether first child can collapse with parent top
 * * `can_collapse_bottom` - Whether last child can collapse with parent bottom
 * * `prev_sibling_margin_bottom` - Previous sibling's margin bottom (context)
 *
 * # Returns
 * Float32Array: [x, y, w, h, ...] for each child, plus 2 trailing values:
 * [firstChildMarginTop, lastChildMarginBottom]
 */
export function block_layout(data: Float32Array, available_width: number, available_height: number, can_collapse_top: boolean, can_collapse_bottom: boolean, prev_sibling_margin_bottom: number): Float32Array;

/**
 * Calculate grid cell positions for auto-flow (row-major) children.
 *
 * # Arguments
 * * `tracks_x` - Column track sizes from parse_tracks()
 * * `tracks_y` - Row track sizes from parse_tracks()
 * * `col_gap` - Column gap in pixels
 * * `row_gap` - Row gap in pixels
 * * `child_count` - Number of children to position
 *
 * # Returns
 * Float32Array: [x, y, w, h, ...] for each child (4 values per child)
 */
export function calculate_cell_positions(tracks_x: Float32Array, tracks_y: Float32Array, col_gap: number, row_gap: number, child_count: number): Float32Array;

/**
 * Parse a CSS grid-template-columns/rows string into resolved track sizes.
 *
 * Supports: `px`, `fr`, `%`, `auto` units.
 * Example: "1fr 2fr 100px" with available=400 → [100, 200, 100]
 *
 * # Arguments
 * * `template` - CSS grid template string (e.g., "1fr 2fr 100px")
 * * `available` - Available space in pixels for the axis
 * * `gap` - Gap between tracks in pixels
 *
 * # Returns
 * Float32Array of resolved track sizes in pixels
 */
export function parse_tracks(template: string, available: number, gap: number): Float32Array;

/**
 * Minimal ping/pong test to verify WASM pipeline works.
 */
export function ping(): string;

/**
 * Exposed margin collapse for debugging/testing from JS
 */
export function wasm_collapse_margins(a: number, b: number): number;
