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

type CacheKey = string; // `${type}:${size}`
const transformCache = new Map<CacheKey, TransformSpecPreset>();
const layoutCache = new Map<CacheKey, LayoutSpecPreset>();

export function resolveSpecPreset(
  type: string | undefined,
  size: string | undefined,
): TransformSpecPreset {
  if (!type) return {};
  const key = `${type}:${size ?? "md"}`;
  const cached = transformCache.get(key);
  if (cached) return cached;

  const spec = TAG_SPEC_MAP[type];
  const preset: TransformSpecPreset = extractTransformPreset(
    spec,
    size ?? "md",
  );
  transformCache.set(key, preset);
  return preset;
}

export function resolveLayoutSpecPreset(
  type: string | undefined,
  size: string | undefined,
): LayoutSpecPreset {
  if (!type) return {};
  const key = `${type}:${size ?? "md"}`;
  const cached = layoutCache.get(key);
  if (cached) return cached;

  const spec = TAG_SPEC_MAP[type];
  const preset: LayoutSpecPreset = extractLayoutPreset(spec, size ?? "md");
  layoutCache.set(key, preset);
  return preset;
}

export function clearSpecPresetCache(): void {
  transformCache.clear();
  layoutCache.clear();
}

function extractTransformPreset(
  spec: unknown,
  size: string,
): TransformSpecPreset {
  const anySpec = spec as
    | { sizes?: Record<string, Record<string, unknown>> }
    | undefined;
  const sizeEntry = anySpec?.sizes?.[size];
  if (!sizeEntry) return {};
  const preset: TransformSpecPreset = {};
  const numericKeys = [
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "aspectRatio",
  ] as const;
  for (const k of numericKeys) {
    const v = sizeEntry[k];
    if (typeof v === "number") preset[k] = v;
  }
  return preset;
}

function extractLayoutPreset(spec: unknown, size: string): LayoutSpecPreset {
  const anySpec = spec as
    | { sizes?: Record<string, Record<string, unknown>> }
    | undefined;
  const sizeEntry = anySpec?.sizes?.[size];
  if (!sizeEntry) return {};
  const preset: LayoutSpecPreset = {};
  const numericKeys = [
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
  for (const k of numericKeys) {
    const v = sizeEntry[k];
    if (typeof v === "number") preset[k] = v;
  }
  return preset;
}
