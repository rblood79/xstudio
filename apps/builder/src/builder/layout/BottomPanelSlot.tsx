/**
 * BottomPanelSlot - 하단 패널 슬롯
 *
 * Monitor 등 하단 패널을 위한 리사이즈 가능한 슬롯
 * - 드래그로 높이 조절 (150-600px)
 * - 닫기 버튼
 * - ESC 키로 닫기
 * - CSS transform으로 표시/숨김 애니메이션
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { X, GripHorizontal } from "lucide-react";
import { iconProps, iconEditProps } from "../../utils/ui/uiConstants";
import { usePanelLayout, useKeyboardShortcutsRegistry } from "@/builder/hooks";
import { PanelRegistry } from "../panels/core/PanelRegistry";

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;

export const BottomPanelSlot = memo(function BottomPanelSlot() {
  const {
    layout,
    closeBottomPanel,
    setBottomHeight,
  } = usePanelLayout();

  const { showBottom, bottomHeight, activeBottomPanels, bottomPanels } = layout;

  // Resize 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(bottomHeight);

  useKeyboardShortcutsRegistry(
    [
      {
        key: "Escape",
        modifier: "none",
        preventDefault: false,
        disabled: !showBottom,
        handler: closeBottomPanel,
        description: "Close bottom panel",
      },
    ],
    [showBottom, closeBottomPanel]
  );

  // Resize 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = bottomHeight;
  }, [bottomHeight]);

  // 마우스 이동 및 업 이벤트
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 위로 드래그하면 높이 증가, 아래로 드래그하면 높이 감소
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartHeight.current + delta));
      setBottomHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setBottomHeight]);

  // 닫혀있으면 렌더링하지 않음
  if (!showBottom || activeBottomPanels.length === 0) {
    return null;
  }

  return (
    <div
      className="bottom-panel-slot"
      style={{ height: bottomHeight }}
      data-dragging={isDragging}
      role="region"
      aria-label="Bottom panel"
    >
      {/* Resize Handle */}
      <div
        className="bottom-panel-resize-handle"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={bottomHeight}
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setBottomHeight(Math.min(MAX_HEIGHT, bottomHeight + 20));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setBottomHeight(Math.max(MIN_HEIGHT, bottomHeight - 20));
          }
        }}
      >
        <GripHorizontal size={iconProps.size} />
      </div>

      {/* Panel Header */}
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs">
          {activeBottomPanels.map((panelId) => {
            const panelConfig = PanelRegistry.getPanel(panelId);
            if (!panelConfig) return null;
            const Icon = panelConfig.icon;
            return (
              <span key={panelId} className="bottom-panel-tab active">
                <Icon size={iconEditProps.size} />
                {panelConfig.name}
              </span>
            );
          })}
        </div>
        <button
          className="bottom-panel-close"
          onClick={closeBottomPanel}
          aria-label="Close panel"
          type="button"
        >
          <X size={iconProps.size} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="bottom-panel-content">
        {bottomPanels.map((panelId) => {
          const panelConfig = PanelRegistry.getPanel(panelId);
          if (!panelConfig) {
            return null;
          }

          const PanelComponent = panelConfig.component;
          const isActive = activeBottomPanels.includes(panelId);

          return (
            <div
              key={panelId}
              className="bottom-panel-wrapper"
              data-panel={panelId}
              data-active={isActive}
            >
              <PanelComponent
                isActive={isActive}
                side="bottom"
                onClose={closeBottomPanel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export type { } from "./BottomPanelSlot";
