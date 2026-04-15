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

type CacheKey = string; // `${type}:${size}`
const cache = new Map<CacheKey, TransformSpecPreset>();

export function resolveSpecPreset(
  type: string | undefined,
  size: string | undefined,
): TransformSpecPreset {
  if (!type) return {};
  const key = `${type}:${size ?? "md"}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const spec = TAG_SPEC_MAP[type];
  const preset: TransformSpecPreset = extractTransformPreset(
    spec,
    size ?? "md",
  );
  cache.set(key, preset);
  return preset;
}

export function clearSpecPresetCache(): void {
  cache.clear();
}

function extractTransformPreset(
  spec: unknown,
  size: string,
): TransformSpecPreset {
  // Spec 구조: spec.sizes[size] 또는 spec.dimensions
  // 숫자로만 반환 (CSS 문자열 변환 금지)
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
