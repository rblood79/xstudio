# ADR-100 Phase 1: Rust Layout Engine — Flex/Grid/Block 패리티

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Taffy WASM 바인딩과 100% 호환되는 새 `composition-layout` Rust crate 완성. Feature flag로 기존/신규 엔진 전환.

**Architecture:** Taffy 0.10.0을 직접 사용하는 Rust WASM crate. 기존 `WasmTaffyLayoutEngine` 인터페이스를 동일하게 노출. 추가로 `style_hash` 변경 감지, `UpdateResult` display 전환 감지를 Rust 네이티브로 구현.

**Tech Stack:** Rust, wasm-pack, Taffy 0.10.0, wasm-bindgen, TypeScript

**Baseline (실측 2026-04-06):** 아이들 50fps, 20ms 프레임타임, 154MB 힙, WebGL 2개

**Design Docs:**

- ADR: `docs/adr/100-unified-skia-rendering-engine.md`
- Breakdown: `docs/adr/design/100-unified-skia-engine-breakdown.md` (섹션 4 + 4.5)

**Prerequisite:** Phase 0 완료 (`packages/composition-layout/` crate 초기화됨, Taffy 0.10.0 의존성 확인)

---

## 파일 맵

| 역할                 | 파일                                                  |            상태             |
| -------------------- | ----------------------------------------------------- | :-------------------------: |
| Rust 엔진 코어       | `packages/composition-layout/src/lib.rs`              | 수정 (스켈레톤 → 전체 구현) |
| Rust 스타일 파싱     | `packages/composition-layout/src/style.rs`            |            신규             |
| Rust 변경 감지       | `packages/composition-layout/src/change_detection.rs` |            신규             |
| Rust spatial index   | `packages/composition-layout/src/spatial.rs`          |            신규             |
| Rust 테스트          | `packages/composition-layout/tests/layout_parity.rs`  |            신규             |
| TS 래퍼 (신규 엔진)  | `apps/builder/src/.../wasm-bindings/layoutEngine.ts`  |            신규             |
| TS feature flag 분기 | `apps/builder/src/.../wasm-bindings/layoutBridge.ts`  |            신규             |
| 기존 Taffy 래퍼      | `apps/builder/src/.../wasm-bindings/taffyLayout.ts`   |      유지 (수정 없음)       |

---

## Task 1.1: Rust 스타일 파싱 모듈

**Files:**

- Create: `packages/composition-layout/src/style.rs`

이 모듈은 JSON 스타일 문자열을 Taffy `Style` 구조체로 변환합니다. 기존 `normalizeStyle()` + Rust `taffy_bridge.rs`의 역할을 통합.

- [ ] **Step 1: style.rs 생성 — JSON → Taffy Style 변환**

