//! Binary protocol decoder for Taffy style data.
//!
//! Decodes a compact binary representation of node style trees into
//! `taffy::Style` structs, bypassing JSON serialization entirely.
//!
//! # Binary format overview
//!
//! ```text
//! Global header:
//!   [magic: u8 × 4 = [0x54, 0x41, 0x46, 0x46] "TAFF"]
//!   [version: u8 = 1]
//!   [nodeCount: u32 LE]
//!
//! Per-node block (variable length, one per node in topological order):
//!   [presenceBitmap: u64 LE]   — bit i=1 means field i is present
//!   [childCount: u16 LE]
//!   [childIndices: u16 LE × childCount]
//!   [gridJsonLen: u16 LE]      — 0 means no grid sideband JSON
//!   [gridJson: u8 × gridJsonLen] — UTF-8 JSON for grid track data
//!   [fields: variable]         — field values in bitmap bit order (low→high)
//! ```
//!
//! Field IDs (bit positions) are defined in the `field_id` module.
//!
//! # Grid sideband JSON
//!
//! When `gridJsonLen > 0`, the JSON object contains:
//! ```json
//! {
//!   "gridTemplateColumns": ["1fr", "100px", ...],
//!   "gridTemplateRows":    ["auto", ...],
//!   "gridAutoColumns":     [...],
//!   "gridAutoRows":        [...]
//! }
//! ```
//! Parsed using `taffy_bridge::parse_track_as_template` and
//! `taffy_bridge::parse_track_sizing`.

use taffy::prelude::*;
use taffy::style::Overflow;

use crate::taffy_bridge::{parse_track_as_template, parse_track_sizing};

// ─── Magic constant ───────────────────────────────────────────────────

/// ASCII bytes for "TAFF". Written directly as a byte sequence to avoid
/// endianness ambiguity with u32 representations.
const MAGIC: [u8; 4] = [0x54, 0x41, 0x46, 0x46];

/// Protocol version this decoder understands.
const VERSION: u8 = 1;

// ─── Field ID constants ───────────────────────────────────────────────

/// Bit-position constants for the 64-bit presence bitmap.
///
/// Each constant names a field and its position (0-based) in the u64 bitmap.
/// A bit value of 1 means the field's bytes are present in the stream.
pub mod field_id {
    // Enum fields (1 byte each)
    pub const DISPLAY: u8 = 0;
    pub const POSITION: u8 = 1;
    pub const OVERFLOW_X: u8 = 2;
    pub const OVERFLOW_Y: u8 = 3;
    pub const FLEX_DIRECTION: u8 = 4;
    pub const FLEX_WRAP: u8 = 5;
    pub const JUSTIFY_CONTENT: u8 = 6;
    pub const JUSTIFY_ITEMS: u8 = 7;
    pub const ALIGN_ITEMS: u8 = 8;
    pub const ALIGN_CONTENT: u8 = 9;
    pub const ALIGN_SELF: u8 = 10;
    pub const JUSTIFY_SELF: u8 = 11;
    pub const GRID_AUTO_FLOW: u8 = 12;

    // f32 direct fields (4 bytes each)
    pub const FLEX_GROW: u8 = 13;
    pub const FLEX_SHRINK: u8 = 14;
    pub const ASPECT_RATIO: u8 = 15;

    // Dimension fields (5 bytes: tag u8 + f32 LE)
    pub const WIDTH: u8 = 16;
    pub const HEIGHT: u8 = 17;
    pub const MIN_WIDTH: u8 = 18;
    pub const MIN_HEIGHT: u8 = 19;
    pub const MAX_WIDTH: u8 = 20;
    pub const MAX_HEIGHT: u8 = 21;
    pub const FLEX_BASIS: u8 = 22;

    // LPA fields (5 bytes: tag u8 + f32 LE)
    pub const MARGIN_TOP: u8 = 23;
    pub const MARGIN_RIGHT: u8 = 24;
    pub const MARGIN_BOTTOM: u8 = 25;
    pub const MARGIN_LEFT: u8 = 26;
    pub const INSET_TOP: u8 = 27;
    pub const INSET_RIGHT: u8 = 28;
    pub const INSET_BOTTOM: u8 = 29;
    pub const INSET_LEFT: u8 = 30;

    // LP fields (5 bytes: tag u8 + f32 LE)
    pub const PADDING_TOP: u8 = 31;
    pub const PADDING_RIGHT: u8 = 32;
    pub const PADDING_BOTTOM: u8 = 33;
    pub const PADDING_LEFT: u8 = 34;
    pub const BORDER_TOP: u8 = 35;
    pub const BORDER_RIGHT: u8 = 36;
    pub const BORDER_BOTTOM: u8 = 37;
    pub const BORDER_LEFT: u8 = 38;
    pub const COLUMN_GAP: u8 = 39;
    pub const ROW_GAP: u8 = 40;

    // Grid placement fields (3 bytes: tag u8 + i16 LE)
    pub const GRID_COLUMN_START: u8 = 41;
    pub const GRID_COLUMN_END: u8 = 42;
    pub const GRID_ROW_START: u8 = 43;
    pub const GRID_ROW_END: u8 = 44;

    /// Total number of defined field IDs.
    pub const FIELD_COUNT: u8 = 45;
}

// ─── Decoded output ───────────────────────────────────────────────────

/// A single decoded node: a Taffy style and its child indices (into the
/// decoded batch array, topological order — leaves first).
#[derive(Debug)]
pub struct DecodedNode {
    pub style: Style,
    pub children: Vec<usize>,
}

// ─── Cursor ───────────────────────────────────────────────────────────

