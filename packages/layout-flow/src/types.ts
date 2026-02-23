/**
 * Shared types for @xstudio/layout-flow
 *
 * Forked from dropflow (chearon/dropflow) - Copyright 2024 Caleb Hearon, MIT License
 * Extracted and re-defined types to remove dom.ts, style.ts, api.ts dependencies.
 */

// ---------------------------------------------------------------------------
// CSS Value Types
// ---------------------------------------------------------------------------

export type Percentage = { value: number; unit: '%' };
export type NumberValue = { value: number; unit: null };

export type WhiteSpace = 'normal' | 'nowrap' | 'pre-wrap' | 'pre-line' | 'pre';
export type FontWeight = number | 'normal' | 'bold' | 'bolder' | 'lighter';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontVariant = 'normal' | 'small-caps';
export type FontStretch =
  | 'normal'
  | 'ultra-condensed'
  | 'extra-condensed'
  | 'condensed'
  | 'semi-condensed'
  | 'semi-expanded'
  | 'expanded'
  | 'extra-expanded'
  | 'ultra-expanded';

export type VerticalAlign =
  | 'baseline'
  | 'middle'
  | 'sub'
  | 'super'
  | 'text-top'
  | 'text-bottom'
  | number
  | Percentage
  | 'top'
  | 'bottom';

export type BackgroundClip = 'border-box' | 'padding-box' | 'content-box';
export type Direction = 'ltr' | 'rtl';
export type WritingMode = 'horizontal-tb' | 'vertical-lr' | 'vertical-rl';
export type Position = 'absolute' | 'relative' | 'static';
export type Color = { r: number; g: number; b: number; a: number };
export type OuterDisplay = 'inline' | 'block' | 'none';
export type InnerDisplay = 'flow' | 'flow-root' | 'none';
export type Display = { outer: OuterDisplay; inner: InnerDisplay };
export type BorderStyle =
  | 'none'
  | 'hidden'
  | 'dotted'
  | 'dashed'
  | 'solid'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset';
export type BoxSizing = 'border-box' | 'content-box' | 'padding-box';
export type TextAlign = 'start' | 'end' | 'left' | 'right' | 'center';
export type Float = 'left' | 'right' | 'none';
export type Clear = 'left' | 'right' | 'both' | 'none';

// ---------------------------------------------------------------------------
// Image Dimensions (for replaced elements)
// ---------------------------------------------------------------------------

export interface ImageDimensions {
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Allocated Buffer Interface (replaces HarfBuzz AllocatedUint16Array)
// ---------------------------------------------------------------------------

export interface AllocatedUint16Array {
  array: Uint16Array;
  destroy(): void;
}
