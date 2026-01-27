/**
 * CSS Generator
 *
 * ComponentSpec에서 CSS 파일 내용 생성
 *
 * @packageDocumentation
 */

import type { ComponentSpec, VariantSpec, SizeSpec } from '../types';
import type { ShadowTokenRef } from '../types/token.types';
import { tokenToCSSVar } from './utils/tokenResolver';

/**
 * ComponentSpec에서 CSS 파일 내용 생성
 */
export function generateCSS<Props>(spec: ComponentSpec<Props>): string {
  const lines: string[] = [];

  // 파일 헤더
  lines.push(`/* Generated from ${spec.name}.spec.ts */`);
  lines.push(`/* DO NOT EDIT MANUALLY */`);
  lines.push('');
  lines.push('@layer components {');

  // 기본 스타일
  lines.push(`  .react-aria-${spec.name} {`);
  lines.push(...generateBaseStyles(spec));
  lines.push('  }');
  lines.push('');

  // Variant 스타일
  Object.entries(spec.variants).forEach(([variantName, variantSpec]) => {
    lines.push(`  .react-aria-${spec.name}[data-variant="${variantName}"] {`);
    lines.push(...generateVariantStyles(variantSpec));
    lines.push('');

    // hover 상태
    lines.push('    &[data-hovered] {');
    lines.push(`      background: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    if (variantSpec.textHover) {
      lines.push(`      color: ${tokenToCSSVar(variantSpec.textHover)};`);
    }
    if (variantSpec.borderHover) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.borderHover)};`);
    } else if (variantSpec.border) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    }
    lines.push('    }');
    lines.push('');

    // pressed 상태
    lines.push('    &[data-pressed] {');
    lines.push(`      background: ${tokenToCSSVar(variantSpec.backgroundPressed)};`);
    if (variantSpec.border) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.backgroundPressed)};`);
    }
    lines.push('    }');
    lines.push('  }');
    lines.push('');
  });

  // Size 스타일
  Object.entries(spec.sizes).forEach(([sizeName, sizeSpec]) => {
    lines.push(`  .react-aria-${spec.name}[data-size="${sizeName}"] {`);
    lines.push(...generateSizeStyles(sizeSpec));
    lines.push('  }');
    lines.push('');
  });

  // 상태 스타일
  lines.push(...generateStateStyles(spec));

  lines.push('}');

  return lines.join('\n');
}

function generateBaseStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const defaultVariant = spec.variants[spec.defaultVariant];
  const defaultSize = spec.sizes[spec.defaultSize];

  if (!defaultVariant || !defaultSize) {
    console.warn(`Invalid default variant/size in spec: ${spec.name}`);
    return [];
  }

  return [
    `    /* Base styles */`,
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    justify-content: center;`,
    `    box-sizing: border-box;`,
    `    cursor: pointer;`,
    `    user-select: none;`,
    `    transition: background 0.15s ease, border-color 0.15s ease;`,
    `    font-family: var(--font-sans);`,
    ``,
    `    /* Default variant */`,
    `    background: ${tokenToCSSVar(defaultVariant.background)};`,
    `    color: ${tokenToCSSVar(defaultVariant.text)};`,
    defaultVariant.border
      ? `    border: 1px solid ${tokenToCSSVar(defaultVariant.border)};`
      : `    border: none;`,
    ``,
    `    /* Default size */`,
    `    height: ${defaultSize.height}px;`,
    `    padding: ${defaultSize.paddingY}px ${defaultSize.paddingX}px;`,
    `    font-size: ${tokenToCSSVar(defaultSize.fontSize)};`,
    `    border-radius: ${tokenToCSSVar(defaultSize.borderRadius)};`,
  ];
}

function generateVariantStyles(variant: VariantSpec): string[] {
  const lines = [
    `    background: ${tokenToCSSVar(variant.background)};`,
    `    color: ${tokenToCSSVar(variant.text)};`,
  ];

  if (variant.border) {
    lines.push(`    border-color: ${tokenToCSSVar(variant.border)};`);
  }

  if (variant.backgroundAlpha !== undefined && variant.backgroundAlpha < 1) {
    lines.push(`    background: transparent;`);
  }

  return lines;
}

