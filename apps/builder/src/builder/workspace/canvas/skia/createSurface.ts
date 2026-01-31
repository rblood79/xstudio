/**
 * CanvasKit Surface 생성
 *
 * WebGL GPU Surface를 우선 생성하고, 실패 시 SW(Software) 폴백으로 전환한다.
 * Pencil §10.9.2 패턴을 따른다.
 *
 * @see docs/WASM.md §5.2 Surface 생성
 */

import type { CanvasKit, Surface } from 'canvaskit-wasm';

/**
 * GPU Surface를 생성한다.
 *
 * 1. WebGL GPU Surface 시도
 * 2. 실패 시 SW(CPU) 폴백
 * 3. 둘 다 실패 시 에러
 *
 * @param ck - CanvasKit 인스턴스
 * @param canvas - HTML Canvas 엘리먼트
 *   ⚠️ 호출 전에 canvas.width/height를 디바이스 픽셀 크기로 설정할 것.
 *   MakeWebGLCanvasSurface는 canvas.width/height를 내부적으로 읽는다.
 */
export function createGPUSurface(
  ck: CanvasKit,
  canvas: HTMLCanvasElement,
): Surface {
  // WebGL GPU Surface 우선
  const surface = ck.MakeWebGLCanvasSurface(canvas);
  if (surface) return surface;

  console.warn('[Skia] WebGL surface 생성 실패, SW 폴백');
  const swSurface = ck.MakeSWCanvasSurface(canvas);
  if (swSurface) return swSurface;

  throw new Error(
    'CanvasKit Surface 생성 불가. WebGL/SW 모두 실패. ' +
    '브라우저가 WebGL을 지원하는지 확인하세요.'
  );
}
