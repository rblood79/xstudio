use wasm_bindgen::prelude::*;

/// Parse a CSS grid-template-columns/rows string into resolved track sizes.
///
/// Supports: `px`, `fr`, `%`, `auto` units.
/// Example: "1fr 2fr 100px" with available=400 → [100, 200, 100]
///
/// # Arguments
/// * `template` - CSS grid template string (e.g., "1fr 2fr 100px")
/// * `available` - Available space in pixels for the axis
/// * `gap` - Gap between tracks in pixels
///
/// # Returns
/// Float32Array of resolved track sizes in pixels
#[wasm_bindgen]
pub fn parse_tracks(template: &str, available: f32, gap: f32) -> Box<[f32]> {
    let trimmed = template.trim();
    if trimmed.is_empty() {
        return Vec::new().into_boxed_slice();
    }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    let track_count = parts.len();

    // First pass: collect fixed sizes and fr counts
    let mut tracks: Vec<(f32, bool)> = Vec::with_capacity(track_count); // (size, is_flexible)
    let mut fr_total: f32 = 0.0;
    let mut fixed_total: f32 = 0.0;

    for part in &parts {
        if part.ends_with("fr") {
            let fr_val = part.trim_end_matches("fr").parse::<f32>().unwrap_or(1.0);
            fr_total += fr_val;
            tracks.push((fr_val, true));
        } else if part.ends_with("px") {
            let px_val = part.trim_end_matches("px").parse::<f32>().unwrap_or(0.0);
            fixed_total += px_val;
            tracks.push((px_val, false));
        } else if part.ends_with('%') {
            let pct = part.trim_end_matches('%').parse::<f32>().unwrap_or(0.0);
            let px_val = (pct / 100.0) * available;
            fixed_total += px_val;
            tracks.push((px_val, false));
        } else if *part == "auto" {
            // auto treated as 1fr
            fr_total += 1.0;
            tracks.push((1.0, true));
        } else {
            // Unknown → treat as 1fr
            fr_total += 1.0;
            tracks.push((1.0, true));
        }
    }

    // Account for gaps between tracks
    let total_gap = if track_count > 1 {
        gap * (track_count as f32 - 1.0)
    } else {
        0.0
    };

    let remaining = (available - fixed_total - total_gap).max(0.0);
    let fr_size = if fr_total > 0.0 {
        remaining / fr_total
    } else {
        0.0
    };

    // Second pass: resolve flexible tracks
    let result: Vec<f32> = tracks
        .iter()
        .map(|(val, is_flex)| {
            if *is_flex {
                fr_size * val
            } else {
                *val
            }
        })
        .collect();

    result.into_boxed_slice()
}

