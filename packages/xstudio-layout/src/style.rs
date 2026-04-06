use serde_json::Value;
use taffy::prelude::*;
use taffy::style::Overflow;
use taffy::style_helpers::{TaffyGridLine, TaffyGridSpan};
use taffy::MinMax;

/// Parse a JSON style string into a Taffy `Style`.
///
/// The JSON format matches the output of `normalizeStyle()` in taffyLayout.ts:
/// - Dimensions: `"100px"`, `"50%"`, `"auto"`, or a raw number (treated as px)
/// - All CSS layout properties that taffyLayout.ts supports
pub fn parse_style(json: &str) -> Style {
    let value: Value = serde_json::from_str(json).unwrap_or(Value::Null);
    let obj = match &value {
        Value::Object(m) => m,
        _ => return Style::DEFAULT,
    };

    let mut style = Style::DEFAULT;

    // --- display ---
    if let Some(v) = obj.get("display").and_then(|v| v.as_str()) {
        style.display = match v {
            "flex" => Display::Flex,
            "grid" => Display::Grid,
            "block" => Display::Block,
            "none" => Display::None,
            _ => Display::DEFAULT,
        };
    }

    // --- position ---
    if let Some(v) = obj.get("position").and_then(|v| v.as_str()) {
        style.position = match v {
            "absolute" => Position::Absolute,
            _ => Position::Relative,
        };
    }

    // --- size ---
    style.size = Size {
        width: parse_dimension(obj.get("width")),
        height: parse_dimension(obj.get("height")),
    };

    // --- min_size ---
    style.min_size = Size {
        width: parse_dimension(obj.get("minWidth")),
        height: parse_dimension(obj.get("minHeight")),
    };

    // --- max_size ---
    style.max_size = Size {
        width: parse_dimension(obj.get("maxWidth")),
        height: parse_dimension(obj.get("maxHeight")),
    };

    // --- margin ---
    style.margin = Rect {
        left: parse_lpa(obj.get("marginLeft")),
        right: parse_lpa(obj.get("marginRight")),
        top: parse_lpa(obj.get("marginTop")),
        bottom: parse_lpa(obj.get("marginBottom")),
    };

    // --- padding ---
    style.padding = Rect {
        left: parse_lp(obj.get("paddingLeft")),
        right: parse_lp(obj.get("paddingRight")),
        top: parse_lp(obj.get("paddingTop")),
        bottom: parse_lp(obj.get("paddingBottom")),
    };

    // --- border ---
    style.border = Rect {
        left: parse_lp(obj.get("borderLeft")),
        right: parse_lp(obj.get("borderRight")),
        top: parse_lp(obj.get("borderTop")),
        bottom: parse_lp(obj.get("borderBottom")),
    };

    // --- inset ---
    style.inset = Rect {
        left: parse_lpa(obj.get("insetLeft")),
        right: parse_lpa(obj.get("insetRight")),
        top: parse_lpa(obj.get("insetTop")),
        bottom: parse_lpa(obj.get("insetBottom")),
    };

    // --- gap ---
    if let Some(v) = obj.get("columnGap") {
        style.gap.width = parse_lp(Some(v));
    }
    if let Some(v) = obj.get("rowGap") {
        style.gap.height = parse_lp(Some(v));
    }

    // --- flex ---
    if let Some(v) = obj.get("flexDirection").and_then(|v| v.as_str()) {
        style.flex_direction = match v {
            "row" => FlexDirection::Row,
            "row-reverse" => FlexDirection::RowReverse,
            "column" => FlexDirection::Column,
            "column-reverse" => FlexDirection::ColumnReverse,
            _ => FlexDirection::Row,
        };
    }

    if let Some(v) = obj.get("flexWrap").and_then(|v| v.as_str()) {
        style.flex_wrap = match v {
            "wrap" => FlexWrap::Wrap,
            "wrap-reverse" => FlexWrap::WrapReverse,
            _ => FlexWrap::NoWrap,
        };
    }

    if let Some(v) = obj.get("flexGrow").and_then(|v| v.as_f64()) {
        style.flex_grow = v as f32;
    }

    if let Some(v) = obj.get("flexShrink").and_then(|v| v.as_f64()) {
        style.flex_shrink = v as f32;
    }

    if let Some(v) = obj.get("flexBasis") {
        style.flex_basis = parse_dimension(Some(v));
    }

    // --- alignment ---
    if let Some(v) = obj.get("justifyContent").and_then(|v| v.as_str()) {
        style.justify_content = parse_justify_content(v);
    }

    if let Some(v) = obj.get("alignItems").and_then(|v| v.as_str()) {
        style.align_items = parse_align_items(v);
    }

    if let Some(v) = obj.get("alignContent").and_then(|v| v.as_str()) {
        style.align_content = parse_align_content(v);
    }

    if let Some(v) = obj.get("alignSelf").and_then(|v| v.as_str()) {
        style.align_self = parse_align_self(v);
    }

    if let Some(v) = obj.get("justifySelf").and_then(|v| v.as_str()) {
        style.justify_self = parse_align_self(v);
    }

    if let Some(v) = obj.get("justifyItems").and_then(|v| v.as_str()) {
        style.justify_items = parse_align_items(v);
    }

    // --- overflow ---
    if let Some(v) = obj.get("overflowX").and_then(|v| v.as_str()) {
        style.overflow.x = parse_overflow(v);
    }
    if let Some(v) = obj.get("overflowY").and_then(|v| v.as_str()) {
        style.overflow.y = parse_overflow(v);
    }

    // --- aspectRatio ---
    if let Some(v) = obj.get("aspectRatio").and_then(|v| v.as_f64()) {
        style.aspect_ratio = Some(v as f32);
    }

    // --- grid template tracks ---
    if let Some(v) = obj.get("gridTemplateColumns") {
        style.grid_template_columns = parse_template_track_list(v);
    }
    if let Some(v) = obj.get("gridTemplateRows") {
        style.grid_template_rows = parse_template_track_list(v);
    }

    if let Some(v) = obj.get("gridAutoFlow").and_then(|v| v.as_str()) {
        style.grid_auto_flow = match v {
            "row" => GridAutoFlow::Row,
            "column" => GridAutoFlow::Column,
            "row dense" => GridAutoFlow::RowDense,
            "column dense" => GridAutoFlow::ColumnDense,
            _ => GridAutoFlow::Row,
        };
    }

    if let Some(v) = obj.get("gridAutoColumns") {
        style.grid_auto_columns = parse_track_list(v);
    }
    if let Some(v) = obj.get("gridAutoRows") {
        style.grid_auto_rows = parse_track_list(v);
    }

    if let Some(v) = obj.get("gridColumnStart") {
        style.grid_column.start = parse_grid_placement(v);
    }
    if let Some(v) = obj.get("gridColumnEnd") {
        style.grid_column.end = parse_grid_placement(v);
    }
    if let Some(v) = obj.get("gridRowStart") {
        style.grid_row.start = parse_grid_placement(v);
    }
    if let Some(v) = obj.get("gridRowEnd") {
        style.grid_row.end = parse_grid_placement(v);
    }

    style
}