```rust
// packages/composition-layout/src/style.rs
use serde_json::Value;
use taffy::prelude::*;

/// JSON 스타일 객체를 Taffy Style로 변환
pub fn parse_style(json: &str) -> Style {
    let v: Value = serde_json::from_str(json).unwrap_or(Value::Null);
    let mut style = Style::DEFAULT;

    // Display
    if let Some(d) = v.get("display").and_then(|v| v.as_str()) {
        style.display = match d {
            "flex" => Display::Flex,
            "grid" => Display::Grid,
            "block" => Display::Block,
            "none" => Display::None,
            _ => Display::Flex,
        };
    }

    // Position
    if let Some(p) = v.get("position").and_then(|v| v.as_str()) {
        style.position = match p {
            "absolute" => Position::Absolute,
            _ => Position::Relative,
        };
    }

    // Flex container
    if let Some(fd) = v.get("flexDirection").and_then(|v| v.as_str()) {
        style.flex_direction = match fd {
            "row" => FlexDirection::Row,
            "column" => FlexDirection::Column,
            "row-reverse" => FlexDirection::RowReverse,
            "column-reverse" => FlexDirection::ColumnReverse,
            _ => FlexDirection::Row,
        };
    }

    if let Some(fw) = v.get("flexWrap").and_then(|v| v.as_str()) {
        style.flex_wrap = match fw {
            "wrap" => FlexWrap::Wrap,
            "wrap-reverse" => FlexWrap::WrapReverse,
            _ => FlexWrap::NoWrap,
        };
    }

    // Flex item
    if let Some(fg) = v.get("flexGrow").and_then(|v| v.as_f64()) {
        style.flex_grow = fg as f32;
    }
    if let Some(fs) = v.get("flexShrink").and_then(|v| v.as_f64()) {
        style.flex_shrink = fs as f32;
    }
    if let Some(fb) = v.get("flexBasis") {
        style.flex_basis = parse_dimension(fb);
    }

    // Size
    if let Some(w) = v.get("width") { style.size.width = parse_dimension(w); }
    if let Some(h) = v.get("height") { style.size.height = parse_dimension(h); }
    if let Some(w) = v.get("minWidth") { style.min_size.width = parse_dimension(w); }
    if let Some(h) = v.get("minHeight") { style.min_size.height = parse_dimension(h); }
    if let Some(w) = v.get("maxWidth") { style.max_size.width = parse_dimension(w); }
    if let Some(h) = v.get("maxHeight") { style.max_size.height = parse_dimension(h); }

    // Margin
    style.margin.top = parse_length_auto(&v, "marginTop");
    style.margin.right = parse_length_auto(&v, "marginRight");
    style.margin.bottom = parse_length_auto(&v, "marginBottom");
    style.margin.left = parse_length_auto(&v, "marginLeft");

    // Padding
    style.padding.top = parse_length_pct(&v, "paddingTop");
    style.padding.right = parse_length_pct(&v, "paddingRight");
    style.padding.bottom = parse_length_pct(&v, "paddingBottom");
    style.padding.left = parse_length_pct(&v, "paddingLeft");

    // Border
    style.border.top = parse_length_pct(&v, "borderTop");
    style.border.right = parse_length_pct(&v, "borderRight");
    style.border.bottom = parse_length_pct(&v, "borderBottom");
    style.border.left = parse_length_pct(&v, "borderLeft");

    // Inset
    style.inset.top = parse_length_auto(&v, "insetTop");
    style.inset.right = parse_length_auto(&v, "insetRight");
    style.inset.bottom = parse_length_auto(&v, "insetBottom");
    style.inset.left = parse_length_auto(&v, "insetLeft");

    // Gap
    if let Some(cg) = v.get("columnGap") { style.gap.width = parse_length_pct_val(cg); }
    if let Some(rg) = v.get("rowGap") { style.gap.height = parse_length_pct_val(rg); }

    // Aspect ratio
    if let Some(ar) = v.get("aspectRatio").and_then(|v| v.as_f64()) {
        style.aspect_ratio = Some(ar as f32);
    }

    // Alignment
    parse_alignment(&v, &mut style);

    // Grid (Taffy 0.10 API)
    parse_grid(&v, &mut style);

    // Overflow
    if let Some(ox) = v.get("overflowX").and_then(|v| v.as_str()) {
        style.overflow.x = parse_overflow(ox);
    }
    if let Some(oy) = v.get("overflowY").and_then(|v| v.as_str()) {
        style.overflow.y = parse_overflow(oy);
    }

    style
}

fn parse_dimension(v: &Value) -> Dimension {
    match v {
        Value::String(s) => {
            let s = s.trim();
            if s == "auto" { return Dimension::Auto; }
            if s == "fit-content" || s == "max-content" || s == "min-content" {
                // Taffy handles these via specific enums
                return Dimension::Auto; // simplified — Phase 1에서 확장
            }
            if let Some(px) = s.strip_suffix("px") {
                if let Ok(n) = px.parse::<f32>() { return Dimension::Length(n); }
            }
            if let Some(pct) = s.strip_suffix('%') {
                if let Ok(n) = pct.parse::<f32>() { return Dimension::Percent(n / 100.0); }
            }
            Dimension::Auto
        }
        Value::Number(n) => {
            if let Some(f) = n.as_f64() { Dimension::Length(f as f32) }
            else { Dimension::Auto }
        }
        _ => Dimension::Auto,
    }
}

fn parse_length_pct_val(v: &Value) -> LengthPercentage {
    match v {
        Value::String(s) => {
            let s = s.trim();
            if let Some(px) = s.strip_suffix("px") {
                if let Ok(n) = px.parse::<f32>() { return LengthPercentage::Length(n); }
            }
            if let Some(pct) = s.strip_suffix('%') {
                if let Ok(n) = pct.parse::<f32>() { return LengthPercentage::Percent(n / 100.0); }
            }
            LengthPercentage::Length(0.0)
        }
        Value::Number(n) => {
            LengthPercentage::Length(n.as_f64().unwrap_or(0.0) as f32)
        }
        _ => LengthPercentage::Length(0.0),
    }
}

fn parse_length_pct(v: &Value, key: &str) -> LengthPercentage {
    v.get(key).map(|val| parse_length_pct_val(val)).unwrap_or(LengthPercentage::Length(0.0))
}

fn parse_length_auto(v: &Value, key: &str) -> LengthPercentageAuto {
    let val = match v.get(key) {
        Some(val) => val,
        None => return LengthPercentageAuto::Length(0.0),
    };
    match val {
        Value::String(s) if s == "auto" => LengthPercentageAuto::Auto,
        Value::String(s) => {
            if let Some(px) = s.strip_suffix("px") {
                if let Ok(n) = px.parse::<f32>() { return LengthPercentageAuto::Length(n); }
            }
            if let Some(pct) = s.strip_suffix('%') {
                if let Ok(n) = pct.parse::<f32>() { return LengthPercentageAuto::Percent(n / 100.0); }
            }
            LengthPercentageAuto::Length(0.0)
        }
        Value::Number(n) => LengthPercentageAuto::Length(n.as_f64().unwrap_or(0.0) as f32),
        _ => LengthPercentageAuto::Length(0.0),
    }
}

fn parse_overflow(s: &str) -> Overflow {
    match s {
        "hidden" => Overflow::Hidden,
        "clip" => Overflow::Clip,
        "scroll" => Overflow::Scroll,
        _ => Overflow::Visible,
    }
}

fn parse_alignment(v: &Value, style: &mut Style) {
    // justifyContent, alignItems, alignContent, alignSelf, justifySelf 등
    // 기존 WasmTaffyLayoutEngine과 동일한 매핑
    if let Some(jc) = v.get("justifyContent").and_then(|v| v.as_str()) {
        style.justify_content = Some(match jc {
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
    if let Some(ai) = v.get("alignItems").and_then(|v| v.as_str()) {
        style.align_items = Some(match ai {
            "flex-start" | "start" => AlignItems::Start,
            "flex-end" | "end" => AlignItems::End,
            "center" => AlignItems::Center,
            "stretch" => AlignItems::Stretch,
            "baseline" => AlignItems::Baseline,
            _ => AlignItems::Stretch,
        });
    }
    if let Some(as_) = v.get("alignSelf").and_then(|v| v.as_str()) {
        style.align_self = Some(match as_ {
            "flex-start" | "start" => AlignSelf::Start,
            "flex-end" | "end" => AlignSelf::End,
            "center" => AlignSelf::Center,
            "stretch" => AlignSelf::Stretch,
            "baseline" => AlignSelf::Baseline,
            _ => AlignSelf::Start,
        });
    }
}

fn parse_grid(_v: &Value, _style: &mut Style) {
    // Grid 속성 파싱 — Taffy 0.10 grid API 사용
    // gridTemplateColumns, gridTemplateRows, gridAutoFlow, grid placement 등
    // Phase 1에서 기본 구현, 기존 Taffy 테스트로 검증
    // TODO: 상세 구현 (Task 1.1 Step 3에서)
}
```

