/**
 * workflowHitTest Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sampleBezierCurve,
  pointToBezierDistance,
  hitTestEdges,
  hitTestPageFrame,
  type CachedEdgeGeometry,
} from '../workflowHitTest';

// ============================================
// sampleBezierCurve
// ============================================

describe('sampleBezierCurve', () => {
  it('직선 베지어에서 시작점과 끝점을 정확히 반환한다', () => {
    // P0 = P1 = (0,0), P2 = P3 = (100,0) -> 직선
    const samples = sampleBezierCurve(0, 0, 0, 0, 100, 0, 100, 0);

    // t=0 -> (0, 0)
    expect(samples[0].x).toBeCloseTo(0, 5);
    expect(samples[0].y).toBeCloseTo(0, 5);
    expect(samples[0].t).toBe(0);

    // t=1 -> (100, 0)
    const last = samples[samples.length - 1];
    expect(last.x).toBeCloseTo(100, 5);
    expect(last.y).toBeCloseTo(0, 5);
    expect(last.t).toBe(1);
  });

  it('기본 n=20으로 21개의 포인트를 반환한다', () => {
    const samples = sampleBezierCurve(0, 0, 10, 20, 80, 20, 100, 0);
    expect(samples).toHaveLength(21);
  });

  it('n=10이면 11개의 포인트를 반환한다', () => {
    const samples = sampleBezierCurve(0, 0, 10, 20, 80, 20, 100, 0, 10);
    expect(samples).toHaveLength(11);
  });

  it('직선 베지어에서 중간점이 올바른 위치에 있다', () => {
    // 직선 (0,0) -> (100,0), 제어점도 직선 위
    const samples = sampleBezierCurve(0, 0, 33.33, 0, 66.67, 0, 100, 0);

    // t=0.5 -> 약 (50, 0)
    const mid = samples[10]; // n=20, index 10 = t=0.5
    expect(mid.x).toBeCloseTo(50, 0);
    expect(mid.y).toBeCloseTo(0, 0);
  });

  it('각 샘플의 t 값이 0부터 1까지 균일하게 증가한다', () => {
    const samples = sampleBezierCurve(0, 0, 25, 50, 75, 50, 100, 0, 4);
    expect(samples.map((s) => s.t)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

// ============================================
// pointToBezierDistance
// ============================================

describe('pointToBezierDistance', () => {
  it('곡선 위의 시작점에서의 거리가 0에 가깝다', () => {
    const samples = sampleBezierCurve(0, 0, 30, 50, 70, 50, 100, 0);
    const dist = pointToBezierDistance(0, 0, samples);
    expect(dist).toBeCloseTo(0, 3);
  });

  it('곡선 위의 끝점에서의 거리가 0에 가깝다', () => {
    const samples = sampleBezierCurve(0, 0, 30, 50, 70, 50, 100, 0);
    const dist = pointToBezierDistance(100, 0, samples);
    expect(dist).toBeCloseTo(0, 3);
  });

  it('곡선에서 멀리 떨어진 점은 큰 거리를 반환한다', () => {
    const samples = sampleBezierCurve(0, 0, 30, 50, 70, 50, 100, 0);
    const dist = pointToBezierDistance(50, 200, samples);
    expect(dist).toBeGreaterThan(100);
  });

  it('직선 곡선에서 가까운 점의 거리가 정확하다', () => {
    // 직선 (0,0) -> (100,0)
    const samples = sampleBezierCurve(0, 0, 33, 0, 67, 0, 100, 0);
    // (50, 10)에서 직선까지의 거리는 약 10
    const dist = pointToBezierDistance(50, 10, samples);
    expect(dist).toBeCloseTo(10, 0);
  });
});

// ============================================
// hitTestEdges
// ============================================

describe('hitTestEdges', () => {
  function makeStraightEdgeCache(
    edgeId: string,
    sx: number, sy: number,
    ex: number, ey: number,
  ): CachedEdgeGeometry {
    const samples = sampleBezierCurve(sx, sy, sx, sy, ex, ey, ex, ey);
    return {
      edgeId,
      samples,
      sx, sy, ex, ey,
      cpx1: sx, cpy1: sy,
      cpx2: ex, cpy2: ey,
    };
  }

  it('threshold 이내의 엣지를 반환한다', () => {
    const cache = [makeStraightEdgeCache('edge-1', 0, 0, 100, 0)];
    const result = hitTestEdges(50, 5, cache, 10);
    expect(result).not.toBeNull();
    expect(result!.edgeId).toBe('edge-1');
    expect(result!.distance).toBeLessThan(10);
  });

  it('threshold 밖의 엣지는 null을 반환한다', () => {
    const cache = [makeStraightEdgeCache('edge-1', 0, 0, 100, 0)];
    const result = hitTestEdges(50, 50, cache, 8);
    expect(result).toBeNull();
  });

  it('여러 엣지 중 가장 가까운 것을 반환한다', () => {
    const cache = [
      makeStraightEdgeCache('edge-far', 0, 50, 100, 50),
      makeStraightEdgeCache('edge-near', 0, 10, 100, 10),
    ];
    const result = hitTestEdges(50, 12, cache, 20);
    expect(result).not.toBeNull();
    expect(result!.edgeId).toBe('edge-near');
  });

  it('빈 캐시는 null을 반환한다', () => {
    const result = hitTestEdges(50, 50, [], 10);
    expect(result).toBeNull();
  });

  it('기본 threshold는 8이다', () => {
    const cache = [makeStraightEdgeCache('edge-1', 0, 0, 100, 0)];
    // 거리 7은 기본 threshold 8 이내
    const result1 = hitTestEdges(50, 7, cache);
    expect(result1).not.toBeNull();

    // 거리 9는 기본 threshold 8 초과
    const result2 = hitTestEdges(50, 9, cache);
    expect(result2).toBeNull();
  });
});

// ============================================
// hitTestPageFrame
// ============================================

describe('hitTestPageFrame', () => {
  const pageFrameMap = new Map([
    ['page-a', { id: 'page-a', x: 0, y: 0, width: 200, height: 100 }],
    ['page-b', { id: 'page-b', x: 300, y: 0, width: 200, height: 100 }],
  ]);

  it('프레임 내부의 점은 해당 pageId를 반환한다', () => {
    expect(hitTestPageFrame(100, 50, pageFrameMap)).toBe('page-a');
  });

  it('두 번째 프레임 내부의 점은 해당 pageId를 반환한다', () => {
    expect(hitTestPageFrame(400, 50, pageFrameMap)).toBe('page-b');
  });

  it('어떤 프레임에도 속하지 않으면 null을 반환한다', () => {
    expect(hitTestPageFrame(250, 50, pageFrameMap)).toBeNull();
  });

  it('프레임 경계(edge)의 점도 포함한다', () => {
    // (0, 0) = top-left corner of page-a
    expect(hitTestPageFrame(0, 0, pageFrameMap)).toBe('page-a');
    // (200, 100) = bottom-right corner of page-a
    expect(hitTestPageFrame(200, 100, pageFrameMap)).toBe('page-a');
  });

  it('빈 pageFrameMap은 null을 반환한다', () => {
    expect(hitTestPageFrame(50, 50, new Map())).toBeNull();
  });
});
