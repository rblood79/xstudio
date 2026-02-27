import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToPixi, getVariantColors, getSizePreset } from '../../src/renderers/PixiRenderer';
import { ButtonSpec, type ButtonProps } from '../../src/components/Button.spec';
import type { PixiRenderContext } from '../../src/renderers/PixiRenderer';
import type { ComponentSpec, Shape } from '../../src/types';

function createMockGraphics() {
  return {
    clear: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    circle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
  };
}

describe('renderToPixi', () => {
  let mockGraphics: ReturnType<typeof createMockGraphics>;
  let context: PixiRenderContext;

  beforeEach(() => {
    mockGraphics = createMockGraphics();
    context = {
      graphics: mockGraphics as unknown as PixiRenderContext['graphics'],
      theme: 'light',
      width: 200,
      height: 40,
    };
  });

  it('기본 props로 렌더링 → graphics.clear 호출', () => {
    renderToPixi(ButtonSpec, { children: 'Click' } as ButtonProps, context);
    expect(mockGraphics.clear).toHaveBeenCalled();
  });

  it('roundRect shape → graphics.roundRect + fill 호출', () => {
    renderToPixi(ButtonSpec, { children: 'Click' } as ButtonProps, context);
    expect(mockGraphics.roundRect).toHaveBeenCalled();
    expect(mockGraphics.fill).toHaveBeenCalled();
  });

  it('border 있는 variant → graphics.stroke 호출', () => {
    renderToPixi(
      ButtonSpec,
      { variant: 'default', children: 'Click' } as ButtonProps,
      context,
    );
    expect(mockGraphics.stroke).toHaveBeenCalled();
  });

  it('ghost variant (border 없음) → stroke 호출 최소화', () => {
    mockGraphics.stroke.mockClear();
    renderToPixi(
      ButtonSpec,
      { variant: 'ghost', children: 'Click' } as ButtonProps,
      context,
    );
    // ghost에는 border가 없으므로 stroke 호출 없음
    expect(mockGraphics.stroke).not.toHaveBeenCalled();
  });

  it('무효한 variant → console.warn + early return', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderToPixi(
      ButtonSpec,
      { variant: 'nonexistent' as ButtonProps['variant'] } as ButtonProps,
      context,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid variant/size'));
    expect(mockGraphics.clear).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('state 파라미터 전달', () => {
    context.state = 'hover';
    renderToPixi(ButtonSpec, { variant: 'primary', children: 'Click' } as ButtonProps, context);
    expect(mockGraphics.roundRect).toHaveBeenCalled();
  });

  it('text shape 무시 (에러 없이 처리)', () => {
    // text shape를 포함하는 Button 스펙 렌더링
    expect(() => {
      renderToPixi(ButtonSpec, { children: 'Click' } as ButtonProps, context);
    }).not.toThrow();
  });

  it('line shape 렌더링', () => {
    const lineSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'Line',
      element: 'hr',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 1,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, stroke: '{color.outline}', strokeWidth: 1 },
        ],
      },
    };
    renderToPixi(lineSpec, {}, context);
    expect(mockGraphics.moveTo).toHaveBeenCalledWith(0, 0);
    expect(mockGraphics.lineTo).toHaveBeenCalledWith(100, 0);
    expect(mockGraphics.stroke).toHaveBeenCalled();
  });

  it('circle shape 렌더링', () => {
    const circleSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'Circle',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.full}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'circle', x: 20, y: 20, radius: 20, fill: '{color.primary}' },
        ],
      },
    };
    renderToPixi(circleSpec, {}, context);
    expect(mockGraphics.circle).toHaveBeenCalledWith(20, 20, 20);
    expect(mockGraphics.fill).toHaveBeenCalled();
  });

  it('rect shape 렌더링', () => {
    const rectSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'Rect',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'rect', x: 0, y: 0, width: 100, height: 40, fill: '{color.primary}' },
        ],
      },
    };
    renderToPixi(rectSpec, {}, context);
    expect(mockGraphics.rect).toHaveBeenCalled();
    expect(mockGraphics.fill).toHaveBeenCalled();
  });

  it('container shape → 자식 재귀 렌더링', () => {
    const containerSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'Container',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          {
            type: 'container',
            children: [
              { type: 'rect', x: 0, y: 0, width: 50, height: 20, fill: '{color.primary}' },
              { type: 'rect', x: 50, y: 0, width: 50, height: 20, fill: '{color.secondary}' },
            ],
          } as Shape,
        ],
      },
    };
    renderToPixi(containerSpec, {}, context);
    // 2개의 rect 자식이 렌더링됨
    expect(mockGraphics.rect).toHaveBeenCalledTimes(2);
  });

  it('roundRect shape — fill 없는 경우 fill 미호출', () => {
    const noFillSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'NoFill',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'roundRect', x: 0, y: 0, width: 'auto', height: 'auto', radius: [4, 4, 4, 4] },
        ],
      },
    };
    mockGraphics.fill.mockClear();
    renderToPixi(noFillSpec, {}, context);
    expect(mockGraphics.roundRect).toHaveBeenCalled();
    expect(mockGraphics.fill).not.toHaveBeenCalled();
  });

  it('roundRect shape — radius 배열일 때 첫 번째 값 사용', () => {
    const arrayRadiusSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'ArrayRadius',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'roundRect', x: 0, y: 0, width: 100, height: 40, radius: [8, 8, 8, 8], fill: '{color.primary}' },
        ],
      },
    };
    renderToPixi(arrayRadiusSpec, {}, context);
    expect(mockGraphics.roundRect).toHaveBeenCalledWith(0, 0, 100, 40, 8);
  });

  it('rect shape — fill 숫자 값', () => {
    const numFillSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'NumFill',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'rect', x: 0, y: 0, width: 'auto', height: 'auto', fill: 0xff0000, fillAlpha: 0.5 },
        ],
      },
    };
    renderToPixi(numFillSpec, {}, context);
    expect(mockGraphics.rect).toHaveBeenCalled();
    expect(mockGraphics.fill).toHaveBeenCalledWith({ color: 0xff0000, alpha: 0.5 });
  });

  it('circle shape — fill 숫자 값', () => {
    const numCircleSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'NumCircle',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.full}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          { type: 'circle', x: 20, y: 20, radius: 20, fill: 0x00ff00 },
        ],
      },
    };
    renderToPixi(numCircleSpec, {}, context);
    expect(mockGraphics.circle).toHaveBeenCalled();
    expect(mockGraphics.fill).toHaveBeenCalledWith({ color: 0x00ff00, alpha: 1 });
  });

  it('border shape — radius 배열 + 옵션 필드', () => {
    const borderArraySpec: ComponentSpec<Record<string, unknown>> = {
      name: 'BorderArray',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          {
            type: 'border',
            x: 5,
            y: 5,
            width: 90,
            height: 30,
            borderWidth: 2,
            color: 0xff0000,
            radius: [4, 4, 4, 4],
          },
        ],
      },
    };
    renderToPixi(borderArraySpec, {}, context);
    expect(mockGraphics.roundRect).toHaveBeenCalledWith(5, 5, 90, 30, 4);
    expect(mockGraphics.stroke).toHaveBeenCalled();
  });

  it('border shape — auto width/height, radius 없음', () => {
    const borderAutoSpec: ComponentSpec<Record<string, unknown>> = {
      name: 'BorderAuto',
      element: 'div',
      defaultVariant: 'default',
      defaultSize: 'default',
      variants: {
        default: {
          background: '{color.primary}',
          backgroundHover: '{color.primary-hover}',
          backgroundPressed: '{color.primary-pressed}',
          text: '{color.on-primary}',
        },
      },
      sizes: {
        default: {
          height: 40,
          paddingX: 0,
          paddingY: 0,
          fontSize: '{typography.text-sm}',
          borderRadius: '{radius.none}',
        },
      },
      states: {},
      render: {
        shapes: () => [
          {
            type: 'border',
            borderWidth: 1,
            color: '{color.outline}',
            width: 'auto',
            height: 'auto',
          },
        ],
      },
    };
    renderToPixi(borderAutoSpec, {}, context);
    expect(mockGraphics.roundRect).toHaveBeenCalledWith(0, 0, 200, 40, 0);
  });
});