/// A byte-slice cursor that tracks the read position and produces
/// descriptive error messages on underflow.
struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    /// Number of bytes remaining.
    #[inline]
    fn remaining(&self) -> usize {
        self.data.len().saturating_sub(self.pos)
    }

    /// Read exactly `n` bytes, advancing the cursor.
    fn read_bytes(&mut self, n: usize) -> Result<&'a [u8], String> {
        if self.remaining() < n {
            return Err(format!(
                "binary_protocol: unexpected EOF at offset {} — need {} bytes, have {}",
                self.pos,
                n,
                self.remaining()
            ));
        }
        let slice = &self.data[self.pos..self.pos + n];
        self.pos += n;
        Ok(slice)
    }

    fn read_u8(&mut self) -> Result<u8, String> {
        let b = self.read_bytes(1)?;
        Ok(b[0])
    }

    fn read_u16_le(&mut self) -> Result<u16, String> {
        let b = self.read_bytes(2)?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }

    fn read_u32_le(&mut self) -> Result<u32, String> {
        let b = self.read_bytes(4)?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    fn read_u64_le(&mut self) -> Result<u64, String> {
        let b = self.read_bytes(8)?;
        Ok(u64::from_le_bytes([
            b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
        ]))
    }

    fn read_i16_le(&mut self) -> Result<i16, String> {
        let b = self.read_bytes(2)?;
        Ok(i16::from_le_bytes([b[0], b[1]]))
    }

    fn read_f32_le(&mut self) -> Result<f32, String> {
        let b = self.read_bytes(4)?;
        Ok(f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }
}

// ─── Value decoders ───────────────────────────────────────────────────

/// Decode a `Dimension` from (tag: u8, value: f32 LE).
///
/// Tags: 0=auto, 1=length(px), 2=percent(0.0–1.0 already normalized).
fn decode_dimension(cur: &mut Cursor) -> Result<Dimension, String> {
    let tag = cur.read_u8()?;
    let value = cur.read_f32_le()?;
    Ok(match tag {
        0 => Dimension::auto(),
        1 => Dimension::length(value),
        2 => Dimension::percent(value),
        _ => Dimension::auto(),
    })
}

/// Decode a `LengthPercentageAuto` from (tag: u8, value: f32 LE).
///
/// Tags: 0=auto, 1=length, 2=percent.
fn decode_lpa(cur: &mut Cursor) -> Result<LengthPercentageAuto, String> {
    let tag = cur.read_u8()?;
    let value = cur.read_f32_le()?;
    Ok(match tag {
        0 => LengthPercentageAuto::auto(),
        1 => LengthPercentageAuto::length(value),
        2 => LengthPercentageAuto::percent(value),
        _ => LengthPercentageAuto::auto(),
    })
}

/// Decode a `LengthPercentage` from (tag: u8, value: f32 LE).
///
/// Tags: 1=length, 2=percent (no auto for padding/border/gap).
fn decode_lp(cur: &mut Cursor) -> Result<LengthPercentage, String> {
    let tag = cur.read_u8()?;
    let value = cur.read_f32_le()?;
    Ok(match tag {
        1 => LengthPercentage::length(value),
        2 => LengthPercentage::percent(value),
        _ => LengthPercentage::length(0.0),
    })
}

/// Decode a `GridPlacement` from (tag: u8, value: i16 LE).
///
/// Tags: 0=auto, 1=line(i16), 2=span(u16 cast from i16).
fn decode_grid_placement(cur: &mut Cursor) -> Result<GridPlacement, String> {
    let tag = cur.read_u8()?;
    let value = cur.read_i16_le()?;
    Ok(match tag {
        0 => GridPlacement::Auto,
        1 => GridPlacement::from_line_index(value),
        2 => GridPlacement::Span(value as u16),
        _ => GridPlacement::Auto,
    })
}

// ─── Grid sideband JSON ───────────────────────────────────────────────

/// Minimal deserialization target for grid sideband JSON.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct GridJson {
    #[serde(default)]
    grid_template_columns: Vec<String>,
    #[serde(default)]
    grid_template_rows: Vec<String>,
    #[serde(default)]
    grid_auto_columns: Vec<String>,
    #[serde(default)]
    grid_auto_rows: Vec<String>,
}

/// Parse grid sideband JSON bytes and apply the track definitions to `style`.
fn apply_grid_json(style: &mut Style, json_bytes: &[u8]) -> Result<(), String> {
    let text = core::str::from_utf8(json_bytes)
        .map_err(|e| format!("binary_protocol: grid JSON is not valid UTF-8: {e}"))?;
    let grid: GridJson = serde_json::from_str(text)
        .map_err(|e| format!("binary_protocol: grid JSON parse error: {e}"))?;

    if !grid.grid_template_columns.is_empty() {
        style.grid_template_columns = grid
            .grid_template_columns
            .iter()
            .map(|s| parse_track_as_template(s))
            .collect();
    }
    if !grid.grid_template_rows.is_empty() {
        style.grid_template_rows = grid
            .grid_template_rows
            .iter()
            .map(|s| parse_track_as_template(s))
            .collect();
    }
    if !grid.grid_auto_columns.is_empty() {
        style.grid_auto_columns = grid
            .grid_auto_columns
            .iter()
            .map(|s| parse_track_sizing(s))
            .collect();
    }
    if !grid.grid_auto_rows.is_empty() {
        style.grid_auto_rows = grid
            .grid_auto_rows
            .iter()
            .map(|s| parse_track_sizing(s))
            .collect();
    }
    Ok(())
}

// ─── Node decoder ─────────────────────────────────────────────────────

