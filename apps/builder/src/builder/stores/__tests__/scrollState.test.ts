/**
 * scrollState.ts 단위 테스트
 *
 * W3-5: overflow:scroll/auto 스크롤 상태 관리
 *
 * @since 2026-02-19 W3-5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useScrollState, getScrollState, isScrollable } from '../scrollState';

// 각 테스트 전에 상태 초기화
beforeEach(() => {
  useScrollState.getState().clearAll();
});

describe('scrollState - setScroll', () => {
  it('스크롤 위치 설정 (maxScroll 범위 내)', () => {
    const { updateMaxScroll, setScroll } = useScrollState.getState();

    // 먼저 maxScroll 설정
    updateMaxScroll('el-1', 500, 300);
    setScroll('el-1', 100, 50);

    const scroll = getScrollState('el-1');
    expect(scroll).not.toBeNull();
    expect(scroll!.scrollTop).toBe(100);
    expect(scroll!.scrollLeft).toBe(50);
  });

  it('스크롤 위치가 maxScroll을 초과하면 클램핑', () => {
    const { updateMaxScroll, setScroll } = useScrollState.getState();

    updateMaxScroll('el-1', 200, 100);
    setScroll('el-1', 300, 150);

    const scroll = getScrollState('el-1');
    expect(scroll!.scrollTop).toBe(200);
    expect(scroll!.scrollLeft).toBe(100);
  });

  it('음수 스크롤 위치는 0으로 클램핑', () => {
    const { updateMaxScroll, setScroll } = useScrollState.getState();

    updateMaxScroll('el-1', 200, 100);
    setScroll('el-1', -50, -30);

    const scroll = getScrollState('el-1');
    expect(scroll!.scrollTop).toBe(0);
    expect(scroll!.scrollLeft).toBe(0);
  });
});

describe('scrollState - updateMaxScroll', () => {
  it('maxScroll 업데이트', () => {
    const { updateMaxScroll } = useScrollState.getState();

    updateMaxScroll('el-2', 500, 200);

    const scroll = getScrollState('el-2');
    expect(scroll).not.toBeNull();
    expect(scroll!.maxScrollTop).toBe(500);
    expect(scroll!.maxScrollLeft).toBe(200);
  });

  it('음수 maxScroll은 0으로 보정', () => {
    const { updateMaxScroll } = useScrollState.getState();

    updateMaxScroll('el-2', -100, -50);

    const scroll = getScrollState('el-2');
    expect(scroll!.maxScrollTop).toBe(0);
    expect(scroll!.maxScrollLeft).toBe(0);
  });

  it('maxScroll 감소 시 기존 scrollTop이 자동 클램핑', () => {
    const { updateMaxScroll, setScroll } = useScrollState.getState();

    updateMaxScroll('el-3', 500, 300);
    setScroll('el-3', 400, 250);

    // maxScroll을 줄이면 scrollTop도 클램핑됨
    updateMaxScroll('el-3', 200, 100);

    const scroll = getScrollState('el-3');
    expect(scroll!.scrollTop).toBe(200);
    expect(scroll!.scrollLeft).toBe(100);
  });
});

describe('scrollState - scrollBy', () => {
  it('deltaY만큼 scrollTop 증가', () => {
    const { updateMaxScroll, scrollBy } = useScrollState.getState();

    updateMaxScroll('el-4', 1000, 500);
    scrollBy('el-4', 0, 100);

    const scroll = getScrollState('el-4');
    expect(scroll!.scrollTop).toBe(100);
    expect(scroll!.scrollLeft).toBe(0);
  });

  it('연속 scrollBy 누적', () => {
    const { updateMaxScroll, scrollBy } = useScrollState.getState();

    updateMaxScroll('el-4', 1000, 500);
    scrollBy('el-4', 0, 100);
    scrollBy('el-4', 50, 200);

    const scroll = getScrollState('el-4');
    expect(scroll!.scrollTop).toBe(300);
    expect(scroll!.scrollLeft).toBe(50);
  });

  it('scrollBy로 maxScroll 초과 시 클램핑', () => {
    const { updateMaxScroll, scrollBy } = useScrollState.getState();

    updateMaxScroll('el-4', 100, 50);
    scrollBy('el-4', 0, 200);

    const scroll = getScrollState('el-4');
    expect(scroll!.scrollTop).toBe(100);
  });

  it('scrollBy로 음수 방향 스크롤 시 0으로 클램핑', () => {
    const { updateMaxScroll, setScroll, scrollBy } = useScrollState.getState();

    updateMaxScroll('el-4', 500, 200);
    setScroll('el-4', 50, 30);
    scrollBy('el-4', 0, -100);

    const scroll = getScrollState('el-4');
    expect(scroll!.scrollTop).toBe(0);
  });
});

describe('scrollState - removeScroll / clearAll', () => {
  it('특정 요소의 스크롤 상태 제거', () => {
    const { updateMaxScroll, removeScroll } = useScrollState.getState();

    updateMaxScroll('el-5', 200, 100);
    removeScroll('el-5');

    expect(getScrollState('el-5')).toBeNull();
  });

  it('전체 초기화', () => {
    const { updateMaxScroll, clearAll } = useScrollState.getState();

    updateMaxScroll('el-a', 100, 50);
    updateMaxScroll('el-b', 200, 100);
    clearAll();

    expect(getScrollState('el-a')).toBeNull();
    expect(getScrollState('el-b')).toBeNull();
  });
});

describe('scrollState - isScrollable', () => {
  it('maxScroll > 0이면 스크롤 가능', () => {
    const { updateMaxScroll } = useScrollState.getState();

    updateMaxScroll('el-6', 100, 0);
    expect(isScrollable('el-6')).toBe(true);
  });

  it('maxScroll = 0이면 스크롤 불가', () => {
    const { updateMaxScroll } = useScrollState.getState();

    updateMaxScroll('el-7', 0, 0);
    expect(isScrollable('el-7')).toBe(false);
  });

  it('등록되지 않은 요소는 스크롤 불가', () => {
    expect(isScrollable('nonexistent')).toBe(false);
  });
});

describe('scrollState - getScrollState', () => {
  it('등록되지 않은 요소는 null 반환', () => {
    expect(getScrollState('nonexistent')).toBeNull();
  });

  it('등록된 요소는 O(1) 조회', () => {
    const { updateMaxScroll, setScroll } = useScrollState.getState();

    updateMaxScroll('el-8', 300, 150);
    setScroll('el-8', 100, 75);

    const scroll = getScrollState('el-8');
    expect(scroll).not.toBeNull();
    expect(scroll!.scrollTop).toBe(100);
    expect(scroll!.scrollLeft).toBe(75);
    expect(scroll!.maxScrollTop).toBe(300);
    expect(scroll!.maxScrollLeft).toBe(150);
  });
});
