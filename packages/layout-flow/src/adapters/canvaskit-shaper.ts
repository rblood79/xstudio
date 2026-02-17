/**
 * CanvasKit 기반 TextShaper 구현
 *
 * dropflow의 HarfBuzz 의존을 CanvasKit Paragraph/SkFont API로 대체한다.
 * ENGINE.md 전략 D의 핵심 어댑터.
 *
 * == 전략 ==
 * CanvasKit의 SkFont.getGlyphIDs()는 단순 cmap lookup이므로
 * GSUB/GPOS (합자, 커닝)가 반영되지 않는다.
 * 따라서 Paragraph API를 경유하여 정확한 advance를 구한다:
 *   1) ParagraphBuilder로 단일 run Paragraph를 빌드
 *   2) paragraph.getRectsForRange()로 각 클러스터의 사각형 획득
 *   3) 사각형 간격에서 advance를 추출
 *
 * == 필요한 CanvasKit API ==
 * - ParagraphBuilder.Make / addText / build
 * - Paragraph.layout / getRectsForRange / getLineMetrics / getLongestLine
 * - CanvasKit.Font (SkFont): getMetrics, getGlyphIDs, getGlyphWidths
 * - FontMgr.FromData
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * @see docs/ENGINE.md §4, §7
 */

import type {
  TextShaper,
  FontFaceInfo,
  FontMetrics,
  ShapingAttrs,
} from './shaper-interface.js';
import { G_ID, G_CL, G_AX, G_AY, G_DX, G_DY, G_FL, G_SZ } from './shaper-interface.js';
import type { AllocatedUint16Array } from '../types.js';

// ---------------------------------------------------------------------------
// CanvasKit type imports (duck-typed to avoid hard dep on canvaskit-wasm)
// ---------------------------------------------------------------------------

/**
 * CanvasKit에서 사용하는 최소한의 타입 정의.
 * canvaskit-wasm 패키지의 전체 타입을 가져오지 않고,
 * layout-flow 패키지의 의존성을 최소화한다.
 */

interface CKTypeface {
  /** CanvasKit 네이티브 리소스 해제 */
  delete(): void;
}

interface CKFontMetrics {
  ascent?: number;
  descent?: number;
  leading?: number;
}

interface CKFont {
  getMetrics(): CKFontMetrics;
  getGlyphIDs(text: string): Uint16Array;
  getGlyphWidths(glyphIds: Uint16Array): Float32Array;
  delete(): void;
}

interface CKLineMetrics {
  startIndex: number;
  endIndex: number;
  endExcludingWhitespaces: number;
  endIncludingNewline: number;
  isHardBreak: boolean;
  ascent: number;
  descent: number;
  height: number;
  width: number;
  left: number;
  baseline: number;
  lineNumber: number;
}

interface CKRectWithDirection {
  rect: Float32Array; // [left, top, right, bottom]
  dir: number; // 0=LTR, 1=RTL
}

interface CKParagraph {
  layout(maxWidth: number): void;
  getLongestLine(): number;
  getHeight(): number;
  getLineMetrics(): CKLineMetrics[];
  getRectsForRange(
    start: number,
    end: number,
    hStyle: unknown,
    wStyle: unknown,
  ): CKRectWithDirection[];
  getGlyphPositionAtCoordinate(x: number, y: number): { pos: number; affinity: number };
  delete(): void;
}

interface CKParagraphBuilder {
  addText(text: string): void;
  build(): CKParagraph;
  delete(): void;
}

interface CKParagraphStyle {
  // opaque
}

interface CKFontMgr {
  delete(): void;
}

/** EmbindEnumEntity의 duck type */
interface CKEnumValue {
  value: number;
}

/** CanvasKit의 최소 인터페이스 */
export interface CanvasKitMinimal {
  ParagraphBuilder: {
    Make(style: CKParagraphStyle, fontMgr: CKFontMgr): CKParagraphBuilder;
  };
  ParagraphStyle: new (init: Record<string, unknown>) => CKParagraphStyle;
  Font: new (typeface: CKTypeface, size: number) => CKFont;
  FontWeight: Record<string, CKEnumValue>;
  FontSlant: Record<string, CKEnumValue>;
  TextAlign: Record<string, CKEnumValue>;
  RectHeightStyle: Record<string, CKEnumValue>;
  RectWidthStyle: Record<string, CKEnumValue>;
  Color4f(r: number, g: number, b: number, a: number): Float32Array;
}

// ---------------------------------------------------------------------------
// Complex scripts set (spaces may participate in shaping)
// ---------------------------------------------------------------------------

const COMPLEX_SCRIPTS = new Set([
  'Arab', // Arabic
  'Deva', // Devanagari
  'Beng', // Bengali
  'Thai', // Thai
  'Khmr', // Khmer
  'Mymr', // Myanmar
  'Tibt', // Tibetan
  'Guru', // Gurmukhi
  'Gujr', // Gujarati
  'Orya', // Oriya
  'Taml', // Tamil
  'Telu', // Telugu
  'Knda', // Kannada
  'Mlym', // Malayalam
  'Sinh', // Sinhala
]);

