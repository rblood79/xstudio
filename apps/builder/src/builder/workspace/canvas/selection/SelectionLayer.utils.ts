import { getLassoBounds } from './LassoSelection.utils';
import { queryRect } from '../wasm-bindings/spatialIndex';

export function findElementsInLasso(
  _elements: { id: string; props?: { style?: Record<string, unknown> } }[],
  lassoStart: { x: number; y: number },
  lassoCurrent: { x: number; y: number }
): string[] {
  const lassoBounds = getLassoBounds(lassoStart, lassoCurrent);

  // Phase 1: WASM SpatialIndex 경로 (씬 좌표 기반)
  return queryRect(
    lassoBounds.x,
    lassoBounds.y,
    lassoBounds.x + lassoBounds.width,
    lassoBounds.y + lassoBounds.height,
  );
}
