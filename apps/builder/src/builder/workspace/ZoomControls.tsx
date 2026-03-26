/**
 * Zoom Controls Component (Adobe Style)
 *
 * Adobe Photoshop 온라인 스타일의 줌 컨트롤
 * - 현재 줌 레벨 표시 input
 * - 드롭다운 메뉴: 확대/축소, 프리셋, 화면 맞추기
 * - 키보드 단축키 표시
 *
 * 🚀 Performance: zoom만 구독, 나머지는 getState()로 액세스
 *
 * @since 2025-12-24
 */

import { useCallback, useRef, memo, useState, useEffect } from "react";
import {
  MenuTrigger,
  Menu,
  MenuItem,
  Button,
  Popover,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { useViewportSyncStore } from "./canvas/stores";
import {
  applyViewportState,
  computeFillViewport,
  computeFitViewport,
  zoomViewportAtContainerCenter,
} from "./canvas/viewport/viewportActions";
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
  const zoom = useViewportSyncStore((state) => state.zoom);

  // 입력 상태 관리
  const [inputValue, setInputValue] = useState("");
  const zoomPercent = Math.round(zoom * 100);

  // Popover 기준 요소 — triggerRef로 .zoom-trigger-button 기준 배치
  const anchorRef = useRef<HTMLDivElement>(null);

  // zoom 변경 시 입력값 동기화
  useEffect(() => {
    setInputValue(`${zoomPercent}%`);
  }, [zoomPercent]);

  // ============================================
  // Zoom Handlers (getState 사용으로 의존성 최소화)
  // ============================================

  const zoomTo = useCallback((level: number) => {
    zoomViewportAtContainerCenter(level);
  }, []);

  const zoomIn = useCallback(() => {
    const currentZoom = useViewportSyncStore.getState().zoom;
    zoomTo(currentZoom + ZOOM_STEP);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    const currentZoom = useViewportSyncStore.getState().zoom;
    zoomTo(currentZoom - ZOOM_STEP);
  }, [zoomTo]);

  const zoomToFit = useCallback(() => {
    const state = useViewportSyncStore.getState();
    const { containerSize, canvasSize } = state;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    applyViewportState(computeFitViewport({ canvasSize, containerSize }));
  }, []);

  const zoomToFill = useCallback(() => {
    const state = useViewportSyncStore.getState();
    const { containerSize, canvasSize } = state;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    applyViewportState(computeFillViewport({ canvasSize, containerSize }));
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
    [zoomIn, zoomOut, zoomTo, zoomToFit, zoomToFill],
  );

  // ============================================
  // Input Handlers
  // ============================================

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleInputBlur = useCallback(() => {
    // 숫자 파싱 (%, 공백 제거)
    const numStr = inputValue.replace(/%/g, "").trim();
    const num = parseFloat(numStr);

    if (isNaN(num) || num < MIN_ZOOM * 100 || num > MAX_ZOOM * 100) {
      // 유효하지 않으면 현재 값으로 복원
      setInputValue(`${zoomPercent}%`);
      return;
    }

    // 퍼센트를 줌 레벨로 변환 (100% = 1.0)
    zoomTo(num / 100);
  }, [inputValue, zoomPercent, zoomTo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleInputBlur();
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setInputValue(`${zoomPercent}%`);
        (e.target as HTMLInputElement).blur();
        return;
      }

      // 화살표 키로 줌 조절
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newZoom = Math.min(zoomPercent + step, MAX_ZOOM * 100);
        zoomTo(newZoom / 100);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newZoom = Math.max(zoomPercent - step, MIN_ZOOM * 100);
        zoomTo(newZoom / 100);
      }
    },
    [handleInputBlur, zoomPercent, zoomTo],
  );

  const handleInputFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    },
    [],
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className={`zoom-controls ${className || ""}`}>
      <div ref={anchorRef} className="zoom-trigger-button">
        <input
          className="zoom-input"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          aria-label="Zoom level"
        />
        <MenuTrigger>
          <Button className="zoom-chevron-button" aria-label="Zoom menu">
            <ChevronDown size={iconProps.size} />
          </Button>
          <Popover
            className="zoom-menu-popover"
            placement="bottom start"
            triggerRef={anchorRef}
          >
            <Menu className="zoom-menu" onAction={handleAction}>
              <MenuItem id="zoom-in" className="zoom-menu-item">
                <span>확대</span>
                <kbd>⌘+</kbd>
              </MenuItem>
              <MenuItem id="zoom-out" className="zoom-menu-item">
                <span>축소</span>
                <kbd>⌘-</kbd>
              </MenuItem>
              <MenuItem id="zoom-100" className="zoom-menu-item">
                <span>100%</span>
                <kbd>⌘1</kbd>
              </MenuItem>
              <MenuItem id="zoom-200" className="zoom-menu-item">
                <span>200%</span>
                <kbd>⌘2</kbd>
              </MenuItem>
              <MenuItem id="fit-to-screen" className="zoom-menu-item">
                <span>화면에 맞추기</span>
                <kbd>⌘0</kbd>
              </MenuItem>
              <MenuItem id="fill-screen" className="zoom-menu-item">
                <span>화면 채우기</span>
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </div>
  );
});

export default ZoomControls;