// ---------------------------------------------------------------------------
// Dimension helpers
// ---------------------------------------------------------------------------

/// Parse a JSON value into a `Dimension` (used for size, flex_basis).
fn parse_dimension(v: Option<&Value>) -> Dimension {
    match v {
        None => Dimension::auto(),
        Some(Value::String(s)) => parse_dimension_str(s),
        Some(Value::Number(n)) => Dimension::length(n.as_f64().unwrap_or(0.0) as f32),
        _ => Dimension::auto(),
    }
}

fn parse_dimension_str(s: &str) -> Dimension {
    let s = s.trim();
    if s == "auto" {
        return Dimension::auto();
    }
    if let Some(px) = s.strip_suffix("px") {
        if let Ok(v) = px.parse::<f32>() {
            return Dimension::length(v);
        }
    }
    if let Some(pct) = s.strip_suffix('%') {
        if let Ok(v) = pct.parse::<f32>() {
            return Dimension::percent(v / 100.0);
        }
    }
    if let Ok(v) = s.parse::<f32>() {
        return Dimension::length(v);
    }
    Dimension::auto()
}

/// Parse a JSON value into a `LengthPercentageAuto` (used for margin, inset).
fn parse_lpa(v: Option<&Value>) -> LengthPercentageAuto {
    match v {
        None => LengthPercentageAuto::auto(),
        Some(Value::String(s)) => parse_lpa_str(s),
        Some(Value::Number(n)) => LengthPercentageAuto::length(n.as_f64().unwrap_or(0.0) as f32),
        _ => LengthPercentageAuto::auto(),
    }
}

