/**
 * oklch → hex 변환 순수 함수
 *
 * oklch → oklab → linear-srgb → srgb → hex 변환 체인
 * culori 라이브러리 없이 순수 수학 연산만 사용 (번들 크기 절약)
 *
 * @see https://www.w3.org/TR/css-color-4/#color-conversion-code
 */

/** oklch → oklab 변환 */
function oklchToOklab(
  l: number,
  c: number,
  h: number,
): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

/** oklab → linear-srgb 변환 */
function oklabToLinearSrgb(
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

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** linear-srgb → srgb 감마 보정 */
function linearToSrgb(c: number): number {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** 0~1 float → 0~255 정수 (clamp 포함) */
function toUint8(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/**
 * oklch 색상을 hex 문자열로 변환
 *
 * @param l - Lightness (0~1)
 * @param c - Chroma (0~0.4)
 * @param h - Hue (0~360)
 * @returns '#rrggbb' hex 문자열
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const [L, a, b] = oklchToOklab(l, c, h);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  const r = toUint8(linearToSrgb(lr));
  const g = toUint8(linearToSrgb(lg));
  const bVal = toUint8(linearToSrgb(lb));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bVal.toString(16).padStart(2, "0")}`;
}
