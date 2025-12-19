/**
 * ResponsiveVisibilityEditor
 *
 * Element의 Breakpoint별 가시성을 편집하는 Inspector 에디터.
 * Desktop, Tablet, Mobile에서 요소 표시/숨김 설정.
 */

import { memo, useCallback } from "react";
import { Monitor, Tablet, Smartphone, Eye, EyeOff } from "lucide-react";
import { PropertySection } from "../../common";
import type { ResponsiveVisibility, BreakpointName } from "../../../../types/builder/responsive.types";
import { BREAKPOINTS, BREAKPOINT_ORDER } from "../../../../types/builder/responsive.types";
import { iconEditProps, iconSmall } from "../../../../utils/ui/uiConstants";

interface ResponsiveVisibilityEditorProps {
  /** 현재 가시성 설정 */
  visibility: ResponsiveVisibility | undefined;
  /** 변경 콜백 */
  onChange: (visibility: ResponsiveVisibility) => void;
  /** 섹션 제목 */
  title?: string;
  /** 비활성화 */
  disabled?: boolean;
}

/**
 * Breakpoint 아이콘 컴포넌트
 */
function BreakpointIcon({ breakpoint, size = 16 }: { breakpoint: BreakpointName; size?: number }) {
  switch (breakpoint) {
    case "desktop":
      return <Monitor size={size} />;
    case "tablet":
      return <Tablet size={size} />;
    case "mobile":
      return <Smartphone size={size} />;
    default:
      return null;
  }
}

/**
 * ResponsiveVisibilityEditor Component
 */
export const ResponsiveVisibilityEditor = memo(function ResponsiveVisibilityEditor({
  visibility = {},
  onChange,
  title = "Responsive Visibility",
  disabled = false,
}: ResponsiveVisibilityEditorProps) {
  // 가시성 토글 핸들러
  const handleToggle = useCallback(
    (breakpoint: BreakpointName) => {
      const currentValue = visibility[breakpoint] ?? true; // 기본값은 표시
      onChange({
        ...visibility,
        [breakpoint]: !currentValue,
      });
    },
    [visibility, onChange]
  );

  // 전체 표시 핸들러
  const handleShowAll = useCallback(() => {
    onChange({
      desktop: true,
      tablet: true,
      mobile: true,
    });
  }, [onChange]);

  // 전체 숨김 핸들러
  const handleHideAll = useCallback(() => {
    onChange({
      desktop: false,
      tablet: false,
      mobile: false,
    });
  }, [onChange]);

  return (
    <PropertySection title={title} icon={Eye}>
      <div className="responsive-visibility-editor">
        {/* Breakpoint 토글 버튼들 */}
        <div className="responsive-visibility-buttons">
          {BREAKPOINT_ORDER.map((bp) => {
            const isVisible = visibility[bp] ?? true;
            const config = BREAKPOINTS[bp];

            return (
              <button
                key={bp}
                type="button"
                className={`responsive-visibility-btn ${isVisible ? "visible" : "hidden"}`}
                onClick={() => handleToggle(bp)}
                disabled={disabled}
                title={`${config.label}: ${isVisible ? "Visible" : "Hidden"} (${config.minWidth}px${config.maxWidth ? `-${config.maxWidth}px` : "+"})`}
                aria-pressed={isVisible}
              >
                <BreakpointIcon breakpoint={bp} size={iconEditProps.size} />
                <span className="responsive-visibility-label">{config.label}</span>
                {isVisible ? <Eye size={iconSmall.size} /> : <EyeOff size={iconSmall.size} />}
              </button>
            );
          })}
        </div>

        {/* 빠른 액션 버튼들 */}
        <div className="responsive-visibility-actions">
          <button
            type="button"
            className="responsive-visibility-action"
            onClick={handleShowAll}
            disabled={disabled}
            title="Show on all breakpoints"
          >
            Show All
          </button>
          <button
            type="button"
            className="responsive-visibility-action"
            onClick={handleHideAll}
            disabled={disabled}
            title="Hide on all breakpoints"
          >
            Hide All
          </button>
        </div>

        {/* 도움말 텍스트 */}
        <p className="responsive-visibility-help">
          Control element visibility at different screen sizes
        </p>
      </div>

      <style>{`
        .responsive-visibility-editor {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .responsive-visibility-buttons {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .responsive-visibility-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--surface-container);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--text-xs);
        }

        .responsive-visibility-btn:hover:not(:disabled) {
          background: var(--surface-container-high);
        }

        .responsive-visibility-btn.visible {
          border-color: var(--color-success-500, #22c55e);
          background: var(--color-success-50, #f0fdf4);
        }

        .responsive-visibility-btn.hidden {
          border-color: var(--color-error-500, #ef4444);
          background: var(--color-error-50, #fef2f2);
          opacity: 0.7;
        }

        .responsive-visibility-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .responsive-visibility-label {
          flex: 1;
          text-align: left;
        }

        .responsive-visibility-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .responsive-visibility-action {
          flex: 1;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--surface-container);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--text-2xs);
          transition: all 0.2s ease;
        }

        .responsive-visibility-action:hover:not(:disabled) {
          background: var(--surface-container-high);
        }

        .responsive-visibility-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .responsive-visibility-help {
          font-size: var(--text-2xs);
          color: var(--text-secondary);
          margin: 0;
        }
      `}</style>
    </PropertySection>
  );
});

export default ResponsiveVisibilityEditor;
