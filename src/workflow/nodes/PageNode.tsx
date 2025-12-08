/**
 * PageNode - 페이지를 나타내는 ReactFlow 노드
 *
 * 페이지 정보와 네비게이션 링크 개수를 표시
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, Link as LinkIcon, Layers } from 'lucide-react';
import type { PageNodeData } from '../types';

interface PageNodeProps {
  data: PageNodeData;
  selected?: boolean;
}

export const PageNode = memo(function PageNode({
  data,
  selected,
}: PageNodeProps) {
  const { page, outgoingLinks, layoutId, elementCount } = data;

  return (
    <div
      className={`workflow-node workflow-page-node ${selected ? 'selected' : ''}`}
    >
      {/* Input Handle (for incoming navigation) */}
      <Handle
        type="target"
        position={Position.Top}
        className="workflow-handle workflow-handle-target"
      />

      {/* Header */}
      <div className="workflow-node-header">
        <FileText size={14} className="workflow-node-icon" />
        <span className="workflow-node-title">{page.title}</span>
      </div>

      {/* Content */}
      <div className="workflow-node-content">
        <div className="workflow-node-slug">/{page.slug}</div>

        <div className="workflow-node-stats">
          {/* Element Count */}
          <div className="workflow-stat" title="Elements">
            <Layers size={12} />
            <span>{elementCount}</span>
          </div>

          {/* Outgoing Links */}
          {outgoingLinks.length > 0 && (
            <div className="workflow-stat" title="Links to other pages">
              <LinkIcon size={12} />
              <span>{outgoingLinks.length}</span>
            </div>
          )}
        </div>

        {/* Layout Badge */}
        {layoutId && (
          <div className="workflow-node-badge workflow-badge-layout">
            Layout
          </div>
        )}
      </div>

      {/* Output Handle (for outgoing navigation) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="workflow-handle workflow-handle-source"
      />
    </div>
  );
});

export default PageNode;
