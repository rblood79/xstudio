/**
 * cssResolver.ts 단위 테스트
 *
 * Phase 5 (2026-02-19):
 * - currentColor 키워드 해석
 * - initial / unset / revert cascade 키워드
 * - resolveStyle() 상속 체인
 * - preprocessStyle() 비상속 속성 전처리
 *
 * @since 2026-02-19 Phase 5
 */

import { describe, it, expect } from 'vitest';
import {
  resolveStyle,
  resolveCurrentColor,
  preprocessStyle,
  CSS_INITIAL_VALUES,
  INHERITABLE_PROPERTIES,
  ROOT_COMPUTED_STYLE,
} from '../cssResolver';

// ============================================
// resolveCurrentColor()
// ============================================

describe('resolveCurrentColor()', () => {
  it('currentColor → resolvedColor로 대체', () => {
    expect(resolveCurrentColor('currentColor', '#3b82f6')).toBe('#3b82f6');
  });

  it('대소문자 무관하게 대체', () => {
    expect(resolveCurrentColor('currentcolor', '#3b82f6')).toBe('#3b82f6');
    expect(resolveCurrentColor('CURRENTCOLOR', '#3b82f6')).toBe('#3b82f6');
    expect(resolveCurrentColor('CurrentColor', '#3b82f6')).toBe('#3b82f6');
  });

  it('일반 색상은 그대로 반환', () => {
    expect(resolveCurrentColor('#ff0000', '#3b82f6')).toBe('#ff0000');
    expect(resolveCurrentColor('red', '#3b82f6')).toBe('red');
    expect(resolveCurrentColor('rgba(0,0,0,0.5)', '#3b82f6')).toBe('rgba(0,0,0,0.5)');
  });

  it('복합 속성(box-shadow)에서 currentColor 토큰 교체', () => {
    const result = resolveCurrentColor('2px 2px 4px currentColor', '#ff0000');
    expect(result).toBe('2px 2px 4px #ff0000');
  });

  it('비문자열 값은 그대로 반환', () => {
    expect(resolveCurrentColor(42, '#3b82f6')).toBe(42);
    expect(resolveCurrentColor(undefined, '#3b82f6')).toBe(undefined);
    expect(resolveCurrentColor(null, '#3b82f6')).toBe(null);
  });
});

// ============================================
// CSS_INITIAL_VALUES 맵 검증
// ============================================

describe('CSS_INITIAL_VALUES', () => {
  it('상속 속성 초기값 존재', () => {
    expect(CSS_INITIAL_VALUES['color']).toBe('#000000');
    expect(CSS_INITIAL_VALUES['fontSize']).toBe(16);
    expect(CSS_INITIAL_VALUES['fontWeight']).toBe('400');
    expect(CSS_INITIAL_VALUES['visibility']).toBe('visible');
    expect(CSS_INITIAL_VALUES['textAlign']).toBe('start');
  });

  it('비상속 속성 초기값 존재', () => {
    expect(CSS_INITIAL_VALUES['backgroundColor']).toBe('transparent');
    expect(CSS_INITIAL_VALUES['borderColor']).toBe('#000000');
    expect(CSS_INITIAL_VALUES['opacity']).toBe(1);
    expect(CSS_INITIAL_VALUES['padding']).toBe(0);
  });
});

// ============================================
// resolveStyle() - inherit 키워드
// ============================================

describe('resolveStyle() - inherit', () => {
  it('inherit → 부모 값 유지', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, color: '#ff0000' };
    const result = resolveStyle({ color: 'inherit' }, parent);
    expect(result.color).toBe('#ff0000');
  });

  it('style 미선언 → 부모 전체 상속', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontSize: 24, color: '#aabbcc' };
    const result = resolveStyle(undefined, parent);
    expect(result.fontSize).toBe(24);
    expect(result.color).toBe('#aabbcc');
  });
});

// ============================================
// resolveStyle() - initial 키워드
// ============================================

describe('resolveStyle() - initial', () => {
  it('initial → CSS 사양 초기값 반환', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, color: '#ff0000', fontSize: 32 };
    const result = resolveStyle({ color: 'initial', fontSize: 'initial' }, parent);
    expect(result.color).toBe('#000000');
    expect(result.fontSize).toBe(16);
  });

  it('fontWeight initial → "400"', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontWeight: 700 };
    const result = resolveStyle({ fontWeight: 'initial' }, parent);
    expect(result.fontWeight).toBe('400');
  });

  it('visibility initial → "visible"', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, visibility: 'hidden' };
    const result = resolveStyle({ visibility: 'initial' }, parent);
    expect(result.visibility).toBe('visible');
  });
});

// ============================================
// resolveStyle() - unset 키워드
// ============================================

describe('resolveStyle() - unset', () => {
  it('상속 속성의 unset → inherit처럼 동작 (부모 값 유지)', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, color: '#aabb00' };
    const result = resolveStyle({ color: 'unset' }, parent);
    // 상속 속성이므로 부모 값을 그대로 사용
    expect(result.color).toBe('#aabb00');
  });

  it('상속 속성 unset은 명시적 값을 사용하지 않음', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, textAlign: 'center' };
    const result = resolveStyle({ textAlign: 'unset' }, parent);
    expect(result.textAlign).toBe('center');
  });
});

// ============================================
// resolveStyle() - revert 키워드
// ============================================

describe('resolveStyle() - revert', () => {
  it('상속 속성의 revert → initial처럼 동작 (초기값 반환)', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, color: '#ff0000' };
    const result = resolveStyle({ color: 'revert' }, parent);
    // revert는 노코드 빌더에서 initial과 동일하게 처리
    expect(result.color).toBe('#000000');
  });

  it('fontSize revert → 16', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontSize: 32 };
    const result = resolveStyle({ fontSize: 'revert' }, parent);
    expect(result.fontSize).toBe(16);
  });
});

