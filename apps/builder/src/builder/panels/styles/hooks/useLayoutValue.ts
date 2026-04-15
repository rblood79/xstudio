import { useSyncExternalStore, useCallback } from "react";
import {
  getSharedLayoutMap,
  onLayoutPublished,
} from "../../../workspace/canvas/layout/engines/fullTreeLayout";

type LayoutKey = "width" | "height" | "x" | "y";

export function useLayoutValue(
  id: string | null | undefined,
  key: LayoutKey,
): number | undefined {
  const getSnapshot = useCallback(() => {
    if (!id) return undefined;
    const map = getSharedLayoutMap();
    return map?.get(id)?.[key];
  }, [id, key]);
  return useSyncExternalStore(onLayoutPublished, getSnapshot, getSnapshot);
}
