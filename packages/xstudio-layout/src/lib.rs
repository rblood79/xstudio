mod spatial;
mod style;

use std::collections::HashMap;
use taffy::prelude::*;
use wasm_bindgen::prelude::*;

use spatial::SpatialGrid;
use style::parse_style;

// ---------------------------------------------------------------------------
// FNV-1a 64-bit hash (no external dependency)
// ---------------------------------------------------------------------------

fn fnv1a_hash(data: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in data.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

// ---------------------------------------------------------------------------
// UpdateResult — returned by update_style as u8
// ---------------------------------------------------------------------------

/// 0 = Unchanged, 1 = Dirty, 2 = NeedsFullRebuild
const UPDATE_UNCHANGED: u8 = 0;
const UPDATE_DIRTY: u8 = 1;
const UPDATE_NEEDS_FULL_REBUILD: u8 = 2;

// ---------------------------------------------------------------------------
// Per-node metadata
// ---------------------------------------------------------------------------

struct NodeMeta {
    node_id: NodeId,
    style_hash: u64,
    display: Display,
}

// ---------------------------------------------------------------------------
// LayoutEngine
// ---------------------------------------------------------------------------

#[wasm_bindgen]
pub struct LayoutEngine {
    tree: TaffyTree<()>,
    /// handle (u32) → NodeMeta
    nodes: HashMap<u32, NodeMeta>,
    next_handle: u32,
    spatial: SpatialGrid,
}

#[wasm_bindgen]
impl LayoutEngine {
    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
            nodes: HashMap::new(),
            next_handle: 1,
            spatial: SpatialGrid::new(256.0),
        }
    }

    // -----------------------------------------------------------------------
    // Utility
    // -----------------------------------------------------------------------

    fn alloc_handle(&mut self) -> u32 {
        let h = self.next_handle;
        self.next_handle += 1;
        h
    }

    fn node_id(&self, handle: u32) -> Option<NodeId> {
        self.nodes.get(&handle).map(|m| m.node_id)
    }

    // -----------------------------------------------------------------------
    // Node creation
    // -----------------------------------------------------------------------

    /// Create a leaf node with the given style JSON.  Returns a u32 handle.
    pub fn create_node(&mut self, style_json: &str) -> u32 {
        let style = parse_style(style_json);
        let display = style.display;
        let hash = fnv1a_hash(style_json);
        let node_id = self.tree.new_leaf(style).expect("taffy new_leaf");
        let handle = self.alloc_handle();
        self.nodes.insert(
            handle,
            NodeMeta {
                node_id,
                style_hash: hash,
                display,
            },
        );
        handle
    }

    /// Create a node with pre-existing children (handles).
    pub fn create_node_with_children(
        &mut self,
        style_json: &str,
        children: &[u32],
    ) -> u32 {
        let style = parse_style(style_json);
        let display = style.display;
        let hash = fnv1a_hash(style_json);

        let child_ids: Vec<NodeId> = children
            .iter()
            .filter_map(|h| self.node_id(*h))
            .collect();

        let node_id = self
            .tree
            .new_with_children(style, &child_ids)
            .expect("taffy new_with_children");

        let handle = self.alloc_handle();
        self.nodes.insert(
            handle,
            NodeMeta {
                node_id,
                style_hash: hash,
                display,
            },
        );
        handle
    }

    // -----------------------------------------------------------------------
    // Style update
    // -----------------------------------------------------------------------

    /// Update the style of an existing node.
    /// Returns 0=Unchanged, 1=Dirty, 2=NeedsFullRebuild.
    pub fn update_style(&mut self, handle: u32, style_json: &str) -> u8 {
        let new_hash = fnv1a_hash(style_json);

        let meta = match self.nodes.get_mut(&handle) {
            Some(m) => m,
            None => return UPDATE_UNCHANGED,
        };

        if meta.style_hash == new_hash {
            return UPDATE_UNCHANGED;
        }

        let new_style = parse_style(style_json);
        let new_display = new_style.display;
        let old_display = meta.display;

        let node_id = meta.node_id;
        self.tree
            .set_style(node_id, new_style)
            .expect("taffy set_style");

        // Update metadata
        let meta = self.nodes.get_mut(&handle).unwrap();
        meta.style_hash = new_hash;
        meta.display = new_display;

        if old_display != new_display {
            UPDATE_NEEDS_FULL_REBUILD
        } else {
            UPDATE_DIRTY
        }
    }

    // -----------------------------------------------------------------------
    // Tree mutations
    // -----------------------------------------------------------------------

    pub fn set_children(&mut self, handle: u32, children: &[u32]) {
        let node_id = match self.node_id(handle) {
            Some(id) => id,
            None => return,
        };
        let child_ids: Vec<NodeId> = children
            .iter()
            .filter_map(|h| self.node_id(*h))
            .collect();
        self.tree
            .set_children(node_id, &child_ids)
            .expect("taffy set_children");
    }

    pub fn remove_node(&mut self, handle: u32) {
        if let Some(meta) = self.nodes.remove(&handle) {
            let _ = self.tree.remove(meta.node_id);
        }
    }

    pub fn mark_dirty(&mut self, handle: u32) {
        if let Some(node_id) = self.node_id(handle) {
            let _ = self.tree.mark_dirty(node_id);
        }
    }

    // -----------------------------------------------------------------------
    // CSS 보정: overflow flex-shrink + min-width auto
    // -----------------------------------------------------------------------

    /// CSS 보정: overflow !== "visible" 부모의 flex 자식에 flexShrink=0 주입.
    ///
    /// CSS 스펙: overflow가 visible이 아닌 flex 컨테이너(hidden/clip/scroll/auto)의
    /// 자식은 shrink하지 않고 overflow 허용. Taffy는 이 상호작용을 지원하지 않으므로
    /// 명시적 flexShrink=0 주입이 필요.
    ///
    /// `parent_style_json`에서 overflow/flexDirection을 파싱하여
    /// `child_handles`의 해당 축 flexShrink를 0으로 설정.
    /// 이미 명시적 flexShrink가 설정된 자식은 건너뜀.
    pub fn apply_overflow_shrink_fix(
        &mut self,
        parent_style_json: &str,
        child_handles: &[u32],
        child_explicit_shrink: &[u8], // 1=explicit, 0=default
    ) {
        let value: serde_json::Value =
            serde_json::from_str(parent_style_json).unwrap_or(serde_json::Value::Null);
        let obj = match &value {
            serde_json::Value::Object(m) => m,
            _ => return,
        };

        let overflow = obj
            .get("overflow")
            .and_then(|v| v.as_str())
            .unwrap_or("visible");
        let overflow_x = obj
            .get("overflowX")
            .and_then(|v| v.as_str())
            .unwrap_or(overflow);
        let overflow_y = obj
            .get("overflowY")
            .and_then(|v| v.as_str())
            .unwrap_or(overflow);

        let is_clipped_x = overflow_x != "visible";
        let is_clipped_y = overflow_y != "visible";

        if !is_clipped_x && !is_clipped_y {
            return;
        }

        let flex_dir = obj
            .get("flexDirection")
            .and_then(|v| v.as_str())
            .unwrap_or("row");
        let is_row = flex_dir == "row" || flex_dir == "row-reverse";

        let should_fix = (is_row && is_clipped_x) || (!is_row && is_clipped_y);
        if !should_fix {
            return;
        }

        for (i, &child_handle) in child_handles.iter().enumerate() {
            let has_explicit = child_explicit_shrink
                .get(i)
                .copied()
                .unwrap_or(0)
                == 1;
            if has_explicit {
                continue;
            }

            if let Some(meta) = self.nodes.get(&child_handle) {
                if let Ok(mut child_style) = self.tree.style(meta.node_id).cloned() {
                    child_style.flex_shrink = 0.0;
                    let _ = self.tree.set_style(meta.node_id, child_style);
                }
            }
        }
    }

    /// CSS 보정: flex 자식에 width 주입 시 minWidth도 동시 설정 (min-width:auto 에뮬레이션).
    ///
    /// CSS에서 flex item의 기본 min-width는 콘텐츠 크기(auto).
    /// Taffy는 min-width:auto를 0으로 처리하여 flex-shrink로 콘텐츠 이하 축소 가능.
    /// width 주입 시 minWidth도 동일값으로 설정하여 CSS 동작을 에뮬레이션.
    ///
    /// `has_explicit_min_width`가 true이면 사용자 설정 보존.
    pub fn apply_min_width_fix(
        &mut self,
        handle: u32,
        width: f32,
        has_explicit_min_width: bool,
    ) {
        if has_explicit_min_width {
            return;
        }
        if let Some(meta) = self.nodes.get(&handle) {
            if let Ok(mut style) = self.tree.style(meta.node_id).cloned() {
                style.min_size.width = Dimension::length(width);
                let _ = self.tree.set_style(meta.node_id, style);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Layout computation
    // -----------------------------------------------------------------------

    pub fn compute_layout(&mut self, handle: u32, avail_width: f32, avail_height: f32) {
        let node_id = match self.node_id(handle) {
            Some(id) => id,
            None => return,
        };
        let avail = Size {
            width: if avail_width.is_finite() && avail_width >= 0.0 {
                AvailableSpace::Definite(avail_width)
            } else {
                AvailableSpace::MaxContent
            },
            height: if avail_height.is_finite() && avail_height >= 0.0 {
                AvailableSpace::Definite(avail_height)
            } else {
                AvailableSpace::MaxContent
            },
        };
        self.tree
            .compute_layout(node_id, avail)
            .expect("taffy compute_layout");
    }

    // -----------------------------------------------------------------------
    // Layout retrieval
    // -----------------------------------------------------------------------

    /// Returns JSON: {"x":0,"y":0,"width":100,"height":50}
    pub fn get_layout(&self, handle: u32) -> String {
        let node_id = match self.node_id(handle) {
            Some(id) => id,
            None => return r#"{"x":0,"y":0,"width":0,"height":0}"#.to_string(),
        };
        match self.tree.layout(node_id) {
            Ok(layout) => {
                let x = ceil_to_pixel(layout.location.x);
                let y = ceil_to_pixel(layout.location.y);
                let w = ceil_to_pixel(layout.size.width);
                let h = ceil_to_pixel(layout.size.height);
                format!(r#"{{"x":{x},"y":{y},"width":{w},"height":{h}}}"#)
            }
            Err(_) => r#"{"x":0,"y":0,"width":0,"height":0}"#.to_string(),
        }
    }

    /// Returns flat Vec<f32>: [x, y, w, h,  x, y, w, h, ...]
    pub fn get_layouts_batch(&self, handles: &[u32]) -> Vec<f32> {
        let mut out = Vec::with_capacity(handles.len() * 4);
        for &handle in handles {
            match self.node_id(handle).and_then(|id| self.tree.layout(id).ok()) {
                Some(layout) => {
                    out.push(ceil_to_pixel(layout.location.x));
                    out.push(ceil_to_pixel(layout.location.y));
                    out.push(ceil_to_pixel(layout.size.width));
                    out.push(ceil_to_pixel(layout.size.height));
                }
                None => {
                    out.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]);
                }
            }
        }
        out
    }

    // -----------------------------------------------------------------------
    // Batch build
    // -----------------------------------------------------------------------

    /// Batch build nodes from a post-order JSON array.
    /// Input: [{"style":{...},"children":[0,1]}, ...]
    /// `children` are indices into the batch array (post-order, so children always < current index).
    /// Returns Vec<u32> handles in the same order as the input array.
    pub fn build_tree_batch(&mut self, nodes_json: &str) -> Vec<u32> {
        let items: Vec<serde_json::Value> =
            serde_json::from_str(nodes_json).unwrap_or_default();

        let mut handles: Vec<u32> = Vec::with_capacity(items.len());

        for item in &items {
            let style_json = match item.get("style") {
                Some(s) => s.to_string(),
                None => "{}".to_string(),
            };

            let child_handles: Vec<u32> = item
                .get("children")
                .and_then(|c| c.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_u64())
                        .filter_map(|idx| handles.get(idx as usize).copied())
                        .collect()
                })
                .unwrap_or_default();

            let handle = if child_handles.is_empty() {
                self.create_node(&style_json)
            } else {
                self.create_node_with_children(&style_json, &child_handles)
            };

            handles.push(handle);
        }

        handles
    }

    // -----------------------------------------------------------------------
    // Bookkeeping
    // -----------------------------------------------------------------------

    pub fn node_count(&self) -> u32 {
        self.nodes.len() as u32
    }

    pub fn clear(&mut self) {
        self.tree = TaffyTree::new();
        self.nodes.clear();
        self.next_handle = 1;
        self.spatial.clear();
    }

    // -----------------------------------------------------------------------
    // Spatial index
    // -----------------------------------------------------------------------

    pub fn spatial_upsert(&mut self, id: u32, x: f32, y: f32, w: f32, h: f32) {
        self.spatial.upsert(id, x, y, w, h);
    }

    pub fn spatial_remove(&mut self, id: u32) {
        self.spatial.remove(id);
    }

    pub fn spatial_query_point(&self, x: f32, y: f32) -> Vec<u32> {
        self.spatial.query_point(x, y)
    }

    pub fn spatial_query_rect(&self, left: f32, top: f32, right: f32, bottom: f32) -> Vec<u32> {
        self.spatial.query_rect(left, top, right, bottom)
    }

    pub fn spatial_clear(&mut self) {
        self.spatial.clear();
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    pub fn version(&self) -> String {
        "0.1.0".to_string()
    }
}

