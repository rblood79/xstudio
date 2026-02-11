/**
 * ModalPanelContainer
 *
 * Modal 모드 패널을 렌더링하는 컨테이너 컴포넌트
 * React Aria Components 기반으로 포커스 트랩, ESC 닫기 지원
 *
 * @updated 2026-02-11 - CSS 변수 불일치 수정: --spectrum-gray-* → M3 시맨틱 변수,
 *   builder-system.css에 .modal-panel 선택자 추가
 */

import { memo, useCallback, useRef, useEffect } from "react";
import { ModalOverlay, Modal, Dialog, Heading } from "react-aria-components";
import { X } from "lucide-react";
import { usePanelLayout } from "../hooks";
import { PanelRegistry } from "../panels/core/PanelRegistry";
import type { ModalPanelState } from "../panels/core/types";
import "./ModalPanelContainer.css";

/**
 * ModalPanelContainer
 * 열려있는 모든 modal 패널을 렌더링
 */
export const ModalPanelContainer = memo(function ModalPanelContainer() {
  const {
    layout,
    closeModalPanel,
    focusModalPanel,
    updateModalPanelPosition,
  } = usePanelLayout();
  const { modalPanels } = layout;

  if (modalPanels.length === 0) {
    return null;
  }

  return (
    <div className="modal-panel-container">
      {modalPanels.map((panel) => (
        <ModalPanel
          key={panel.panelId}
          panel={panel}
          onClose={() => closeModalPanel(panel.panelId)}
          onFocus={() => focusModalPanel(panel.panelId)}
          onPositionChange={(position) =>
            updateModalPanelPosition(panel.panelId, position)
          }
        />
      ))}
    </div>
  );
});

/**
 * ModalPanel Props
 */
interface ModalPanelProps {
  panel: ModalPanelState;
  onClose: () => void;
  onFocus: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}

/**
 * ModalPanel
 * 개별 modal 패널 렌더링
 */
const ModalPanel = memo(function ModalPanel({
  panel,
  onClose,
  onFocus,
  onPositionChange,
}: ModalPanelProps) {
  // 드래그 상태
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * 드래그 시작
   */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      // 닫기 버튼 클릭 시 드래그 시작하지 않음
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }

      isDragging.current = true;
      dragOffset.current = {
        x: e.clientX - panel.position.x,
        y: e.clientY - panel.position.y,
      };

      // 드래그 시작 시 포커스
      onFocus();

      // 드래그 중 선택 방지
      e.preventDefault();
    },
    [panel.position.x, panel.position.y, onFocus]
  );

  /**
   * 드래그 이벤트 핸들러 등록
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      onPositionChange({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    // 전역 이벤트 등록 (드래그 중 패널 밖으로 나가도 동작)
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onPositionChange]);

  /**
   * 패널 클릭 시 포커스
   */
  const handlePanelClick = useCallback(() => {
    onFocus();
  }, [onFocus]);

  // 패널 설정 조회 (hooks 호출 후)
  const panelConfig = PanelRegistry.getPanel(panel.panelId);

  // 패널이 없으면 렌더링하지 않음
  if (!panelConfig) {
    console.warn(`[ModalPanel] Panel config not found: ${panel.panelId}`);
    return null;
  }

  const PanelComponent = panelConfig.component;

  return (
    <ModalOverlay
      isOpen={true}
      className="modal-panel-backdrop"
      isDismissable
      isKeyboardDismissDisabled={false}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal
        className="modal-panel-wrapper"
        style={{
          position: "absolute",
          left: panel.position.x,
          top: panel.position.y,
          zIndex: panel.zIndex,
        }}
      >
        <Dialog
          ref={panelRef}
          className="modal-panel"
          aria-label={panelConfig.name}
          style={{
            width: panel.size.width,
            height: panel.size.height,
          }}
          onPointerDown={handlePanelClick}
        >
          {/* 헤더 (드래그 핸들) */}
          <div className="modal-panel-header" onMouseDown={handleDragStart}>
            <Heading slot="title" className="modal-panel-title">
              {panelConfig.name}
            </Heading>
            <button
              className="modal-panel-close"
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>

          {/* 패널 컨텐츠 */}
          <div className="modal-panel-content">
            <PanelComponent
              isActive={true}
              displayMode="modal"
              onClose={onClose}
            />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
});

export default ModalPanelContainer;
