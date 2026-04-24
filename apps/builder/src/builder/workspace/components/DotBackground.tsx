import { useEffect, useRef } from "react";

import {
  isCanvasViewportSnapshotEqual,
  selectCanvasViewportSnapshot,
  useViewportSyncStore,
} from "../canvas/stores/viewportSync";

const BASE_GAP = 16;
const DOT_SIZE = 1;
const GLOW_RADIUS = 128;
// ADR-902 Perf 후속: inset:-80px (Workspace.css) 와 동기화 — glow mask 좌표 보정값.
// .dot-background--glow 박스는 .canvas-container 대비 (-80,-80) 에 시작하므로
// host 기준 커서 좌표 → glow 박스 기준으로 변환 시 +BG_INSET.
const BG_INSET = 80;
// ADR-902: Google Stitch 패턴 — 마우스 정지 N ms 후 glow fade-out.
// CSS transition (200ms ease) 이 opacity 보간을 담당.
const IDLE_FADE_MS = 1000;
// ADR-902 Perf 후속: pan apply 후 N ms 내 추가 업데이트 없으면 will-change 해제.
// ADR-047 상시 will-change 남용 경고 준수 — pan 중에만 합성 레이어 힌트.
const WILL_CHANGE_IDLE_MS = 200;

export function DotBackground() {
  const baseRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const willChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apply = (s: {
      panOffset: { x: number; y: number };
      zoom: number;
    }) => {
      const gap = BASE_GAP * s.zoom;
      // translate 값은 (-gap, 0] 범위 — inset:-80px 오버사이즈로 viewport 전체 커버.
      const tx = -(((s.panOffset.x % gap) + gap) % gap);
      const ty = -(((s.panOffset.y % gap) + gap) % gap);
      for (const el of [baseRef.current, glowRef.current]) {
        if (!el) continue;
        el.style.setProperty("--dot-gap", `${gap}px`);
        el.style.setProperty("--dot-tx", `${tx}px`);
        el.style.setProperty("--dot-ty", `${ty}px`);
        el.style.setProperty("--dot-size", `${DOT_SIZE * s.zoom}px`);
        el.style.willChange = "transform";
      }
      if (willChangeTimerRef.current !== null) {
        clearTimeout(willChangeTimerRef.current);
      }
      willChangeTimerRef.current = setTimeout(() => {
        for (const el of [baseRef.current, glowRef.current]) {
          if (el) el.style.willChange = "";
        }
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
        // glow 박스는 host(.canvas-container) 대비 inset:-80px 오버사이즈 →
        // mask-image 중심 좌표는 glow 박스 기준이므로 +BG_INSET 오프셋 보정.
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
