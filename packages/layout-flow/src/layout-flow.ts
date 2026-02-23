/**
 * Block-level flow layout engine
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * Block formatting contexts, margin collapsing, float positioning.
 * DOM dependencies removed. HTML element tree generation removed.
 */

import { binarySearch, Logger } from './util.js';
import { Style, createChildStyle, EMPTY_STYLE } from './style.js';
import {
  Linebox,
  Run,
  collapseWhitespace,
  createIfcBuffer,
  createIfcShapedItems,
  createIfcLineboxes,
  positionIfcItems,
  getIfcContribution,
  sliceIfcRenderText,
  getFontMetrics,
} from './layout-text.js';
import { Box, FormattingBox, TreeNode, Layout } from './layout-box.js';

import type {
  InlineMetrics,
  ShapedItem,
  InlineFragment,
} from './layout-text.js';
import type { BoxArea, PrelayoutContext, InlineLevel } from './layout-box.js';
import type { AllocatedUint16Array, ImageDimensions } from './types.js';

// Re-export for consumers
export type { InlineLevel };

function assumePx(v: unknown): asserts v is number {
  if (typeof v !== 'number') {
    throw new TypeError(
      'The value accessed here has not been reduced to a used value in a ' +
        'context where a used value is expected. Make sure to perform any ' +
        'needed layouts.',
    );
  }
}

function writingModeInlineAxis(style: Style) {
  if (style.writingMode === 'horizontal-tb') {
    return 'horizontal';
  } else {
    return 'vertical';
  }
}

// ---------------------------------------------------------------------------
// LayoutContext
// ---------------------------------------------------------------------------

export interface LayoutContext {
  bfc?: BlockFormattingContext;
}

// ---------------------------------------------------------------------------
// MarginCollapseCollection
// ---------------------------------------------------------------------------

class MarginCollapseCollection {
  private positive: number;
  private negative: number;

  constructor(initialMargin: number = 0) {
    this.positive = 0;
    this.negative = 0;
    this.add(initialMargin);
  }

  add(margin: number) {
    if (margin < 0) {
      this.negative = Math.max(this.negative, -margin);
    } else {
      this.positive = Math.max(this.positive, margin);
    }
    return this;
  }

  get() {
    return this.positive - this.negative;
  }

  clone() {
    const c = new MarginCollapseCollection();
    c.positive = this.positive;
    c.negative = this.negative;
    return c;
  }
}

const EMPTY_MAP: Map<Box, number> = new Map();

// ---------------------------------------------------------------------------
// BlockFormattingContext
// ---------------------------------------------------------------------------

export class BlockFormattingContext {
  public inlineSize: number;
  public fctx?: FloatContext;
  public stack: (BlockContainer | { post: BlockContainer })[];
  public cbBlockStart: number;
  public cbLineLeft: number;
  public cbLineRight: number;
  private sizeStack: number[];
  private offsetStack: number[];
  private last: 'start' | 'end' | null;
  private level: number;
  private hypotheticals: Map<Box, number>;
  private margin: {
    level: number;
    collection: MarginCollapseCollection;
    clearanceAtLevel?: number;
  };

  constructor(inlineSize: number) {
    this.inlineSize = inlineSize;
    this.stack = [];
    this.cbBlockStart = 0;
    this.cbLineLeft = 0;
    this.cbLineRight = 0;
    this.sizeStack = [0];
    this.offsetStack = [0];
    this.last = null;
    this.level = 0;
    this.margin = { level: 0, collection: new MarginCollapseCollection() };
    this.hypotheticals = EMPTY_MAP;
  }

  collapseStart(layout: Layout, box: BlockLevel) {
    const containingBlock = box.getContainingBlock();
    const marginBlockStart = box.style.getMarginBlockStart(containingBlock);
    let floatBottom = 0;
    let clearance = 0;

    assumePx(marginBlockStart);

    if (
      this.fctx &&
      (box.style.clear === 'left' || box.style.clear === 'both')
    ) {
      floatBottom = Math.max(floatBottom, this.fctx.getLeftBottom());
    }

    if (
      this.fctx &&
      (box.style.clear === 'right' || box.style.clear === 'both')
    ) {
      floatBottom = Math.max(floatBottom, this.fctx.getRightBottom());
    }

    if (box.style.clear !== 'none') {
      const hypo = this.margin.collection
        .clone()
        .add(marginBlockStart)
        .get();
      clearance = Math.max(
        clearance,
        floatBottom - (this.cbBlockStart + hypo),
      );
    }

    const adjoinsPrevious = clearance === 0;

    if (adjoinsPrevious) {
      this.margin.collection.add(marginBlockStart);
    } else {
      this.positionBlockContainers();
      const c = floatBottom - this.cbBlockStart;
      this.margin = {
        level: this.level,
        collection: new MarginCollapseCollection(c),
      };
      if (box.canCollapseThrough(layout))
        this.margin.clearanceAtLevel = this.level;
    }
  }

  boxStart(layout: Layout, box: BlockContainer, ctx: LayoutContext) {
    const containingBlock = box.getContainingBlock();
    const { lineLeft, lineRight, blockStart } =
      box.getContainingBlockToContent(containingBlock);
    const paddingBlockStart =
      box.style.getPaddingBlockStart(containingBlock);
    const borderBlockStartWidth =
      box.style.getBorderBlockStartWidth(containingBlock);
    const adjoinsNext =
      paddingBlockStart === 0 && borderBlockStartWidth === 0;

    this.collapseStart(layout, box);

    this.last = 'start';
    this.level += 1;
    this.cbLineLeft += lineLeft;
    this.cbLineRight += lineRight;

    this.stack.push(box);

    if (box.isBlockContainerOfInlines()) {
      this.cbBlockStart += blockStart + this.margin.collection.get();
    }

    this.fctx?.boxStart();

    if (box.isBlockContainerOfInlines()) {
      box.doTextLayout(layout, ctx);
      this.cbBlockStart -= blockStart + this.margin.collection.get();
    }

    if (!adjoinsNext) {
      this.positionBlockContainers();
      this.margin = {
        level: this.level,
        collection: new MarginCollapseCollection(),
      };
    }
  }

