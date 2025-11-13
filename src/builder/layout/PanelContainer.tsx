/**
 * PanelContainer - 패널 콘텐츠 컨테이너
 *
 * Multi toggle 지원: 여러 패널을 동시에 렌더링
 * PanelConfig의 minWidth/maxWidth 사용
 */

import type { PanelSide, PanelId } from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";

export interface PanelContainerProps {
  /** 현재 사이드 (left/right) */
  side: PanelSide;

  /** 현재 활성 패널 ID 배열 (Multi toggle 지원) */
  activePanels: PanelId[];

  /** 사이드 표시 여부 */
  show: boolean;
}

export function PanelContainer({
  side,
  activePanels,
  show,
}: PanelContainerProps) {
  // 사이드가 숨겨진 경우 렌더링 안 함
  if (!show) {
    return null;
  }

  // 활성 패널이 없는 경우
  if (activePanels.length === 0) {
    return (
      <div className="panel-container">
        <div className="panel-empty-state">
          <p className="empty-message">패널을 선택하세요</p>
        </div>
      </div>
    );
  }

  // 여러 패널을 동시에 렌더링
  return (
    <div className="panel-container">
      {activePanels.map((panelId) => {
        const panelConfig = PanelRegistry.getPanel(panelId);

        if (!panelConfig) {
          console.warn(`[PanelContainer] Panel "${panelId}" not found in registry`);
          return null;
        }

        const PanelComponent = panelConfig.component;

        // PanelConfig에서 width 읽기
        const panelStyle: React.CSSProperties = {};
        if (panelConfig.minWidth) {
          panelStyle.minWidth = `${panelConfig.minWidth}px`;
        }
        if (panelConfig.maxWidth) {
          panelStyle.maxWidth = `${panelConfig.maxWidth}px`;
        }
        // width 기본값: minWidth 사용
        if (panelConfig.minWidth && !panelConfig.maxWidth) {
          panelStyle.width = `${panelConfig.minWidth}px`;
        }

        return (
          <div key={panelId} className="panel-content" style={panelStyle}>
            <PanelComponent
              isActive={true}
              side={side}
              onClose={undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
