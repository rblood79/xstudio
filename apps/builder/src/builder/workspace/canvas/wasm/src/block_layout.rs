use wasm_bindgen::prelude::*;

/// Block layout field count per child element.
/// Fields: display, width, height, m_top, m_right, m_bottom, m_left,
///         bfc_flag, pad_v, border_v, min_w, max_w, min_h, max_h,
///         content_w, content_h, vertical_align, baseline, line_height
pub const FIELD_COUNT: usize = 19;

/// Output fields per child: x, y, width, height
const OUT_FIELDS: usize = 4;

// Display types
#[allow(dead_code)]
const DISPLAY_BLOCK: u8 = 0;
const DISPLAY_INLINE_BLOCK: u8 = 1;
const DISPLAY_EMPTY_BLOCK: u8 = 2; // pre-classified empty block

// Vertical align
const VALIGN_BASELINE: u8 = 0;
const VALIGN_TOP: u8 = 1;
const VALIGN_MIDDLE: u8 = 2;
const VALIGN_BOTTOM: u8 = 3;

/// Sentinel for "auto" (no explicit value)
const AUTO: f32 = -1.0;

/// CSS margin collapse (CSS 2.1 §8.3.1)
#[inline]
fn collapse_margins(a: f32, b: f32) -> f32 {
    if a >= 0.0 && b >= 0.0 {
        a.max(b)
    } else if a < 0.0 && b < 0.0 {
        a.min(b)
    } else {
        a + b
    }
}

/// Clamp a size value between min and max (AUTO = no limit)
#[inline]
fn clamp_size(value: f32, min_val: f32, max_val: f32) -> f32 {
    let mut result = value;
    if min_val != AUTO {
        result = result.max(min_val);
    }
    if max_val != AUTO {
        result = result.min(max_val);
    }
    result
}

/// Inline-block item in a line box (temporary storage during calculation)
struct LineItem {
    /// Index into output array
    out_index: usize,
    x: f32,
    #[allow(dead_code)]
    width: f32,
    height: f32,
    margin_top: f32,
    margin_bottom: f32,
    vertical_align: u8,
    baseline: f32,
    line_height: f32,
}

