/**
 * Layout Engine Bridge (ADR-100)
 *
 * Factory that returns the appropriate layout engine based on feature flags.
 * USE_RUST_LAYOUT_ENGINE=false → existing TaffyLayout
 * USE_RUST_LAYOUT_ENGINE=true  → new XStudioLayout (Phase 1 complete)
 */

import { isUnifiedFlag } from "./featureFlags";
import { TaffyLayout } from "./taffyLayout";
import type { LayoutResult } from "./taffyLayout";

/**
 * Common layout engine interface.
 * Both TaffyLayout and XStudioLayout implement these methods.
 */
export interface LayoutEngineAPI {
  isAvailable(): boolean;
  createNode(styleJson: string): number;
  createNodeRaw(styleJson: string): number;
  computeLayout(root: number, availW: number, availH: number): void;
  getLayout(handle: number): LayoutResult;
  getLayoutsBatch(handles: number[]): Map<number, LayoutResult>;
  removeNode(handle: number): void;
  markDirty(handle: number): void;
  clear(): void;
  nodeCount(): number;
}

/**
 * Create a layout engine instance based on the current feature flag.
 *
 * When USE_RUST_LAYOUT_ENGINE is false (default), returns TaffyLayout.
 * When true, returns the new XStudioLayout wrapper.
 */
export function createLayoutEngine(): LayoutEngineAPI {
  if (isUnifiedFlag("USE_RUST_LAYOUT_ENGINE")) {
    // Phase 1 완료 후 활성화:
    // const { XStudioLayout } = await import('./layoutEngine');
    // return new XStudioLayout();
    console.warn(
      "[ADR-100] USE_RUST_LAYOUT_ENGINE flag is true but new engine not yet wired. Falling back to TaffyLayout.",
    );
  }

  return new TaffyLayout() as unknown as LayoutEngineAPI;
}