- [ ] **Step 2: lib.rs에 mod 등록**

```rust
// lib.rs 상단에 추가
mod style;
```

- [ ] **Step 3: cargo test (컴파일 확인)**

```bash
cd /Users/admin/work/composition/packages/composition-layout
cargo check
```

- [ ] **Step 4: 커밋**

```bash
git add packages/composition-layout/src/style.rs packages/composition-layout/src/lib.rs
git commit -m "feat(adr-100): Rust style parser — JSON to Taffy Style conversion"
```

---

## Task 1.2: Rust LayoutEngine 코어 — Taffy API 연동

**Files:**

- Modify: `packages/composition-layout/src/lib.rs`

기존 `WasmTaffyLayoutEngine` 인터페이스와 동일한 WASM export 구현.

- [ ] **Step 1: lib.rs 전면 교체 — Taffy TaffyTree 연동**

```rust
// packages/composition-layout/src/lib.rs
mod style;

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use taffy::prelude::*;

use crate::style::parse_style;

#[wasm_bindgen]
pub struct LayoutEngine {
    tree: TaffyTree<()>,
    handle_map: HashMap<u32, NodeId>,
    next_handle: u32,
    // Tier 1: 변경 감지
    style_hashes: HashMap<u32, u64>,
}

#[derive(Clone, Copy, PartialEq)]
#[wasm_bindgen]
pub enum UpdateResult {
    Unchanged = 0,
    Dirty = 1,
    NeedsFullRebuild = 2,
}

#[wasm_bindgen]
impl LayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
            handle_map: HashMap::new(),
            next_handle: 1,
            style_hashes: HashMap::new(),
        }
    }

    pub fn is_ready(&self) -> bool { true }

    pub fn version(&self) -> String { "0.1.0".to_string() }

    // ─── Node operations ───

    pub fn create_node(&mut self, style_json: &str) -> u32 {
        let style = parse_style(style_json);
        let hash = Self::hash_style(style_json);
        let node_id = self.tree.new_leaf(style).expect("create_node failed");

        let handle = self.next_handle;
        self.next_handle += 1;
        self.handle_map.insert(handle, node_id);
        self.style_hashes.insert(handle, hash);
        handle
    }

    pub fn create_node_with_children(
        &mut self,
        style_json: &str,
        children_handles: &[u32],
    ) -> u32 {
        let style = parse_style(style_json);
        let hash = Self::hash_style(style_json);

        let children: Vec<NodeId> = children_handles
            .iter()
            .filter_map(|h| self.handle_map.get(h).copied())
            .collect();

        let node_id = self.tree.new_with_children(style, &children)
            .expect("create_node_with_children failed");

        let handle = self.next_handle;
        self.next_handle += 1;
        self.handle_map.insert(handle, node_id);
        self.style_hashes.insert(handle, hash);
        handle
    }

    /// Tier 1: style_hash 기반 변경 감지 + display 전환 감지
    pub fn update_style(&mut self, handle: u32, style_json: &str) -> UpdateResult {
        let node_id = match self.handle_map.get(&handle) {
            Some(id) => *id,
            None => return UpdateResult::Unchanged,
        };

        let new_hash = Self::hash_style(style_json);
        let old_hash = self.style_hashes.get(&handle).copied().unwrap_or(0);

        if new_hash == old_hash {
            return UpdateResult::Unchanged;
        }

        // display 전환 감지
        let old_display = self.tree.style(node_id).map(|s| s.display).ok();
        let new_style = parse_style(style_json);
        let new_display = new_style.display;

        self.tree.set_style(node_id, new_style).ok();
        self.style_hashes.insert(handle, new_hash);

        if old_display != Some(new_display) {
            UpdateResult::NeedsFullRebuild
        } else {
            UpdateResult::Dirty
        }
    }

    pub fn set_children(&mut self, handle: u32, children_handles: &[u32]) {
        let node_id = match self.handle_map.get(&handle) {
            Some(id) => *id,
            None => return,
        };

        let children: Vec<NodeId> = children_handles
            .iter()
            .filter_map(|h| self.handle_map.get(h).copied())
            .collect();

        self.tree.set_children(node_id, &children).ok();
    }

    pub fn remove_node(&mut self, handle: u32) {
        if let Some(node_id) = self.handle_map.remove(&handle) {
            self.tree.remove(node_id).ok();
            self.style_hashes.remove(&handle);
        }
    }

    pub fn mark_dirty(&mut self, handle: u32) {
        if let Some(node_id) = self.handle_map.get(&handle) {
            self.tree.mark_dirty(*node_id).ok();
        }
    }

    // ─── Layout computation ───

    pub fn compute_layout(&mut self, handle: u32, avail_width: f32, avail_height: f32) {
        let node_id = match self.handle_map.get(&handle) {
            Some(id) => *id,
            None => return,
        };

        let available = Size {
            width: if avail_width > 0.0 {
                AvailableSpace::Definite(avail_width)
            } else {
                AvailableSpace::MaxContent
            },
            height: if avail_height > 0.0 {
                AvailableSpace::Definite(avail_height)
            } else {
                AvailableSpace::MaxContent
            },
        };

        self.tree.compute_layout(node_id, available).ok();
    }

    /// 단일 노드 레이아웃 결과 (JSON)
    pub fn get_layout(&self, handle: u32) -> String {
        let node_id = match self.handle_map.get(&handle) {
            Some(id) => *id,
            None => return "{}".to_string(),
        };

        match self.tree.layout(node_id) {
            Ok(layout) => {
                format!(
                    r#"{{"x":{},"y":{},"width":{},"height":{}}}"#,
                    layout.location.x, layout.location.y,
                    layout.size.width, layout.size.height
                )
            }
            Err(_) => "{}".to_string(),
        }
    }

    /// 배치 레이아웃 결과 (Float32Array: [x,y,w,h, x,y,w,h, ...])
    pub fn get_layouts_batch(&self, handles: &[u32]) -> Vec<f32> {
        let mut result = Vec::with_capacity(handles.len() * 4);

        for &handle in handles {
            let node_id = match self.handle_map.get(&handle) {
                Some(id) => *id,
                None => {
                    result.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]);
                    continue;
                }
            };

            match self.tree.layout(node_id) {
                Ok(layout) => {
                    result.push(layout.location.x);
                    result.push(layout.location.y);
                    result.push(layout.size.width);
                    result.push(layout.size.height);
                }
                Err(_) => {
                    result.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]);
                }
            }
        }

        result
    }

    // ─── Batch tree building ───

    pub fn build_tree_batch(&mut self, nodes_json: &str) -> Vec<u32> {
        let nodes: Vec<serde_json::Value> =
            serde_json::from_str(nodes_json).unwrap_or_default();

        let mut handles = Vec::with_capacity(nodes.len());
        let mut batch_node_ids: Vec<NodeId> = Vec::with_capacity(nodes.len());

        for node in &nodes {
            let style_str = node.get("style")
                .map(|s| s.to_string())
                .unwrap_or_else(|| "{}".to_string());
            let style = parse_style(&style_str);
            let hash = Self::hash_style(&style_str);

            // children은 batch 내 인덱스 참조
            let children_indices: Vec<usize> = node.get("children")
                .and_then(|c| c.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_u64().map(|n| n as usize)).collect())
                .unwrap_or_default();

            let child_node_ids: Vec<NodeId> = children_indices
                .iter()
                .filter_map(|&idx| batch_node_ids.get(idx).copied())
                .collect();

            let node_id = if child_node_ids.is_empty() {
                self.tree.new_leaf(style).expect("batch leaf")
            } else {
                self.tree.new_with_children(style, &child_node_ids).expect("batch node")
            };

            let handle = self.next_handle;
            self.next_handle += 1;
            self.handle_map.insert(handle, node_id);
            self.style_hashes.insert(handle, hash);

            batch_node_ids.push(node_id);
            handles.push(handle);
        }

        handles
    }

    // ─── Utility ───

    pub fn node_count(&self) -> u32 {
        self.handle_map.len() as u32
    }

    pub fn clear(&mut self) {
        self.tree = TaffyTree::new();
        self.handle_map.clear();
        self.style_hashes.clear();
        self.next_handle = 1;
    }

    // ─── Tier 1: style hash (내부) ───

    fn hash_style(json: &str) -> u64 {
        // FNV-1a hash — 빠르고 충분히 고유
        let mut hash: u64 = 0xcbf29ce484222325;
        for byte in json.bytes() {
            hash ^= byte as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_and_layout_flex_row() {
        let mut engine = LayoutEngine::new();

        let child1 = engine.create_node(r#"{"width":"100px","height":"50px"}"#);
        let child2 = engine.create_node(r#"{"width":"100px","height":"50px"}"#);
        let root = engine.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","width":"400px","height":"100px"}"#,
            &[child1, child2],
        );

        engine.compute_layout(root, 400.0, 100.0);

        let layouts = engine.get_layouts_batch(&[root, child1, child2]);
        // root: x=0, y=0, w=400, h=100
        assert_eq!(layouts[0], 0.0); // root x
        assert_eq!(layouts[2], 400.0); // root w
        // child1: x=0
        assert_eq!(layouts[4], 0.0);
        // child2: x=100 (child1 width)
        assert_eq!(layouts[8], 100.0);
    }

    #[test]
    fn update_style_detects_display_change() {
        let mut engine = LayoutEngine::new();
        let node = engine.create_node(r#"{"display":"flex","width":"100px"}"#);

        // 같은 스타일 → Unchanged
        let result = engine.update_style(node, r#"{"display":"flex","width":"100px"}"#);
        assert_eq!(result, UpdateResult::Unchanged);

        // 다른 크기 → Dirty
        let result = engine.update_style(node, r#"{"display":"flex","width":"200px"}"#);
        assert_eq!(result, UpdateResult::Dirty);

        // display 변경 → NeedsFullRebuild
        let result = engine.update_style(node, r#"{"display":"grid","width":"200px"}"#);
        assert_eq!(result, UpdateResult::NeedsFullRebuild);
    }

    #[test]
    fn batch_build_tree() {
        let mut engine = LayoutEngine::new();
        // post-order: child first, parent last
        let json = r#"[
            {"style":{"width":"50px","height":"30px"},"children":[]},
            {"style":{"width":"50px","height":"30px"},"children":[]},
            {"style":{"display":"flex","flexDirection":"row","width":"200px","height":"60px"},"children":[0,1]}
        ]"#;

        let handles = engine.build_tree_batch(json);
        assert_eq!(handles.len(), 3);

        engine.compute_layout(handles[2], 200.0, 60.0);
        let layouts = engine.get_layouts_batch(&handles);

        // parent width = 200
        assert_eq!(layouts[8], 200.0);
        // child1 x = 0, child2 x = 50
        assert_eq!(layouts[0], 0.0);
        assert_eq!(layouts[4], 50.0);
    }
}
```