  boxEnd(layout: Layout, box: BlockContainer) {
    const containingBlock = box.getContainingBlock();
    const { lineLeft, lineRight } =
      box.getContainingBlockToContent(containingBlock);
    const paddingBlockEnd =
      box.style.getPaddingBlockEnd(containingBlock);
    const borderBlockEndWidth =
      box.style.getBorderBlockEndWidth(containingBlock);
    const marginBlockEnd = box.style.getMarginBlockEnd(containingBlock);
    let adjoins =
      paddingBlockEnd === 0 &&
      borderBlockEndWidth === 0 &&
      (this.margin.clearanceAtLevel == null ||
        this.level > this.margin.clearanceAtLevel);

    assumePx(marginBlockEnd);

    if (adjoins) {
      if (this.last === 'start') {
        adjoins = box.canCollapseThrough(layout);
      } else {
        const blockSize = box.style.getBlockSize(containingBlock);
        adjoins = blockSize === 'auto';
      }
    }

    this.stack.push({ post: box });

    this.level -= 1;
    this.cbLineLeft -= lineLeft;
    this.cbLineRight -= lineRight;

    if (!adjoins) {
      this.positionBlockContainers();
      this.margin = {
        level: this.level,
        collection: new MarginCollapseCollection(),
      };
    }

    if (this.last === 'start') {
      if (this.hypotheticals === EMPTY_MAP) this.hypotheticals = new Map();
      this.hypotheticals.set(box, this.margin.collection.get());
    }

    this.margin.collection.add(marginBlockEnd);
    if (this.level < this.margin.level) this.margin.level = this.level;

    this.last = 'end';
  }

  boxAtomic(layout: Layout, box: BlockLevel) {
    const containingBlock = box.getContainingBlock();
    const marginBlockEnd = box.style.getMarginBlockEnd(containingBlock);
    assumePx(marginBlockEnd);
    this.collapseStart(layout, box);
    this.fctx?.boxStart();
    this.positionBlockContainers();
    box.setBlockPosition(this.cbBlockStart);
    this.margin.collection = new MarginCollapseCollection();
    this.margin.collection.add(marginBlockEnd);
    this.last = 'end';
  }

  getLocalVacancyForLine(
    bfc: BlockFormattingContext,
    blockOffset: number,
    blockSize: number,
    vacancy: IfcVacancy,
  ) {
    let leftInlineSpace = 0;
    let rightInlineSpace = 0;

    if (this.fctx) {
      leftInlineSpace = this.fctx.leftFloats.getOccupiedSpace(
        blockOffset,
        blockSize,
        -this.cbLineLeft,
      );
      rightInlineSpace = this.fctx.rightFloats.getOccupiedSpace(
        blockOffset,
        blockSize,
        -this.cbLineRight,
      );
    }

    vacancy.leftOffset = this.cbLineLeft + leftInlineSpace;
    vacancy.rightOffset = this.cbLineRight + rightInlineSpace;
    vacancy.inlineSize =
      this.inlineSize - vacancy.leftOffset - vacancy.rightOffset;
    vacancy.blockOffset = blockOffset - bfc.cbBlockStart;
    vacancy.leftOffset -= bfc.cbLineLeft;
    vacancy.rightOffset -= bfc.cbLineRight;
  }

  ensureFloatContext(blockOffset: number) {
    return this.fctx || (this.fctx = new FloatContext(this, blockOffset));
  }

  finalize(box: BlockContainer) {
    if (!box.isBfcRoot()) throw new Error('This is for bfc roots only');
    const containingBlock = box.getContainingBlock();
    const blockSize = box.style.getBlockSize(containingBlock);

    this.positionBlockContainers();

    if (blockSize === 'auto') {
      let lineboxHeight = 0;
      if (box.isBlockContainerOfInlines()) {
        lineboxHeight = box.getContentArea().blockSize;
      }
      box.setBlockSize(
        Math.max(
          lineboxHeight,
          this.cbBlockStart,
          this.fctx?.getBothBottom() ?? 0,
        ),
      );
    }
  }

  positionBlockContainers() {
    const sizeStack = this.sizeStack;
    const offsetStack = this.offsetStack;
    const margin = this.margin.collection.get();
    let passedMarginLevel =
      this.margin.level === offsetStack.length - 1;
    let levelNeedsPostOffset = offsetStack.length - 1;

    sizeStack[this.margin.level] += margin;
    this.cbBlockStart += margin;

    for (const item of this.stack) {
      const box = 'post' in item ? item.post : item;

      if ('post' in item) {
        const childSize = sizeStack.pop()!;
        const offset = offsetStack.pop()!;
        const level = sizeStack.length - 1;
        const containingBlock = box.getContainingBlock();
        const sBlockSize = box.style.getBlockSize(containingBlock);

        if (
          sBlockSize === 'auto' &&
          box.isBlockContainerOfBlocks() &&
          !box.isBfcRoot()
        ) {
          box.setBlockSize(childSize);
        }

        const blockSize = box.getBorderArea().blockSize;

        sizeStack[level] += blockSize;
        this.cbBlockStart = offset + blockSize;

        if (level < levelNeedsPostOffset) {
          --levelNeedsPostOffset;
          this.cbBlockStart += margin;
        }
      } else {
        const hypothetical = this.hypotheticals.get(box);
        const level = sizeStack.length - 1;
        let blockOffset = sizeStack[level];

        if (!passedMarginLevel) {
          passedMarginLevel = this.margin.level === level;
        }

        if (!passedMarginLevel) {
          blockOffset += margin;
        }

        if (hypothetical !== undefined) {
          blockOffset -= margin - hypothetical;
        }

        box.setBlockPosition(blockOffset);

        sizeStack.push(0);
        offsetStack.push(this.cbBlockStart);
      }
    }

    this.stack = [];
  }
}

// ---------------------------------------------------------------------------
// FloatSide
// ---------------------------------------------------------------------------

class FloatSide {
  items: BlockLevel[];
  shelfBlockOffset: number;
  shelfTrackIndex: number;
  blockOffsets: number[];
  inlineSizes: number[];
  inlineOffsets: number[];
  floatCounts: number[];

