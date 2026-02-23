/**
 * Layout Engine WASM 가속기
 *
 * BlockEngine, GridEngine의 레이아웃 루프를 Rust WASM에 위임한다.
 * JS 전처리(스타일 파싱, BFC 판별, CSS Blockification) 후
 * 정규화된 Float32Array를 WASM에 전달하고 결과를 역직렬화한다.
 *
 * @see docs/WASM.md §Phase 2: Layout Engine 배치 가속
 */

import { getRustWasm } from './rustWasm';

/** Block layout field count per child (must match Rust FIELD_COUNT) */
export const BLOCK_FIELD_COUNT = 19;

/** Display type constants (must match Rust) */
export const DISPLAY = {
  BLOCK: 0,
  INLINE_BLOCK: 1,
  EMPTY_BLOCK: 2,
} as const;

/** Vertical align constants (must match Rust) */
export const VALIGN = {
  BASELINE: 0,
  TOP: 1,
  MIDDLE: 2,
  BOTTOM: 3,
} as const;

/** Sentinel for "auto" value */
export const AUTO = -1;

/** Sentinel for "fit-content" value (must match Rust FIT_CONTENT) */
export const FIT_CONTENT = -2;

// ── Block Layout ──

export interface BlockLayoutInput {
  display: number; // DISPLAY constant
  width: number; // AUTO for auto
  height: number; // AUTO for auto
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  bfcFlag: number; // 0 or 1
  padBorderV: number; // padding + border vertical
  padBorderH: number; // padding + border horizontal
  minWidth: number; // AUTO for none
  maxWidth: number; // AUTO for none
  minHeight: number; // AUTO for none
  maxHeight: number; // AUTO for none
  contentWidth: number;
  contentHeight: number;
  verticalAlign: number; // VALIGN constant
  baseline: number;
  lineHeight: number; // AUTO for auto
}

export interface BlockLayoutResult {
  positions: Float32Array;
  firstChildMarginTop: number;
  lastChildMarginBottom: number;
}

/**
 * WASM block layout 실행.
 * JS에서 전처리된 children 데이터를 받아 WASM 레이아웃 계산 후 결과 반환.
 */
export function wasmBlockLayout(
  children: BlockLayoutInput[],
  availableWidth: number,
  availableHeight: number,
  canCollapseTop: boolean,
  canCollapseBottom: boolean,
  prevSiblingMarginBottom: number,
): BlockLayoutResult | null {
  const wasm = getRustWasm();
  if (!wasm) return null;

  const count = children.length;
  if (count === 0) {
    return {
      positions: new Float32Array(0),
      firstChildMarginTop: 0,
      lastChildMarginBottom: 0,
    };
  }

  // Serialize to flat Float32Array
  const data = new Float32Array(count * BLOCK_FIELD_COUNT);
  for (let i = 0; i < count; i++) {
    const c = children[i];
    const off = i * BLOCK_FIELD_COUNT;
    data[off] = c.display;
    data[off + 1] = c.width;
    data[off + 2] = c.height;
    data[off + 3] = c.marginTop;
    data[off + 4] = c.marginRight;
    data[off + 5] = c.marginBottom;
    data[off + 6] = c.marginLeft;
    data[off + 7] = c.bfcFlag;
    data[off + 8] = c.padBorderV;
    data[off + 9] = c.padBorderH;
    data[off + 10] = c.minWidth;
    data[off + 11] = c.maxWidth;
    data[off + 12] = c.minHeight;
    data[off + 13] = c.maxHeight;
    data[off + 14] = c.contentWidth;
    data[off + 15] = c.contentHeight;
    data[off + 16] = c.verticalAlign;
    data[off + 17] = c.baseline;
    data[off + 18] = c.lineHeight;
  }

  const result = wasm.block_layout(
    data,
    availableWidth,
    availableHeight,
    canCollapseTop,
    canCollapseBottom,
    prevSiblingMarginBottom,
  );

  const metaOff = count * 4;
  return {
    positions: result.slice(0, metaOff),
    firstChildMarginTop: result[metaOff] ?? 0,
    lastChildMarginBottom: result[metaOff + 1] ?? 0,
  };
}

// ── Grid Layout ──

/**
 * WASM grid track 파싱.
 * CSS grid-template-columns/rows 문자열을 해석하여 track 크기 배열 반환.
 */
export function wasmParseTracks(
  template: string,
  available: number,
  gap: number,
): Float32Array | null {
  const wasm = getRustWasm();
  if (!wasm) return null;
  return wasm.parse_tracks(template, available, gap);
}

/**
 * WASM grid cell 위치 계산.
 * auto-flow (row-major) 기준으로 각 자식의 위치를 계산.
 */
export function wasmGridCellPositions(
  tracksX: Float32Array,
  tracksY: Float32Array,
  colGap: number,
  rowGap: number,
  childCount: number,
): Float32Array | null {
  const wasm = getRustWasm();
  if (!wasm) return null;
  return wasm.calculate_cell_positions(tracksX, tracksY, colGap, rowGap, childCount);
}
