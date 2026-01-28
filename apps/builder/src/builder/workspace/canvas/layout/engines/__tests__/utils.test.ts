/**
 * Layout Engine Utils Unit Tests
 *
 * 레이아웃 엔진 유틸리티 함수 테스트
 *
 * @since 2026-01-28 Phase 6 - 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseMargin,
  parsePadding,
  parseBorder,
  parseBoxModel,
  parseSize,
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
  resetWarnedTokens,
} from '../utils';
import type { Element } from '../../../../../../types/core/store.types';

// 테스트용 헬퍼
function createElement(style?: Record<string, unknown>): Element {
  return {
    id: 'test',
    type: 'div',
    props: style ? { style } : {},
    children: [],
  } as unknown as Element;
}

describe('parseMargin', () => {
  it('undefined이면 모두 0 반환', () => {
    expect(parseMargin(undefined)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('개별 속성 파싱', () => {
    const result = parseMargin({
      marginTop: 10,
      marginRight: 20,
      marginBottom: 30,
      marginLeft: 40,
    });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it('px 단위 파싱', () => {
    const result = parseMargin({
      marginTop: '10px',
      marginRight: '20px',
    });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });

  it('shorthand 파싱 (1값)', () => {
    const result = parseMargin({ margin: 10 });

    expect(result).toEqual({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
  });

  it('shorthand 파싱 (2값)', () => {
    const result = parseMargin({ margin: '10px 20px' });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 10,
      left: 20,
    });
  });

  it('shorthand 파싱 (4값)', () => {
    const result = parseMargin({ margin: '10px 20px 30px 40px' });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it('개별 속성이 shorthand보다 우선', () => {
    const result = parseMargin({
      margin: 10,
      marginTop: 50,
    });

    expect(result.top).toBe(50);
    expect(result.right).toBe(10);
  });

  it('음수 마진 파싱', () => {
    const result = parseMargin({
      marginTop: -10,
      marginBottom: '-20px',
    });

    expect(result.top).toBe(-10);
    expect(result.bottom).toBe(-20);
  });

  it('rem, em 단위는 미지원 (0으로 폴백)', () => {
    resetWarnedTokens();
    const result = parseMargin({ margin: '10rem' });

    expect(result.top).toBe(0);
  });
});

describe('parsePadding', () => {
  it('개별 속성 파싱', () => {
    const result = parsePadding({
      paddingTop: 10,
      paddingRight: 20,
    });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });

  it('shorthand 파싱', () => {
    const result = parsePadding({ padding: '10px 20px' });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });
});

describe('parseBorder', () => {
  it('개별 borderWidth 파싱', () => {
    const result = parseBorder({
      borderTopWidth: 1,
      borderRightWidth: 2,
    });

    expect(result.top).toBe(1);
    expect(result.right).toBe(2);
  });

  it('borderWidth shorthand 파싱', () => {
    const result = parseBorder({ borderWidth: '1px 2px' });

    expect(result.top).toBe(1);
    expect(result.right).toBe(2);
  });
});

describe('parseSize', () => {
  it('px 값 파싱', () => {
    expect(parseSize('100px', 400)).toBe(100);
  });

  it('숫자 값 파싱', () => {
    expect(parseSize(100, 400)).toBe(100);
  });

  it('% 값 파싱 (부모 기준)', () => {
    expect(parseSize('50%', 400)).toBe(200);
  });

  it('vh 값 파싱', () => {
    expect(parseSize('50vh', 400, 1920, 1080)).toBe(540);
  });

  it('vw 값 파싱', () => {
    expect(parseSize('50vw', 400, 1920, 1080)).toBe(960);
  });

  it('auto는 undefined 반환', () => {
    expect(parseSize('auto', 400)).toBeUndefined();
  });

  it('undefined는 undefined 반환', () => {
    expect(parseSize(undefined, 400)).toBeUndefined();
  });

  it('rem, em은 undefined 반환 (미지원)', () => {
    expect(parseSize('10rem', 400)).toBeUndefined();
    expect(parseSize('10em', 400)).toBeUndefined();
  });

  it('viewport 크기 미제공 시 vh/vw는 undefined', () => {
    expect(parseSize('50vh', 400)).toBeUndefined();
    expect(parseSize('50vw', 400)).toBeUndefined();
  });
});

describe('parseBoxModel', () => {
  it('기본 박스 모델 파싱', () => {
    const element = createElement({
      width: 200,
      height: 100,
      paddingTop: 10,
      borderTopWidth: 2,
    });

    const result = parseBoxModel(element, 400, 800);

    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.padding.top).toBe(10);
    expect(result.border.top).toBe(2);
  });

  it('% width 계산', () => {
    const element = createElement({ width: '50%' });

    const result = parseBoxModel(element, 400, 800);

    expect(result.width).toBe(200);
  });

  it('vh/vw 계산', () => {
    const element = createElement({ width: '10vw', height: '20vh' });

    const result = parseBoxModel(element, 400, 800, 1920, 1080);

    expect(result.width).toBe(192); // 1920 * 0.1
    expect(result.height).toBe(216); // 1080 * 0.2
  });
});

describe('parseVerticalAlign', () => {
  it('undefined이면 baseline 반환', () => {
    expect(parseVerticalAlign(undefined)).toBe('baseline');
  });

  it('verticalAlign 없으면 baseline 반환', () => {
    expect(parseVerticalAlign({})).toBe('baseline');
  });

  it('top 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'top' })).toBe('top');
  });

  it('bottom 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'bottom' })).toBe('bottom');
  });

  it('middle 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'middle' })).toBe('middle');
  });

  it('baseline 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'baseline' })).toBe('baseline');
  });

  it('text-top은 baseline으로 폴백 (미지원)', () => {
    expect(parseVerticalAlign({ verticalAlign: 'text-top' })).toBe('baseline');
  });

  it('알 수 없는 값은 baseline으로 폴백', () => {
    expect(parseVerticalAlign({ verticalAlign: 'unknown' })).toBe('baseline');
  });
});

describe('parseLineHeight', () => {
  it('undefined이면 undefined 반환', () => {
    expect(parseLineHeight(undefined)).toBeUndefined();
  });

  it('normal이면 undefined 반환', () => {
    expect(parseLineHeight({ lineHeight: 'normal' })).toBeUndefined();
  });

  it('숫자 (배율) 파싱', () => {
    // 1.5 배율, 기본 폰트 16px
    expect(parseLineHeight({ lineHeight: 1.5 })).toBe(24);
  });

  it('숫자 (배율) + fontSize 지정', () => {
    expect(parseLineHeight({ lineHeight: 1.5 }, 20)).toBe(30);
  });

  it('px 값 파싱', () => {
    expect(parseLineHeight({ lineHeight: '24px' })).toBe(24);
  });

  it('숫자 문자열 (배율) 파싱', () => {
    expect(parseLineHeight({ lineHeight: '1.5' })).toBe(24);
  });
});

describe('calculateBaseline', () => {
  it('일반 요소는 하단 근처에 baseline', () => {
    const element = createElement({ height: 100 });
    const baseline = calculateBaseline(element, 100);

    // 기본적으로 높이의 약 80% 지점
    expect(baseline).toBe(80);
  });

  it('overflow: hidden이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'hidden' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflow: auto이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'auto' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflow: scroll이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'scroll' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflowY: hidden이면 하단이 baseline', () => {
    const element = createElement({ overflowY: 'hidden' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('높이 0이면 baseline도 0', () => {
    const element = createElement({});
    const baseline = calculateBaseline(element, 0);

    expect(baseline).toBe(0);
  });
});

describe('resetWarnedTokens', () => {
  beforeEach(() => {
    resetWarnedTokens();
  });

  it('경고 초기화 후 다시 경고 가능', () => {
    // 이 테스트는 경고가 1회만 출력되는지 직접 검증하기 어려움
    // resetWarnedTokens가 에러 없이 실행되는지만 확인
    expect(() => resetWarnedTokens()).not.toThrow();
  });
});
