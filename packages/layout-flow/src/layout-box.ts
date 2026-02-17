/**
 * Box model for CSS flow layout
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * Removed DOM references (HTMLElement, TextNode). Layout-only logic preserved.
 */

import { Logger } from './util.js';
import { Style } from './style.js';

import type { Percentage } from './types.js';
import type { InlineMetrics } from './adapters/shaper-interface.js';

// Forward-declared types (to break circular refs with layout-flow.ts)
// These are re-exported from layout-flow.ts
export type Run = import('./layout-text.js').Run;
export type Break = import('./layout-flow.js').Break;
export type Inline = import('./layout-flow.js').Inline;
export type BlockContainer = import('./layout-flow.js').BlockContainer;
export type BlockContainerBase = import('./layout-flow.js').BlockContainerBase;
export type BlockContainerOfInlines = import('./layout-flow.js').BlockContainerOfInlines;
export type BlockContainerOfBlocks = import('./layout-flow.js').BlockContainerOfBlocks;
export type ReplacedBox = import('./layout-flow.js').ReplacedBox;

export interface TreeLogOptions {
  containingBlocks?: boolean;
  css?: keyof Style;
  paragraphText?: string;
  bits?: boolean;
}

export interface PrelayoutContext {
  lastBlockContainerArea: BoxArea;
  lastPositionedArea: BoxArea;
}

// ---------------------------------------------------------------------------
// TreeNode
// ---------------------------------------------------------------------------

export abstract class TreeNode {
  public style: Style;

  constructor(style: Style) {
    this.style = style;
  }

  isBlockContainer(): this is BlockContainerBase {
    return false;
  }

  isBlockContainerOfInlines(): this is BlockContainerOfInlines {
    return false;
  }

  isBlockContainerOfBlocks(): this is BlockContainerOfBlocks {
    return false;
  }

  isFormattingBox(): this is FormattingBox {
    return false;
  }

  isReplacedBox(): this is ReplacedBox {
    return false;
  }

  isRun(): this is Run {
    return false;
  }

  isInline(): this is Inline {
    return false;
  }

  isBreak(): this is Break {
    return false;
  }

  isBox(): this is Box {
    return false;
  }

  abstract logName(log: Logger, options?: TreeLogOptions): void;

  abstract getLogSymbol(): string;

  prelayoutPreorder(_ctx: PrelayoutContext) {
    // should be overridden
  }

  prelayoutPostorder(_layout: Layout, _ctx: PrelayoutContext) {
    // should be overridden
  }

  postlayoutPreorder(_layout: Layout) {
    // should be overridden
  }

  postlayoutPostorder() {
    // should be overridden
  }
}

// ---------------------------------------------------------------------------
// Box
// ---------------------------------------------------------------------------

export abstract class Box extends TreeNode {
  public bitfield: number;
  public treeStart: number;
  public treeFinal: number;
  private area: BoxArea;

  static BITS = {
    // 0..3: misc attributes
    isAnonymous: 1 << 0,
    enableLogging: 1 << 1,
    reserved1: 1 << 2,
    reserved2: 1 << 3,
    // 4..7: propagation bits: Box <- Box
    hasBackgroundInLayer: 1 << 4,
    hasForegroundInLayer: 1 << 5,
    hasBackgroundInDescendent: 1 << 6,
    hasForegroundInDescendent: 1 << 7,
    // 8..9: attributes for BlockContainer
    isInline: 1 << 8,
    isBfcRoot: 1 << 9,
    // 8..13: propagation bits: Inline <- Run
    hasText: 1 << 8,
    hasComplexText: 1 << 9,
    hasSoftHyphen: 1 << 10,
    hasNewlines: 1 << 11,
    hasSoftWrap: 1 << 12,
    hasWordSpacing: 1 << 13,
    // 14..15: propagation bits: Inline <- Inline
    hasPaintedInlines: 1 << 14,
    hasSizedInline: 1 << 15,
    // 16: propagation bits: Inline <- Break, Inline, ReplacedBox
    hasBreakInlineOrReplaced: 1 << 16,
    // 17..18: propagation bits: Inline <- FormattingBox
    hasFloatOrReplaced: 1 << 17,
    hasInlineBlocks: 1 << 18,
  };

  static ATTRS = {
    isAnonymous: Box.BITS.isAnonymous,
    enableLogging: Box.BITS.enableLogging,
  };

  static PROPAGATES_TO_INLINE_BITS = 0xffffff00;