describe('getVariantColors', () => {
  it('primary variant, light 테마 → 숫자 색상 반환', () => {
    const colors = getVariantColors(ButtonSpec.variants['primary'], 'light');
    expect(typeof colors.bg).toBe('number');
    expect(typeof colors.text).toBe('number');
    expect(colors.bg).toBe(0x6750a4);
  });

  it('primary variant, dark 테마 → 다른 숫자 값', () => {
    const colors = getVariantColors(ButtonSpec.variants['primary'], 'dark');
    expect(colors.bg).toBe(0xd0bcff);
  });

  it('border 있는 variant → border 필드 존재', () => {
    const colors = getVariantColors(ButtonSpec.variants['default'], 'light');
    expect(colors.border).toBeDefined();
    expect(typeof colors.border).toBe('number');
  });

  it('ghost variant → border undefined', () => {
    const colors = getVariantColors(ButtonSpec.variants['ghost'], 'light');
    expect(colors.border).toBeUndefined();
  });

  it('outline variant → bgAlpha=0', () => {
    const colors = getVariantColors(ButtonSpec.variants['outline'], 'light');
    expect(colors.bgAlpha).toBe(0);
  });

  it('primary variant → bgAlpha=1 (기본값)', () => {
    const colors = getVariantColors(ButtonSpec.variants['primary'], 'light');
    expect(colors.bgAlpha).toBe(1);
  });

  it('borderHover 있는 variant → borderHover 포함', () => {
    const colors = getVariantColors(ButtonSpec.variants['primary'], 'light');
    expect(colors.borderHover).toBeDefined();
  });

  it('borderHover 없는 variant → borderHover undefined', () => {
    const colors = getVariantColors(ButtonSpec.variants['ghost'], 'light');
    expect(colors.borderHover).toBeUndefined();
  });
});

describe('getSizePreset', () => {
  it('sm size → 올바른 숫자 값', () => {
    const preset = getSizePreset(ButtonSpec.sizes['sm'], 'light');
    expect(preset.height).toBe(32);
    expect(preset.paddingX).toBe(12);
    expect(preset.paddingY).toBe(8);
    expect(preset.fontSize).toBe(14);
    expect(preset.borderRadius).toBe(4);
    expect(preset.iconSize).toBe(14);
    expect(preset.gap).toBe(6);
  });

  it('md size → fontSize=16, borderRadius=6', () => {
    const preset = getSizePreset(ButtonSpec.sizes['md'], 'light');
    expect(preset.fontSize).toBe(16);
    expect(preset.borderRadius).toBe(6);
  });

  it('테마 미지정 시 light 기본값', () => {
    const preset = getSizePreset(ButtonSpec.sizes['sm']);
    expect(preset.fontSize).toBe(14);
  });
});
