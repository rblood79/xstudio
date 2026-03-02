/**
 * CanvasKit 기반 TextMeasurer 구현
 *
 * Canvas 2D API 대신 CanvasKit의 Paragraph API를 사용하여
 * 정확한 텍스트 측정을 수행합니다.
 *
 * @since 2026-02-17 Phase 0
 */

import type { TextMeasurer, TextMeasureStyle, TextMeasureResult } from './textMeasure';
import { getCanvasKit, isCanvasKitInitialized } from '../skia/initCanvasKit';
import { skiaFontManager } from '../skia/fontManager';
import { resolveFontVariantFeatures, resolveFontStretchWidth } from '../layout/engines/cssResolver';

// ============================================
// CanvasKit enum 매핑 헬퍼
// ============================================

/** fontStyle → CanvasKit FontSlant enum */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSlant(ck: any, fs?: number | string): any {
  if (fs === 1 || fs === 'italic') return ck.FontSlant.Italic;
  if (fs === 2 || fs === 'oblique') return ck.FontSlant.Oblique;
  return ck.FontSlant.Upright;
}

/** fontWeight → CanvasKit FontWeight enum (nodeRenderers.ts와 동일) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveWeight(ck: any, fw?: number | string): any {
  // CSS fontWeight 키워드 → 숫자: 'normal'→400, 'bold'→700
  const namedWeights: Record<string, number> = { normal: 400, bold: 700 };
  const w = typeof fw === 'number' ? fw : (namedWeights[String(fw).toLowerCase()] ?? (parseInt(String(fw), 10) || 400));
  const map: Record<number, any> = {
    100: ck.FontWeight.Thin,
    200: ck.FontWeight.ExtraLight,
    300: ck.FontWeight.Light,
    400: ck.FontWeight.Normal,
    500: ck.FontWeight.Medium,
    600: ck.FontWeight.SemiBold,
    700: ck.FontWeight.Bold,
    800: ck.FontWeight.ExtraBold,
    900: ck.FontWeight.Black,
  };
  return map[w] ?? ck.FontWeight.Normal;
}

/**
 * fontFamily CSS 문자열 → 첫 번째 폰트명 추출
 * TextSprite.tsx와 동일: fontFamily.split(',')[0].trim()
 * CSS fallback 체인 전체를 단일 폰트명으로 전달하면 CanvasKit이 매칭 실패
 */
function resolveFontFamily(family: string): string {
  return family.split(',')[0].trim();
}

/** fontStretch → CanvasKit FontWidth enum */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveWidth(ck: any, stretch?: string): any {
  if (!stretch || stretch === 'normal') return ck.FontWidth.Normal;
  const idx = resolveFontStretchWidth(stretch);
  const entries = [
    ck.FontWidth.UltraCondensed, ck.FontWidth.ExtraCondensed,
    ck.FontWidth.Condensed, ck.FontWidth.SemiCondensed,
    ck.FontWidth.Normal, ck.FontWidth.SemiExpanded,
    ck.FontWidth.Expanded, ck.FontWidth.ExtraExpanded,
    ck.FontWidth.UltraExpanded,
  ];
  return entries[idx - 1] ?? ck.FontWidth.Normal;
}

/**
 * CanvasKit Paragraph API 기반 텍스트 측정기
 *
 * CanvasKit의 ParagraphBuilder를 사용하여 HarfBuzz 정확도의
 * 텍스트 측정을 수행합니다.
 */