  constructor(style: Style, attrs: number) {
    super(style);
    this.bitfield = attrs;
    this.treeStart = 0;
    this.treeFinal = 0;
    this.area = new BoxArea(this);

    const hasBorder = this.style.hasBorderArea();
    const hasPadding = this.style.hasPaddingArea();
    if (hasBorder && hasPadding) {
      const b = new BoxArea(this);
      const p = new BoxArea(this);
      this.area.setParent(p);
      p.setParent(b);
    } else if (hasBorder || hasPadding) {
      this.area.setParent(new BoxArea(this));
    }
  }

  id() {
    return this.treeStart;
  }

  getBorderArea(): BoxArea {
    const hasBorder = this.style.hasBorderArea();
    const hasPadding = this.style.hasPaddingArea();
    if (hasBorder && hasPadding) {
      return this.area.parent!.parent!;
    } else if (hasBorder || hasPadding) {
      return this.area.parent!;
    } else {
      return this.area;
    }
  }

  getPaddingArea(): BoxArea {
    if (this.style.hasPaddingArea()) {
      return this.area.parent!;
    } else {
      return this.area;
    }
  }

  getContentArea(): BoxArea {
    return this.area;
  }

  getContainingBlock(): BoxArea {
    const containingBlock = this.getBorderArea().parent;
    if (!containingBlock) throw new Error('Assertion failed');
    return containingBlock;
  }

  prelayoutPreorder(ctx: PrelayoutContext) {
    if (this.style.position === 'absolute') {
      this.getBorderArea().setParent(ctx.lastPositionedArea);
    } else {
      this.getBorderArea().setParent(ctx.lastBlockContainerArea);
    }
  }

  fillAreas() {
    const containingBlock = this.getContainingBlock();
    if (this.style.hasBorderArea()) {
      const borderBlockStartWidth =
        this.style.getBorderBlockStartWidth(containingBlock);
      const borderLineLeftWidth =
        this.style.getBorderLineLeftWidth(containingBlock);
      const paddingArea = this.getPaddingArea();
      paddingArea.blockStart = borderBlockStartWidth;
      paddingArea.lineLeft = borderLineLeftWidth;
    }

    if (this.style.hasPaddingArea()) {
      const paddingBlockStart =
        this.style.getPaddingBlockStart(containingBlock);
      const paddingLineLeft =
        this.style.getPaddingLineLeft(containingBlock);
      const contentArea = this.getContentArea();
      contentArea.blockStart = paddingBlockStart;
      contentArea.lineLeft = paddingLineLeft;
    }
  }

  setBlockPosition(position: number) {
    this.getBorderArea().blockStart = position;
  }

  setBlockSize(size: number) {
    this.getContentArea().blockSize = size;
    const containingBlock = this.getContainingBlock();

    if (this.style.hasPaddingArea()) {
      const paddingBlockStart =
        this.style.getPaddingBlockStart(containingBlock);
      const paddingBlockEnd =
        this.style.getPaddingBlockEnd(containingBlock);
      const paddingSize = size + paddingBlockStart + paddingBlockEnd;
      const paddingArea = this.getPaddingArea();
      paddingArea.blockSize = paddingSize;
    }

    if (this.style.hasBorderArea()) {
      const borderBlockStartWidth =
        this.style.getBorderBlockStartWidth(containingBlock);
      const borderBlockEndWidth =
        this.style.getBorderBlockEndWidth(containingBlock);
      const paddingArea = this.getPaddingArea();
      const borderArea = this.getBorderArea();
      const borderSize =
        paddingArea.blockSize + borderBlockStartWidth + borderBlockEndWidth;
      borderArea.blockSize = borderSize;
    }
  }

  setInlinePosition(lineLeft: number) {
    this.getBorderArea().lineLeft = lineLeft;
  }

  setInlineOuterSize(size: number) {
    this.getBorderArea().inlineSize = size;
    const containingBlock = this.getContainingBlock();

    if (this.style.hasBorderArea()) {
      const borderLineLeftWidth =
        this.style.getBorderLineLeftWidth(containingBlock);
      const borderLineRightWidth =
        this.style.getBorderLineRightWidth(containingBlock);
      const paddingSize = size - borderLineLeftWidth - borderLineRightWidth;
      const paddingArea = this.getPaddingArea();
      paddingArea.inlineSize = paddingSize;
    }

    if (this.style.hasPaddingArea()) {
      const paddingLineLeft =
        this.style.getPaddingLineLeft(containingBlock);
      const paddingLineRight =
        this.style.getPaddingLineRight(containingBlock);
      const paddingArea = this.getPaddingArea();
      const contentArea = this.getContentArea();
      const contentSize =
        paddingArea.inlineSize - paddingLineLeft - paddingLineRight;
      contentArea.inlineSize = contentSize;
    }
  }

