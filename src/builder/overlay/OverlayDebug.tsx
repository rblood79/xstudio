import { useEffect, useRef } from 'react';

/**
 * Debug hook to detect rapid mount/unmount cycles
 * Only active in development mode
 */
export function useOverlayDebug(componentName: string, elementId: string) {
  const mountCountRef = useRef(0);
  const lastMountTimeRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    mountCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastMount = now - lastMountTimeRef.current;

    // Warn if component is mounting more than 3 times per second
    if (timeSinceLastMount < 333 && mountCountRef.current > 3) {
      console.warn(
        `🔄 [Overlay Debug] Rapid remount detected:`,
        `\n  Component: ${componentName}`,
        `\n  Element ID: ${elementId}`,
        `\n  Mount count: ${mountCountRef.current}`,
        `\n  Time since last: ${timeSinceLastMount}ms`
      );
    }

    lastMountTimeRef.current = now;

    return () => {
      // Component unmounted
      if (import.meta.env.DEV && timeSinceLastMount < 100) {
        console.warn(
          `⚡ [Overlay Debug] Rapid unmount detected:`,
          `\n  Component: ${componentName}`,
          `\n  Element ID: ${elementId}`,
          `\n  Lived for: ${Date.now() - now}ms`
        );
      }
    };
  }, [componentName, elementId]);
}
