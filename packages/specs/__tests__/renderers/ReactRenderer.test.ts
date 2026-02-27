import { describe, it, expect, vi } from 'vitest';
import { renderToReact, generateCSSVariables, generateSizeVariables } from '../../src/renderers/ReactRenderer';
import { ButtonSpec, type ButtonProps } from '../../src/components/Button.spec';

describe('renderToReact', () => {
  it('기본 props → 올바른 className과 data 속성', () => {
    const result = renderToReact(ButtonSpec, {} as ButtonProps);
    expect(result.className).toBe('react-aria-Button');
    expect(result.dataAttributes['data-variant']).toBe('default');
    expect(result.dataAttributes['data-size']).toBe('sm');
  });

  it('명시적 variant/size 지정', () => {
    const result = renderToReact(ButtonSpec, { variant: 'primary', size: 'lg' } as ButtonProps);
    expect(result.dataAttributes['data-variant']).toBe('primary');
    expect(result.dataAttributes['data-size']).toBe('lg');
  });

  it('isLoading=true → data-loading 추가', () => {
    const result = renderToReact(ButtonSpec, { isLoading: true } as ButtonProps);
    expect(result.dataAttributes['data-loading']).toBeDefined();
    // aria-busy는 data- 접두사가 아니므로 dataAttributes에 포함되지 않음
    // (ReactRenderer는 data-* 속성만 dataAttributes에 추가)
  });

  it('isLoading=false → data-loading 없음', () => {
    const result = renderToReact(ButtonSpec, { isLoading: false } as ButtonProps);
    expect(result.dataAttributes['data-loading']).toBeUndefined();
  });

  it('인라인 스타일 오버라이드', () => {
    const result = renderToReact(ButtonSpec, { style: { width: '100px' } } as ButtonProps);
    expect(result.style).toEqual({ width: '100px' });
  });

  it('스타일 없으면 style은 undefined', () => {
    const result = renderToReact(ButtonSpec, {} as ButtonProps);
    expect(result.style).toBeUndefined();
  });

  it('무효한 variant → console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderToReact(ButtonSpec, { variant: 'nonexistent' as ButtonProps['variant'] } as ButtonProps);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid variant/size'));
    warnSpy.mockRestore();
  });
});

describe('generateCSSVariables', () => {
  it('primary variant → 올바른 CSS 변수 생성', () => {
    const vars = generateCSSVariables(ButtonSpec.variants['primary']);
    expect(vars['--spec-bg']).toBe('var(--primary)');
    expect(vars['--spec-bg-hover']).toBe('var(--primary-hover)');
    expect(vars['--spec-bg-pressed']).toBe('var(--primary-pressed)');
    expect(vars['--spec-text']).toBe('var(--on-primary)');
  });

  it('border 있는 variant → --spec-border 포함', () => {
    const vars = generateCSSVariables(ButtonSpec.variants['default']);
    expect(vars['--spec-border']).toBeDefined();
    expect(vars['--spec-border']).toBe('var(--outline-variant)');
  });

  it('border 없는 variant (ghost) → --spec-border 없음', () => {
    const vars = generateCSSVariables(ButtonSpec.variants['ghost']);
    expect(vars['--spec-border']).toBeUndefined();
  });
});

describe('generateSizeVariables', () => {
  it('sm size → 올바른 CSS 변수 생성', () => {
    const vars = generateSizeVariables(ButtonSpec.sizes['sm']);
    expect(vars['--spec-height']).toBe('32px');
    expect(vars['--spec-padding-x']).toBe('12px');
    expect(vars['--spec-padding-y']).toBe('8px');
    expect(vars['--spec-font-size']).toBe('var(--text-sm)');
    expect(vars['--spec-border-radius']).toBe('var(--radius-sm)');
  });

  it('iconSize 있는 size → --spec-icon-size 포함', () => {
    const vars = generateSizeVariables(ButtonSpec.sizes['sm']);
    expect(vars['--spec-icon-size']).toBe('14px');
  });

  it('gap 있는 size → --spec-gap 포함', () => {
    const vars = generateSizeVariables(ButtonSpec.sizes['sm']);
    expect(vars['--spec-gap']).toBe('6px');
  });
});
