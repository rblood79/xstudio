import { describe, it, expect } from 'vitest';
import { computeDirtyRectsFromInfo } from '../dirtyRectUtils';

describe('computeDirtyRectsFromInfo', () => {
  it('이동 전/후 bounds를 union하여 dirty rect를 만든다', () => {
    const prev = new Map([
      ['a', { bounds: { x: 0, y: 0, width: 10, height: 10 }, expand: 2 }],
    ]);
    const next = new Map([
      ['a', { bounds: { x: 20, y: 0, width: 10, height: 10 }, expand: 2 }],
    ]);

    const rects = computeDirtyRectsFromInfo(prev, next, ['a']);
    expect(rects).toEqual([{ x: -2, y: -2, width: 34, height: 14 }]);
  });

  it('삭제된 요소는 이전 bounds만으로 dirty rect를 만든다', () => {
    const prev = new Map([
      ['a', { bounds: { x: 5, y: 5, width: 10, height: 10 }, expand: 2 }],
    ]);
    const next = new Map();

    const rects = computeDirtyRectsFromInfo(prev, next, ['a']);
    expect(rects).toEqual([{ x: 3, y: 3, width: 14, height: 14 }]);
  });

  it('dirtyIds가 비어 있으면 undefined를 반환한다', () => {
    const rects = computeDirtyRectsFromInfo(new Map(), new Map(), []);
    expect(rects).toBeUndefined();
  });

  it('id가 양쪽 맵에 없으면 undefined를 반환한다', () => {
    const rects = computeDirtyRectsFromInfo(new Map(), new Map(), ['missing']);
    expect(rects).toBeUndefined();
  });
});

