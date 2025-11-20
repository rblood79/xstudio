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
  // ✅ 최적화: 항상 렌더링, CSS로 표시/숨김 제어
  // - React remount 비용 제거
  // - 상태 보존 (스크롤, 입력값 등)
  // - 부드러운 애니메이션 가능

  // 활성 패널이 없는 경우
  if (activePanels.length === 0) {
    return (
      <div
        className="panel-container"
        data-show={show}
        data-side={side}
      >
        <div className="panel-empty-state">
          <p className="empty-message">패널을 선택하세요</p>
        </div>
      </div>
    );
  }

  // 여러 패널을 동시에 렌더링
  return (
    <div
      className="panel-container"
      data-show={show}
      data-side={side}
    >
      <div className="panel-content">
        {
          activePanels.map((panelId) => {
            const panelConfig = PanelRegistry.getPanel(panelId);

            if (!panelConfig) {
              console.warn(`[PanelContainer] Panel "${panelId}" not found in registry`);
              return null;
            }

            const PanelComponent = panelConfig.component;

            return (
              <PanelComponent
                key={panelId}
                isActive={true}
                side={side}
                onClose={undefined}
              />
            );
          })}
      </div>
    </div>
  );
}
