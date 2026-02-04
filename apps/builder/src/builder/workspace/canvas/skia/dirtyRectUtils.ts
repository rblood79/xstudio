import type { DirtyRect } from './types';

export interface DirtyInfo {
  bounds: { x: number; y: number; width: number; height: number };
  expand: number;
}

export function computeDirtyRectsFromInfo(
  prevInfoMap: Map<string, DirtyInfo>,
  nextInfoMap: Map<string, DirtyInfo>,
  dirtyIds: string[],
): DirtyRect[] | undefined {
  if (dirtyIds.length === 0) return undefined;

  const rects: DirtyRect[] = [];

  for (const id of dirtyIds) {
    const oldInfo = prevInfoMap.get(id);
    const newInfo = nextInfoMap.get(id);

    if (!oldInfo && !newInfo) continue;

    const oldLeft = oldInfo ? (oldInfo.bounds.x - oldInfo.expand) : Infinity;
    const oldTop = oldInfo ? (oldInfo.bounds.y - oldInfo.expand) : Infinity;
    const oldRight = oldInfo
      ? (oldInfo.bounds.x + oldInfo.bounds.width + oldInfo.expand)
      : -Infinity;
    const oldBottom = oldInfo
      ? (oldInfo.bounds.y + oldInfo.bounds.height + oldInfo.expand)
      : -Infinity;

    const newLeft = newInfo ? (newInfo.bounds.x - newInfo.expand) : Infinity;
    const newTop = newInfo ? (newInfo.bounds.y - newInfo.expand) : Infinity;
    const newRight = newInfo
      ? (newInfo.bounds.x + newInfo.bounds.width + newInfo.expand)
      : -Infinity;
    const newBottom = newInfo
      ? (newInfo.bounds.y + newInfo.bounds.height + newInfo.expand)
      : -Infinity;

    const left = Math.min(oldLeft, newLeft);
    const top = Math.min(oldTop, newTop);
    const right = Math.max(oldRight, newRight);
    const bottom = Math.max(oldBottom, newBottom);

    if (!Number.isFinite(left) || !Number.isFinite(top) ||
        !Number.isFinite(right) || !Number.isFinite(bottom)) {
      continue;
    }

    rects.push({
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    });
  }

  return rects.length > 0 ? rects : undefined;
}