fn parse_lpa_str(s: &str) -> LengthPercentageAuto {
    let s = s.trim();
    if s == "auto" {
        return LengthPercentageAuto::auto();
    }
    if let Some(px) = s.strip_suffix("px") {
        if let Ok(v) = px.parse::<f32>() {
            return LengthPercentageAuto::length(v);
        }
    }
    if let Some(pct) = s.strip_suffix('%') {
        if let Ok(v) = pct.parse::<f32>() {
            return LengthPercentageAuto::percent(v / 100.0);
        }
    }
    if let Ok(v) = s.parse::<f32>() {
        return LengthPercentageAuto::length(v);
    }
    LengthPercentageAuto::auto()
}

/// Parse a JSON value into a `LengthPercentage` (used for padding, border, gap).
fn parse_lp(v: Option<&Value>) -> LengthPercentage {
    match v {
        None => LengthPercentage::length(0.0),
        Some(Value::String(s)) => parse_lp_str(s),
        Some(Value::Number(n)) => LengthPercentage::length(n.as_f64().unwrap_or(0.0) as f32),
        _ => LengthPercentage::length(0.0),
    }
}

fn parse_lp_str(s: &str) -> LengthPercentage {
    let s = s.trim();
    if let Some(px) = s.strip_suffix("px") {
        if let Ok(v) = px.parse::<f32>() {
            return LengthPercentage::length(v);
        }
    }
    if let Some(pct) = s.strip_suffix('%') {
        if let Ok(v) = pct.parse::<f32>() {
            return LengthPercentage::percent(v / 100.0);
        }
    }
    if let Ok(v) = s.parse::<f32>() {
        return LengthPercentage::length(v);
    }
    LengthPercentage::length(0.0)
}

// ---------------------------------------------------------------------------
// Alignment helpers
// ---------------------------------------------------------------------------

fn parse_justify_content(s: &str) -> Option<JustifyContent> {
    Some(match s {
        "flex-start" | "start" => JustifyContent::Start,
        "flex-end" | "end" => JustifyContent::End,
        "center" => JustifyContent::Center,
        "space-between" => JustifyContent::SpaceBetween,
        "space-around" => JustifyContent::SpaceAround,
        "space-evenly" => JustifyContent::SpaceEvenly,
        "stretch" => JustifyContent::Stretch,
        _ => return None,
    })
}

fn parse_align_items(s: &str) -> Option<AlignItems> {
    Some(match s {
        "flex-start" | "start" => AlignItems::Start,
        "flex-end" | "end" => AlignItems::End,
        "center" => AlignItems::Center,
        "baseline" => AlignItems::Baseline,
        "stretch" => AlignItems::Stretch,
        _ => return None,
    })
}

fn parse_align_content(s: &str) -> Option<AlignContent> {
    Some(match s {
        "flex-start" | "start" => AlignContent::Start,
        "flex-end" | "end" => AlignContent::End,
        "center" => AlignContent::Center,
        "space-between" => AlignContent::SpaceBetween,
        "space-around" => AlignContent::SpaceAround,
        "space-evenly" => AlignContent::SpaceEvenly,
        "stretch" => AlignContent::Stretch,
        _ => return None,
    })
}

