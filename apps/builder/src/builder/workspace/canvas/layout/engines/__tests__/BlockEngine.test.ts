/**
 * BlockEngine Unit Tests
 *
 * CSS Block/Inline-Block 레이아웃 엔진 테스트
 *
 * @since 2026-01-28 Phase 6 - 검증
 */

import { describe, it, expect } from 'vitest';
import { BlockEngine } from '../BlockEngine';
import type { Element } from '../../../../../../types/core/store.types';

// 테스트용 헬퍼: 간단한 Element 생성
function createElement(
  id: string,
  style?: Record<string, unknown>
): Element {
  return {
    id,
    type: 'div',
    props: style ? { style } : {},
    children: [],
  } as unknown as Element;
}

describe('BlockEngine', () => {
  const engine = new BlockEngine();

  describe('Block Layout (수직 쌓임)', () => {
    it('블록 요소들이 수직으로 쌓임', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100 }),
        createElement('2', { height: 200 }),
        createElement('3', { height: 50 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBe(100);
      expect(layouts[2].y).toBe(300);
    });

    it('width 미지정 시 100% 기본값 적용', () => {
      const parent = createElement('parent');
      const children = [createElement('1', { height: 100 })];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].width).toBe(400);
    });

    it('명시적 width가 있으면 해당 값 사용', () => {
      const parent = createElement('parent');
      const children = [createElement('1', { width: 200, height: 100 })];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].width).toBe(200);
    });

    it('margin-left/right가 width에서 차감됨', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100, marginLeft: 20, marginRight: 30 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // width 미지정 시: 400 - 20 - 30 = 350
      expect(layouts[0].width).toBe(350);
      expect(layouts[0].x).toBe(20);
    });
  });

  describe('Margin Collapse (형제)', () => {
    it('인접 양수 마진이 큰 값으로 collapse', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100, marginBottom: 20 }),
        createElement('2', { height: 100, marginTop: 30 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 두 번째 요소: 100 + 30 (큰 값), not 100 + 50
      expect(layouts[1].y).toBe(100 + 30);
    });

    it('인접 음수 마진이 절대값 큰 값으로 collapse', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100, marginBottom: -20 }),
        createElement('2', { height: 100, marginTop: -10 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 음수끼리: -20 (절대값 큰 값)
      expect(layouts[1].y).toBe(100 - 20);
    });

    it('양수/음수 혼합 마진이 합산됨', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100, marginBottom: 50 }),
        createElement('2', { height: 100, marginTop: -20 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 50 + (-20) = 30
      expect(layouts[1].y).toBe(100 + 30);
    });
  });

  describe('Inline-Block Layout (가로 배치)', () => {
    it('inline-block 요소들이 가로로 배치됨', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 100, height: 50 }),
        createElement('2', { display: 'inline-block', width: 100, height: 50 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].x).toBe(0);
      expect(layouts[1].x).toBe(100);
      expect(layouts[0].y).toBe(layouts[1].y); // 같은 줄
    });

    it('공간 부족 시 다음 줄로 줄바꿈', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 300, height: 50 }),
        createElement('2', { display: 'inline-block', width: 200, height: 50 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBe(50); // 다음 줄
      expect(layouts[1].x).toBe(0); // 줄 시작
    });

    it('margin 포함하여 줄바꿈 계산', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 150, height: 50, marginRight: 50 }),
        createElement('2', { display: 'inline-block', width: 150, height: 50, marginLeft: 50 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 첫 번째: 150 + 50(marginRight) = 200
      // 두 번째: 50(marginLeft) + 150 = 200
      // 합계 400, 딱 맞음
      expect(layouts[1].y).toBe(0); // 같은 줄
    });
  });

  describe('vertical-align (P2)', () => {
    it('vertical-align: top은 줄 상단에 정렬', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 50, height: 100 }),
        createElement('2', { display: 'inline-block', width: 50, height: 50, verticalAlign: 'top' }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 두 번째 요소가 상단 정렬
      expect(layouts[1].y).toBe(0);
    });

    it('vertical-align: bottom은 줄 하단에 정렬', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 50, height: 100 }),
        createElement('2', { display: 'inline-block', width: 50, height: 50, verticalAlign: 'bottom' }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 두 번째 요소가 하단 정렬: lineHeight(100) - height(50) = 50
      expect(layouts[1].y).toBe(50);
    });

    it('vertical-align: middle은 줄 중앙에 정렬', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 50, height: 100 }),
        createElement('2', { display: 'inline-block', width: 50, height: 50, verticalAlign: 'middle' }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 두 번째 요소가 중앙 정렬: (100 - 50) / 2 = 25
      expect(layouts[1].y).toBe(25);
    });
  });

  describe('BFC (Block Formatting Context)', () => {
    it('display: flow-root가 BFC 생성', () => {
      const element = createElement('test', { display: 'flow-root' });
      expect(engine.createsBFC(element)).toBe(true);
    });

    it('display: flex가 BFC 생성', () => {
      const element = createElement('test', { display: 'flex' });
      expect(engine.createsBFC(element)).toBe(true);
    });

    it('display: inline-block이 BFC 생성', () => {
      const element = createElement('test', { display: 'inline-block' });
      expect(engine.createsBFC(element)).toBe(true);
    });

    it('overflow: hidden이 BFC 생성', () => {
      const element = createElement('test', { overflow: 'hidden' });
      expect(engine.createsBFC(element)).toBe(true);
    });

    it('position: absolute가 BFC 생성', () => {
      const element = createElement('test', { position: 'absolute' });
      expect(engine.createsBFC(element)).toBe(true);
    });

    it('기본 block은 BFC 생성 안함', () => {
      const element = createElement('test', { display: 'block' });
      expect(engine.createsBFC(element)).toBe(false);
    });

    it('BFC 생성 요소는 margin collapse 참여 안함', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100, marginBottom: 20 }),
        createElement('2', { height: 100, marginTop: 30, overflow: 'hidden' }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // BFC 생성 요소는 margin collapse 안함: 100 + 20 + 30 = 150
      expect(layouts[1].y).toBe(150);
    });
  });

  describe('빈 블록 Margin Collapse', () => {
    it('빈 블록의 top/bottom 마진이 자기끼리 collapse', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100 }),
        createElement('empty', { height: 0, marginTop: 20, marginBottom: 30 }), // 명시적 height: 0
        createElement('2', { height: 100 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // 빈 블록: 20과 30이 collapse되어 30
      // 두 번째 일반 블록: 100 + 30 = 130
      expect(layouts[2].y).toBe(100 + 30);
    });
  });

  describe('Block/Inline-Block 혼합', () => {
    it('inline-block 뒤에 block이 오면 줄바꿈', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { display: 'inline-block', width: 100, height: 50 }),
        createElement('2', { display: 'inline-block', width: 100, height: 50 }),
        createElement('3', { height: 100 }), // block
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      // inline-block들: y=0
      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBe(0);
      // block: inline-block 줄 이후
      expect(layouts[2].y).toBe(50);
    });

    it('block 뒤에 inline-block이 오면 새 줄 시작', () => {
      const parent = createElement('parent');
      const children = [
        createElement('1', { height: 100 }), // block
        createElement('2', { display: 'inline-block', width: 100, height: 50 }),
      ];

      const layouts = engine.calculate(parent, children, 400, 800);

      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBe(100);
    });
  });

  describe('자식 없음', () => {
    it('자식이 없으면 빈 배열 반환', () => {
      const parent = createElement('parent');
      const layouts = engine.calculate(parent, [], 400, 800);

      expect(layouts).toEqual([]);
    });
  });
});
