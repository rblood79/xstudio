import { describe, it, expect } from 'vitest';
import { isValidTokenRef } from '../../src/types/token.types';
import type { ComponentSpec } from '../../src/types';

import { ButtonSpec } from '../../src/components/Button.spec';
import { BadgeSpec } from '../../src/components/Badge.spec';
import { CardSpec } from '../../src/components/Card.spec';
import { DialogSpec } from '../../src/components/Dialog.spec';
import { LinkSpec } from '../../src/components/Link.spec';
import { PopoverSpec } from '../../src/components/Popover.spec';
import { SeparatorSpec } from '../../src/components/Separator.spec';
import { ToggleButtonSpec } from '../../src/components/ToggleButton.spec';
import { ToggleButtonGroupSpec } from '../../src/components/ToggleButtonGroup.spec';
import { TooltipSpec } from '../../src/components/Tooltip.spec';

const allSpecs: [string, ComponentSpec<Record<string, unknown>>][] = [
  ['Button', ButtonSpec as ComponentSpec<Record<string, unknown>>],
  ['Badge', BadgeSpec as ComponentSpec<Record<string, unknown>>],
  ['Card', CardSpec as ComponentSpec<Record<string, unknown>>],
  ['Dialog', DialogSpec as ComponentSpec<Record<string, unknown>>],
  ['Link', LinkSpec as ComponentSpec<Record<string, unknown>>],
  ['Popover', PopoverSpec as ComponentSpec<Record<string, unknown>>],
  ['Separator', SeparatorSpec as ComponentSpec<Record<string, unknown>>],
  ['ToggleButton', ToggleButtonSpec as ComponentSpec<Record<string, unknown>>],
  ['ToggleButtonGroup', ToggleButtonGroupSpec as ComponentSpec<Record<string, unknown>>],
  ['Tooltip', TooltipSpec as ComponentSpec<Record<string, unknown>>],
];

describe.each(allSpecs)('%s Spec 공통 검증', (name, spec) => {
  it('name 필드 비어있지 않음', () => {
    expect(spec.name).toBeTruthy();
    expect(spec.name.length).toBeGreaterThan(0);
  });

  it('element 필드 존재', () => {
    expect(spec.element).toBeDefined();
  });

  it('defaultVariant이 variants에 존재', () => {
    expect(spec.variants[spec.defaultVariant]).toBeDefined();
  });

  it('defaultSize가 sizes에 존재', () => {
    expect(spec.sizes[spec.defaultSize]).toBeDefined();
  });

  it('variants에 최소 1개 이상', () => {
    expect(Object.keys(spec.variants).length).toBeGreaterThanOrEqual(1);
  });

  it('sizes에 최소 1개 이상', () => {
    expect(Object.keys(spec.sizes).length).toBeGreaterThanOrEqual(1);
  });

  it('모든 variant의 필수 토큰 참조 유효', () => {
    Object.entries(spec.variants).forEach(([variantName, variant]) => {
      expect(isValidTokenRef(variant.background)).toBe(true);
      expect(isValidTokenRef(variant.backgroundHover)).toBe(true);
      expect(isValidTokenRef(variant.backgroundPressed)).toBe(true);
      expect(isValidTokenRef(variant.text)).toBe(true);
      if (variant.border) {
        expect(isValidTokenRef(variant.border)).toBe(true);
      }
    });
  });

  it('모든 size의 토큰 참조 유효', () => {
    Object.entries(spec.sizes).forEach(([sizeName, size]) => {
      expect(isValidTokenRef(size.fontSize)).toBe(true);
      expect(isValidTokenRef(size.borderRadius)).toBe(true);
    });
  });

  it('render.shapes가 함수', () => {
    expect(typeof spec.render.shapes).toBe('function');
  });

  it('render.shapes가 Shape[] 반환', () => {
    const defaultVariant = spec.variants[spec.defaultVariant];
    const defaultSize = spec.sizes[spec.defaultSize];
    const shapes = spec.render.shapes({}, defaultVariant, defaultSize, 'default');
    expect(Array.isArray(shapes)).toBe(true);
  });

  it('반환된 shapes의 type이 유효', () => {
    const defaultVariant = spec.variants[spec.defaultVariant];
    const defaultSize = spec.sizes[spec.defaultSize];
    const shapes = spec.render.shapes({}, defaultVariant, defaultSize, 'default');
    const validTypes = ['rect', 'roundRect', 'circle', 'text', 'shadow', 'border', 'container', 'gradient', 'image', 'line'];
    for (const shape of shapes) {
      expect(validTypes).toContain(shape.type);
    }
  });
});
