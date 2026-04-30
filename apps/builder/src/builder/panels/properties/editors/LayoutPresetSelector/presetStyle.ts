import type { CSSProperties } from "react";

const FRAME_BOUNDARY_MIN_HEIGHT_VALUES = new Set([
  "100vh",
  "100dvh",
  "100svh",
  "100lvh",
]);

export function normalizeFramePresetContainerStyle(
  style: CSSProperties | undefined,
): CSSProperties {
  if (!style) return {};

  const next: CSSProperties = { ...style };
  const minHeight =
    typeof next.minHeight === "string"
      ? next.minHeight.trim().toLowerCase()
      : undefined;

  if (minHeight && FRAME_BOUNDARY_MIN_HEIGHT_VALUES.has(minHeight)) {
    // Frame authoring surface is already bounded by the Page. Persisting viewport
    // min-height makes a new frame look edited and can exceed the page height.
    delete next.minHeight;
  }

  return next;
}
