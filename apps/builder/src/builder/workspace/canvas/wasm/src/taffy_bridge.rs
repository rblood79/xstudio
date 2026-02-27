//! Taffy layout engine WASM bridge.
//!
//! Wraps `TaffyTree` and exposes a JSON-based style API to TypeScript.
//! Style values are parsed from JSON strings to minimize WASM boundary calls.
//!
//! # Design decisions
//! - JSON string interface: one WASM call per node instead of N setter calls.
//! - NodeId → usize mapping via Vec for O(1) lookup.
//! - Batch compute: single `compute_layout` call resolves entire tree.

use serde::Deserialize;
use taffy::prelude::*;
use taffy::style::{GridTemplateRepetition, Overflow};
use wasm_bindgen::prelude::*;

// ─── Style JSON schema ───────────────────────────────────────────────

/// Intermediate style representation deserialized from JSON.
/// All fields are optional; unset fields use Taffy's `Style::DEFAULT`.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StyleInput {
    // Display & position
    display: Option<String>,
    position: Option<String>,
    overflow_x: Option<String>,
    overflow_y: Option<String>,

    // Flex container
    flex_direction: Option<String>,
    flex_wrap: Option<String>,
    justify_content: Option<String>,
    justify_items: Option<String>,
    align_items: Option<String>,
    align_content: Option<String>,

    // Flex item
    flex_grow: Option<f32>,
    flex_shrink: Option<f32>,
    flex_basis: Option<String>,
    align_self: Option<String>,
    justify_self: Option<String>,

    // Grid container
    grid_template_columns: Option<Vec<String>>,
    grid_template_rows: Option<Vec<String>>,
    grid_auto_flow: Option<String>,
    grid_auto_columns: Option<Vec<String>>,
    grid_auto_rows: Option<Vec<String>>,

    // Grid item
    grid_column_start: Option<String>,
    grid_column_end: Option<String>,
    grid_row_start: Option<String>,
    grid_row_end: Option<String>,

    // Size
    width: Option<String>,
    height: Option<String>,
    min_width: Option<String>,
    min_height: Option<String>,
    max_width: Option<String>,
    max_height: Option<String>,

    // Spacing
    margin_top: Option<String>,
    margin_right: Option<String>,
    margin_bottom: Option<String>,
    margin_left: Option<String>,
    padding_top: Option<String>,
    padding_right: Option<String>,
    padding_bottom: Option<String>,
    padding_left: Option<String>,
    border_top: Option<String>,
    border_right: Option<String>,
    border_bottom: Option<String>,
    border_left: Option<String>,

    // Inset (position offsets)
    inset_top: Option<String>,
    inset_right: Option<String>,
    inset_bottom: Option<String>,
    inset_left: Option<String>,

    // Gap
    column_gap: Option<String>,
    row_gap: Option<String>,

    // Aspect ratio
    aspect_ratio: Option<f32>,
}

/// Input for batch tree building: style + child indices in topological order.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchNodeInput {
    style: StyleInput,
    /// Child node indices within the batch array (topological order: leaves first).
    children: Vec<usize>,
}

// ─── Value parsers ───────────────────────────────────────────────────

/// Parse a CSS-like dimension string into a Taffy `Dimension`.
fn parse_dimension(s: &str) -> Dimension {
    let s = s.trim();
    match s {
        "auto" => Dimension::auto(),
        _ if s.ends_with("px") => {
            s.trim_end_matches("px")
                .parse::<f32>()
                .map_or(Dimension::auto(), Dimension::length)
        }
        _ if s.ends_with('%') => {
            s.trim_end_matches('%')
                .parse::<f32>()
                .map_or(Dimension::auto(), |v| Dimension::percent(v / 100.0))
        }
        _ => s.parse::<f32>().map_or(Dimension::auto(), Dimension::length),
    }
}

/// Parse a CSS-like length-percentage-auto string into `LengthPercentageAuto`.
fn parse_lpa(s: &str) -> LengthPercentageAuto {
    let s = s.trim();
    match s {
        "auto" => LengthPercentageAuto::auto(),
        _ if s.ends_with("px") => {
            s.trim_end_matches("px")
                .parse::<f32>()
                .map_or(LengthPercentageAuto::auto(), LengthPercentageAuto::length)
        }
        _ if s.ends_with('%') => {
            s.trim_end_matches('%')
                .parse::<f32>()
                .map_or(LengthPercentageAuto::auto(), |v| {
                    LengthPercentageAuto::percent(v / 100.0)
                })
        }
        _ => s
            .parse::<f32>()
            .map_or(LengthPercentageAuto::auto(), LengthPercentageAuto::length),
    }
}

/// Parse a CSS-like length-percentage string into `LengthPercentage`.
fn parse_lp(s: &str) -> LengthPercentage {
    let s = s.trim();
    if s.ends_with("px") {
        s.trim_end_matches("px")
            .parse::<f32>()
            .map_or(LengthPercentage::length(0.0), LengthPercentage::length)
    } else if s.ends_with('%') {
        s.trim_end_matches('%')
            .parse::<f32>()
            .map_or(LengthPercentage::length(0.0), |v| {
                LengthPercentage::percent(v / 100.0)
            })
    } else {
        s.parse::<f32>()
            .map_or(LengthPercentage::length(0.0), LengthPercentage::length)
    }
}