/// Calculate block layout for pre-processed children.
///
/// # Arguments
/// * `data` - Flat Float32Array with FIELD_COUNT fields per child
/// * `available_width` - Parent's available content width
/// * `available_height` - Parent's available content height
/// * `can_collapse_top` - Whether first child can collapse with parent top
/// * `can_collapse_bottom` - Whether last child can collapse with parent bottom
/// * `prev_sibling_margin_bottom` - Previous sibling's margin bottom (context)
///
/// # Returns
/// Float32Array: [x, y, w, h, ...] for each child, plus 2 trailing values:
/// [firstChildMarginTop, lastChildMarginBottom]
#[wasm_bindgen]
pub fn block_layout(
    data: &[f32],
    available_width: f32,
    available_height: f32,
    can_collapse_top: bool,
    can_collapse_bottom: bool,
    prev_sibling_margin_bottom: f32,
) -> Box<[f32]> {
    let _ = available_height; // reserved for future use
    let child_count = data.len() / FIELD_COUNT;
    if child_count == 0 {
        return vec![0.0, 0.0].into_boxed_slice();
    }

    // Output: 4 values per child + 2 trailing metadata
    let mut out = vec![0.0f32; child_count * OUT_FIELDS + 2];

    let mut current_y: f32 = 0.0;
    let mut current_x: f32 = 0.0;
    let mut prev_margin_bottom = prev_sibling_margin_bottom;
    let mut first_child_margin_top: f32 = 0.0;
    let mut last_child_margin_bottom: f32 = 0.0;
    let mut is_first_block = true;

    // LineBox accumulator for inline-block elements
    let mut line_items: Vec<LineItem> = Vec::new();

    for i in 0..child_count {
        let off = i * FIELD_COUNT;
        let display = data[off] as u8;
        let width_val = data[off + 1]; // AUTO = -1
        let height_val = data[off + 2]; // AUTO = -1
        let m_top = data[off + 3];
        let m_right = data[off + 4];
        let m_bottom = data[off + 5];
        let m_left = data[off + 6];
        let bfc_flag = data[off + 7] as u8; // 1 = creates BFC
        let pad_border_v = data[off + 8]; // padding_v + border_v combined
        let pad_border_h = data[off + 9]; // padding_h + border_h combined
        let min_w = data[off + 10];
        let max_w = data[off + 11];
        let min_h = data[off + 12];
        let max_h = data[off + 13];
        let content_w = data[off + 14];
        let content_h = data[off + 15];
        let vertical_align = data[off + 16] as u8;
        let baseline = data[off + 17];
        let line_height = data[off + 18]; // AUTO = -1

        let child_creates_bfc = bfc_flag == 1;
        let out_off = i * OUT_FIELDS;

        if display == DISPLAY_INLINE_BLOCK {
            // Inline-block: accumulate into line box
            let child_content_w = clamp_size(
                if width_val != AUTO { width_val } else { content_w },
                min_w, max_w,
            );
            let child_content_h = clamp_size(
                if height_val != AUTO { height_val } else { content_h },
                min_h, max_h,
            );
            let child_w = child_content_w + pad_border_h;
            let child_h = child_content_h + pad_border_v;
            let total_width = child_w + m_left + m_right;

            // Line wrap check
            if current_x + total_width > available_width && current_x > 0.0 {
                flush_line_box(&line_items, current_y, &mut out);
                current_y += calculate_line_box_height(&line_items);
                current_x = 0.0;
                line_items.clear();
            }

            line_items.push(LineItem {
                out_index: out_off,
                x: current_x + m_left,
                width: child_w,
                height: child_h,
                margin_top: m_top,
                margin_bottom: m_bottom,
                vertical_align,
                baseline,
                line_height,
            });

            // Write width/height (x/y will be set by flush_line_box)
            out[out_off + 2] = child_w;
            out[out_off + 3] = child_h;

            current_x += total_width;
            prev_margin_bottom = 0.0;
            is_first_block = false;
        } else if display == DISPLAY_EMPTY_BLOCK {
            // Empty block: self-collapse top/bottom margins
            if !line_items.is_empty() {
                current_y += calculate_line_box_height(&line_items);
                flush_line_box(&line_items, current_y - calculate_line_box_height(&line_items), &mut out);
                current_x = 0.0;
                line_items.clear();
            }

            let collapsed_self = collapse_margins(m_top, m_bottom);
            let final_margin = collapse_margins(prev_margin_bottom, collapsed_self);

            out[out_off] = m_left;
            out[out_off + 1] = current_y + final_margin;
            out[out_off + 2] = available_width - m_left - m_right;
            out[out_off + 3] = 0.0;

            if is_first_block && can_collapse_top {
                first_child_margin_top = collapse_margins(first_child_margin_top, collapsed_self);
            }
            last_child_margin_bottom = collapsed_self;
            prev_margin_bottom = collapsed_self;
        } else {
            // Block: vertical stacking + margin collapse
            if !line_items.is_empty() {
                let lbh = calculate_line_box_height(&line_items);
                flush_line_box(&line_items, current_y, &mut out);
                current_y += lbh;
                current_x = 0.0;
                line_items.clear();
            }

            if is_first_block {
                if can_collapse_top && !child_creates_bfc {
                    first_child_margin_top = m_top;
                    prev_margin_bottom = 0.0;
                }
                is_first_block = false;
            }

            let collapsed_margin_top = if child_creates_bfc {
                prev_margin_bottom + m_top
            } else {
                collapse_margins(prev_margin_bottom, m_top)
            };
            current_y += collapsed_margin_top;

            // Block width
            let child_content_w = clamp_size(
                if width_val != AUTO {
                    width_val
                } else {
                    available_width - m_left - m_right
                },
                min_w, max_w,
            );
            let child_content_h = clamp_size(
                if height_val != AUTO { height_val } else { content_h },
                min_h, max_h,
            );

            // Auto-width already includes padding+border conceptually
            // Explicit width needs padding+border added
            let child_w = if width_val != AUTO {
                child_content_w + pad_border_h
            } else {
                child_content_w
            };
            let child_h = child_content_h + pad_border_v;

            out[out_off] = m_left;
            out[out_off + 1] = current_y;
            out[out_off + 2] = child_w;
            out[out_off + 3] = child_h;

            current_y += child_h;

            if child_creates_bfc {
                prev_margin_bottom = m_bottom;
                last_child_margin_bottom = 0.0;
            } else {
                prev_margin_bottom = m_bottom;
                last_child_margin_bottom = m_bottom;
            }
        }
    }

    // Flush remaining line box
    if !line_items.is_empty() {
        flush_line_box(&line_items, current_y, &mut out);
    }

    // Trailing metadata
    if !can_collapse_top {
        first_child_margin_top = 0.0;
    }
    if !can_collapse_bottom {
        last_child_margin_bottom = 0.0;
    }

    let meta_off = child_count * OUT_FIELDS;
    out[meta_off] = first_child_margin_top;
    out[meta_off + 1] = last_child_margin_bottom;

    out.into_boxed_slice()
}