// ============================================
// resolveStyle() - 상속 체인
// ============================================

describe('resolveStyle() - 상속 체인', () => {
  it('부모 → 자식 → 손자 상속', () => {
    const grandparent = { ...ROOT_COMPUTED_STYLE, color: '#ff0000', fontSize: 20 };
    const parent = resolveStyle({}, grandparent);
    const child = resolveStyle({}, parent);
    expect(child.color).toBe('#ff0000');
    expect(child.fontSize).toBe(20);
  });

  it('중간에 명시적 값이 있으면 하위로 전파', () => {
    const grandparent = { ...ROOT_COMPUTED_STYLE, color: '#ff0000' };
    const parent = resolveStyle({ color: '#00ff00' }, grandparent);
    const child = resolveStyle({}, parent);
    expect(child.color).toBe('#00ff00');
  });

  it('em 단위: 부모 fontSize 기준으로 해석', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontSize: 20 };
    const result = resolveStyle({ fontSize: '1.5em' }, parent);
    expect(result.fontSize).toBe(30); // 1.5 * 20
  });

  it('rem 단위: 루트 16px 기준으로 해석', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontSize: 20 };
    const result = resolveStyle({ fontSize: '2rem' }, parent);
    expect(result.fontSize).toBe(32); // 2 * 16
  });

  it('px 단위: 그대로 파싱', () => {
    const parent = { ...ROOT_COMPUTED_STYLE, fontSize: 20 };
    const result = resolveStyle({ fontSize: '24px' }, parent);
    expect(result.fontSize).toBe(24);
  });
});

// ============================================
// preprocessStyle() - currentColor
// ============================================

describe('preprocessStyle() - currentColor', () => {
  it('borderColor currentColor → color 값으로 대체', () => {
    const style = { color: '#3b82f6', borderColor: 'currentColor', backgroundColor: '#ffffff' };
    const result = preprocessStyle(style, '#3b82f6');
    expect(result['borderColor']).toBe('#3b82f6');
    expect(result['backgroundColor']).toBe('#ffffff'); // 변경 없음
  });

  it('backgroundColor currentColor → color 값으로 대체', () => {
    const style = { backgroundColor: 'currentColor' };
    const result = preprocessStyle(style, '#ff0000');
    expect(result['backgroundColor']).toBe('#ff0000');
  });

  it('textDecorationColor currentColor → color 값으로 대체', () => {
    const style = { textDecorationColor: 'currentColor' };
    const result = preprocessStyle(style, '#aabbcc');
    expect(result['textDecorationColor']).toBe('#aabbcc');
  });

  it('일반 색상값은 변경 없음', () => {
    const style = { borderColor: '#ff0000', backgroundColor: 'rgb(0,0,255)' };
    const result = preprocessStyle(style, '#000000');
    expect(result['borderColor']).toBe('#ff0000');
    expect(result['backgroundColor']).toBe('rgb(0,0,255)');
  });
});

// ============================================
// preprocessStyle() - cascade 키워드 (비상속 속성)
// ============================================

describe('preprocessStyle() - cascade 키워드', () => {
  it('initial: 비상속 속성을 초기값으로 되돌림', () => {
    const style = { backgroundColor: 'initial', opacity: 'initial', borderWidth: 'initial' };
    const result = preprocessStyle(style, '#000000');
    expect(result['backgroundColor']).toBe('transparent');
    expect(result['opacity']).toBe(1);
    expect(result['borderWidth']).toBe(0);
  });

  it('unset: 비상속 속성은 initial처럼 동작', () => {
    const style = { backgroundColor: 'unset', borderColor: 'unset' };
    const result = preprocessStyle(style, '#000000');
    expect(result['backgroundColor']).toBe('transparent');
    expect(result['borderColor']).toBe('#000000');
  });

  it('revert: 비상속 속성은 initial처럼 동작', () => {
    const style = { opacity: 'revert', padding: 'revert' };
    const result = preprocessStyle(style, '#000000');
    expect(result['opacity']).toBe(1);
    expect(result['padding']).toBe(0);
  });

  it('원본 style 객체를 수정하지 않음 (불변성)', () => {
    const original = { backgroundColor: 'initial' };
    const result = preprocessStyle(original, '#000000');
    expect(original['backgroundColor']).toBe('initial'); // 원본 유지
    expect(result['backgroundColor']).toBe('transparent'); // 새 객체에만 적용
  });
});

// ============================================
// INHERITABLE_PROPERTIES 집합 검증
// ============================================

describe('INHERITABLE_PROPERTIES', () => {
  it('핵심 상속 속성 포함', () => {
    expect(INHERITABLE_PROPERTIES.has('color')).toBe(true);
    expect(INHERITABLE_PROPERTIES.has('fontSize')).toBe(true);
    expect(INHERITABLE_PROPERTIES.has('fontFamily')).toBe(true);
    expect(INHERITABLE_PROPERTIES.has('textAlign')).toBe(true);
    expect(INHERITABLE_PROPERTIES.has('visibility')).toBe(true);
  });

  it('비상속 속성 미포함', () => {
    expect(INHERITABLE_PROPERTIES.has('backgroundColor')).toBe(false);
    expect(INHERITABLE_PROPERTIES.has('borderColor')).toBe(false);
    expect(INHERITABLE_PROPERTIES.has('opacity')).toBe(false);
    expect(INHERITABLE_PROPERTIES.has('padding')).toBe(false);
  });
});