/// Decode a single node from the cursor.
///
/// Reads presence bitmap, child indices, optional grid JSON, then all
/// present field values in bitmap bit order (low to high).
fn decode_node(cur: &mut Cursor, node_index: usize) -> Result<DecodedNode, String> {
    // ── Presence bitmap ──────────────────────────────────────────────
    let bitmap = cur.read_u64_le().map_err(|e| {
        format!("node[{node_index}]: failed to read presence bitmap: {e}")
    })?;

    // ── Child indices ─────────────────────────────────────────────────
    let child_count = cur.read_u16_le().map_err(|e| {
        format!("node[{node_index}]: failed to read childCount: {e}")
    })? as usize;

    let mut children = Vec::with_capacity(child_count);
    for c in 0..child_count {
        let idx = cur.read_u16_le().map_err(|e| {
            format!("node[{node_index}]: failed to read child[{c}] index: {e}")
        })? as usize;
        children.push(idx);
    }

    // ── Grid sideband JSON ────────────────────────────────────────────
    let grid_json_len = cur.read_u16_le().map_err(|e| {
        format!("node[{node_index}]: failed to read gridJsonLen: {e}")
    })? as usize;

    let grid_json_bytes: Option<&[u8]> = if grid_json_len > 0 {
        let bytes = cur.read_bytes(grid_json_len).map_err(|e| {
            format!("node[{node_index}]: failed to read gridJson ({grid_json_len} bytes): {e}")
        })?;
        Some(bytes)
    } else {
        None
    };

    // ── Field values ──────────────────────────────────────────────────
    let mut style = Style::DEFAULT;

    // Helper: check if bit `id` is set in the bitmap.
    let has = |id: u8| -> bool { (bitmap >> id) & 1 == 1 };

    // ── Enum fields (1 byte each) ─────────────────────────────────────
    if has(field_id::DISPLAY) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].display: {e}"))?;
        style.display = match v {
            0 => Display::Flex,
            1 => Display::Grid,
            2 => Display::Block,
            3 => Display::None,
            _ => Display::Flex,
        };
    }

    if has(field_id::POSITION) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].position: {e}"))?;
        style.position = match v {
            0 => Position::Relative,
            1 => Position::Absolute,
            _ => Position::Relative,
        };
    }

    if has(field_id::OVERFLOW_X) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].overflowX: {e}"))?;
        style.overflow.x = decode_overflow(v);
    }

    if has(field_id::OVERFLOW_Y) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].overflowY: {e}"))?;
        style.overflow.y = decode_overflow(v);
    }

    if has(field_id::FLEX_DIRECTION) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].flexDirection: {e}"))?;
        style.flex_direction = match v {
            0 => FlexDirection::Row,
            1 => FlexDirection::Column,
            2 => FlexDirection::RowReverse,
            3 => FlexDirection::ColumnReverse,
            _ => FlexDirection::Row,
        };
    }

    if has(field_id::FLEX_WRAP) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].flexWrap: {e}"))?;
        style.flex_wrap = match v {
            0 => FlexWrap::NoWrap,
            1 => FlexWrap::Wrap,
            2 => FlexWrap::WrapReverse,
            _ => FlexWrap::NoWrap,
        };
    }

    if has(field_id::JUSTIFY_CONTENT) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].justifyContent: {e}"))?;
        style.justify_content = Some(match v {
            0 => JustifyContent::Start,
            1 => JustifyContent::End,
            2 => JustifyContent::Center,
            3 => JustifyContent::SpaceBetween,
            4 => JustifyContent::SpaceAround,
            5 => JustifyContent::SpaceEvenly,
            6 => JustifyContent::Stretch,
            _ => JustifyContent::Start,
        });
    }

    if has(field_id::JUSTIFY_ITEMS) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].justifyItems: {e}"))?;
        // justifyItems uses AlignItems type in Taffy 0.9
        style.justify_items = Some(decode_align_items(v));
    }

    if has(field_id::ALIGN_ITEMS) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].alignItems: {e}"))?;
        style.align_items = Some(decode_align_items(v));
    }

    if has(field_id::ALIGN_CONTENT) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].alignContent: {e}"))?;
        style.align_content = Some(match v {
            0 => AlignContent::Start,
            1 => AlignContent::End,
            2 => AlignContent::Center,
            3 => AlignContent::Stretch,
            4 => AlignContent::SpaceBetween,
            5 => AlignContent::SpaceAround,
            6 => AlignContent::SpaceEvenly,
            _ => AlignContent::Stretch,
        });
    }

    if has(field_id::ALIGN_SELF) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].alignSelf: {e}"))?;
        // 0 = auto → None; 1-5 = explicit values
        style.align_self = decode_align_self_opt(v);
    }

    if has(field_id::JUSTIFY_SELF) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].justifySelf: {e}"))?;
        style.justify_self = decode_align_self_opt(v);
    }

    if has(field_id::GRID_AUTO_FLOW) {
        let v = cur.read_u8().map_err(|e| format!("node[{node_index}].gridAutoFlow: {e}"))?;
        style.grid_auto_flow = match v {
            0 => GridAutoFlow::Row,
            1 => GridAutoFlow::Column,
            2 => GridAutoFlow::RowDense,
            3 => GridAutoFlow::ColumnDense,
            _ => GridAutoFlow::Row,
        };
    }

    // ── f32 direct fields (4 bytes each) ─────────────────────────────
    if has(field_id::FLEX_GROW) {
        style.flex_grow = cur.read_f32_le().map_err(|e| format!("node[{node_index}].flexGrow: {e}"))?;
    }

    if has(field_id::FLEX_SHRINK) {
        style.flex_shrink = cur.read_f32_le().map_err(|e| format!("node[{node_index}].flexShrink: {e}"))?;
    }

    if has(field_id::ASPECT_RATIO) {
        let v = cur.read_f32_le().map_err(|e| format!("node[{node_index}].aspectRatio: {e}"))?;
        style.aspect_ratio = Some(v);
    }

    // ── Dimension fields (5 bytes each) ──────────────────────────────
    if has(field_id::WIDTH) {
        style.size.width = decode_dimension(cur).map_err(|e| format!("node[{node_index}].width: {e}"))?;
    }
    if has(field_id::HEIGHT) {
        style.size.height = decode_dimension(cur).map_err(|e| format!("node[{node_index}].height: {e}"))?;
    }
    if has(field_id::MIN_WIDTH) {
        style.min_size.width = decode_dimension(cur).map_err(|e| format!("node[{node_index}].minWidth: {e}"))?;
    }
    if has(field_id::MIN_HEIGHT) {
        style.min_size.height = decode_dimension(cur).map_err(|e| format!("node[{node_index}].minHeight: {e}"))?;
    }
    if has(field_id::MAX_WIDTH) {
        style.max_size.width = decode_dimension(cur).map_err(|e| format!("node[{node_index}].maxWidth: {e}"))?;
    }
    if has(field_id::MAX_HEIGHT) {
        style.max_size.height = decode_dimension(cur).map_err(|e| format!("node[{node_index}].maxHeight: {e}"))?;
    }
    if has(field_id::FLEX_BASIS) {
        style.flex_basis = decode_dimension(cur).map_err(|e| format!("node[{node_index}].flexBasis: {e}"))?;
    }

    // ── LPA fields: margin + inset (5 bytes each) ─────────────────────
    if has(field_id::MARGIN_TOP) {
        style.margin.top = decode_lpa(cur).map_err(|e| format!("node[{node_index}].marginTop: {e}"))?;
    }
    if has(field_id::MARGIN_RIGHT) {
        style.margin.right = decode_lpa(cur).map_err(|e| format!("node[{node_index}].marginRight: {e}"))?;
    }
    if has(field_id::MARGIN_BOTTOM) {
        style.margin.bottom = decode_lpa(cur).map_err(|e| format!("node[{node_index}].marginBottom: {e}"))?;
    }
    if has(field_id::MARGIN_LEFT) {
        style.margin.left = decode_lpa(cur).map_err(|e| format!("node[{node_index}].marginLeft: {e}"))?;
    }
    if has(field_id::INSET_TOP) {
        style.inset.top = decode_lpa(cur).map_err(|e| format!("node[{node_index}].insetTop: {e}"))?;
    }
    if has(field_id::INSET_RIGHT) {
        style.inset.right = decode_lpa(cur).map_err(|e| format!("node[{node_index}].insetRight: {e}"))?;
    }
    if has(field_id::INSET_BOTTOM) {
        style.inset.bottom = decode_lpa(cur).map_err(|e| format!("node[{node_index}].insetBottom: {e}"))?;
    }
    if has(field_id::INSET_LEFT) {
        style.inset.left = decode_lpa(cur).map_err(|e| format!("node[{node_index}].insetLeft: {e}"))?;
    }

    // ── LP fields: padding + border + gap (5 bytes each) ─────────────
    if has(field_id::PADDING_TOP) {
        style.padding.top = decode_lp(cur).map_err(|e| format!("node[{node_index}].paddingTop: {e}"))?;
    }
    if has(field_id::PADDING_RIGHT) {
        style.padding.right = decode_lp(cur).map_err(|e| format!("node[{node_index}].paddingRight: {e}"))?;
    }
    if has(field_id::PADDING_BOTTOM) {
        style.padding.bottom = decode_lp(cur).map_err(|e| format!("node[{node_index}].paddingBottom: {e}"))?;
    }
    if has(field_id::PADDING_LEFT) {
        style.padding.left = decode_lp(cur).map_err(|e| format!("node[{node_index}].paddingLeft: {e}"))?;
    }
    if has(field_id::BORDER_TOP) {
        style.border.top = decode_lp(cur).map_err(|e| format!("node[{node_index}].borderTop: {e}"))?;
    }
    if has(field_id::BORDER_RIGHT) {
        style.border.right = decode_lp(cur).map_err(|e| format!("node[{node_index}].borderRight: {e}"))?;
    }
    if has(field_id::BORDER_BOTTOM) {
        style.border.bottom = decode_lp(cur).map_err(|e| format!("node[{node_index}].borderBottom: {e}"))?;
    }
    if has(field_id::BORDER_LEFT) {
        style.border.left = decode_lp(cur).map_err(|e| format!("node[{node_index}].borderLeft: {e}"))?;
    }
    if has(field_id::COLUMN_GAP) {
        style.gap.width = decode_lp(cur).map_err(|e| format!("node[{node_index}].columnGap: {e}"))?;
    }
    if has(field_id::ROW_GAP) {
        style.gap.height = decode_lp(cur).map_err(|e| format!("node[{node_index}].rowGap: {e}"))?;
    }

    // ── Grid placement fields (3 bytes each) ─────────────────────────
    if has(field_id::GRID_COLUMN_START) {
        let placement = decode_grid_placement(cur)
            .map_err(|e| format!("node[{node_index}].gridColumnStart: {e}"))?;
        style.grid_column = Line {
            start: placement,
            end: style.grid_column.end,
        };
    }
    if has(field_id::GRID_COLUMN_END) {
        let placement = decode_grid_placement(cur)
            .map_err(|e| format!("node[{node_index}].gridColumnEnd: {e}"))?;
        style.grid_column = Line {
            start: style.grid_column.start,
            end: placement,
        };
    }
    if has(field_id::GRID_ROW_START) {
        let placement = decode_grid_placement(cur)
            .map_err(|e| format!("node[{node_index}].gridRowStart: {e}"))?;
        style.grid_row = Line {
            start: placement,
            end: style.grid_row.end,
        };
    }
    if has(field_id::GRID_ROW_END) {
        let placement = decode_grid_placement(cur)
            .map_err(|e| format!("node[{node_index}].gridRowEnd: {e}"))?;
        style.grid_row = Line {
            start: style.grid_row.start,
            end: placement,
        };
    }

    // ── Apply grid sideband ───────────────────────────────────────────
    if let Some(json_bytes) = grid_json_bytes {
        apply_grid_json(&mut style, json_bytes)
            .map_err(|e| format!("node[{node_index}]: {e}"))?;
    }

    Ok(DecodedNode { style, children })
}

