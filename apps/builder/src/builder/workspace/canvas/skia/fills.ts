/**
 * CanvasKit Fill Shader 시스템
 *
 * 6종의 Fill 타입을 CanvasKit Paint에 적용한다.
 * Pencil §10.9.6 패턴을 따른다.
 *
 * @see docs/RENDERING_ARCHITECTURE.md §5.5 Fill 시스템
 */

import type { CanvasKit, Paint } from "canvaskit-wasm";
import type { FillStyle } from "./types";
import { maybeAmplifyOklab } from "./oklabInterpolation";

/**
 * Float32Array[] → flat Float32Array 변환 (CanvasKit WASM 호환성 보장)
 * MakeLinearGradient 등은 InputFlexibleColorArray를 받지만,
 * flat Float32Array가 가장 안전한 형식이다.
 */
export function flattenColors(colors: Float32Array[]): Float32Array {
  const result = new Float32Array(colors.length * 4);
  for (let i = 0; i < colors.length; i++) {
    result[i * 4] = colors[i][0];
    result[i * 4 + 1] = colors[i][1];
    result[i * 4 + 2] = colors[i][2];
    result[i * 4 + 3] = colors[i][3];
  }
  return result;
}

/**
 * CSS radial-gradient 키워드를 반지름 수치로 변환.
 *
 * @param keyword - CSS extent-keyword (closest-side, farthest-side, closest-corner, farthest-corner)
 * @param cx - 중심 x (요소 내 좌표)
 * @param cy - 중심 y (요소 내 좌표)
 * @param w  - 요소 너비
 * @param h  - 요소 높이
 * @returns rx, ry (ellipse 반지름)
 */
export function resolveRadialExtent(
  keyword: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
): { rx: number; ry: number } {
  const left = cx,
    right = w - cx,
    top = cy,
    bottom = h - cy;
  switch (keyword) {
    case "closest-side":
      return { rx: Math.min(left, right), ry: Math.min(top, bottom) };
    case "farthest-side":
      return { rx: Math.max(left, right), ry: Math.max(top, bottom) };
    case "closest-corner":
      return {
        rx: Math.sqrt(Math.min(left, right) ** 2 + Math.min(top, bottom) ** 2),
        ry: Math.sqrt(Math.min(left, right) ** 2 + Math.min(top, bottom) ** 2),
      };
    case "farthest-corner":
    default:
      return {
        rx: Math.sqrt(Math.max(left, right) ** 2 + Math.max(top, bottom) ** 2),
        ry: Math.sqrt(Math.max(left, right) ** 2 + Math.max(top, bottom) ** 2),
      };
  }
}

/**
 * FillStyle에 따라 CanvasKit Paint의 색상/셰이더를 설정한다.
 *
 * @param ck - CanvasKit 인스턴스
 * @param paint - 대상 Paint 객체
 * @param fill - Fill 정의
 *
 * @returns 생성된 Shader (호출자가 delete() 해야 함). Color fill은 null 반환.
 */