  constructor(blockOffset: number) {
    this.items = [];
    this.shelfBlockOffset = blockOffset;
    this.shelfTrackIndex = 0;
    this.blockOffsets = [blockOffset];
    this.inlineSizes = [0];
    this.inlineOffsets = [0];
    this.floatCounts = [0];
  }

  initialize(blockOffset: number) {
    this.shelfBlockOffset = blockOffset;
    this.blockOffsets = [blockOffset];
  }

  getSizeOfTracks(
    start: number,
    end: number,
    inlineOffset: number,
  ): number {
    let max = 0;
    for (let i = start; i < end; ++i) {
      if (this.floatCounts[i] > 0) {
        max = Math.max(
          max,
          inlineOffset + this.inlineSizes[i] + this.inlineOffsets[i],
        );
      }
    }
    return max;
  }

  getOverflow(): number {
    return this.getSizeOfTracks(0, this.inlineSizes.length, 0);
  }

  getFloatCountOfTracks(start: number, end: number): number {
    let max = 0;
    for (let i = start; i < end; ++i)
      max = Math.max(max, this.floatCounts[i]);
    return max;
  }

  getEndTrack(
    start: number,
    blockOffset: number,
    blockSize: number,
  ): number {
    const blockPosition = blockOffset + blockSize;
    let end = start + 1;
    while (
      end < this.blockOffsets.length &&
      this.blockOffsets[end] < blockPosition
    )
      end++;
    return end;
  }

  getTrackRange(
    blockOffset: number,
    blockSize: number = 0,
  ): [number, number] {
    let start = binarySearch(this.blockOffsets, blockOffset);
    if (this.blockOffsets[start] !== blockOffset) start -= 1;
    return [start, this.getEndTrack(start, blockOffset, blockSize)];
  }

  getOccupiedSpace(
    blockOffset: number,
    blockSize: number,
    inlineOffset: number,
  ): number {
    if (this.items.length === 0) return 0;
    const [start, end] = this.getTrackRange(blockOffset, blockSize);
    return this.getSizeOfTracks(start, end, inlineOffset);
  }

  boxStart(blockOffset: number) {
    this.shelfBlockOffset = blockOffset;
    [this.shelfTrackIndex] = this.getTrackRange(this.shelfBlockOffset);
  }

  dropShelf(blockOffset: number) {
    if (blockOffset > this.shelfBlockOffset) {
      this.shelfBlockOffset = blockOffset;
      [this.shelfTrackIndex] = this.getTrackRange(this.shelfBlockOffset);
    }
  }

  getNextTrackOffset(): number {
    if (this.shelfTrackIndex + 1 < this.blockOffsets.length) {
      return this.blockOffsets[this.shelfTrackIndex + 1];
    } else {
      return this.blockOffsets[this.shelfTrackIndex];
    }
  }

  getBottom(): number {
    return this.blockOffsets[this.blockOffsets.length - 1];
  }

  splitTrack(trackIndex: number, blockOffset: number) {
    const size = this.inlineSizes[trackIndex];
    const offset = this.inlineOffsets[trackIndex];
    const count = this.floatCounts[trackIndex];
    this.blockOffsets.splice(trackIndex + 1, 0, blockOffset);
    this.inlineSizes.splice(trackIndex, 0, size);
    this.inlineOffsets.splice(trackIndex, 0, offset);
    this.floatCounts.splice(trackIndex, 0, count);
  }

  splitIfShelfDropped() {
    if (
      this.blockOffsets[this.shelfTrackIndex] !== this.shelfBlockOffset
    ) {
      this.splitTrack(this.shelfTrackIndex, this.shelfBlockOffset);
      this.shelfTrackIndex += 1;
    }
  }

  placeFloat(
    box: BlockLevel,
    vacancy: IfcVacancy,
    cbLineLeft: number,
    cbLineRight: number,
  ) {
    if (box.style.float === 'none') {
      throw new Error('Tried to place float:none');
    }

    if (vacancy.blockOffset !== this.shelfBlockOffset) {
      throw new Error('Assertion failed');
    }

    this.splitIfShelfDropped();

    const borderArea = box.getBorderArea();
    const startTrack = this.shelfTrackIndex;
    const margins = box.getMarginsAutoIsZero();
    const blockSize =
      borderArea.height + margins.blockStart + margins.blockEnd;
    const blockEndOffset = this.shelfBlockOffset + blockSize;
    let endTrack: number;

    if (blockSize > 0) {
      endTrack = this.getEndTrack(
        startTrack,
        this.shelfBlockOffset,
        blockSize,
      );
      if (this.blockOffsets[endTrack] !== blockEndOffset) {
        this.splitTrack(endTrack - 1, blockEndOffset);
      }
    } else {
      endTrack = startTrack;
    }

    const vcOffset =
      box.style.float === 'left' ? vacancy.leftOffset : vacancy.rightOffset;
    const cbOffset =
      box.style.float === 'left' ? cbLineLeft : cbLineRight;
    const marginOffset =
      box.style.float === 'left' ? margins.lineLeft : margins.lineRight;
    const marginEnd =
      box.style.float === 'left' ? margins.lineRight : margins.lineLeft;

    if (box.style.float === 'left') {
      box.setInlinePosition(vcOffset - cbOffset + marginOffset);
    } else {
      const inlineSize = box.getContainingBlock().inlineSize;
      const size = borderArea.inlineSize;
      box.setInlinePosition(
        inlineSize - size - vcOffset + cbOffset - marginOffset,
      );
    }

    for (let track = startTrack; track < endTrack; track += 1) {
      if (this.floatCounts[track] === 0) {
        this.inlineOffsets[track] = vcOffset;
        this.inlineSizes[track] =
          marginOffset + borderArea.width + marginEnd;
      } else {
        this.inlineSizes[track] =
          vcOffset -
          this.inlineOffsets[track] +
          marginOffset +
          borderArea.width +
          marginEnd;
      }
      this.floatCounts[track] += 1;
    }

    this.items.push(box);
  }
}

// ---------------------------------------------------------------------------
// IfcVacancy
// ---------------------------------------------------------------------------

