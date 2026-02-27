import { describe, it, expect, vi } from 'vitest';
import { generateCSS, generateAllCSS } from '../../src/renderers/CSSGenerator';
import { ButtonSpec } from '../../src/components/Button.spec';
import type { ComponentSpec, TokenRef } from '../../src/types';

describe('generateCSS', () => {
  const css = generateCSS(ButtonSpec);

  describe('파일 구조', () => {
    it('Generated 헤더 포함', () => {
      expect(css).toContain('/* Generated from Button.spec.ts */');
    });

    it('DO NOT EDIT 경고 포함', () => {
      expect(css).toContain('/* DO NOT EDIT MANUALLY */');
    });

    it('@layer components 래핑', () => {
      expect(css).toContain('@layer components {');
      expect(css.trim()).toMatch(/\}$/);
    });
  });

  describe('기본 클래스', () => {
    it('.react-aria-Button 셀렉터', () => {
      expect(css).toContain('.react-aria-Button {');
    });

    it('display: inline-flex', () => {
      expect(css).toContain('display: inline-flex');
    });

    it('cursor: pointer', () => {
      expect(css).toContain('cursor: pointer');
    });

    it('user-select: none', () => {
      expect(css).toContain('user-select: none');
    });
  });

  describe('기본 variant/size', () => {
    it('default variant 배경색 (surface-container-high)', () => {
      expect(css).toContain('var(--surface-container-high)');
    });

    it('default variant 텍스트색 (on-surface)', () => {
      expect(css).toContain('var(--on-surface)');
    });

    it('default size height: 32px', () => {
      expect(css).toContain('height: 32px');
    });

    it('default size padding: 8px 12px', () => {
      expect(css).toContain('padding: 8px 12px');
    });
  });

  describe('variant 셀렉터', () => {
    it.each([
      'primary', 'secondary', 'tertiary', 'error', 'surface', 'outline', 'ghost',
    ])('[data-variant="%s"] 존재', (variant) => {
      expect(css).toContain(`[data-variant="${variant}"]`);
    });
  });

  describe('상태 셀렉터', () => {
    it('[data-hovered] hover 상태', () => {
      expect(css).toContain('&[data-hovered]');
    });

    it('[data-pressed] pressed 상태', () => {
      expect(css).toContain('&[data-pressed]');
    });

    it('[data-focus-visible] focusVisible 상태', () => {
      expect(css).toContain('[data-focus-visible]');
    });

    it('[data-disabled] disabled 상태', () => {
      expect(css).toContain('[data-disabled]');
    });
  });

  describe('focusVisible 스타일', () => {
    it('outline 속성 포함', () => {
      expect(css).toContain('outline: 2px solid var(--primary)');
    });

    it('outline-offset 포함', () => {
      expect(css).toContain('outline-offset: 2px');
    });
  });

  describe('disabled 스타일', () => {
    it('opacity: 0.38', () => {
      expect(css).toContain('opacity: 0.38');
    });

    it('cursor: not-allowed', () => {
      expect(css).toContain('cursor: not-allowed');
    });

    it('pointer-events: none', () => {
      expect(css).toContain('pointer-events: none');
    });
  });

  describe('size 셀렉터', () => {
    it.each(['xs', 'sm', 'md', 'lg', 'xl'])(
      '[data-size="%s"] 존재', (size) => {
        expect(css).toContain(`[data-size="${size}"]`);
      },
    );
  });

  describe('border 처리', () => {
    it('default variant (border 있음) → border 스타일', () => {
      expect(css).toContain('border: 1px solid');
    });
  });

  describe('backgroundAlpha < 1', () => {
    it('outline variant → background: transparent', () => {
      expect(css).toContain('background: transparent');
    });
  });

  describe('pressed boxShadow', () => {
    it('pressed 상태에 box-shadow 포함', () => {
      expect(css).toContain('box-shadow:');
    });
  });

  it('스냅샷 일치', () => {
    expect(css).toMatchSnapshot();
  });
});