- [ ] **Step 2: cargo test**

```bash
cd /Users/admin/work/composition/packages/composition-layout
cargo test --lib
```

Expected: 3 tests PASS.

- [ ] **Step 3: WASM 빌드**

```bash
wasm-pack build --target web --release
```

- [ ] **Step 4: 커밋**

```bash
git add packages/composition-layout/
git commit -m "feat(adr-100): LayoutEngine core — Taffy API + style_hash + UpdateResult"
```

---

## Task 1.3: Spatial Index 이식

**Files:**

- Create: `packages/composition-layout/src/spatial.rs`

기존 Rust WASM spatial index (cell-based grid) 로직을 새 crate에 이식.

- [ ] **Step 1: spatial.rs 구현**

기존 `SpatialIndex` WASM 모듈의 핵심 로직 (256px 셀 기반 grid, upsert/remove/query_point/query_rect/query_viewport) 을 이식. 기존 `spatialIndex.ts`의 WASM 호출 패턴과 동일한 인터페이스.

- [ ] **Step 2: lib.rs에 spatial 모듈 통합**

```rust
mod spatial;
// LayoutEngine에 spatial index 메서드 추가:
// pub fn spatial_upsert(&mut self, id: u32, x: f32, y: f32, w: f32, h: f32)
// pub fn spatial_query_point(&self, x: f32, y: f32) -> Vec<u32>
// pub fn spatial_query_rect(&self, x1: f32, y1: f32, x2: f32, y2: f32) -> Vec<u32>
// pub fn spatial_remove(&mut self, id: u32)
// pub fn spatial_clear(&mut self)
```

