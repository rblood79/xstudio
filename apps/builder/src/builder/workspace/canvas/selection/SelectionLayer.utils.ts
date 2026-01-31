import { getLassoBounds } from './LassoSelection.utils';
import { calculateBounds, boxesIntersect } from './types';
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';
import { queryRect } from '../wasm-bindings/spatialIndex';

export function findElementsInLasso(
  elements: { id: string; props?: { style?: Record<string, unknown> } }[],
  lassoStart: { x: number; y: number },
  lassoCurrent: { x: number; y: number }
): string[] {
  const lassoBounds = getLassoBounds(lassoStart, lassoCurrent);

  // Phase 1: WASM SpatialIndex 경로 (씬 좌표 기반)
  if (WASM_FLAGS.SPATIAL_INDEX) {
    return queryRect(
      lassoBounds.x,
      lassoBounds.y,
      lassoBounds.x + lassoBounds.width,
      lassoBounds.y + lassoBounds.height,
    );
  }

  // JS 폴백
  return elements
    .filter((el) => {
      const elementBounds = calculateBounds(el.props?.style);
      return boxesIntersect(lassoBounds, elementBounds);
    })
    .map((el) => el.id);
}

