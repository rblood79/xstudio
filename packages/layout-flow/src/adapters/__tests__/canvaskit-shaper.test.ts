/**
 * CanvasKit Shaper PoC 검증 테스트
 *
 * CanvasKit WASM을 직접 로드하지 않고, mock 기반으로
 * CanvasKitShaper의 인터페이스 준수 및 로직 정확성을 검증한다.
 *
 * Gate A 판정 기준:
 * 1. TextShaper 인터페이스를 올바르게 구현하는가
 * 2. shape() 반환 형식이 G_SZ stride를 준수하는가
 * 3. getFontMetrics() 부호 변환이 올바른가
 * 4. allocateBuffer()가 올바른 크기의 버퍼를 반환하는가
 * 5. getFontCascade()가 등록된 폰트를 반환하는가
 *
 * @see docs/ENGINE.md §7 Phase 2: CanvasKit Shaper PoC
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CanvasKitShaper,
  CanvasKitFontFace,
  createCanvasKitShaper,
  type CanvasKitMinimal,
} from '../canvaskit-shaper.js';
import { G_ID, G_CL, G_AX, G_AY, G_DX, G_DY, G_FL, G_SZ } from '../shaper-interface.js';

// ---------------------------------------------------------------------------
// Mock CanvasKit
// ---------------------------------------------------------------------------

function createMockTypeface() {
  return { delete: vi.fn() };
}

function createMockFontMgr() {
  return { delete: vi.fn() };
}

/** 각 문자가 고정 폭(10px at fontSize 1000)인 mock Paragraph */
function createMockParagraph(text: string, charWidth: number) {
  return {
    layout: vi.fn(),
    getLongestLine: vi.fn(() => text.length * charWidth),
    getHeight: vi.fn(() => 1200),
    getLineMetrics: vi.fn(() => [
      {
        startIndex: 0,
        endIndex: text.length,
        endExcludingWhitespaces: text.length,
        endIncludingNewline: text.length,
        isHardBreak: false,
        ascent: 800,
        descent: 200,
        height: 1200,
        width: text.length * charWidth,
        left: 0,
        baseline: 1000,
        lineNumber: 0,
      },
    ]),
    getRectsForRange: vi.fn((start: number, end: number) => {
      const rects = [];
      for (let i = start; i < end; i++) {
        rects.push({
          rect: new Float32Array([i * charWidth, 0, (i + 1) * charWidth, 1200]),
          dir: 0,
        });
      }
      return rects;
    }),
    getGlyphPositionAtCoordinate: vi.fn(() => ({ pos: 0, affinity: 0 })),
    delete: vi.fn(),
  };
}

