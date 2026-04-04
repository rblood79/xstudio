/**
 * Spec 전용 텍스트 폭 측정 유틸리티
 *
 * Canvas 2D measureText()를 사용하여 Spec shapes에서
 * 텍스트 폭을 정확하게 측정합니다.
 * 추정값(fontSize * 0.6 * charCount) 대신 실측값을 사용.
 *
 * @since 2026-04-05
 * @see ADR-051
 */

let _ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D | null {
  if (!_ctx) {
    if (typeof document === "undefined") return null;
    _ctx = document.createElement("canvas").getContext("2d");
  }
  return _ctx;
}

/**
 * 텍스트 폭 측정 (Canvas 2D)
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (px)
 * @param fontFamily - 폰트 패밀리
 * @param fontWeight - 폰트 굵기 (기본 400)
 * @returns 텍스트 폭 (px), Canvas 미지원 시 fontSize * 0.6 * text.length 근사값
 */
export function measureSpecTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number | string = 400,
): number {
  if (!text) return 0;
  const ctx = getCtx();
  if (!ctx) {
    // SSR / Canvas 미지원: 근사값
    return text.length * fontSize * 0.6;
  }
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}
