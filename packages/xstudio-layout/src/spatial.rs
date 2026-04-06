use std::collections::{HashMap, HashSet};

// ---------------------------------------------------------------------------
// SpatialGrid — cell-based spatial index for hit testing
// Cell size: 256px (matches TypeScript spatialIndex.ts)
// ---------------------------------------------------------------------------

pub struct SpatialGrid {
    cell_size: f32,
    /// cell coords (col, row) → element IDs in that cell
    cells: HashMap<(i32, i32), Vec<u32>>,
    /// id → (x, y, w, h) bounding box
    bounds: HashMap<u32, (f32, f32, f32, f32)>,
}

impl SpatialGrid {
    pub fn new(cell_size: f32) -> Self {
        Self {
            cell_size,
            cells: HashMap::new(),
            bounds: HashMap::new(),
        }
    }

    /// Insert or update an element's bounding box.
    pub fn upsert(&mut self, id: u32, x: f32, y: f32, w: f32, h: f32) {
        // Remove from old cells if already tracked
        self.remove(id);

        // Insert into all overlapping cells
        let (col_min, row_min, col_max, row_max) = self.cells_for_rect(x, y, x + w, y + h);
        for col in col_min..=col_max {
            for row in row_min..=row_max {
                self.cells.entry((col, row)).or_default().push(id);
            }
        }

        self.bounds.insert(id, (x, y, w, h));
    }

    /// Remove an element from the index.
    pub fn remove(&mut self, id: u32) {
        let Some((x, y, w, h)) = self.bounds.remove(&id) else {
            return;
        };

        let (col_min, row_min, col_max, row_max) = self.cells_for_rect(x, y, x + w, y + h);
        for col in col_min..=col_max {
            for row in row_min..=row_max {
                if let Some(cell) = self.cells.get_mut(&(col, row)) {
                    cell.retain(|&existing| existing != id);
                    if cell.is_empty() {
                        self.cells.remove(&(col, row));
                    }
                }
            }
        }
    }

    /// Returns all element IDs whose bounds contain the point (x, y).
    pub fn query_point(&self, x: f32, y: f32) -> Vec<u32> {
        let col = self.cell_coord(x);
        let row = self.cell_coord(y);

        let Some(cell) = self.cells.get(&(col, row)) else {
            return Vec::new();
        };

        cell.iter()
            .copied()
            .filter(|id| {
                if let Some(&(bx, by, bw, bh)) = self.bounds.get(id) {
                    x >= bx && x <= bx + bw && y >= by && y <= by + bh
                } else {
                    false
                }
            })
            .collect()
    }

    /// Returns all element IDs whose bounds intersect [left, top, right, bottom].
    pub fn query_rect(&self, left: f32, top: f32, right: f32, bottom: f32) -> Vec<u32> {
        let (col_min, row_min, col_max, row_max) = self.cells_for_rect(left, top, right, bottom);

        let mut seen: HashSet<u32> = HashSet::new();
        let mut result: Vec<u32> = Vec::new();

        for col in col_min..=col_max {
            for row in row_min..=row_max {
                let Some(cell) = self.cells.get(&(col, row)) else {
                    continue;
                };
                for &id in cell {
                    if seen.insert(id) {
                        if let Some(&(bx, by, bw, bh)) = self.bounds.get(&id) {
                            // AABB intersection check
                            if bx < right && bx + bw > left && by < bottom && by + bh > top {
                                result.push(id);
                            }
                        }
                    }
                }
            }
        }

        result
    }

    /// Clear all data.
    pub fn clear(&mut self) {
        self.cells.clear();
        self.bounds.clear();
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    #[inline]
    fn cell_coord(&self, v: f32) -> i32 {
        (v / self.cell_size).floor() as i32
    }

    /// Returns (col_min, row_min, col_max, row_max) for a rect [left, top, right, bottom].
    #[inline]
    fn cells_for_rect(&self, left: f32, top: f32, right: f32, bottom: f32) -> (i32, i32, i32, i32) {
        let col_min = self.cell_coord(left);
        let row_min = self.cell_coord(top);
        // right/bottom are exclusive edges — use the pixel just inside
        let col_max = self.cell_coord((right - f32::EPSILON).max(left));
        let row_max = self.cell_coord((bottom - f32::EPSILON).max(top));
        (col_min, row_min, col_max, row_max)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upsert_and_query_point() {
        let mut grid = SpatialGrid::new(256.0);
        grid.upsert(1, 100.0, 100.0, 50.0, 50.0);

        let hits = grid.query_point(125.0, 125.0);
        assert_eq!(hits, vec![1]);

        let misses = grid.query_point(200.0, 200.0);
        assert!(misses.is_empty());
    }

    #[test]
    fn query_rect() {
        let mut grid = SpatialGrid::new(256.0);
        grid.upsert(1, 0.0, 0.0, 100.0, 100.0);
        grid.upsert(2, 200.0, 200.0, 100.0, 100.0);
        grid.upsert(3, 500.0, 500.0, 100.0, 100.0);

        let hits = grid.query_rect(0.0, 0.0, 350.0, 350.0);
        assert!(hits.contains(&1));
        assert!(hits.contains(&2));
        assert!(!hits.contains(&3));
    }

    #[test]
    fn remove_element() {
        let mut grid = SpatialGrid::new(256.0);
        grid.upsert(1, 100.0, 100.0, 50.0, 50.0);
        grid.remove(1);

        let hits = grid.query_point(125.0, 125.0);
        assert!(hits.is_empty());
    }

    #[test]
    fn upsert_updates_position() {
        let mut grid = SpatialGrid::new(256.0);
        grid.upsert(1, 100.0, 100.0, 50.0, 50.0);
        // Move element to a different location
        grid.upsert(1, 400.0, 400.0, 50.0, 50.0);

        // Old position should be empty
        let old = grid.query_point(125.0, 125.0);
        assert!(old.is_empty());

        // New position should have the element
        let new = grid.query_point(425.0, 425.0);
        assert_eq!(new, vec![1]);
    }

    #[test]
    fn element_spanning_multiple_cells() {
        let mut grid = SpatialGrid::new(256.0);
        // Element spans cells (0,0) and (1,0) — width > 256
        grid.upsert(1, 100.0, 100.0, 300.0, 50.0);

        // Both halves should find the element
        let hit_left = grid.query_point(150.0, 125.0);
        assert_eq!(hit_left, vec![1]);

        let hit_right = grid.query_point(350.0, 125.0);
        assert_eq!(hit_right, vec![1]);
    }

    #[test]
    fn clear_removes_all() {
        let mut grid = SpatialGrid::new(256.0);
        grid.upsert(1, 0.0, 0.0, 100.0, 100.0);
        grid.upsert(2, 200.0, 200.0, 100.0, 100.0);
        grid.clear();

        assert!(grid.query_point(50.0, 50.0).is_empty());
        assert!(grid.query_rect(0.0, 0.0, 400.0, 400.0).is_empty());
    }
}
