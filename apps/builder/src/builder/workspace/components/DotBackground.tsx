import { useEffect, useRef } from "react";

import {
  isCanvasViewportSnapshotEqual,
  selectCanvasViewportSnapshot,
  useViewportSyncStore,
} from "../canvas/stores/viewportSync";

const BASE_GAP = 20;
const DOT_SIZE = 1;
const GLOW_RADIUS = 140;
// ADR-902: Google Stitch 패턴 — 마우스 정지 N ms 후 glow fade-out.
// CSS transition (200ms ease) 이 opacity 보간을 담당.
const IDLE_FADE_MS = 1000;

export function DotBackground() {
  const baseRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apply = (s: {
      panOffset: { x: number; y: number };
      zoom: number;
    }) => {
      const gap = BASE_GAP * s.zoom;
      const ox = ((s.panOffset.x % gap) + gap) % gap;
      const oy = ((s.panOffset.y % gap) + gap) % gap;
      for (const el of [baseRef.current, glowRef.current]) {
        if (!el) continue;
        el.style.setProperty("--dot-gap", `${gap}px`);
        el.style.setProperty("--dot-offset-x", `${ox}px`);
        el.style.setProperty("--dot-offset-y", `${oy}px`);
        el.style.setProperty("--dot-size", `${DOT_SIZE * s.zoom}px`);
      }
    };
    apply(selectCanvasViewportSnapshot(useViewportSyncStore.getState()));
    return useViewportSyncStore.subscribe(selectCanvasViewportSnapshot, apply, {
      equalityFn: isCanvasViewportSnapshotEqual,
    });
  }, []);

  useEffect(() => {
    const host = baseRef.current?.parentElement;
    const glow = glowRef.current;
    if (!host || !glow) return;

    const clearIdleTimer = () => {
      if (idleTimerRef.current !== null) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    const scheduleIdleFade = () => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        glow.style.opacity = "0";
        idleTimerRef.current = null;
      }, IDLE_FADE_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        glow.style.setProperty("--cx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--cy", `${e.clientY - r.top}px`);
        glow.style.opacity = "1";
        rafRef.current = 0;
        scheduleIdleFade();
      });
    };
    const onLeave = () => {
      clearIdleTimer();
      glow.style.opacity = "0";
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearIdleTimer();
    };
  }, []);

  return (
    <>
      <div
        ref={baseRef}
        className="dot-background dot-background--base"
        aria-hidden
      />
      <div
        ref={glowRef}
        className="dot-background dot-background--glow"
        style={
          { ["--glow-r" as string]: `${GLOW_RADIUS}px` } as React.CSSProperties
        }
        aria-hidden
      />
    </>
  );
}