  getWritingModeAsParticipant() {
    return this.getContainingBlock().box.style.writingMode;
  }

  getDirectionAsParticipant() {
    return this.getContainingBlock().box.style.direction;
  }

  propagate(parent: Box) {
    if (!this.isLayerRoot()) {
      if (this.hasBackground() || this.hasBackgroundInLayerRoot()) {
        parent.bitfield |= Box.BITS.hasBackgroundInLayer;
      }
      if (this.hasForeground() || this.hasForegroundInLayerRoot()) {
        parent.bitfield |= Box.BITS.hasForegroundInLayer;
      }
    }

    if (this.hasBackground() || this.hasBackgroundInDescendent()) {
      parent.bitfield |= Box.BITS.hasBackgroundInDescendent;
    }
    if (this.hasForeground() || this.hasForegroundInDescendent()) {
      parent.bitfield |= Box.BITS.hasForegroundInDescendent;
    }
  }

  isBox(): this is Box {
    return true;
  }

  isAnonymous() {
    return Boolean(this.bitfield & Box.BITS.isAnonymous);
  }

  isPositioned() {
    return this.style.position !== 'static';
  }

  abstract isInlineLevel(): boolean;

  isStackingContextRoot() {
    return this.isPositioned() && this.style.zIndex !== 'auto';
  }

  isLayerRoot(): boolean {
    return (this.isFormattingBox() && this.isFloat()) || this.isPositioned();
  }

  abstract hasBackground(): boolean;
  abstract hasForeground(): boolean;

  hasBackgroundInLayerRoot() {
    return Boolean(this.bitfield & Box.BITS.hasBackgroundInLayer);
  }

  hasForegroundInLayerRoot() {
    return Boolean(this.bitfield & Box.BITS.hasForegroundInLayer);
  }

  hasBackgroundInDescendent() {
    return Boolean(this.bitfield & Box.BITS.hasBackgroundInDescendent);
  }

  hasForegroundInDescendent() {
    return Boolean(this.bitfield & Box.BITS.hasForegroundInDescendent);
  }

  postlayoutPreorder(_layout: Layout) {
    const borderArea = this.getBorderArea();
    if (this.style.position === 'relative') {
      borderArea.x += this.getRelativeHorizontalShift();
      borderArea.y += this.getRelativeVerticalShift();
    }

    borderArea.absolutify();
    if (this.style.hasBorderArea()) this.getPaddingArea().absolutify();
    if (this.style.hasPaddingArea()) this.getContentArea().absolutify();
  }

  postlayoutPostorder() {
    this.getBorderArea().snapPixels();
    if (this.style.hasBorderArea()) this.getPaddingArea().snapPixels();
    if (this.style.hasPaddingArea()) this.getContentArea().snapPixels();
  }

  getRelativeVerticalShift(): number {
    const height = this.getContainingBlock().height;
    let { top, bottom } = this.style;

    if (top !== 'auto') {
      if (typeof top !== 'number')
        top = (height * (top as Percentage).value) / 100;
      return top;
    } else if (bottom !== 'auto') {
      if (typeof bottom !== 'number')
        bottom = (height * (bottom as Percentage).value) / 100;
      return -bottom;
    } else {
      return 0;
    }
  }

  getRelativeHorizontalShift(): number {
    const containingBlock = this.getContainingBlock();
    const direction = containingBlock.getEstablishedDirection();
    const width = containingBlock.width;
    let { right, left } = this.style;

    if (left !== 'auto' && (right === 'auto' || direction === 'ltr')) {
      if (typeof left !== 'number')
        left = (width * (left as Percentage).value) / 100;
      return left;
    } else if (right !== 'auto' && (left === 'auto' || direction === 'rtl')) {
      if (typeof right !== 'number')
        right = (width * (right as Percentage).value) / 100;
      return -right;
    } else {
      return 0;
    }
  }

  logName(log: Logger) {
    log.text('Box');
  }

  getLogSymbol() {
    return '\u25FC\uFE0E';
  }

  stringifyBitfield() {
    const thirty2 = this.bitfield.toString(2);
    let s = '';
    for (let i = thirty2.length - 1; i >= 0; i--) {
      s = thirty2[i] + s;
      if (i > 0 && (s.length - 4) % 5 === 0) s = '_' + s;
    }
    s = '0b' + s;
    return s;
  }
}

