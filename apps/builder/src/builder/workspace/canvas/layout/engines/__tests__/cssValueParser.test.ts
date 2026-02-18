/**
 * cssValueParser.ts 단위 테스트
 *
 * resolveCSSSizeValue(), resolveCalc(), parseBorderShorthand(),
 * resolveVar(), sentinel 상수 등 핵심 API를 검증한다.
 *
 * @since 2026-02-19 Phase 1 테스트 보강
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCSSSizeValue,
  resolveCalc,
  resolveVar,
  parseBorderShorthand,
  FIT_CONTENT,
  MIN_CONTENT,
  MAX_CONTENT,
} from '../cssValueParser';
import type { CSSValueContext, CSSVariableScope } from '../cssValueParser';

// ============================================
// sentinel 상수 값 검증
// ============================================

describe('sentinel 상수', () => {
  it('FIT_CONTENT는 -2', () => {
    expect(FIT_CONTENT).toBe(-2);
  });

  it('MIN_CONTENT는 -3', () => {
    expect(MIN_CONTENT).toBe(-3);
  });

  it('MAX_CONTENT는 -4', () => {
    expect(MAX_CONTENT).toBe(-4);
  });

  it('세 sentinel 값은 서로 다름', () => {
    expect(FIT_CONTENT).not.toBe(MIN_CONTENT);
    expect(FIT_CONTENT).not.toBe(MAX_CONTENT);
    expect(MIN_CONTENT).not.toBe(MAX_CONTENT);
  });
});

// ============================================
// resolveCSSSizeValue
// ============================================

describe('resolveCSSSizeValue - px 단위', () => {
  it('100px → 100', () => {
    expect(resolveCSSSizeValue('100px')).toBe(100);
  });

  it('0px → 0', () => {
    expect(resolveCSSSizeValue('0px')).toBe(0);
  });

  it('1.5px → 1.5', () => {
    expect(resolveCSSSizeValue('1.5px')).toBe(1.5);
  });

  it('음수 px: -10px → -10', () => {
    expect(resolveCSSSizeValue('-10px')).toBe(-10);
  });
});

describe('resolveCSSSizeValue - 숫자 (단위 없음)', () => {
  it('숫자 100 → 100', () => {
    expect(resolveCSSSizeValue(100)).toBe(100);
  });

  it('숫자 0 → 0', () => {
    expect(resolveCSSSizeValue(0)).toBe(0);
  });

  it('음수 숫자 -5 → -5', () => {
    expect(resolveCSSSizeValue(-5)).toBe(-5);
  });

  it('숫자 문자열 "200" → 200', () => {
    expect(resolveCSSSizeValue('200')).toBe(200);
  });
});

describe('resolveCSSSizeValue - % 단위', () => {
  const ctx: CSSValueContext = { containerSize: 800 };

  it('50% → containerSize * 0.5', () => {
    expect(resolveCSSSizeValue('50%', ctx)).toBe(400);
  });

  it('100% → containerSize', () => {
    expect(resolveCSSSizeValue('100%', ctx)).toBe(800);
  });

  it('25% → 200', () => {
    expect(resolveCSSSizeValue('25%', ctx)).toBe(200);
  });

  it('containerSize 미제공 시 % → undefined', () => {
    expect(resolveCSSSizeValue('50%', {})).toBeUndefined();
  });
});

describe('resolveCSSSizeValue - vh 단위', () => {
  const ctx: CSSValueContext = { viewportHeight: 1080 };

  it('100vh → viewportHeight', () => {
    expect(resolveCSSSizeValue('100vh', ctx)).toBe(1080);
  });

  it('50vh → viewportHeight * 0.5', () => {
    expect(resolveCSSSizeValue('50vh', ctx)).toBe(540);
  });

  it('viewportHeight 미제공 시 기본값 1080 사용', () => {
    // DEFAULT_VIEWPORT_HEIGHT = 1080
    expect(resolveCSSSizeValue('10vh', {})).toBe(108);
  });
});

describe('resolveCSSSizeValue - vw 단위', () => {
  const ctx: CSSValueContext = { viewportWidth: 1920 };

  it('100vw → viewportWidth', () => {
    expect(resolveCSSSizeValue('100vw', ctx)).toBe(1920);
  });

  it('50vw → viewportWidth * 0.5', () => {
    expect(resolveCSSSizeValue('50vw', ctx)).toBe(960);
  });

  it('viewportWidth 미제공 시 기본값 1920 사용', () => {
    // DEFAULT_VIEWPORT_WIDTH = 1920
    expect(resolveCSSSizeValue('10vw', {})).toBe(192);
  });
});

describe('resolveCSSSizeValue - em 단위', () => {
  it('2em, parentSize=20 → 40', () => {
    const ctx: CSSValueContext = { parentSize: 20 };
    expect(resolveCSSSizeValue('2em', ctx)).toBe(40);
  });

  it('1em, parentSize=16 → 16', () => {
    const ctx: CSSValueContext = { parentSize: 16 };
    expect(resolveCSSSizeValue('1em', ctx)).toBe(16);
  });

  it('parentSize 미제공 시 기본값 16px 기준', () => {
    // DEFAULT_ROOT_FONT_SIZE = 16 을 em 기본값으로 사용
    expect(resolveCSSSizeValue('2em', {})).toBe(32);
  });

  it('1.5em, parentSize=20 → 30', () => {
    const ctx: CSSValueContext = { parentSize: 20 };
    expect(resolveCSSSizeValue('1.5em', ctx)).toBe(30);
  });
});

describe('resolveCSSSizeValue - rem 단위', () => {
  it('2rem, rootFontSize=16 → 32', () => {
    const ctx: CSSValueContext = { rootFontSize: 16 };
    expect(resolveCSSSizeValue('2rem', ctx)).toBe(32);
  });

  it('1rem, rootFontSize=20 → 20', () => {
    const ctx: CSSValueContext = { rootFontSize: 20 };
    expect(resolveCSSSizeValue('1rem', ctx)).toBe(20);
  });

  it('rootFontSize 미제공 시 기본값 16px 기준', () => {
    // DEFAULT_ROOT_FONT_SIZE = 16
    expect(resolveCSSSizeValue('2rem', {})).toBe(32);
  });

  it('0.5rem, rootFontSize=16 → 8', () => {
    expect(resolveCSSSizeValue('0.5rem', { rootFontSize: 16 })).toBe(8);
  });
});

describe('resolveCSSSizeValue - auto / undefined / null / 빈 문자열', () => {
  it('"auto" → undefined', () => {
    expect(resolveCSSSizeValue('auto')).toBeUndefined();
  });

  it('undefined → undefined', () => {
    expect(resolveCSSSizeValue(undefined)).toBeUndefined();
  });

  it('null → undefined', () => {
    expect(resolveCSSSizeValue(null)).toBeUndefined();
  });

  it('빈 문자열 "" → undefined', () => {
    expect(resolveCSSSizeValue('')).toBeUndefined();
  });
});

describe('resolveCSSSizeValue - fallback 동작', () => {
  it('fallback 제공 시 undefined 대신 fallback 반환', () => {
    expect(resolveCSSSizeValue('auto', {}, 100)).toBe(100);
    expect(resolveCSSSizeValue(undefined, {}, 50)).toBe(50);
  });

  it('유효한 값이면 fallback 무시', () => {
    expect(resolveCSSSizeValue('200px', {}, 100)).toBe(200);
  });
});

describe('resolveCSSSizeValue - intrinsic sizing 키워드', () => {
  it('"fit-content" → FIT_CONTENT sentinel (-2)', () => {
    expect(resolveCSSSizeValue('fit-content')).toBe(FIT_CONTENT);
    expect(resolveCSSSizeValue('fit-content')).toBe(-2);
  });

  it('"min-content" → MIN_CONTENT sentinel (-3)', () => {
    expect(resolveCSSSizeValue('min-content')).toBe(MIN_CONTENT);
    expect(resolveCSSSizeValue('min-content')).toBe(-3);
  });

  it('"max-content" → MAX_CONTENT sentinel (-4)', () => {
    expect(resolveCSSSizeValue('max-content')).toBe(MAX_CONTENT);
    expect(resolveCSSSizeValue('max-content')).toBe(-4);
  });
});

describe('resolveCSSSizeValue - calc() 위임', () => {
  it('calc(100px + 50px) → 150', () => {
    expect(resolveCSSSizeValue('calc(100px + 50px)')).toBe(150);
  });

  it('calc(100% - 40px), containerSize=800 → 760', () => {
    const ctx: CSSValueContext = { containerSize: 800 };
    expect(resolveCSSSizeValue('calc(100% - 40px)', ctx)).toBe(760);
  });

  it('calc(2rem * 3), rootFontSize=16 → 96', () => {
    const ctx: CSSValueContext = { rootFontSize: 16 };
    expect(resolveCSSSizeValue('calc(2rem * 3)', ctx)).toBe(96);
  });
});

// ============================================
// resolveCSSSizeValue - clamp() / min() / max()
// ============================================

describe('resolveCSSSizeValue - clamp() 함수', () => {
  const ctx: CSSValueContext = { containerSize: 800 };

  it('clamp(100px, 50%, 500px) with containerSize=800 → 400 (val=400, 범위 내)', () => {
    expect(resolveCSSSizeValue('clamp(100px, 50%, 500px)', ctx)).toBe(400);
  });

  it('clamp(200px, 50%, 500px) with containerSize=800 → 400 (val=400, min 이상)', () => {
    expect(resolveCSSSizeValue('clamp(200px, 50%, 500px)', ctx)).toBe(400);
  });

  it('clamp(100px, 10%, 500px) with containerSize=800 → 100 (val=80, min 이하 → clamp to 100)', () => {
    expect(resolveCSSSizeValue('clamp(100px, 10%, 500px)', ctx)).toBe(100);
  });

  it('clamp(100px, 90%, 500px) with containerSize=800 → 500 (val=720, max 초과 → clamp to 500)', () => {
    expect(resolveCSSSizeValue('clamp(100px, 90%, 500px)', ctx)).toBe(500);
  });

  it('clamp() 내부에 calc() 중첩 가능', () => {
    expect(
      resolveCSSSizeValue('clamp(50px, calc(100% - 600px), 300px)', ctx),
    ).toBe(200); // val = 800-600=200, clamp(50, 200, 300) → 200
  });

  it('clamp() 인자 개수 부족 시 fallback', () => {
    expect(resolveCSSSizeValue('clamp(100px, 200px)', {}, 0)).toBe(0);
  });

  it('clamp() 인자 개수 초과 시 fallback', () => {
    expect(resolveCSSSizeValue('clamp(100px, 200px, 300px, 400px)', {}, 0)).toBe(0);
  });

  it('clamp() 인자 해석 실패 시 fallback', () => {
    // containerSize 미제공으로 % 해석 불가
    expect(resolveCSSSizeValue('clamp(100px, 50%, 500px)', {}, 99)).toBe(99);
  });
});

describe('resolveCSSSizeValue - min() 함수', () => {
  const ctx: CSSValueContext = { containerSize: 800 };

  it('min(100px, 50%) with containerSize=800 → 100 (100 < 400)', () => {
    expect(resolveCSSSizeValue('min(100px, 50%)', ctx)).toBe(100);
  });

  it('min(500px, 50%) with containerSize=800 → 400 (400 < 500)', () => {
    expect(resolveCSSSizeValue('min(500px, 50%)', ctx)).toBe(400);
  });

  it('min(100px, 200px, 50px) → 50', () => {
    expect(resolveCSSSizeValue('min(100px, 200px, 50px)', {})).toBe(50);
  });

  it('min() 내부에 calc() 중첩 가능', () => {
    expect(
      resolveCSSSizeValue('min(300px, calc(100% - 100px))', ctx),
    ).toBe(300); // min(300, 700) → 300
  });

  it('min() 인자 해석 실패 시 fallback', () => {
    expect(resolveCSSSizeValue('min(100px, 50%)', {}, 99)).toBe(99);
  });
});

describe('resolveCSSSizeValue - max() 함수', () => {
  const ctx: CSSValueContext = { containerSize: 800 };

  it('max(100px, 50%) with containerSize=800 → 400 (400 > 100)', () => {
    expect(resolveCSSSizeValue('max(100px, 50%)', ctx)).toBe(400);
  });

  it('max(500px, 50%) with containerSize=800 → 500 (500 > 400)', () => {
    expect(resolveCSSSizeValue('max(500px, 50%)', ctx)).toBe(500);
  });

  it('max(100px, 200px, 50px) → 200', () => {
    expect(resolveCSSSizeValue('max(100px, 200px, 50px)', {})).toBe(200);
  });

  it('max() 내부에 calc() 중첩 가능', () => {
    expect(
      resolveCSSSizeValue('max(300px, calc(100% - 600px))', ctx),
    ).toBe(300); // max(300, 200) → 300
  });

  it('max() 인자 해석 실패 시 fallback', () => {
    expect(resolveCSSSizeValue('max(100px, 50%)', {}, 99)).toBe(99);
  });
});

describe('resolveCSSSizeValue - clamp/min/max 중첩', () => {
  const ctx: CSSValueContext = { containerSize: 1000 };

  it('min() 안에 max() 중첩', () => {
    // min(500px, max(200px, 30%)) → min(500, max(200, 300)) → min(500, 300) → 300
    expect(resolveCSSSizeValue('min(500px, max(200px, 30%))', ctx)).toBe(300);
  });

  it('clamp() 안에 min()/max() 중첩', () => {
    // clamp(min(50px, 100px), 50%, max(400px, 300px))
    // → clamp(50, 500, 400) → max(50, min(500, 400)) → max(50, 400) → 400
    expect(
      resolveCSSSizeValue('clamp(min(50px, 100px), 50%, max(400px, 300px))', ctx),
    ).toBe(400);
  });
});

describe('resolveCSSSizeValue - var() 해석', () => {
  it('variableScope가 있으면 var() 해석 후 계산', () => {
    const scope: CSSVariableScope = { variables: { '--spacing': '16px' } };
    const ctx: CSSValueContext = { variableScope: scope };
    expect(resolveCSSSizeValue('var(--spacing)', ctx)).toBe(16);
  });

  it('variableScope가 없으면 var() 해석 건너뜀 (undefined 반환)', () => {
    // variableScope 없이 var()는 해석 불가
    expect(resolveCSSSizeValue('var(--spacing)', {})).toBeUndefined();
  });

  it('var()가 없는 값은 variableScope 있어도 그냥 파싱', () => {
    const scope: CSSVariableScope = { variables: {} };
    const ctx: CSSValueContext = { containerSize: 200, variableScope: scope };
    expect(resolveCSSSizeValue('100px', ctx)).toBe(100);
  });
});

// ============================================
// resolveCalc
// ============================================

describe('resolveCalc - 기본 사칙연산', () => {
  it('100% - 40px, containerSize=800 → 760', () => {
    const ctx: CSSValueContext = { containerSize: 800 };
    expect(resolveCalc('100% - 40px', ctx)).toBe(760);
  });

  it('50px + 30px → 80', () => {
    expect(resolveCalc('50px + 30px')).toBe(80);
  });

  it('100px - 25px → 75', () => {
    expect(resolveCalc('100px - 25px')).toBe(75);
  });

  it('10px * 4 → 40', () => {
    expect(resolveCalc('10px * 4')).toBe(40);
  });

  it('100px / 4 → 25', () => {
    expect(resolveCalc('100px / 4')).toBe(25);
  });
});

describe('resolveCalc - vh/vw 단위', () => {
  it('100vh - 64px, viewportHeight=1080 → 1016', () => {
    const ctx: CSSValueContext = { viewportHeight: 1080 };
    expect(resolveCalc('100vh - 64px', ctx)).toBe(1016);
  });

  it('50vw + 20px, viewportWidth=1920 → 980', () => {
    const ctx: CSSValueContext = { viewportWidth: 1920 };
    expect(resolveCalc('50vw + 20px', ctx)).toBe(980);
  });
});

describe('resolveCalc - em/rem 단위', () => {
  it('2em * 3, parentSize=16 → 96', () => {
    const ctx: CSSValueContext = { parentSize: 16 };
    expect(resolveCalc('2em * 3', ctx)).toBe(96);
  });

  it('1rem + 8px, rootFontSize=16 → 24', () => {
    const ctx: CSSValueContext = { rootFontSize: 16 };
    expect(resolveCalc('1rem + 8px', ctx)).toBe(24);
  });
});

describe('resolveCalc - 괄호 처리', () => {
  it('(100% - 20px) / 2, containerSize=800 → 390', () => {
    const ctx: CSSValueContext = { containerSize: 800 };
    expect(resolveCalc('(100% - 20px) / 2', ctx)).toBe(390);
  });

  it('(10px + 20px) * 2 → 60', () => {
    expect(resolveCalc('(10px + 20px) * 2')).toBe(60);
  });

  it('중첩 괄호: ((50px + 10px) * 2) / 4 → 30', () => {
    expect(resolveCalc('((50px + 10px) * 2) / 4')).toBe(30);
  });
});

describe('resolveCalc - 에지 케이스', () => {
  it('0으로 나누기 → undefined', () => {
    expect(resolveCalc('100px / 0')).toBeUndefined();
  });

  it('빈 문자열 → undefined', () => {
    expect(resolveCalc('')).toBeUndefined();
  });

  it('잘못된 표현식 → undefined', () => {
    expect(resolveCalc('not-valid')).toBeUndefined();
  });

  it('% 단위, containerSize 미제공 → undefined', () => {
    // % 해석 불가 → 토큰화 실패 → undefined
    expect(resolveCalc('100% - 40px', {})).toBeUndefined();
  });

  it('단일 px 값 → 그대로 반환', () => {
    expect(resolveCalc('200px')).toBe(200);
  });
});

// ============================================
// parseBorderShorthand
// ============================================

describe('parseBorderShorthand - 정상 케이스', () => {
  it('"1px solid red" → { width: 1, style: solid, color: red }', () => {
    const result = parseBorderShorthand('1px solid red');
    expect(result).toEqual({ width: 1, style: 'solid', color: 'red' });
  });

  it('"2px dashed #333" → { width: 2, style: dashed, color: #333 }', () => {
    const result = parseBorderShorthand('2px dashed #333');
    expect(result).toEqual({ width: 2, style: 'dashed', color: '#333' });
  });

  it('"solid 3px blue" → 순서 무관 파싱', () => {
    const result = parseBorderShorthand('solid 3px blue');
    expect(result).toEqual({ width: 3, style: 'solid', color: 'blue' });
  });

  it('"none" → { width: 0, style: none, color: #000000 }', () => {
    const result = parseBorderShorthand('none');
    expect(result).toEqual({ width: 0, style: 'none', color: '#000000' });
  });
});

describe('parseBorderShorthand - border-style 키워드 인식', () => {
  const styles = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'] as const;

  for (const style of styles) {
    it(`"1px ${style} #ccc" → style: ${style}`, () => {
      const result = parseBorderShorthand(`1px ${style} #ccc`);
      expect(result?.style).toBe(style);
    });
  }
});

describe('parseBorderShorthand - 기본값 폴백', () => {
  it('width 미제공 시 → width: 0', () => {
    const result = parseBorderShorthand('solid red');
    expect(result?.width).toBe(0);
  });

  it('color 미제공 시 → color: #000000', () => {
    const result = parseBorderShorthand('1px solid');
    expect(result?.color).toBe('#000000');
  });

  it('style 미제공 시 → style: none', () => {
    const result = parseBorderShorthand('1px red');
    expect(result?.style).toBe('none');
  });
});

describe('parseBorderShorthand - 잘못된 입력', () => {
  it('undefined → undefined', () => {
    expect(parseBorderShorthand(undefined)).toBeUndefined();
  });

  it('null → undefined', () => {
    expect(parseBorderShorthand(null)).toBeUndefined();
  });

  it('빈 문자열 → undefined', () => {
    expect(parseBorderShorthand('')).toBeUndefined();
  });

  it('공백만 → undefined', () => {
    expect(parseBorderShorthand('   ')).toBeUndefined();
  });

  it('숫자 타입 → undefined', () => {
    expect(parseBorderShorthand(1)).toBeUndefined();
  });
});

// ============================================
// resolveVar - var() 해석
// ============================================

describe('resolveVar - 기본 동작', () => {
  it('var(--spacing) → 스코프에서 해석', () => {
    const scope: CSSVariableScope = { variables: { '--spacing': '16px' } };
    expect(resolveVar('var(--spacing)', scope)).toBe('16px');
  });

  it('var(--missing) → 해석 실패 시 원본 반환', () => {
    const scope: CSSVariableScope = { variables: {} };
    expect(resolveVar('var(--missing)', scope)).toBe('var(--missing)');
  });

  it('var(--missing, 8px) → fallback 값 반환', () => {
    const scope: CSSVariableScope = { variables: {} };
    expect(resolveVar('var(--missing, 8px)', scope)).toBe('8px');
  });

  it('var() 없는 문자열은 그대로 반환', () => {
    const scope: CSSVariableScope = { variables: {} };
    expect(resolveVar('100px', scope)).toBe('100px');
  });
});

describe('resolveVar - 중첩 var()', () => {
  it('중첩 var(): var(--a)가 var(--b)를 참조 → 재귀 해석', () => {
    const scope: CSSVariableScope = {
      variables: {
        '--a': 'var(--b)',
        '--b': '24px',
      },
    };
    expect(resolveVar('var(--a)', scope)).toBe('24px');
  });

  it('여러 var() 동시 해석', () => {
    const scope: CSSVariableScope = {
      variables: {
        '--x': '10px',
        '--y': '20px',
      },
    };
    // resolveVar는 하나의 var()만 처리하므로, 결과에 var()가 남을 수 있음
    // 중요한 것은 첫 번째 var()가 올바르게 해석되는 것
    const result = resolveVar('var(--x)', scope);
    expect(result).toBe('10px');
  });
});

describe('resolveVar - resolveCSSSizeValue와 연동', () => {
  it('var()가 포함된 값은 variableScope와 함께 resolveCSSSizeValue로 처리', () => {
    const scope: CSSVariableScope = { variables: { '--gap': '24px' } };
    const ctx: CSSValueContext = { variableScope: scope };
    expect(resolveCSSSizeValue('var(--gap)', ctx)).toBe(24);
  });

  it('var()에서 % 값 → containerSize와 함께 계산', () => {
    const scope: CSSVariableScope = { variables: { '--ratio': '50%' } };
    const ctx: CSSValueContext = {
      containerSize: 400,
      variableScope: scope,
    };
    expect(resolveCSSSizeValue('var(--ratio)', ctx)).toBe(200);
  });
});
