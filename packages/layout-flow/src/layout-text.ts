/**
 * Text layout: line breaking, shaping, and positioning
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * HarfBuzz dependencies abstracted behind TextShaper interface.
 * DOM dependencies removed.
 *
 * NOTE: This file contains the essential type definitions and the Run class.
 * The full line-breaking and text layout implementation will be ported
 * incrementally as the TextShaper adapter is implemented (Phase 2/Gate A).
 */

import { Logger, loggableText } from './util.js';
import { Box, TreeNode, Layout } from './layout-box.js';
import { Style } from './style.js';

import type {
  InlineMetrics,
  ShapingAttrs,
  FontFaceInfo,
} from './adapters/shaper-interface.js';
import {
  G_AX,
  G_SZ,
} from './adapters/shaper-interface.js';
import type { AllocatedUint16Array } from './types.js';
import type { TreeLogOptions, BoxArea } from './layout-box.js';
import type { TextAlign, WhiteSpace } from './types.js';
import type {
  BlockLevel,
  InlineLevel,
  BlockContainer,
  BlockContainerOfInlines,
  Inline,
  LayoutContext,
  ReplacedBox,
} from './layout-flow.js';

export { type InlineMetrics, type ShapingAttrs };
export { G_AX, G_SZ };
export {
  EmptyInlineMetrics,
  G_ID,
  G_CL,
  G_AY,
  G_DX,
  G_DY,
  G_FL,
} from './adapters/shaper-interface.js';

// ---------------------------------------------------------------------------
// Linebox (used by layout-flow)
// ---------------------------------------------------------------------------

export class Linebox {
  blockOffset: number;
  ascender: number;
  descender: number;

  constructor() {
    this.blockOffset = 0;
    this.ascender = 0;
    this.descender = 0;
  }

  height(): number {
    return this.ascender + this.descender;
  }
}

// ---------------------------------------------------------------------------
// Run (text node in the flat tree)
// ---------------------------------------------------------------------------

export class Run extends TreeNode {
  public textStart: number;
  public textEnd: number;

  static TEXT_BITS =
    Box.BITS.hasText |
    Box.BITS.hasForegroundInLayer |
    Box.BITS.hasForegroundInDescendent;

  constructor(start: number, end: number, style: Style) {
    super(style);
    this.textStart = start;
    this.textEnd = end;
  }

  get length() {
    return this.textEnd - this.textStart;
  }

  getLogSymbol() {
    return '\u0372';
  }

  get wsCollapsible() {
    return this.style.isWsCollapsible();
  }

  wrapsOverflowAnywhere(mode: 'min-content' | 'max-content' | 'normal') {
    if (mode === 'min-content') {
      return (
        this.style.overflowWrap === 'anywhere' ||
        this.style.wordBreak === 'break-word'
      );
    } else {
      return (
        this.style.overflowWrap === 'anywhere' ||
        this.style.overflowWrap === 'break-word' ||
        this.style.wordBreak === 'break-word'
      );
    }
  }

  isRun(): this is Run {
    return true;
  }

  logName(log: Logger, options?: TreeLogOptions) {
    log.text(`${this.textStart},${this.textEnd}`);
    if (options?.paragraphText) {
      log.text(
        ` "${loggableText(options.paragraphText.slice(this.textStart, this.textEnd))}"`,
      );
    }
  }