describe('generateCSS 분기 커버리지', () => {
  function makeSpec(overrides: Partial<{
    textHover: TokenRef;
    borderHover: TokenRef;
    border: TokenRef;
    backgroundAlpha: number;
    states: ComponentSpec['states'];
  }> = {}): ComponentSpec<Record<string, unknown>> {
    return {
      name: 'Test',
      element: 'button',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}' as TokenRef,
          backgroundHover: '{color.primary-hover}' as TokenRef,
          backgroundPressed: '{color.primary-pressed}' as TokenRef,
          text: '{color.on-primary}' as TokenRef,
          textHover: overrides.textHover,
          border: overrides.border,
          borderHover: overrides.borderHover,
          backgroundAlpha: overrides.backgroundAlpha,
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 16,
          paddingY: 8,
          fontSize: '{typography.text-md}' as TokenRef,
          borderRadius: '{radius.md}' as TokenRef,
          gap: 8,
        },
      },
      states: overrides.states ?? {},
      render: {
        shapes: () => [],
      },
    };
  }

  it('textHover 있는 variant → hover에 color 출력', () => {
    const css = generateCSS(makeSpec({ textHover: '{color.on-secondary}' as TokenRef }));
    expect(css).toContain('color: var(--on-secondary)');
  });

  it('borderHover 있는 variant → hover에 border-color 출력', () => {
    const css = generateCSS(makeSpec({
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.outline-variant}' as TokenRef,
    }));
    expect(css).toContain('border-color: var(--outline-variant)');
  });

  it('border 있고 borderHover 없는 variant → hover에 backgroundHover로 border-color', () => {
    const css = generateCSS(makeSpec({
      border: '{color.outline}' as TokenRef,
    }));
    expect(css).toContain('border-color: var(--primary-hover)');
  });

  it('border 없는 variant → border: none', () => {
    const css = generateCSS(makeSpec());
    expect(css).toContain('border: none');
  });

  it('무효한 default variant → console.warn + 빈 base styles', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec: ComponentSpec<Record<string, unknown>> = {
      name: 'Bad',
      element: 'div',
      defaultVariant: 'nonexistent',
      defaultSize: 'default',
      variants: { v1: { background: '{color.primary}' as TokenRef, backgroundHover: '{color.primary-hover}' as TokenRef, backgroundPressed: '{color.primary-pressed}' as TokenRef, text: '{color.on-primary}' as TokenRef } },
      sizes: { default: { height: 40, paddingX: 16, paddingY: 8, fontSize: '{typography.text-md}' as TokenRef, borderRadius: '{radius.md}' as TokenRef } },
      states: {},
      render: { shapes: () => [] },
    };
    const css = generateCSS(spec);
    expect(warnSpy).toHaveBeenCalled();
    expect(css).not.toContain('display: inline-flex');
    warnSpy.mockRestore();
  });

  it('states.focused 정의 시 → focused 셀렉터 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        focused: {
          outline: '3px solid blue',
          outlineOffset: '4px',
          boxShadow: '{shadow.md}',
          transform: 'scale(1.02)',
        },
      },
    }));
    expect(css).toContain('[data-focused]');
    expect(css).toContain('outline: 3px solid blue');
    expect(css).toContain('outline-offset: 4px');
    expect(css).toContain('box-shadow: var(--shadow-md)');
    expect(css).toContain('transform: scale(1.02)');
  });

  it('states.hover.transform 정의 시 → transform 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        hover: {
          transform: 'translateY(-1px)',
          boxShadow: '{shadow.sm}',
          opacity: 0.9,
          scale: 1.05,
        },
      },
    }));
    expect(css).toContain('[data-hovered]');
    expect(css).toContain('box-shadow: var(--shadow-sm)');
    expect(css).toContain('transform: translateY(-1px)');
    expect(css).toContain('opacity: 0.9');
    expect(css).toContain('transform: scale(1.05)');
  });

  it('states.pressed.transform + scale 정의 시 → pressed 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        pressed: {
          transform: 'translateY(1px)',
          scale: 0.98,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
        },
      },
    }));
    expect(css).toContain('[data-pressed]');
    expect(css).toContain('transform: translateY(1px)');
    expect(css).toContain('transform: scale(0.98)');
  });

  it('states.focusVisible 미정의 시 → 기본 outline 출력', () => {
    const css = generateCSS(makeSpec({ states: {} }));
    expect(css).toContain('outline: 2px solid var(--primary)');
    expect(css).toContain('outline-offset: 2px');
  });

  it('states.focusVisible.boxShadow 정의 시 → box-shadow 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        focusVisible: {
          outline: '3px solid var(--primary)',
          outlineOffset: '3px',
          boxShadow: '{shadow.focus-ring}',
        },
      },
    }));
    expect(css).toContain('outline: 3px solid var(--primary)');
    expect(css).toContain('outline-offset: 3px');
    expect(css).toContain('box-shadow: var(--shadow-focus-ring)');
  });

  it('states.disabled 미정의 시 → 기본 disabled 스타일', () => {
    const css = generateCSS(makeSpec({ states: {} }));
    expect(css).toContain('opacity: 0.38');
    expect(css).toContain('pointer-events: none');
  });

  it('states.disabled.pointerEvents 정의 시 → 커스텀 값 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        disabled: {
          opacity: 0.5,
          cursor: 'default',
          pointerEvents: 'auto',
        },
      },
    }));
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('cursor: default');
    expect(css).toContain('pointer-events: auto');
  });

  it('resolveBoxShadow: 일반 CSS 문자열 → 그대로 출력', () => {
    const css = generateCSS(makeSpec({
      states: {
        pressed: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        },
      },
    }));
    expect(css).toContain('box-shadow: 0 2px 4px rgba(0,0,0,0.2)');
  });
});

describe('generateAllCSS', () => {
  it('각 스펙에 대해 파일 생성', async () => {
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);

    vi.doMock('fs/promises', () => ({
      writeFile: mockWriteFile,
      mkdir: mockMkdir,
    }));

    await generateAllCSS([ButtonSpec], '/tmp/output');

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('Button.css'),
      expect.stringContaining('.react-aria-Button'),
      'utf-8',
    );
  });
});