// ---------------------------------------------------------------------------
// FormattingBox
// ---------------------------------------------------------------------------

export abstract class FormattingBox extends Box {
  static ATTRS = { ...Box.ATTRS };

  isFormattingBox(): this is FormattingBox {
    return true;
  }

  getDefiniteInnerInlineSize(containingBlock: BoxArea): number | undefined {
    const inlineSize = this.style.getInlineSize(containingBlock);
    if (inlineSize !== 'auto') return inlineSize;
  }

  getDefiniteOuterInlineSize(): number | undefined {
    const containingBlock = this.getContainingBlock();
    const inlineSize = this.getDefiniteInnerInlineSize(containingBlock);
    if (inlineSize !== undefined) {
      const borderLineLeftWidth =
        this.style.getBorderLineLeftWidth(containingBlock);
      const paddingLineLeft =
        this.style.getPaddingLineLeft(containingBlock);
      const paddingLineRight =
        this.style.getPaddingLineRight(containingBlock);
      const borderLineRightWidth =
        this.style.getBorderLineRightWidth(containingBlock);

      return (
        borderLineLeftWidth +
        paddingLineLeft +
        inlineSize +
        paddingLineRight +
        borderLineRightWidth
      );
    }
  }

  getDefiniteInnerBlockSize(): number | undefined {
    const blockSize = this.style.getBlockSize(this.getContainingBlock());
    if (blockSize !== 'auto') return blockSize;
  }

  getMarginsAutoIsZero() {
    const containingBlock = this.getContainingBlock();
    let marginLineLeft = this.style.getMarginLineLeft(containingBlock);
    let marginLineRight = this.style.getMarginLineRight(containingBlock);
    let marginBlockStart = this.style.getMarginBlockStart(containingBlock);
    let marginBlockEnd = this.style.getMarginBlockEnd(containingBlock);

    if (marginBlockStart === 'auto') marginBlockStart = 0;
    if (marginLineRight === 'auto') marginLineRight = 0;
    if (marginBlockEnd === 'auto') marginBlockEnd = 0;
    if (marginLineLeft === 'auto') marginLineLeft = 0;

    return {
      blockStart: marginBlockStart,
      lineRight: marginLineRight,
      blockEnd: marginBlockEnd,
      lineLeft: marginLineLeft,
    };
  }

  canCollapseThrough(_layout: Layout): boolean {
    return false;
  }

  isFloat() {
    return this.style.float !== 'none';
  }

  isOutOfFlow() {
    return this.style.float !== 'none';
  }

  propagate(parent: Box) {
    super.propagate(parent);
    if (this.isFloat()) {
      parent.bitfield |= Box.BITS.hasFloatOrReplaced;
    }
  }

  isInlineLevel() {
    return this.style.display.outer === 'inline';
  }
}

// ---------------------------------------------------------------------------
// BoxArea
// ---------------------------------------------------------------------------

export class BoxArea {
  parent: BoxArea | null;
  box: Box;
  blockStart: number;
  blockSize: number;
  lineLeft: number;
  inlineSize: number;

  constructor(
    box: Box,
    x?: number,
    y?: number,
    w?: number,
    h?: number,
  ) {
    this.parent = null;
    this.box = box;
    this.blockStart = y || 0;
    this.blockSize = h || 0;
    this.lineLeft = x || 0;
    this.inlineSize = w || 0;
  }

  clone() {
    return new BoxArea(
      this.box,
      this.lineLeft,
      this.blockStart,
      this.inlineSize,
      this.blockSize,
    );
  }

  getEstablishedWritingMode() {
    return this.box.style.writingMode;
  }

  getEstablishedDirection() {
    return this.box.style.direction;
  }

  get x() {
    return this.lineLeft;
  }

  set x(x: number) {
    this.lineLeft = x;
  }

  get y() {
    return this.blockStart;
  }

  set y(y: number) {
    this.blockStart = y;
  }

  get width() {
    return this.inlineSize;
  }

  get height() {
    return this.blockSize;
  }

  setParent(p: BoxArea) {
    this.parent = p;
  }

  inlineSizeForPotentiallyOrthogonal(box: FormattingBox): number {
    if (!this.parent) return this.inlineSize;
    if (!this.box.isBlockContainer()) return this.inlineSize;
    if (
      (this.box.getWritingModeAsParticipant() === 'horizontal-tb') !==
      (box.getWritingModeAsParticipant() === 'horizontal-tb')
    ) {
      return this.blockSize;
    } else {
      return this.inlineSize;
    }
  }

