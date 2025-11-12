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
  const { layout, togglePanel, toggleSide } = usePanelLayout();

  // 현재 사이드의 상태 가져오기
  const panelIds = side === "left" ? layout.leftPanels : layout.rightPanels;
  const activePanels =
    side === "left" ? layout.activeLeftPanels : layout.activeRightPanels;
  const show = side === "left" ? layout.showLeft : layout.showRight;

  // 디버깅 로그
  console.log(`[PanelSlot ${side}]`, {
    panelIds,
    activePanel: activePanels, // 배열로 변경
    show,
    layout,
  });

  // 패널 클릭 핸들러 - Toggle 동작
  const handlePanelClick = (panelId: typeof panelIds[number]) => {
    togglePanel(side, panelId);
  };

  // 사이드 닫기 핸들러
  const handleClose = () => {
    toggleSide(side);
  };

  return (
    <div className={`panel-slot panel-slot-${side}`}>
      {/* Left: Nav → Container, Right: Container → Nav */}
      {side === "left" ? (
        <>
          <PanelNav
            side={side}
            panelIds={panelIds}
            activePanels={activePanels}
            onPanelClick={handlePanelClick}
            onClose={handleClose}
          />
          <PanelContainer side={side} activePanels={activePanels} show={show} />
        </>
      ) : (
        <>
          <PanelContainer side={side} activePanels={activePanels} show={show} />
          <PanelNav
            side={side}
            panelIds={panelIds}
            activePanels={activePanels}
            onPanelClick={handlePanelClick}
            onClose={handleClose}
          />
        </>
      )}
    </div>
  );
}