- [ ] **Step 3: 테스트**

```bash
cargo test --lib
```

- [ ] **Step 4: 커밋**

```bash
git commit -m "feat(adr-100): spatial index integration — cell-based grid in Rust"
```

---

## Task 1.4: TypeScript 래퍼 — layoutEngine.ts

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/wasm-bindings/layoutEngine.ts`

기존 `taffyLayout.ts`의 `TaffyLayout` 클래스와 동일한 인터페이스를 새 WASM 모듈로 구현. `WasmTaffyLayoutEngine` 인터페이스 호환.

- [ ] **Step 1: layoutEngine.ts 생성**

기존 `TaffyLayout` 클래스의 모든 public 메서드를 동일한 시그니처로 구현하되, 내부적으로 `LayoutEngine` WASM 인스턴스를 사용. `update_style()`은 `UpdateResult`를 반환하도록 확장.

- [ ] **Step 2: type-check**

```bash
pnpm type-check
```

- [ ] **Step 3: 커밋**

---

## Task 1.5: Feature Flag 분기 — layoutBridge.ts

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/wasm-bindings/layoutBridge.ts`

`USE_RUST_LAYOUT_ENGINE` flag에 따라 기존 `TaffyLayout` 또는 새 `LayoutEngine` 래퍼를 반환하는 팩토리.

