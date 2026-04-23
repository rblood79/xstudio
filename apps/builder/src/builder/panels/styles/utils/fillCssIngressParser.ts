import type {
  AngularGradientFillItem,
  FillItem,
  ImageFillItem,
  LinearGradientFillItem,
  MeshGradientFillItem,
  RadialGradientFillItem,
} from "../../../../types/builder/fill.types";
import {
  FillType,
  createDefaultColorFill,
  createDefaultFill,
} from "../../../../types/builder/fill.types";
import { normalizeToHex8 } from "./colorUtils";

function splitTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);

    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseStops(input: string): Array<{ color: string; position: number }> {
  return splitTopLevelComma(input)
    .map((entry, index, arr) => {
      const match = entry.match(/^(.*?)\s+([0-9.]+)%$/);
      if (match) {
        return {
          color: normalizeToHex8(match[1].trim()),
          position: Math.max(0, Math.min(1, parseFloat(match[2]) / 100)),
        };
      }

      return {
        color: normalizeToHex8(entry.trim()),
        position: arr.length <= 1 ? 0 : index / (arr.length - 1),
      };
    })
    .filter((stop) => Boolean(stop.color));
}

function parseLinearGradient(input: string): LinearGradientFillItem | null {
  const match = input.match(/^linear-gradient\(([-0-9.]+)deg,\s*(.+)\)$/i);
  if (!match) return null;

  const fill = createDefaultFill(FillType.LinearGradient) as LinearGradientFillItem;
  fill.rotation = Number.parseFloat(match[1]) || 0;
  fill.stops = parseStops(match[2]);
  return fill.stops.length > 0 ? fill : null;
}

function parseRadialGradient(input: string): RadialGradientFillItem | null {
  const match = input.match(
    /^radial-gradient\(circle at\s+([0-9.]+)%\s+([0-9.]+)%,\s*(.+)\)$/i,
  );
  if (!match) return null;

  const fill = createDefaultFill(FillType.RadialGradient) as RadialGradientFillItem;
  fill.center = {
    x: Math.max(0, Math.min(1, Number.parseFloat(match[1]) / 100)),
    y: Math.max(0, Math.min(1, Number.parseFloat(match[2]) / 100)),
  };
  fill.stops = parseStops(match[3]);
  return fill.stops.length > 0 ? fill : null;
}

function parseAngularGradient(input: string): AngularGradientFillItem | null {
  const match = input.match(
    /^conic-gradient\(from\s+([-0-9.]+)deg at\s+([0-9.]+)%\s+([0-9.]+)%,\s*(.+)\)$/i,
  );
  if (!match) return null;

  const fill = createDefaultFill(FillType.AngularGradient) as AngularGradientFillItem;
  fill.rotation = Number.parseFloat(match[1]) || 0;
  fill.center = {
    x: Math.max(0, Math.min(1, Number.parseFloat(match[2]) / 100)),
    y: Math.max(0, Math.min(1, Number.parseFloat(match[3]) / 100)),
  };
  fill.stops = parseStops(match[4]);
  return fill.stops.length > 0 ? fill : null;
}

function parseImageFill(
  backgroundImage: string,
  backgroundSize?: string,
): ImageFillItem | null {
  const match = backgroundImage.match(/^url\((.*)\)$/i);
  if (!match) return null;

  const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, "");
  if (!rawUrl || rawUrl.startsWith('"data:image/svg+xml,')) {
    return null;
  }

  const fill = createDefaultFill(FillType.Image) as ImageFillItem;
  fill.url = rawUrl;
  fill.mode =
    backgroundSize === "100% 100%"
      ? "stretch"
      : backgroundSize === "contain"
        ? "fit"
        : "fill";
  return fill;
}

function parseMeshGradientDataUrl(
  backgroundImage: string,
  backgroundSize?: string,
): MeshGradientFillItem | null {
  if (backgroundSize !== "100% 100%") return null;

  const match = backgroundImage.match(/^url\((.*)\)$/i);
  if (!match) return null;

  const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, "");
  const prefix = "data:image/svg+xml,";
  if (!rawUrl.startsWith(prefix)) return null;

  try {
    const svg = decodeURIComponent(rawUrl.slice(prefix.length));
    const topMatch = svg.match(
      /<linearGradient id="t"><stop offset="0" stop-color="([^"]+)".*?<stop offset="1" stop-color="([^"]+)"/,
    );
    const bottomMatch = svg.match(
      /<linearGradient id="b"><stop offset="0" stop-color="([^"]+)".*?<stop offset="1" stop-color="([^"]+)"/,
    );

    if (!topMatch || !bottomMatch) {
      return null;
    }

    const fill = createDefaultFill(FillType.MeshGradient) as MeshGradientFillItem;
    fill.points = [
      { position: [0, 0], color: normalizeToHex8(topMatch[1]) },
      { position: [1, 0], color: normalizeToHex8(topMatch[2]) },
      { position: [0, 1], color: normalizeToHex8(bottomMatch[1]) },
      { position: [1, 1], color: normalizeToHex8(bottomMatch[2]) },
    ];
    return fill;
  } catch {
    return null;
  }
}

export function parseCssBackgroundToFills(style: {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
}): FillItem[] {
  const fills: FillItem[] = [];

  if (style.backgroundColor) {
    fills.push(createDefaultColorFill(normalizeToHex8(style.backgroundColor)));
  }

  const bgImage = style.backgroundImage?.trim();
  if (!bgImage) {
    return fills;
  }

  const parsedImage =
    parseLinearGradient(bgImage) ??
    parseRadialGradient(bgImage) ??
    parseAngularGradient(bgImage) ??
    parseMeshGradientDataUrl(bgImage, style.backgroundSize) ??
    parseImageFill(bgImage, style.backgroundSize);

  if (parsedImage) {
    fills.push(parsedImage);
  }

  return fills;
}
