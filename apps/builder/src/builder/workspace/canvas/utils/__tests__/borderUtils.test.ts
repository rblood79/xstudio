/**
 * borderUtils Unit Tests
 *
 * @since 2025-12-15 Canvas Border-Box v2
 */

import { describe, it, expect } from 'vitest';
import {
  parseBorderStyle,
  parseBorderConfig,
  getBorderBoxOffset,
  getSafeBorderRadius,
  getBorderBoxInnerBounds,
  isValidBorder,
  getContentBoundsWithBorder,
} from '../borderUtils';

describe('parseBorderStyle', () => {
  it('undefined이면 none 반환', () => {
    expect(parseBorderStyle(undefined)).toBe('none');
  });

  it('none이면 none 반환', () => {
    expect(parseBorderStyle('none')).toBe('none');
  });

  it('solid 반환', () => {
    expect(parseBorderStyle('solid')).toBe('solid');
    expect(parseBorderStyle('SOLID')).toBe('solid');
  });

  it('dashed 반환', () => {
    expect(parseBorderStyle('dashed')).toBe('dashed');
    expect(parseBorderStyle('DASHED')).toBe('dashed');
  });

  it('dotted 반환', () => {
    expect(parseBorderStyle('dotted')).toBe('dotted');
  });

  it('double 반환', () => {
    expect(parseBorderStyle('double')).toBe('double');
  });

  it('알 수 없는 값은 solid 반환', () => {
    expect(parseBorderStyle('unknown')).toBe('solid');
    expect(parseBorderStyle('groove')).toBe('solid');
  });
});

describe('parseBorderConfig', () => {
  it('style이 undefined면 null 반환', () => {
    expect(parseBorderConfig(undefined)).toBeNull();
  });

  it('borderWidth, borderColor 둘 다 없으면 null 반환', () => {
    expect(parseBorderConfig({ backgroundColor: '#fff' })).toBeNull();
  });

  it('borderWidth가 0이면 null 반환', () => {
    expect(parseBorderConfig({ borderWidth: 0, borderColor: '#000' })).toBeNull();
  });

  it('유효한 border 설정 파싱', () => {
    const result = parseBorderConfig({
      borderWidth: 2,
      borderColor: '#ff0000',
      borderStyle: 'dashed',
      borderRadius: 8,
    });

    expect(result).not.toBeNull();
    expect(result?.width).toBe(2);
    expect(result?.color).toBe(0xff0000);
    expect(result?.style).toBe('dashed');
    expect(result?.radius).toBe(8);
  });

  it('borderWidth만 있어도 파싱', () => {
    const result = parseBorderConfig({ borderWidth: 1 });
    expect(result).not.toBeNull();
    expect(result?.width).toBe(1);
    expect(result?.color).toBe(0x000000); // 기본값
  });

  it('px 단위 파싱', () => {
    const result = parseBorderConfig({ borderWidth: '4px', borderColor: '#000' });
    expect(result?.width).toBe(4);
  });
});

describe('getBorderBoxOffset', () => {
  it('borderWidth의 절반 반환', () => {
    expect(getBorderBoxOffset(4)).toBe(2);
    expect(getBorderBoxOffset(1)).toBe(0.5);
    expect(getBorderBoxOffset(0)).toBe(0);
    expect(getBorderBoxOffset(10)).toBe(5);
  });
});

describe('getSafeBorderRadius', () => {
  it('radius - offset 반환', () => {
    expect(getSafeBorderRadius(8, 2)).toBe(6);
    expect(getSafeBorderRadius(10, 5)).toBe(5);
  });

  it('음수가 되면 0 반환', () => {
    expect(getSafeBorderRadius(1, 2)).toBe(0);
    expect(getSafeBorderRadius(0, 5)).toBe(0);
    expect(getSafeBorderRadius(8, 10)).toBe(0);
  });
});

describe('getBorderBoxInnerBounds', () => {
  it('borderWidth 0이면 원본 크기 유지', () => {
    const result = getBorderBoxInnerBounds(100, 50, 0, 8);
    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      radius: 8,
    });
  });

  it('borderWidth 4이면 offset 2 적용', () => {
    const result = getBorderBoxInnerBounds(100, 50, 4, 8);
    expect(result).toEqual({
      x: 2,
      y: 2,
      width: 96,
      height: 46,
      radius: 6,
    });
  });

  it('radius < offset이면 radius 0', () => {
    const result = getBorderBoxInnerBounds(100, 50, 20, 8);
    expect(result.radius).toBe(0); // 8 - 10 = -2 → 0
  });

  it('width/height 음수 방지', () => {
    const result = getBorderBoxInnerBounds(10, 10, 20, 0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('정상적인 계산', () => {
    // 200x100 요소, border 6px, radius 12px
    const result = getBorderBoxInnerBounds(200, 100, 6, 12);
    expect(result.x).toBe(3); // 6/2
    expect(result.y).toBe(3);
    expect(result.width).toBe(194); // 200 - 6
    expect(result.height).toBe(94); // 100 - 6
    expect(result.radius).toBe(9); // 12 - 3
  });
});

describe('isValidBorder', () => {
  it('null이면 false', () => {
    expect(isValidBorder(null)).toBe(false);
  });

  it('undefined이면 false', () => {
    expect(isValidBorder(undefined)).toBe(false);
  });

  it('width가 0이면 false', () => {
    expect(isValidBorder({
      width: 0,
      color: 0x000000,
      alpha: 1,
      style: 'solid',
      radius: 0,
    })).toBe(false);
  });

  it('style이 none이면 false', () => {
    expect(isValidBorder({
      width: 2,
      color: 0x000000,
      alpha: 1,
      style: 'none',
      radius: 0,
    })).toBe(false);
  });

  it('유효한 border면 true', () => {
    expect(isValidBorder({
      width: 2,
      color: 0x000000,
      alpha: 1,
      style: 'solid',
      radius: 4,
    })).toBe(true);
  });
});

describe('getContentBoundsWithBorder', () => {
  it('border 두께만큼 content 영역 축소', () => {
    const result = getContentBoundsWithBorder(100, 50, 4);
    expect(result).toEqual({
      x: 4,
      y: 4,
      width: 92, // 100 - 4*2
      height: 42, // 50 - 4*2
    });
  });

  it('borderWidth 0이면 원본 크기', () => {
    const result = getContentBoundsWithBorder(100, 50, 0);
    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  it('width/height 음수 방지', () => {
    const result = getContentBoundsWithBorder(10, 10, 10);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });
});