/// Parse a grid template token into a `GridTemplateComponent`.
///
/// Supports:
/// - Single track values: "1fr", "100px", "auto", "minmax(100px, 1fr)"
/// - `repeat(N, ...)`: fixed count repeat (e.g., "repeat(3, 1fr)")
/// - `repeat(auto-fill, ...)` / `repeat(auto-fit, ...)`: auto-repeating tracks
///
/// Phase 4-3: repeat() 지원 추가 → TS 측 repeat 전개 제거
pub(crate) fn parse_track_as_template(s: &str) -> GridTemplateComponent<String> {
    let s = s.trim();
    if s.starts_with("repeat(") && s.ends_with(')') {
        let inner = &s[7..s.len() - 1];
        // Find first comma at depth 0 (skip commas inside nested parentheses)
        let mut depth = 0u32;
        let mut first_comma = None;
        for (i, ch) in inner.char_indices() {
            match ch {
                '(' => depth += 1,
                ')' => depth = depth.saturating_sub(1),
                ',' if depth == 0 => {
                    first_comma = Some(i);
                    break;
                }
                _ => {}
            }
        }
        if let Some(comma_idx) = first_comma {
            let count_str = inner[..comma_idx].trim();
            let tracks_str = inner[comma_idx + 1..].trim();

            // Parse repeat count
            let count = match count_str {
                "auto-fill" => RepetitionCount::AutoFill,
                "auto-fit" => RepetitionCount::AutoFit,
                _ => count_str
                    .parse::<u16>()
                    .map(RepetitionCount::Count)
                    .unwrap_or(RepetitionCount::Count(1)),
            };

            // Parse track list (space-separated, respecting nested parens)
            let tracks = tokenize_grid_tracks(tracks_str)
                .iter()
                .map(|t| parse_track_sizing(t))
                .collect::<Vec<_>>();

            let line_names = vec![vec![]; tracks.len() + 1];

            return GridTemplateComponent::Repeat(GridTemplateRepetition {
                count,
                tracks,
                line_names,
            });
        }
    }
    GridTemplateComponent::Single(parse_track_sizing(s))
}

/// Tokenize a space-separated grid track list, respecting nested parentheses.
///
/// e.g., "minmax(100px, 1fr) 200px" → ["minmax(100px, 1fr)", "200px"]
fn tokenize_grid_tracks(s: &str) -> Vec<&str> {
    let mut tokens = Vec::new();
    let mut depth = 0u32;
    let mut start = 0;
    let s = s.trim();
    for (i, ch) in s.char_indices() {
        match ch {
            '(' => depth += 1,
            ')' => depth = depth.saturating_sub(1),
            ' ' | '\t' if depth == 0 => {
                let token = s[start..i].trim();
                if !token.is_empty() {
                    tokens.push(token);
                }
                start = i + 1;
            }
            _ => {}
        }
    }
    let last = s[start..].trim();
    if !last.is_empty() {
        tokens.push(last);
    }
    tokens
}

/// Parse a track sizing function string (e.g., "1fr", "100px", "auto", "minmax(100px, 1fr)").
pub(crate) fn parse_track_sizing(s: &str) -> TrackSizingFunction {
    let s = s.trim();
    if s.starts_with("minmax(") && s.ends_with(')') {
        let inner = &s[7..s.len() - 1];
        if let Some((min_str, max_str)) = inner.split_once(',') {
            let min = parse_min_track(min_str.trim());
            let max = parse_max_track(max_str.trim());
            return minmax(min, max);
        }
    }
    if s == "auto" {
        return auto();
    }
    if s.ends_with("fr") {
        if let Ok(v) = s.trim_end_matches("fr").parse::<f32>() {
            return fr(v);
        }
    }
    if s.ends_with("px") {
        if let Ok(v) = s.trim_end_matches("px").parse::<f32>() {
            return length(v);
        }
    }
    if s.ends_with('%') {
        if let Ok(v) = s.trim_end_matches('%').parse::<f32>() {
            return percent(v / 100.0);
        }
    }
    if s == "min-content" {
        return min_content();
    }
    if s == "max-content" {
        return max_content();
    }
    if let Ok(v) = s.parse::<f32>() {
        return length(v);
    }
    auto()
}

fn parse_min_track(s: &str) -> MinTrackSizingFunction {
    match s {
        "auto" => MinTrackSizingFunction::auto(),
        "min-content" => MinTrackSizingFunction::min_content(),
        "max-content" => MinTrackSizingFunction::max_content(),
        _ if s.ends_with("px") => s
            .trim_end_matches("px")
            .parse::<f32>()
            .map_or(MinTrackSizingFunction::auto(), MinTrackSizingFunction::length),
        _ if s.ends_with('%') => s
            .trim_end_matches('%')
            .parse::<f32>()
            .map_or(MinTrackSizingFunction::auto(), |v| {
                MinTrackSizingFunction::percent(v / 100.0)
            }),
        _ => MinTrackSizingFunction::auto(),
    }
}

fn parse_max_track(s: &str) -> MaxTrackSizingFunction {
    match s {
        "auto" => MaxTrackSizingFunction::auto(),
        "min-content" => MaxTrackSizingFunction::min_content(),
        "max-content" => MaxTrackSizingFunction::max_content(),
        _ if s.ends_with("fr") => s
            .trim_end_matches("fr")
            .parse::<f32>()
            .map_or(MaxTrackSizingFunction::auto(), MaxTrackSizingFunction::fr),
        _ if s.ends_with("px") => s
            .trim_end_matches("px")
            .parse::<f32>()
            .map_or(MaxTrackSizingFunction::auto(), MaxTrackSizingFunction::length),
        _ if s.ends_with('%') => s
            .trim_end_matches('%')
            .parse::<f32>()
            .map_or(MaxTrackSizingFunction::auto(), |v| {
                MaxTrackSizingFunction::percent(v / 100.0)
            }),
        _ => MaxTrackSizingFunction::auto(),
    }
}