// ─── Small decode helpers ─────────────────────────────────────────────

#[inline]
fn decode_overflow(v: u8) -> Overflow {
    match v {
        0 => Overflow::Visible,
        1 => Overflow::Hidden,
        2 => Overflow::Clip,
        3 => Overflow::Scroll,
        _ => Overflow::Visible,
    }
}

#[inline]
fn decode_align_items(v: u8) -> AlignItems {
    match v {
        0 => AlignItems::Start,
        1 => AlignItems::End,
        2 => AlignItems::Center,
        3 => AlignItems::Stretch,
        4 => AlignItems::Baseline,
        _ => AlignItems::Stretch,
    }
}

/// Decode an `Option<AlignSelf>`: 0=None (auto), 1–5=explicit.
#[inline]
fn decode_align_self_opt(v: u8) -> Option<AlignSelf> {
    match v {
        0 => None, // auto
        1 => Some(AlignSelf::Start),
        2 => Some(AlignSelf::End),
        3 => Some(AlignSelf::Center),
        4 => Some(AlignSelf::Stretch),
        5 => Some(AlignSelf::Baseline),
        _ => None,
    }
}

// ─── Public API ───────────────────────────────────────────────────────

/// Decode a binary-encoded batch of nodes into `DecodedNode` structs.
///
/// Nodes are stored in topological order (leaves first, root last).
/// Each `DecodedNode.children` contains indices into the returned Vec.
///
/// # Errors
///
/// Returns `Err(String)` on:
/// - Magic mismatch (not a TAFF binary)
/// - Unsupported version
/// - Buffer underflow (truncated data)
/// - Invalid UTF-8 in grid JSON
/// - JSON parse error in grid sideband
pub fn decode_batch_binary(data: &[u8]) -> Result<Vec<DecodedNode>, String> {
    let mut cur = Cursor::new(data);

    // ── Global header ─────────────────────────────────────────────────
    let magic = cur
        .read_bytes(4)
        .map_err(|_| "binary_protocol: buffer too short for magic".to_string())?;

    if magic != MAGIC {
        return Err(format!(
            "binary_protocol: invalid magic {:02X} {:02X} {:02X} {:02X} (expected 54 41 46 46)",
            magic[0], magic[1], magic[2], magic[3]
        ));
    }

    let version = cur
        .read_u8()
        .map_err(|_| "binary_protocol: buffer too short for version".to_string())?;

    if version != VERSION {
        return Err(format!(
            "binary_protocol: unsupported version {version} (expected {VERSION})"
        ));
    }

    let node_count = cur
        .read_u32_le()
        .map_err(|_| "binary_protocol: buffer too short for nodeCount".to_string())?
        as usize;

    // ── Nodes ─────────────────────────────────────────────────────────
    let mut nodes = Vec::with_capacity(node_count);
    for i in 0..node_count {
        let node = decode_node(&mut cur, i)?;
        nodes.push(node);
    }

    Ok(nodes)
}