// ---------------------------------------------------------------------------
// Pixel-snap utility
// ---------------------------------------------------------------------------

#[inline]
fn ceil_to_pixel(v: f32) -> f32 {
    v.ceil()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_initializes() {
        let engine = LayoutEngine::new();
        assert!(engine.is_ready());
        assert_eq!(engine.node_count(), 0);
    }

    #[test]
    fn create_and_layout_flex_row() {
        let mut engine = LayoutEngine::new();

        // Container: flex row, 200×100
        let container = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
        );

        // Two children, each 50% width
        let child_a = engine.create_node(r#"{"flexGrow":1,"height":"100%"}"#);
        let child_b = engine.create_node(r#"{"flexGrow":1,"height":"100%"}"#);

        engine.set_children(container, &[child_a, child_b]);
        engine.compute_layout(container, 200.0, 100.0);

        let la_str = engine.get_layout(child_a);
        let lb_str = engine.get_layout(child_b);

        let la: serde_json::Value = serde_json::from_str(&la_str).unwrap();
        let lb: serde_json::Value = serde_json::from_str(&lb_str).unwrap();

        // Child A starts at x=0
        assert_eq!(la["x"].as_f64().unwrap() as i32, 0);
        // Child B starts at x=100 (200/2)
        assert_eq!(lb["x"].as_f64().unwrap() as i32, 100);
        // Both children should be 100px wide
        assert_eq!(la["width"].as_f64().unwrap() as i32, 100);
        assert_eq!(lb["width"].as_f64().unwrap() as i32, 100);
    }

    #[test]
    fn update_style_detects_display_change() {
        let mut engine = LayoutEngine::new();
        let handle = engine.create_node(r#"{"display":"flex","width":"100px"}"#);

        // Same style → Unchanged
        let r1 = engine.update_style(handle, r#"{"display":"flex","width":"100px"}"#);
        assert_eq!(r1, UPDATE_UNCHANGED);

        // Different size, same display → Dirty
        let r2 = engine.update_style(handle, r#"{"display":"flex","width":"200px"}"#);
        assert_eq!(r2, UPDATE_DIRTY);

        // Different display → NeedsFullRebuild
        let r3 = engine.update_style(handle, r#"{"display":"grid","width":"200px"}"#);
        assert_eq!(r3, UPDATE_NEEDS_FULL_REBUILD);
    }

    #[test]
    fn batch_build_tree() {
        let mut engine = LayoutEngine::new();

        // Post-order: children first
        let batch = r#"[
            {"style":{"flexGrow":1,"height":"50px"},"children":[]},
            {"style":{"flexGrow":1,"height":"50px"},"children":[]},
            {"style":{"display":"flex","flexDirection":"row","width":"200px","height":"50px"},"children":[0,1]}
        ]"#;

        let handles = engine.build_tree_batch(batch);
        assert_eq!(handles.len(), 3);
        assert_eq!(engine.node_count(), 3);

        // Root is the last handle
        let root = handles[2];
        engine.compute_layout(root, 200.0, 50.0);

        // Child A at x=0, Child B at x=100
        let la: serde_json::Value =
            serde_json::from_str(&engine.get_layout(handles[0])).unwrap();
        let lb: serde_json::Value =
            serde_json::from_str(&engine.get_layout(handles[1])).unwrap();

        assert_eq!(la["x"].as_f64().unwrap() as i32, 0);
        assert_eq!(lb["x"].as_f64().unwrap() as i32, 100);
    }

    #[test]
    fn node_count_and_clear() {
        let mut engine = LayoutEngine::new();

        engine.create_node(r#"{"width":"10px"}"#);
        engine.create_node(r#"{"width":"20px"}"#);
        engine.create_node(r#"{"width":"30px"}"#);

        assert_eq!(engine.node_count(), 3);

        engine.clear();
        assert_eq!(engine.node_count(), 0);
    }

    #[test]
    fn overflow_hidden_prevents_flex_shrink() {
        let mut engine = LayoutEngine::new();

        // 부모: flex row, overflow:hidden, 200px 너비
        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px","overflowX":"hidden"}"#,
        );

        // 자식 2개: 각각 150px (합계 300px > 부모 200px)
        // flexShrink 미명시 → 기본값 1 → Taffy가 축소 시도
        let child_a = engine.create_node(r#"{"width":"150px","height":"50px"}"#);
        let child_b = engine.create_node(r#"{"width":"150px","height":"50px"}"#);

        engine.set_children(parent, &[child_a, child_b]);

        // 보정 적용: overflow hidden → flexShrink=0
        engine.apply_overflow_shrink_fix(
            r#"{"overflow":"hidden","flexDirection":"row"}"#,
            &[child_a, child_b],
            &[0, 0], // 둘 다 명시적 shrink 없음
        );

        engine.compute_layout(parent, 200.0, 100.0);

        let la: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_a)).unwrap();
        let lb: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_b)).unwrap();

        // shrink=0이므로 자식은 원래 크기 유지 (150px), 부모 밖으로 overflow
        assert_eq!(la["width"].as_f64().unwrap() as i32, 150);
        assert_eq!(lb["width"].as_f64().unwrap() as i32, 150);
        // child_b는 150px 위치에서 시작
        assert_eq!(lb["x"].as_f64().unwrap() as i32, 150);
    }

    #[test]
    fn overflow_visible_allows_flex_shrink() {
        let mut engine = LayoutEngine::new();

        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
        );

        let child_a = engine.create_node(r#"{"width":"150px","height":"50px"}"#);
        let child_b = engine.create_node(r#"{"width":"150px","height":"50px"}"#);

        engine.set_children(parent, &[child_a, child_b]);

        // overflow:visible → 보정 미적용
        engine.apply_overflow_shrink_fix(
            r#"{"overflow":"visible","flexDirection":"row"}"#,
            &[child_a, child_b],
            &[0, 0],
        );

        engine.compute_layout(parent, 200.0, 100.0);

        let la: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_a)).unwrap();
        let lb: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_b)).unwrap();

        // shrink 기본값(1) 유지 → 자식이 축소됨 (각 100px)
        assert_eq!(la["width"].as_f64().unwrap() as i32, 100);
        assert_eq!(lb["width"].as_f64().unwrap() as i32, 100);
    }

    #[test]
    fn explicit_flex_shrink_preserved_with_overflow() {
        let mut engine = LayoutEngine::new();

        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px","overflowX":"hidden"}"#,
        );

        // child_a는 명시적 flexShrink=1
        let child_a = engine.create_node(r#"{"width":"150px","height":"50px","flexShrink":1}"#);
        let child_b = engine.create_node(r#"{"width":"150px","height":"50px"}"#);

        engine.set_children(parent, &[child_a, child_b]);

        // child_a는 명시적(1), child_b는 기본(0)
        engine.apply_overflow_shrink_fix(
            r#"{"overflow":"hidden","flexDirection":"row"}"#,
            &[child_a, child_b],
            &[1, 0], // child_a = explicit
        );

        engine.compute_layout(parent, 200.0, 100.0);

        let la: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_a)).unwrap();
        let lb: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child_b)).unwrap();

        // child_a는 명시적 shrink=1 → 축소됨
        // child_b는 보정 shrink=0 → 150px 유지
        // child_a가 나머지 50px 차지
        assert_eq!(lb["width"].as_f64().unwrap() as i32, 150);
        assert_eq!(la["width"].as_f64().unwrap() as i32, 50);
    }

    #[test]
    fn min_width_fix_prevents_shrink_below_content() {
        let mut engine = LayoutEngine::new();

        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
        );

        // child: 300px (부모 200px보다 큼), flexShrink 기본
        let child = engine.create_node(r#"{"width":"300px","height":"50px"}"#);

        engine.set_children(parent, &[child]);

        // minWidth 보정 적용: width=300 → minWidth=300
        engine.apply_min_width_fix(child, 300.0, false);

        engine.compute_layout(parent, 200.0, 100.0);

        let lc: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();

        // minWidth=300 → shrink 불가 → 300px 유지
        assert_eq!(lc["width"].as_f64().unwrap() as i32, 300);
    }

    #[test]
    fn min_width_fix_skips_explicit_min_width() {
        let mut engine = LayoutEngine::new();

        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
        );

        // child: 명시적 minWidth=50
        let child = engine.create_node(r#"{"width":"300px","height":"50px","minWidth":"50px"}"#);

        engine.set_children(parent, &[child]);

        // has_explicit_min_width=true → 보정 스킵
        engine.apply_min_width_fix(child, 300.0, true);

        engine.compute_layout(parent, 200.0, 100.0);

        let lc: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();

        // 명시적 minWidth=50 → shrink 가능 → 200px로 축소
        assert_eq!(lc["width"].as_f64().unwrap() as i32, 200);
    }

    #[test]
    fn overflow_column_direction_checks_y_axis() {
        let mut engine = LayoutEngine::new();

        // flex column + overflowY:scroll
        let parent = engine.create_node(
            r#"{"display":"flex","flexDirection":"column","width":"200px","height":"100px","overflowY":"scroll"}"#,
        );

        let child = engine.create_node(r#"{"width":"100px","height":"150px"}"#);

        engine.set_children(parent, &[child]);

        engine.apply_overflow_shrink_fix(
            r#"{"overflow":"visible","overflowY":"scroll","flexDirection":"column"}"#,
            &[child],
            &[0],
        );

        engine.compute_layout(parent, 200.0, 100.0);

        let lc: serde_json::Value =
            serde_json::from_str(&engine.get_layout(child)).unwrap();

        // column 방향 + overflowY:scroll → shrink=0 → 150px 유지
        assert_eq!(lc["height"].as_f64().unwrap() as i32, 150);
    }
}