/// Parse a grid line placement string (e.g., "1", "span 2", "auto").
fn parse_grid_placement(s: &str) -> GridPlacement {
    let s = s.trim();
    if s == "auto" {
        return GridPlacement::Auto;
    }
    if let Some(rest) = s.strip_prefix("span ") {
        if let Ok(v) = rest.parse::<u16>() {
            return GridPlacement::Span(v);
        }
    }
    if let Ok(v) = s.parse::<i16>() {
        return GridPlacement::from_line_index(v);
    }
    GridPlacement::Auto
}

// ─── StyleInput → taffy::Style conversion ────────────────────────────

fn convert_style(input: &StyleInput) -> Style {
    let mut style = Style::DEFAULT;

    // Display
    if let Some(ref d) = input.display {
        style.display = match d.as_str() {
            "flex" => Display::Flex,
            "grid" => Display::Grid,
            "block" => Display::Block,
            "none" => Display::None,
            _ => Display::Flex,
        };
    }

    // Position
    if let Some(ref p) = input.position {
        style.position = match p.as_str() {
            "relative" => Position::Relative,
            "absolute" => Position::Absolute,
            _ => Position::Relative,
        };
    }

    // Overflow
    if let Some(ref o) = input.overflow_x {
        style.overflow.x = match o.as_str() {
            "visible" => Overflow::Visible,
            "hidden" => Overflow::Hidden,
            "clip" => Overflow::Clip,
            "scroll" => Overflow::Scroll,
            _ => Overflow::Visible,
        };
    }
    if let Some(ref o) = input.overflow_y {
        style.overflow.y = match o.as_str() {
            "visible" => Overflow::Visible,
            "hidden" => Overflow::Hidden,
            "clip" => Overflow::Clip,
            "scroll" => Overflow::Scroll,
            _ => Overflow::Visible,
        };
    }

    // Flex container
    if let Some(ref fd) = input.flex_direction {
        style.flex_direction = match fd.as_str() {
            "row" => FlexDirection::Row,
            "column" => FlexDirection::Column,
            "row-reverse" => FlexDirection::RowReverse,
            "column-reverse" => FlexDirection::ColumnReverse,
            _ => FlexDirection::Row,
        };
    }

    if let Some(ref fw) = input.flex_wrap {
        style.flex_wrap = match fw.as_str() {
            "nowrap" => FlexWrap::NoWrap,
            "wrap" => FlexWrap::Wrap,
            "wrap-reverse" => FlexWrap::WrapReverse,
            _ => FlexWrap::NoWrap,
        };
    }

    if let Some(ref jc) = input.justify_content {
        style.justify_content = Some(match jc.as_str() {
            "flex-start" | "start" => JustifyContent::Start,
            "flex-end" | "end" => JustifyContent::End,
            "center" => JustifyContent::Center,
            "space-between" => JustifyContent::SpaceBetween,
            "space-around" => JustifyContent::SpaceAround,
            "space-evenly" => JustifyContent::SpaceEvenly,
            "stretch" => JustifyContent::Stretch,
            _ => JustifyContent::Start,
        });
    }

    if let Some(ref ai) = input.align_items {
        style.align_items = Some(match ai.as_str() {
            "flex-start" | "start" => AlignItems::Start,
            "flex-end" | "end" => AlignItems::End,
            "center" => AlignItems::Center,
            "stretch" => AlignItems::Stretch,
            "baseline" => AlignItems::Baseline,
            _ => AlignItems::Stretch,
        });
    }

    if let Some(ref ac) = input.align_content {
        style.align_content = Some(match ac.as_str() {
            "flex-start" | "start" => AlignContent::Start,
            "flex-end" | "end" => AlignContent::End,
            "center" => AlignContent::Center,
            "stretch" => AlignContent::Stretch,
            "space-between" => AlignContent::SpaceBetween,
            "space-around" => AlignContent::SpaceAround,
            "space-evenly" => AlignContent::SpaceEvenly,
            _ => AlignContent::Stretch,
        });
    }

    if let Some(ref ji) = input.justify_items {
        style.justify_items = Some(match ji.as_str() {
            "flex-start" | "start" => AlignItems::Start,
            "flex-end" | "end" => AlignItems::End,
            "center" => AlignItems::Center,
            "stretch" => AlignItems::Stretch,
            "baseline" => AlignItems::Baseline,
            _ => AlignItems::Stretch,
        });
    }

    // Flex item
    if let Some(fg) = input.flex_grow {
        style.flex_grow = fg;
    }
    if let Some(fs) = input.flex_shrink {
        style.flex_shrink = fs;
    }
    if let Some(ref fb) = input.flex_basis {
        style.flex_basis = parse_dimension(fb);
    }
    // AlignSelf = AlignItems alias in Taffy 0.9 (no Auto variant)
    if let Some(ref a_s) = input.align_self {
        style.align_self = match a_s.as_str() {
            "flex-start" | "start" => Some(AlignSelf::Start),
            "flex-end" | "end" => Some(AlignSelf::End),
            "center" => Some(AlignSelf::Center),
            "stretch" => Some(AlignSelf::Stretch),
            "baseline" => Some(AlignSelf::Baseline),
            _ => None, // "auto" maps to None (inherit from parent)
        };
    }
    // JustifySelf = AlignSelf alias in Taffy 0.9
    if let Some(ref j_s) = input.justify_self {
        style.justify_self = match j_s.as_str() {
            "flex-start" | "start" => Some(AlignSelf::Start),
            "flex-end" | "end" => Some(AlignSelf::End),
            "center" => Some(AlignSelf::Center),
            "stretch" => Some(AlignSelf::Stretch),
            "baseline" => Some(AlignSelf::Baseline),
            _ => None, // "auto" maps to None (inherit from parent)
        };
    }

    // Grid container
    if let Some(ref cols) = input.grid_template_columns {
        style.grid_template_columns = cols.iter().map(|s| parse_track_as_template(s)).collect();
    }
    if let Some(ref rows) = input.grid_template_rows {
        style.grid_template_rows = rows.iter().map(|s| parse_track_as_template(s)).collect();
    }
    if let Some(ref gaf) = input.grid_auto_flow {
        style.grid_auto_flow = match gaf.as_str() {
            "row" => GridAutoFlow::Row,
            "column" => GridAutoFlow::Column,
            "row dense" | "row-dense" => GridAutoFlow::RowDense,
            "column dense" | "column-dense" => GridAutoFlow::ColumnDense,
            _ => GridAutoFlow::Row,
        };
    }
    if let Some(ref ac) = input.grid_auto_columns {
        style.grid_auto_columns = ac.iter().map(|s| parse_track_sizing(s)).collect();
    }
    if let Some(ref ar) = input.grid_auto_rows {
        style.grid_auto_rows = ar.iter().map(|s| parse_track_sizing(s)).collect();
    }

    // Grid item
    if let Some(ref v) = input.grid_column_start {
        style.grid_column = Line {
            start: parse_grid_placement(v),
            end: style.grid_column.end,
        };
    }
    if let Some(ref v) = input.grid_column_end {
        style.grid_column = Line {
            start: style.grid_column.start,
            end: parse_grid_placement(v),
        };
    }
    if let Some(ref v) = input.grid_row_start {
        style.grid_row = Line {
            start: parse_grid_placement(v),
            end: style.grid_row.end,
        };
    }
    if let Some(ref v) = input.grid_row_end {
        style.grid_row = Line {
            start: style.grid_row.start,
            end: parse_grid_placement(v),
        };
    }

    // Size
    if let Some(ref v) = input.width {
        style.size.width = parse_dimension(v);
    }
    if let Some(ref v) = input.height {
        style.size.height = parse_dimension(v);
    }
    if let Some(ref v) = input.min_width {
        style.min_size.width = parse_dimension(v);
    }
    if let Some(ref v) = input.min_height {
        style.min_size.height = parse_dimension(v);
    }
    if let Some(ref v) = input.max_width {
        style.max_size.width = parse_dimension(v);
    }
    if let Some(ref v) = input.max_height {
        style.max_size.height = parse_dimension(v);
    }

    // Margin
    if let Some(ref v) = input.margin_top {
        style.margin.top = parse_lpa(v);
    }
    if let Some(ref v) = input.margin_right {
        style.margin.right = parse_lpa(v);
    }
    if let Some(ref v) = input.margin_bottom {
        style.margin.bottom = parse_lpa(v);
    }
    if let Some(ref v) = input.margin_left {
        style.margin.left = parse_lpa(v);
    }

    // Padding
    if let Some(ref v) = input.padding_top {
        style.padding.top = parse_lp(v);
    }
    if let Some(ref v) = input.padding_right {
        style.padding.right = parse_lp(v);
    }
    if let Some(ref v) = input.padding_bottom {
        style.padding.bottom = parse_lp(v);
    }
    if let Some(ref v) = input.padding_left {
        style.padding.left = parse_lp(v);
    }

    // Border
    if let Some(ref v) = input.border_top {
        style.border.top = parse_lp(v);
    }
    if let Some(ref v) = input.border_right {
        style.border.right = parse_lp(v);
    }
    if let Some(ref v) = input.border_bottom {
        style.border.bottom = parse_lp(v);
    }
    if let Some(ref v) = input.border_left {
        style.border.left = parse_lp(v);
    }

    // Inset
    if let Some(ref v) = input.inset_top {
        style.inset.top = parse_lpa(v);
    }
    if let Some(ref v) = input.inset_right {
        style.inset.right = parse_lpa(v);
    }
    if let Some(ref v) = input.inset_bottom {
        style.inset.bottom = parse_lpa(v);
    }
    if let Some(ref v) = input.inset_left {
        style.inset.left = parse_lpa(v);
    }

    // Gap
    if let Some(ref v) = input.column_gap {
        style.gap.width = parse_lp(v);
    }
    if let Some(ref v) = input.row_gap {
        style.gap.height = parse_lp(v);
    }

    // Aspect ratio
    if let Some(ar) = input.aspect_ratio {
        style.aspect_ratio = Some(ar);
    }

    style
}

