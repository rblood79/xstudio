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
function resolveSlant(ck: any, fs?: number | string): unknown {
  if (fs === 1 || fs === 'italic') return ck.FontSlant.Italic;
  if (fs === 2 || fs === 'oblique') return ck.FontSlant.Oblique;
  return ck.FontSlant.Upright;
}

/** fontStretch → CanvasKit FontWidth enum */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveWidth(ck: any, stretch?: string): unknown {
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
    const fontFeatures = style.fontVariant ? resolveFontVariantFeatures(style.fontVariant) : [];
    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [style.fontFamily],
        fontStyle: {
          weight: typeof style.fontWeight === 'number'
            ? { value: style.fontWeight }
            : { value: 400 },
          slant: resolveSlant(ck, style.fontStyle),
          width: resolveWidth(ck, style.fontStretch),
        },
        letterSpacing: style.letterSpacing ?? 0,
        wordSpacing: style.wordSpacing ?? 0,
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
    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [style.fontFamily],
        fontStyle: {
          weight: typeof style.fontWeight === 'number'
            ? { value: style.fontWeight }
            : { value: 400 },
          slant: resolveSlant(ck, style.fontStyle),
          width: resolveWidth(ck, style.fontStretch),
        },
        letterSpacing: style.letterSpacing ?? 0,
        wordSpacing: style.wordSpacing ?? 0,
        heightMultiplier: style.lineHeight ? style.lineHeight / style.fontSize : 1.2,
        halfLeading: true,
        ...(fontFeatures.length > 0 ? { fontFeatures } : {}),
      },
    });

    const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(text);
    const paragraph = builder.build();
    paragraph.layout(maxWidth);

    const height = paragraph.getHeight();
    const width = paragraph.getMaxWidth();

    paragraph.delete();
    builder.delete();
    // ParagraphStyle is a plain JS object, no delete needed

    return { width, height };
  }
}
