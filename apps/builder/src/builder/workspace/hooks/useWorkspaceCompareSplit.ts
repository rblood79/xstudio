import { useCallback, useRef, useState } from "react";

interface UseWorkspaceCompareSplitOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseWorkspaceCompareSplitResult {
  compareSplit: number;
  handleResizeEnd: () => void;
  handleResizeMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleResizeStart: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export function useWorkspaceCompareSplit({
  containerRef,
}: UseWorkspaceCompareSplitOptions): UseWorkspaceCompareSplitResult {
  const [compareSplit, setCompareSplit] = useState(50);
  const isDraggingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.min(80, Math.max(20, (x / rect.width) * 100));
      setCompareSplit(pct);
    },
    [containerRef],
  );

  const handleResizeEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return {
    compareSplit,
    handleResizeEnd,
    handleResizeMove,
    handleResizeStart,
  };
}