// ─── Layout result ───────────────────────────────────────────────────

#[derive(serde::Serialize)]
struct LayoutOutput {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

// ─── WASM-exported engine ────────────────────────────────────────────

/// Maps external usize handles to internal `NodeId`s.
/// Handles are stable across tree mutations; removed slots are recycled.
#[wasm_bindgen]
pub struct TaffyLayoutEngine {
    tree: TaffyTree<()>,
    /// handle → NodeId mapping. Freed handles become None and are recycled.
    nodes: Vec<Option<NodeId>>,
    /// Recycled (freed) handle indices for reuse.
    free_list: Vec<usize>,
}

#[wasm_bindgen]
impl TaffyLayoutEngine {
    /// Create a new Taffy layout engine instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
            nodes: Vec::new(),
            free_list: Vec::new(),
        }
    }

    /// Create a leaf node with the given style JSON and return its handle.
    pub fn create_node(&mut self, style_json: &str) -> usize {
        let input: StyleInput = serde_json::from_str(style_json).unwrap_or_default();
        let style = convert_style(&input);
        let node_id = self.tree.new_leaf(style).expect("failed to create taffy node");
        self.alloc_handle(node_id)
    }

    /// Create a node with the given style JSON and child handles.
    pub fn create_node_with_children(
        &mut self,
        style_json: &str,
        children_handles: &[usize],
    ) -> usize {
        let input: StyleInput = serde_json::from_str(style_json).unwrap_or_default();
        let style = convert_style(&input);
        let child_ids: Vec<NodeId> = children_handles
            .iter()
            .filter_map(|&h| self.resolve(h))
            .collect();
        let node_id = self
            .tree
            .new_with_children(style, &child_ids)
            .expect("failed to create taffy node with children");
        self.alloc_handle(node_id)
    }

    /// Update the style of an existing node.
    pub fn update_style(&mut self, handle: usize, style_json: &str) {
        if let Some(node_id) = self.resolve(handle) {
            let input: StyleInput = serde_json::from_str(style_json).unwrap_or_default();
            let style = convert_style(&input);
            self.tree
                .set_style(node_id, style)
                .expect("failed to set style");
        }
    }

    /// Set the children of a node (replaces existing children).
    pub fn set_children(&mut self, handle: usize, children_handles: &[usize]) {
        if let Some(node_id) = self.resolve(handle) {
            let child_ids: Vec<NodeId> = children_handles
                .iter()
                .filter_map(|&h| self.resolve(h))
                .collect();
            self.tree
                .set_children(node_id, &child_ids)
                .expect("failed to set children");
        }
    }

    /// Compute layout for the tree rooted at `handle`.
    pub fn compute_layout(&mut self, handle: usize, available_width: f32, available_height: f32) {
        if let Some(node_id) = self.resolve(handle) {
            // RC-1: sentinel(-1) → MaxContent (height:auto 부모)
            let height_space = if available_height < 0.0 {
                AvailableSpace::MaxContent
            } else {
                AvailableSpace::Definite(available_height)
            };
            let available = Size {
                width: AvailableSpace::Definite(available_width),
                height: height_space,
            };
            self.tree
                .compute_layout(node_id, available)
                .expect("failed to compute layout");
        }
    }

    /// Retrieve the computed layout for a node as a JSON string.
    pub fn get_layout(&self, handle: usize) -> String {
        if let Some(node_id) = self.resolve(handle) {
            if let Ok(layout) = self.tree.layout(node_id) {
                let output = LayoutOutput {
                    x: layout.location.x,
                    y: layout.location.y,
                    width: layout.size.width,
                    height: layout.size.height,
                };
                return serde_json::to_string(&output).unwrap_or_default();
            }
        }
        r#"{"x":0,"y":0,"width":0,"height":0}"#.to_string()
    }

    /// Batch retrieve layouts for multiple nodes as a flat Float32Array.
    /// Returns [x0, y0, w0, h0, x1, y1, w1, h1, ...].
    pub fn get_layouts_batch(&self, handles: &[usize]) -> Box<[f32]> {
        let mut result = Vec::with_capacity(handles.len() * 4);
        for &h in handles {
            if let Some(node_id) = self.resolve(h) {
                if let Ok(layout) = self.tree.layout(node_id) {
                    result.push(layout.location.x);
                    result.push(layout.location.y);
                    result.push(layout.size.width);
                    result.push(layout.size.height);
                    continue;
                }
            }
            result.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]);
        }
        result.into_boxed_slice()
    }

    /// Remove a node from the tree and free its handle for reuse.
    pub fn remove_node(&mut self, handle: usize) {
        if let Some(node_id) = self.resolve(handle) {
            let _ = self.tree.remove(node_id);
            self.nodes[handle] = None;
            self.free_list.push(handle);
        }
    }

    /// Build an entire tree in a single WASM call.
    ///
    /// Input: JSON array of nodes in topological order (leaves first, root last).
    /// Returns: handle for each node (1:1 correspondence with input indices).
    ///
    /// Compared to individual create_node() calls:
    /// - WASM boundary crossings: N → 1
    /// - JSON parsing: N → 1 (single serde_json::from_str)
    /// - Vec allocation: N → 1 (pre-allocated capacity)
    ///
    /// Error policy: returns Result::Err on parse failure, child index out of range,
    /// or Taffy node creation failure. No silent drops (filter_map) or panics (unwrap).
    pub fn build_tree_batch(&mut self, nodes_json: &str) -> Result<Box<[usize]>, JsValue> {
        let nodes: Vec<BatchNodeInput> = serde_json::from_str(nodes_json)
            .map_err(|e| JsValue::from_str(&format!("build_tree_batch: parse error: {e}")))?;

        let mut handles: Vec<usize> = Vec::with_capacity(nodes.len());

        for (i, node) in nodes.iter().enumerate() {
            let style = convert_style(&node.style);

            if node.children.is_empty() {
                let node_id = self
                    .tree
                    .new_leaf(style)
                    .map_err(|e| JsValue::from_str(&format!("node[{i}]: taffy error: {e:?}")))?;
                handles.push(self.alloc_handle(node_id));
            } else {
                let mut child_ids: Vec<NodeId> = Vec::with_capacity(node.children.len());
                for &idx in &node.children {
                    let handle = handles.get(idx).copied().ok_or_else(|| {
                        JsValue::from_str(&format!(
                            "node[{i}]: child index {idx} out of range (only {i} nodes built so far)"
                        ))
                    })?;
                    let node_id = self.resolve(handle).ok_or_else(|| {
                        JsValue::from_str(&format!(
                            "node[{i}]: child index {idx} resolved to invalid handle {handle}"
                        ))
                    })?;
                    child_ids.push(node_id);
                }
                let node_id = self
                    .tree
                    .new_with_children(style, &child_ids)
                    .map_err(|e| JsValue::from_str(&format!("node[{i}]: taffy error: {e:?}")))?;
                handles.push(self.alloc_handle(node_id));
            }
        }

        Ok(handles.into_boxed_slice())
    }

    /// Build an entire tree from a binary-encoded buffer in a single WASM call.
    ///
    /// Replaces `build_tree_batch()` with zero JSON parsing:
    /// - TypeScript encodes styles as TypedArray via `encodeBatchBinary()`
    /// - Rust decodes directly to `taffy::Style` (no StyleInput/convert_style)
    /// - Grid track arrays are passed as JSON sideband within the binary buffer
    ///
    /// Returns: handle for each node (1:1 correspondence with input).
    pub fn build_tree_batch_binary(&mut self, data: &[u8]) -> Result<Box<[usize]>, JsValue> {
        use crate::binary_protocol::decode_batch_binary;

        let nodes = decode_batch_binary(data)
            .map_err(|e| JsValue::from_str(&format!("build_tree_batch_binary: {e}")))?;

        let mut handles: Vec<usize> = Vec::with_capacity(nodes.len());

        for (i, node) in nodes.into_iter().enumerate() {
            if node.children.is_empty() {
                let node_id = self
                    .tree
                    .new_leaf(node.style)
                    .map_err(|e| JsValue::from_str(&format!("node[{i}]: taffy error: {e:?}")))?;
                handles.push(self.alloc_handle(node_id));
            } else {
                let mut child_ids: Vec<NodeId> = Vec::with_capacity(node.children.len());
                for &idx in &node.children {
                    let handle = handles.get(idx).copied().ok_or_else(|| {
                        JsValue::from_str(&format!(
                            "node[{i}]: child index {idx} out of range (only {i} nodes built so far)"
                        ))
                    })?;
                    let node_id = self.resolve(handle).ok_or_else(|| {
                        JsValue::from_str(&format!(
                            "node[{i}]: child index {idx} resolved to invalid handle {handle}"
                        ))
                    })?;
                    child_ids.push(node_id);
                }
                let node_id = self
                    .tree
                    .new_with_children(node.style, &child_ids)
                    .map_err(|e| JsValue::from_str(&format!("node[{i}]: taffy error: {e:?}")))?;
                handles.push(self.alloc_handle(node_id));
            }
        }

        Ok(handles.into_boxed_slice())
    }

    /// Mark a node as dirty so the next compute_layout() recalculates it.
    ///
    /// Taffy propagates dirty flags up to ancestors automatically,
    /// so only the directly changed node needs to be marked.
    ///
    /// Note: set_style() and set_children() call mark_dirty() internally,
    /// so this method is only needed for explicit cache invalidation.
    pub fn mark_dirty(&mut self, handle: usize) {
        if let Some(node_id) = self.resolve(handle) {
            let _ = self.tree.mark_dirty(node_id);
        }
    }

    /// Clear the entire tree and reset all handles.
    pub fn clear(&mut self) {
        self.tree.clear();
        self.nodes.clear();
        self.free_list.clear();
    }

    /// Return the total number of active (non-freed) nodes.
    pub fn node_count(&self) -> usize {
        self.nodes.iter().filter(|n| n.is_some()).count()
    }
}

