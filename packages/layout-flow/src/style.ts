/**
 * CSS Style for layout computation
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * Removed DOM, parsing, and cascade dependencies. Only layout-relevant style retained.
 */

import type {
  WhiteSpace,
  FontWeight,
  FontStyle,
  FontVariant,
  FontStretch,
  VerticalAlign,
  BackgroundClip,
  Direction,
  WritingMode,
  Position,
  Color,
  Display,
  BorderStyle,
  BoxSizing,
  TextAlign,
  Float,
  Clear,
  Percentage,
} from './types.js';

import type { BoxArea } from './layout-box.js';

// ---------------------------------------------------------------------------
// Logical property maps
// ---------------------------------------------------------------------------

type LogicalPropertyMap = Readonly<{
  marginBlockStart: MarginPhysical;
  marginBlockEnd: MarginPhysical;
  marginLineLeft: MarginPhysical;
  marginLineRight: MarginPhysical;
  paddingBlockStart: PaddingPhysical;
  paddingBlockEnd: PaddingPhysical;
  paddingLineLeft: PaddingPhysical;
  paddingLineRight: PaddingPhysical;
  borderBlockStartWidth: BorderWidthPhysical;
  borderBlockEndWidth: BorderWidthPhysical;
  borderLineLeftWidth: BorderWidthPhysical;
  borderLineRightWidth: BorderWidthPhysical;
  borderBlockStartStyle: BorderStylePhysical;
  borderBlockEndStyle: BorderStylePhysical;
  borderLineLeftStyle: BorderStylePhysical;
  borderLineRightStyle: BorderStylePhysical;
  blockSize: SizePhysical;
  inlineSize: SizePhysical;
}>;

type MarginPhysical = 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft';
type PaddingPhysical = 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft';
type BorderWidthPhysical = 'borderTopWidth' | 'borderRightWidth' | 'borderBottomWidth' | 'borderLeftWidth';
type BorderStylePhysical = 'borderTopStyle' | 'borderRightStyle' | 'borderBottomStyle' | 'borderLeftStyle';
type SizePhysical = 'width' | 'height';

