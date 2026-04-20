import {
  cssVarToTokenRef,
  resolveToken,
  tokenToCSSVar,
  type TokenRef,
} from "@composition/specs";
import { TAG_SPEC_MAP } from "../../../workspace/canvas/sprites/tagSpecMap";

export interface TransformSpecPreset {
  /** ADR-082 A2: containerStyles / composition 에서 공급된 값은 "100%", "300px", "fit-content" 같은 string 포함 */
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number;
}

export interface AppearanceSpecPreset {
  borderRadius?: number;
  borderWidth?: number;
  /** ADR-082: containerStyles / composition 에서 공급된 배경 색상 CSS 값 (예: "var(--bg-raised)") */
  backgroundColor?: string;
  /** ADR-082: containerStyles / composition 에서 공급된 테두리 색상 CSS 값 */
  borderColor?: string;
}

export interface LayoutSpecPreset {
  gap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  /** ADR-082 P3: containerStyles 에서 공급된 Flex/Grid 레이아웃 키 (문자열 그대로) */
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
}

export interface TypographySpecPreset {
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
}

/** ADR-082: 3-tier fallback chain 을 위한 확장된 spec shape. */
type SpecShape =
  | {
      sizes?: Record<string, Record<string, unknown>>;
      containerStyles?: Record<string, unknown>;
      composition?: {
        gap?: string;
        containerStyles?: Record<string, string>;
      };
    }
  | undefined;
type PresetExtractor<T> = (sizeEntry: Record<string, unknown>) => T;
type ContainerExtractor<T> = (cs: Record<string, unknown>) => T;
type CompositionExtractor<T> = (comp: {
  gap?: string;
  containerStyles?: Record<string, string>;
}) => T;

const allCaches: Array<Map<string, unknown>> = [];

/**
 * ADR-082: 3-tier fallback chain resolver.
 *
 * 우선순위 (낮은 → 높은, merge 순서): `composition.*` → `containerStyles` → `sizes[size]`.
 * 기존 sizes 경로의 값은 최우선 (회귀 0 보장). Non-composite containerStyles 와 Composite
 * composition.\* 는 sizes 에 값이 없을 때만 발동.
 *
 * 각 extractor 는 해당 tier 가 spec 에 없으면 skip (Panel 에 영향 없음).
 */