export class CanvasKitTextMeasurer implements TextMeasurer {
  measureWidth(text: string, style: TextMeasureStyle): number {
    if (!text || !isCanvasKitInitialized()) return text.length * (style.fontSize * 0.5);

    const ck = getCanvasKit();
    const fontMgr = skiaFontManager.getFontMgr();
    if (!ck || !fontMgr) return text.length * (style.fontSize * 0.5);

    // nodeRenderers.ts의 renderText()와 동일한 textStyle 구성
    // heightMultiplier / halfLeading도 렌더러와 일치시켜야
    // getMaxIntrinsicWidth()가 동일한 text shaping 결과를 반환
    const fontFeatures = style.fontVariant ? resolveFontVariantFeatures(style.fontVariant) : [];
    const fontFamily = resolveFontFamily(style.fontFamily);
    const heightMultiplier = style.lineHeight
      ? style.lineHeight / style.fontSize
      : 0;
    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [fontFamily],
        fontStyle: {
          weight: resolveWeight(ck, style.fontWeight),
          slant: resolveSlant(ck, style.fontStyle),
          width: resolveWidth(ck, style.fontStretch),
        },
        letterSpacing: style.letterSpacing ?? 0,
        wordSpacing: style.wordSpacing ?? 0,
        ...(heightMultiplier > 0 ? { heightMultiplier, halfLeading: true } : {}),
        ...(fontFeatures.length > 0 ? { fontFeatures } : {}),
      },
    });

    const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(text);
    const paragraph = builder.build();
    // 단일 라인 측정: 무한 너비로 layout
    paragraph.layout(1e6);
    const width = paragraph.getMaxIntrinsicWidth();

    paragraph.delete();
    builder.delete();
    // ParagraphStyle is a plain JS object, no delete needed

    return width;
  }

  measureWrapped(text: string, style: TextMeasureStyle, maxWidth: number): TextMeasureResult {
    const lineHeight = style.lineHeight ?? style.fontSize * 1.2;
    if (!text || maxWidth <= 0) return { width: 0, height: lineHeight };
    if (!isCanvasKitInitialized()) {
      // Fallback: rough estimate
      const charWidth = style.fontSize * 0.5;
      const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
      const lines = Math.ceil(text.length / charsPerLine);
      return { width: maxWidth, height: lines * lineHeight };
    }

    const ck = getCanvasKit();
    const fontMgr = skiaFontManager.getFontMgr();
    if (!ck || !fontMgr) {
      return { width: maxWidth, height: lineHeight };
    }

    // measureWidth와 동일한 textStyle + halfLeading (CSS line-height 상하 균등 분배)
    const fontFeatures = style.fontVariant ? resolveFontVariantFeatures(style.fontVariant) : [];
    const fontFamily = resolveFontFamily(style.fontFamily);
    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [fontFamily],
        fontStyle: {
          weight: resolveWeight(ck, style.fontWeight),
          slant: resolveSlant(ck, style.fontStyle),
          width: resolveWidth(ck, style.fontStretch),
        },
        letterSpacing: style.letterSpacing ?? 0,
        wordSpacing: style.wordSpacing ?? 0,
        ...(style.lineHeight ? { heightMultiplier: style.lineHeight / style.fontSize, halfLeading: true } : {}),
        ...(fontFeatures.length > 0 ? { fontFeatures } : {}),
      },
    });

    // ADR-008: word-break × overflow-wrap 조합 테이블 기반 에뮬레이션
    const wb = style.wordBreak ?? 'normal';
    const ow = style.overflowWrap ?? 'normal';

    // ADR-008: overflow-wrap: break-word/anywhere → CSS 동작 시뮬레이션
    // CanvasKit은 CSS break-word를 네이티브로 지원하지 않으므로
    // 단어 단위 줄바꿈을 직접 시뮬레이션한다.
    if ((ow === 'break-word' || ow === 'anywhere') && wb !== 'break-all') {
      return this.measureCSSBreakWord(ck, paraStyle, fontMgr, text, maxWidth, style.lineHeight);
    }

    // break-all: ZWS 삽입으로 모든 문자 사이에 줄바꿈 가능 지점 생성
    let processedText = text;
    if (wb === 'break-all') {
      processedText = Array.from(text).join('\u200B');
    }

    const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(processedText);
    const paragraph = builder.build();

    const effectiveMaxWidth = this.computeEffectiveMaxWidth(ck, paraStyle, fontMgr, text, maxWidth, wb, ow);
    paragraph.layout(effectiveMaxWidth);

    const height = paragraph.getHeight();
    const width = paragraph.getMaxWidth();

    paragraph.delete();
    builder.delete();

    return { width, height };
  }

  /**
   * ADR-008 조합 테이블 기반 effectiveMaxWidth 계산
   *
   * | word-break | overflow-wrap       | effectiveLayoutWidth                          |
   * |-----------|---------------------|-----------------------------------------------|
   * | normal    | normal              | max(maxWidth, ceil(maxWordWidth))              |
   * | normal    | break-word/anywhere | maxWidth (CanvasKit 기본 = break-word)          |
   * | break-all | (any)               | maxWidth (ZWS로 이미 분할 가능)                  |
   * | keep-all  | normal              | max(maxWidth, ceil(maxWordWidth_keepall))      |
   * | keep-all  | break-word          | 넘침 시 maxWidth, 아니면 keep-all               |
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private computeEffectiveMaxWidth(
    ck: any, paraStyle: any, fontMgr: any, text: string, maxWidth: number,
    wordBreak: string, overflowWrap: string,
  ): number {
    // break-all: ZWS 삽입으로 분할 완료 → maxWidth 그대로
    if (wordBreak === 'break-all') return maxWidth;

    // overflow-wrap: break-word/anywhere → CanvasKit 기본 동작 (= break-word)
    if (overflowWrap === 'break-word' || overflowWrap === 'anywhere') {
      if (wordBreak === 'keep-all') {
        // keep-all + break-word: CJK 단어 넘침 시에만 분할 허용
        return this.cssKeepAllBreakMaxWidth(ck, paraStyle, fontMgr, text, maxWidth, true);
      }
      return maxWidth;
    }

    // keep-all + normal: CJK 연속도 단어로 취급, 넘침 허용
    if (wordBreak === 'keep-all') {
      return this.cssKeepAllBreakMaxWidth(ck, paraStyle, fontMgr, text, maxWidth, false);
    }

    // normal + normal: 기존 로직 (단어 보호)
    return this.cssNormalBreakMaxWidth(ck, paraStyle, fontMgr, text, maxWidth);
  }

  /**
   * CSS word-break: normal 에뮬레이션을 위한 유효 최대 너비 계산
   *
   * 텍스트를 공백으로 분리하여 각 단어의 너비를 측정하고,
   * 가장 넓은 단어의 너비와 maxWidth 중 큰 값을 반환한다.
   * 이를 통해 CanvasKit이 단어 내부에서 줄바꿈하는 것을 방지한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cssNormalBreakMaxWidth(ck: any, paraStyle: any, fontMgr: any, text: string, maxWidth: number): number {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return maxWidth;

    let maxWordWidth = 0;
    for (const word of words) {
      const b = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
      b.addText(word);
      const p = b.build();
      p.layout(1e6);
      const ww = p.getMaxIntrinsicWidth();
      p.delete();
      b.delete();
      if (ww > maxWordWidth) maxWordWidth = ww;
    }
    // 부동소수점 정밀도 이슈 방지: getMaxIntrinsicWidth()와 layout() 사이의
    // 미세한 차이로 인해 동일 너비에서도 줄바꿈이 발생할 수 있으므로 ceil 적용
    return Math.max(maxWidth, Math.ceil(maxWordWidth));
  }

  /**
   * CSS word-break: keep-all 에뮬레이션
   *
   * keep-all: CJK 연속 문자열을 하나의 "단어"로 취급하여
   * 공백에서만 분할한다 (CJK 문자 사이 분할 금지).
   * 실질적으로 cssNormalBreakMaxWidth와 동일 로직이지만
   * 의미적으로 분리하여 향후 CJK 특화 최적화 가능.
   *
   * @param allowOverflowBreak - true면 단어가 maxWidth 초과 시 CanvasKit 기본 분할 허용
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cssKeepAllBreakMaxWidth(
    ck: any, paraStyle: any, fontMgr: any, text: string, maxWidth: number,
    allowOverflowBreak: boolean,
  ): number {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return maxWidth;

    let maxWordWidth = 0;
    for (const word of words) {
      const b = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
      b.addText(word);
      const p = b.build();
      p.layout(1e6);
      const ww = p.getMaxIntrinsicWidth();
      p.delete();
      b.delete();
      if (ww > maxWordWidth) maxWordWidth = ww;
    }

    if (allowOverflowBreak) {
      // keep-all + break-word: 넘침 시 CanvasKit 기본 분할 허용
      return maxWordWidth > maxWidth ? maxWidth : Math.max(maxWidth, Math.ceil(maxWordWidth));
    }
    // keep-all + normal: 넘침 허용 (단어 보호)
    return Math.max(maxWidth, Math.ceil(maxWordWidth));
  }

  /**
   * CSS overflow-wrap: break-word 에뮬레이션
   *
   * CSS break-word 알고리즘:
   * 1. 단어가 현재 줄에 안 맞고 줄에 이미 내용이 있으면 → 새 줄로 이동
   * 2. 새 줄에서도 단어가 maxWidth를 초과하면 → 문자 단위로 분할
   *
   * CanvasKit은 이 동작을 지원하지 않으므로 단어 단위로 직접 시뮬레이션한다.
   *
   * @param explicitLineHeight - 사용자 지정 lineHeight (undefined면 CanvasKit 폰트 메트릭 사용)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private measureCSSBreakWord(
    ck: any, paraStyle: any, fontMgr: any,
    text: string, maxWidth: number, explicitLineHeight?: number,
  ): TextMeasureResult {
    // lineHeight 결정: 명시적 값이 없으면 CanvasKit 폰트 메트릭 기반 측정
    // CSS line-height: normal과 동일한 값을 사용해야 Preview와 일치
    let lineHeight: number;
    if (explicitLineHeight) {
      lineHeight = explicitLineHeight;
    } else {
      const slb = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
      slb.addText('Mg');
      const slp = slb.build();
      slp.layout(1e6);
      lineHeight = slp.getHeight();
      slp.delete();
      slb.delete();
    }

    const tokens = text.split(/(\s+)/);
    let currentLineWidth = 0;
    let lineCount = 1;
    let maxLineWidth = 0;

    for (const token of tokens) {
      if (!token) continue;

      if (/^\s+$/.test(token)) {
        const spaceWidth = this.measureTokenWidth(ck, paraStyle, fontMgr, token);
        currentLineWidth += spaceWidth;
        continue;
      }

      const wordWidth = this.measureTokenWidth(ck, paraStyle, fontMgr, token);

      if (currentLineWidth + wordWidth <= maxWidth) {
        // 현재 줄에 들어감
        currentLineWidth += wordWidth;
      } else if (currentLineWidth < 0.5) {
        // 빈 줄 시작 — 단어가 maxWidth 이하면 그대로, 초과하면 문자 분할
        if (wordWidth <= maxWidth) {
          currentLineWidth = wordWidth;
        } else {
          const br = this.measureWordCharBreaking(ck, paraStyle, fontMgr, token, maxWidth);
          lineCount += br.lines - 1;
          currentLineWidth = br.lastLineWidth;
        }
      } else {
        // 현재 줄에 안 맞음 → 새 줄로 이동
        if (currentLineWidth > maxLineWidth) maxLineWidth = currentLineWidth;
        lineCount++;
        currentLineWidth = 0;

        if (wordWidth <= maxWidth) {
          currentLineWidth = wordWidth;
        } else {
          // 새 줄에서도 maxWidth 초과 → 문자 단위 분할
          const br = this.measureWordCharBreaking(ck, paraStyle, fontMgr, token, maxWidth);
          lineCount += br.lines - 1;
          currentLineWidth = br.lastLineWidth;
        }
      }

      if (currentLineWidth > maxLineWidth) maxLineWidth = currentLineWidth;
    }

    return {
      width: Math.min(maxLineWidth || maxWidth, maxWidth),
      height: lineCount * lineHeight,
    };
  }

  /**
   * 단어를 문자 단위로 분할했을 때의 줄 수와 마지막 줄 폭 계산
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private measureWordCharBreaking(
    ck: any, paraStyle: any, fontMgr: any,
    word: string, maxWidth: number,
  ): { lines: number; lastLineWidth: number } {
    const chars = Array.from(word);
    let currentLineWidth = 0;
    let lines = 1;

    for (const ch of chars) {
      const chWidth = this.measureTokenWidth(ck, paraStyle, fontMgr, ch);
      if (currentLineWidth + chWidth > maxWidth && currentLineWidth > 0) {
        lines++;
        currentLineWidth = chWidth;
      } else {
        currentLineWidth += chWidth;
      }
    }

    return { lines, lastLineWidth: currentLineWidth };
  }

  /** 토큰(단어/공백/문자) 폭 측정 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private measureTokenWidth(ck: any, paraStyle: any, fontMgr: any, token: string): number {
    const b = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
    b.addText(token);
    const p = b.build();
    p.layout(1e6);
    const w = p.getMaxIntrinsicWidth();
    p.delete();
    b.delete();
    return w;
  }
}
