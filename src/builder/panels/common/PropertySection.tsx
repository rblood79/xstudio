/**
 * PropertySection - Section wrapper for property editors
 *
 * Provides the same section structure as SettingsPanel:
 * .section > .section-header > .section-content > .component-props
 *
 * Phase 8a: Integrated with useSectionCollapse for persistent state
 * Phase 4: Added Reset button
 * 
 * ⭐ 최적화: React.memo로 불필요한 리렌더링 방지
 */

import React, { memo } from "react";
import { ChevronUp, RotateCcw } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useSectionCollapse } from "../styles/hooks/useSectionCollapse";

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  id?: string; // Section ID for collapse state persistence
  defaultExpanded?: boolean;
  onReset?: () => void; // Reset button handler
}

export const PropertySection = memo(function PropertySection({
  title,
  children,
  id,
  defaultExpanded = true,
  onReset,
}: PropertySectionProps) {
  // Use persistent collapse state if ID provided, otherwise use local state
  const { isCollapsed, toggleSection } = useSectionCollapse();
  const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);

  const hasPersistedState = id !== undefined;
  const isExpanded = hasPersistedState ? !isCollapsed(id) : localExpanded;

  const handleToggle = () => {
    if (hasPersistedState && id) {
      toggleSection(id);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  return (
    <div className="section" data-section-id={id}>
      <div className="section-header">
        <div className="section-title">{title}</div>
        <div className="header-actions">
          {/* Reset button */}
          {onReset && (
            <button
              className="iconButton"
              type="button"
              onClick={onReset}
              aria-label="Reset section styles"
              title="Reset section styles"
            >
              <RotateCcw
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          )}

          {/* Collapse/Expand button */}
          <button
            className="iconButton"
            type="button"
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            <ChevronUp
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
              style={{
                transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="section-content">
          <div className="component-props">{children}</div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // ⭐ 커스텀 비교: onReset 함수 참조는 무시하고 실제 값만 비교
  // children은 React 요소이므로 참조 비교만 수행
  return (
    prevProps.title === nextProps.title &&
    prevProps.id === nextProps.id &&
    prevProps.defaultExpanded === nextProps.defaultExpanded &&
    prevProps.children === nextProps.children  // React 요소는 참조 비교
  );
});