// ─── Internal helpers ────────────────────────────────────────────────

impl TaffyLayoutEngine {
    /// Allocate a handle for a NodeId, reusing freed slots.
    fn alloc_handle(&mut self, node_id: NodeId) -> usize {
        if let Some(idx) = self.free_list.pop() {
            self.nodes[idx] = Some(node_id);
            idx
        } else {
            let idx = self.nodes.len();
            self.nodes.push(Some(node_id));
            idx
        }
    }

    /// Resolve a handle to its NodeId.
    fn resolve(&self, handle: usize) -> Option<NodeId> {
        self.nodes.get(handle).copied().flatten()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flex_row_layout() {
        let mut engine = TaffyLayoutEngine::new();

        let child1 = engine.create_node(r#"{"width":"100px","height":"50px"}"#);
        let child2 = engine.create_node(r#"{"width":"200px","height":"50px"}"#);
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","width":"400px","height":"100px"}"#,
            &[child1, child2],
        );

        engine.compute_layout(root, 400.0, 100.0);

        let layout1: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child1)).unwrap();
        assert_eq!(layout1["width"], 100.0);
        assert_eq!(layout1["height"], 50.0);
        assert_eq!(layout1["x"], 0.0);

        let layout2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child2)).unwrap();
        assert_eq!(layout2["width"], 200.0);
        assert_eq!(layout2["x"], 100.0);
    }

    #[test]
    fn test_grid_layout() {
        let mut engine = TaffyLayoutEngine::new();

        let c1 = engine.create_node(r#"{"width":"auto","height":"50px"}"#);
        let c2 = engine.create_node(r#"{"width":"auto","height":"50px"}"#);
        let c3 = engine.create_node(r#"{"width":"auto","height":"50px"}"#);
        let c4 = engine.create_node(r#"{"width":"auto","height":"50px"}"#);

        let root = engine.create_node_with_children(
            r#"{"display":"grid","gridTemplateColumns":["1fr","1fr"],"gridTemplateRows":["auto","auto"],"width":"200px","height":"100px"}"#,
            &[c1, c2, c3, c4],
        );

        engine.compute_layout(root, 200.0, 100.0);

        let l1: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c1)).unwrap();
        assert_eq!(l1["width"], 100.0);
        assert_eq!(l1["x"], 0.0);
        assert_eq!(l1["y"], 0.0);

        let l2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c2)).unwrap();
        assert_eq!(l2["x"], 100.0);
    }

    #[test]
    fn test_batch_get_layouts() {
        let mut engine = TaffyLayoutEngine::new();

        let c1 = engine.create_node(r#"{"width":"100px","height":"40px"}"#);
        let c2 = engine.create_node(r#"{"width":"100px","height":"60px"}"#);
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"column","width":"100px","height":"200px"}"#,
            &[c1, c2],
        );

        engine.compute_layout(root, 100.0, 200.0);

        let results = engine.get_layouts_batch(&[c1, c2]);
        assert_eq!(results.len(), 8);
        // c1: x=0, y=0, w=100, h=40
        assert_eq!(results[0], 0.0);
        assert_eq!(results[1], 0.0);
        assert_eq!(results[2], 100.0);
        assert_eq!(results[3], 40.0);
        // c2: x=0, y=40, w=100, h=60
        assert_eq!(results[4], 0.0);
        assert_eq!(results[5], 40.0);
    }

    #[test]
    fn test_remove_and_reuse_handle() {
        let mut engine = TaffyLayoutEngine::new();

        let h0 = engine.create_node(r#"{"width":"100px"}"#);
        let h1 = engine.create_node(r#"{"width":"200px"}"#);
        assert_eq!(h0, 0);
        assert_eq!(h1, 1);

        engine.remove_node(h0);

        // New node should reuse handle 0
        let h2 = engine.create_node(r#"{"width":"300px"}"#);
        assert_eq!(h2, 0);
        assert_eq!(engine.node_count(), 2);
    }

    #[test]
    fn test_mark_dirty_incremental() {
        let mut engine = TaffyLayoutEngine::new();

        let child = engine.create_node(r#"{"width":"100px","height":"50px"}"#);
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"column","width":"400px","height":"400px"}"#,
            &[child],
        );

        // Initial layout
        engine.compute_layout(root, 400.0, 400.0);
        let layout1: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();
        assert_eq!(layout1["width"], 100.0);

        // Update child style (doubles width)
        engine.update_style(child, r#"{"width":"200px","height":"50px"}"#);
        // update_style calls mark_dirty internally

        // Recompute — Taffy should only recalculate dirty subtree
        engine.compute_layout(root, 400.0, 400.0);
        let layout2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();
        assert_eq!(layout2["width"], 200.0, "width should update after mark_dirty + recompute");

        // Explicit mark_dirty (no style change, just cache invalidation)
        engine.mark_dirty(child);
        engine.compute_layout(root, 400.0, 400.0);
        let layout3: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();
        assert_eq!(layout3["width"], 200.0, "should remain 200 after explicit mark_dirty");
    }

    #[test]
    fn test_mark_dirty_add_remove_child() {
        let mut engine = TaffyLayoutEngine::new();

        let c1 = engine.create_node(r#"{"width":"100px","height":"50px"}"#);
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"column","width":"400px"}"#,
            &[c1],
        );
        engine.compute_layout(root, 400.0, -1.0);

        // Add a second child
        let c2 = engine.create_node(r#"{"width":"100px","height":"30px"}"#);
        engine.set_children(root, &[c1, c2]);
        // set_children calls mark_dirty internally

        engine.compute_layout(root, 400.0, -1.0);
        let layout_c2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c2)).unwrap();
        assert_eq!(layout_c2["y"], 50.0, "c2 should be below c1 (y=50)");
        assert_eq!(layout_c2["height"], 30.0);

        // Remove c1
        engine.set_children(root, &[c2]);
        engine.remove_node(c1);
        engine.compute_layout(root, 400.0, -1.0);
        let layout_c2_after: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c2)).unwrap();
        assert_eq!(layout_c2_after["y"], 0.0, "c2 should be at top after c1 removed");
        assert_eq!(engine.node_count(), 2); // root + c2
    }

    #[test]
    fn test_margin_auto_centering() {
        let mut engine = TaffyLayoutEngine::new();

        let child = engine.create_node(
            r#"{"width":"100px","height":"50px","marginLeft":"auto","marginRight":"auto"}"#,
        );
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","width":"400px","height":"100px"}"#,
            &[child],
        );
        engine.compute_layout(root, 400.0, 100.0);

        let layout: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();

        // margin:auto centers → x = (400 - 100) / 2 = 150
        assert_eq!(layout["x"], 150.0, "margin:auto should center the item");
        assert_eq!(layout["width"], 100.0);
    }

    #[test]
    fn test_grid_repeat_fixed() {
        // repeat(3, 1fr) → 3 equal columns
        let mut engine = TaffyLayoutEngine::new();

        let c1 = engine.create_node(r#"{"height":"50px"}"#);
        let c2 = engine.create_node(r#"{"height":"50px"}"#);
        let c3 = engine.create_node(r#"{"height":"50px"}"#);

        let root = engine.create_node_with_children(
            r#"{"display":"grid","gridTemplateColumns":["repeat(3, 1fr)"],"width":"300px","height":"50px"}"#,
            &[c1, c2, c3],
        );

        engine.compute_layout(root, 300.0, 50.0);

        let l1: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c1)).unwrap();
        let l2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c2)).unwrap();
        let l3: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c3)).unwrap();

        assert_eq!(l1["width"], 100.0, "repeat(3, 1fr): each col = 300/3 = 100");
        assert_eq!(l1["x"], 0.0);
        assert_eq!(l2["x"], 100.0);
        assert_eq!(l3["x"], 200.0);
    }

    #[test]
    fn test_grid_repeat_minmax() {
        // repeat(2, minmax(50px, 1fr)) → 2 columns with minmax
        let mut engine = TaffyLayoutEngine::new();

        let c1 = engine.create_node(r#"{"height":"40px"}"#);
        let c2 = engine.create_node(r#"{"height":"40px"}"#);

        let root = engine.create_node_with_children(
            r#"{"display":"grid","gridTemplateColumns":["repeat(2, minmax(50px, 1fr))"],"width":"200px","height":"40px"}"#,
            &[c1, c2],
        );

        engine.compute_layout(root, 200.0, 40.0);

        let l1: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c1)).unwrap();
        let l2: serde_json::Value =
            serde_json::from_str(&engine.get_layout(c2)).unwrap();

        assert_eq!(l1["width"], 100.0, "repeat(2, minmax(50px, 1fr)): 200/2 = 100");
        assert_eq!(l2["x"], 100.0);
    }

    #[test]
    fn test_build_tree_batch_flex_column() {
        // Topological order: leaves first (index 0, 1), root last (index 2).
        // Root references children by their indices within the batch array.
        let mut engine = TaffyLayoutEngine::new();

        let nodes_json = r#"[
            {"style":{"width":"100px","height":"40px"},"children":[]},
            {"style":{"width":"100px","height":"60px"},"children":[]},
            {"style":{"display":"flex","flexDirection":"column","width":"100px","height":"200px"},"children":[0,1]}
        ]"#;

        let handles = engine.build_tree_batch(nodes_json).expect("build_tree_batch should succeed");
        assert_eq!(handles.len(), 3);

        let root_handle = handles[2];
        engine.compute_layout(root_handle, 100.0, 200.0);

        let l0: serde_json::Value = serde_json::from_str(&engine.get_layout(handles[0])).unwrap();
        let l1: serde_json::Value = serde_json::from_str(&engine.get_layout(handles[1])).unwrap();

        // child 0: x=0, y=0, w=100, h=40
        assert_eq!(l0["x"], 0.0);
        assert_eq!(l0["y"], 0.0);
        assert_eq!(l0["width"], 100.0);
        assert_eq!(l0["height"], 40.0);

        // child 1: x=0, y=40, w=100, h=60
        assert_eq!(l1["x"], 0.0);
        assert_eq!(l1["y"], 40.0);
        assert_eq!(l1["width"], 100.0);
        assert_eq!(l1["height"], 60.0);
    }

    // JsValue::from_str panics on non-wasm32 targets (unimplemented!).
    // Gate the Err-path tests to wasm32 where JsValue is fully functional.
    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_build_tree_batch_parse_error() {
        let mut engine = TaffyLayoutEngine::new();

        let result = engine.build_tree_batch("not valid json");
        assert!(result.is_err(), "invalid JSON should return Err");
    }

    #[cfg(target_arch = "wasm32")]
    #[test]
    fn test_build_tree_batch_child_index_out_of_range() {
        let mut engine = TaffyLayoutEngine::new();

        // node[1] references index 5, which does not exist yet.
        let nodes_json = r#"[
            {"style":{"width":"50px","height":"50px"},"children":[]},
            {"style":{"display":"flex"},"children":[5]}
        ]"#;

        let result = engine.build_tree_batch(nodes_json);
        assert!(result.is_err(), "out-of-range child index should return Err");
    }

    #[test]
    fn test_build_tree_batch_handle_reuse_after_remove() {
        // Verify that handles produced by build_tree_batch participate
        // correctly in the free_list reuse mechanism.
        let mut engine = TaffyLayoutEngine::new();

        let nodes_json = r#"[
            {"style":{"width":"80px","height":"80px"},"children":[]}
        ]"#;
        let handles = engine.build_tree_batch(nodes_json).expect("should succeed");
        let h0 = handles[0];

        // Remove the node — its handle slot should go back to free_list.
        engine.remove_node(h0);
        assert_eq!(engine.node_count(), 0);

        // Next allocation should reuse the freed slot.
        let h1 = engine.create_node(r#"{"width":"20px"}"#);
        assert_eq!(h1, h0, "freed handle should be reused by subsequent allocation");
        assert_eq!(engine.node_count(), 1);
    }

    #[test]
    fn test_build_tree_batch_binary_vs_json() {
        use crate::binary_protocol::encode::{NodeEncoder, build_taff};

        // Build same 3-node tree (parent + 2 children) via JSON and binary,
        // then compare layout results.
        let mut json_engine = TaffyLayoutEngine::new();
        let json_nodes = r#"[
            {"style":{"width":"100px","height":"50px"},"children":[]},
            {"style":{"width":"200px","height":"50px"},"children":[]},
            {"style":{"display":"flex","flexDirection":"row","width":"400px","height":"100px"},"children":[0,1]}
        ]"#;
        let json_handles = json_engine.build_tree_batch(json_nodes).expect("json batch");
        json_engine.compute_layout(json_handles[2], 400.0, 100.0);
        let json_layouts = json_engine.get_layouts_batch(&json_handles);

        // Binary batch: same tree
        let mut bin_engine = TaffyLayoutEngine::new();
        let bin_data = build_taff(&[
            NodeEncoder::new()
                .width(1, 100.0)   // width: 100px
                .height(1, 50.0)   // height: 50px
                .build(),
            NodeEncoder::new()
                .width(1, 200.0)   // width: 200px
                .height(1, 50.0)   // height: 50px
                .build(),
            NodeEncoder::new()
                .display(0)            // display: flex
                .flex_direction(0)     // flexDirection: row
                .width(1, 400.0)       // width: 400px
                .height(1, 100.0)      // height: 100px
                .children(&[0, 1])
                .build(),
        ]);
        let bin_handles = bin_engine.build_tree_batch_binary(&bin_data).expect("binary batch");
        bin_engine.compute_layout(bin_handles[2], 400.0, 100.0);
        let bin_layouts = bin_engine.get_layouts_batch(&bin_handles);

        // Compare layouts: both should produce identical results
        assert_eq!(json_layouts.len(), bin_layouts.len());
        for i in 0..json_layouts.len() {
            let j = json_layouts[i];
            let b = bin_layouts[i];
            assert!(
                (j - b).abs() < 0.001,
                "layout mismatch at index {i}: json={j}, binary={b}"
            );
        }
    }
}