/// Calculate grid cell positions for auto-flow (row-major) children.
///
/// # Arguments
/// * `tracks_x` - Column track sizes from parse_tracks()
/// * `tracks_y` - Row track sizes from parse_tracks()
/// * `col_gap` - Column gap in pixels
/// * `row_gap` - Row gap in pixels
/// * `child_count` - Number of children to position
///
/// # Returns
/// Float32Array: [x, y, w, h, ...] for each child (4 values per child)
#[wasm_bindgen]
pub fn calculate_cell_positions(
    tracks_x: &[f32],
    tracks_y: &[f32],
    col_gap: f32,
    row_gap: f32,
    child_count: u32,
) -> Box<[f32]> {
    let cols = tracks_x.len().max(1);
    let child_count = child_count as usize;

    if child_count == 0 {
        return Vec::new().into_boxed_slice();
    }

    // Precompute column x positions
    let mut col_x = Vec::with_capacity(cols);
    let mut x_acc: f32 = 0.0;
    for (i, &track_w) in tracks_x.iter().enumerate() {
        col_x.push(x_acc);
        x_acc += track_w;
        if i < cols - 1 {
            x_acc += col_gap;
        }
    }

    // Precompute row y positions
    let rows = tracks_y.len().max(1);
    let mut row_y = Vec::with_capacity(rows);
    let mut y_acc: f32 = 0.0;
    for (i, &track_h) in tracks_y.iter().enumerate() {
        row_y.push(y_acc);
        y_acc += track_h;
        if i < rows - 1 {
            y_acc += row_gap;
        }
    }

    let mut result = Vec::with_capacity(child_count * 4);

    for i in 0..child_count {
        let col = i % cols;
        let row = i / cols;

        let x = if col < col_x.len() { col_x[col] } else { 0.0 };
        let y = if row < row_y.len() { row_y[row] } else { 0.0 };
        let w = if col < tracks_x.len() {
            tracks_x[col]
        } else if !tracks_x.is_empty() {
            tracks_x[0]
        } else {
            100.0
        };
        let h = if row < tracks_y.len() {
            tracks_y[row]
        } else if !tracks_y.is_empty() {
            tracks_y[0]
        } else {
            100.0
        };

        result.push(x);
        result.push(y);
        result.push(w);
        result.push(h);
    }

    result.into_boxed_slice()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f32, b: f32) -> bool {
        (a - b).abs() < 0.01
    }

    #[test]
    fn test_parse_tracks_fr() {
        let result = parse_tracks("1fr 2fr", 300.0, 0.0);
        assert_eq!(result.len(), 2);
        assert!(approx_eq(result[0], 100.0));
        assert!(approx_eq(result[1], 200.0));
    }

    #[test]
    fn test_parse_tracks_px() {
        let result = parse_tracks("100px 200px", 400.0, 0.0);
        assert_eq!(result.len(), 2);
        assert!(approx_eq(result[0], 100.0));
        assert!(approx_eq(result[1], 200.0));
    }

    #[test]
    fn test_parse_tracks_mixed() {
        let result = parse_tracks("100px 1fr 2fr", 400.0, 0.0);
        assert_eq!(result.len(), 3);
        assert!(approx_eq(result[0], 100.0));
        assert!(approx_eq(result[1], 100.0)); // 300 remaining / 3fr * 1fr
        assert!(approx_eq(result[2], 200.0)); // 300 remaining / 3fr * 2fr
    }

    #[test]
    fn test_parse_tracks_percent() {
        let result = parse_tracks("50% 1fr", 400.0, 0.0);
        assert_eq!(result.len(), 2);
        assert!(approx_eq(result[0], 200.0));
        assert!(approx_eq(result[1], 200.0));
    }

    #[test]
    fn test_parse_tracks_auto() {
        let result = parse_tracks("auto auto", 400.0, 0.0);
        assert_eq!(result.len(), 2);
        assert!(approx_eq(result[0], 200.0));
        assert!(approx_eq(result[1], 200.0));
    }

    #[test]
    fn test_parse_tracks_with_gap() {
        let result = parse_tracks("1fr 1fr", 400.0, 20.0);
        assert_eq!(result.len(), 2);
        // available - gap = 400 - 20 = 380, / 2 = 190
        assert!(approx_eq(result[0], 190.0));
        assert!(approx_eq(result[1], 190.0));
    }

    #[test]
    fn test_parse_tracks_empty() {
        let result = parse_tracks("", 400.0, 0.0);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_cell_positions_basic() {
        let tracks_x = [100.0, 200.0];
        let tracks_y = [50.0, 60.0];

        let result = calculate_cell_positions(&tracks_x, &tracks_y, 0.0, 0.0, 4);
        assert_eq!(result.len(), 16);

        // child 0: col=0, row=0
        assert!(approx_eq(result[0], 0.0)); // x
        assert!(approx_eq(result[1], 0.0)); // y
        assert!(approx_eq(result[2], 100.0)); // w
        assert!(approx_eq(result[3], 50.0)); // h

        // child 1: col=1, row=0
        assert!(approx_eq(result[4], 100.0)); // x
        assert!(approx_eq(result[5], 0.0)); // y
        assert!(approx_eq(result[6], 200.0)); // w

        // child 2: col=0, row=1
        assert!(approx_eq(result[8], 0.0)); // x
        assert!(approx_eq(result[9], 50.0)); // y

        // child 3: col=1, row=1
        assert!(approx_eq(result[12], 100.0)); // x
        assert!(approx_eq(result[13], 50.0)); // y
    }

    #[test]
    fn test_cell_positions_with_gap() {
        let tracks_x = [100.0, 200.0];
        let tracks_y = [50.0, 60.0];

        let result = calculate_cell_positions(&tracks_x, &tracks_y, 10.0, 20.0, 4);

        // child 1: col=1, row=0 → x = 100 + 10 (gap) = 110
        assert!(approx_eq(result[4], 110.0));

        // child 2: col=0, row=1 → y = 50 + 20 (gap) = 70
        assert!(approx_eq(result[9], 70.0));
    }

    #[test]
    fn test_cell_positions_empty() {
        let tracks_x = [100.0];
        let tracks_y = [50.0];

        let result = calculate_cell_positions(&tracks_x, &tracks_y, 0.0, 0.0, 0);
        assert_eq!(result.len(), 0);
    }
}
