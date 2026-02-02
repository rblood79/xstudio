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

/**
 * WebGL 컨텍스트 손실/복원 이벤트를 감시한다.
 *
 * GPU 드라이버 충돌, 메모리 부족, 백그라운드 전환 등으로
 * WebGL 컨텍스트가 손실되면 onLost 콜백을 호출하고,
 * 브라우저가 컨텍스트를 복원하면 onRestored 콜백을 호출한다.
 *
 * @returns cleanup 함수 (이벤트 리스너 해제)
 */
export function watchContextLoss(
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onRestored: () => void,
): () => void {
  const handleLost = (e: Event) => {
    e.preventDefault(); // 브라우저에 복원 의도를 알림
    console.warn('[Skia] WebGL 컨텍스트 손실');
    onLost();
  };
  const handleRestored = () => {
    console.log('[Skia] WebGL 컨텍스트 복원');
    onRestored();
  };

  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost);
    canvas.removeEventListener('webglcontextrestored', handleRestored);
  };
}
