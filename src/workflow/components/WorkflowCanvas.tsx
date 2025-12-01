/**
 * WorkflowCanvas - ReactFlow 기반 워크플로우 캔버스
 *
 * 프로젝트의 페이지/레이아웃 흐름을 시각화
 */

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '../store';
import { PageNode } from '../nodes/PageNode';
import { LayoutNode } from '../nodes/LayoutNode';

// ============================================
// Node Types
// ============================================

const nodeTypes: NodeTypes = {
  page: PageNode,
  layout: LayoutNode,
};

// ============================================
// WorkflowCanvas Component
// ============================================

export function WorkflowCanvas() {
  // Store selectors - individual selectors to prevent infinite loops
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId);

  // Handlers
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);

      // 페이지 노드 클릭 시 부모에게 알림
      if (node.id.startsWith('page-')) {
        const pageId = node.id.replace('page-', '');
        window.parent.postMessage(
          {
            type: 'WORKFLOW_SELECT_PAGE',
            payload: { pageId },
          },
          '*'
        );
      }
    },
    [setSelectedNodeId]
  );

  // MiniMap node color
  const nodeColor = useCallback((node: { type?: string }) => {
    if (node.type === 'layout') {
      return 'var(--color-secondary-500)';
    }
    return 'var(--color-primary-500)';
  }, []);

  // Default viewport
  const defaultViewport = useMemo(() => ({ x: 50, y: 50, zoom: 0.8 }), []);

  return (
    <div className="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-gray-300)"
        />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          position="bottom-right"
        />
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={2}
          zoomable
          pannable
          position="top-right"
        />
      </ReactFlow>
    </div>
  );
}

export default WorkflowCanvas;
