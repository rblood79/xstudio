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
import type { ShadowTokenRef, TokenRef } from "../types/token.types";
import { tokenToCSSVar } from "./utils/tokenResolver";

// ─── Archetype별 base styles ────────────────────────────────────────────────

const ARCHETYPE_BASE_STYLES: Record<ArchetypeId, string[]> = {
  simple: [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    box-sizing: border-box;`,
  ],
  text: [
    `    display: block;`,
    `    width: 100%;`,
    `    box-sizing: border-box;`,
  ],
  button: [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    justify-content: center;`,
    `    width: fit-content;`,
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
    `    display: grid;`,
    `    grid-template-areas: "label value" "track track";`,
    `    grid-template-columns: 1fr auto;`,
    `    box-sizing: border-box;`,
    ``,
    `    .react-aria-Label { grid-area: label; }`,
    `    [slot="value"] { grid-area: value; }`,
    `    .bar { grid-area: track; }`,
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
  alert: [
    `    display: flex;`,
    `    flex-direction: column;`,
    `    align-items: flex-start;`,
    `    box-sizing: border-box;`,
    `    width: 100%;`,
    `    font-family: var(--font-sans);`,
  ],
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
export function generateCSS<Props>(spec: ComponentSpec<Props>): string | null {
  // Container/Composite 컴포넌트: 수동 CSS가 구조 담당, Spec은 Skia용
  if (spec.skipCSSGeneration) return null;

  const archetype = spec.archetype;

  // G4-pre Switch 특수 경로 제거 — Checkbox/Radio와 동일하게 일반 경로 사용
  // indicator는 수동 CSS(Switch.css)가 담당

  const lines: string[] = [];

  // 파일 헤더
  lines.push(`/* ============================================================`);
  lines.push(` * AUTO-GENERATED from ${spec.name}Spec — DO NOT EDIT MANUALLY`);
  lines.push(` * Source: packages/specs/src/components/${spec.name}.spec.ts`);
  lines.push(` * Archetype: ${archetype ?? "default"}`);
  lines.push(
    ` * ============================================================ */`,
  );
  lines.push("");
  lines.push("@layer components {");
  lines.push("");

  // 기본 스타일
  lines.push(`.react-aria-${spec.name} {`);
  lines.push(...generateBaseStyles(spec));
  lines.push("}");
  lines.push("");

  // Variant 스타일 — Composite 컨테이너는 자식이 시각적 속성을 관리하므로 skip
  if (spec.composition) {
    // variant 출력 건너뜀
  } else
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
      }
      lines.push("  }");
      lines.push("");

      // pressed 상태
      lines.push("  &[data-pressed] {");
      lines.push(
        `    background: ${tokenToCSSVar(variantSpec.backgroundPressed)};`,
      );
      lines.push("  }");
      lines.push("}");
      lines.push("");

      // ─── Phase 2b: fillStyle outline 변형 ───
      if (variantSpec.outlineBackground || variantSpec.outlineBorder) {
        lines.push(
          `.react-aria-${spec.name}[data-variant="${variantName}"][data-fill-style="outline"] {`,
        );
        lines.push(
          `  background: ${tokenToCSSVar(variantSpec.outlineBackground ?? ("{color.transparent}" as TokenRef))};`,
        );
        if (variantSpec.outlineText) {
          lines.push(`  color: ${tokenToCSSVar(variantSpec.outlineText)};`);
        }
        if (variantSpec.outlineBorder) {
          lines.push(
            `  border-color: ${tokenToCSSVar(variantSpec.outlineBorder)};`,
          );
        }
        lines.push("}");
        lines.push("");
      }

      // ─── Phase 2b: fillStyle subtle 변형 ───
      if (variantSpec.subtleBackground) {
        lines.push(
          `.react-aria-${spec.name}[data-variant="${variantName}"][data-fill-style="subtle"] {`,
        );
        lines.push(
          `  background: ${tokenToCSSVar(variantSpec.subtleBackground)};`,
        );
        if (variantSpec.subtleText) {
          lines.push(`  color: ${tokenToCSSVar(variantSpec.subtleText)};`);
        }
        lines.push("  border: none;");
        lines.push("}");
        lines.push("");
      }
    }

  // icon-only 지원 (archetype: button에만)
  if (spec.archetype === "button") {
    lines.push(`.react-aria-${spec.name}[data-icon-only] {`);
    lines.push("  padding: 0;");
    lines.push("  aspect-ratio: 1;");
    lines.push("}");
    lines.push("");
  }

  // Size 스타일
  const isComposite = !!spec.composition;
  // progress archetype: sizes.height는 bar track 높이이며 컨테이너 height가 아님
  const skipHeight = isComposite || spec.archetype === "progress";
  const skipPadding = isComposite;
  for (const [sizeName, sizeSpec] of Object.entries(spec.sizes)) {
    lines.push(`.react-aria-${spec.name}[data-size="${sizeName}"] {`);
    lines.push(...generateSizeStyles(sizeSpec, { skipHeight, skipPadding }));
    lines.push("}");
    lines.push("");
  }

  // Child element font styles (headingFontSize/Weight, descFontSize/Weight)
  lines.push(...generateChildFontStyles(spec));

  // 상태 스타일
  lines.push(...generateStateStyles(spec));

  // ─── Phase 3a: Tier 2 Composite CSS (CompositionSpec) ───
  if (spec.composition) {
    lines.push("");
    lines.push(`/* ── Tier 2: Composite Delegation ── */`);
    lines.push("");
    lines.push(...generateCompositionCSS(spec));
  }

  // ─── Phase 3b: @media 공통 패턴 ───
  lines.push("");
  lines.push(...generateMediaQueries(spec));

  lines.push("");
  lines.push("} /* @layer components */");

  return lines.join("\n");
}