export class IfcVacancy {
  leftOffset: number;
  rightOffset: number;
  inlineSize: number;
  blockOffset: number;
  leftFloatCount: number;
  rightFloatCount: number;

  static EPSILON = 1 / 64;

  constructor(
    leftOffset: number,
    rightOffset: number,
    blockOffset: number,
    inlineSize: number,
    leftFloatCount: number,
    rightFloatCount: number,
  ) {
    this.leftOffset = leftOffset;
    this.rightOffset = rightOffset;
    this.blockOffset = blockOffset;
    this.inlineSize = inlineSize;
    this.leftFloatCount = leftFloatCount;
    this.rightFloatCount = rightFloatCount;
  }

  fits(inlineSize: number) {
    return inlineSize - this.inlineSize < IfcVacancy.EPSILON;
  }

  hasFloats() {
    return this.leftFloatCount > 0 || this.rightFloatCount > 0;
  }
}

// ---------------------------------------------------------------------------
// FloatContext
// ---------------------------------------------------------------------------

export class FloatContext {
  bfc: BlockFormattingContext;
  leftFloats: FloatSide;
  rightFloats: FloatSide;
  misfits: BlockLevel[];

  constructor(bfc: BlockFormattingContext, blockOffset: number) {
    this.bfc = bfc;
    this.leftFloats = new FloatSide(blockOffset);
    this.rightFloats = new FloatSide(blockOffset);
    this.misfits = [];
  }

  boxStart() {
    this.leftFloats.boxStart(this.bfc.cbBlockStart);
    this.rightFloats.boxStart(this.bfc.cbBlockStart);
  }

  getVacancyForLine(blockOffset: number, blockSize: number) {
    const leftInlineSpace = this.leftFloats.getOccupiedSpace(
      blockOffset,
      blockSize,
      -this.bfc.cbLineLeft,
    );
    const rightInlineSpace = this.rightFloats.getOccupiedSpace(
      blockOffset,
      blockSize,
      -this.bfc.cbLineRight,
    );
    const leftOffset = this.bfc.cbLineLeft + leftInlineSpace;
    const rightOffset = this.bfc.cbLineRight + rightInlineSpace;
    const inlineSize = this.bfc.inlineSize - leftOffset - rightOffset;
    return new IfcVacancy(
      leftOffset,
      rightOffset,
      blockOffset,
      inlineSize,
      0,
      0,
    );
  }

  getVacancyForBox(box: BlockLevel, lineWidth: number) {
    const float = box.style.float;
    const floats = float === 'left' ? this.leftFloats : this.rightFloats;
    const oppositeFloats =
      float === 'left' ? this.rightFloats : this.leftFloats;
    const inlineOffset =
      float === 'left' ? -this.bfc.cbLineLeft : -this.bfc.cbLineRight;
    const oppositeInlineOffset =
      float === 'left' ? -this.bfc.cbLineRight : -this.bfc.cbLineLeft;
    const blockOffset = floats.shelfBlockOffset;
    const blockSize = box.getBorderArea().height;
    const startTrack = floats.shelfTrackIndex;
    const endTrack = floats.getEndTrack(
      startTrack,
      blockOffset,
      blockSize,
    );
    const inlineSpace = floats.getSizeOfTracks(
      startTrack,
      endTrack,
      inlineOffset,
    );
    const [oppositeStartTrack, oppositeEndTrack] =
      oppositeFloats.getTrackRange(blockOffset, blockSize);
    const oppositeInlineSpace = oppositeFloats.getSizeOfTracks(
      oppositeStartTrack,
      oppositeEndTrack,
      oppositeInlineOffset,
    );
    const leftOffset =
      this.bfc.cbLineLeft +
      (float === 'left' ? inlineSpace : oppositeInlineSpace);
    const rightOffset =
      this.bfc.cbLineRight +
      (float === 'right' ? inlineSpace : oppositeInlineSpace);
    const inlineSize =
      this.bfc.inlineSize - leftOffset - rightOffset - lineWidth;
    const floatCount = floats.getFloatCountOfTracks(startTrack, endTrack);
    const oppositeFloatCount = oppositeFloats.getFloatCountOfTracks(
      oppositeStartTrack,
      oppositeEndTrack,
    );
    const leftFloatCount =
      float === 'left' ? floatCount : oppositeFloatCount;
    const rightFloatCount =
      float === 'left' ? oppositeFloatCount : floatCount;

    return new IfcVacancy(
      leftOffset,
      rightOffset,
      blockOffset,
      inlineSize,
      leftFloatCount,
      rightFloatCount,
    );
  }

  getLeftBottom() {
    return this.leftFloats.getBottom();
  }

  getRightBottom() {
    return this.rightFloats.getBottom();
  }

  getBothBottom() {
    return Math.max(
      this.leftFloats.getBottom(),
      this.rightFloats.getBottom(),
    );
  }

  findLinePosition(
    blockOffset: number,
    blockSize: number,
    inlineSize: number,
  ) {
    let [leftShelfIndex] = this.leftFloats.getTrackRange(
      blockOffset,
      blockSize,
    );
    let [rightShelfIndex] = this.rightFloats.getTrackRange(
      blockOffset,
      blockSize,
    );

    while (
      leftShelfIndex < this.leftFloats.inlineSizes.length ||
      rightShelfIndex < this.rightFloats.inlineSizes.length
    ) {
      let leftOff: number, rightOff: number;

      if (leftShelfIndex < this.leftFloats.inlineSizes.length) {
        leftOff = this.leftFloats.blockOffsets[leftShelfIndex];
      } else {
        leftOff = Infinity;
      }

      if (rightShelfIndex < this.rightFloats.inlineSizes.length) {
        rightOff = this.rightFloats.blockOffsets[rightShelfIndex];
      } else {
        rightOff = Infinity;
      }

      blockOffset = Math.max(blockOffset, Math.min(leftOff, rightOff));
      const vacancy = this.getVacancyForLine(blockOffset, blockSize);

      if (inlineSize <= vacancy.inlineSize) return vacancy;

      if (leftOff <= rightOff) leftShelfIndex += 1;
      if (rightOff <= leftOff) rightShelfIndex += 1;
    }

    return this.getVacancyForLine(blockOffset, blockSize);
  }