- [ ] **Step 1: layoutBridge.ts 생성**

```typescript
// wasm-bindings/layoutBridge.ts
import { isUnifiedFlag } from "./featureFlags";
import { TaffyLayout } from "./taffyLayout";
// import { LayoutEngineWrapper } from './layoutEngine';  // Phase 1 완료 후

export interface LayoutAPI {
  isAvailable(): boolean;
  createNode(style_json: string): number;
  createNodeWithChildren(style_json: string, children: number[]): number;
  updateStyleRaw(handle: number, style_json: string): void;
  setChildren(handle: number, children: number[]): void;
  computeLayout(root: number, availW: number, availH: number): void;
  getLayout(handle: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  getLayoutsBatch(
    handles: number[],
  ): Map<number, { x: number; y: number; width: number; height: number }>;
  markDirty(handle: number): void;
  removeNode(handle: number): void;
  clear(): void;
}

export function createLayoutEngine(): LayoutAPI {
  if (isUnifiedFlag("USE_RUST_LAYOUT_ENGINE")) {
    // Phase 1 완료 후 활성화:
    // return new LayoutEngineWrapper();
    console.warn(
      "[ADR-100] USE_RUST_LAYOUT_ENGINE=true but not yet implemented, falling back",
    );
  }
  return new TaffyLayout() as unknown as LayoutAPI;
}
```

