/**
 * StylesPanel - 스타일 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 StyleSection을 사용하여 기존 로직 유지
 */

import "../../shared/ui/styles.css";
import type { PanelProps } from "../core/types";
import { StyleSection } from "../sections/StyleSection";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { Square } from "lucide-react";
export function StylesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return (
      <div className="inspector-container empty">
        <div className="empty-state">
          <p className="empty-message">요소를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-container">
      <div className="panel-header">
        <h3 className="panel-title">Styles</h3>
        <div className="header-actions">
          <button
            className="iconButton"
            type="button"
          >
            <Square size={16} />
          </button>
        </div>
      </div>
      <StyleSection element={selectedElement} />
    </div>
  );
}