function createResolver<T extends object>(
  sizesExtractor: PresetExtractor<T>,
  containerExtractor?: ContainerExtractor<T>,
  compositionExtractor?: CompositionExtractor<T>,
): (type: string | undefined, size: string | undefined) => T {
  const cache = new Map<string, T>();
  allCaches.push(cache as Map<string, unknown>);
  const empty = Object.freeze({}) as T;
  return (type, size) => {
    if (!type) return empty;
    const key = `${type}:${size ?? "md"}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const spec = TAG_SPEC_MAP[type] as unknown as SpecShape;

    const sizeEntry = spec?.sizes?.[size ?? "md"];
    const sizesPreset = sizeEntry ? sizesExtractor(sizeEntry) : ({} as T);

    const cs = spec?.containerStyles;
    const csPreset =
      containerExtractor && cs ? containerExtractor(cs) : ({} as T);

    const comp = spec?.composition;
    const compPreset =
      compositionExtractor && comp ? compositionExtractor(comp) : ({} as T);

    // ADR-082 fallback merge 순서 — 낮은 우선순위부터 spread.
    // composition (최하) < containerStyles < sizes (최상, 기존 동작 보존)
    const preset = { ...compPreset, ...csPreset, ...sizesPreset } as T;
    cache.set(key, preset);
    return preset;
  };
}

function pickNumeric<T extends object>(
  sizeEntry: Record<string, unknown>,
  keys: readonly string[],
): T {
  // ADR-082 P3 fix: 대부분의 spec 이 `sizes.{size}.borderRadius = "{radius.md}"` 같은
  //   TokenRef 문자열을 저장 (Badge/InlineAlert/Button/...). `typeof v === "number"` 로만
  //   필터하면 전부 skip 되어 Panel 이 0 표시. `resolveToNumber` 로 TokenRef/CSS var 양쪽
  //   해석 후 숫자 추출. 기존 숫자 케이스는 그대로 통과 (회귀 0).
  const out: Record<string, number> = {};
  for (const k of keys) {
    const resolved = resolveToNumber(sizeEntry[k]);
    if (resolved !== undefined) out[k] = resolved;
  }
  return out as unknown as T;
}

/**
 * ADR-082 헬퍼: TokenRef 또는 CSS var 문자열을 숫자로 resolve.
 *
 * - 숫자: 그대로 반환
 * - TokenRef (`{spacing.xs}`): resolveToken → 숫자
 * - CSS var (`var(--spacing-xs)`): cssVarToTokenRef → resolveToken → 숫자
 * - 그 외: undefined
 */
function resolveToNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  // TokenRef 직접
  if (/^\{[a-z]+\.[^}]+\}$/.test(value)) {
    const resolved = resolveToken(value as TokenRef);
    return typeof resolved === "number" ? resolved : undefined;
  }
  // CSS var 역변환
  if (value.startsWith("var(--")) {
    const token = cssVarToTokenRef(value);
    if (!token) return undefined;
    const resolved = resolveToken(token);
    return typeof resolved === "number" ? resolved : undefined;
  }
  return undefined;
}

/** ADR-082: containerStyles 의 CSS 값 (TokenRef or "var(--xxx)") 을 CSS var 문자열로 정규화. */
function resolveToCSSVar(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // TokenRef → tokenToCSSVar 경유 (COLOR_TOKEN_TO_CSS 매핑 포함)
  if (/^\{[a-z]+\.[^}]+\}$/.test(value)) {
    return tokenToCSSVar(value as TokenRef);
  }
  // 이미 CSS var 또는 hex/rgb 등 CSS 값 — 그대로
  return value;
}

const TRANSFORM_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "aspectRatio",
] as const;

const APPEARANCE_KEYS = ["borderRadius", "borderWidth"] as const;

const LAYOUT_KEYS = [
  "gap",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
] as const;

const TYPOGRAPHY_NUMERIC_KEYS = [
  "fontSize",
  "lineHeight",
  "letterSpacing",
] as const;

// ─── Transform extractor (ADR-082 A2) ─────────────────────────────────
//   sizes 경로는 기존 `pickNumeric` (숫자만) 유지. containerStyles / composition 경로는
//   "100%" / "300px" / "fit-content" 같은 CSS string 값을 그대로 통과.

const TRANSFORM_STRING_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

function transformFromContainerStyles(
  cs: Record<string, unknown>,
): TransformSpecPreset {
  const out: TransformSpecPreset = {};
  for (const k of TRANSFORM_STRING_KEYS) {
    const v = cs[k];
    const resolved = resolveToNumber(v);
    if (resolved !== undefined) out[k] = resolved;
    else if (typeof v === "string") out[k] = v;
  }
  const ar = resolveToNumber(cs.aspectRatio);
  if (ar !== undefined) out.aspectRatio = ar;
  return out;
}

function transformFromComposition(comp: {
  containerStyles?: Record<string, string>;
}): TransformSpecPreset {
  const cs = comp.containerStyles;
  if (!cs) return {};
  const out: TransformSpecPreset = {};
  for (const k of TRANSFORM_STRING_KEYS) {
    // composition.containerStyles 는 Record<string,string> — kebab/camel 양쪽 허용
    const kebab = k.replace(/([A-Z])/g, "-$1").toLowerCase();
    const v = cs[k] ?? cs[kebab];
    if (typeof v === "string") {
      const resolved = resolveToNumber(v);
      if (resolved !== undefined) out[k] = resolved;
      else out[k] = v;
    }
  }
  const ar = cs.aspectRatio ?? cs["aspect-ratio"];
  if (typeof ar === "string") {
    const resolved = resolveToNumber(ar);
    if (resolved !== undefined) out.aspectRatio = resolved;
  }
  return out;
}

// ─── Appearance extractor ──────────────────────────────────────────────

function appearanceFromContainerStyles(
  cs: Record<string, unknown>,
): AppearanceSpecPreset {
  const out: AppearanceSpecPreset = {};
  const br = resolveToNumber(cs.borderRadius);
  if (br !== undefined) out.borderRadius = br;
  const bw = resolveToNumber(cs.borderWidth);
  if (bw !== undefined) out.borderWidth = bw;
  const bg = resolveToCSSVar(cs.background);
  if (bg) out.backgroundColor = bg;
  const bc = resolveToCSSVar(cs.border);
  if (bc) out.borderColor = bc;
  return out;
}

function appearanceFromComposition(comp: {
  containerStyles?: Record<string, string>;
}): AppearanceSpecPreset {
  const out: AppearanceSpecPreset = {};
  const cs = comp.containerStyles;
  if (!cs) return out;
  const br = resolveToNumber(cs["border-radius"] ?? cs.borderRadius);
  if (br !== undefined) out.borderRadius = br;
  const bw = resolveToNumber(cs["border-width"] ?? cs.borderWidth);
  if (bw !== undefined) out.borderWidth = bw;
  const bg = cs.background;
  if (typeof bg === "string" && bg.startsWith("var(")) out.backgroundColor = bg;
  const bc = cs["border-color"] ?? cs.borderColor;
  if (typeof bc === "string" && bc.startsWith("var(")) out.borderColor = bc;
  return out;
}

// ─── Layout extractor ──────────────────────────────────────────────────

function layoutFromContainerStyles(
  cs: Record<string, unknown>,
): LayoutSpecPreset {
  const out: LayoutSpecPreset = {};
  const gap = resolveToNumber(cs.gap);
  if (gap !== undefined) out.gap = gap;
  // padding shorthand → 4-way 동일 숫자 적용
  const padding = resolveToNumber(cs.padding);
  if (padding !== undefined) {
    out.paddingTop = padding;
    out.paddingRight = padding;
    out.paddingBottom = padding;
    out.paddingLeft = padding;
  }
  // ADR-082 P3: Flex/Grid 레이아웃 키 — 문자열 그대로 Panel 기본값 공급
  if (typeof cs.display === "string") out.display = cs.display;
  if (typeof cs.flexDirection === "string")
    out.flexDirection = cs.flexDirection;
  if (typeof cs.alignItems === "string") out.alignItems = cs.alignItems;
  if (typeof cs.justifyContent === "string")
    out.justifyContent = cs.justifyContent;
  return out;
}

function layoutFromComposition(comp: {
  gap?: string;
  containerStyles?: Record<string, string>;
}): LayoutSpecPreset {
  const out: LayoutSpecPreset = {};
  const gap = resolveToNumber(comp.gap);
  if (gap !== undefined) out.gap = gap;
  const cs = comp.containerStyles;
  if (!cs) return out;
  const padding = resolveToNumber(cs.padding);
  if (padding !== undefined) {
    out.paddingTop = padding;
    out.paddingRight = padding;
    out.paddingBottom = padding;
    out.paddingLeft = padding;
  }
  // ADR-082 P3: composition.containerStyles 는 Record<string,string> (CSS 값 그대로)
  //   kebab-case / camelCase 양쪽 허용하여 Panel 소비 일관성 유지
  const display = cs.display;
  if (typeof display === "string") out.display = display;
  const flexDirection = cs["flex-direction"] ?? cs.flexDirection;
  if (typeof flexDirection === "string") out.flexDirection = flexDirection;
  const alignItems = cs["align-items"] ?? cs.alignItems;
  if (typeof alignItems === "string") out.alignItems = alignItems;
  const justifyContent = cs["justify-content"] ?? cs.justifyContent;
  if (typeof justifyContent === "string") out.justifyContent = justifyContent;
  return out;
}

// ─── Resolver exports ──────────────────────────────────────────────────

export const resolveSpecPreset = createResolver<TransformSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, TRANSFORM_KEYS),
  // ADR-082 A2: containerStyles 의 "100%" / "300px" / "fit-content" 같은 string 값 통과
  transformFromContainerStyles,
  transformFromComposition,
);

export const resolveAppearanceSpecPreset = createResolver<AppearanceSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, APPEARANCE_KEYS),
  appearanceFromContainerStyles,
  appearanceFromComposition,
);

export const resolveLayoutSpecPreset = createResolver<LayoutSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, LAYOUT_KEYS),
  layoutFromContainerStyles,
  layoutFromComposition,
);

export const resolveTypographySpecPreset = createResolver<TypographySpecPreset>(
  (sizeEntry) => {
    const preset: TypographySpecPreset = pickNumeric(
      sizeEntry,
      TYPOGRAPHY_NUMERIC_KEYS,
    );
    const fontWeight = sizeEntry.fontWeight;
    if (typeof fontWeight === "number") preset.fontWeight = String(fontWeight);
    else if (typeof fontWeight === "string") preset.fontWeight = fontWeight;
    const fontFamily = sizeEntry.fontFamily;
    if (typeof fontFamily === "string") preset.fontFamily = fontFamily;
    return preset;
  },
  // Typography: containerStyles 에는 fontSize 필드 없음 (ContainerStylesSchema 미정의).
  // composition 쪽에도 typography 전용 필드 없음 — 현재 scope 제외.
  undefined,
  undefined,
);

export function clearSpecPresetCache(): void {
  for (const cache of allCaches) cache.clear();
}
