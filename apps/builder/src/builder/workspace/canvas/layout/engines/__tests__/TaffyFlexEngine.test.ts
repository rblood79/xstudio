/**
 * TaffyFlexEngine 단위 테스트
 *
 * elementToTaffyStyle() 함수의 스타일 변환 로직을 검증합니다.
 * WASM 런타임 불필요 (순수 TS 변환 함수).
 */
import { describe, it, expect } from 'vitest';
import { elementToTaffyStyle } from '../TaffyFlexEngine';
import type { Element } from '../../../../../../types/core/store.types';

function makeElement(style: Record<string, unknown>): Element {
  return {
    id: 'test-el',
    type: 'element',
    tag: 'div',
    props: { style },
    children: [],
  } as unknown as Element;
}

// ─── margin:auto ──────────────────────────────────────────────────────

describe('elementToTaffyStyle - margin auto', () => {
  it('margin: "auto"이면 4방향 모두 "auto"', () => {
    const el = makeElement({ margin: 'auto' });
    const result = elementToTaffyStyle(el);
    expect(result.marginTop).toBe('auto');
    expect(result.marginRight).toBe('auto');
    expect(result.marginBottom).toBe('auto');
    expect(result.marginLeft).toBe('auto');
  });

  it('margin: "0 auto"이면 좌우만 "auto"', () => {
    const el = makeElement({ margin: '0 auto' });
    const result = elementToTaffyStyle(el);
    expect(result.marginTop).toBeUndefined(); // 0 → undefined
    expect(result.marginRight).toBe('auto');
    expect(result.marginBottom).toBeUndefined();
    expect(result.marginLeft).toBe('auto');
  });

  it('marginLeft: "auto" 개별 속성', () => {
    const el = makeElement({ marginLeft: 'auto', marginRight: 10 });
    const result = elementToTaffyStyle(el);
    expect(result.marginLeft).toBe('auto');
    expect(result.marginRight).toBe(10);
  });

  it('shorthand와 개별 속성 혼합 시 개별 속성이 우선', () => {
    const el = makeElement({ margin: 'auto', marginTop: 20 });
    const result = elementToTaffyStyle(el);
    expect(result.marginTop).toBe(20);
    expect(result.marginRight).toBe('auto');
    expect(result.marginLeft).toBe('auto');
    expect(result.marginBottom).toBe('auto');
  });

  it('일반 숫자 margin은 숫자로 전달 (normalizeStyle이 px 변환)', () => {
    const el = makeElement({ marginTop: 10, marginBottom: 20 });
    const result = elementToTaffyStyle(el);
    expect(result.marginTop).toBe(10);
    expect(result.marginBottom).toBe(20);
  });
});

// ─── position:relative inset ─────────────────────────────────────────

describe('elementToTaffyStyle - relative inset', () => {
  it('position:relative + top/left → insetTop/insetLeft 전달', () => {
    const el = makeElement({ position: 'relative', top: 10, left: 20 });
    const result = elementToTaffyStyle(el);
    expect(result.position).toBe('relative');
    expect(result.insetTop).toBe(10);
    expect(result.insetLeft).toBe(20);
  });

  it('position:relative + % 값 → inset에 % 문자열 전달', () => {
    const el = makeElement({ position: 'relative', top: '50%', left: '25%' });
    const result = elementToTaffyStyle(el);
    expect(result.insetTop).toBe('50%');
    expect(result.insetLeft).toBe('25%');
  });

  it('position:static → inset 전달 안 됨', () => {
    const el = makeElement({ position: 'static', top: 10, left: 20 });
    const result = elementToTaffyStyle(el);
    expect(result.insetTop).toBeUndefined();
    expect(result.insetLeft).toBeUndefined();
  });

  it('position:absolute + inset → 기존과 동일하게 전달', () => {
    const el = makeElement({ position: 'absolute', top: 5, right: 10 });
    const result = elementToTaffyStyle(el);
    expect(result.position).toBe('absolute');
    expect(result.insetTop).toBe(5);
    expect(result.insetRight).toBe(10);
  });

  it('position 미지정 → inset 전달 안 됨', () => {
    const el = makeElement({ top: 10, left: 20 });
    const result = elementToTaffyStyle(el);
    expect(result.insetTop).toBeUndefined();
    expect(result.insetLeft).toBeUndefined();
  });
});

// ─── order ────────────────────────────────────────────────────────────

describe('elementToTaffyStyle - order', () => {
  it('order 값이 TaffyStyle에 설정된다', () => {
    const el = makeElement({ order: 3 });
    const result = elementToTaffyStyle(el);
    expect(result.order).toBe(3);
  });

  it('order: 0이면 설정되지 않는다 (기본값)', () => {
    const el = makeElement({ order: 0 });
    const result = elementToTaffyStyle(el);
    expect(result.order).toBeUndefined();
  });

  it('order 미지정이면 설정되지 않는다', () => {
    const el = makeElement({});
    const result = elementToTaffyStyle(el);
    expect(result.order).toBeUndefined();
  });
});