  placeFloat(
    lineWidth: number,
    lineIsEmpty: boolean,
    box: BlockLevel,
  ) {
    if (box.style.float === 'none') {
      throw new Error('Attempted to place float: none');
    }

    if (this.misfits.length) {
      this.misfits.push(box);
    } else {
      const side =
        box.style.float === 'left' ? this.leftFloats : this.rightFloats;
      const oppositeSide =
        box.style.float === 'left' ? this.rightFloats : this.leftFloats;

      if (box.style.clear === 'left' || box.style.clear === 'both') {
        side.dropShelf(this.leftFloats.getBottom());
      }
      if (box.style.clear === 'right' || box.style.clear === 'both') {
        side.dropShelf(this.rightFloats.getBottom());
      }

      const vacancy = this.getVacancyForBox(box, lineWidth);
      const margins = box.getMarginsAutoIsZero();
      const inlineSize =
        box.getBorderArea().width + margins.lineLeft + margins.lineRight;

      if (
        vacancy.fits(inlineSize) ||
        (lineIsEmpty && !vacancy.hasFloats())
      ) {
        box.setBlockPosition(
          side.shelfBlockOffset +
            margins.blockStart -
            this.bfc.cbBlockStart,
        );
        side.placeFloat(
          box,
          vacancy,
          this.bfc.cbLineLeft,
          this.bfc.cbLineRight,
        );
      } else {
        const vacancy2 = this.getVacancyForBox(box, 0);
        if (!vacancy2.fits(inlineSize)) {
          const count =
            box.style.float === 'left'
              ? vacancy2.leftFloatCount
              : vacancy2.rightFloatCount;
          const oppositeCount =
            box.style.float === 'left'
              ? vacancy2.rightFloatCount
              : vacancy2.leftFloatCount;
          if (count > 0) {
            side.dropShelf(side.getNextTrackOffset());
          } else if (oppositeCount > 0) {
            const [, trackIndex] = oppositeSide.getTrackRange(
              side.shelfBlockOffset,
            );
            if (trackIndex === oppositeSide.blockOffsets.length)
              throw new Error('assertion failed');
            side.dropShelf(oppositeSide.blockOffsets[trackIndex]);
          }
        }

        this.misfits.push(box);
      }
    }
  }

  consumeMisfits() {
    while (this.misfits.length) {
      const misfits = this.misfits;
      this.misfits = [];
      for (const box of misfits) this.placeFloat(0, true, box);
    }
  }

  dropShelf(blockOffset: number) {
    this.leftFloats.dropShelf(blockOffset);
    this.rightFloats.dropShelf(blockOffset);
  }

  postLine(line: Linebox, didBreak: boolean) {
    if (didBreak || this.misfits.length) {
      this.dropShelf(
        this.bfc.cbBlockStart + line.blockOffset + line.height(),
      );
    }
    this.consumeMisfits();
  }

  preTextContent() {
    this.consumeMisfits();
  }
}

// ---------------------------------------------------------------------------
// BlockContainer types
// ---------------------------------------------------------------------------

export type BlockContainer =
  | BlockContainerOfInlines
  | BlockContainerOfBlocks;

export abstract class BlockContainerBase extends FormattingBox {
  static ATTRS = {
    ...FormattingBox.ATTRS,
    isInline: Box.BITS.isInline,
    isBfcRoot: Box.BITS.isBfcRoot,
  };

  getLogSymbol() {
    if (this.isFloat()) {
      return '\u25CB\uFE0E';
    } else if (this.isInlineLevel()) {
      return '\u25AC';
    } else {
      return '\u25FC\uFE0E';
    }
  }

  logName(log: Logger) {
    if (this.isAnonymous()) log.dim();
    if (this.isBfcRoot() || this.isBlockContainerOfInlines()) log.underline();
    log.text(`Block ${this.id()}`);
    log.reset();
  }

  getContainingBlockToContent(containingBlock: BoxArea) {
    const inlineSize =
      containingBlock.inlineSizeForPotentiallyOrthogonal(this);
    const borderBlockStartWidth =
      this.style.getBorderBlockStartWidth(containingBlock);
    const paddingBlockStart =
      this.style.getPaddingBlockStart(containingBlock);
    const borderArea = this.getBorderArea();
    const contentArea = this.getContentArea();
    const bLineLeft = borderArea.lineLeft;
    const blockStart = borderBlockStartWidth + paddingBlockStart;
    const cInlineSize = contentArea.inlineSize;
    const borderLineLeftWidth =
      this.style.getBorderLineLeftWidth(containingBlock);
    const paddingLineLeft =
      this.style.getPaddingLineLeft(containingBlock);
    const lineLeft = bLineLeft + borderLineLeftWidth + paddingLineLeft;
    const lineRight = inlineSize - lineLeft - cInlineSize;

    return { blockStart, lineLeft, lineRight };
  }

  isBlockContainer(): this is BlockContainerBase {
    return true;
  }

  isInlineLevel() {
    return Boolean(this.bitfield & Box.BITS.isInline);
  }

  isBfcRoot() {
    return Boolean(this.bitfield & Box.BITS.isBfcRoot);
  }

  loggingEnabled() {
    return Boolean(this.bitfield & Box.BITS.enableLogging);
  }

  canCollapseThrough(layout: Layout): boolean {
    const blockSize = this.style.getBlockSize(this.getContainingBlock());

    if (blockSize !== 'auto' && blockSize !== 0) return false;

    if (this.isBlockContainerOfInlines()) {
      const child = layout.tree[this.treeStart + 1];
      if (!child.isInline()) throw new Error('Assertion failed');
      return !child.hasText();
    } else if (this.isBlockContainerOfBlocks()) {
      return this.treeFinal === this.treeStart;
    } else {
      throw new Error('Unreachable');
    }
  }

  propagate(parent: Box) {
    super.propagate(parent);
    if (this.isInlineLevel()) {
      parent.bitfield |= Box.BITS.hasInlineBlocks;
    }
  }

