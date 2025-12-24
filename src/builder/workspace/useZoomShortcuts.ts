/**
 * Zoom Keyboard Shortcuts Hook
 *
 * 브라우저 기본 줌을 막고 캔버스 줌으로 처리
 * - ⌘/Ctrl + : 확대
 * - ⌘/Ctrl - : 축소
 * - ⌘/Ctrl 0 : 화면에 맞추기
 * - ⌘/Ctrl 1 : 100%
 * - ⌘/Ctrl 2 : 200%
 *
 * @since 2025-12-24
 */

import { useEffect } from "react";
import { useCanvasSyncStore } from "./canvas/canvasSync";

// ============================================
// Constants
// ============================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// ============================================
// Hook
// ============================================

export function useZoomShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd (Mac) 또는 Ctrl (Windows/Linux) 키 체크
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // 입력 필드에서는 단축키 비활성화
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const state = useCanvasSyncStore.getState();
      const { zoom, containerSize, canvasSize, setZoom, setPanOffset, panOffset } = state;

      // 줌 함수들
      const zoomTo = (level: number) => {
        if (containerSize.width === 0 || containerSize.height === 0) {
          setZoom(level);
          return;
        }

        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
        const zoomRatio = newZoom / zoom;
        const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
        const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      };

      const zoomToFit = () => {
        if (containerSize.width === 0 || containerSize.height === 0) return;

        const scaleX = containerSize.width / canvasSize.width;
        const scaleY = containerSize.height / canvasSize.height;
        const fitZoom = Math.min(scaleX, scaleY) * 0.9;

        setZoom(fitZoom);
        setPanOffset({
          x: (containerSize.width - canvasSize.width * fitZoom) / 2,
          y: (containerSize.height - canvasSize.height * fitZoom) / 2,
        });
      };

      // 단축키 처리
      switch (e.key) {
        case "=":
        case "+":
          // ⌘+ : 확대
          e.preventDefault();
          zoomTo(zoom + ZOOM_STEP);
          break;

        case "-":
          // ⌘- : 축소
          e.preventDefault();
          zoomTo(zoom - ZOOM_STEP);
          break;

        case "0":
          // ⌘0 : 화면에 맞추기
          e.preventDefault();
          zoomToFit();
          break;

        case "1":
          // ⌘1 : 100%
          e.preventDefault();
          zoomTo(1);
          break;

        case "2":
          // ⌘2 : 200%
          e.preventDefault();
          zoomTo(2);
          break;
      }
    };

    // 캡처 단계에서 이벤트 처리 (브라우저 기본 동작보다 먼저)
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}

export default useZoomShortcuts;
