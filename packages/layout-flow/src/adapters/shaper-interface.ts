/**
 * TextShaper interface - abstracts HarfBuzz text shaping
 *
 * This interface allows @xstudio/layout-flow to work with different
 * text shaping backends (HarfBuzz, CanvasKit, etc.)
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 */

import type { AllocatedUint16Array } from '../types.js';

// ---------------------------------------------------------------------------
// Font Info
// ---------------------------------------------------------------------------

/**
 * Information needed to identify and use a font face.
 * The consumer provides a concrete implementation.
 */
export interface FontFaceInfo {
  /** URL or identifier for the font */
  readonly url: string;
  /** Units-per-em of the font face */
  readonly upem: number;
  /**
   * Whether spaces may participate in shaping for a given script.
   * If true, the word cache optimization cannot be used and all text
   * must be shaped in one pass.
   */
  spaceMayParticipateInShaping(script: string): boolean;
}

// ---------------------------------------------------------------------------
// Font Metrics
// ---------------------------------------------------------------------------

export interface FontMetrics {
  /** Typographic ascender in font units (positive) */
  ascender: number;
  /** Typographic descender in font units (negative) */
  descender: number;
  /** Line gap in font units */
  lineGap: number;
  /** x-height in font units */
  xHeight: number;
}

// ---------------------------------------------------------------------------
// Inline Metrics (computed, in CSS pixels)
// ---------------------------------------------------------------------------

export interface InlineMetrics {
  ascenderBox: number;
  ascender: number;
  superscript: number;
  xHeight: number;
  subscript: number;
  descender: number;
  descenderBox: number;
}

export const EmptyInlineMetrics: Readonly<InlineMetrics> = Object.freeze({
  ascenderBox: 0,
  ascender: 0,
  superscript: 0,
  xHeight: 0,
  subscript: 0,
  descender: 0,
  descenderBox: 0,
});

// ---------------------------------------------------------------------------
// Glyph Layout Constants
// ---------------------------------------------------------------------------

/** Glyph array field offsets (stride = G_SZ = 7) */
export const G_ID = 0; // glyph id
export const G_CL = 1; // cluster index
export const G_AX = 2; // x advance (font units)
export const G_AY = 3; // y advance
export const G_DX = 4; // x offset
export const G_DY = 5; // y offset
export const G_FL = 6; // flags
export const G_SZ = 7; // stride

// ---------------------------------------------------------------------------
// Shaping Attributes
// ---------------------------------------------------------------------------

export interface ShapingAttrs {
  isEmoji: boolean;
  level: number;
  script: string;
  style: {
    fontSize: number;
    fontWeight: number;
    fontVariant: string;
    fontStyle: string;
    fontFamily: string[];
    whiteSpace: string;
    overflowWrap: string;
    wordBreak: string;
    wordSpacing: 'normal' | number | { value: number; unit: '%' };
    lineHeight: 'normal' | number;
    isWsCollapsible(): boolean;
  };
}

// ---------------------------------------------------------------------------
// Text Shaper Interface
// ---------------------------------------------------------------------------

/**
 * Abstract text shaping interface.
 *
 * Implementations wrap HarfBuzz, CanvasKit, or other shaping engines.
 */
export interface TextShaper {
  /**
   * Shape a run of text, returning a glyph array laid out as:
   * [glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset, flags, ...]
   * with a stride of G_SZ (7).
   */
  shape(
    text: string,
    buffer: AllocatedUint16Array,
    offset: number,
    length: number,
    face: FontFaceInfo,
    script: string,
    lang: string,
    direction: 'ltr' | 'rtl',
  ): Int32Array;

  /**
   * Get font metrics for the given font face and direction.
   */
  getFontMetrics(face: FontFaceInfo, direction: 'ltr' | 'rtl'): FontMetrics;

  /**
   * Allocate a UTF-16 buffer for text shaping.
   * The returned buffer should be destroyed after use.
   */
  allocateBuffer(length: number): AllocatedUint16Array;

  /**
   * Get the font face cascade for a given style and language.
   * Returns font faces in priority order for fallback.
   */
  getFontCascade(
    style: ShapingAttrs['style'],
    lang: string,
  ): FontFaceInfo[];
}

// ---------------------------------------------------------------------------
// Line Breaker Interface
// ---------------------------------------------------------------------------

export interface LineBreakResult {
  position: number;
  required: boolean;
}

export interface LineBreaker {
  nextBreak(): LineBreakResult | null;
}

export interface LineBreakerFactory {
  create(text: string, hardBreaksOnly: boolean): LineBreaker;
  createHardBreaker(text: string): LineBreaker;
}

// ---------------------------------------------------------------------------
// Grapheme Breaker Interface
// ---------------------------------------------------------------------------

export interface GraphemeBreaker {
  nextGraphemeBreak(text: string, index: number): number;
  previousGraphemeBreak(text: string, index: number): number;
}
