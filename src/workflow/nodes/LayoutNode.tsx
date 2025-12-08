/**
 * LayoutNode - Layout을 나타내는 ReactFlow 노드
 *
 * Layout 정보와 사용하는 페이지 수, Slot 수를 표시
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layout, FileStack, Box } from 'lucide-react';
import type { LayoutNodeData } from '../types';

interface LayoutNodeProps {
  data: LayoutNodeData;
  selected?: boolean;
}

export const LayoutNode = memo(function LayoutNode({
  data,
  selected,
}: LayoutNodeProps) {
  const { layout, pageIds, slotCount } = data;

  return (
    <div
      className={`workflow-node workflow-layout-node ${selected ? 'selected' : ''}`}
    >
      {/* Input Handle (not typically used, but available) */}
      <Handle
        type="target"
        position={Position.Top}
        className="workflow-handle workflow-handle-target"
        style={{ visibility: 'hidden' }}
      />

      {/* Header */}
      <div className="workflow-node-header workflow-layout-header">
        <Layout size={14} className="workflow-node-icon" />
        <span className="workflow-node-title">{layout.name}</span>
      </div>

      {/* Content */}
      <div className="workflow-node-content">
        {layout.description && (
          <div className="workflow-node-description">{layout.description}</div>
        )}

        <div className="workflow-node-stats">
          {/* Pages using this layout */}
          <div className="workflow-stat" title="Pages using this layout">
            <FileStack size={12} />
            <span>{pageIds.length} pages</span>
          </div>

          {/* Slot Count */}
          <div className="workflow-stat" title="Slot count">
            <Box size={12} />
            <span>{slotCount} slots</span>
          </div>
        </div>
      </div>

      {/* Output Handle (connects to pages) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="workflow-handle workflow-handle-source"
      />
    </div>
  );
});

export default LayoutNode;
