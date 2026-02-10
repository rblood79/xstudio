/**
 * Workflow Graph Utilities
 *
 * 워크플로우 그래프의 연결성 분석을 위한 순수 함수 모듈.
 * 포커스된 페이지 기준 1-hop(직접), 2-hop(간접) 엣지를 계산.
 */

import type { WorkflowEdge } from './workflowEdges';

// ============================================
// Types
// ============================================

export interface ConnectedEdges {
  /** 포커스된 페이지에 직접 연결된 엣지 ID */
  directEdgeIds: Set<string>;
  /** 직접 연결된 페이지들의 엣지 중 directEdgeIds에 포함되지 않은 엣지 ID */
  secondaryEdgeIds: Set<string>;
}

// ============================================
// Core Computation
// ============================================

/**
 * 포커스된 페이지 기준으로 1-hop, 2-hop 연결 엣지를 계산.
 *
 * 1-hop (direct): sourcePageId 또는 targetPageId가 focusedPageId인 엣지
 * 2-hop (secondary): 직접 연결된 페이지들의 엣지 중 1-hop에 포함되지 않은 엣지
 */
export function computeConnectedEdges(
  focusedPageId: string,
  edges: WorkflowEdge[],
): ConnectedEdges {
  const directEdgeIds = new Set<string>();
  const connectedPageIds = new Set<string>();

  // 1-hop: focusedPageId에 직접 연결된 엣지 수집
  for (const edge of edges) {
    if (edge.sourcePageId === focusedPageId || edge.targetPageId === focusedPageId) {
      directEdgeIds.add(edge.id);

      // 직접 연결된 페이지 ID 수집
      if (edge.sourcePageId !== focusedPageId) {
        connectedPageIds.add(edge.sourcePageId);
      }
      if (edge.targetPageId !== focusedPageId) {
        connectedPageIds.add(edge.targetPageId);
      }
    }
  }

  // 2-hop: 직접 연결된 페이지들의 엣지 중 1-hop 제외
  const secondaryEdgeIds = new Set<string>();

  for (const edge of edges) {
    if (directEdgeIds.has(edge.id)) continue;

    if (connectedPageIds.has(edge.sourcePageId) || connectedPageIds.has(edge.targetPageId)) {
      secondaryEdgeIds.add(edge.id);
    }
  }

  return { directEdgeIds, secondaryEdgeIds };
}
