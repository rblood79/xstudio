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
    if (typeof document === 'undefined') return null;
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
// Font Metrics (baseline 정밀 계산)
// ============================================

/**
 * 폰트 메트릭 측정 결과
 *
 * Canvas 2D TextMetrics API 기반으로 측정된 폰트의 수직 메트릭.
 * layout engine의 baseline 계산에 사용됩니다.
 */
export interface FontMetrics {
  /** baseline에서 텍스트 상단까지의 거리 (양수, px) */
  ascent: number;
  /** baseline에서 텍스트 하단까지의 거리 (양수, px) */
  descent: number;
  /** ascent + descent (em-box 높이와 다름) */
  fontHeight: number;
}

/**
 * 폰트 메트릭 캐시
 *
 * 키 형식: `${fontFamily}:${fontSize}:${fontWeight}`
 * 동일 폰트/사이즈/weight 조합은 메트릭이 불변이므로 재측정 불필요.
 *
 * 메모리 상한: MAX_CACHE_SIZE 초과 시 전체 clear.
 * 일반적인 빌더 세션에서 폰트 조합은 수십 종 이내이므로 충분.
 */
const _fontMetricsCache = new Map<string, FontMetrics>();
const MAX_FONT_METRICS_CACHE_SIZE = 256;

/**
 * 텍스트 측정에 사용하는 표본 문자열
 *
 * 대소문자 + descender 문자(g, j, p, q, y)를 포함하여
 * actualBoundingBoxAscent/Descent가 정확한 범위를 반환하도록 합니다.
 */
const METRIC_SAMPLE_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzgjpqy';

/**
 * Canvas 2D TextMetrics 기반 폰트 메트릭 측정
 *
 * Canvas 2D `measureText()`의 `actualBoundingBoxAscent`와
 * `actualBoundingBoxDescent`를 사용하여 실제 폰트 렌더링 기반
 * ascent/descent를 측정합니다.
 *
 * 캐싱: 동일 fontFamily/fontSize/fontWeight 조합은 Map에서 O(1) 조회.
 * SSR-safe: Canvas 2D 사용 불가 환경에서는 fontSize 기반 근사값 반환.
 *
 * @param fontFamily - 폰트 패밀리 (예: 'Pretendard', 'sans-serif')
 * @param fontSize - 폰트 크기 (px)
 * @param fontWeight - 폰트 두께 (예: 400, 700, 'bold')
 * @returns 폰트 메트릭 (항상 반환, Canvas 미지원 시 근사값)
 */
export function measureFontMetrics(
  fontFamily: string,
  fontSize: number,
  fontWeight: string | number = 400,
): FontMetrics {
  // 캐시 키 생성
  const cacheKey = `${fontFamily}:${fontSize}:${fontWeight}`;

  const cached = _fontMetricsCache.get(cacheKey);
  if (cached) return cached;

  // Canvas 2D context 재활용 (기존 싱글톤)
  const ctx = getMeasureCtx();
  if (ctx) {
    try {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(METRIC_SAMPLE_TEXT);

      // actualBoundingBoxAscent/Descent는 최신 브라우저에서 지원
      if (
        typeof metrics.actualBoundingBoxAscent === 'number' &&
        typeof metrics.actualBoundingBoxDescent === 'number'
      ) {
        const result: FontMetrics = {
          ascent: metrics.actualBoundingBoxAscent,
          descent: metrics.actualBoundingBoxDescent,
          fontHeight: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
        };

        // 캐시 저장 (상한 초과 시 전체 clear)
        if (_fontMetricsCache.size >= MAX_FONT_METRICS_CACHE_SIZE) {
          _fontMetricsCache.clear();
        }
        _fontMetricsCache.set(cacheKey, result);

        return result;
      }
    } catch {
      // Canvas 측정 실패 시 근사값 폴백
    }
  }

  // SSR / Canvas 미지원 환경: fontSize 기반 근사값
  // 일반적인 라틴 폰트: ascent ≈ 0.8 * fontSize, descent ≈ 0.2 * fontSize
  const fallback: FontMetrics = {
    ascent: fontSize * 0.8,
    descent: fontSize * 0.2,
    fontHeight: fontSize,
  };

  // 근사값도 캐싱 (동일 환경에서 반복 계산 방지)
  if (_fontMetricsCache.size >= MAX_FONT_METRICS_CACHE_SIZE) {
    _fontMetricsCache.clear();
  }
  _fontMetricsCache.set(cacheKey, fallback);

  return fallback;
}

/**
 * 폰트 메트릭 캐시 초기화 (테스트용)
 */
export function resetFontMetricsCache(): void {
  _fontMetricsCache.clear();
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