// ─── Test helpers (encode side) ───────────────────────────────────────
//
// These are compiled only in test mode. They provide a minimal binary
// encoder so the tests can produce valid TAFF buffers without relying on
// the TypeScript encoder.

#[cfg(test)]
pub(crate) mod encode {
    use super::field_id;

    /// A builder for constructing a single TAFF node's binary representation.
    ///
    /// Fields are stored as `(bit_id, bytes)` pairs. `build()` sorts them by
    /// `bit_id` (ascending) before serialising so that the byte stream matches
    /// the decoder's bitmap-bit-order traversal exactly, regardless of the
    /// order the builder methods are called.
    pub struct NodeEncoder {
        bitmap: u64,
        children: Vec<u16>,
        grid_json: Vec<u8>,
        /// Each entry: (field_id bit position, encoded bytes for that field).
        fields: Vec<(u8, Vec<u8>)>,
    }

    impl NodeEncoder {
        pub fn new() -> Self {
            Self {
                bitmap: 0,
                children: Vec::new(),
                grid_json: Vec::new(),
                fields: Vec::new(),
            }
        }

        fn add_field(&mut self, id: u8, bytes: Vec<u8>) {
            self.bitmap |= 1u64 << id;
            self.fields.push((id, bytes));
        }

        pub fn children(mut self, indices: &[u16]) -> Self {
            self.children = indices.to_vec();
            self
        }

        pub fn grid_json(mut self, json: &str) -> Self {
            self.grid_json = json.as_bytes().to_vec();
            self
        }

        // ── Enum fields (1 byte each) ─────────────────────────────────

        pub fn display(mut self, v: u8) -> Self {
            self.add_field(field_id::DISPLAY, vec![v]);
            self
        }

        pub fn position(mut self, v: u8) -> Self {
            self.add_field(field_id::POSITION, vec![v]);
            self
        }

        pub fn overflow_x(mut self, v: u8) -> Self {
            self.add_field(field_id::OVERFLOW_X, vec![v]);
            self
        }

        pub fn overflow_y(mut self, v: u8) -> Self {
            self.add_field(field_id::OVERFLOW_Y, vec![v]);
            self
        }

        pub fn flex_direction(mut self, v: u8) -> Self {
            self.add_field(field_id::FLEX_DIRECTION, vec![v]);
            self
        }

        pub fn flex_wrap(mut self, v: u8) -> Self {
            self.add_field(field_id::FLEX_WRAP, vec![v]);
            self
        }

        pub fn justify_content(mut self, v: u8) -> Self {
            self.add_field(field_id::JUSTIFY_CONTENT, vec![v]);
            self
        }

