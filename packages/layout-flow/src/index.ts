/**
 * @xstudio/layout-flow - CSS Block Flow Layout Engine
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 *
 * Provides CSS block formatting context layout (margin collapsing, floats,
 * inline formatting) without DOM or HarfBuzz dependencies.
 *
 * Text shaping is abstracted behind the TextShaper interface
 * (see adapters/shaper-interface.ts). Connect a concrete adapter in Phase 2.
 */

// -- Types ------------------------------------------------------------------

export type {
  Percentage,
  NumberValue,
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
  OuterDisplay,
  InnerDisplay,
  Display,
  BorderStyle,
  BoxSizing,
  TextAlign,
  Float,
  Clear,
  ImageDimensions,
  AllocatedUint16Array,
} from './types.js';

// -- Adapters ---------------------------------------------------------------

export type {
  FontFaceInfo,
  FontMetrics,
  InlineMetrics,
  ShapingAttrs,
  TextShaper,
  LineBreakResult,
  LineBreaker,
  LineBreakerFactory,
  GraphemeBreaker,
} from './adapters/shaper-interface.js';

export {
  EmptyInlineMetrics,
  G_ID,
  G_CL,
  G_AX,
  G_AY,
  G_DX,
  G_DY,
  G_FL,
  G_SZ,
} from './adapters/shaper-interface.js';

// -- Style ------------------------------------------------------------------

export { Style, createChildStyle, EMPTY_STYLE } from './style.js';

// -- Util -------------------------------------------------------------------

export { binarySearch, binarySearchOf, Logger } from './util.js';

// -- Box Model --------------------------------------------------------------

export {
  TreeNode,
  Box,
  FormattingBox,
  BoxArea,
  Layout,
  prelayout,
  postlayout,
} from './layout-box.js';

export type {
  TreeLogOptions,
  PrelayoutContext,
  InlineLevel,
} from './layout-box.js';

// -- Text Layout ------------------------------------------------------------

export {
  Linebox,
  Run,
  ShapedItem,
  collapseWhitespace,
  isSpaceOrTabOrNewline,
  getFontMetrics,
  createIfcBuffer,
  createIfcShapedItems,
  createIfcLineboxes,
  positionIfcItems,
  getIfcContribution,
  sliceIfcRenderText,
  setTextShaper,
  getTextShaper,
} from './layout-text.js';

export type { InlineFragment } from './layout-text.js';

// -- CanvasKit Shaper Adapter -----------------------------------------------

export {
  CanvasKitFontFace,
  CanvasKitShaper,
  createCanvasKitShaper,
} from './adapters/canvaskit-shaper.js';

export type { CanvasKitMinimal } from './adapters/canvaskit-shaper.js';

// -- Flow Layout (Block Formatting Context) ---------------------------------

export {
  BlockFormattingContext,
  FloatContext,
  IfcVacancy,
  BlockContainerBase,
  BlockContainerOfInlines,
  BlockContainerOfBlocks,
  ReplacedBox,
  Break,
  Inline,
  layoutBlockLevelBox,
  layoutContribution,
  layoutFloatBox,
} from './layout-flow.js';

export type {
  LayoutContext,
  BlockContainer,
  BlockLevel,
} from './layout-flow.js';

// -- XStudio Adapter --------------------------------------------------------

export {
  calculateBlockLayout,
  elementStyleToDropflowStyle,
  buildBoxTree,
  boxAreaToComputedLayout,
} from './adapters/xstudio-adapter.js';

export type {
  XElement,
  XComputedLayout,
  XLayoutContext,
} from './adapters/xstudio-adapter.js';
