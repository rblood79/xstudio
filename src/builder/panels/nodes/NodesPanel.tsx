/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Nodes 컴포넌트를 사용하여 기존 로직 유지
 */

import type { PanelProps } from "../core/types";
import { Nodes } from "../../nodes";
import { useStore } from "../../stores";

export function NodesPanel({ isActive }: PanelProps) {
  const currentPageId = useStore((state) => state.currentPageId);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 현재 페이지가 없으면 빈 상태 표시
  if (!currentPageId) {
    return (
      <div className="panel-empty-state">
        <p className="empty-message">페이지를 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="nodes-panel sidebar-content">
      <Nodes />
    </div>
  );
}
