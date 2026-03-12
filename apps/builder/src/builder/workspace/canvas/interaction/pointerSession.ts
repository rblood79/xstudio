const DOUBLE_CLICK_THRESHOLD = 300;

export interface PointerSessionSnapshot {
  lastClickTargetId: string | null;
  lastClickTime: number;
}

export function isPointerDoubleClick(
  snapshot: PointerSessionSnapshot,
  targetId: string | null,
  now: number,
  threshold = DOUBLE_CLICK_THRESHOLD,
): boolean {
  if (!targetId) {
    return false;
  }

  if (snapshot.lastClickTargetId !== targetId) {
    return false;
  }

  return now - snapshot.lastClickTime < threshold;
}

export function commitPointerClick(
  targetId: string | null,
  now: number,
): PointerSessionSnapshot {
  return {
    lastClickTargetId: targetId,
    lastClickTime: now,
  };
}

export function resetPointerClick(): PointerSessionSnapshot {
  return {
    lastClickTargetId: null,
    lastClickTime: 0,
  };
}
