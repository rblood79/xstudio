/**
 * PanelContainer - 패널 콘텐츠 컨테이너
 *
 * 선택된 패널의 컴포넌트를 렌더링
 */

import type { PanelSide, PanelId } from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";

export interface PanelContainerProps {
  /** 현재 사이드 (left/right) */
  side: PanelSide;

  /** 현재 활성 패널 ID */
  activePanel: PanelId | null;

  /** 사이드 표시 여부 */
  show: boolean;
}

export function PanelContainer({
  side,
  activePanel,
  show,
}: PanelContainerProps) {
  // 사이드가 숨겨진 경우 렌더링 안 함
  if (!show || !activePanel) {
    return (
      <div className="sidebar-container">
        <div className="sidebar-empty-state">
          {!show ? "패널이 숨겨져 있습니다" : "패널을 선택하세요"}
        </div>
      </div>
    );
  }

  // 패널 설정 가져오기
  const panelConfig = PanelRegistry.getPanel(activePanel);

  if (!panelConfig) {
    console.warn(`[PanelContainer] Panel "${activePanel}" not found in registry`);
    return (
      <div className="sidebar-container">
        <div className="sidebar-empty-state">
          패널을 찾을 수 없습니다: {activePanel}
        </div>
      </div>
    );
  }

  // 패널 컴포넌트 렌더링
  const PanelComponent = panelConfig.component;

  return (
    <div className="sidebar-container">
      <div className="sidebar-section">
        <PanelComponent
          isActive={true}
          side={side}
          onClose={undefined}
        />
      </div>
    </div>
  );
}
