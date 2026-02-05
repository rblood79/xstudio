import { describe, it, expect } from 'vitest';
import { ButtonSpec, type ButtonProps } from '../../src/components/Button.spec';
import { isValidTokenRef } from '../../src/types/token.types';
import type { TokenRef, VariantSpec, SizeSpec } from '../../src/types';

describe('ButtonSpec 구조', () => {
  it('name = "Button"', () => {
    expect(ButtonSpec.name).toBe('Button');
  });

  it('element = "button"', () => {
    expect(ButtonSpec.element).toBe('button');
  });

  it('defaultVariant = "default"', () => {
    expect(ButtonSpec.defaultVariant).toBe('default');
  });

  it('defaultSize = "sm"', () => {
    expect(ButtonSpec.defaultSize).toBe('sm');
  });

  it('defaultVariant이 variants에 존재', () => {
    expect(ButtonSpec.variants[ButtonSpec.defaultVariant]).toBeDefined();
  });

  it('defaultSize가 sizes에 존재', () => {
    expect(ButtonSpec.sizes[ButtonSpec.defaultSize]).toBeDefined();
  });

  it('8개 variant 존재', () => {
    const expectedVariants = ['default', 'primary', 'secondary', 'tertiary', 'error', 'surface', 'outline', 'ghost'];
    expect(Object.keys(ButtonSpec.variants).sort()).toEqual(expectedVariants.sort());
  });

  it('5개 size 존재', () => {
    const expectedSizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    expect(Object.keys(ButtonSpec.sizes).sort()).toEqual(expectedSizes.sort());
  });
});

describe('ButtonSpec variants', () => {
  const variants = Object.entries(ButtonSpec.variants);

  it.each(variants)('%s variant의 필수 필드 존재', (name, variant) => {
    expect(variant.background).toBeDefined();
    expect(variant.backgroundHover).toBeDefined();
    expect(variant.backgroundPressed).toBeDefined();
    expect(variant.text).toBeDefined();
  });

  it.each(variants)('%s variant의 토큰 참조 유효', (name, variant) => {
    expect(isValidTokenRef(variant.background)).toBe(true);
    expect(isValidTokenRef(variant.backgroundHover)).toBe(true);
    expect(isValidTokenRef(variant.backgroundPressed)).toBe(true);
    expect(isValidTokenRef(variant.text)).toBe(true);
    if (variant.border) {
      expect(isValidTokenRef(variant.border)).toBe(true);
    }
  });
});

describe('ButtonSpec sizes', () => {
  const sizes = Object.entries(ButtonSpec.sizes);

  it.each(sizes)('%s size의 필수 필드 존재', (name, size) => {
    expect(size.height).toBeGreaterThan(0);
    expect(size.paddingX).toBeGreaterThanOrEqual(0);
    expect(size.paddingY).toBeGreaterThanOrEqual(0);
    expect(size.fontSize).toBeDefined();
    expect(size.borderRadius).toBeDefined();
  });

  it.each(sizes)('%s size의 토큰 참조 유효', (name, size) => {
    expect(isValidTokenRef(size.fontSize)).toBe(true);
    expect(isValidTokenRef(size.borderRadius)).toBe(true);
  });
});

describe('ButtonSpec states', () => {
  it('states 객체 존재', () => {
    expect(ButtonSpec.states).toBeDefined();
  });

  it('disabled 상태 정의', () => {
    expect(ButtonSpec.states.disabled).toBeDefined();
    expect(ButtonSpec.states.disabled?.opacity).toBe(0.38);
  });

  it('focusVisible 상태 정의', () => {
    expect(ButtonSpec.states.focusVisible).toBeDefined();
    expect(ButtonSpec.states.focusVisible?.outline).toBeDefined();
  });

  it('pressed boxShadow 정의', () => {
    expect(ButtonSpec.states.pressed).toBeDefined();
    expect(ButtonSpec.states.pressed?.boxShadow).toBeDefined();
  });
});

describe('ButtonSpec shapes 함수', () => {
  const defaultVariant = ButtonSpec.variants['default'];
  const smSize = ButtonSpec.sizes['sm'];

  it('render.shapes가 함수', () => {
    expect(typeof ButtonSpec.render.shapes).toBe('function');
  });

  it('기본 props → Shape[] 반환', () => {
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      defaultVariant,
      smSize,
      'default',
    );
    expect(Array.isArray(shapes)).toBe(true);
    expect(shapes.length).toBeGreaterThan(0);
  });

  it('roundRect (배경) shape 포함', () => {
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      defaultVariant,
      smSize,
      'default',
    );
    const bg = shapes.find(s => s.type === 'roundRect');
    expect(bg).toBeDefined();
  });

  it('text 있을 때 text shape 포함', () => {
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      defaultVariant,
      smSize,
      'default',
    );
    const text = shapes.find(s => s.type === 'text');
    expect(text).toBeDefined();
  });

  it('text 없을 때 text shape 미포함', () => {
    const shapes = ButtonSpec.render.shapes(
      {} as ButtonProps,
      defaultVariant,
      smSize,
      'default',
    );
    const text = shapes.find(s => s.type === 'text');
    expect(text).toBeUndefined();
  });

  it('border 있는 variant → border shape 포함', () => {
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      defaultVariant,
      smSize,
      'default',
    );
    const border = shapes.find(s => s.type === 'border');
    expect(border).toBeDefined();
  });

  it('ghost variant → border shape 미포함', () => {
    const ghostVariant = ButtonSpec.variants['ghost'];
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      ghostVariant,
      smSize,
      'default',
    );
    const border = shapes.find(s => s.type === 'border');
    expect(border).toBeUndefined();
  });

  it('hover 상태 → backgroundHover 색상 사용', () => {
    const primaryVariant = ButtonSpec.variants['primary'];
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      primaryVariant,
      smSize,
      'hover',
    );
    const bg = shapes.find(s => s.type === 'roundRect');
    expect(bg).toBeDefined();
    if (bg && 'fill' in bg) {
      expect(bg.fill).toBe(primaryVariant.backgroundHover);
    }
  });

  it('pressed 상태 → backgroundPressed 색상 사용', () => {
    const primaryVariant = ButtonSpec.variants['primary'];
    const shapes = ButtonSpec.render.shapes(
      { children: 'Click' } as ButtonProps,
      primaryVariant,
      smSize,
      'pressed',
    );
    const bg = shapes.find(s => s.type === 'roundRect');
    expect(bg).toBeDefined();
    if (bg && 'fill' in bg) {
      expect(bg.fill).toBe(primaryVariant.backgroundPressed);
    }
  });
});

describe('ButtonSpec render.react', () => {
  it('isLoading=true → data-loading, aria-busy', () => {
    const attrs = ButtonSpec.render.react!({ isLoading: true } as ButtonProps);
    expect(attrs['data-loading']).toBe(true);
    expect(attrs['aria-busy']).toBe(true);
  });

  it('isLoading=false → data-loading undefined', () => {
    const attrs = ButtonSpec.render.react!({ isLoading: false } as ButtonProps);
    expect(attrs['data-loading']).toBeFalsy();
  });
});

describe('ButtonSpec render.pixi', () => {
  it('기본 → eventMode static, cursor pointer', () => {
    const attrs = ButtonSpec.render.pixi!({} as ButtonProps);
    expect(attrs.eventMode).toBe('static');
    expect(attrs.cursor).toBe('pointer');
  });

  it('isDisabled=true → cursor not-allowed', () => {
    const attrs = ButtonSpec.render.pixi!({ isDisabled: true } as ButtonProps);
    expect(attrs.cursor).toBe('not-allowed');
  });
});
