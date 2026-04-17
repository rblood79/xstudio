import { TAG_SPEC_MAP } from "../../../workspace/canvas/sprites/tagSpecMap";

export interface TransformSpecPreset {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
}

export interface AppearanceSpecPreset {
  borderRadius?: number;
  borderWidth?: number;
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
}

export interface TypographySpecPreset {
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
}

type SpecShape =
  | { sizes?: Record<string, Record<string, unknown>> }
  | undefined;
type PresetExtractor<T> = (sizeEntry: Record<string, unknown>) => T;

const allCaches: Array<Map<string, unknown>> = [];

function createResolver<T extends object>(
  extractor: PresetExtractor<T>,
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
    const preset = sizeEntry ? extractor(sizeEntry) : ({} as T);
    cache.set(key, preset);
    return preset;
  };
}

function pickNumeric<T extends object>(
  sizeEntry: Record<string, unknown>,
  keys: readonly string[],
): T {
  const out: Record<string, number> = {};
  for (const k of keys) {
    const v = sizeEntry[k];
    if (typeof v === "number") out[k] = v;
  }
  return out as unknown as T;
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

export const resolveSpecPreset = createResolver<TransformSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, TRANSFORM_KEYS),
);

export const resolveAppearanceSpecPreset = createResolver<AppearanceSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, APPEARANCE_KEYS),
);

export const resolveLayoutSpecPreset = createResolver<LayoutSpecPreset>(
  (sizeEntry) => pickNumeric(sizeEntry, LAYOUT_KEYS),
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
);

export function clearSpecPresetCache(): void {
  for (const cache of allCaches) cache.clear();
}