// ─── Base Styles (Archetype 분기) ───────────────────────────────────────────

// Composite layout → CSS display 매핑
const COMPOSITION_LAYOUT_STYLES: Record<string, string[]> = {
  "flex-column": [
    `    display: flex;`,
    `    flex-direction: column;`,
    `    align-items: flex-start;`,
    `    box-sizing: border-box;`,
  ],
  "flex-row": [
    `    display: flex;`,
    `    flex-direction: row;`,
    `    align-items: center;`,
    `    box-sizing: border-box;`,
  ],
  "inline-flex": [
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    box-sizing: border-box;`,
  ],
  grid: [`    display: grid;`, `    box-sizing: border-box;`],
};

function generateBaseStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const archetype = spec.archetype;

  // Composite는 composition.layout에서 base styles 파생
  let baseStyles: string[];
  if (spec.composition) {
    baseStyles =
      COMPOSITION_LAYOUT_STYLES[spec.composition.layout] ??
      COMPOSITION_LAYOUT_STYLES["flex-column"];
  } else {
    baseStyles = archetype
      ? (ARCHETYPE_BASE_STYLES[archetype] ?? DEFAULT_BASE_STYLES)
      : DEFAULT_BASE_STYLES;
  }

  const defaultVariant = spec.variants[spec.defaultVariant];
  const defaultSize = spec.sizes[spec.defaultSize];

  const lines = [`  /* Base styles — archetype: ${archetype ?? "default"} */`];
  lines.push(...baseStyles);

  // default variant 색상 — Composite 컨테이너는 자식이 관리하므로 skip
  if (defaultVariant && !spec.composition) {
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
    const isComposite = !!spec.composition;
    const skipDefaultHeight = isComposite || spec.archetype === "progress";
    lines.push("");
    lines.push("  /* Default size */");
    lines.push(
      ...generateSizeStyles(defaultSize, {
        skipHeight: skipDefaultHeight,
        skipPadding: isComposite,
      }),
    );
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

function generateSizeStyles(
  size: SizeSpec,
  options?: { skipHeight?: boolean; skipPadding?: boolean },
): string[] {
  const lines: string[] = [];

  // height — Composite 컨테이너는 자식이 높이를 결정하므로 skip
  if (!options?.skipHeight) {
    const heightValue =
      typeof size.height === "number" && size.height > 0
        ? `${size.height}px`
        : "auto";
    lines.push(`  height: ${heightValue};`);
  }

  // padding — Composite 컨테이너는 자식이 패딩을 관리하므로 skip
  if (options?.skipPadding) {
    // padding 출력 건너뜀 — 아래 padding 블록 대신 여기서 조기 분기
  } else if (
    size.paddingLeft !== undefined ||
    size.paddingRight !== undefined
  ) {
    // padding (비대칭 지원)
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

// ─── Child Font Styles (heading/description) ─────────────────────────────────

/**
 * spec sizes에 headingFontSize/descFontSize 등이 있으면
 * .alert-heading / .react-aria-Description 자식 CSS를 자동 생성
 */
function generateChildFontStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const lines: string[] = [];
  const defaultSize =
    spec.sizes[spec.defaultSize] ?? Object.values(spec.sizes)[0];
  if (!defaultSize) return lines;

  const ds = defaultSize as unknown as Record<string, unknown>;
  const hasHeading = ds.headingFontSize != null || ds.headingFontWeight != null;
  const hasDesc = ds.descFontSize != null || ds.descFontWeight != null;
  if (!hasHeading && !hasDesc) return lines;

  const cls = `.react-aria-${spec.name}`;

  // Heading — base
  if (hasHeading) {
    lines.push(`/* Heading */`);
    lines.push(`${cls} .alert-heading {`);
    lines.push(`  margin: 0;`);
    if (ds.headingFontSize != null) {
      lines.push(
        `  font-size: ${typeof ds.headingFontSize === "number" ? `${ds.headingFontSize}px` : tokenToCSSVar(ds.headingFontSize as TokenRef)};`,
      );
    }
    if (ds.headingFontWeight != null)
      lines.push(`  font-weight: ${ds.headingFontWeight};`);
    lines.push(`  line-height: 1.4;`);
    lines.push(`}`);
    lines.push(``);
  }

  // Description — base
  if (hasDesc) {
    lines.push(`/* Description */`);
    lines.push(`${cls} .react-aria-Description {`);
    lines.push(`  margin: 0;`);
    lines.push(`  width: 100%;`);
    if (ds.descFontSize != null)
      lines.push(`  font-size: ${ds.descFontSize}px;`);
    if (ds.descFontWeight != null)
      lines.push(`  font-weight: ${ds.descFontWeight};`);
    lines.push(`  line-height: 1.5;`);
    lines.push(`}`);
    lines.push(``);
  }

  // Size별 heading/description 오버라이드
  for (const [sizeName, sizeSpec] of Object.entries(spec.sizes)) {
    const ss = sizeSpec as unknown as Record<string, unknown>;

    if (
      hasHeading &&
      (ss.headingFontSize != null || ss.headingFontWeight != null)
    ) {
      const sizeLines: string[] = [];
      if (ss.headingFontSize != null) {
        sizeLines.push(
          `  font-size: ${typeof ss.headingFontSize === "number" ? `${ss.headingFontSize}px` : tokenToCSSVar(ss.headingFontSize as TokenRef)};`,
        );
      }
      if (ss.headingFontWeight != null)
        sizeLines.push(`  font-weight: ${ss.headingFontWeight};`);
      if (sizeLines.length > 0) {
        lines.push(`${cls}[data-size="${sizeName}"] .alert-heading {`);
        lines.push(...sizeLines);
        lines.push(`}`);
        lines.push(``);
      }
    }

    if (hasDesc && (ss.descFontSize != null || ss.descFontWeight != null)) {
      const sizeLines: string[] = [];
      if (ss.descFontSize != null)
        sizeLines.push(`  font-size: ${ss.descFontSize}px;`);
      if (ss.descFontWeight != null)
        sizeLines.push(`  font-weight: ${ss.descFontWeight};`);
      if (sizeLines.length > 0) {
        lines.push(`${cls}[data-size="${sizeName}"] .react-aria-Description {`);
        lines.push(...sizeLines);
        lines.push(`}`);
        lines.push(``);
      }
    }
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

// ─── Phase 3a: Tier 2 Composite CSS Generation ─────────────────────────────

function generateCompositionCSS<Props>(spec: ComponentSpec<Props>): string[] {
  const comp = spec.composition;
  if (!comp) return [];

  const sel = `.react-aria-${spec.name}`;
  const lines: string[] = [];

  // delegation: size별 자식 변수 override
  for (const delegation of comp.delegation) {
    const { childSelector, variables } = delegation;

    for (const [sizeName, vars] of Object.entries(variables)) {
      const entries = Object.entries(vars);
      if (entries.length === 0) continue;

      lines.push(`${sel}[data-size="${sizeName}"] ${childSelector} {`);
      for (const [varName, value] of entries) {
        lines.push(`  ${varName}: ${value};`);
      }
      lines.push("}");
      lines.push("");
    }
  }

  return lines;
}

// ─── Phase 3b: @media 공통 패턴 ─────────────────────────────────────────────

function generateMediaQueries<Props>(spec: ComponentSpec<Props>): string[] {
  const sel = `.react-aria-${spec.name}`;
  const lines: string[] = [];

  // forced-colors (접근성)
  lines.push("@media (forced-colors: active) {");
  lines.push(`  ${sel} {`);
  lines.push("    forced-color-adjust: auto;");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // prefers-reduced-motion (transition 있는 컴포넌트만)
  const hasTransition =
    spec.archetype === "button" ||
    spec.archetype === "toggle-indicator" ||
    spec.archetype === "overlay" ||
    spec.archetype === "progress";

  if (hasTransition) {
    lines.push("@media (prefers-reduced-motion: reduce) {");
    lines.push(`  ${sel} {`);
    lines.push("    transition-duration: 0s !important;");
    lines.push("  }");
    lines.push("}");
  }

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
    if (css === null) {
      console.log(`  ⏭ Skipped: ${spec.name} (skipCSSGeneration)`);
      continue;
    }
    const filePath = path.join(outputDir, `${spec.name}.css`);
    await fs.writeFile(filePath, css, "utf-8");
    console.log(`Generated: ${filePath}`);
  }
}