// ---------------------------------------------------------------------------
// CanvasKitFontFace
// ---------------------------------------------------------------------------

export class CanvasKitFontFace implements FontFaceInfo {
  readonly url: string;
  readonly upem: number;
  private readonly _typeface: CKTypeface;

  constructor(typeface: CKTypeface, url: string, upem: number = 1000) {
    this._typeface = typeface;
    this.url = url;
    this.upem = upem;
  }

  spaceMayParticipateInShaping(script: string): boolean {
    return COMPLEX_SCRIPTS.has(script);
  }

  getTypeface(): CKTypeface {
    return this._typeface;
  }
}

// ---------------------------------------------------------------------------
// CanvasKitShaper
// ---------------------------------------------------------------------------

export class CanvasKitShaper implements TextShaper {
  private readonly ck: CanvasKitMinimal;
  private readonly fontMgr: CKFontMgr;

  /** (url:size) -> CKFont 캐시 */
  private readonly fontCache = new Map<string, CKFont>();

  /** url -> CanvasKitFontFace 매핑 */
  private readonly registeredFaces = new Map<string, CanvasKitFontFace>();

  /** font family -> url[] 매핑 (getFontCascade용) */
  private readonly familyToUrls = new Map<string, string[]>();

  constructor(ck: CanvasKitMinimal, fontMgr: CKFontMgr) {
    this.ck = ck;
    this.fontMgr = fontMgr;
  }

  // -------------------------------------------------------------------------
  // Font registration
  // -------------------------------------------------------------------------

  /**
   * 폰트 페이스를 등록한다.
   * 반드시 shape() 호출 전에 등록해야 한다.
   */
  registerFace(
    typeface: CKTypeface,
    url: string,
    families: string[],
    upem: number = 1000,
  ): CanvasKitFontFace {
    const face = new CanvasKitFontFace(typeface, url, upem);
    this.registeredFaces.set(url, face);

    for (const family of families) {
      const existing = this.familyToUrls.get(family);
      if (existing) {
        existing.push(url);
      } else {
        this.familyToUrls.set(family, [url]);
      }
    }

    return face;
  }

  // -------------------------------------------------------------------------
  // TextShaper.shape()
  // -------------------------------------------------------------------------