  absolutify() {
    if (!this.parent) {
      throw new Error(
        `Cannot absolutify area for ${this.box.id()}, parent was never set`,
      );
    }

    const writingMode = this.parent.getEstablishedWritingMode();
    let x: number, y: number, width: number, height: number;

    if (writingMode === 'vertical-lr') {
      x = this.blockStart;
      y = this.lineLeft;
      width = this.blockSize;
      height = this.inlineSize;
    } else if (writingMode === 'vertical-rl') {
      x = this.parent.width - this.blockStart - this.blockSize;
      y = this.lineLeft;
      width = this.blockSize;
      height = this.inlineSize;
    } else {
      x = this.lineLeft;
      y = this.blockStart;
      width = this.inlineSize;
      height = this.blockSize;
    }

    this.lineLeft = this.parent.x + x;
    this.blockStart = this.parent.y + y;
    this.inlineSize = width;
    this.blockSize = height;
  }

  snapPixels() {
    if (!this.parent) {
      throw new Error(
        `Cannot snap pixels for ${this.box.id()}, parent was never set`,
      );
    }

    const writingMode = this.parent.getEstablishedWritingMode();
    let width: number, height: number;

    if (writingMode === 'vertical-lr' || writingMode === 'vertical-rl') {
      width = this.blockSize;
      height = this.inlineSize;
    } else {
      width = this.inlineSize;
      height = this.blockSize;
    }

    const x = this.lineLeft;
    const y = this.blockStart;
    this.lineLeft = Math.round(this.lineLeft);
    this.blockStart = Math.round(this.blockStart);
    this.inlineSize = Math.round(x + width) - this.lineLeft;
    this.blockSize = Math.round(y + height) - this.blockStart;
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type InlineLevel =
  | Inline
  | Run
  | Break
  | BlockContainer
  | ReplacedBox;

export class Layout {
  tree: InlineLevel[];

  constructor(tree: InlineLevel[]) {
    this.tree = tree;
  }

  root() {
    return this.tree[0] as BlockContainer;
  }
}

// ---------------------------------------------------------------------------
// Pre/Post layout traversals
// ---------------------------------------------------------------------------

export function prelayout(layout: Layout, icb: BoxArea) {
  const parents: (BlockContainerBase | Inline)[] = [];
  const ifcs: BlockContainerOfInlines[] = [];
  const pstack = [icb];
  const bstack = [icb];
  const ctx: PrelayoutContext = {
    lastPositionedArea: icb,
    lastBlockContainerArea: icb,
  };

  for (let i = 0; i < layout.tree.length; i++) {
    const item = layout.tree[i];

    if (item.isBox()) {
      const box = item;
      if (box.isBlockContainerOfInlines()) ifcs.push(box);

      ctx.lastPositionedArea = pstack.at(-1)!;
      ctx.lastBlockContainerArea = bstack.at(-1)!;

      box.prelayoutPreorder(ctx);
      if (box.isBlockContainer()) {
        bstack.push(box.getContentArea());
        if (box.style.position !== 'static') pstack.push(box.getPaddingArea());
      }

      if (box.isBlockContainer() || box.isInline()) {
        parents.push(box);
      } else {
        item.propagate(parents.at(-1)!);
        item.prelayoutPostorder(layout, ctx);
      }
    } else if (item.isRun()) {
      item.propagate(parents.at(-1)!, ifcs.at(-1)!.text);
    } else {
      item.propagate(parents.at(-1)!);
    }

    while (parents.length && parents[parents.length - 1].treeFinal === i) {
      const box = parents.pop()!;

      if (box.isBlockContainerOfInlines()) ifcs.pop();

      if (box.isBlockContainer()) {
        bstack.pop();
        if (box.style.position !== 'static') pstack.pop();
      }
      ctx.lastPositionedArea = pstack.at(-1)!;
      ctx.lastBlockContainerArea = bstack.at(-1)!;

      const parent = parents.at(-1);
      if (parent) box.propagate(parent);
      box.prelayoutPostorder(layout, ctx);
    }
  }
}

export function postlayout(layout: Layout) {
  const parents: (BlockContainerBase | Inline)[] = [];

  for (let i = 0; i < layout.tree.length; i++) {
    const item = layout.tree[i];
    item.postlayoutPreorder(layout);
    if (item.isBlockContainer() || item.isInline()) {
      parents.push(item);
    } else {
      item.postlayoutPostorder();
    }

    while (parents.length && parents[parents.length - 1].treeFinal === i) {
      const box = parents.pop()!;
      box.postlayoutPostorder();
    }
  }
}