  hasBackground() {
    return this.style.hasPaint();
  }

  hasForeground() {
    return false;
  }
}

// ---------------------------------------------------------------------------
// BlockContainerOfInlines
// ---------------------------------------------------------------------------

const EmptyBuffer: AllocatedUint16Array = {
  array: new Uint16Array(),
  destroy: () => {},
};

export class BlockContainerOfInlines extends BlockContainerBase {
  text: string;
  buffer: AllocatedUint16Array;
  items: ShapedItem[];
  lineboxes: Linebox[];
  fragments: Map<Inline, InlineFragment[]>;

  constructor(style: Style, attrs: number) {
    super(style, attrs);
    this.text = '';
    this.buffer = EmptyBuffer;
    this.items = [];
    this.lineboxes = [];
    this.fragments = new Map();
  }

  prelayoutPostorder(layout: Layout, _ctx: PrelayoutContext) {
    if (this.shouldLayoutContent(layout)) {
      const inline = layout.tree[this.treeStart + 1];
      if (!inline.isInline()) throw new Error('Assertion failed');
      this.buffer.destroy();
      this.buffer = createIfcBuffer(this.text);
      this.items = createIfcShapedItems(layout, this, inline);
      this.fragments.clear();
    }
  }

  postlayoutPreorder(layout: Layout) {
    super.postlayoutPreorder(layout);
    this.buffer.destroy();
    this.buffer = EmptyBuffer;
  }

  isBlockContainerOfInlines(): this is BlockContainerOfInlines {
    return true;
  }

  loggingEnabled() {
    return Boolean(this.bitfield & Box.BITS.enableLogging);
  }

  sliceRenderText(
    layout: Layout,
    item: ShapedItem,
    start: number,
    end: number,
  ) {
    return sliceIfcRenderText(layout, this, item, start, end);
  }

  getLineboxHeight() {
    if (this.lineboxes.length) {
      const line = this.lineboxes.at(-1)!;
      return line.blockOffset + line.height();
    } else {
      return 0;
    }
  }

  shouldLayoutContent(layout: Layout) {
    const inline = layout.tree[this.treeStart + 1];
    if (!inline.isInline()) throw new Error('Assertion failed');
    return (
      inline.hasText() ||
      inline.hasSizedInline() ||
      inline.hasFloatOrReplaced() ||
      inline.hasInlineBlocks()
    );
  }

  doTextLayout(layout: Layout, ctx: LayoutContext) {
    const blockSize = this.style.getBlockSize(this.getContainingBlock());
    if (this.shouldLayoutContent(layout)) {
      this.lineboxes = createIfcLineboxes(layout, this, ctx);
      positionIfcItems(layout, this);
    }
    if (blockSize === 'auto') this.setBlockSize(this.getLineboxHeight());
  }
}

// ---------------------------------------------------------------------------
// BlockContainerOfBlocks
// ---------------------------------------------------------------------------

export type BlockLevel = BlockContainer | ReplacedBox;

export class BlockContainerOfBlocks extends BlockContainerBase {
  __isBlockContainerOfBlocks() {
    // needed for TS because otherwise it's equivalent to the base
  }

  isBlockContainerOfBlocks(): this is BlockContainerOfBlocks {
    return true;
  }
}

// ---------------------------------------------------------------------------
// ReplacedBox
// ---------------------------------------------------------------------------

export class ReplacedBox extends FormattingBox {
  src: string;
  private imageDimensions: ImageDimensions | undefined;

  constructor(style: Style, src: string, dimensions?: ImageDimensions) {
    super(style, 0);
    this.src = src;
    this.imageDimensions = dimensions;
  }

  isReplacedBox(): this is ReplacedBox {
    return true;
  }

  logName(log: Logger) {
    log.text('Replaced ' + this.id());
  }

  getLogSymbol() {
    return '\u25FC\uFE0F';
  }

  hasBackground() {
    return this.style.hasPaint();
  }

  hasForeground() {
    return true;
  }

  getIntrinsicIsize(): number {
    return (this.imageDimensions?.width ?? 0) * this.style.zoom;
  }

  getIntrinsicBsize(): number {
    return (this.imageDimensions?.height ?? 0) * this.style.zoom;
  }

  getRatio(): number {
    const dim = this.imageDimensions;
    return dim ? dim.width / dim.height || 1 : 1;
  }

  propagate(parent: Box) {
    super.propagate(parent);
    parent.bitfield |= Box.BITS.hasBreakInlineOrReplaced;
    parent.bitfield |= Box.BITS.hasFloatOrReplaced;
  }

  getDefiniteInnerInlineSize(): number | undefined {
    const containingBlock = this.getContainingBlock();
    const isize = this.style.getInlineSize(containingBlock);
    if (isize === 'auto') {
      const bsize = this.style.getBlockSize(containingBlock);
      if (bsize !== 'auto') {
        return bsize * this.getRatio();
      } else {
        return this.getIntrinsicIsize();
      }
    } else {
      return isize;
    }
  }