/// Calculate line box height from items
fn calculate_line_box_height(items: &[LineItem]) -> f32 {
    if items.is_empty() {
        return 0.0;
    }

    let mut max_total_height: f32 = 0.0;
    let mut max_baseline_from_top: f32 = 0.0;

    for item in items {
        let total_h = item.height + item.margin_top + item.margin_bottom;
        max_total_height = max_total_height.max(total_h);

        if item.line_height != AUTO {
            let lh_with_margin = item.line_height + item.margin_top + item.margin_bottom;
            max_total_height = max_total_height.max(lh_with_margin);
        }

        if item.vertical_align == VALIGN_BASELINE {
            let baseline_from_top = item.margin_top + item.baseline;
            max_baseline_from_top = max_baseline_from_top.max(baseline_from_top);
        }
    }

    let mut max_below_baseline: f32 = 0.0;
    for item in items {
        if item.vertical_align == VALIGN_BASELINE {
            let below = item.height - item.baseline + item.margin_bottom;
            max_below_baseline = max_below_baseline.max(below);
        }
    }

    let baseline_height = max_baseline_from_top + max_below_baseline;
    max_total_height.max(baseline_height)
}

/// Flush line box items: compute vertical positions and write x/y to output
fn flush_line_box(items: &[LineItem], start_y: f32, out: &mut [f32]) {
    if items.is_empty() {
        return;
    }

    let line_box_height = calculate_line_box_height(items);

    // Calculate baseline for the line box
    let mut line_baseline: f32 = 0.0;
    for item in items {
        if item.vertical_align == VALIGN_BASELINE {
            let baseline_from_top = item.margin_top + item.baseline;
            line_baseline = line_baseline.max(baseline_from_top);
        }
    }

    for item in items {
        let final_y = match item.vertical_align {
            VALIGN_TOP => start_y + item.margin_top,
            VALIGN_BOTTOM => start_y + line_box_height - item.height - item.margin_bottom,
            VALIGN_MIDDLE => {
                start_y
                    + (line_box_height - item.height - item.margin_top - item.margin_bottom) / 2.0
                    + item.margin_top
            }
            _ => {
                // baseline (default)
                start_y + line_baseline - item.baseline
            }
        };

        out[item.out_index] = item.x;
        out[item.out_index + 1] = final_y;
        // width and height already written
    }
}

