/**
 * Text Measurement Utility
 *
 * Canvas 2D API로 텍스트 word-wrap 높이를 측정한다.
 * PixiCard, ElementSprite 등에서 콘텐츠 기반 높이 계산에 사용.
 *
 * @since 2026-02-05
 */

/** 오프스크린 Canvas 2D context (싱글턴) */
let _measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (!_measureCtx) {
    const canvas = document.createElement('canvas');
    _measureCtx = canvas.getContext('2d');
  }
  return _measureCtx;
}

/**
 * Canvas 2D API로 텍스트의 word-wrap 높이를 측정한다.
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (px)
 * @param fontWeight - 폰트 굵기 (e.g., 400, 600, '600')
 * @param fontFamily - 폰트 패밀리 (e.g., 'Pretendard')
 * @param maxWidth - 줄바꿈 기준 최대 너비 (px)
 * @returns 줄바꿈 포함 총 높이 (px)
 */
export function measureWrappedTextHeight(
  text: string,
  fontSize: number,
  fontWeight: number | string,
  fontFamily: string,
  maxWidth: number,
): number {
  const lineHeight = fontSize * 1.2;
  if (!text || maxWidth <= 0) return lineHeight;

  const ctx = getMeasureCtx();
  if (!ctx) return lineHeight; // fallback

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const words = text.split(/(\s+)/); // 공백 포함 분리
  let lineCount = 1;
  let currentLineWidth = 0;

  for (const word of words) {
    const wordWidth = ctx.measureText(word).width;
    if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
      lineCount++;
      currentLineWidth = wordWidth;
    } else {
      currentLineWidth += wordWidth;
    }
  }

  return lineCount * lineHeight;
}