  propagate(parent: Box, paragraph: string) {
    if (!parent.isInline()) throw new Error('Assertion failed');

    if (!this.style.isWsCollapsible()) {
      parent.bitfield |= Run.TEXT_BITS;
    }

    if (this.style.wordSpacing !== 'normal') {
      parent.bitfield |= Box.BITS.hasWordSpacing;
    }

    const NON_ASCII_MASK = 0b1111_1111_1000_0000;

    for (let i = this.textStart; i < this.textEnd; i++) {
      const code = paragraph.charCodeAt(i);

      if (code & NON_ASCII_MASK) {
        parent.bitfield |= Box.BITS.hasComplexText;
      }

      if (code === 0xad) {
        parent.bitfield |= Box.BITS.hasSoftHyphen;
      } else if (code === 0xa0) {
        parent.bitfield |= Box.BITS.hasNewlines;
      }

      if (!isSpaceOrTabOrNewline(paragraph[i])) {
        parent.bitfield |= Run.TEXT_BITS;
      }
    }

    if (!isNowrap(this.style.whiteSpace)) {
      parent.bitfield |= Box.BITS.hasSoftWrap;
    }
  }
}

// ---------------------------------------------------------------------------
// ShapedItem (placeholder - full impl requires TextShaper)
// ---------------------------------------------------------------------------

/**
 * Represents a shaped segment of text with glyph data.
 *
 * The full implementation of ShapedItem will be ported when the TextShaper
 * adapter is connected (Phase 2). For now this provides the type interface
 * needed by layout-flow.ts.
 */
export class ShapedItem {
  ifc: BlockContainerOfInlines;
  face: FontFaceInfo;
  glyphs: Int32Array;
  offset: number;
  length: number;
  attrs: ShapingAttrs;
  inlines: Inline[];
  x: number;
  y: number;

  constructor(
    ifc: BlockContainerOfInlines,
    face: FontFaceInfo,
    glyphs: Int32Array,
    offset: number,
    length: number,
    attrs: ShapingAttrs,
  ) {
    this.ifc = ifc;
    this.face = face;
    this.glyphs = glyphs;
    this.offset = offset;
    this.length = length;
    this.attrs = attrs;
    this.inlines = [];
    this.x = 0;
    this.y = 0;
  }

  end() {
    return this.offset + this.length;
  }

  hasCharacterInside(ci: number) {
    return ci > this.offset && ci < this.end();
  }

  text() {
    return this.ifc.text.slice(this.offset, this.offset + this.length);
  }
}

