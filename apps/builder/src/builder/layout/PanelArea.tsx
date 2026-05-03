/**
 * PanelArea - 패널 네비게이션 + 콘텐츠 영역
 *
 * PanelNav와 PanelContainer를 결합한 컴포넌트
 * Left/Right 양쪽에서 모두 사용 가능
 *
 * ⭐ 최적화: React.memo + useCallback으로 불필요한 리렌더링 방지
 */

import { memo, useCallback, useMemo } from "react";
import type { PanelId, PanelSide } from "../panels/core/types";
import { usePanelLayout } from "../hooks";
import { PanelNav } from "./PanelNav";
import { PanelContainer } from "./PanelContainer";

export interface PanelAreaProps {
  /** 영역 위치 (left/right) */
  side: PanelSide;
}

export const PanelArea = memo(function PanelArea({ side }: PanelAreaProps) {
  const { layout, togglePanel } = usePanelLayout();

  // ⭐ 최적화: 현재 사이드의 상태만 useMemo로 캐싱
  const panelState = useMemo(
    () => ({
      panelIds: side === "left" ? layout.leftPanels : layout.rightPanels,
      activePanels:
        side === "left" ? layout.activeLeftPanels : layout.activeRightPanels,
      show: side === "left" ? layout.showLeft : layout.showRight,
    }),
    [
      side,
      layout.leftPanels,
      layout.rightPanels,
      layout.activeLeftPanels,
      layout.activeRightPanels,
      layout.showLeft,
      layout.showRight,
    ],
  );

  // ⭐ 최적화: 핸들러 함수 메모이제이션
  const handlePanelClick = useCallback(
    (panelId: PanelId) => {
      togglePanel(side, panelId);
    },
    [side, togglePanel],
  );

  return (
    <div className={`panel-area panel-area-${side}`}>
      {/* Left: Nav → Container, Right: Container → Nav */}
      {side === "left" ? (
        <>
          <PanelNav
            side={side}
            panelIds={panelState.panelIds}
            activePanels={panelState.activePanels}
            onPanelClick={handlePanelClick}
          />
          <PanelContainer
            side={side}
            panelIds={panelState.panelIds}
            activePanels={panelState.activePanels}
            show={panelState.show}
          />
        </>
      ) : (
        <>
          <PanelContainer
            side={side}
            panelIds={panelState.panelIds}
            activePanels={panelState.activePanels}
            show={panelState.show}
          />
          <PanelNav
            side={side}
            panelIds={panelState.panelIds}
            activePanels={panelState.activePanels}
            onPanelClick={handlePanelClick}
          />
        </>
      )}
    </div>
  );
});
