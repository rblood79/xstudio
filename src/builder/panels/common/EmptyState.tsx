/**
 * EmptyState - 빈 상태 표시 컴포넌트
 *
 * 모든 패널에서 사용하는 공통 빈 상태 UI
 * 일관된 empty state 표현을 위한 공통 컴포넌트
 */

import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** 표시할 아이콘 (선택) */
  icon?: ReactNode;
  /** 메인 메시지 */
  message: string;
  /** 추가 설명 (선택) */
  description?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 빈 상태 컴포넌트
 *
 * @example
 * ```tsx
 * <EmptyState message="요소를 선택하세요" />
 * ```
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FileQuestion size={48} />}
 *   message="데이터를 찾을 수 없습니다"
 *   description="다른 데이터 소스를 선택해주세요"
 * />
 * ```
 */
export function EmptyState({
  icon,
  message,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`inspector empty ${className}`.trim()}>
      <div className="empty-state">
        {icon && <div className="empty-icon">{icon}</div>}
        <p className="empty-message">{message}</p>
        {description && <p className="empty-description">{description}</p>}
      </div>
    </div>
  );
}