- [ ] **Step 2: 커밋**

---

## Task 1.6: 레이아웃 패리티 테스트

**Files:**

- Create: `packages/composition-layout/tests/layout_parity.rs`

기존 Taffy WASM의 레이아웃 결과와 새 엔진의 결과를 비교하는 Rust 테스트.

- [ ] **Step 1: 패리티 테스트 작성**

flex row, flex column, flex wrap, grid basic, grid areas, nested flex, absolute positioning 등 핵심 레이아웃 시나리오 10개 이상.

- [ ] **Step 2: cargo test**

```bash
cargo test
```

Expected: 10+ tests PASS.

- [ ] **Step 3: 커밋**

---

## Task 1.7: Phase 1 Gate 검증

- [ ] **Step 1: 체크리스트**

| Gate 항목              | 검증                         |
| ---------------------- | ---------------------------- |
| cargo test 전체 통과   | `cargo test` 0 failures      |
| WASM 빌드 성공         | `wasm-pack build` .wasm 존재 |
| WASM 크기 < 400KB      | `stat pkg/*.wasm`            |
| pnpm type-check 통과   | 0 errors                     |
| feature flag 분기 동작 | layoutBridge.ts import 성공  |
| 기존 코드 영향 없음    | flag=false → 기존 Taffy 경로 |

- [ ] **Step 2: Gate 통과 커밋**

```bash
git commit -m "feat(adr-100): Phase 1 complete — Rust Layout Engine flex/grid/block parity"
```

---

## 의존성 그래프

```
Task 1.1 (style.rs) ─┐
                      ├→ Task 1.2 (lib.rs 코어) ─→ Task 1.3 (spatial) ─→ Task 1.4 (TS 래퍼) ─→ Task 1.5 (bridge) ─→ Task 1.6 (패리티 테스트) ─→ Task 1.7 (Gate)
```

Task 1.1~1.3은 Rust 전용 (순차). Task 1.4~1.5는 TS (1.3 이후). Task 1.6~1.7은 전체 완료 후.