  getDefiniteInnerBlockSize(): number | undefined {
    const containingBlock = this.getContainingBlock();
    const bsize = this.style.getBlockSize(containingBlock);

    if (bsize !== 'auto') {
      return bsize;
    } else {
      const isize = this.style.getInlineSize(containingBlock);
      if (isize !== 'auto') {
        return isize / this.getRatio();
      } else {
        return this.getIntrinsicBsize();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Break
// ---------------------------------------------------------------------------

export class Break extends TreeNode {
  isBreak(): this is Break {
    return true;
  }

  getLogSymbol() {
    return '\u23CE';
  }

  logName(log: Logger) {
    log.text('BR');
  }

  propagate(parent: Box) {
    parent.bitfield |= Box.BITS.hasBreakInlineOrReplaced;
  }
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

import { EmptyInlineMetrics } from './adapters/shaper-interface.js';

export class Inline extends Box {
  public nshaped: number;
  public metrics: InlineMetrics;
  public textStart: number;
  public textEnd: number;

  constructor(style: Style, attrs: number) {
    super(style, attrs);
    this.textStart = 0;
    this.textEnd = 0;
    this.treeStart = 0;
    this.treeFinal = 0;
    this.nshaped = 0;
    this.metrics = EmptyInlineMetrics;
  }

  prelayoutPreorder(ctx: PrelayoutContext) {
    super.prelayoutPreorder(ctx);
    this.nshaped = 0;
    this.metrics = getFontMetrics(this);
  }

  propagate(parent: Box) {
    super.propagate(parent);

    if (parent.isInline()) {
      parent.bitfield |= Box.BITS.hasBreakInlineOrReplaced;
      if (
        this.style.backgroundColor.a !== 0 ||
        this.style.hasBorderArea()
      ) {
        parent.bitfield |= Box.BITS.hasPaintedInlines;
      }
      if (
        !parent.hasSizedInline() &&
        (this.hasLineLeftGap() || this.hasLineRightGap())
      ) {
        parent.bitfield |= Box.BITS.hasSizedInline;
      }

      parent.bitfield |= this.bitfield & Box.PROPAGATES_TO_INLINE_BITS;
    }
  }

  hasText() {
    return this.bitfield & Box.BITS.hasText;
  }

  hasSoftWrap() {
    return this.bitfield & Box.BITS.hasSoftWrap;
  }

  hasWordSpacing() {
    return this.bitfield & Box.BITS.hasWordSpacing;
  }

  hasFloatOrReplaced() {
    return this.bitfield & Box.BITS.hasFloatOrReplaced;
  }

  hasBreakOrInlineOrReplaced() {
    return this.bitfield & Box.BITS.hasBreakInlineOrReplaced;
  }

  hasComplexText() {
    return this.bitfield & Box.BITS.hasComplexText;
  }

  hasSoftHyphen() {
    return this.bitfield & Box.BITS.hasSoftHyphen;
  }

  hasNewlines() {
    return this.bitfield & Box.BITS.hasNewlines;
  }

  hasPaintedInlines() {
    return this.bitfield & Box.BITS.hasPaintedInlines;
  }

  hasInlineBlocks() {
    return this.bitfield & Box.BITS.hasInlineBlocks;
  }

  hasSizedInline() {
    return this.bitfield & Box.BITS.hasSizedInline;
  }

  hasLineLeftGap() {
    return this.style.hasLineLeftGap(this.getContainingBlock());
  }

  hasLineRightGap() {
    return this.style.hasLineRightGap(this.getContainingBlock());
  }

  getInlineSideSize(side: 'pre' | 'post'): number {
    const direction = this.getDirectionAsParticipant();
    const containingBlock = this.getContainingBlock();
    if (
      (direction === 'ltr' && side === 'pre') ||
      (direction === 'rtl' && side === 'post')
    ) {
      const marginLineLeft =
        this.style.getMarginLineLeft(containingBlock);
      return (
        (marginLineLeft === 'auto' ? 0 : marginLineLeft) +
        this.style.getBorderLineLeftWidth(containingBlock) +
        this.style.getPaddingLineLeft(containingBlock)
      );
    } else {
      const marginLineRight =
        this.style.getMarginLineRight(containingBlock);
      return (
        (marginLineRight === 'auto' ? 0 : marginLineRight) +
        this.style.getBorderLineRightWidth(containingBlock) +
        this.style.getPaddingLineRight(containingBlock)
      );
    }
  }

  isInline(): this is Inline {
    return true;
  }

  isInlineLevel() {
    return true;
  }

  getLogSymbol() {
    return '\u25AD';
  }

  logName(log: Logger) {
    if (this.isAnonymous()) log.dim();
    log.text(`Inline ${this.id()}`);
    log.reset();
  }

  absolutify() {
    // noop: inlines are painted differently
  }

  hasBackground() {
    return false;
  }

  hasForeground() {
    return this.style.hasPaint();
  }
}

// ---------------------------------------------------------------------------
// Block layout functions
// ---------------------------------------------------------------------------

function doInlineBoxModelForBlockBox(box: BlockLevel) {
  const containingBlock = box.getContainingBlock();
  const cInlineSize =
    box.getContainingBlock().inlineSizeForPotentiallyOrthogonal(box);
  const inlineSize = box.getDefiniteInnerInlineSize(containingBlock);
  let marginLineLeft = box.style.getMarginLineLeft(containingBlock);
  let marginLineRight = box.style.getMarginLineRight(containingBlock);

  if (inlineSize !== undefined) {
    const borderLineLeftWidth =
      box.style.getBorderLineLeftWidth(containingBlock);
    const paddingLineLeft =
      box.style.getPaddingLineLeft(containingBlock);
    const paddingLineRight =
      box.style.getPaddingLineRight(containingBlock);
    const borderLineRightWidth =
      box.style.getBorderLineRightWidth(containingBlock);
    const specifiedInlineSize =
      inlineSize +
      borderLineLeftWidth +
      paddingLineLeft +
      paddingLineRight +
      borderLineRightWidth +
      (marginLineLeft === 'auto' ? 0 : marginLineLeft) +
      (marginLineRight === 'auto' ? 0 : marginLineRight);

    if (specifiedInlineSize > cInlineSize) {
      if (marginLineLeft === 'auto') marginLineLeft = 0;
      if (marginLineRight === 'auto') marginLineRight = 0;
    }

    if (marginLineLeft !== 'auto' && marginLineRight !== 'auto') {
      if (box.getDirectionAsParticipant() === 'ltr') {
        marginLineRight =
          cInlineSize - (specifiedInlineSize - marginLineRight);
      } else {
        marginLineLeft =
          cInlineSize - (specifiedInlineSize - marginLineRight);
      }
    } else {
      if (marginLineLeft === 'auto' && marginLineRight !== 'auto') {
        marginLineLeft = cInlineSize - specifiedInlineSize;
      } else if (marginLineRight === 'auto' && marginLineLeft !== 'auto') {
        marginLineRight = cInlineSize - specifiedInlineSize;
      } else {
        const margin = (cInlineSize - specifiedInlineSize) / 2;
        marginLineLeft = marginLineRight = margin;
      }
    }
  }

  if (inlineSize === undefined) {
    if (marginLineLeft === 'auto') marginLineLeft = 0;
    if (marginLineRight === 'auto') marginLineRight = 0;
  }

  assumePx(marginLineLeft);
  assumePx(marginLineRight);

  box.setInlinePosition(marginLineLeft);
  box.setInlineOuterSize(cInlineSize - marginLineLeft - marginLineRight);
}

function doBlockBoxModelForBlockBox(layout: Layout, box: BlockContainer) {
  const containingBlock = box.getContainingBlock();
  const blockSize = box.style.getBlockSize(containingBlock);

  if (blockSize === 'auto') {
    if (box.canCollapseThrough(layout)) {
      box.setBlockSize(0);
    }
  } else {
    box.setBlockSize(blockSize);
  }
}

function layoutBlockBoxInner(
  layout: Layout,
  box: BlockContainer,
  ctx: LayoutContext,
) {
  const containingBfc = ctx.bfc;
  const cctx = { ...ctx };
  let establishedBfc: BlockFormattingContext | undefined;

  if (box.isBfcRoot()) {
    const inlineSize = box.getContentArea().inlineSize;
    cctx.bfc = new BlockFormattingContext(inlineSize);
    establishedBfc = cctx.bfc;
  }

  containingBfc?.boxStart(layout, box, cctx);

  if (box.isBlockContainerOfInlines()) {
    if (containingBfc) {
      // text layout happens in bfc.boxStart
    } else {
      box.doTextLayout(layout, cctx);
    }
  } else if (box.isBlockContainerOfBlocks()) {
    for (let i = box.treeStart + 1; i <= box.treeFinal; i++) {
      const child = layout.tree[i];
      if (!child.isFormattingBox()) throw new Error('Assertion failed');
      layoutBlockLevelBox(layout, child as BlockLevel, cctx);
      i = child.treeFinal;
    }
  }

  if (establishedBfc) {
    establishedBfc.finalize(box);
  }

  containingBfc?.boxEnd(layout, box);
}

function layoutBlockBox(
  layout: Layout,
  box: BlockContainer,
  ctx: LayoutContext,
) {
  box.fillAreas();
  doInlineBoxModelForBlockBox(box);
  doBlockBoxModelForBlockBox(layout, box);
  layoutBlockBoxInner(layout, box, ctx);
}

function layoutReplacedBox(
  layout: Layout,
  box: ReplacedBox,
  ctx: LayoutContext,
) {
  box.fillAreas();
  doInlineBoxModelForBlockBox(box);
  box.setBlockSize(box.getDefiniteInnerBlockSize() ?? 0);
  ctx.bfc!.boxAtomic(layout, box);
}

export function layoutBlockLevelBox(
  layout: Layout,
  box: BlockLevel,
  ctx: LayoutContext,
) {
  if (box.isBlockContainer()) {
    layoutBlockBox(layout, box, ctx);
  } else {
    layoutReplacedBox(layout, box, ctx);
  }
}

function doInlineBoxModelForFloatBox(
  box: BlockLevel,
  inlineSize: number,
) {
  box.setInlineOuterSize(inlineSize);
}

function doBlockBoxModelForFloatBox(box: BlockLevel) {
  const size = box.getDefiniteInnerBlockSize();
  if (size !== undefined) box.setBlockSize(size);
}

export function layoutContribution(
  layout: Layout,
  box: BlockLevel,
  mode: 'min-content' | 'max-content',
): number {
  const containingBlock = box.getContainingBlock();
  const marginLineLeft = box.style.getMarginLineLeft(containingBlock);
  const marginLineRight = box.style.getMarginLineRight(containingBlock);
  const borderLineLeftWidth =
    box.style.getBorderLineLeftWidth(containingBlock);
  const paddingLineLeft = box.style.getPaddingLineLeft(containingBlock);
  const paddingLineRight = box.style.getPaddingLineRight(containingBlock);
  const borderLineRightWidth =
    box.style.getBorderLineRightWidth(containingBlock);
  let isize = box.style.getInlineSize(containingBlock);
  let contribution =
    (marginLineLeft === 'auto' ? 0 : marginLineLeft) +
    borderLineLeftWidth +
    paddingLineLeft +
    paddingLineRight +
    borderLineRightWidth +
    (marginLineRight === 'auto' ? 0 : marginLineRight);

  if (isize === 'auto') {
    if (box.isReplacedBox()) {
      isize = box.getIntrinsicIsize();
    } else {
      isize = 0;
      if (box.isBlockContainerOfBlocks()) {
        for (let i = box.treeStart + 1; i <= box.treeFinal; i++) {
          const child = layout.tree[i];
          if (!child.isFormattingBox()) throw new Error('Assertion failed');
          isize = Math.max(isize, layoutContribution(layout, child as BlockLevel, mode));
          i = child.treeFinal;
        }
      } else {
        if (box.shouldLayoutContent(layout)) {
          isize = getIfcContribution(layout, box, mode);
        }
      }
    }
  }

  contribution += isize;
  return contribution;
}

export function layoutFloatBox(
  layout: Layout,
  box: BlockLevel,
  ctx: LayoutContext,
) {
  const cctx: LayoutContext = { ...ctx, bfc: undefined };
  const containingBlock = box.getContainingBlock();
  box.fillAreas();

  let inlineSize = box.getDefiniteOuterInlineSize();

  if (inlineSize === undefined) {
    const minContent = layoutContribution(layout, box, 'min-content');
    const maxContent = layoutContribution(layout, box, 'max-content');
    const availableSpace = box.getContainingBlock().inlineSize;
    const marginLineLeft = box.style.getMarginLineLeft(containingBlock);
    const marginLineRight = box.style.getMarginLineRight(containingBlock);
    inlineSize = Math.max(minContent, Math.min(maxContent, availableSpace));
    if (marginLineLeft !== 'auto') inlineSize -= marginLineLeft;
    if (marginLineRight !== 'auto') inlineSize -= marginLineRight;
  }

  doInlineBoxModelForFloatBox(box, inlineSize);
  doBlockBoxModelForFloatBox(box);
  if (box.isBlockContainer()) {
    layoutBlockBoxInner(layout, box, cctx);
  }
}
