/**
 * 공유 보간 유틸리티.
 * TransitionManager와 AnimationEngine이 속성별 보간에 사용.
 */

/** 숫자 선형 보간 */
export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** sRGB 색상 component-wise 보간. Float32Array [r,g,b,a] 0-1 */
export function lerpColor(
  a: Float32Array,
  b: Float32Array,
  t: number,
): Float32Array {
  return new Float32Array([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ]);
}

/** transform 분해 보간 */
export interface DecomposedTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
}

export function lerpTransform(
  a: DecomposedTransform,
  b: DecomposedTransform,
  t: number,
): DecomposedTransform {
  return {
    translateX: lerpNumber(a.translateX, b.translateX, t),
    translateY: lerpNumber(a.translateY, b.translateY, t),
    scaleX: lerpNumber(a.scaleX, b.scaleX, t),
    scaleY: lerpNumber(a.scaleY, b.scaleY, t),
    rotate: lerpNumber(a.rotate, b.rotate, t),
  };
}

/** box-shadow 보간 */
export interface ShadowValues {
  dx: number;
  dy: number;
  sigmaX: number;
  sigmaY: number;
  spread: number;
  color: Float32Array;
}

export function lerpBoxShadow(
  a: ShadowValues,
  b: ShadowValues,
  t: number,
): ShadowValues {
  return {
    dx: lerpNumber(a.dx, b.dx, t),
    dy: lerpNumber(a.dy, b.dy, t),
    sigmaX: lerpNumber(a.sigmaX, b.sigmaX, t),
    sigmaY: lerpNumber(a.sigmaY, b.sigmaY, t),
    spread: lerpNumber(a.spread, b.spread, t),
    color: lerpColor(a.color, b.color, t),
  };
}

const NUMERIC_PROPS = new Set([
  "opacity",
  "width",
  "height",
  "borderRadius",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "fontSize",
  "letterSpacing",
  "lineHeight",
  "top",
  "right",
  "bottom",
  "left",
]);

/**
 * CSS 속성에 맞는 보간 함수 자동 선택.
 * 미지원 속성은 discrete (t>=0.5 → end, else start).
 */
export function interpolateProperty(
  prop: string,
  start: unknown,
  end: unknown,
  t: number,
): unknown {
  if (
    NUMERIC_PROPS.has(prop) &&
    typeof start === "number" &&
    typeof end === "number"
  ) {
    return lerpNumber(start, end, t);
  }
  if (
    (prop === "backgroundColor" ||
      prop === "color" ||
      prop === "borderColor") &&
    start instanceof Float32Array &&
    end instanceof Float32Array
  ) {
    return lerpColor(start, end, t);
  }
  return t >= 0.5 ? end : start;
}