function createMockCanvasKit(charWidth: number = 500): CanvasKitMinimal {
  // ParagraphBuilder.Make가 호출될 때마다 새 builder를 반환하되,
  // addText에 전달된 텍스트를 기반으로 paragraph를 생성
  let capturedText = '';

  // `new ck.Font(...)` 로 호출되므로 class 기반 mock 필요
  class MockFont {
    getMetrics() {
      return {
        ascent: -800, // CanvasKit: 음수
        descent: 200, // CanvasKit: 양수
        leading: 0,
      };
    }
    getGlyphIDs(text: string) {
      const ids = new Uint16Array(text.length);
      for (let i = 0; i < text.length; i++) {
        ids[i] = text.charCodeAt(i);
      }
      return ids;
    }
    getGlyphWidths(ids: Uint16Array) {
      const widths = new Float32Array(ids.length);
      for (let i = 0; i < ids.length; i++) {
        widths[i] = charWidth;
      }
      return widths;
    }
    delete() { /* no-op */ }
  }

  // `new ck.ParagraphStyle(...)` 로 호출되므로 class 기반 mock 필요
  class MockParagraphStyle {
    constructor(_init: Record<string, unknown>) { /* no-op */ }
  }

  const ck: CanvasKitMinimal = {
    ParagraphBuilder: {
      Make: vi.fn(() => {
        const builder = {
          addText: vi.fn((text: string) => {
            capturedText = text;
          }),
          build: vi.fn(() => createMockParagraph(capturedText, charWidth)),
          delete: vi.fn(),
        };
        return builder;
      }),
    },
    ParagraphStyle: MockParagraphStyle as unknown as CanvasKitMinimal['ParagraphStyle'],
    Font: MockFont as unknown as CanvasKitMinimal['Font'],
    FontWeight: { Normal: { value: 400 } },
    FontSlant: { Upright: { value: 0 } },
    TextAlign: { Left: { value: 0 }, Right: { value: 1 }, Center: { value: 2 } },
    RectHeightStyle: { Tight: { value: 1 } },
    RectWidthStyle: { Tight: { value: 1 } },
    Color4f: vi.fn((r, g, b, a) => new Float32Array([r, g, b, a])),
  };

  return ck;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanvasKitFontFace', () => {
  it('FontFaceInfo 인터페이스를 구현한다', () => {
    const typeface = createMockTypeface();
    const face = new CanvasKitFontFace(typeface, 'test.woff2', 1000);

    expect(face.url).toBe('test.woff2');
    expect(face.upem).toBe(1000);
    expect(face.getTypeface()).toBe(typeface);
  });

  it('라틴 스크립트에서 공백 shaping 참여 여부는 false', () => {
    const face = new CanvasKitFontFace(createMockTypeface(), 'test.woff2');
    expect(face.spaceMayParticipateInShaping('Latn')).toBe(false);
  });

  it('아랍어 스크립트에서 공백 shaping 참여 여부는 true', () => {
    const face = new CanvasKitFontFace(createMockTypeface(), 'test.woff2');
    expect(face.spaceMayParticipateInShaping('Arab')).toBe(true);
  });

  it('복합 스크립트 목록이 올바르다', () => {
    const face = new CanvasKitFontFace(createMockTypeface(), 'test.woff2');
    const complexScripts = ['Arab', 'Deva', 'Beng', 'Thai', 'Khmr', 'Mymr', 'Tibt'];
    for (const script of complexScripts) {
      expect(face.spaceMayParticipateInShaping(script)).toBe(true);
    }
    const simpleScripts = ['Latn', 'Cyrl', 'Grek', 'Hang', 'Hani'];
    for (const script of simpleScripts) {
      expect(face.spaceMayParticipateInShaping(script)).toBe(false);
    }
  });
});

