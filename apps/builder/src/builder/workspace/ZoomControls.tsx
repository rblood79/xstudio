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

import { useCallback, useRef, memo, useState, useEffect } from "react";
import {
  ComboBox,
  Button,
  Input,
  Popover,
  ListBox,
  ListBoxItem,
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

  // 입력 상태 관리
  const [inputValue, setInputValue] = useState("");
  const zoomPercent = Math.round(zoom * 100);

  // zoom 변경 시 입력값 동기화
  useEffect(() => {
    setInputValue(`${zoomPercent}%`);
  }, [zoomPercent]);

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
  // Input Handlers
  // ============================================

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

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
    [handleInputBlur, zoomPercent, zoomTo]
  );

  const handleInputFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    },
    []
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className={`zoom-controls ${className || ""}`}>
      <ComboBox
        aria-label="Zoom"
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSelectionChange={(key) => {
          if (key !== null) {
            handleAction(key);
          }
        }}
      >
        <div className="zoom-trigger-button">
          <Input
            className="zoom-input"
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
          />
          <Button className="zoom-chevron-button">
            <ChevronDown size={iconProps.size} />
          </Button>
        </div>
        <Popover className="zoom-menu-popover" placement="bottom start">
          <ListBox className="zoom-menu">
            <ListBoxItem id="zoom-in" className="zoom-menu-item" textValue="확대">
              <span>확대</span>
              <kbd>⌘+</kbd>
            </ListBoxItem>
            <ListBoxItem id="zoom-out" className="zoom-menu-item" textValue="축소">
              <span>축소</span>
              <kbd>⌘-</kbd>
            </ListBoxItem>
            <ListBoxItem id="zoom-100" className="zoom-menu-item" textValue="100%">
              <span>100%</span>
              <kbd>⌘1</kbd>
            </ListBoxItem>
            <ListBoxItem id="zoom-200" className="zoom-menu-item" textValue="200%">
              <span>200%</span>
              <kbd>⌘2</kbd>
            </ListBoxItem>
            <ListBoxItem id="fit-to-screen" className="zoom-menu-item" textValue="화면에 맞추기">
              <span>화면에 맞추기</span>
              <kbd>⌘0</kbd>
            </ListBoxItem>
            <ListBoxItem id="fill-screen" className="zoom-menu-item" textValue="화면 채우기">
              <span>화면 채우기</span>
            </ListBoxItem>
          </ListBox>
        </Popover>
      </ComboBox>
    </div>
  );
});

export default ZoomControls;
