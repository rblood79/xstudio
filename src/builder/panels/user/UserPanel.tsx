/**
 * UserPanel - 사용자 프로필 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 User 컴포넌트를 사용하여 기존 로직 유지
 */

import type { PanelProps } from "../core/types";
import User from "../../user";

export function UserPanel({ isActive }: PanelProps) {
  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return (
    <div className="user-panel sidebar-content">
      <User />
    </div>
  );
}
