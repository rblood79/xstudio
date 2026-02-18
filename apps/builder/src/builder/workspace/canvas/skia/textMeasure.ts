/**
 * CanvasKit ParagraphBuilder 기반 텍스트 측정
 *
 * CanvasKit의 Paragraph API를 사용하여 텍스트 메트릭스를 계산한다.
 * Yoga measureFunc에 연결하여 레이아웃 엔진과 텍스트 측정을 일치시킨다.
 *
 * ⚠️ getMaxWidth()는 layout()에 전달한 maxWidth를 반환하므로,
 *    실제 콘텐츠 폭은 반드시 getLongestLine()을 사용해야 한다.
 *
 * @see docs/WASM.md §5.8 텍스트 측정
 */

import type { CanvasKit, FontMgr, EmbindEnumEntity } from 'canvaskit-wasm';

export interface SkiaTextStyle {
  fontFamilies: string[];
  fontSize: number;
  fontWeight?: EmbindEnumEntity;
  fontSlant?: EmbindEnumEntity;
  letterSpacing?: number;
  wordSpacing?: number;
  color?: Float32Array;
}

export interface TextMeasureResult {
  /** 가장 긴 줄의 실제 폭 (px) */
  width: number;
  /** 전체 텍스트 높이 (px) */
  height: number;
  /** 줄 수 */
  lineCount: number;
}

/**
 * CanvasKit Paragraph를 생성하여 텍스트를 측정한다.
 *
 * @param ck - CanvasKit 인스턴스
 * @param fontMgr - 폰트 매니저
 * @param text - 측정할 텍스트
 * @param style - 텍스트 스타일
 * @param maxWidth - 최대 너비 (줄바꿈 기준)
 * @param textAlign - 텍스트 정렬 (CanvasKit.TextAlign enum)
 */
export function measureText(
  ck: CanvasKit,
  fontMgr: FontMgr,
  text: string,
  style: SkiaTextStyle,
  maxWidth: number,
  textAlign?: EmbindEnumEntity,
): TextMeasureResult {
  const paraStyle = new ck.ParagraphStyle({
    textStyle: {
      fontFamilies: style.fontFamilies,
      fontSize: style.fontSize,
      fontStyle: {
        weight: style.fontWeight ?? ck.FontWeight.Normal,
        slant: style.fontSlant ?? ck.FontSlant.Upright,
      },
      letterSpacing: style.letterSpacing ?? 0,
      wordSpacing: style.wordSpacing ?? 0,
      color: style.color ?? ck.Color4f(0, 0, 0, 1),
    },
    textAlign: textAlign ?? ck.TextAlign.Left,
  });

  const builder = ck.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.addText(text);
  const paragraph = builder.build();

  paragraph.layout(maxWidth);

  const result: TextMeasureResult = {
    // ⚠️ getMaxWidth()는 layout에 전달한 값을 반환 — 사용 금지
    width: paragraph.getLongestLine(),
    height: paragraph.getHeight(),
    lineCount: paragraph.getLineMetrics().length,
  };

  paragraph.delete();
  builder.delete();

  return result;
}

/**
 * 텍스트 측정 함수를 반환한다.
 *
 * 레이아웃 엔진이 텍스트 노드의 크기를 요청할 때마다 이 함수가 호출된다.
 */
export function createTextMeasureFunc(
  ck: CanvasKit,
  fontMgr: FontMgr,
  text: string,
  style: SkiaTextStyle,
  textAlign?: EmbindEnumEntity,
): (width: number) => { width: number; height: number } {
  return (width: number) => {
    const result = measureText(ck, fontMgr, text, style, width, textAlign);
    return { width: result.width, height: result.height };
  };
}
