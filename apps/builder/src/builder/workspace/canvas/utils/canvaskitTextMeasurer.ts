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

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [style.fontFamily],
        fontStyle: {
          weight: typeof style.fontWeight === 'number'
            ? { value: style.fontWeight }
            : { value: 400 },
        },
      },
    });

    const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
    builder.addText(text);
    const paragraph = builder.build();
    // Layout with infinite width to get single-line measurement
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

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize: style.fontSize,
        fontFamilies: [style.fontFamily],
        fontStyle: {
          weight: typeof style.fontWeight === 'number'
            ? { value: style.fontWeight }
            : { value: 400 },
        },
        heightMultiplier: style.lineHeight ? style.lineHeight / style.fontSize : 1.2,
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
