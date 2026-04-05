import type {
  CanvasKit,
  Canvas,
  FontMgr,
  Paragraph,
  EmbindEnumEntity,
} from "canvaskit-wasm";
import {
  resolveFontVariantFeatures,
  resolveFontStretchWidth,
  DEFAULT_FONT_FEATURES,
} from "../layout/engines/cssResolver";
import {
  cssNormalBreakProcess,
  computeKeepAllWidth,
  preprocessBreakWordText,
} from "../utils/textWrapUtils";
import {
  USE_CANVAS2D_MEASURE,
  needsFallback,
  measureWithCanvas2D,
} from "../utils/canvas2dSegmentCache";
import type { TextMeasureStyle } from "../utils/textMeasure";
import { SkiaDisposable } from "./disposable";
import { skiaFontManager } from "./fontManager";
import {
  getLastParagraphFontMgr,
  getMaxParagraphCacheSize,
  setLastParagraphFontMgr,
} from "./nodeRendererState";
import type { SkiaNodeData } from "./nodeRendererTypes";

const paragraphCache = new Map<string, Paragraph>();
const paragraphAlignOffsetCache = new Map<string, number>();

function clearParagraphCache(): void {
  for (const paragraph of paragraphCache.values()) {
    paragraph.delete();
  }
  paragraphCache.clear();
  paragraphAlignOffsetCache.clear();
}

export function clearTextParagraphCache(): void {
  clearParagraphCache();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearParagraphCache();
  });
}

function getCachedParagraph(key: string): Paragraph | undefined {
  const cached = paragraphCache.get(key);
  if (!cached) return undefined;
  paragraphCache.delete(key);
  paragraphCache.set(key, cached);
  return cached;
}

function setCachedParagraph(key: string, paragraph: Paragraph): void {
  const existing = paragraphCache.get(key);
  if (existing) {
    existing.delete();
    paragraphCache.delete(key);
  }

  paragraphCache.set(key, paragraph);
  if (paragraphCache.size <= getMaxParagraphCacheSize()) return;

  const oldestKey = paragraphCache.keys().next().value as string | undefined;
  if (!oldestKey) return;
  const oldest = paragraphCache.get(oldestKey);
  oldest?.delete();
  paragraphCache.delete(oldestKey);
}

