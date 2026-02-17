/**
 * Layout Engine 디스패처
 *
 * display 속성에 따라 적절한 레이아웃 엔진을 선택합니다.
 *
 * Phase 9 엔진 구성:
 * - flex/inline-flex  → TaffyFlexEngine (Taffy WASM)
 * - grid/inline-grid  → TaffyGridEngine (Taffy WASM)
 * - block/inline 등   → DropflowBlockEngine (기본)
 *
 * WASM 미로드 시 DropflowBlockEngine으로 폴백.
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-02-17 Phase 9A - 레거시 엔진(BlockEngine, FlexEngine, GridEngine) 삭제
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { DropflowBlockEngine } from './DropflowBlockEngine';
import { TaffyFlexEngine } from './TaffyFlexEngine';
import { TaffyGridEngine } from './TaffyGridEngine';
import { isRustWasmReady } from '../../wasm-bindings/rustWasm';

// Re-export types
export type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
export type { Margin, BoxModel, VerticalAlign, LineBoxItem, LineBox } from './types';

// Re-export utilities
export {
  parseMargin,
  parsePadding,
  parseBorder,
  parseBoxModel,
  parseSize,
  calculateContentWidth,
  calculateContentHeight,
  resetWarnedTokens,
  // 🚀 Phase 6: vertical-align, line-height
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
} from './utils';

// 싱글톤 엔진 인스턴스
const dropflowBlockEngine = new DropflowBlockEngine();
const taffyFlexEngine = new TaffyFlexEngine();
const taffyGridEngine = new TaffyGridEngine();

/**
 * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
 *
 * BFC 생성 조건: flow-root, flex, grid, inline-block, overflow 등
 */
export function createsBFC(element: Element): boolean {
  return dropflowBlockEngine.createsBFC(element);
}

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
 *
 * - 'flex' | 'inline-flex'  → TaffyFlexEngine
 * - 'grid' | 'inline-grid'  → TaffyGridEngine
 * - 'block' | 그 외          → DropflowBlockEngine
 *
 * WASM 미로드 시 DropflowBlockEngine으로 안전하게 폴백.
 */
export function selectEngine(display: string | undefined): LayoutEngine {
  const wasmReady = isRustWasmReady();

  switch (display) {
    case 'flex':
    case 'inline-flex':
      return wasmReady ? taffyFlexEngine : dropflowBlockEngine;

    case 'grid':
    case 'inline-grid':
      return wasmReady ? taffyGridEngine : dropflowBlockEngine;

    case 'block':
    case 'inline-block':
    case 'flow-root':
    case 'inline':
      return dropflowBlockEngine;

    case undefined:
      return dropflowBlockEngine;

    default:
      return dropflowBlockEngine;
  }
}

/**
 * 요소의 자식들에 대한 레이아웃 계산
 */
export function calculateChildrenLayout(
  parent: Element,
  children: Element[],
  availableWidth: number,
  availableHeight: number,
  context?: LayoutContext
): ComputedLayout[] {
  const style = parent.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  const engine = selectEngine(display);

  return engine.calculate(parent, children, availableWidth, availableHeight, context);
}