        pub fn justify_items(mut self, v: u8) -> Self {
            self.add_field(field_id::JUSTIFY_ITEMS, vec![v]);
            self
        }

        pub fn align_items(mut self, v: u8) -> Self {
            self.add_field(field_id::ALIGN_ITEMS, vec![v]);
            self
        }

        pub fn align_content(mut self, v: u8) -> Self {
            self.add_field(field_id::ALIGN_CONTENT, vec![v]);
            self
        }

        pub fn align_self(mut self, v: u8) -> Self {
            self.add_field(field_id::ALIGN_SELF, vec![v]);
            self
        }

        pub fn justify_self(mut self, v: u8) -> Self {
            self.add_field(field_id::JUSTIFY_SELF, vec![v]);
            self
        }

        pub fn grid_auto_flow(mut self, v: u8) -> Self {
            self.add_field(field_id::GRID_AUTO_FLOW, vec![v]);
            self
        }

        // ── f32 direct (4 bytes each) ─────────────────────────────────

        pub fn flex_grow(mut self, v: f32) -> Self {
            self.add_field(field_id::FLEX_GROW, v.to_le_bytes().to_vec());
            self
        }

        pub fn flex_shrink(mut self, v: f32) -> Self {
            self.add_field(field_id::FLEX_SHRINK, v.to_le_bytes().to_vec());
            self
        }

        pub fn aspect_ratio(mut self, v: f32) -> Self {
            self.add_field(field_id::ASPECT_RATIO, v.to_le_bytes().to_vec());
            self
        }

        // ── Dimension helpers (tag u8 + f32 LE = 5 bytes) ─────────────

        fn dim_bytes(tag: u8, value: f32) -> Vec<u8> {
            let mut b = vec![tag];
            b.extend_from_slice(&value.to_le_bytes());
            b
        }

        pub fn width(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::WIDTH, Self::dim_bytes(tag, value));
            self
        }

        pub fn height(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::HEIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn min_width(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MIN_WIDTH, Self::dim_bytes(tag, value));
            self
        }

        pub fn min_height(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MIN_HEIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn max_width(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MAX_WIDTH, Self::dim_bytes(tag, value));
            self
        }

        pub fn max_height(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MAX_HEIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn flex_basis(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::FLEX_BASIS, Self::dim_bytes(tag, value));
            self
        }

        // ── LPA (margin + inset) ──────────────────────────────────────

        pub fn margin_top(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MARGIN_TOP, Self::dim_bytes(tag, value));
            self
        }

        pub fn margin_right(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MARGIN_RIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn margin_bottom(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MARGIN_BOTTOM, Self::dim_bytes(tag, value));
            self
        }

        pub fn margin_left(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::MARGIN_LEFT, Self::dim_bytes(tag, value));
            self
        }

        pub fn inset_top(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::INSET_TOP, Self::dim_bytes(tag, value));
            self
        }

        pub fn inset_right(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::INSET_RIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn inset_bottom(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::INSET_BOTTOM, Self::dim_bytes(tag, value));
            self
        }

        pub fn inset_left(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::INSET_LEFT, Self::dim_bytes(tag, value));
            self
        }

        // ── LP (padding + border + gap) ───────────────────────────────

        pub fn padding_top(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::PADDING_TOP, Self::dim_bytes(tag, value));
            self
        }

        pub fn padding_right(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::PADDING_RIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn padding_bottom(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::PADDING_BOTTOM, Self::dim_bytes(tag, value));
            self
        }

        pub fn padding_left(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::PADDING_LEFT, Self::dim_bytes(tag, value));
            self
        }

        pub fn border_top(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::BORDER_TOP, Self::dim_bytes(tag, value));
            self
        }

        pub fn border_right(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::BORDER_RIGHT, Self::dim_bytes(tag, value));
            self
        }

        pub fn border_bottom(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::BORDER_BOTTOM, Self::dim_bytes(tag, value));
            self
        }

        pub fn border_left(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::BORDER_LEFT, Self::dim_bytes(tag, value));
            self
        }

        pub fn column_gap(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::COLUMN_GAP, Self::dim_bytes(tag, value));
            self
        }

        pub fn row_gap(mut self, tag: u8, value: f32) -> Self {
            self.add_field(field_id::ROW_GAP, Self::dim_bytes(tag, value));
            self
        }

        // ── Grid placement (tag u8 + i16 LE = 3 bytes) ────────────────

        fn placement_bytes(tag: u8, value: i16) -> Vec<u8> {
            let mut b = vec![tag];
            b.extend_from_slice(&value.to_le_bytes());
            b
        }

        pub fn grid_column_start(mut self, tag: u8, value: i16) -> Self {
            self.add_field(field_id::GRID_COLUMN_START, Self::placement_bytes(tag, value));
            self
        }

        pub fn grid_column_end(mut self, tag: u8, value: i16) -> Self {
            self.add_field(field_id::GRID_COLUMN_END, Self::placement_bytes(tag, value));
            self
        }

        pub fn grid_row_start(mut self, tag: u8, value: i16) -> Self {
            self.add_field(field_id::GRID_ROW_START, Self::placement_bytes(tag, value));
            self
        }

        pub fn grid_row_end(mut self, tag: u8, value: i16) -> Self {
            self.add_field(field_id::GRID_ROW_END, Self::placement_bytes(tag, value));
            self
        }

        /// Serialise this node to bytes (without global header).
        ///
        /// Fields are emitted in ascending bit-position order so that the byte
        /// stream matches the decoder's bitmap-traversal order regardless of
        /// the order the builder methods were called.
        pub fn build(mut self) -> Vec<u8> {
            // Sort fields by bit position (ascending) to match decoder traversal.
            self.fields.sort_by_key(|(id, _)| *id);

            let mut out = Vec::new();
            out.extend_from_slice(&self.bitmap.to_le_bytes());
            out.extend_from_slice(&(self.children.len() as u16).to_le_bytes());
            for &c in &self.children {
                out.extend_from_slice(&c.to_le_bytes());
            }
            out.extend_from_slice(&(self.grid_json.len() as u16).to_le_bytes());
            out.extend_from_slice(&self.grid_json);
            for (_, bytes) in &self.fields {
                out.extend_from_slice(bytes);
            }
            out
        }
    }

    /// Build a complete TAFF binary buffer from a slice of pre-encoded node bytes.
    pub fn build_taff(nodes: &[Vec<u8>]) -> Vec<u8> {
        let mut out = Vec::new();
        // Magic "TAFF"
        out.extend_from_slice(&[0x54, 0x41, 0x46, 0x46]);
        // Version
        out.push(1u8);
        // Node count
        out.extend_from_slice(&(nodes.len() as u32).to_le_bytes());
        for node_bytes in nodes {
            out.extend_from_slice(node_bytes);
        }
        out
    }
}