export function renderText(
  ck: CanvasKit,
  canvas: Canvas,
  node: SkiaNodeData,
  fontMgr: FontMgr,
): void {
  if (!node.text) return;

  if (getLastParagraphFontMgr() !== fontMgr) {
    clearParagraphCache();
    setLastParagraphFontMgr(fontMgr);
  }

  const whiteSpace = node.text.whiteSpace ?? "normal";
  let processedText = node.text.content;
  if (whiteSpace === "normal" || whiteSpace === "pre-line") {
    processedText = processedText.replace(/[ \t]+/g, " ");
  }

  const layoutMaxWidth =
    whiteSpace === "nowrap" || whiteSpace === "pre"
      ? 100000
      : node.text.maxWidth;

  const wordBreak = node.text.wordBreak ?? "normal";
  const overflowWrap = node.text.overflowWrap ?? "normal";

  const color = node.text.color;
  const colorKey = `${color[0].toFixed(3)},${color[1].toFixed(3)},${color[2].toFixed(3)},${color[3].toFixed(3)}`;
  const heightMultiplier = node.text.lineHeight
    ? node.text.lineHeight / node.text.fontSize
    : 0;
  const textIndent = node.text.textIndent ?? 0;
  const isEllipsis =
    node.text.textOverflow === "ellipsis" &&
    whiteSpace === "nowrap" &&
    !!node.text.clipText;
  const dc = node.text.decorationColor;
  const decorationColorKey = dc
    ? `${dc[0].toFixed(3)},${dc[1].toFixed(3)},${dc[2].toFixed(3)},${dc[3].toFixed(3)}`
    : "";
  const key = [
    processedText,
    layoutMaxWidth,
    node.text.fontFamilies.join("|"),
    node.text.fontSize,
    node.text.fontWeight ?? 400,
    node.text.fontStyle ?? 0,
    node.text.fontVariant ?? "normal",
    node.text.fontStretch ?? "normal",
    node.text.letterSpacing ?? 0,
    node.text.wordSpacing ?? 0,
    heightMultiplier,
    typeof node.text.align === "string" ? node.text.align : "enum",
    node.text.decoration ?? 0,
    node.text.decorationStyle ?? "solid",
    decorationColorKey,
    colorKey,
    whiteSpace,
    wordBreak,
    overflowWrap,
    isEllipsis ? node.text.maxWidth : "0",
    textIndent,
  ].join("\u0000");

  const computeDrawY = (paragraph: Paragraph): number => {
    const verticalAlign = node.text!.verticalAlign;
    if (
      !verticalAlign ||
      verticalAlign === "top" ||
      verticalAlign === "baseline"
    ) {
      return node.text!.paddingTop;
    }
    const textHeight = paragraph.getHeight();
    switch (verticalAlign) {
      case "middle":
        return (node.height - textHeight) / 2;
      case "bottom":
        return node.height - textHeight;
      default:
        return node.text!.paddingTop;
    }
  };

  const cached = getCachedParagraph(key);
  if (cached) {
    const drawY = computeDrawY(cached);
    const cachedOffset = paragraphAlignOffsetCache.get(key) ?? 0;
    canvas.drawParagraph(
      cached,
      node.text.paddingLeft + textIndent + cachedOffset,
      drawY,
    );
    return;
  }

  const scope = new SkiaDisposable();
  try {
    let textAlign: EmbindEnumEntity;
    const rawAlign = node.text.align;
    if (typeof rawAlign === "string") {
      const alignMap: Record<string, EmbindEnumEntity> = {
        left: ck.TextAlign.Left,
        center: ck.TextAlign.Center,
        right: ck.TextAlign.Right,
      };
      textAlign = alignMap[rawAlign] ?? ck.TextAlign.Left;
    } else {
      textAlign = rawAlign ?? ck.TextAlign.Left;
    }

    const fontWeightMap: Record<number, EmbindEnumEntity> = {
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
    const fontWeight =
      fontWeightMap[node.text.fontWeight ?? 400] ?? ck.FontWeight.Normal;

    const fontSlantMap: Record<number, EmbindEnumEntity> = {
      0: ck.FontSlant.Upright,
      1: ck.FontSlant.Italic,
      2: ck.FontSlant.Oblique,
    };
    const fontSlant =
      fontSlantMap[node.text.fontStyle ?? 0] ?? ck.FontSlant.Upright;

    const fontStretchStr = node.text.fontStretch ?? "normal";
    const fontWidthIndex = resolveFontStretchWidth(fontStretchStr);
    const fontWidthEnumValues = ck.FontWidth;
    const fontWidthEntries: [string, EmbindEnumEntity][] = [
      ["UltraCondensed", fontWidthEnumValues.UltraCondensed],
      ["ExtraCondensed", fontWidthEnumValues.ExtraCondensed],
      ["Condensed", fontWidthEnumValues.Condensed],
      ["SemiCondensed", fontWidthEnumValues.SemiCondensed],
      ["Normal", fontWidthEnumValues.Normal],
      ["SemiExpanded", fontWidthEnumValues.SemiExpanded],
      ["Expanded", fontWidthEnumValues.Expanded],
      ["ExtraExpanded", fontWidthEnumValues.ExtraExpanded],
      ["UltraExpanded", fontWidthEnumValues.UltraExpanded],
    ];
    const fontWidth =
      fontWidthEntries[fontWidthIndex - 1]?.[1] ?? fontWidthEnumValues.Normal;

    const fontVariantStr = node.text.fontVariant ?? "normal";
    const variantFeatures = resolveFontVariantFeatures(fontVariantStr);
    const fontFeatureTags = [...DEFAULT_FONT_FEATURES, ...variantFeatures];

    const heightMultiplierOpt =
      heightMultiplier > 0 ? heightMultiplier : undefined;

    const resolvedFamilies = node.text.fontFamilies.map((f) =>
      skiaFontManager.resolveFamily(f),
    );

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontFamilies: resolvedFamilies,
        fontSize: node.text.fontSize,
        fontStyle: { weight: fontWeight, slant: fontSlant, width: fontWidth },
        color: node.text.color,
        letterSpacing: node.text.letterSpacing ?? 0,
        wordSpacing: node.text.wordSpacing ?? 0,
        ...(heightMultiplierOpt !== undefined
          ? { heightMultiplier: heightMultiplierOpt, halfLeading: true }
          : {}),
        ...(fontFeatureTags.length > 0
          ? { fontFeatures: fontFeatureTags }
          : {}),
        ...(node.text.decoration
          ? {
              decoration: node.text.decoration,
              decorationColor: node.text.decorationColor ?? node.text.color,
              decorationThickness: 1,
              ...(() => {
                if (
                  !node.text!.decorationStyle ||
                  node.text!.decorationStyle === "solid"
                ) {
                  return {};
                }
                const ckDs = (
                  ck as unknown as Record<
                    string,
                    Record<string, EmbindEnumEntity>
                  >
                ).DecorationStyle;
                if (!ckDs) return {};
                const styleMap: Record<string, EmbindEnumEntity | undefined> = {
                  dashed: ckDs.Dashed,
                  dotted: ckDs.Dotted,
                  double: ckDs.Double,
                  wavy: ckDs.Wavy,
                };
                const resolved = styleMap[node.text!.decorationStyle];
                return resolved ? { decorationStyle: resolved } : {};
              })(),
            }
          : {}),
      },
      textAlign,
      ...(heightMultiplierOpt !== undefined
        ? {
            strutStyle: {
              strutEnabled: true,
              fontFamilies: resolvedFamilies,
              fontSize: node.text.fontSize,
              heightMultiplier: heightMultiplierOpt,
              halfLeading: true,
              forceStrutHeight: true,
            },
          }
        : {}),
      ...(isEllipsis ? { maxLines: 1, ellipsis: "\u2026" } : {}),
    });

    let renderableText = processedText;
    let effectiveLayoutWidth = isEllipsis ? node.text.maxWidth : layoutMaxWidth;

    if (!isEllipsis && layoutMaxWidth < 100000) {
      // ADR-051: Canvas 2D Break Hint Injection
      // Canvas 2D가 결정한 줄바꿈을 \n으로 삽입하여 CanvasKit 렌더링에 강제.
      // 측정(Canvas 2D)과 렌더링(CanvasKit)의 줄바꿈 일치를 구조적으로 보장.
      const c2dStyle: TextMeasureStyle = {
        fontSize: node.text.fontSize,
        fontFamily: node.text.fontFamilies.join(", "),
        fontWeight: node.text.fontWeight,
        fontStyle: node.text.fontStyle,
        fontVariant: node.text.fontVariant,
        fontStretch: node.text.fontStretch,
        letterSpacing: node.text.letterSpacing,
        wordSpacing: node.text.wordSpacing,
        lineHeight: node.text.lineHeight,
        wordBreak,
        overflowWrap,
        whiteSpace,
      };

      if (USE_CANVAS2D_MEASURE && !needsFallback(c2dStyle)) {
        const c2dResult = measureWithCanvas2D(
          processedText,
          c2dStyle,
          layoutMaxWidth,
        );
        renderableText = c2dResult.hintedText;
        // Canvas 2D 줄바꿈 결정 기반 effectiveWidth:
        // +1: Canvas 2D↔CanvasKit sub-pixel 차이로 인한 오발 줄바꿈 방지
        // layout 보정(+2/+4px) 대신 렌더링에서만 1px 마진 적용 → CSS 정합 유지
        effectiveLayoutWidth = Math.max(
          layoutMaxWidth,
          Math.ceil(c2dResult.width) + 1,
        );
      } else if (wordBreak === "normal" && overflowWrap === "normal") {
        const result = cssNormalBreakProcess(
          ck,
          paraStyle,
          fontMgr,
          processedText,
          layoutMaxWidth,
        );
        renderableText = result.text;
        effectiveLayoutWidth = result.effectiveWidth;
      } else if (wordBreak === "break-all") {
        renderableText = Array.from(processedText).join("\u200B");
        effectiveLayoutWidth = layoutMaxWidth;
      } else if (overflowWrap === "break-word" || overflowWrap === "anywhere") {
        if (wordBreak === "keep-all") {
          effectiveLayoutWidth = computeKeepAllWidth(
            ck,
            paraStyle,
            fontMgr,
            processedText,
            layoutMaxWidth,
            true,
          );
        } else {
          renderableText = preprocessBreakWordText(
            ck,
            paraStyle,
            fontMgr,
            processedText,
            layoutMaxWidth,
          );
          effectiveLayoutWidth = layoutMaxWidth;
        }
      } else if (wordBreak === "keep-all") {
        effectiveLayoutWidth = computeKeepAllWidth(
          ck,
          paraStyle,
          fontMgr,
          processedText,
          layoutMaxWidth,
          false,
        );
      }
    }

    const builder = scope.track(ck.ParagraphBuilder.Make(paraStyle, fontMgr));
    builder.addText(renderableText);
    const paragraph = builder.build();
    paragraph.layout(effectiveLayoutWidth);

    if (!isEllipsis && (whiteSpace === "nowrap" || whiteSpace === "pre")) {
      const intrinsicWidth = paragraph.getMaxIntrinsicWidth();
      if (intrinsicWidth > 0) {
        paragraph.layout(Math.ceil(intrinsicWidth) + 1);
      }
    }

    if (!isEllipsis && whiteSpace !== "nowrap" && whiteSpace !== "pre") {
      const lineMetrics = paragraph.getLineMetrics();
      if (lineMetrics.length > 1) {
        const maxIntrinsic = paragraph.getMaxIntrinsicWidth();
        const dprEpsilon =
          1 / (typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1);
        if (maxIntrinsic <= effectiveLayoutWidth + dprEpsilon) {
          paragraph.layout(Math.ceil(maxIntrinsic) + 1);
        }
      }
    }

    let alignOffset = 0;
    if (effectiveLayoutWidth > layoutMaxWidth && layoutMaxWidth < 100000) {
      const widthDiff = effectiveLayoutWidth - layoutMaxWidth;
      if (textAlign === ck.TextAlign.Center) {
        alignOffset = -widthDiff / 2;
      } else if (textAlign === ck.TextAlign.Right) {
        alignOffset = -widthDiff;
      }
    }

    setCachedParagraph(key, paragraph);
    if (alignOffset !== 0) paragraphAlignOffsetCache.set(key, alignOffset);
    const drawY = computeDrawY(paragraph);

    const shouldClip = node.text.clipText && !isEllipsis;
    if (shouldClip) {
      canvas.save();
      canvas.clipRect(
        ck.XYWHRect(0, 0, node.width, node.height),
        ck.ClipOp.Intersect,
        true,
      );
    }

    canvas.drawParagraph(
      paragraph,
      node.text.paddingLeft + textIndent + alignOffset,
      drawY,
    );

    if (shouldClip) {
      canvas.restore();
    }
  } finally {
    scope.dispose();
  }
}