export type InlineFragment = {
  blockOffset: number;
  start: number;
  end: number;
  lineboxIndex: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNowrap(whiteSpace: WhiteSpace): boolean {
  return whiteSpace === 'nowrap' || whiteSpace === 'pre';
}

export function isSpaceOrTabOrNewline(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n';
}

// ---------------------------------------------------------------------------
// Whitespace collapsing
// ---------------------------------------------------------------------------

const spaceCharacter = 0x0020;
const lineFeedCharacter = 0x000a;

function isSpaceOrTab(c: string): boolean {
  return c === ' ' || c === '\t';
}

function isNewline(c: string): boolean {
  return c === '\n';
}

const decoder = new TextDecoder('utf-16');

export function collapseWhitespace(
  tree: InlineLevel[],
  ifc: BlockContainerOfInlines,
): void {
  const str = new Uint16Array(ifc.text.length);
  const parents: Inline[] = [];
  let delta = 0;
  let index = 0;
  let inWhitespace = false;
  let treeDelta = 0;
  let w = ifc.treeStart + 2;

  for (let r = ifc.treeStart + 2; r <= ifc.treeFinal; r++) {
    const item = tree[r];

    if (item.isRun()) {
      const whiteSpace = item.style.whiteSpace;
      const originalStart = item.textStart;

      item.textStart -= delta;

      if (whiteSpace === 'normal' || whiteSpace === 'nowrap') {
        for (let i = originalStart; i < item.textEnd; i++) {
          const isWs = isSpaceOrTabOrNewline(ifc.text[i]);
          if (inWhitespace && isWs) {
            delta += 1;
          } else {
            str[index++] = isWs ? spaceCharacter : ifc.text.charCodeAt(i);
          }
          inWhitespace = isWs;
        }
      } else if (whiteSpace === 'pre-line') {
        for (let i = originalStart; i < item.textEnd; i++) {
          const isWs = isSpaceOrTabOrNewline(ifc.text[i]);
          if (isWs) {
            let j = i + 1;
            let hasNl = isNewline(ifc.text[i]);
            for (
              ;
              j < item.textEnd && isSpaceOrTabOrNewline(ifc.text[j]);
              j++
            ) {
              hasNl = hasNl || isNewline(ifc.text[j]);
            }
            while (i < j) {
              if (isSpaceOrTab(ifc.text[i])) {
                if (inWhitespace || hasNl) {
                  delta += 1;
                } else {
                  str[index++] = spaceCharacter;
                }
                inWhitespace = true;
              } else {
                str[index++] = lineFeedCharacter;
                inWhitespace = false;
              }
              i++;
            }
            i = j - 1;
          } else {
            str[index++] = ifc.text.charCodeAt(i);
            inWhitespace = false;
          }
        }
      } else {
        // pre or pre-wrap
        inWhitespace = false;
        for (let i = originalStart; i < item.textEnd; i++) {
          str[index++] = ifc.text.charCodeAt(i);
        }
      }

      item.textEnd -= delta;

      if (item.length) {
        tree[w++] = item;
      } else {
        treeDelta++;
      }
    } else if (item.isFormattingBox()) {
      item.treeStart -= treeDelta;
      if (item.isInlineLevel()) {
        inWhitespace = false;
      }
      tree[w++] = item;
      while (r + 1 <= item.treeFinal) {
        const innerItem = tree[++r];
        if (innerItem.isBox()) {
          innerItem.treeStart -= treeDelta;
          innerItem.treeFinal -= treeDelta;
        }
        tree[w++] = innerItem;
      }
      item.treeFinal -= treeDelta;
    } else {
      tree[w++] = item;
      if (item.isInline()) {
        item.textStart -= delta;
        item.treeStart -= treeDelta;
        parents.push(item);
      }
    }

    while (parents.length && r === parents.at(-1)!.treeFinal) {
      const parent = parents.pop()!;
      parent.textEnd -= delta;
      parent.treeFinal -= treeDelta;
    }
  }

  const rootInline = tree[ifc.treeStart + 1];
  if (!rootInline.isInline()) throw new Error('Assertion failed!');
  rootInline.textEnd -= delta;
  rootInline.treeFinal -= treeDelta;
  ifc.treeFinal -= treeDelta;

  if (treeDelta > 0) {
    tree.length -= treeDelta;
  }

  ifc.text = decoder.decode(str.subarray(0, index));
}

// ---------------------------------------------------------------------------
// TextShaper 레지스트리
// ---------------------------------------------------------------------------

import type { TextShaper, FontMetrics as ShaperFontMetrics } from './adapters/shaper-interface.js';

let _activeShaper: TextShaper | null = null;

/**
 * TextShaper를 등록한다. layout 함수 호출 전에 반드시 호출해야 한다.
 *
 * @example
 * ```ts
 * import { setTextShaper } from '@xstudio/layout-flow';
 * import { createCanvasKitShaper } from '@xstudio/layout-flow/src/adapters/canvaskit-shaper';
 *
 * const shaper = createCanvasKitShaper(ck, fontMgr);
 * setTextShaper(shaper);
 * ```
 */
export function setTextShaper(shaper: TextShaper): void {
  _activeShaper = shaper;
}

/** 현재 등록된 TextShaper를 반환한다. 없으면 null. */
export function getTextShaper(): TextShaper | null {
  return _activeShaper;
}

function requireShaper(): TextShaper {
  if (!_activeShaper) {
    throw new Error(
      'TextShaper가 등록되지 않았습니다. setTextShaper()를 먼저 호출하세요.',
    );
  }
  return _activeShaper;
}

// ---------------------------------------------------------------------------
// InlineMetrics 계산
// ---------------------------------------------------------------------------

/**
 * Inline 요소의 font metrics를 계산하여 InlineMetrics로 반환한다.
 *
 * CSS 2 §10.8 line-height 계산:
 * - line-height: normal → content height = ascender + descender
 * - line-height: <number> → half-leading 분배
 *
 * @see https://www.w3.org/TR/CSS2/visudet.html#leading
 */
export function getFontMetrics(inline: Inline): InlineMetrics {
  const shaper = _activeShaper;
  if (!shaper) {
    return {
      ascenderBox: 0,
      ascender: 0,
      superscript: 0,
      xHeight: 0,
      subscript: 0,
      descender: 0,
      descenderBox: 0,
    };
  }

  const style = inline.style;
  const fontSize = style.fontSize;
  const cascade = shaper.getFontCascade(
    {
      fontSize,
      fontWeight: typeof style.fontWeight === 'number' ? style.fontWeight : 400,
      fontVariant: style.fontVariant,
      fontStyle: style.fontStyle,
      fontFamily: style.fontFamily,
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      wordSpacing: style.wordSpacing,
      lineHeight: style.lineHeight,
      isWsCollapsible: () => style.isWsCollapsible(),
    },
    'en',
  );

  if (cascade.length === 0) {
    return {
      ascenderBox: 0,
      ascender: 0,
      superscript: 0,
      xHeight: 0,
      subscript: 0,
      descender: 0,
      descenderBox: 0,
    };
  }

  const face = cascade[0];
  const rawMetrics: ShaperFontMetrics = shaper.getFontMetrics(face, 'ltr');
  const upem = face.upem;
  const scale = fontSize / upem;

  // font units → CSS px 변환
  const ascender = rawMetrics.ascender * scale;
  const descender = rawMetrics.descender * scale; // 음수
  const lineGap = rawMetrics.lineGap * scale;
  const xHeight = rawMetrics.xHeight * scale;

  // content height (line-height: normal일 때의 line box 기여)
  const contentHeight = ascender - descender + lineGap;

  // line-height 해석
  let lineHeight: number;
  if (style.lineHeight === 'normal') {
    lineHeight = contentHeight;
  } else {
    lineHeight = style.lineHeight * fontSize;
  }

  // half-leading
  const halfLeading = (lineHeight - contentHeight) / 2;
  const ascenderBox = ascender + halfLeading;
  const descenderBox = -descender + halfLeading;

  // superscript/subscript 근사
  const superscript = xHeight;
  const subscript = -descender * 0.5;

  return {
    ascenderBox,
    ascender,
    superscript,
    xHeight,
    subscript,
    descender: -descender,
    descenderBox,
  };
}

// ---------------------------------------------------------------------------
// IFC buffer 할당
// ---------------------------------------------------------------------------

/**
 * 텍스트 shaping용 버퍼를 할당한다.
 */
export function createIfcBuffer(
  text: string,
): AllocatedUint16Array {
  const shaper = _activeShaper;
  if (!shaper) {
    return { array: new Uint16Array(), destroy() {} };
  }
  return shaper.allocateBuffer(text.length);
}

// ---------------------------------------------------------------------------
// Shaped items 생성
// ---------------------------------------------------------------------------

/**
 * IFC의 텍스트를 shaping하여 ShapedItem 배열을 반환한다.
 *
 * 현재 구현은 단순화된 단일-run shaping:
 * 전체 텍스트를 하나의 run으로 처리한다.
 * 향후 BiDi, script segmentation, style run 분할이 필요하다.
 */
export function createIfcShapedItems(
  layout: Layout,
  ifc: BlockContainerOfInlines,
  inlineRoot: Inline,
): ShapedItem[] {
  const shaper = _activeShaper;
  if (!shaper) return [];

  const text = ifc.text;
  if (text.length === 0) return [];

  // inline root의 스타일에서 shaping attrs 추출
  const style = inlineRoot.style;
  const cascade = shaper.getFontCascade(
    {
      fontSize: style.fontSize,
      fontWeight: typeof style.fontWeight === 'number' ? style.fontWeight : 400,
      fontVariant: style.fontVariant,
      fontStyle: style.fontStyle,
      fontFamily: style.fontFamily,
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      wordSpacing: style.wordSpacing,
      lineHeight: style.lineHeight,
      isWsCollapsible: () => style.isWsCollapsible(),
    },
    'en',
  );

  if (cascade.length === 0) return [];

  const face = cascade[0];
  const attrs: ShapingAttrs = {
    isEmoji: false,
    level: 0, // LTR
    script: 'Latn',
    style: {
      fontSize: style.fontSize,
      fontWeight: typeof style.fontWeight === 'number' ? style.fontWeight : 400,
      fontVariant: style.fontVariant,
      fontStyle: style.fontStyle,
      fontFamily: style.fontFamily,
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
      wordSpacing: style.wordSpacing,
      lineHeight: style.lineHeight,
      isWsCollapsible: () => style.isWsCollapsible(),
    },
  };

  // shape
  const buffer = ifc.buffer;
  const glyphs = shaper.shape(
    text,
    buffer,
    0,
    text.length,
    face,
    attrs.script,
    'en',
    'ltr',
  );

  const item = new ShapedItem(ifc, face, glyphs, 0, text.length, attrs);

  // inline 목록 수집 (run의 부모 Inline들)
  for (let i = ifc.treeStart + 1; i <= ifc.treeFinal; i++) {
    const node = layout.tree[i];
    if (node.isInline()) {
      item.inlines.push(node);
    }
  }

  return [item];
}

// ---------------------------------------------------------------------------
// Linebox 생성
// ---------------------------------------------------------------------------

/**
 * IFC의 텍스트를 줄바꿈하여 Linebox 배열을 반환한다.
 *
 * 현재 구현은 단순화된 줄바꿈:
 * - 공백 기반 word wrap
 * - float 고려 없음 (Phase 3에서 구현)
 */
export function createIfcLineboxes(
  layout: Layout,
  ifc: BlockContainerOfInlines,
  ctx: LayoutContext,
): Linebox[] {
  const shaper = _activeShaper;
  if (!shaper) return [];

  const text = ifc.text;
  if (text.length === 0 || ifc.items.length === 0) return [];

  const item = ifc.items[0];
  const face = item.face;
  const upem = face.upem;
  const fontSize = item.attrs.style.fontSize;
  const scale = fontSize / upem;
  const rawMetrics = shaper.getFontMetrics(face, 'ltr');

  const ascender = rawMetrics.ascender * scale;
  const descender = Math.abs(rawMetrics.descender * scale);
  const lineGap = rawMetrics.lineGap * scale;

  // line-height 계산
  let lineHeight: number;
  const lhStyle = item.attrs.style.lineHeight;
  if (lhStyle === 'normal') {
    lineHeight = ascender + descender + lineGap;
  } else {
    lineHeight = lhStyle * fontSize;
  }

  const maxWidth = ifc.getContentArea().inlineSize;
  const lineboxes: Linebox[] = [];
  const glyphs = item.glyphs;

  // 글리프 advance 합계를 통해 줄바꿈 위치 결정
  let lineStartIndex = 0;
  let currentWidth = 0;
  let lastBreakIndex = -1;
  let lastBreakWidth = 0;

  for (let ci = 0; ci < text.length; ci++) {
    // 이 코드 유닛의 advance를 font units에서 px로 변환
    let advance = 0;
    if (ci < glyphs.length / G_SZ) {
      advance = glyphs[ci * G_SZ + G_AX] * scale;
    }

    const ch = text[ci];

    // 줄바꿈 기회: 공백 뒤, 또는 하이픈 뒤
    if (ch === ' ' || ch === '\t') {
      lastBreakIndex = ci + 1;
      lastBreakWidth = currentWidth + advance;
    }

    // 강제 줄바꿈
    if (ch === '\n') {
      const line = new Linebox();
      line.blockOffset = lineboxes.length * lineHeight;
      line.ascender = ascender;
      line.descender = descender;
      lineboxes.push(line);

      lineStartIndex = ci + 1;
      currentWidth = 0;
      lastBreakIndex = -1;
      lastBreakWidth = 0;
      continue;
    }

    currentWidth += advance;

    // 너비 초과 시 줄바꿈
    if (currentWidth > maxWidth && maxWidth > 0) {
      const line = new Linebox();
      line.blockOffset = lineboxes.length * lineHeight;
      line.ascender = ascender;
      line.descender = descender;
      lineboxes.push(line);

      if (lastBreakIndex > lineStartIndex) {
        // 마지막 공백에서 줄바꿈
        lineStartIndex = lastBreakIndex;
        currentWidth = currentWidth - lastBreakWidth;
      } else {
        // 강제 줄바꿈 (break-all)
        lineStartIndex = ci;
        currentWidth = advance;
      }

      lastBreakIndex = -1;
      lastBreakWidth = 0;
    }
  }

  // 마지막 줄
  if (lineStartIndex <= text.length) {
    const line = new Linebox();
    line.blockOffset = lineboxes.length * lineHeight;
    line.ascender = ascender;
    line.descender = descender;
    lineboxes.push(line);
  }

  // IFC 콘텐츠 높이 설정
  const totalHeight = lineboxes.length * lineHeight;
  ifc.getContentArea().blockSize = totalHeight;

  return lineboxes;
}

// ---------------------------------------------------------------------------
// Item 포지셔닝
// ---------------------------------------------------------------------------

/**
 * Linebox 내 ShapedItem들의 위치를 결정한다.
 */
export function positionIfcItems(
  _layout: Layout,
  ifc: BlockContainerOfInlines,
): void {
  if (ifc.items.length === 0) return;

  const item = ifc.items[0];
  item.x = 0;
  item.y = 0;
}

// ---------------------------------------------------------------------------
// IFC contribution (min/max-content sizing)
// ---------------------------------------------------------------------------

/**
 * IFC의 min-content 또는 max-content 기여를 계산한다.
 */
export function getIfcContribution(
  _layout: Layout,
  ifc: BlockContainerOfInlines,
  mode: 'min-content' | 'max-content',
): number {
  const shaper = _activeShaper;
  if (!shaper) return 0;

  const text = ifc.text;
  if (text.length === 0 || ifc.items.length === 0) return 0;

  const item = ifc.items[0];
  const face = item.face;
  const upem = face.upem;
  const fontSize = item.attrs.style.fontSize;
  const scale = fontSize / upem;
  const glyphs = item.glyphs;

  if (mode === 'max-content') {
    // max-content: 줄바꿈 없이 전체 텍스트 너비
    let totalWidth = 0;
    for (let i = 0; i < glyphs.length / G_SZ; i++) {
      totalWidth += glyphs[i * G_SZ + G_AX] * scale;
    }
    return totalWidth;
  } else {
    // min-content: 가장 긴 단어의 너비
    let maxWordWidth = 0;
    let currentWordWidth = 0;

    for (let ci = 0; ci < text.length; ci++) {
      const ch = text[ci];
      let advance = 0;
      if (ci < glyphs.length / G_SZ) {
        advance = glyphs[ci * G_SZ + G_AX] * scale;
      }

      if (ch === ' ' || ch === '\t' || ch === '\n') {
        maxWordWidth = Math.max(maxWordWidth, currentWordWidth);
        currentWordWidth = 0;
      } else {
        currentWordWidth += advance;
      }
    }
    maxWordWidth = Math.max(maxWordWidth, currentWordWidth);

    return maxWordWidth;
  }
}

/**
 * Slice render text for a shaped item.
 */
export function sliceIfcRenderText(
  _layout: Layout,
  ifc: BlockContainerOfInlines,
  _item: ShapedItem,
  start: number,
  end: number,
): string {
  return ifc.text.slice(start, end);
}