  /**
   * Paragraph API를 경유한 텍스트 shaping.
   *
   * 반환 형식: Int32Array with stride G_SZ (7):
   * [glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset, flags, ...]
   *
   * advance는 font units (upem 기반)로 반환된다.
   */
  shape(
    text: string,
    _buffer: AllocatedUint16Array,
    offset: number,
    length: number,
    face: FontFaceInfo,
    _script: string,
    _lang: string,
    direction: 'ltr' | 'rtl',
  ): Int32Array {
    const ckFace = face as CanvasKitFontFace;
    const substr = text.slice(offset, offset + length);

    if (substr.length === 0) {
      return new Int32Array(0);
    }

    const upem = ckFace.upem;
    // Paragraph를 fontSize=upem 으로 빌드하여 advance를 font units로 직접 획득
    const fontSize = upem;

    // 1) SkFont으로 글리프 ID 획득
    const font = this.getOrCreateFont(ckFace, fontSize);
    const glyphIds = font.getGlyphIDs(substr);

    // 2) Paragraph를 빌드하여 각 클러스터의 정확한 advance 계산
    const advances = this.measureAdvancesViaParagraph(
      substr,
      ckFace,
      fontSize,
      direction,
    );

    // 3) glyph 배열 구성
    // UTF-16 code unit 단위로 클러스터를 매핑
    const numGlyphs = glyphIds.length;
    const result = new Int32Array(numGlyphs * G_SZ);

    for (let i = 0; i < numGlyphs; i++) {
      const base = i * G_SZ;
      result[base + G_ID] = glyphIds[i];
      // cluster: UTF-16 offset (paragraph text 기준)
      result[base + G_CL] = offset + i;
      // x advance in font units
      result[base + G_AX] = i < advances.length ? Math.round(advances[i]) : 0;
      result[base + G_AY] = 0;
      result[base + G_DX] = 0;
      result[base + G_DY] = 0;
      result[base + G_FL] = 0;
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // TextShaper.getFontMetrics()
  // -------------------------------------------------------------------------

  getFontMetrics(face: FontFaceInfo, _direction: 'ltr' | 'rtl'): FontMetrics {
    const ckFace = face as CanvasKitFontFace;
    const upem = ckFace.upem;

    // fontSize=upem으로 SkFont를 생성하면 getMetrics()가 font units에 근사
    const font = this.getOrCreateFont(ckFace, upem);
    const metrics = font.getMetrics();

    // CanvasKit: ascent는 음수, descent는 양수
    // dropflow: ascender는 양수, descender는 음수
    const ascender = Math.abs(metrics.ascent ?? 0);
    const descender = -(metrics.descent ?? 0);
    const lineGap = metrics.leading ?? 0;

    // xHeight 근사: 'x' 글리프 advance를 측정
    // 더 정확한 방법은 'x' 글리프의 바운딩 박스 높이이지만,
    // CanvasKit에서 직접 제공하지 않으므로 ascender의 비율로 근사한다.
    // 일반적으로 xHeight ≈ ascender * 0.48 ~ 0.53
    const xHeight = Math.round(ascender * 0.52);

    return { ascender, descender, lineGap, xHeight };
  }

  // -------------------------------------------------------------------------
  // TextShaper.allocateBuffer()
  // -------------------------------------------------------------------------

  allocateBuffer(length: number): AllocatedUint16Array {
    return {
      array: new Uint16Array(length),
      destroy(): void {
        // JS GC 처리. HarfBuzz WASM 힙 해제와의 호환을 위한 no-op.
      },
    };
  }

  // -------------------------------------------------------------------------
  // TextShaper.getFontCascade()
  // -------------------------------------------------------------------------

  getFontCascade(
    style: ShapingAttrs['style'],
    _lang: string,
  ): FontFaceInfo[] {
    const result: FontFaceInfo[] = [];
    const seen = new Set<string>();

    for (const family of style.fontFamily) {
      const urls = this.familyToUrls.get(family);
      if (!urls) continue;

      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);

        const face = this.registeredFaces.get(url);
        if (face) {
          result.push(face);
        }
      }
    }

    // 폴백: 아무 폰트라도 하나 반환
    if (result.length === 0) {
      const first = this.registeredFaces.values().next();
      if (!first.done) {
        result.push(first.value);
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Paragraph-based advance measurement
  // -------------------------------------------------------------------------

  /**
   * Paragraph API의 getRectsForRange()를 사용하여
   * 각 클러스터의 advance를 정확하게 측정한다.
   *
   * fontSize=upem으로 Paragraph를 빌드하므로
   * 반환되는 rect 좌표가 font units에 근사한다.
   */
  private measureAdvancesViaParagraph(
    text: string,
    face: CanvasKitFontFace,
    fontSize: number,
    direction: 'ltr' | 'rtl',
  ): number[] {
    const ck = this.ck;
    const textAlign = direction === 'rtl' ? ck.TextAlign.Right : ck.TextAlign.Left;

    const paraStyle = new ck.ParagraphStyle({
      textStyle: {
        fontSize,
        fontFamilies: this.getFamiliesForFace(face),
        color: ck.Color4f(0, 0, 0, 1),
      },
      textAlign,
    });

    const builder = ck.ParagraphBuilder.Make(paraStyle, this.fontMgr);
    builder.addText(text);
    const paragraph = builder.build();

    // 충분히 넓은 폭으로 layout하여 줄바꿈 방지
    paragraph.layout(1e6);

    const advances: number[] = [];
    const len = text.length;

    // 각 코드 유닛의 advance를 getRectsForRange로 측정
    for (let i = 0; i < len; i++) {
      const rects = paragraph.getRectsForRange(
        i,
        i + 1,
        ck.RectHeightStyle.Tight,
        ck.RectWidthStyle.Tight,
      );

      if (rects.length > 0) {
        const rect = rects[0].rect;
        // rect: [left, top, right, bottom]
        const width = rect[2] - rect[0];
        advances.push(Math.round(width));
      } else {
        advances.push(0);
      }
    }

    paragraph.delete();
    builder.delete();

    return advances;
  }

  /**
   * FontFace의 url에 해당하는 family 이름들을 반환.
   * ParagraphStyle의 fontFamilies에 전달한다.
   */
  private getFamiliesForFace(face: CanvasKitFontFace): string[] {
    const families: string[] = [];
    for (const [family, urls] of this.familyToUrls) {
      if (urls.includes(face.url)) {
        families.push(family);
      }
    }
    return families.length > 0 ? families : ['sans-serif'];
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private getOrCreateFont(face: CanvasKitFontFace, fontSize: number): CKFont {
    const key = `${face.url}:${fontSize}`;
    const cached = this.fontCache.get(key);
    if (cached) return cached;

    const font = new this.ck.Font(face.getTypeface(), fontSize);
    this.fontCache.set(key, font);
    return font;
  }

  /**
   * 등록된 모든 네이티브 리소스를 해제한다.
   */
  dispose(): void {
    for (const font of this.fontCache.values()) {
      font.delete();
    }
    this.fontCache.clear();
    this.registeredFaces.clear();
    this.familyToUrls.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * CanvasKitShaper를 생성한다.
 *
 * @param ck - CanvasKit 인스턴스 (initCanvasKit.ts의 getCanvasKit())
 * @param fontMgr - 폰트가 로드된 FontMgr (fontManager.ts의 getFontMgr())
 */
export function createCanvasKitShaper(
  ck: CanvasKitMinimal,
  fontMgr: CKFontMgr,
): CanvasKitShaper {
  return new CanvasKitShaper(ck, fontMgr);
}
