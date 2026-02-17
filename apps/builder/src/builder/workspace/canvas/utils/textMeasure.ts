/**
 * Text Measurement Utility
 *
 * Canvas 2D API로 텍스트 word-wrap 높이를 측정한다.
 * PixiCard, ElementSprite 등에서 콘텐츠 기반 높이 계산에 사용.
 *
 * Phase 0: TextMeasurer 추상 인터페이스 도입
 * - Canvas2DTextMeasurer: 기존 Canvas 2D API 기반 (기본값)
 * - 향후 CanvasKit Paragraph API 기반 구현으로 교체 가능
 *
 * @since 2026-02-05
 * @updated 2026-02-17 Phase 0: TextMeasurer 인터페이스 추가
 */

// ============================================
// TextMeasurer Interface
// ============================================

/** 텍스트 측정 결과 */
export interface TextMeasureResult {
  /** 텍스트 렌더링 너비 (px) */
  width: number;
  /** 텍스트 렌더링 높이 (px) */
  height: number;
}

/** 텍스트 스타일 옵션 */
export interface TextMeasureStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight?: number | string;
  lineHeight?: number;
}

/**
 * 텍스트 측정 추상 인터페이스
 *
 * Canvas 2D, CanvasKit Paragraph, 또는 다른 엔진으로 교체 가능.
 * 모든 텍스트 측정 호출은 이 인터페이스를 통해야 합니다.
 */
export interface TextMeasurer {
  /** 한 줄 텍스트 너비 측정 */
  measureWidth(text: string, style: TextMeasureStyle): number;

  /** 줄바꿈 포함 텍스트 크기 측정 */
  measureWrapped(text: string, style: TextMeasureStyle, maxWidth: number): TextMeasureResult;
}

// ============================================
// Canvas 2D Implementation
// ============================================

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
 * Canvas 2D API 기반 텍스트 측정기
 *
 * 기존 measureTextWidth(), measureWrappedTextHeight()를
 * TextMeasurer 인터페이스로 래핑.
 */
export class Canvas2DTextMeasurer implements TextMeasurer {
  measureWidth(text: string, style: TextMeasureStyle): number {
    if (!text) return 0;
    const ctx = getMeasureCtx();
    if (!ctx) {
      return text.length * (style.fontSize * 0.5);
    }
    ctx.font = `${style.fontWeight ?? 400} ${style.fontSize}px ${style.fontFamily}`;
    return ctx.measureText(text).width;
  }

  measureWrapped(text: string, style: TextMeasureStyle, maxWidth: number): TextMeasureResult {
    const lineHeight = style.lineHeight ?? style.fontSize * 1.2;
    if (!text || maxWidth <= 0) {
      return { width: 0, height: lineHeight };
    }
    const height = measureWrappedTextHeight(
      text,
      style.fontSize,
      style.fontWeight ?? 400,
      style.fontFamily,
      maxWidth,
    );
    return { width: maxWidth, height };
  }
}

// ============================================
// Singleton / Registry
// ============================================

/** 현재 활성 텍스트 측정기 */
let _activeMeasurer: TextMeasurer = new Canvas2DTextMeasurer();

/**
 * 활성 텍스트 측정기 가져오기
 *
 * CanvasKit Paragraph API로 교체 시 setTextMeasurer()로 교체.
 */
export function getTextMeasurer(): TextMeasurer {
  return _activeMeasurer;
}

/**
 * 활성 텍스트 측정기 교체
 *
 * CanvasKit 초기화 후 호출하여 Paragraph API 기반 측정기로 교체.
 *
 * @example
 * // CanvasKit 초기화 후
 * setTextMeasurer(new CanvasKitTextMeasurer(canvasKit));
 */
export function setTextMeasurer(measurer: TextMeasurer): void {
  _activeMeasurer = measurer;
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