// ─── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use super::encode::{NodeEncoder, build_taff};

    /// Encode a simple flex row node with width=200px, height=100px,
    /// flexDirection=row, justifyContent=center, alignItems=center,
    /// then decode and verify all fields round-trip correctly.
    #[test]
    fn test_decode_simple_flex() {
        // display=flex(0), flexDirection=row(0), justifyContent=center(2),
        // alignItems=center(2), width=length(200), height=length(100)
        let node_bytes = NodeEncoder::new()
            .display(0)           // flex
            .flex_direction(0)    // row
            .justify_content(2)   // center
            .align_items(2)       // center
            .width(1, 200.0)      // tag=1 length, 200px
            .height(1, 100.0)     // tag=1 length, 100px
            .build();

        let buf = build_taff(&[node_bytes]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        assert_eq!(decoded.len(), 1, "should decode exactly 1 node");

        let style = &decoded[0].style;
        assert!(
            decoded[0].children.is_empty(),
            "leaf node should have no children"
        );

        assert_eq!(style.display, Display::Flex, "display should be Flex");
        assert_eq!(
            style.flex_direction,
            FlexDirection::Row,
            "flexDirection should be Row"
        );
        assert_eq!(
            style.justify_content,
            Some(JustifyContent::Center),
            "justifyContent should be Center"
        );
        assert_eq!(
            style.align_items,
            Some(AlignItems::Center),
            "alignItems should be Center"
        );
        assert_eq!(
            style.size.width,
            Dimension::length(200.0),
            "width should be 200px"
        );
        assert_eq!(
            style.size.height,
            Dimension::length(100.0),
            "height should be 100px"
        );
    }

    /// Test all three Dimension tags (auto / px / percent) and all three
    /// LengthPercentageAuto tags (auto / length / percent) for margin.
    /// Also verifies that a node with children records them correctly.
    #[test]
    fn test_decode_dimension_types() {
        // Leaf 0: width=auto, height=50%
        let leaf0 = NodeEncoder::new()
            .width(0, 0.0)    // auto (value ignored)
            .height(2, 0.5)   // percent 50% (stored as 0.5)
            .build();

        // Leaf 1: width=150px, min_width=10%, max_width=auto
        let leaf1 = NodeEncoder::new()
            .width(1, 150.0)  // length 150px
            .min_width(2, 0.1) // percent 10%
            .max_width(0, 0.0) // auto
            .build();

        // Container node (index 2): margin_top=auto, margin_left=length(16),
        // margin_right=percent(0.05), children=[0,1]
        let container = NodeEncoder::new()
            .children(&[0, 1])
            .display(0)          // flex
            .margin_top(0, 0.0)  // auto
            .margin_left(1, 16.0) // length 16px
            .margin_right(2, 0.05) // percent 5%
            .build();

        let buf = build_taff(&[leaf0, leaf1, container]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        assert_eq!(decoded.len(), 3);

        // Leaf 0 checks
        let s0 = &decoded[0].style;
        assert_eq!(s0.size.width, Dimension::auto(), "leaf0 width should be auto");
        assert_eq!(
            s0.size.height,
            Dimension::percent(0.5),
            "leaf0 height should be 50%"
        );

        // Leaf 1 checks
        let s1 = &decoded[1].style;
        assert_eq!(
            s1.size.width,
            Dimension::length(150.0),
            "leaf1 width should be 150px"
        );
        assert_eq!(
            s1.min_size.width,
            Dimension::percent(0.1),
            "leaf1 minWidth should be 10%"
        );
        assert_eq!(
            s1.max_size.width,
            Dimension::auto(),
            "leaf1 maxWidth should be auto"
        );

        // Container checks
        let s2 = &decoded[2].style;
        assert_eq!(decoded[2].children, vec![0, 1], "container children should be [0,1]");
        assert_eq!(s2.display, Display::Flex, "container display should be Flex");
        assert_eq!(
            s2.margin.top,
            LengthPercentageAuto::auto(),
            "marginTop should be auto"
        );
        assert_eq!(
            s2.margin.left,
            LengthPercentageAuto::length(16.0),
            "marginLeft should be 16px"
        );
        assert_eq!(
            s2.margin.right,
            LengthPercentageAuto::percent(0.05),
            "marginRight should be 5%"
        );
    }

    /// Test grid placement encoding/decoding: auto, line index, span.
    #[test]
    fn test_decode_grid_placement() {
        let node_bytes = NodeEncoder::new()
            .display(1)              // grid
            .grid_column_start(0, 0) // auto
            .grid_column_end(1, 3)   // line index 3
            .grid_row_start(2, 2)    // span 2
            .grid_row_end(0, 0)      // auto
            .build();

        let buf = build_taff(&[node_bytes]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        let style = &decoded[0].style;
        assert_eq!(style.display, Display::Grid);
        assert_eq!(
            style.grid_column.start,
            GridPlacement::Auto,
            "grid_column.start should be auto"
        );
        assert_eq!(
            style.grid_column.end,
            GridPlacement::from_line_index(3),
            "grid_column.end should be line 3"
        );
        assert_eq!(
            style.grid_row.start,
            GridPlacement::Span(2),
            "grid_row.start should be span 2"
        );
        assert_eq!(
            style.grid_row.end,
            GridPlacement::Auto,
            "grid_row.end should be auto"
        );
    }

    /// Test that the grid sideband JSON is parsed into track definitions.
    #[test]
    fn test_decode_grid_json_sideband() {
        let grid_json = r#"{"gridTemplateColumns":["1fr","1fr","1fr"],"gridTemplateRows":["auto"],"gridAutoColumns":[],"gridAutoRows":[]}"#;
        let node_bytes = NodeEncoder::new()
            .display(1) // grid
            .grid_json(grid_json)
            .build();

        let buf = build_taff(&[node_bytes]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        let style = &decoded[0].style;
        assert_eq!(style.display, Display::Grid);
        assert_eq!(
            style.grid_template_columns.len(),
            3,
            "should have 3 template columns"
        );
        assert_eq!(
            style.grid_template_rows.len(),
            1,
            "should have 1 template row"
        );
    }

    /// Test error cases: invalid magic, truncated buffer, wrong version.
    #[test]
    fn test_decode_error_invalid_magic() {
        // Wrong magic bytes
        let buf = [0x00, 0x00, 0x00, 0x00, 1u8, 0, 0, 0, 0];
        let result = decode_batch_binary(&buf);
        assert!(result.is_err(), "invalid magic should return Err");
        let msg = result.unwrap_err();
        assert!(
            msg.contains("invalid magic"),
            "error message should mention 'invalid magic', got: {msg}"
        );
    }

    #[test]
    fn test_decode_error_wrong_version() {
        let mut buf = Vec::new();
        buf.extend_from_slice(&[0x54, 0x41, 0x46, 0x46]); // correct magic
        buf.push(99u8); // wrong version
        buf.extend_from_slice(&0u32.to_le_bytes()); // nodeCount=0
        let result = decode_batch_binary(&buf);
        assert!(result.is_err(), "wrong version should return Err");
        let msg = result.unwrap_err();
        assert!(
            msg.contains("unsupported version"),
            "error message should mention 'unsupported version', got: {msg}"
        );
    }

    #[test]
    fn test_decode_error_truncated() {
        // Valid magic + version + nodeCount=1, but no node data
        let mut buf = Vec::new();
        buf.extend_from_slice(&[0x54, 0x41, 0x46, 0x46]);
        buf.push(1u8);
        buf.extend_from_slice(&1u32.to_le_bytes()); // nodeCount=1
        // No node bytes follow — should fail reading presence bitmap
        let result = decode_batch_binary(&buf);
        assert!(result.is_err(), "truncated buffer should return Err");
    }

    /// Test LP fields (padding, border, gap) and align_self/justify_self.
    #[test]
    fn test_decode_lp_and_align_self() {
        let node_bytes = NodeEncoder::new()
            .padding_top(1, 8.0)     // length 8px
            .padding_right(2, 0.1)   // percent 10%
            .border_top(1, 2.0)      // length 2px
            .column_gap(1, 12.0)     // length 12px
            .row_gap(2, 0.02)        // percent 2%
            .align_self(3)           // center
            .justify_self(0)         // auto → None
            .build();

        let buf = build_taff(&[node_bytes]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        let style = &decoded[0].style;
        assert_eq!(style.padding.top, LengthPercentage::length(8.0));
        assert_eq!(style.padding.right, LengthPercentage::percent(0.1));
        assert_eq!(style.border.top, LengthPercentage::length(2.0));
        assert_eq!(style.gap.width, LengthPercentage::length(12.0));
        assert_eq!(style.gap.height, LengthPercentage::percent(0.02));
        assert_eq!(style.align_self, Some(AlignSelf::Center));
        assert_eq!(style.justify_self, None, "justify_self=0 should be None (auto)");
    }

    /// Test flex item properties: flexGrow, flexShrink, flexBasis, aspectRatio.
    #[test]
    fn test_decode_flex_item_properties() {
        let node_bytes = NodeEncoder::new()
            .flex_grow(2.0)
            .flex_shrink(0.5)
            .flex_basis(1, 100.0) // length 100px
            .aspect_ratio(16.0 / 9.0)
            .build();

        let buf = build_taff(&[node_bytes]);
        let decoded = decode_batch_binary(&buf).expect("decode should succeed");

        let style = &decoded[0].style;
        assert!((style.flex_grow - 2.0).abs() < f32::EPSILON);
        assert!((style.flex_shrink - 0.5).abs() < f32::EPSILON);
        assert_eq!(style.flex_basis, Dimension::length(100.0));
        assert!(
            style.aspect_ratio.is_some(),
            "aspect_ratio should be Some"
        );
        let ar = style.aspect_ratio.unwrap();
        assert!((ar - 16.0 / 9.0).abs() < 1e-5, "aspect_ratio should be ~1.777");
    }

    /// Test that an empty batch (nodeCount=0) decodes to an empty Vec.
    #[test]
    fn test_decode_empty_batch() {
        let mut buf = Vec::new();
        buf.extend_from_slice(&[0x54, 0x41, 0x46, 0x46]);
        buf.push(1u8);
        buf.extend_from_slice(&0u32.to_le_bytes()); // nodeCount=0
        let decoded = decode_batch_binary(&buf).expect("empty batch should succeed");
        assert!(decoded.is_empty(), "empty batch should decode to zero nodes");
    }
}
