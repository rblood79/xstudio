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
 * 🚀 Phase 20: Lazy Children Pattern - 열릴 때만 children 평가
 */

import React, { memo, useTransition } from "react";
import { ChevronUp, RotateCcw } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useSectionCollapse } from "../../panels/styles/hooks/useSectionCollapse";

// 🚀 Phase 20: children을 함수로도 받을 수 있도록 타입 확장
type LazyChildren = React.ReactNode | (() => React.ReactNode);

interface PropertySectionProps {
  title: string;
  children: LazyChildren;
  id?: string; // Section ID for collapse state persistence
  defaultExpanded?: boolean;
  onReset?: () => void; // Reset button handler
  icon?: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    color?: string;
  }>; // Optional icon (not displayed)
}

export const PropertySection = memo(
  function PropertySection({
    title,
    children,
    id,
    defaultExpanded = true,
    onReset,
  }: PropertySectionProps) {
    // Use persistent collapse state if ID provided, otherwise use local state
    const { isCollapsed, toggleSection } = useSectionCollapse();
    const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);
    // 🚀 Phase 4.2: startTransition으로 섹션 열기 우선순위 낮춤
    const [isPending, startTransition] = useTransition();

    const hasPersistedState = id !== undefined;
    const isExpanded = hasPersistedState ? !isCollapsed(id) : localExpanded;

    const handleToggle = () => {
      // 🚀 Phase 4.2: 섹션 열기는 낮은 우선순위로 처리
      startTransition(() => {
        if (hasPersistedState && id) {
          toggleSection(id);
        } else {
          setLocalExpanded(!localExpanded);
        }
      });
    };

    return (
      <div
        className="section"
        data-section-id={id}
        style={{ opacity: isPending ? 0.7 : 1 }}
      >
        <div className="section-header">
          <div className="section-title">{title}</div>
          <div className="section-actions">
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
                  strokeWidth={iconProps.strokeWidth}
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
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
                style={{
                  transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>
        </div>
        {/* 🚀 Phase 20: Lazy Children - 열릴 때만 children 평가 */}
        {isExpanded && (
          <div className="section-content">
            {typeof children === "function" ? children() : children}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // ⭐ 커스텀 비교: onReset 함수 참조는 무시하고 실제 값만 비교
    // children은 React 요소이므로 참조 비교만 수행
    return (
      prevProps.title === nextProps.title &&
      prevProps.id === nextProps.id &&
      prevProps.defaultExpanded === nextProps.defaultExpanded &&
      prevProps.children === nextProps.children // React 요소는 참조 비교
    );
  },
);
