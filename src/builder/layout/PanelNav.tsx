/**
 * PanelNav - 패널 네비게이션 바
 *
 * 48px 너비의 아이콘 버튼 네비게이션
 * 기존 sidebar-nav 디자인 재사용
 */

import type { PanelSide, PanelId } from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";
import { iconProps } from "../../utils/ui/uiConstants";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PanelNavProps {
  /** 현재 사이드 (left/right) */
  side: PanelSide;

  /** 이 사이드에 배치된 패널 ID 목록 */
  panelIds: PanelId[];

  /** 현재 활성 패널 ID 배열 (Multi toggle 지원) */
  activePanels: PanelId[];

  /** 패널 클릭 시 콜백 */
  onPanelClick: (panelId: PanelId) => void;

  /** 사이드 닫기 콜백 */
  onClose?: () => void;
}

export function PanelNav({
  side,
  panelIds,
  activePanels,
  onPanelClick,
  onClose,
}: PanelNavProps) {
  return (
    <nav className="panel-nav">
      <ul className="nav-list">
        {panelIds.map((panelId) => {
          const panelConfig = PanelRegistry.getPanel(panelId);
          if (!panelConfig) return null;

          const Icon = panelConfig.icon;
          const isActive = activePanels.includes(panelId); // 배열에서 확인

          return (
            <li key={panelId}>
              <button
                className={`nav-button ${isActive ? "active" : ""}`}
                onClick={() => onPanelClick(panelId)}
                aria-pressed={isActive}
                aria-label={panelConfig.name}
                title={panelConfig.name}
              >
                <Icon
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* 사이드 닫기 버튼 */}
      {onClose && panelIds.length > 0 && (
        <button
          className="nav-button close-all-button active"
          onClick={onClose}
          aria-label={`Close ${side} panels`}
          title={side === "left" ? "사이드바 닫기" : "인스펙터 닫기"}
        >
          {side === "left" ? (
            <ChevronLeft
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          ) : (
            <ChevronRight
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          )}
        </button>
      )}
    </nav>
  );
}
