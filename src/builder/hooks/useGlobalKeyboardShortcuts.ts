/**
 * useGlobalKeyboardShortcuts Hook
 *
 * 전역 키보드 단축키 통합 훅
 * - Undo/Redo (Cmd+Z, Cmd+Shift+Z)
 * - Zoom (Cmd+=/-/0/1/2)
 *
 * 설정 파일(keyboardShortcuts.ts)에서 정의를 가져오고
 * 핸들러만 바인딩하는 방식으로 구현
 *
 * @since Phase 0+1 구현 (2025-12-28)
 * @updated Phase 2 - JSON Config 연동 (2025-12-28)
 * @updated Phase 4 - 스코프 시스템 연동 (2025-12-28)
 */

import { useCallback, useMemo } from 'react';
import { useStore } from '../stores';
import { useCanvasSyncStore } from '../workspace/canvas/canvasSync';
import {
  useKeyboardShortcutsRegistry,
  type KeyboardShortcut,
} from './useKeyboardShortcutsRegistry';
import {
  SHORTCUT_DEFINITIONS,
  type ShortcutId,
} from '../config/keyboardShortcuts';
import { useActiveScope } from './useActiveScope';

// ============================================
// Constants
// ============================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// ============================================
// Types
// ============================================

type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

// ============================================
// Helper Functions
// ============================================

/**
 * 설정 파일의 정의와 핸들러를 결합하여 KeyboardShortcut 배열 생성
 */
function bindHandlersToDefinitions(
  ids: ShortcutId[],
  handlers: ShortcutHandlers
): KeyboardShortcut[] {
  return ids
    .filter((id) => handlers[id] !== undefined)
    .map((id) => {
      const def = SHORTCUT_DEFINITIONS[id];
      return {
        key: def.key,
        code: def.code,
        modifier: def.modifier,
        handler: handlers[id]!,
        preventDefault: true,
        stopPropagation: def.capture,
        allowInInput: def.allowInInput,
        priority: def.priority,
        category: def.category,
        description: def.description,
        scope: def.scope, // Phase 4: 스코프 추가
      };
    });
}

// ============================================
// Hook
// ============================================

export function useGlobalKeyboardShortcuts() {
  // ----------------------------------------
  // Active Scope (Phase 4)
  // ----------------------------------------

  const activeScope = useActiveScope();

  // ----------------------------------------
  // Undo/Redo Handlers
  // ----------------------------------------

  const handleUndo = useCallback(async () => {
    console.log('[Keyboard] Undo triggered');
    const { undo } = useStore.getState();
    await undo();
  }, []);

  const handleRedo = useCallback(async () => {
    console.log('[Keyboard] Redo triggered');
    const { redo } = useStore.getState();
    await redo();
  }, []);

  // ----------------------------------------
  // Zoom Handlers
  // ----------------------------------------

  const zoomTo = useCallback((targetZoom: number) => {
    const state = useCanvasSyncStore.getState();
    const { zoom, containerSize, panOffset, setZoom, setPanOffset } = state;

    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    if (containerSize.width > 0 && containerSize.height > 0) {
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      const zoomRatio = newZoom / zoom;
      setPanOffset({
        x: centerX - (centerX - panOffset.x) * zoomRatio,
        y: centerY - (centerY - panOffset.y) * zoomRatio,
      });
    }
    setZoom(newZoom);
  }, []);

  const handleZoomIn = useCallback(() => {
    const { zoom } = useCanvasSyncStore.getState();
    zoomTo(zoom + ZOOM_STEP);
  }, [zoomTo]);

  const handleZoomOut = useCallback(() => {
    const { zoom } = useCanvasSyncStore.getState();
    zoomTo(zoom - ZOOM_STEP);
  }, [zoomTo]);

  const handleZoomToFit = useCallback(() => {
    const state = useCanvasSyncStore.getState();
    const { containerSize, canvasSize, setZoom, setPanOffset } = state;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9;

    setZoom(fitZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fitZoom) / 2,
      y: (containerSize.height - canvasSize.height * fitZoom) / 2,
    });
  }, []);

  const handleZoom100 = useCallback(() => zoomTo(1), [zoomTo]);
  const handleZoom200 = useCallback(() => zoomTo(2), [zoomTo]);

  // ----------------------------------------
  // Handler Map
  // ----------------------------------------

  const handlers: ShortcutHandlers = useMemo(
    () => ({
      // System
      undo: handleUndo,
      redo: handleRedo,

      // Navigation
      zoomIn: handleZoomIn,
      zoomInNumpad: handleZoomIn,
      zoomOut: handleZoomOut,
      zoomToFit: handleZoomToFit,
      zoom100: handleZoom100,
      zoom200: handleZoom200,
    }),
    [
      handleUndo,
      handleRedo,
      handleZoomIn,
      handleZoomOut,
      handleZoomToFit,
      handleZoom100,
      handleZoom200,
    ]
  );

  // ----------------------------------------
  // Build Shortcuts from Config
  // ----------------------------------------

  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    const shortcutIds: ShortcutId[] = [
      // System
      'undo',
      'redo',
      // Navigation
      'zoomIn',
      'zoomInNumpad',
      'zoomOut',
      'zoomToFit',
      'zoom100',
      'zoom200',
    ];

    return bindHandlersToDefinitions(shortcutIds, handlers);
  }, [handlers]);

  // ----------------------------------------
  // Register Shortcuts
  // ----------------------------------------

  // System + Navigation 단축키는 capture phase에서 처리
  // (브라우저 기본 동작 차단 필요)
  // Phase 4: activeScope 전달로 스코프 기반 필터링
  useKeyboardShortcutsRegistry(shortcuts, [shortcuts, activeScope], {
    capture: true,
    target: 'document',
    activeScope,
  });
}

export default useGlobalKeyboardShortcuts;