function generateSizeStyles(size: SizeSpec): string[] {
  return [
    `    height: ${size.height}px;`,
    `    padding: ${size.paddingY}px ${size.paddingX}px;`,
    `    font-size: ${tokenToCSSVar(size.fontSize)};`,
    `    border-radius: ${tokenToCSSVar(size.borderRadius)};`,
    ...(size.gap ? [`    gap: ${size.gap}px;`] : []),
  ];
}

/**
 * boxShadow 값 해석 (토큰 또는 CSS 문자열)
 */
function resolveBoxShadow(value: string | ShadowTokenRef | undefined): string | undefined {
  if (!value) return undefined;

  // 토큰 참조 형식 {shadow.md}, {shadow.lg} 등
  if (value.startsWith('{shadow.')) {
    const name = value.slice(8, -1); // "md", "lg" 등
    return `var(--shadow-${name})`;
  }

  // 일반 CSS box-shadow 문자열
  return value;
}

function generateStateStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const lines: string[] = [];
  const states = spec.states;

  // hover 상태 효과 (색상은 variant에서 처리, 여기선 효과만)
  if (states?.hover) {
    lines.push(`  .react-aria-${spec.name}[data-hovered] {`);
    if (states.hover.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.hover.boxShadow)};`);
    }
    if (states.hover.transform) {
      lines.push(`    transform: ${states.hover.transform};`);
    }
    if (states.hover.scale !== undefined) {
      lines.push(`    transform: scale(${states.hover.scale});`);
    }
    if (states.hover.opacity !== undefined) {
      lines.push(`    opacity: ${states.hover.opacity};`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // focused 상태 효과
  if (states?.focused) {
    lines.push(`  .react-aria-${spec.name}[data-focused] {`);
    if (states.focused.outline) {
      lines.push(`    outline: ${states.focused.outline};`);
    }
    if (states.focused.outlineOffset) {
      lines.push(`    outline-offset: ${states.focused.outlineOffset};`);
    }
    if (states.focused.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.focused.boxShadow)};`);
    }
    if (states.focused.transform) {
      lines.push(`    transform: ${states.focused.transform};`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // focusVisible 상태 (키보드 포커스 - 기본값 제공)
  lines.push(`  .react-aria-${spec.name}[data-focus-visible] {`);
  if (states?.focusVisible) {
    if (states.focusVisible.outline) {
      lines.push(`    outline: ${states.focusVisible.outline};`);
    } else {
      lines.push(`    outline: 2px solid var(--primary);`);
    }
    if (states.focusVisible.outlineOffset) {
      lines.push(`    outline-offset: ${states.focusVisible.outlineOffset};`);
    } else {
      lines.push(`    outline-offset: 2px;`);
    }
    if (states.focusVisible.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.focusVisible.boxShadow)};`);
    }
  } else {
    lines.push(`    outline: 2px solid var(--primary);`);
    lines.push(`    outline-offset: 2px;`);
  }
  lines.push(`  }`);
  lines.push(``);

  // pressed 상태 효과 (색상 외의 효과)
  if (states?.pressed) {
    lines.push(`  .react-aria-${spec.name}[data-pressed] {`);
    if (states.pressed.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.pressed.boxShadow)};`);
    }
    if (states.pressed.transform) {
      lines.push(`    transform: ${states.pressed.transform};`);
    }
    if (states.pressed.scale !== undefined) {
      lines.push(`    transform: scale(${states.pressed.scale});`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // disabled 상태
  lines.push(`  .react-aria-${spec.name}[data-disabled] {`);
  if (states?.disabled) {
    lines.push(`    opacity: ${states.disabled.opacity ?? 0.38};`);
    lines.push(`    cursor: ${states.disabled.cursor ?? 'not-allowed'};`);
    if (states.disabled.pointerEvents) {
      lines.push(`    pointer-events: ${states.disabled.pointerEvents};`);
    } else {
      lines.push(`    pointer-events: none;`);
    }
  } else {
    lines.push(`    opacity: 0.38;`);
    lines.push(`    cursor: not-allowed;`);
    lines.push(`    pointer-events: none;`);
  }
  lines.push(`  }`);

  return lines;
}

/**
 * 모든 스펙에서 CSS 파일 생성
 */
export async function generateAllCSS(
  specs: ComponentSpec<unknown>[],
  outputDir: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  for (const spec of specs) {
    const css = generateCSS(spec);
    const filePath = path.join(outputDir, `${spec.name}.css`);
    await fs.writeFile(filePath, css, 'utf-8');
    console.log(`Generated: ${filePath}`);
  }
}
