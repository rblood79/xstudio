const AUTO_SIZE_KEYWORDS = new Set([
  "",
  "auto",
  "fit-content",
  "min-content",
  "max-content",
]);

export function isAutoLikeSize(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== "string") return false;
  return AUTO_SIZE_KEYWORDS.has(value.trim());
}

export function parseAspectRatio(value: unknown): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "reset" ||
    value === "auto"
  ) {
    return undefined;
  }

  if (typeof value === "number") {
    return value > 0 ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  const ratioMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratioMatch) {
    const numerator = Number.parseFloat(ratioMatch[1]);
    const denominator = Number.parseFloat(ratioMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      return numerator / denominator;
    }
  }

  const numericRatio = Number.parseFloat(trimmed);
  if (Number.isFinite(numericRatio) && numericRatio > 0) {
    return numericRatio;
  }

  return undefined;
}

export function hasEnabledAspectRatio(value: unknown): boolean {
  return parseAspectRatio(value) !== undefined;
}

export function shouldForceAutoHeightForAspectRatio(
  width: unknown,
  height: unknown,
): boolean {
  return !isAutoLikeSize(width) && !isAutoLikeSize(height);
}

export function shouldSetAutoHeightForAspectRatio(
  width: unknown,
  height: unknown,
  resolvedHeight?: unknown,
): boolean {
  if (isAutoLikeSize(height)) {
    return resolvedHeight === undefined;
  }

  return shouldForceAutoHeightForAspectRatio(width, height);
}

export function buildAspectRatioStyleUpdates(
  aspectRatio: string,
  dimensions: { width?: unknown; height?: unknown },
): Record<string, string> {
  const normalizedValue =
    aspectRatio === "reset" || aspectRatio.trim() === "" ? "" : aspectRatio;
  const updates: Record<string, string> = {
    aspectRatio: normalizedValue,
  };

  if (
    normalizedValue !== "" &&
    hasEnabledAspectRatio(normalizedValue) &&
    shouldForceAutoHeightForAspectRatio(dimensions.width, dimensions.height)
  ) {
    updates.height = "auto";
  }

  return updates;
}
