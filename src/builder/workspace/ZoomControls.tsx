/**
 * Zoom Controls Component (Adobe Style)
 *
 * Adobe Photoshop 온라인 스타일의 줌 컨트롤
 * - 현재 줌 레벨 표시 버튼
 * - 드롭다운 메뉴: 확대/축소, 프리셋, 화면 맞추기
 * - 키보드 단축키 표시
 *
 * 🚀 Performance: zoom만 구독, 나머지는 getState()로 액세스
 *
 * @since 2025-12-24
 */

import { useCallback, useRef, memo, useMemo } from "react";
import {
  Button,
  Popover,
  Menu,
  MenuItem,
  MenuTrigger,
  Separator,
  Keyboard,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { useCanvasSyncStore } from "./canvas/canvasSync";
import { iconProps } from "../../utils/ui/uiConstants";

// ============================================
// Constants
// ============================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// ============================================
// Types
// ============================================

export interface ZoomControlsProps {
  /** 클래스명 */
  className?: string;
}

// ============================================
// Component
// ============================================

export const ZoomControls = memo(function ZoomControls({
  className,
}: ZoomControlsProps) {
  // 🚀 Performance: zoom만 구독 (UI 표시용)
  // 나머지 값들은 액션 실행 시 getState()로 가져옴
  const zoom = useCanvasSyncStore((state) => state.zoom);

  // Fit 모드 추적
  const isFitModeRef = useRef(true);

  // ============================================
  // Zoom Handlers (getState 사용으로 의존성 최소화)
  // ============================================

  const zoomTo = useCallback((level: number) => {
    const state = useCanvasSyncStore.getState();
    const { containerSize, panOffset, zoom: currentZoom, setZoom, setPanOffset } = state;

    isFitModeRef.current = false;

    if (containerSize.width === 0 || containerSize.height === 0) {
      setZoom(level);
      return;
    }

    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    const zoomRatio = newZoom / currentZoom;
    const newPanX = centerX - (centerX - panOffset.x) * zoomRatio;
    const newPanY = centerY - (centerY - panOffset.y) * zoomRatio;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  }, []);

  const zoomIn = useCallback(() => {
    const currentZoom = useCanvasSyncStore.getState().zoom;
    zoomTo(currentZoom + ZOOM_STEP);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    const currentZoom = useCanvasSyncStore.getState().zoom;
    zoomTo(currentZoom - ZOOM_STEP);
  }, [zoomTo]);

  const zoomToFit = useCallback(() => {
    const state = useCanvasSyncStore.getState();
    const { containerSize, canvasSize, setZoom, setPanOffset } = state;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    isFitModeRef.current = true;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9;

    setZoom(fitZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fitZoom) / 2,
      y: (containerSize.height - canvasSize.height * fitZoom) / 2,
    });
  }, []);

  const zoomToFill = useCallback(() => {
    const state = useCanvasSyncStore.getState();
    const { containerSize, canvasSize, setZoom, setPanOffset } = state;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    isFitModeRef.current = false;

    const scaleX = containerSize.width / canvasSize.width;
    const scaleY = containerSize.height / canvasSize.height;
    const fillZoom = Math.max(scaleX, scaleY);

    setZoom(fillZoom);
    setPanOffset({
      x: (containerSize.width - canvasSize.width * fillZoom) / 2,
      y: (containerSize.height - canvasSize.height * fillZoom) / 2,
    });
  }, []);

  // ============================================
  // Menu Action Handler
  // ============================================

  const handleAction = useCallback(
    (key: React.Key) => {
      switch (key) {
        case "zoom-in":
          zoomIn();
          break;
        case "zoom-out":
          zoomOut();
          break;
        case "zoom-100":
          zoomTo(1);
          break;
        case "zoom-200":
          zoomTo(2);
          break;
        case "fit-to-screen":
          zoomToFit();
          break;
        case "fill-screen":
          zoomToFill();
          break;
      }
    },
    [zoomIn, zoomOut, zoomTo, zoomToFit, zoomToFill]
  );

  // ============================================
  // Render
  // ============================================

  const zoomPercent = Math.round(zoom * 100);

  // 🚀 메뉴 아이템 메모이제이션 (팝오버 열릴 때마다 재생성 방지)
  const menuContent = useMemo(
    () => (
      <>
        <MenuItem id="zoom-in" className="zoom-menu-item">
          <span>확대</span>
          <Keyboard>⌘+</Keyboard>
        </MenuItem>
        <MenuItem id="zoom-out" className="zoom-menu-item">
          <span>축소</span>
          <Keyboard>⌘-</Keyboard>
        </MenuItem>
        <Separator className="zoom-menu-separator" />
        <MenuItem id="zoom-100" className="zoom-menu-item">
          <span>100%</span>
          <Keyboard>⌘1</Keyboard>
        </MenuItem>
        <MenuItem id="zoom-200" className="zoom-menu-item">
          <span>200%</span>
          <Keyboard>⌘2</Keyboard>
        </MenuItem>
        <Separator className="zoom-menu-separator" />
        <MenuItem id="fit-to-screen" className="zoom-menu-item">
          <span>화면에 맞추기</span>
          <Keyboard>⌘0</Keyboard>
        </MenuItem>
        <MenuItem id="fill-screen" className="zoom-menu-item">
          <span>화면 채우기</span>
        </MenuItem>
      </>
    ),
    []
  );

  return (
    <div className={`zoom-controls ${className || ""}`}>
      <MenuTrigger>
        <Button className="zoom-trigger-button">
          <span className="zoom-value">{zoomPercent}%</span>
          <ChevronDown size={iconProps.size} />
        </Button>
        <Popover className="zoom-menu-popover" placement="bottom start">
          <Menu className="zoom-menu" onAction={handleAction}>
            {menuContent}
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  );
});

export default ZoomControls;
