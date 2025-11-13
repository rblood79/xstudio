/**
 * PropertySection - Section wrapper for property editors
 *
 * Provides the same section structure as SettingsPanel:
 * .section > .section-header > .section-content > .component-props
 */

import React from "react";
import { ChevronUp } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function PropertySection({
  title,
  children,
  defaultExpanded = true,
}: PropertySectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">{title}</div>
        <div className="header-actions">
          <button
            className="iconButton"
            type="button"
            onClick={toggleExpanded}
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
}
