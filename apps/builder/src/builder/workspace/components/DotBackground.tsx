import { useEffect, useRef } from "react";

import {
  isCanvasViewportSnapshotEqual,
  selectCanvasViewportSnapshot,
  useViewportSyncStore,
} from "../canvas/stores/viewportSync";

const BASE_GAP = 16;
const DOT_SIZE = 1;
const GLOW_RADIUS = 96;
// GLOW_RADIUS 와 동기화 — glow mask 가 viewport 경계에서 clip 되지 않도록 box 오버사이즈.
// CSS `--dot-inset` 로 주입, glow 커서 좌표도 +BG_INSET 보정 (박스 오프셋 상쇄).
const BG_INSET = 96;
const IDLE_FADE_MS = 1000;
// ADR-047: 상시 will-change 금지 — pan 중에만 합성 레이어 힌트, idle 시 해제.
const WILL_CHANGE_IDLE_MS = 200;

export function DotBackground() {
  const baseRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const willChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWillChangeActiveRef = useRef(false);

  useEffect(() => {
    const targets = [baseRef.current, glowRef.current].filter(
      (el): el is HTMLDivElement => el !== null,
    );
    for (const el of targets) {
      el.style.setProperty("--dot-inset", `${BG_INSET}px`);
    }

    const apply = (s: {
      panOffset: { x: number; y: number };
      zoom: number;
    }) => {
      const gap = BASE_GAP * s.zoom;
      // Skia translate(pan)+scale(zoom) 과 동일 부호 — 음수 래핑 시 팬 방향과 도트가 엇갈림.
      const tx = ((s.panOffset.x % gap) + gap) % gap;
      const ty = ((s.panOffset.y % gap) + gap) % gap;
      for (const el of targets) {
        el.style.setProperty("--dot-gap", `${gap}px`);
        el.style.setProperty("--dot-tx", `${tx}px`);
        el.style.setProperty("--dot-ty", `${ty}px`);
        el.style.setProperty("--dot-size", `${DOT_SIZE * s.zoom}px`);
      }
      if (!isWillChangeActiveRef.current) {
        for (const el of targets) el.style.willChange = "transform";
        isWillChangeActiveRef.current = true;
      }
      if (willChangeTimerRef.current !== null) {
        clearTimeout(willChangeTimerRef.current);
      }
      willChangeTimerRef.current = setTimeout(() => {
        for (const el of targets) el.style.willChange = "";
        isWillChangeActiveRef.current = false;
        willChangeTimerRef.current = null;
      }, WILL_CHANGE_IDLE_MS);
    };
    apply(selectCanvasViewportSnapshot(useViewportSyncStore.getState()));
    const unsubscribe = useViewportSyncStore.subscribe(
      selectCanvasViewportSnapshot,
      apply,
      { equalityFn: isCanvasViewportSnapshotEqual },
    );
    return () => {
      unsubscribe();
      if (willChangeTimerRef.current !== null) {
        clearTimeout(willChangeTimerRef.current);
        willChangeTimerRef.current = null;
      }
      isWillChangeActiveRef.current = false;
    };
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
        glow.style.setProperty("--cx", `${e.clientX - r.left + BG_INSET}px`);
        glow.style.setProperty("--cy", `${e.clientY - r.top + BG_INSET}px`);
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