/// Exposed margin collapse for debugging/testing from JS
#[wasm_bindgen]
pub fn wasm_collapse_margins(a: f32, b: f32) -> f32 {
    collapse_margins(a, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_block(width: f32, height: f32, m_top: f32, m_bottom: f32) -> Vec<f32> {
        vec![
            DISPLAY_BLOCK as f32, // display
            width,                // width (AUTO=-1)
            height,               // height (AUTO=-1)
            m_top,                // margin_top
            0.0,                  // margin_right
            m_bottom,             // margin_bottom
            0.0,                  // margin_left
            0.0,                  // bfc_flag
            0.0,                  // pad_border_v
            0.0,                  // pad_border_h
            AUTO,                 // min_w
            AUTO,                 // max_w
            AUTO,                 // min_h
            AUTO,                 // max_h
            100.0,                // content_w
            height.max(0.0),      // content_h
            0.0,                  // vertical_align
            0.0,                  // baseline
            AUTO,                 // line_height
        ]
    }

    fn make_inline_block(width: f32, height: f32, valign: u8) -> Vec<f32> {
        vec![
            DISPLAY_INLINE_BLOCK as f32,
            width, height,
            0.0, 0.0, 0.0, 0.0, // margins
            0.0,                  // bfc_flag
            0.0, 0.0,           // pad_border
            AUTO, AUTO, AUTO, AUTO, // min/max
            width.max(0.0), height.max(0.0), // content
            valign as f32,
            height.max(0.0) * 0.8, // baseline ~80%
            AUTO,                  // line_height
        ]
    }

    #[test]
    fn test_vertical_stacking() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, 0.0));
        data.extend(make_block(AUTO, 200.0, 0.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // child 0: y=0, h=100
        assert_eq!(result[1], 0.0);
        assert_eq!(result[3], 100.0);
        // child 1: y=100, h=200
        assert_eq!(result[5], 100.0);
        assert_eq!(result[7], 200.0);
    }

    #[test]
    fn test_margin_collapse_positive() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, 20.0));
        data.extend(make_block(AUTO, 100.0, 30.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // child 1 y = 100 + max(20, 30) = 130
        assert_eq!(result[5], 130.0);
    }

    #[test]
    fn test_margin_collapse_negative() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, -10.0));
        data.extend(make_block(AUTO, 100.0, -20.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // child 1 y = 100 + min(-10, -20) = 80
        assert_eq!(result[5], 80.0);
    }

    #[test]
    fn test_margin_collapse_mixed() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, 20.0));
        data.extend(make_block(AUTO, 100.0, -10.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // child 1 y = 100 + (20 + -10) = 110
        assert_eq!(result[5], 110.0);
    }

    #[test]
    fn test_bfc_blocks_collapse() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, 20.0));
        // second child creates BFC
        let mut child2 = make_block(AUTO, 100.0, 30.0, 0.0);
        child2[7] = 1.0; // bfc_flag
        data.extend(child2);

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // BFC: no collapse, y = 100 + 20 + 30 = 150
        assert_eq!(result[5], 150.0);
    }

    #[test]
    fn test_inline_block_horizontal() {
        let mut data = Vec::new();
        data.extend(make_inline_block(50.0, 30.0, VALIGN_BASELINE));
        data.extend(make_inline_block(60.0, 40.0, VALIGN_BASELINE));

        let result = block_layout(&data, 400.0, 400.0, false, false, 0.0);
        // child 0: x=0
        assert_eq!(result[0], 0.0);
        // child 1: x=50
        assert_eq!(result[4], 50.0);
    }

    #[test]
    fn test_inline_block_line_wrap() {
        let mut data = Vec::new();
        data.extend(make_inline_block(200.0, 30.0, VALIGN_BASELINE));
        data.extend(make_inline_block(250.0, 40.0, VALIGN_BASELINE));

        let result = block_layout(&data, 400.0, 400.0, false, false, 0.0);
        // child 0: x=0, y on first line
        assert_eq!(result[0], 0.0);
        // child 1: x=0 (wrapped to next line)
        assert_eq!(result[4], 0.0);
        // child 1 y should be > 0 (after first line)
        assert!(result[5] > 0.0);
    }

    #[test]
    fn test_empty_block() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 0.0, 20.0));
        // Empty block
        let mut empty = make_block(AUTO, 0.0, 10.0, 15.0);
        empty[0] = DISPLAY_EMPTY_BLOCK as f32;
        empty[2] = AUTO; // height = auto
        empty[15] = 0.0; // content_h = 0
        data.extend(empty);
        data.extend(make_block(AUTO, 100.0, 5.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, false, false, 0.0);
        // Empty block height = 0
        assert_eq!(result[7], 0.0);
    }

    #[test]
    fn test_parent_child_collapse_top() {
        let mut data = Vec::new();
        data.extend(make_block(AUTO, 100.0, 20.0, 0.0));

        let result = block_layout(&data, 400.0, 800.0, true, false, 0.0);
        let meta_off = 1 * OUT_FIELDS;
        // firstChildMarginTop should be 20 (collapsed to parent)
        assert_eq!(result[meta_off], 20.0);
    }

    #[test]
    fn test_collapse_margins_fn() {
        assert_eq!(wasm_collapse_margins(20.0, 30.0), 30.0);
        assert_eq!(wasm_collapse_margins(-10.0, -20.0), -20.0);
        assert_eq!(wasm_collapse_margins(20.0, -10.0), 10.0);
    }
}
