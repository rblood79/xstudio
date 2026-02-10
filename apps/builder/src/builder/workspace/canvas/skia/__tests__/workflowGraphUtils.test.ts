/**
 * workflowGraphUtils Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { computeConnectedEdges } from '../workflowGraphUtils';
import type { WorkflowEdge } from '../workflowEdges';

function makeEdge(
  id: string,
  sourcePageId: string,
  targetPageId: string,
): WorkflowEdge {
  return {
    id,
    type: 'navigation',
    sourcePageId,
    targetPageId,
  };
}

// ============================================
// computeConnectedEdges
// ============================================

describe('computeConnectedEdges', () => {
  it('A->B, B->C, C->D 그래프에서 B 포커스 시 direct/secondary를 올바르게 계산한다', () => {
    const edges: WorkflowEdge[] = [
      makeEdge('e-ab', 'A', 'B'),
      makeEdge('e-bc', 'B', 'C'),
      makeEdge('e-cd', 'C', 'D'),
    ];

    const result = computeConnectedEdges('B', edges);

    // A->B, B->C는 direct (B가 source 또는 target)
    expect(result.directEdgeIds.has('e-ab')).toBe(true);
    expect(result.directEdgeIds.has('e-bc')).toBe(true);
    expect(result.directEdgeIds.size).toBe(2);

    // C->D는 secondary (C는 B와 직접 연결된 페이지이므로)
    expect(result.secondaryEdgeIds.has('e-cd')).toBe(true);
    expect(result.secondaryEdgeIds.size).toBe(1);
  });

  it('연결 없는 엣지는 direct와 secondary 모두에 포함되지 않는다', () => {
    const edges: WorkflowEdge[] = [
      makeEdge('e-ab', 'A', 'B'),
      makeEdge('e-xy', 'X', 'Y'), // B와 전혀 연결 없음
    ];

    const result = computeConnectedEdges('B', edges);

    expect(result.directEdgeIds.has('e-ab')).toBe(true);
    expect(result.directEdgeIds.size).toBe(1);

    // X->Y는 B와 연결 없으므로 secondary에도 없음
    expect(result.secondaryEdgeIds.has('e-xy')).toBe(false);
    expect(result.secondaryEdgeIds.size).toBe(0);
  });

  it('빈 엣지 배열은 빈 Set을 반환한다', () => {
    const result = computeConnectedEdges('B', []);
    expect(result.directEdgeIds.size).toBe(0);
    expect(result.secondaryEdgeIds.size).toBe(0);
  });

  it('모든 엣지가 focusedPage에 연결되면 secondary가 없다', () => {
    const edges: WorkflowEdge[] = [
      makeEdge('e-ba', 'B', 'A'),
      makeEdge('e-bc', 'B', 'C'),
    ];

    const result = computeConnectedEdges('B', edges);
    expect(result.directEdgeIds.size).toBe(2);
    expect(result.secondaryEdgeIds.size).toBe(0);
  });

  it('direct 엣지는 secondary에 중복 포함되지 않는다', () => {
    // A->B, B->C, A->C
    // B 포커스: A->B, B->C는 direct. A->C는 A,C 모두 connected이므로 secondary
    const edges: WorkflowEdge[] = [
      makeEdge('e-ab', 'A', 'B'),
      makeEdge('e-bc', 'B', 'C'),
      makeEdge('e-ac', 'A', 'C'),
    ];

    const result = computeConnectedEdges('B', edges);

    expect(result.directEdgeIds.has('e-ab')).toBe(true);
    expect(result.directEdgeIds.has('e-bc')).toBe(true);
    expect(result.directEdgeIds.size).toBe(2);

    expect(result.secondaryEdgeIds.has('e-ac')).toBe(true);
    // e-ab, e-bc는 secondary에 포함되지 않아야 함
    expect(result.secondaryEdgeIds.has('e-ab')).toBe(false);
    expect(result.secondaryEdgeIds.has('e-bc')).toBe(false);
    expect(result.secondaryEdgeIds.size).toBe(1);
  });

  it('incoming 엣지도 direct로 인식한다', () => {
    const edges: WorkflowEdge[] = [
      makeEdge('e-cb', 'C', 'B'), // B가 target
    ];

    const result = computeConnectedEdges('B', edges);
    expect(result.directEdgeIds.has('e-cb')).toBe(true);
  });

  it('존재하지 않는 페이지를 포커스하면 빈 결과를 반환한다', () => {
    const edges: WorkflowEdge[] = [
      makeEdge('e-ab', 'A', 'B'),
    ];

    const result = computeConnectedEdges('Z', edges);
    expect(result.directEdgeIds.size).toBe(0);
    expect(result.secondaryEdgeIds.size).toBe(0);
  });
});
