/**
 * DataPanel - 데이터 바인딩 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 */

import "../../panels/common/index.css";
import type { PanelProps } from "../core/types";
import { DataSourceSelector } from "./DataSourceSelector";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { Square } from "lucide-react";
import { EmptyState } from "../common";

export function DataPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return <EmptyState message="요소를 선택하세요" />;
  }

  return (
    <div className="inspector-container">
      <div className="panel-header">
        <h3 className="panel-title">Data Binding</h3>
        <div className="header-actions">
          <button className="iconButton" type="button">
            <Square size={16} />
          </button>
        </div>
      </div>
      <div className="data-section">
        <div className="section-header">
          <div className="section-title">{selectedElement.type}</div>
        </div>
        <div className="section-content">
          <DataSourceSelector element={selectedElement} />
        </div>
      </div>
    </div>
  );
}
