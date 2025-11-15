/**
 * StylesPanel - 스타일 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Phase 1-3 리팩토링 완료: Hooks, Sections, Constants, Types 분리
 * Phase 9b 완료: @modified 필터 추가
 */

import '../../panels/common/index.css';
import { useState, useMemo } from 'react';
import type { PanelProps } from '../core/types';
import { useInspectorState } from '../../inspector/hooks/useInspectorState';
import { ToggleButtonGroup, ToggleButton } from '../../components';
import {
  TransformSection,
  LayoutSection,
  AppearanceSection,
  TypographySection,
  ModifiedStylesSection,
} from './sections';
import { getModifiedProperties } from './hooks/useStyleSource';

export function StylesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const [filter, setFilter] = useState<'all' | 'modified'>('all');

  // Calculate modified properties count
  const modifiedCount = useMemo(() => {
    if (!selectedElement) return 0;
    return getModifiedProperties(selectedElement).length;
  }, [selectedElement]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return (
      <div className="inspector empty">
        <div className="empty-state">
          <p className="empty-message">요소를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="styles-panel">
      {/* Filter toggle */}
      <div className="panel-header">
        <ToggleButtonGroup
          aria-label="Style filter"
          selectionMode="single"
          selectedKeys={[filter]}
          onSelectionChange={(keys) => {
            const selectedFilter = Array.from(keys)[0] as 'all' | 'modified';
            setFilter(selectedFilter);
          }}
        >
          <ToggleButton id="all">All</ToggleButton>
          <ToggleButton id="modified">
            Modified {modifiedCount > 0 && `(${modifiedCount})`}
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Sections */}
      <div className="style-section">
        {filter === 'all' ? (
          <>
            <TransformSection selectedElement={selectedElement} />
            <LayoutSection selectedElement={selectedElement} />
            <AppearanceSection selectedElement={selectedElement} />
            <TypographySection selectedElement={selectedElement} />
          </>
        ) : (
          <ModifiedStylesSection selectedElement={selectedElement} />
        )}
      </div>
    </div>
  );
}