const LogicalMaps: Readonly<Record<WritingMode, LogicalPropertyMap>> = Object.freeze({
  'horizontal-tb': Object.freeze({
    marginBlockStart: 'marginTop',
    marginBlockEnd: 'marginBottom',
    marginLineLeft: 'marginLeft',
    marginLineRight: 'marginRight',
    paddingBlockStart: 'paddingTop',
    paddingBlockEnd: 'paddingBottom',
    paddingLineLeft: 'paddingLeft',
    paddingLineRight: 'paddingRight',
    borderBlockStartWidth: 'borderTopWidth',
    borderBlockEndWidth: 'borderBottomWidth',
    borderLineLeftWidth: 'borderLeftWidth',
    borderLineRightWidth: 'borderRightWidth',
    borderBlockStartStyle: 'borderTopStyle',
    borderBlockEndStyle: 'borderBottomStyle',
    borderLineLeftStyle: 'borderLeftStyle',
    borderLineRightStyle: 'borderRightStyle',
    blockSize: 'height',
    inlineSize: 'width',
  }),
  'vertical-lr': Object.freeze({
    marginBlockStart: 'marginLeft',
    marginBlockEnd: 'marginRight',
    marginLineLeft: 'marginTop',
    marginLineRight: 'marginBottom',
    paddingBlockStart: 'paddingLeft',
    paddingBlockEnd: 'paddingRight',
    paddingLineLeft: 'paddingTop',
    paddingLineRight: 'paddingBottom',
    borderBlockStartWidth: 'borderLeftWidth',
    borderBlockEndWidth: 'borderRightWidth',
    borderLineLeftWidth: 'borderTopWidth',
    borderLineRightWidth: 'borderBottomWidth',
    borderBlockStartStyle: 'borderLeftStyle',
    borderBlockEndStyle: 'borderRightStyle',
    borderLineLeftStyle: 'borderTopStyle',
    borderLineRightStyle: 'borderBottomStyle',
    blockSize: 'width',
    inlineSize: 'height',
  }),
  'vertical-rl': Object.freeze({
    marginBlockStart: 'marginRight',
    marginBlockEnd: 'marginLeft',
    marginLineLeft: 'marginTop',
    marginLineRight: 'marginBottom',
    paddingBlockStart: 'paddingRight',
    paddingBlockEnd: 'paddingLeft',
    paddingLineLeft: 'paddingTop',
    paddingLineRight: 'paddingBottom',
    borderBlockStartWidth: 'borderRightWidth',
    borderBlockEndWidth: 'borderLeftWidth',
    borderLineLeftWidth: 'borderTopWidth',
    borderLineRightWidth: 'borderBottomWidth',
    borderBlockStartStyle: 'borderRightStyle',
    borderBlockEndStyle: 'borderLeftStyle',
    borderLineLeftStyle: 'borderTopStyle',
    borderLineRightStyle: 'borderBottomStyle',
    blockSize: 'width',
    inlineSize: 'height',
  }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePercent(
  containingBlock: BoxArea,
  cssVal: number | Percentage,
): number {
  if (typeof cssVal === 'object') {
    const writingMode = containingBlock.box.style.writingMode;
    const inlineSize = containingBlock[LogicalMaps[writingMode].inlineSize as 'width' | 'height'];
    return (cssVal.value / 100) * inlineSize;
  }
  return cssVal;
}

function percentGtZero(cssVal: number | Percentage): boolean {
  return typeof cssVal === 'object' ? cssVal.value > 0 : cssVal > 0;
}

// ---------------------------------------------------------------------------
// Style class
// ---------------------------------------------------------------------------

export class Style {
  zoom: number;
  whiteSpace: WhiteSpace;
  color: Color;
  fontSize: number;
  fontWeight: number;
  fontVariant: FontVariant;
  fontStyle: FontStyle;
  fontStretch: FontStretch;
  fontFamily: string[];
  lineHeight: 'normal' | number;
  verticalAlign: VerticalAlign;
  backgroundColor: Color;
  backgroundClip: BackgroundClip;
  display: Display;
  direction: Direction;
  writingMode: WritingMode;
  borderTopWidth: number;
  borderRightWidth: number;
  borderBottomWidth: number;
  borderLeftWidth: number;
  borderTopStyle: BorderStyle;
  borderRightStyle: BorderStyle;
  borderBottomStyle: BorderStyle;
  borderLeftStyle: BorderStyle;
  borderTopColor: Color;
  borderRightColor: Color;
  borderBottomColor: Color;
  borderLeftColor: Color;
  paddingTop: number | Percentage;
  paddingRight: number | Percentage;
  paddingBottom: number | Percentage;
  paddingLeft: number | Percentage;
  marginTop: number | Percentage | 'auto';
  marginRight: number | Percentage | 'auto';
  marginBottom: number | Percentage | 'auto';
  marginLeft: number | Percentage | 'auto';
  tabSize: number | { value: number; unit: null };
  position: Position;
  width: number | Percentage | 'auto';
  height: number | Percentage | 'auto';
  top: number | Percentage | 'auto';
  right: number | Percentage | 'auto';
  bottom: number | Percentage | 'auto';
  left: number | Percentage | 'auto';
  boxSizing: BoxSizing;
  textAlign: TextAlign;
  float: Float;
  clear: Clear;
  zIndex: number | 'auto';
  wordBreak: 'break-word' | 'normal';
  overflowWrap: 'anywhere' | 'break-word' | 'normal';
  overflow: 'visible' | 'hidden';
  wordSpacing: 'normal' | number | Percentage;
  minWidth: number | Percentage;
  maxWidth: number | Percentage | 'none';
  minHeight: number | Percentage;
  maxHeight: number | Percentage | 'none';

  constructor(init: Partial<Style> = {}) {
    this.zoom = init.zoom ?? 1;
    this.whiteSpace = init.whiteSpace ?? 'normal';
    this.color = init.color ?? { r: 0, g: 0, b: 0, a: 1 };
    this.fontSize = init.fontSize ?? 16;
    this.fontWeight = init.fontWeight ?? 400;
    this.fontVariant = init.fontVariant ?? 'normal';
    this.fontStyle = init.fontStyle ?? 'normal';
    this.fontStretch = init.fontStretch ?? 'normal';
    this.fontFamily = init.fontFamily ?? ['Helvetica'];
    this.lineHeight = init.lineHeight ?? 'normal';
    this.verticalAlign = init.verticalAlign ?? 'baseline';
    this.backgroundColor = init.backgroundColor ?? { r: 0, g: 0, b: 0, a: 0 };
    this.backgroundClip = init.backgroundClip ?? 'border-box';
    this.display = init.display ?? { outer: 'inline', inner: 'flow' };
    this.direction = init.direction ?? 'ltr';
    this.writingMode = init.writingMode ?? 'horizontal-tb';
    this.borderTopWidth = init.borderTopWidth ?? 0;
    this.borderRightWidth = init.borderRightWidth ?? 0;
    this.borderBottomWidth = init.borderBottomWidth ?? 0;
    this.borderLeftWidth = init.borderLeftWidth ?? 0;
    this.borderTopStyle = init.borderTopStyle ?? 'none';
    this.borderRightStyle = init.borderRightStyle ?? 'none';
    this.borderBottomStyle = init.borderBottomStyle ?? 'none';
    this.borderLeftStyle = init.borderLeftStyle ?? 'none';
    this.borderTopColor = init.borderTopColor ?? { r: 0, g: 0, b: 0, a: 0 };
    this.borderRightColor = init.borderRightColor ?? { r: 0, g: 0, b: 0, a: 0 };
    this.borderBottomColor = init.borderBottomColor ?? { r: 0, g: 0, b: 0, a: 0 };
    this.borderLeftColor = init.borderLeftColor ?? { r: 0, g: 0, b: 0, a: 0 };
    this.paddingTop = init.paddingTop ?? 0;
    this.paddingRight = init.paddingRight ?? 0;
    this.paddingBottom = init.paddingBottom ?? 0;
    this.paddingLeft = init.paddingLeft ?? 0;
    this.marginTop = init.marginTop ?? 0;
    this.marginRight = init.marginRight ?? 0;
    this.marginBottom = init.marginBottom ?? 0;
    this.marginLeft = init.marginLeft ?? 0;
    this.tabSize = init.tabSize ?? { value: 8, unit: null };
    this.position = init.position ?? 'static';
    this.width = init.width ?? 'auto';
    this.height = init.height ?? 'auto';
    this.top = init.top ?? 'auto';
    this.right = init.right ?? 'auto';
    this.bottom = init.bottom ?? 'auto';
    this.left = init.left ?? 'auto';
    this.boxSizing = init.boxSizing ?? 'content-box';
    this.textAlign = init.textAlign ?? 'start';
    this.float = init.float ?? 'none';
    this.clear = init.clear ?? 'none';
    this.zIndex = init.zIndex ?? 'auto';
    this.wordBreak = init.wordBreak ?? 'normal';
    this.overflowWrap = init.overflowWrap ?? 'normal';
    this.overflow = init.overflow ?? 'visible';
    this.wordSpacing = init.wordSpacing ?? 'normal';
    this.minWidth = init.minWidth ?? 0;
    this.maxWidth = init.maxWidth ?? 'none';
    this.minHeight = init.minHeight ?? 0;
    this.maxHeight = init.maxHeight ?? 'none';
  }

  blockify() {
    if (this.display.outer === 'inline') {
      this.display = { outer: 'block', inner: this.display.inner };
    }
  }

  getTextAlign(): 'left' | 'right' | 'center' {
    if (this.textAlign === 'start') {
      return this.direction === 'ltr' ? 'left' : 'right';
    }
    if (this.textAlign === 'end') {
      return this.direction === 'ltr' ? 'right' : 'left';
    }
    return this.textAlign;
  }

  isOutOfFlow(): boolean {
    return this.float !== 'none';
  }

  isWsCollapsible(): boolean {
    const ws = this.whiteSpace;
    return ws === 'normal' || ws === 'nowrap' || ws === 'pre-line';
  }

  hasPaddingArea(): boolean {
    return (
      percentGtZero(this.paddingTop) ||
      percentGtZero(this.paddingRight) ||
      percentGtZero(this.paddingBottom) ||
      percentGtZero(this.paddingLeft)
    );
  }

  hasBorderArea(): boolean {
    return (
      (this.borderTopWidth > 0 && this.borderTopStyle !== 'none') ||
      (this.borderRightWidth > 0 && this.borderRightStyle !== 'none') ||
      (this.borderBottomWidth > 0 && this.borderBottomStyle !== 'none') ||
      (this.borderLeftWidth > 0 && this.borderLeftStyle !== 'none')
    );
  }

  hasPaint(): boolean {
    return (
      this.backgroundColor.a > 0 ||
      (this.borderTopWidth > 0 &&
        this.borderTopColor.a > 0 &&
        this.borderTopStyle !== 'none') ||
      (this.borderRightWidth > 0 &&
        this.borderRightColor.a > 0 &&
        this.borderRightStyle !== 'none') ||
      (this.borderBottomWidth > 0 &&
        this.borderBottomColor.a > 0 &&
        this.borderBottomStyle !== 'none') ||
      (this.borderLeftWidth > 0 &&
        this.borderLeftColor.a > 0 &&
        this.borderLeftStyle !== 'none')
    );
  }

  getMarginBlockStart(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].marginBlockStart];
    if (cssVal === 'auto') return cssVal;
    return resolvePercent(containingBlock, cssVal);
  }

  getMarginBlockEnd(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].marginBlockEnd];
    if (cssVal === 'auto') return cssVal;
    return resolvePercent(containingBlock, cssVal);
  }

  getMarginLineLeft(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].marginLineLeft];
    if (cssVal === 'auto') return cssVal;
    return resolvePercent(containingBlock, cssVal);
  }

  getMarginLineRight(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].marginLineRight];
    if (cssVal === 'auto') return cssVal;
    return resolvePercent(containingBlock, cssVal);
  }

  getPaddingBlockStart(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].paddingBlockStart];
    return resolvePercent(containingBlock, cssVal);
  }

  getPaddingBlockEnd(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].paddingBlockEnd];
    return resolvePercent(containingBlock, cssVal);
  }

  getPaddingLineLeft(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].paddingLineLeft];
    return resolvePercent(containingBlock, cssVal);
  }

  getPaddingLineRight(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssVal = this[LogicalMaps[writingMode].paddingLineRight];
    return resolvePercent(containingBlock, cssVal);
  }

  getBorderBlockStartWidth(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssStyleVal = this[LogicalMaps[writingMode].borderBlockStartStyle];
    if (cssStyleVal === 'none') return 0;
    const cssWidthVal = this[LogicalMaps[writingMode].borderBlockStartWidth];
    return resolvePercent(containingBlock, cssWidthVal);
  }

  getBorderBlockEndWidth(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssStyleVal = this[LogicalMaps[writingMode].borderBlockEndStyle];
    if (cssStyleVal === 'none') return 0;
    const cssWidthVal = this[LogicalMaps[writingMode].borderBlockEndWidth];
    return resolvePercent(containingBlock, cssWidthVal);
  }

  getBorderLineLeftWidth(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssStyleVal = this[LogicalMaps[writingMode].borderLineLeftStyle];
    if (cssStyleVal === 'none') return 0;
    const cssWidthVal = this[LogicalMaps[writingMode].borderLineLeftWidth];
    return resolvePercent(containingBlock, cssWidthVal);
  }

  getBorderLineRightWidth(containingBlock: BoxArea): number {
    const writingMode = containingBlock.box.style.writingMode;
    const cssStyleVal = this[LogicalMaps[writingMode].borderLineRightStyle];
    if (cssStyleVal === 'none') return 0;
    const cssWidthVal = this[LogicalMaps[writingMode].borderLineRightWidth];
    return resolvePercent(containingBlock, cssWidthVal);
  }

  getBlockSize(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const prop = LogicalMaps[writingMode].blockSize;
    let cssVal = this[prop];
    if (typeof cssVal === 'object') {
      const parentBlockSize =
        containingBlock[prop as 'width' | 'height'];
      if (parentBlockSize === undefined) return 'auto';
      cssVal = (cssVal.value / 100) * parentBlockSize;
    }
    if (this.boxSizing !== 'content-box' && cssVal !== 'auto') {
      cssVal -=
        this.getPaddingBlockStart(containingBlock) +
        this.getPaddingBlockEnd(containingBlock);
      if (this.boxSizing === 'border-box') {
        cssVal -=
          this.getBorderBlockStartWidth(containingBlock) +
          this.getBorderBlockEndWidth(containingBlock);
      }
      cssVal = Math.max(0, cssVal);
    }
    return cssVal;
  }

  getInlineSize(containingBlock: BoxArea): number | 'auto' {
    const writingMode = containingBlock.box.style.writingMode;
    const prop = LogicalMaps[writingMode].inlineSize;
    let cssVal: number | Percentage | 'auto' = this[prop];
    if (cssVal === 'auto') return 'auto';
    if (typeof cssVal === 'object') {
      const inlineSize = containingBlock[prop as 'width' | 'height'];
      cssVal = (cssVal.value / 100) * inlineSize;
    }
    if (this.boxSizing !== 'content-box') {
      cssVal -=
        this.getPaddingLineLeft(containingBlock) +
        this.getPaddingLineRight(containingBlock);
      if (this.boxSizing === 'border-box') {
        cssVal -=
          this.getBorderLineLeftWidth(containingBlock) +
          this.getBorderLineRightWidth(containingBlock);
      }
      cssVal = Math.max(0, cssVal);
    }
    return cssVal;
  }

  hasLineLeftGap(containingBlock: BoxArea): boolean {
    const writingMode = containingBlock.box.style.writingMode;
    const marginLineLeft = this[LogicalMaps[writingMode].marginLineLeft];
    if (marginLineLeft === 'auto') return false;
    if (typeof marginLineLeft === 'object' && marginLineLeft.value !== 0) return true;
    if (typeof marginLineLeft !== 'object' && marginLineLeft !== 0) return true;
    const paddingLineLeft = this[LogicalMaps[writingMode].paddingLineLeft];
    if (typeof paddingLineLeft === 'object' && paddingLineLeft.value > 0) return true;
    if (typeof paddingLineLeft !== 'object' && paddingLineLeft > 0) return true;
    if (this[LogicalMaps[writingMode].borderLineLeftStyle] === 'none') return false;
    if (this[LogicalMaps[writingMode].borderLineLeftWidth] > 0) return true;
    return false;
  }

  hasLineRightGap(containingBlock: BoxArea): boolean {
    const writingMode = containingBlock.box.style.writingMode;
    const marginLineRight = this[LogicalMaps[writingMode].marginLineRight];
    if (marginLineRight === 'auto') return false;
    if (typeof marginLineRight === 'object' && marginLineRight.value !== 0) return true;
    if (typeof marginLineRight !== 'object' && marginLineRight !== 0) return true;
    const paddingLineRight = this[LogicalMaps[writingMode].paddingLineRight];
    if (typeof paddingLineRight === 'object' && paddingLineRight.value > 0) return true;
    if (typeof paddingLineRight !== 'object' && paddingLineRight > 0) return true;
    if (this[LogicalMaps[writingMode].borderLineRightStyle] === 'none') return false;
    if (this[LogicalMaps[writingMode].borderLineRightWidth] > 0) return true;
    return false;
  }
}

/**
 * Create a child style that inherits from a parent.
 * For anonymous boxes.
 */
export function createChildStyle(parent: Style, overrides: Partial<Style> = {}): Style {
  return new Style({
    // Inherited properties
    zoom: parent.zoom,
    whiteSpace: parent.whiteSpace,
    color: parent.color,
    fontSize: parent.fontSize,
    fontWeight: parent.fontWeight,
    fontVariant: parent.fontVariant,
    fontStyle: parent.fontStyle,
    fontStretch: parent.fontStretch,
    fontFamily: parent.fontFamily,
    lineHeight: parent.lineHeight,
    direction: parent.direction,
    writingMode: parent.writingMode,
    tabSize: parent.tabSize,
    textAlign: parent.textAlign,
    wordBreak: parent.wordBreak,
    overflowWrap: parent.overflowWrap,
    wordSpacing: parent.wordSpacing,
    // Overrides
    ...overrides,
  });
}

export const EMPTY_STYLE = new Style();