export function applyFill(
  ck: CanvasKit,
  paint: Paint,
  fill: FillStyle,
): { delete(): void } | null {
  switch (fill.type) {
    case "color": {
      paint.setColor(
        ck.Color4f(fill.rgba[0], fill.rgba[1], fill.rgba[2], fill.rgba[3]),
      );
      return null;
    }

    case "linear-gradient": {
      const { colors: fillColors, positions: fillPositions } =
        maybeAmplifyOklab(fill.colors, fill.positions, fill.interpolation);
      const flatColors = flattenColors(fillColors);
      const shader = ck.Shader.MakeLinearGradient(
        fill.start,
        fill.end,
        flatColors,
        fillPositions,
        fill.repeating ? ck.TileMode.Repeat : ck.TileMode.Clamp,
      );
      if (!shader) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[applyFill] MakeLinearGradient returned null", {
            start: fill.start,
            end: fill.end,
            colorsLen: fill.colors.length,
            positionsLen: fill.positions.length,
          });
        }
        return null;
      }
      paint.setShader(shader);
      return shader;
    }

    case "radial-gradient": {
      const { colors: fillColors, positions: fillPositions } =
        maybeAmplifyOklab(fill.colors, fill.positions, fill.interpolation);
      const flatColors = flattenColors(fillColors);
      const shader = ck.Shader.MakeTwoPointConicalGradient(
        fill.center,
        fill.startRadius,
        fill.center,
        fill.endRadius,
        flatColors,
        fillPositions,
        fill.repeating ? ck.TileMode.Repeat : ck.TileMode.Clamp,
      );
      if (!shader) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[applyFill] MakeTwoPointConicalGradient returned null",
            {
              center: fill.center,
              startRadius: fill.startRadius,
              endRadius: fill.endRadius,
              colorsLen: fill.colors.length,
              positionsLen: fill.positions.length,
            },
          );
        }
        return null;
      }
      paint.setShader(shader);
      return shader;
    }

    case "angular-gradient": {
      const { colors: fillColors, positions: fillPositions } =
        maybeAmplifyOklab(fill.colors, fill.positions, fill.interpolation);
      const flatColors = flattenColors(fillColors);
      // MakeSweepGradient(cx, cy, colors, positions, tileMode, localMatrix, flags)
      // localMatrix로 CSS conic-gradient(12시) → CanvasKit(3시) 보정
      const shader = ck.Shader.MakeSweepGradient(
        fill.cx,
        fill.cy,
        flatColors,
        fillPositions,
        fill.repeating ? ck.TileMode.Repeat : ck.TileMode.Clamp,
        fill.rotationMatrix ?? null, // localMatrix로 -90° 보정
        0, // flags
      );
      if (!shader) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[applyFill] MakeSweepGradient returned null", {
            cx: fill.cx,
            cy: fill.cy,
            colorsLen: fill.colors.length,
            positionsLen: fill.positions.length,
          });
        }
        return null;
      }
      paint.setShader(shader);
      return shader;
    }

    case "image": {
      // CanvasKit-WASM: Image.makeShaderOptions() 사용
      // (ck.Shader.MakeImageShader는 존재하지 않음)
      const skImage = fill.image as {
        makeShaderOptions?: (...args: unknown[]) => unknown;
      } | null;
      if (skImage && typeof skImage.makeShaderOptions === "function") {
        // tileModeX/Y 분리 지원 (background-repeat: repeat-x/y)
        // 하위 호환: 구형 tileMode 필드가 있으면 fallback으로 사용
        const tmX = fill.tileModeX ?? fill.tileMode ?? ck.TileMode.Decal;
        const tmY = fill.tileModeY ?? fill.tileMode ?? ck.TileMode.Decal;
        const shader = (
          skImage as {
            makeShaderOptions(
              tx: unknown,
              ty: unknown,
              fm: unknown,
              mm: unknown,
              lm?: unknown,
            ): unknown;
          }
        ).makeShaderOptions(
          tmX,
          tmY,
          fill.sampling, // FilterMode
          ck.MipmapMode.None,
          fill.matrix,
        ) as { delete(): void };
        paint.setShader(shader as Parameters<typeof paint.setShader>[0]);
        return shader;
      }
      return null;
    }

    case "mesh-gradient": {
      // CanvasKit에 네이티브 mesh gradient API가 없으므로
      // SkSL RuntimeEffect로 4코너 bilinear interpolation 구현.
      // 2x2 그리드(4색)만 지원. 더 큰 그리드는 좌상 4셀로 폴백.
      const c = fill.colors;
      if (!c || c.length < 4 || fill.width <= 0 || fill.height <= 0)
        return null;

      // SkSL: 4코너 bilinear interpolation (좌상·우상·좌하·우하)
      const sksl = `
        uniform half4 uTL, uTR, uBL, uBR;
        uniform float2 uSize;

        half4 main(float2 coord) {
          float u = clamp(coord.x / uSize.x, 0.0, 1.0);
          float v = clamp(coord.y / uSize.y, 0.0, 1.0);
          half4 top = mix(uTL, uTR, half(u));
          half4 bottom = mix(uBL, uBR, half(u));
          return mix(top, bottom, half(v));
        }
      `;

      const effect = ck.RuntimeEffect.Make(sksl);
      if (!effect) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[applyFill] RuntimeEffect.Make failed for mesh-gradient",
          );
        }
        return null;
      }

      // uniforms: [uTL(4), uTR(4), uBL(4), uBR(4), uSize(2)] = 18 floats
      const uniforms = new Float32Array([
        c[0][0],
        c[0][1],
        c[0][2],
        c[0][3], // TL
        c[1][0],
        c[1][1],
        c[1][2],
        c[1][3], // TR
        c[2][0],
        c[2][1],
        c[2][2],
        c[2][3], // BL
        c[3][0],
        c[3][1],
        c[3][2],
        c[3][3], // BR
        fill.width,
        fill.height, // size
      ]);

      const shader = effect.makeShader(uniforms);
      effect.delete(); // shader가 컴파일된 코드를 독립 보유
      paint.setShader(shader);
      return shader;
    }
  }
}