describe('CanvasKitShaper', () => {
  let ck: CanvasKitMinimal;
  let fontMgr: ReturnType<typeof createMockFontMgr>;
  let shaper: CanvasKitShaper;
  let face: CanvasKitFontFace;

  beforeEach(() => {
    ck = createMockCanvasKit(500);
    fontMgr = createMockFontMgr();
    shaper = createCanvasKitShaper(ck, fontMgr);

    const typeface = createMockTypeface();
    face = shaper.registerFace(typeface, 'Pretendard.woff2', ['Pretendard'], 1000);
  });

  // -----------------------------------------------------------------------
  // shape()
  // -----------------------------------------------------------------------

  describe('shape()', () => {
    it('빈 텍스트에 대해 빈 배열을 반환한다', () => {
      const buffer = shaper.allocateBuffer(0);
      const result = shaper.shape('', buffer, 0, 0, face, 'Latn', 'en', 'ltr');

      expect(result).toBeInstanceOf(Int32Array);
      expect(result.length).toBe(0);
    });

    it('G_SZ=7 stride의 Int32Array를 반환한다', () => {
      const text = 'Hello';
      const buffer = shaper.allocateBuffer(text.length);
      const result = shaper.shape(text, buffer, 0, text.length, face, 'Latn', 'en', 'ltr');

      expect(result).toBeInstanceOf(Int32Array);
      // 5 글자 * G_SZ(7) = 35
      expect(result.length).toBe(text.length * G_SZ);
    });

    it('각 글리프의 필드가 올바르게 채워진다', () => {
      const text = 'AB';
      const buffer = shaper.allocateBuffer(text.length);
      const result = shaper.shape(text, buffer, 0, text.length, face, 'Latn', 'en', 'ltr');

      // 첫 번째 글리프
      expect(result[0 * G_SZ + G_ID]).toBe('A'.charCodeAt(0)); // glyph ID = charCode
      expect(result[0 * G_SZ + G_CL]).toBe(0); // cluster offset
      expect(result[0 * G_SZ + G_AX]).toBeGreaterThan(0); // x advance > 0
      expect(result[0 * G_SZ + G_AY]).toBe(0); // y advance = 0 (horizontal)
      expect(result[0 * G_SZ + G_DX]).toBe(0); // x offset = 0
      expect(result[0 * G_SZ + G_DY]).toBe(0); // y offset = 0
      expect(result[0 * G_SZ + G_FL]).toBe(0); // flags = 0

      // 두 번째 글리프
      expect(result[1 * G_SZ + G_ID]).toBe('B'.charCodeAt(0));
      expect(result[1 * G_SZ + G_CL]).toBe(1);
    });

    it('offset과 length로 부분 텍스트를 shaping한다', () => {
      const text = 'Hello World';
      const buffer = shaper.allocateBuffer(text.length);
      // 'World' (offset=6, length=5)
      const result = shaper.shape(text, buffer, 6, 5, face, 'Latn', 'en', 'ltr');

      expect(result.length).toBe(5 * G_SZ);
      // cluster는 원본 텍스트의 offset 기준
      expect(result[0 * G_SZ + G_CL]).toBe(6); // 'W'의 원본 offset
    });
  });

  // -----------------------------------------------------------------------
  // getFontMetrics()
  // -----------------------------------------------------------------------

  describe('getFontMetrics()', () => {
    it('ascender를 양수로 반환한다', () => {
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.ascender).toBeGreaterThan(0);
    });

    it('descender를 음수로 반환한다', () => {
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.descender).toBeLessThan(0);
    });

    it('CanvasKit ascent 음수를 올바르게 변환한다', () => {
      // Mock CanvasKit: ascent = -800
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.ascender).toBe(800);
    });

    it('CanvasKit descent 양수를 올바르게 변환한다', () => {
      // Mock CanvasKit: descent = 200
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.descender).toBe(-200);
    });

    it('lineGap을 반환한다', () => {
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(typeof metrics.lineGap).toBe('number');
    });

    it('xHeight를 양수로 반환한다', () => {
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.xHeight).toBeGreaterThan(0);
    });

    it('ascender > xHeight > 0', () => {
      const metrics = shaper.getFontMetrics(face, 'ltr');
      expect(metrics.ascender).toBeGreaterThan(metrics.xHeight);
      expect(metrics.xHeight).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // allocateBuffer()
  // -----------------------------------------------------------------------

  describe('allocateBuffer()', () => {
    it('지정된 길이의 Uint16Array를 반환한다', () => {
      const buf = shaper.allocateBuffer(100);
      expect(buf.array).toBeInstanceOf(Uint16Array);
      expect(buf.array.length).toBe(100);
    });

    it('destroy()가 에러 없이 호출된다', () => {
      const buf = shaper.allocateBuffer(10);
      expect(() => buf.destroy()).not.toThrow();
    });

    it('길이 0 버퍼도 생성 가능하다', () => {
      const buf = shaper.allocateBuffer(0);
      expect(buf.array.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getFontCascade()
  // -----------------------------------------------------------------------

  describe('getFontCascade()', () => {
    it('등록된 폰트 패밀리를 반환한다', () => {
      const style = {
        fontSize: 16,
        fontWeight: 400,
        fontVariant: 'normal' as const,
        fontStyle: 'normal' as const,
        fontFamily: ['Pretendard'],
        whiteSpace: 'normal' as const,
        overflowWrap: 'normal' as const,
        wordBreak: 'normal' as const,
        wordSpacing: 'normal' as const,
        lineHeight: 'normal' as const,
        isWsCollapsible: () => true,
      };

      const cascade = shaper.getFontCascade(style, 'ko');
      expect(cascade.length).toBeGreaterThan(0);
      expect(cascade[0].url).toBe('Pretendard.woff2');
    });

    it('등록되지 않은 폰트에 대해 폴백을 반환한다', () => {
      const style = {
        fontSize: 16,
        fontWeight: 400,
        fontVariant: 'normal' as const,
        fontStyle: 'normal' as const,
        fontFamily: ['UnknownFont'],
        whiteSpace: 'normal' as const,
        overflowWrap: 'normal' as const,
        wordBreak: 'normal' as const,
        wordSpacing: 'normal' as const,
        lineHeight: 'normal' as const,
        isWsCollapsible: () => true,
      };

      const cascade = shaper.getFontCascade(style, 'en');
      // 폴백으로 등록된 첫 번째 폰트를 반환
      expect(cascade.length).toBeGreaterThan(0);
    });

    it('복수 폰트 패밀리의 우선순위를 유지한다', () => {
      const typeface2 = createMockTypeface();
      shaper.registerFace(typeface2, 'NotoSans.woff2', ['Noto Sans'], 1000);

      const style = {
        fontSize: 16,
        fontWeight: 400,
        fontVariant: 'normal' as const,
        fontStyle: 'normal' as const,
        fontFamily: ['Noto Sans', 'Pretendard'],
        whiteSpace: 'normal' as const,
        overflowWrap: 'normal' as const,
        wordBreak: 'normal' as const,
        wordSpacing: 'normal' as const,
        lineHeight: 'normal' as const,
        isWsCollapsible: () => true,
      };

      const cascade = shaper.getFontCascade(style, 'en');
      expect(cascade.length).toBe(2);
      expect(cascade[0].url).toBe('NotoSans.woff2');
      expect(cascade[1].url).toBe('Pretendard.woff2');
    });
  });

  // -----------------------------------------------------------------------
  // registerFace()
  // -----------------------------------------------------------------------

  describe('registerFace()', () => {
    it('CanvasKitFontFace를 반환한다', () => {
      const typeface = createMockTypeface();
      const result = shaper.registerFace(typeface, 'test.woff2', ['Test'], 2048);

      expect(result).toBeInstanceOf(CanvasKitFontFace);
      expect(result.url).toBe('test.woff2');
      expect(result.upem).toBe(2048);
    });
  });

  // -----------------------------------------------------------------------
  // dispose()
  // -----------------------------------------------------------------------

  describe('dispose()', () => {
    it('캐시된 SkFont를 해제한다', () => {
      // getFontMetrics를 호출하여 내부적으로 SkFont 캐시 생성
      shaper.getFontMetrics(face, 'ltr');

      // dispose 호출
      expect(() => shaper.dispose()).not.toThrow();
    });

    it('dispose 후 재초기화 가능하다', () => {
      shaper.dispose();

      // 새 shaper 생성
      const newShaper = createCanvasKitShaper(ck, fontMgr);
      const typeface = createMockTypeface();
      const newFace = newShaper.registerFace(typeface, 'new.woff2', ['New'], 1000);
      const metrics = newShaper.getFontMetrics(newFace, 'ltr');

      expect(metrics.ascender).toBeGreaterThan(0);
      newShaper.dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// createCanvasKitShaper factory
// ---------------------------------------------------------------------------

describe('createCanvasKitShaper()', () => {
  it('CanvasKitShaper 인스턴스를 생성한다', () => {
    const ck = createMockCanvasKit();
    const fontMgr = createMockFontMgr();
    const shaper = createCanvasKitShaper(ck, fontMgr);

    expect(shaper).toBeInstanceOf(CanvasKitShaper);
    shaper.dispose();
  });
});

// ---------------------------------------------------------------------------
// TextShaper 레지스트리 통합 테스트
// ---------------------------------------------------------------------------

describe('setTextShaper / getTextShaper 통합', () => {
  it('layout-text의 setTextShaper로 CanvasKitShaper를 주입할 수 있다', async () => {
    const { setTextShaper, getTextShaper } = await import('../../layout-text.js');

    const ck = createMockCanvasKit();
    const fontMgr = createMockFontMgr();
    const shaper = createCanvasKitShaper(ck, fontMgr);

    setTextShaper(shaper);
    expect(getTextShaper()).toBe(shaper);

    // cleanup
    setTextShaper(null as unknown as import('../shaper-interface.js').TextShaper);
    shaper.dispose();
  });
});
