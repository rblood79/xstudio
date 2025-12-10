/**
 * Auto Layout Utility
 *
 * dagre를 사용한 워크플로우 노드 자동 정렬
 */

import Dagre from '@dagrejs/dagre';
import type { WorkflowNode, WorkflowEdge } from '../types';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export interface AutoLayoutOptions {
  /** 레이아웃 방향 (TB: 위→아래, LR: 왼→오른, BT: 아래→위, RL: 오른→왼) */
  direction?: LayoutDirection;
  /** 노드 간 수평 간격 */
  nodeSpacing?: number;
  /** 계층 간 수직 간격 */
  rankSpacing?: number;
}

const DEFAULT_OPTIONS: Required<AutoLayoutOptions> = {
  direction: 'TB',
  nodeSpacing: 100,
  rankSpacing: 150,
};

// 노드 타입별 크기 정의
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  page: { width: 180, height: 80 },
  layout: { width: 200, height: 60 },
  dataSource: { width: 160, height: 50 },
};

const DEFAULT_DIMENSION = { width: 180, height: 80 };

/**
 * dagre를 사용하여 노드들의 위치를 자동 계산
 */
export function getLayoutedElements(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: AutoLayoutOptions = {}
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 노드가 없으면 그대로 반환
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // dagre 그래프 생성
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // 그래프 옵션 설정
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  // 노드 추가
  nodes.forEach((node) => {
    const dimensions = NODE_DIMENSIONS[node.type || ''] || DEFAULT_DIMENSION;
    g.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // 엣지 추가
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // 레이아웃 계산
  Dagre.layout(g);

  // 계산된 위치를 노드에 적용
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.type || ''] || DEFAULT_DIMENSION;

    return {
      ...node,
      position: {
        // dagre는 중심점을 반환하므로 좌상단으로 변환
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