fn parse_align_self(s: &str) -> Option<AlignSelf> {
    Some(match s {
        "auto" => return None,
        "flex-start" | "start" => AlignSelf::Start,
        "flex-end" | "end" => AlignSelf::End,
        "center" => AlignSelf::Center,
        "baseline" => AlignSelf::Baseline,
        "stretch" => AlignSelf::Stretch,
        _ => return None,
    })
}

// ---------------------------------------------------------------------------
// Overflow helper
// ---------------------------------------------------------------------------

fn parse_overflow(s: &str) -> Overflow {
    match s {
        "visible" => Overflow::Visible,
        "hidden" => Overflow::Hidden,
        "clip" => Overflow::Clip,
        "scroll" => Overflow::Scroll,
        _ => Overflow::Visible,
    }
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

/// Parse a JSON value into `Vec<GridTemplateComponent>` for `grid_template_columns/rows`.
/// `GridTemplateComponent` implements `From<TrackSizingFunction>`.
fn parse_template_track_list(v: &Value) -> Vec<GridTemplateComponent<String>> {
    let tracks = parse_track_list(v);
    tracks.into_iter().map(GridTemplateComponent::from).collect()
}

/// Parse a JSON value (string or array) into a `Vec<TrackSizingFunction>`.
/// Used for `grid_auto_columns` / `grid_auto_rows`.
fn parse_track_list(v: &Value) -> Vec<TrackSizingFunction> {
    match v {
        Value::Array(arr) => arr
            .iter()
            .filter_map(|item| item.as_str().map(parse_track))
            .collect(),
        Value::String(s) => {
            // Space-separated shorthand: "1fr 1fr 100px"
            s.split_whitespace().map(parse_track).collect()
        }
        _ => vec![],
    }
}

/// Parse a single track sizing token into a `TrackSizingFunction`.
///
/// `TrackSizingFunction = MinMax<MinTrackSizingFunction, MaxTrackSizingFunction>`
fn parse_track(s: &str) -> TrackSizingFunction {
    let s = s.trim();

    if s == "auto" {
        return MinMax {
            min: MinTrackSizingFunction::auto(),
            max: MaxTrackSizingFunction::auto(),
        };
    }

    if let Some(fr_str) = s.strip_suffix("fr") {
        if let Ok(v) = fr_str.parse::<f32>() {
            return MinMax {
                min: MinTrackSizingFunction::auto(),
                max: MaxTrackSizingFunction::fr(v),
            };
        }
    }

    if let Some(px_str) = s.strip_suffix("px") {
        if let Ok(v) = px_str.parse::<f32>() {
            return MinMax {
                min: MinTrackSizingFunction::length(v),
                max: MaxTrackSizingFunction::length(v),
            };
        }
    }

    if let Some(pct_str) = s.strip_suffix('%') {
        if let Ok(v) = pct_str.parse::<f32>() {
            return MinMax {
                min: MinTrackSizingFunction::percent(v / 100.0),
                max: MaxTrackSizingFunction::percent(v / 100.0),
            };
        }
    }

    // Numeric fallback → px
    if let Ok(v) = s.parse::<f32>() {
        return MinMax {
            min: MinTrackSizingFunction::length(v),
            max: MaxTrackSizingFunction::length(v),
        };
    }

    MinMax {
        min: MinTrackSizingFunction::auto(),
        max: MaxTrackSizingFunction::auto(),
    }
}

/// Parse a grid placement value (number or "auto" or "span N").
fn parse_grid_placement(v: &Value) -> GridPlacement {
    match v {
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                GridPlacement::from_line_index(i as i16)
            } else {
                GridPlacement::Auto
            }
        }
        Value::String(s) if s == "auto" => GridPlacement::Auto,
        Value::String(s) => {
            if let Ok(i) = s.parse::<i16>() {
                GridPlacement::from_line_index(i)
            } else if let Some(span_str) = s.strip_prefix("span ") {
                if let Ok(n) = span_str.parse::<u16>() {
                    GridPlacement::from_span(n)
                } else {
                    GridPlacement::Auto
                }
            } else {
                GridPlacement::Auto
            }
        }
        _ => GridPlacement::Auto,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_flex_row() {
        let style = parse_style(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
        );
        assert_eq!(style.display, Display::Flex);
        assert_eq!(style.flex_direction, FlexDirection::Row);
    }

    #[test]
    fn parse_dimensions() {
        let style = parse_style(r#"{"width":"100px","height":"50%","minWidth":"auto"}"#);
        assert_eq!(style.size.width, Dimension::length(100.0));
        assert_eq!(style.size.height, Dimension::percent(0.5));
        assert_eq!(style.min_size.width, Dimension::auto());
    }

    #[test]
    fn parse_grid_basic() {
        let style =
            parse_style(r#"{"display":"grid","gridTemplateColumns":["1fr","1fr","1fr"]}"#);
        assert_eq!(style.display, Display::Grid);
        assert_eq!(style.grid_template_columns.len(), 3);
    }

    #[test]
    fn parse_flex_alignment() {
        let style = parse_style(
            r#"{"display":"flex","justifyContent":"center","alignItems":"flex-start"}"#,
        );
        assert_eq!(style.justify_content, Some(JustifyContent::Center));
        assert_eq!(style.align_items, Some(AlignItems::Start));
    }

    #[test]
    fn parse_spacing() {
        let style =
            parse_style(r#"{"paddingTop":"8px","paddingLeft":"16px","marginTop":"auto"}"#);
        assert_eq!(style.padding.top, LengthPercentage::length(8.0));
        assert_eq!(style.padding.left, LengthPercentage::length(16.0));
        assert_eq!(style.margin.top, LengthPercentageAuto::auto());
    }

    #[test]
    fn parse_absolute_position() {
        let style = parse_style(r#"{"position":"absolute","insetTop":"0px","insetLeft":"0px"}"#);
        assert_eq!(style.position, Position::Absolute);
        assert_eq!(style.inset.top, LengthPercentageAuto::length(0.0));
    }

    #[test]
    fn parse_overflow_values() {
        let style = parse_style(r#"{"overflowX":"hidden","overflowY":"scroll"}"#);
        assert_eq!(style.overflow.x, Overflow::Hidden);
        assert_eq!(style.overflow.y, Overflow::Scroll);
    }

    #[test]
    fn parse_gap() {
        let style = parse_style(r#"{"columnGap":"12px","rowGap":"8px"}"#);
        assert_eq!(style.gap.width, LengthPercentage::length(12.0));
        assert_eq!(style.gap.height, LengthPercentage::length(8.0));
    }

    #[test]
    fn parse_grid_auto_flow() {
        let style = parse_style(r#"{"display":"grid","gridAutoFlow":"column"}"#);
        assert_eq!(style.display, Display::Grid);
        assert_eq!(style.grid_auto_flow, GridAutoFlow::Column);
    }

    #[test]
    fn parse_flex_grow_shrink() {
        let style = parse_style(r#"{"flexGrow":2.0,"flexShrink":0.5,"flexBasis":"100px"}"#);
        assert_eq!(style.flex_grow, 2.0_f32);
        assert_eq!(style.flex_shrink, 0.5_f32);
        assert_eq!(style.flex_basis, Dimension::length(100.0));
    }

    #[test]
    fn parse_aspect_ratio() {
        let style = parse_style(r#"{"aspectRatio":1.777}"#);
        assert!(style.aspect_ratio.is_some());
    }

    #[test]
    fn parse_display_none() {
        let style = parse_style(r#"{"display":"none"}"#);
        assert_eq!(style.display, Display::None);
    }

    #[test]
    fn parse_empty_object() {
        let style = parse_style(r#"{}"#);
        assert_eq!(style.display, Display::DEFAULT);
    }
}
