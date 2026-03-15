/**
 * CSS Generator
 *
 * ComponentSpec에서 CSS 파일 내용 생성
 *
 * ADR-036 Phase 2-pre: Archetype별 base styles 분기
 * ADR-036 Phase 2a: Level 1 확장 (lineHeight, fontWeight, borderWidth 등)
 *
 * @packageDocumentation
 */

import type {
  ComponentSpec,
  ArchetypeId,
  VariantSpec,
  SizeSpec,
} from "../types";
import type { ShadowTokenRef } from "../types/token.types";
import { tokenToCSSVar } from "./utils/tokenResolver";

// ─── Archetype별 base styles ────────────────────────────────────────────────

const ARCHETYPE_BASE_STYLES: Record<ArchetypeId, string[]> = {
  simple: [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    box-sizing: border-box;`,
  ],
  button: [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    justify-content: center;`,
    `    box-sizing: border-box;`,
    `    cursor: pointer;`,
    `    user-select: none;`,
    `    transition: background 0.15s ease, border-color 0.15s ease;`,
    `    font-family: var(--font-sans);`,
  ],
  "input-base": [
    `    display: flex;`,
    `    align-items: center;`,
    `    box-sizing: border-box;`,
    `    font-family: var(--font-sans);`,
  ],
  "toggle-indicator": [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    cursor: pointer;`,
    `    box-sizing: border-box;`,
    `    user-select: none;`,
  ],
  progress: [
    `    display: flex;`,
    `    flex-direction: column;`,
    `    box-sizing: border-box;`,
  ],
  slider: [`    display: grid;`, `    box-sizing: border-box;`],
  "tabs-indicator": [
    `    display: flex;`,
    `    position: relative;`,
    `    box-sizing: border-box;`,
  ],
  collection: [
    `    display: flex;`,
    `    flex-direction: column;`,
    `    box-sizing: border-box;`,
  ],
  overlay: [`    position: fixed;`, `    box-sizing: border-box;`],
  calendar: [`    display: grid;`, `    box-sizing: border-box;`],
};

// archetype 미지정 시 기본 base styles
const DEFAULT_BASE_STYLES = [
  `    display: inline-flex;`,
  `    align-items: center;`,
  `    justify-content: center;`,
  `    box-sizing: border-box;`,
  `    cursor: pointer;`,
  `    user-select: none;`,
  `    transition: background 0.15s ease, border-color 0.15s ease;`,
  `    font-family: var(--font-sans);`,
];

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * ComponentSpec에서 CSS 파일 내용 생성
 */
export function generateCSS<Props>(spec: ComponentSpec<Props>): string {
  const lines: string[] = [];
  const archetype = spec.archetype;

  // 파일 헤더
  lines.push(`/* ============================================================`);
  lines.push(` * AUTO-GENERATED from ${spec.name}Spec — DO NOT EDIT MANUALLY`);
  lines.push(` * Source: packages/specs/src/components/${spec.name}.spec.ts`);
  lines.push(` * Archetype: ${archetype ?? "default"}`);
  lines.push(
    ` * ============================================================ */`,
  );
  lines.push("");

  // 기본 스타일
  lines.push(`.react-aria-${spec.name} {`);
  lines.push(...generateBaseStyles(spec));
  lines.push("}");
  lines.push("");

  // Variant 스타일
  for (const [variantName, variantSpec] of Object.entries(spec.variants)) {
    lines.push(`.react-aria-${spec.name}[data-variant="${variantName}"] {`);
    lines.push(...generateVariantStyles(variantSpec));
    lines.push("");

    // hover 상태
    lines.push("  &[data-hovered] {");
    lines.push(
      `    background: ${tokenToCSSVar(variantSpec.backgroundHover)};`,
    );
    if (variantSpec.textHover) {
      lines.push(`    color: ${tokenToCSSVar(variantSpec.textHover)};`);
    }
    if (variantSpec.borderHover) {
      lines.push(
        `    border-color: ${tokenToCSSVar(variantSpec.borderHover)};`,
      );
    } else if (variantSpec.border) {
      lines.push(
        `    border-color: ${tokenToCSSVar(variantSpec.backgroundHover)};`,
      );
    }
    lines.push("  }");
    lines.push("");

    // pressed 상태
    lines.push("  &[data-pressed] {");
    lines.push(
      `    background: ${tokenToCSSVar(variantSpec.backgroundPressed)};`,
    );
    if (variantSpec.border) {
      lines.push(
        `    border-color: ${tokenToCSSVar(variantSpec.backgroundPressed)};`,
      );
    }
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }

  // Size 스타일
  for (const [sizeName, sizeSpec] of Object.entries(spec.sizes)) {
    lines.push(`.react-aria-${spec.name}[data-size="${sizeName}"] {`);
    lines.push(...generateSizeStyles(sizeSpec));
    lines.push("}");
    lines.push("");
  }

  // 상태 스타일
  lines.push(...generateStateStyles(spec));

  return lines.join("\n");
}

// ─── Base Styles (Archetype 분기) ───────────────────────────────────────────

function generateBaseStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const archetype = spec.archetype;
  const baseStyles = archetype
    ? (ARCHETYPE_BASE_STYLES[archetype] ?? DEFAULT_BASE_STYLES)
    : DEFAULT_BASE_STYLES;

  const defaultVariant = spec.variants[spec.defaultVariant];
  const defaultSize = spec.sizes[spec.defaultSize];

  const lines = [`  /* Base styles — archetype: ${archetype ?? "default"} */`];
  lines.push(...baseStyles);

  // default variant 색상 (있으면)
  if (defaultVariant) {
    lines.push("");
    lines.push("  /* Default variant */");
    lines.push(`  background: ${tokenToCSSVar(defaultVariant.background)};`);
    lines.push(`  color: ${tokenToCSSVar(defaultVariant.text)};`);
    if (defaultVariant.border) {
      const bw = defaultSize?.borderWidth ?? 1;
      lines.push(
        `  border: ${bw}px solid ${tokenToCSSVar(defaultVariant.border)};`,
      );
    } else {
      lines.push("  border: none;");
    }
  }

  // default size 속성 (있으면)
  if (defaultSize) {
    lines.push("");
    lines.push("  /* Default size */");
    lines.push(...generateSizeStyles(defaultSize));
  }

  return lines;
}

// ─── Variant Styles ─────────────────────────────────────────────────────────

function generateVariantStyles(variant: VariantSpec): string[] {
  const lines = [
    `  background: ${tokenToCSSVar(variant.background)};`,
    `  color: ${tokenToCSSVar(variant.text)};`,
  ];

  if (variant.border) {
    lines.push(`  border-color: ${tokenToCSSVar(variant.border)};`);
  }

  if (variant.backgroundAlpha !== undefined && variant.backgroundAlpha < 1) {
    lines.push("  background: transparent;");
  }

  return lines;
}

// ─── Size Styles (Level 1 확장) ─────────────────────────────────────────────

function generateSizeStyles(size: SizeSpec): string[] {
  const lines: string[] = [];

  // height
  const heightValue =
    typeof size.height === "number" && size.height > 0
      ? `${size.height}px`
      : "auto";
  lines.push(`  height: ${heightValue};`);

  // padding (비대칭 지원)
  if (size.paddingLeft !== undefined || size.paddingRight !== undefined) {
    const pl = size.paddingLeft ?? size.paddingX;
    const pr = size.paddingRight ?? size.paddingX;
    lines.push(
      `  padding: ${size.paddingY}px ${pr}px ${size.paddingY}px ${pl}px;`,
    );
  } else {
    lines.push(`  padding: ${size.paddingY}px ${size.paddingX}px;`);
  }

  // font-size
  lines.push(`  font-size: ${tokenToCSSVar(size.fontSize)};`);

  // border-radius
  const radiusValue = tokenToCSSVar(size.borderRadius);
  lines.push(`  border-radius: ${radiusValue === "0" ? "0" : radiusValue};`);

  // ─── Phase 2a Level 1 확장 필드 ───

  // line-height
  if (size.lineHeight !== undefined) {
    if (typeof size.lineHeight === "number") {
      lines.push(`  line-height: ${size.lineHeight}px;`);
    } else {
      lines.push(`  line-height: ${tokenToCSSVar(size.lineHeight)};`);
    }
  }

  // font-weight
  if (size.fontWeight !== undefined) {
    lines.push(`  font-weight: ${size.fontWeight};`);
  }

  // letter-spacing
  if (size.letterSpacing !== undefined) {
    lines.push(`  letter-spacing: ${size.letterSpacing}px;`);
  }

  // border-width
  if (size.borderWidth !== undefined) {
    lines.push(`  border-width: ${size.borderWidth}px;`);
  }

  // min-width / min-height
  if (size.minWidth !== undefined) {
    lines.push(`  min-width: ${size.minWidth}px;`);
  }
  if (size.minHeight !== undefined) {
    lines.push(`  min-height: ${size.minHeight}px;`);
  }

  // gap
  if (size.gap) {
    lines.push(`  gap: ${size.gap}px;`);
  }

  // icon-size (CSS 변수로 출력)
  if (size.iconSize !== undefined) {
    lines.push(`  --icon-size: ${size.iconSize}px;`);
  }

  // icon-gap (CSS 변수로 출력)
  if (size.iconGap !== undefined) {
    lines.push(`  --icon-gap: ${size.iconGap}px;`);
  }

  return lines;
}

// ─── State Styles ───────────────────────────────────────────────────────────

/**
 * boxShadow 값 해석 (토큰 또는 CSS 문자열)
 */
function resolveBoxShadow(
  value: string | ShadowTokenRef | undefined,
): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("{shadow.")) {
    const name = value.slice(8, -1);
    return `var(--shadow-${name})`;
  }
  return value;
}

function generateStateStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const lines: string[] = [];
  const states = spec.states;

  // hover
  if (states?.hover) {
    lines.push(`.react-aria-${spec.name}[data-hovered] {`);
    if (states.hover.boxShadow) {
      lines.push(`  box-shadow: ${resolveBoxShadow(states.hover.boxShadow)};`);
    }
    if (states.hover.transform) {
      lines.push(`  transform: ${states.hover.transform};`);
    }
    if (states.hover.scale !== undefined) {
      lines.push(`  transform: scale(${states.hover.scale});`);
    }
    if (states.hover.opacity !== undefined) {
      lines.push(`  opacity: ${states.hover.opacity};`);
    }
    lines.push("}");
    lines.push("");
  }

  // focused
  if (states?.focused) {
    lines.push(`.react-aria-${spec.name}[data-focused] {`);
    if (states.focused.outline) {
      lines.push(`  outline: ${states.focused.outline};`);
    }
    if (states.focused.outlineOffset) {
      lines.push(`  outline-offset: ${states.focused.outlineOffset};`);
    }
    if (states.focused.boxShadow) {
      lines.push(
        `  box-shadow: ${resolveBoxShadow(states.focused.boxShadow)};`,
      );
    }
    if (states.focused.transform) {
      lines.push(`  transform: ${states.focused.transform};`);
    }
    lines.push("}");
    lines.push("");
  }

  // focusVisible (기본값 제공)
  lines.push(`.react-aria-${spec.name}[data-focus-visible] {`);
  if (states?.focusVisible) {
    lines.push(
      `  outline: ${states.focusVisible.outline ?? "2px solid var(--accent)"};`,
    );
    lines.push(
      `  outline-offset: ${states.focusVisible.outlineOffset ?? "2px"};`,
    );
    if (states.focusVisible.boxShadow) {
      lines.push(
        `  box-shadow: ${resolveBoxShadow(states.focusVisible.boxShadow)};`,
      );
    }
  } else {
    lines.push("  outline: 2px solid var(--accent);");
    lines.push("  outline-offset: 2px;");
  }
  lines.push("}");
  lines.push("");

  // pressed
  if (states?.pressed) {
    lines.push(`.react-aria-${spec.name}[data-pressed] {`);
    if (states.pressed.boxShadow) {
      lines.push(
        `  box-shadow: ${resolveBoxShadow(states.pressed.boxShadow)};`,
      );
    }
    if (states.pressed.transform) {
      lines.push(`  transform: ${states.pressed.transform};`);
    }
    if (states.pressed.scale !== undefined) {
      lines.push(`  transform: scale(${states.pressed.scale});`);
    }
    lines.push("}");
    lines.push("");
  }

  // disabled
  lines.push(`.react-aria-${spec.name}[data-disabled] {`);
  if (states?.disabled) {
    lines.push(`  opacity: ${states.disabled.opacity ?? 0.38};`);
    lines.push(`  cursor: ${states.disabled.cursor ?? "not-allowed"};`);
    lines.push(`  pointer-events: ${states.disabled.pointerEvents ?? "none"};`);
  } else {
    lines.push("  opacity: 0.38;");
    lines.push("  cursor: not-allowed;");
    lines.push("  pointer-events: none;");
  }
  lines.push("}");

  return lines;
}

// ─── Batch Generator ────────────────────────────────────────────────────────

/**
 * 모든 스펙에서 CSS 파일 생성
 */
export async function generateAllCSS(
  specs: ComponentSpec<unknown>[],
  outputDir: string,
): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");

  for (const spec of specs) {
    const css = generateCSS(spec);
    const filePath = path.join(outputDir, `${spec.name}.css`);
    await fs.writeFile(filePath, css, "utf-8");
    console.log(`Generated: ${filePath}`);
  }
}
