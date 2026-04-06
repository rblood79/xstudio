/**
 * Oklab 색상 보간 (ADR-100 Phase 3 — G7)
 *
 * sRGB ↔ Oklab 변환 + gradient 색상 보간.
 * Björn Ottosson의 oklab 행렬 사용.
 */

/** sRGB [0-1] → Oklab [L, a, b] */
export function srgbToOklab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  // sRGB → linear
  const lr = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const lg = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const lb = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // linear RGB → LMS (cube root)
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** Oklab [L, a, b] → sRGB [0-1] (clamped) */
export function oklabToSrgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c: number): number =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  return [
    Math.max(0, Math.min(1, toSrgb(lr))),
    Math.max(0, Math.min(1, toSrgb(lg))),
    Math.max(0, Math.min(1, toSrgb(lb))),
  ];
}

/**
 * 두 sRGB Float32Array 색상을 oklab 공간에서 보간.
 * t: 0 → colorA, 1 → colorB
 */
export function interpolateOklab(
  colorA: Float32Array,
  colorB: Float32Array,
  t: number,
): Float32Array {
  const [La, aa, ba] = srgbToOklab(colorA[0], colorA[1], colorA[2]);
  const [Lb, ab, bb] = srgbToOklab(colorB[0], colorB[1], colorB[2]);

  const L = La + (Lb - La) * t;
  const a = aa + (ab - aa) * t;
  const b = ba + (bb - ba) * t;
  const alpha = colorA[3] + (colorB[3] - colorA[3]) * t;

  const [r, g, bl] = oklabToSrgb(L, a, b);
  return Float32Array.of(r, g, bl, alpha);
}
