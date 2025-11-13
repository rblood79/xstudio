/**
 * SectionHeader - 패널 내부 섹션 헤더 컴포넌트
 *
 * 패널 내부의 섹션 헤더에 사용되는 공통 컴포넌트
 * Collapsible 기능 지원
 */

import type { ReactNode } from "react";

export interface SectionHeaderProps {
  /** 섹션 제목 */
  title: string;
  /** 헤더 우측 액션 버튼들 (ReactNode) */
  actions?: ReactNode;
  /** 접기/펼치기 기능 활성화 여부 */
  collapsible?: boolean;
  /** 현재 접힌 상태 (collapsible이 true일 때만 사용) */
  isCollapsed?: boolean;
  /** 접기/펼치기 토글 핸들러 */
  onToggle?: () => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 섹션 헤더 컴포넌트
 *
 * @example
 * ```tsx
 * // 기본 섹션 헤더 (제목만)
 * <SectionHeader title="Save Mode" />
 * ```
 *
 * @example
 * ```tsx
 * // 액션 버튼이 있는 섹션 헤더
 * <SectionHeader
 *   title="Transform"
 *   actions={<button className="iconButton"><ChevronUp size={16} /></button>}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Collapsible 섹션 헤더
 * <SectionHeader
 *   title="Advanced Settings"
 *   collapsible
 *   isCollapsed={isCollapsed}
 *   onToggle={() => setIsCollapsed(!isCollapsed)}
 * />
 * ```
 */
export function SectionHeader({
  title,
  actions,
  collapsible = false,
  isCollapsed = false,
  onToggle,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`section-header ${collapsible ? "collapsible" : ""} ${
        isCollapsed ? "collapsed" : ""
      } ${className}`.trim()}
      onClick={collapsible && onToggle ? onToggle : undefined}
      style={{ cursor: collapsible ? "pointer" : "default" }}
    >
      <div className="section-title">
        {collapsible && (
          <span className="collapse-icon" style={{ marginRight: "8px" }}>
            {isCollapsed ? "▶" : "▼"}
          </span>
        )}
        {title}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
