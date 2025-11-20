/**
 * PanelContainer - 패널 콘텐츠 컨테이너
 *
 * ✅ 성능 최적화: 모든 패널을 항상 렌더링하고 CSS transform으로 표시/숨김 제어
 * - React remount 비용 제거
 * - 상태 보존 (스크롤, 입력값 등)
 * - 부드러운 애니메이션 가능
 * - 동일한 패널 toggle 시 위치만 재조정
 */

import type { PanelSide, PanelId } from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";

export interface PanelContainerProps {
  /** 현재 사이드 (left/right) */
  side: PanelSide;

  /** 이 사이드에 배치된 모든 패널 ID 목록 */
  panelIds: PanelId[];

  /** 현재 활성 패널 ID 배열 (Multi toggle 지원) */
  activePanels: PanelId[];

  /** 사이드 표시 여부 */
  show: boolean;
}

export function PanelContainer({
  side,
  panelIds,
  activePanels,
  show,
}: PanelContainerProps) {
  // ✅ 최적화: 모든 패널을 항상 렌더링하고 CSS로 표시/숨김 제어
  // - activePanels에 있으면 보이고, 없으면 transform으로 숨김
  // - 패널 컴포넌트는 isActive prop으로 실제 활성 상태를 받음

  // 활성 패널이 없고 show가 false인 경우 빈 상태 표시
  if (activePanels.length === 0 && !show) {
    return (
      <div
        className="panel-container"
        data-show={false}
        data-side={side}
        aria-hidden={true}
      >
        <div className="panel-empty-state">
          <p className="empty-message">패널을 선택하세요</p>
        </div>
      </div>
    );
  }

  // ✅ 성능 최적화: 모든 패널을 항상 렌더링 (DOM에 유지)
  // - activePanels 순서대로 활성 패널 먼저 렌더링
  // - 그 다음 비활성 패널 렌더링
  // - CSS transform으로 위치만 이동하여 표시/숨김 제어

  // ✅ 모든 패널을 항상 렌더링 (DOM에 유지)
  // 패널 컴포넌트에 항상 isActive={true}를 전달하여 return null 방지
  // 실제 표시/숨김은 wrapper의 data-active 속성으로 CSS에서 제어
  return (
    <div
      className="panel-container"
      data-show={show}
      data-side={side}
      aria-hidden={!show}
    >
      <div className="panel-content">
        {panelIds.map((panelId) => {
          const panelConfig = PanelRegistry.getPanel(panelId);
          if (!panelConfig) {
            console.warn(
              `[PanelContainer] Panel "${panelId}" not found in registry`
            );
            return null;
          }

          const PanelComponent = panelConfig.component;
          const isActive = activePanels.includes(panelId);

          // 패널 넓이를 CSS 변수로 전달 (동적 처리)
          const panelWidth = panelConfig.minWidth || 233;

          return (
            <div
              key={panelId}
              className="panel-wrapper"
              data-panel-id={panelId}
              data-active={isActive}
              style={{
                // CSS 변수로 패널 넓이 전달
                ["--panel-width" as string]: `${panelWidth}px`,
                width: `${panelWidth}px`,
                minWidth: `${panelWidth}px`,
              }}
            >
              {/* ✅ 항상 isActive={true}를 전달하여 패널이 return null하지 않도록 */}
              {/* 실제 표시/숨김은 CSS transform으로 제어 */}
              <PanelComponent isActive={true} side={side} onClose={undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
