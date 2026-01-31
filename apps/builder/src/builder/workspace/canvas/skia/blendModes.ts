/**
 * CSS 블렌드 모드 → CanvasKit BlendMode 매핑
 *
 * 18종의 블렌드 모드를 CanvasKit의 네이티브 BlendMode 상수에 매핑한다.
 *
 * @see docs/WASM.md §6.3 블렌드 모드 18종
 */

import type { CanvasKit } from 'canvaskit-wasm';

/**
 * CSS mix-blend-mode 이름 → CanvasKit BlendMode로 변환한다.
 *
 * @param ck - CanvasKit 인스턴스
 * @param mode - CSS mix-blend-mode 이름 (예: 'multiply', 'screen')
 * @returns CanvasKit BlendMode enum 값
 */
export function toSkiaBlendMode(
  ck: CanvasKit,
  mode: string,
): ReturnType<typeof getBlendModeMap>[string] {
  const map = getBlendModeMap(ck);
  return map[mode] ?? ck.BlendMode.SrcOver;
}

function getBlendModeMap(ck: CanvasKit): Record<string, unknown> {
  return {
    // Porter-Duff
    'normal': ck.BlendMode.SrcOver,
    'source-over': ck.BlendMode.SrcOver,

    // 분리 가능 블렌드 모드
    'multiply': ck.BlendMode.Multiply,
    'screen': ck.BlendMode.Screen,
    'overlay': ck.BlendMode.Overlay,
    'darken': ck.BlendMode.Darken,
    'lighten': ck.BlendMode.Lighten,
    'color-dodge': ck.BlendMode.ColorDodge,
    'color-burn': ck.BlendMode.ColorBurn,
    'hard-light': ck.BlendMode.HardLight,
    'soft-light': ck.BlendMode.SoftLight,
    'difference': ck.BlendMode.Difference,
    'exclusion': ck.BlendMode.Exclusion,

    // 비분리 블렌드 모드
    'hue': ck.BlendMode.Hue,
    'saturation': ck.BlendMode.Saturation,
    'color': ck.BlendMode.Color,
    'luminosity': ck.BlendMode.Luminosity,

    // 추가 Porter-Duff
    'destination-over': ck.BlendMode.DstOver,
    'plus': ck.BlendMode.Plus,
  };
}
