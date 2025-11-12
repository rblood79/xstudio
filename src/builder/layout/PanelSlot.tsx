/**
 * PanelSlot - 패널 네비게이션 + 콘텐츠 슬롯
 *
 * PanelNav와 PanelContainer를 결합한 컴포넌트
 * Left/Right 양쪽에서 모두 사용 가능
 */

import type { PanelSide } from "../panels/core/types";
import { usePanelLayout } from "./usePanelLayout";
import { PanelNav } from "./PanelNav";
import { PanelContainer } from "./PanelContainer";

export interface PanelSlotProps {
  /** 슬롯 위치 (left/right) */
  side: PanelSide;
}

export function PanelSlot({ side }: PanelSlotProps) {
  const { layout, setActivePanel, toggleSide } = usePanelLayout();

  // 현재 사이드의 상태 가져오기
  const panelIds = side === "left" ? layout.leftPanels : layout.rightPanels;
  const activePanel =
    side === "left" ? layout.activeLeftPanel : layout.activeRightPanel;
  const show = side === "left" ? layout.showLeft : layout.showRight;

  // 패널 클릭 핸들러
  const handlePanelClick = (panelId: typeof panelIds[number]) => {
    setActivePanel(side, panelId);
  };

  // 사이드 닫기 핸들러
  const handleClose = () => {
    toggleSide(side);
  };

  return (
    <div className={`panel-slot panel-slot-${side}`}>
      <PanelNav
        side={side}
        panelIds={panelIds}
        activePanel={activePanel}
        onPanelClick={handlePanelClick}
        onClose={handleClose}
      />
      {show && (
        <PanelContainer side={side} activePanel={activePanel} show={show} />
      )}
    </div>
  );
}
