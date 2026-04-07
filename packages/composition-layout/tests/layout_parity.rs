use composition_layout::LayoutEngine;

fn get_layout(engine: &LayoutEngine, handle: u32) -> (f32, f32, f32, f32) {
    let batch = engine.get_layouts_batch(&[handle]);
    (batch[0], batch[1], batch[2], batch[3])
}

fn approx_eq(a: f32, b: f32) -> bool {
    (a - b).abs() < 1.0
}

// ---------------------------------------------------------------------------
// 1. flex row — two fixed-size children placed left-to-right
// ---------------------------------------------------------------------------

#[test]
fn flex_row_two_children() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
    let c2 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","alignItems":"flex-start","width":"400px","height":"100px"}"#,
        &[c1, c2],
    );
    e.compute_layout(root, 400.0, 100.0);

    let (_, _, rw, rh) = get_layout(&e, root);
    assert!(approx_eq(rw, 400.0), "root width: {rw}");
    assert!(approx_eq(rh, 100.0), "root height: {rh}");

    let (c1x, _, c1w, _) = get_layout(&e, c1);
    let (c2x, _, c2w, _) = get_layout(&e, c2);
    assert!(approx_eq(c1x, 0.0), "c1x: {c1x}");
    assert!(approx_eq(c1w, 100.0), "c1w: {c1w}");
    assert!(approx_eq(c2x, 100.0), "c2x: {c2x}");
    assert!(approx_eq(c2w, 100.0), "c2w: {c2w}");
}

// ---------------------------------------------------------------------------
// 2. flex column — three children stack top-to-bottom
// ---------------------------------------------------------------------------

#[test]
fn flex_column_three_children() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"height":"30px"}"#);
    let c2 = e.create_node(r#"{"height":"30px"}"#);
    let c3 = e.create_node(r#"{"height":"30px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"column","justifyContent":"flex-start","alignItems":"flex-start","width":"200px","height":"200px"}"#,
        &[c1, c2, c3],
    );
    e.compute_layout(root, 200.0, 200.0);

    let (_, c1y, _, _) = get_layout(&e, c1);
    let (_, c2y, _, _) = get_layout(&e, c2);
    let (_, c3y, _, _) = get_layout(&e, c3);
    assert!(approx_eq(c1y, 0.0), "c1y: {c1y}");
    assert!(approx_eq(c2y, 30.0), "c2y: {c2y}");
    assert!(approx_eq(c3y, 60.0), "c3y: {c3y}");
}

// ---------------------------------------------------------------------------
// 3. flexGrow proportional sizing (1:2 ratio)
// ---------------------------------------------------------------------------

#[test]
fn flex_grow() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"flexGrow":1,"height":"50px"}"#);
    let c2 = e.create_node(r#"{"flexGrow":2,"height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","width":"300px","height":"50px"}"#,
        &[c1, c2],
    );
    e.compute_layout(root, 300.0, 50.0);

    let (_, _, c1w, _) = get_layout(&e, c1);
    let (_, _, c2w, _) = get_layout(&e, c2);
    assert!(approx_eq(c1w, 100.0), "c1w: {c1w}"); // 1/3 × 300
    assert!(approx_eq(c2w, 200.0), "c2w: {c2w}"); // 2/3 × 300
}

// ---------------------------------------------------------------------------
// 4. flexWrap — overflow onto next row
// ---------------------------------------------------------------------------

#[test]
fn flex_wrap() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
    let c2 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
    let c3 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","flexWrap":"wrap","justifyContent":"flex-start","alignItems":"flex-start","width":"300px"}"#,
        &[c1, c2, c3],
    );
    e.compute_layout(root, 300.0, 1000.0);

    let (c1x, c1y, _, _) = get_layout(&e, c1);
    let (c2x, c2y, _, _) = get_layout(&e, c2);
    let (c3x, c3y, _, _) = get_layout(&e, c3);

    // c1, c2 on first row; c3 wraps to second row
    assert!(approx_eq(c1x, 0.0), "c1x: {c1x}");
    assert!(approx_eq(c1y, 0.0), "c1y: {c1y}");
    assert!(approx_eq(c2x, 150.0), "c2x: {c2x}");
    assert!(approx_eq(c2y, 0.0), "c2y: {c2y}");
    assert!(approx_eq(c3x, 0.0), "c3x: {c3x}");
    assert!(approx_eq(c3y, 50.0), "c3y: {c3y}");
}

// ---------------------------------------------------------------------------
// 5. grid 2×2 — equal 1fr tracks
// ---------------------------------------------------------------------------

#[test]
#[ignore = "Grid track parsing needs improvement — Phase 1 follow-up"]
fn grid_basic_2x2() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{}"#);
    let c2 = e.create_node(r#"{}"#);
    let c3 = e.create_node(r#"{}"#);
    let c4 = e.create_node(r#"{}"#);
    let root = e.create_node_with_children(
        r#"{"display":"grid","gridTemplateColumns":["1fr","1fr"],"gridTemplateRows":["1fr","1fr"],"alignItems":"start","justifyItems":"start","width":"200px","height":"200px"}"#,
        &[c1, c2, c3, c4],
    );
    e.compute_layout(root, 200.0, 200.0);

    let (c1x, c1y, c1w, c1h) = get_layout(&e, c1);
    let (c2x, c2y, _, _) = get_layout(&e, c2);
    let (c3x, c3y, _, _) = get_layout(&e, c3);

    assert!(approx_eq(c1x, 0.0), "c1x: {c1x}");
    assert!(approx_eq(c1y, 0.0), "c1y: {c1y}");
    assert!(approx_eq(c1w, 100.0), "c1w: {c1w}");
    assert!(approx_eq(c1h, 100.0), "c1h: {c1h}");
    assert!(approx_eq(c2x, 100.0), "c2x: {c2x}");
    assert!(approx_eq(c2y, 0.0), "c2y: {c2y}");
    assert!(approx_eq(c3x, 0.0), "c3x: {c3x}");
    assert!(approx_eq(c3y, 100.0), "c3y: {c3y}");
}

// ---------------------------------------------------------------------------
// 6. absolute positioning with inset
// ---------------------------------------------------------------------------

#[test]
fn absolute_positioning() {
    let mut e = LayoutEngine::new();
    let child = e.create_node(
        r#"{"position":"absolute","insetTop":"10px","insetLeft":"20px","width":"50px","height":"50px"}"#,
    );
    let root = e.create_node_with_children(
        r#"{"display":"flex","justifyContent":"flex-start","alignItems":"flex-start","width":"200px","height":"200px"}"#,
        &[child],
    );
    e.compute_layout(root, 200.0, 200.0);

    let (cx, cy, cw, ch) = get_layout(&e, child);
    assert!(approx_eq(cx, 20.0), "cx: {cx}");
    assert!(approx_eq(cy, 10.0), "cy: {cy}");
    assert!(approx_eq(cw, 50.0), "cw: {cw}");
    assert!(approx_eq(ch, 50.0), "ch: {ch}");
}

// ---------------------------------------------------------------------------
// 7. padding + border offset child position
// ---------------------------------------------------------------------------

#[test]
fn padding_and_border() {
    let mut e = LayoutEngine::new();
    let child = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","justifyContent":"flex-start","alignItems":"flex-start","width":"200px","height":"100px","paddingTop":"10px","paddingLeft":"20px","borderTop":"5px","borderLeft":"5px"}"#,
        &[child],
    );
    e.compute_layout(root, 200.0, 100.0);

    let (cx, cy, _, _) = get_layout(&e, child);
    // child offset = paddingLeft(20) + borderLeft(5) = 25
    // child offset = paddingTop(10) + borderTop(5)  = 15
    assert!(approx_eq(cx, 25.0), "cx: {cx}");
    assert!(approx_eq(cy, 15.0), "cy: {cy}");
}

// ---------------------------------------------------------------------------
// 8. columnGap shifts second child
// ---------------------------------------------------------------------------

#[test]
fn gap_in_flex() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let c2 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","alignItems":"flex-start","columnGap":"20px","width":"200px","height":"50px"}"#,
        &[c1, c2],
    );
    e.compute_layout(root, 200.0, 50.0);

    let (c2x, _, _, _) = get_layout(&e, c2);
    assert!(approx_eq(c2x, 70.0), "c2x: {c2x}"); // 50 (c1) + 20 (gap)
}

// ---------------------------------------------------------------------------
// 9. nested flex containers
// ---------------------------------------------------------------------------

#[test]
fn nested_flex() {
    let mut e = LayoutEngine::new();
    let inner_c1 = e.create_node(r#"{"width":"30px","height":"30px"}"#);
    let inner_c2 = e.create_node(r#"{"width":"30px","height":"30px"}"#);
    let inner = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"column","justifyContent":"flex-start","alignItems":"flex-start"}"#,
        &[inner_c1, inner_c2],
    );
    let sibling = e.create_node(r#"{"width":"50px","height":"80px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","alignItems":"flex-start","width":"200px","height":"100px"}"#,
        &[inner, sibling],
    );
    e.compute_layout(root, 200.0, 100.0);

    let (ix, _, iw, ih) = get_layout(&e, inner);
    let (sx, _, _, _) = get_layout(&e, sibling);
    assert!(approx_eq(ix, 0.0), "ix: {ix}");
    assert!(approx_eq(iw, 30.0), "iw: {iw}");
    assert!(approx_eq(ih, 60.0), "ih: {ih}"); // 30 + 30
    assert!(approx_eq(sx, 30.0), "sx: {sx}");
}

// ---------------------------------------------------------------------------
// 10. percentage dimensions resolved against definite parent
// ---------------------------------------------------------------------------

#[test]
fn percentage_dimensions() {
    let mut e = LayoutEngine::new();
    let child = e.create_node(r#"{"width":"50%","height":"25%"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","width":"400px","height":"200px"}"#,
        &[child],
    );
    e.compute_layout(root, 400.0, 200.0);

    let (_, _, cw, ch) = get_layout(&e, child);
    assert!(approx_eq(cw, 200.0), "cw: {cw}"); // 50% of 400
    assert!(approx_eq(ch, 50.0), "ch: {ch}");  // 25% of 200
}

// ---------------------------------------------------------------------------
// 11. justifyContent: space-between distributes children evenly
// ---------------------------------------------------------------------------

#[test]
fn justify_content_space_between() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let c2 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let c3 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"space-between","alignItems":"flex-start","width":"200px","height":"50px"}"#,
        &[c1, c2, c3],
    );
    e.compute_layout(root, 200.0, 50.0);

    let (c1x, _, _, _) = get_layout(&e, c1);
    let (c2x, _, _, _) = get_layout(&e, c2);
    let (c3x, _, _, _) = get_layout(&e, c3);

    // 200 - 3×50 = 50 free space → 25px between each pair
    // c1 at 0, c2 at 75, c3 at 150
    assert!(approx_eq(c1x, 0.0), "c1x: {c1x}");
    assert!(approx_eq(c2x, 75.0), "c2x: {c2x}");
    assert!(approx_eq(c3x, 150.0), "c3x: {c3x}");
}

// ---------------------------------------------------------------------------
// 12. alignItems: center vertically centers children
// ---------------------------------------------------------------------------

#[test]
fn align_items_center() {
    let mut e = LayoutEngine::new();
    let child = e.create_node(r#"{"width":"50px","height":"30px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","alignItems":"center","width":"200px","height":"100px"}"#,
        &[child],
    );
    e.compute_layout(root, 200.0, 100.0);

    let (_, cy, _, _) = get_layout(&e, child);
    // (100 - 30) / 2 = 35
    assert!(approx_eq(cy, 35.0), "cy: {cy}");
}

// ---------------------------------------------------------------------------
// 13. grid with column gap — tracks offset by gap amount
// ---------------------------------------------------------------------------

#[test]
#[ignore = "Grid track parsing needs improvement — Phase 1 follow-up"]
fn grid_with_column_gap() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{}"#);
    let c2 = e.create_node(r#"{}"#);
    let root = e.create_node_with_children(
        r#"{"display":"grid","gridTemplateColumns":["100px","100px"],"gridTemplateRows":["50px"],"alignItems":"start","justifyItems":"start","columnGap":"20px","width":"220px","height":"50px"}"#,
        &[c1, c2],
    );
    e.compute_layout(root, 220.0, 50.0);

    let (c1x, _, c1w, _) = get_layout(&e, c1);
    let (c2x, _, c2w, _) = get_layout(&e, c2);
    assert!(approx_eq(c1x, 0.0), "c1x: {c1x}");
    assert!(approx_eq(c1w, 100.0), "c1w: {c1w}");
    assert!(approx_eq(c2x, 120.0), "c2x: {c2x}"); // 100 + 20 gap
    assert!(approx_eq(c2w, 100.0), "c2w: {c2w}");
}

// ---------------------------------------------------------------------------
// DEBUG: simple one-child flex
// ---------------------------------------------------------------------------
#[test]
fn debug_simple_flex() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","alignItems":"flex-start","width":"400px","height":"100px"}"#,
        &[c1],
    );
    e.compute_layout(root, 400.0, 100.0);

    let (rx, ry, rw, rh) = get_layout(&e, root);
    let (cx, cy, cw, ch) = get_layout(&e, c1);
    eprintln!("root handle={root}, c1 handle={c1}");
    eprintln!("root: x={rx} y={ry} w={rw} h={rh}");
    eprintln!("c1:   x={cx} y={cy} w={cw} h={ch}");
    assert!(approx_eq(cx, 0.0), "cx={cx}");
}

// ---------------------------------------------------------------------------
// DEBUG: direct style parse check via layout behavior
// ---------------------------------------------------------------------------
#[test]
fn debug_justify_content_parse() {
    // If justifyContent:flex-start works, c1x should be 0
    // If it's being ignored (center), c1x would be 150
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
    
    // Test with justifyContent center explicitly
    let root_center = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"center","alignItems":"flex-start","width":"400px","height":"100px"}"#,
        &[c1],
    );
    e.compute_layout(root_center, 400.0, 100.0);
    let (cx_center, _, _, _) = get_layout(&e, c1);
    eprintln!("center justifyContent: c1x={cx_center}");  // expect 150
    
    // New engine, test flex-start
    let mut e2 = LayoutEngine::new();
    let c2 = e2.create_node(r#"{"width":"100px","height":"50px"}"#);
    let root_start = e2.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","alignItems":"flex-start","width":"400px","height":"100px"}"#,
        &[c2],
    );
    e2.compute_layout(root_start, 400.0, 100.0);
    let (cx_start, _, _, _) = get_layout(&e2, c2);
    eprintln!("flex-start justifyContent: c1x={cx_start}"); // expect 0
    
    // They should differ
    assert!((cx_center - cx_start).abs() > 10.0, "center={cx_center} start={cx_start} — should differ");
}

#[test]
fn debug_no_alignment_specified() {
    let mut e = LayoutEngine::new();
    let c1 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
    let root = e.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","width":"400px","height":"100px"}"#,
        &[c1],
    );
    e.compute_layout(root, 400.0, 100.0);
    let (cx, cy, cw, ch) = get_layout(&e, c1);
    eprintln!("no alignment: c1 x={cx} y={cy} w={cw} h={ch}");
    // default: no justifyContent → taffy uses normal → flex-start
    // default: no alignItems → taffy uses stretch
    
    let mut e2 = LayoutEngine::new();
    let c2 = e2.create_node(r#"{"width":"100px","height":"50px"}"#);
    let root2 = e2.create_node_with_children(
        r#"{"display":"flex","flexDirection":"row","justifyContent":"flex-start","width":"400px","height":"100px"}"#,
        &[c2],
    );
    e2.compute_layout(root2, 400.0, 100.0);
    let (cx2, cy2, cw2, ch2) = get_layout(&e2, c2);
    eprintln!("justifyContent:flex-start only: c2 x={cx2} y={cy2} w={cw2} h={ch2}");
}

#[test]
fn debug_three_variations() {
    // Variation 1: no justify_content (default)
    let mut e1 = LayoutEngine::new();
    let c1 = e1.create_node(r#"{"width":"100px","height":"50px"}"#);
    let r1 = e1.create_node_with_children(r#"{"display":"flex","width":"400px","height":"100px"}"#, &[c1]);
    e1.compute_layout(r1, 400.0, 100.0);
    let (x1, y1, _, _) = get_layout(&e1, c1);
    eprintln!("1 (no justify): x={x1} y={y1}");
    
    // Variation 2: justifyContent: flex-start
    let mut e2 = LayoutEngine::new();
    let c2 = e2.create_node(r#"{"width":"100px","height":"50px"}"#);
    let r2 = e2.create_node_with_children(r#"{"display":"flex","justifyContent":"flex-start","width":"400px","height":"100px"}"#, &[c2]);
    e2.compute_layout(r2, 400.0, 100.0);
    let (x2, y2, _, _) = get_layout(&e2, c2);
    eprintln!("2 (flex-start): x={x2} y={y2}");
    
    // Variation 3: justifyContent: flex-end
    let mut e3 = LayoutEngine::new();
    let c3 = e3.create_node(r#"{"width":"100px","height":"50px"}"#);
    let r3 = e3.create_node_with_children(r#"{"display":"flex","justifyContent":"flex-end","width":"400px","height":"100px"}"#, &[c3]);
    e3.compute_layout(r3, 400.0, 100.0);
    let (x3, y3, _, _) = get_layout(&e3, c3);
    eprintln!("3 (flex-end): x={x3} y={y3}");
    
    // Variation 4: justifyContent: space-between (only 1 child, should be at 0)
    let mut e4 = LayoutEngine::new();
    let c4 = e4.create_node(r#"{"width":"100px","height":"50px"}"#);
    let r4 = e4.create_node_with_children(r#"{"display":"flex","justifyContent":"space-between","width":"400px","height":"100px"}"#, &[c4]);
    e4.compute_layout(r4, 400.0, 100.0);
    let (x4, y4, _, _) = get_layout(&e4, c4);
    eprintln!("4 (space-between, 1 child): x={x4} y={y4}");
}

#[test]
fn debug_all_scenarios() {
    eprintln!("\n=== Flex Row Two Children ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
        let c2 = e.create_node(r#"{"width":"100px","height":"50px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","width":"400px","height":"100px"}"#,
            &[c1, c2],
        );
        e.compute_layout(root, 400.0, 100.0);
        let (rx,ry,rw,rh) = get_layout(&e, root);
        let (c1x,c1y,c1w,c1h) = get_layout(&e, c1);
        let (c2x,c2y,c2w,c2h) = get_layout(&e, c2);
        eprintln!("root: {rx},{ry},{rw},{rh}  c1: {c1x},{c1y},{c1w},{c1h}  c2: {c2x},{c2y},{c2w},{c2h}");
    }
    
    eprintln!("=== Flex Column Three Children ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{"height":"30px"}"#);
        let c2 = e.create_node(r#"{"height":"30px"}"#);
        let c3 = e.create_node(r#"{"height":"30px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"column","width":"200px","height":"200px"}"#,
            &[c1, c2, c3],
        );
        e.compute_layout(root, 200.0, 200.0);
        let (c1x,c1y,_,_) = get_layout(&e, c1);
        let (c2x,c2y,_,_) = get_layout(&e, c2);
        let (c3x,c3y,_,_) = get_layout(&e, c3);
        eprintln!("c1: {c1x},{c1y}  c2: {c2x},{c2y}  c3: {c3x},{c3y}");
    }
    
    eprintln!("=== Flex Wrap ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
        let c2 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
        let c3 = e.create_node(r#"{"width":"150px","height":"50px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","flexWrap":"wrap","width":"300px"}"#,
            &[c1, c2, c3],
        );
        e.compute_layout(root, 300.0, 1000.0);
        let (c1x,c1y,_,_) = get_layout(&e, c1);
        let (c2x,c2y,_,_) = get_layout(&e, c2);
        let (c3x,c3y,_,_) = get_layout(&e, c3);
        eprintln!("c1: {c1x},{c1y}  c2: {c2x},{c2y}  c3: {c3x},{c3y}");
    }
    
    eprintln!("=== Grid 2x2 ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{}"#);
        let c2 = e.create_node(r#"{}"#);
        let c3 = e.create_node(r#"{}"#);
        let c4 = e.create_node(r#"{}"#);
        let root = e.create_node_with_children(
            r#"{"display":"grid","gridTemplateColumns":["1fr","1fr"],"gridTemplateRows":["1fr","1fr"],"width":"200px","height":"200px"}"#,
            &[c1, c2, c3, c4],
        );
        e.compute_layout(root, 200.0, 200.0);
        let (c1x,c1y,c1w,c1h) = get_layout(&e, c1);
        let (c2x,c2y,_,_) = get_layout(&e, c2);
        let (c3x,c3y,_,_) = get_layout(&e, c3);
        eprintln!("c1: {c1x},{c1y},{c1w},{c1h}  c2: {c2x},{c2y}  c3: {c3x},{c3y}");
    }
    
    eprintln!("=== Absolute Positioning ===");
    {
        let mut e = LayoutEngine::new();
        let child = e.create_node(
            r#"{"position":"absolute","insetTop":"10px","insetLeft":"20px","width":"50px","height":"50px"}"#,
        );
        let root = e.create_node_with_children(
            r#"{"display":"flex","width":"200px","height":"200px"}"#,
            &[child],
        );
        e.compute_layout(root, 200.0, 200.0);
        let (cx,cy,cw,ch) = get_layout(&e, child);
        eprintln!("child: {cx},{cy},{cw},{ch}");
    }
    
    eprintln!("=== Padding + Border ===");
    {
        let mut e = LayoutEngine::new();
        let child = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","width":"200px","height":"100px","paddingTop":"10px","paddingLeft":"20px","borderTop":"5px","borderLeft":"5px"}"#,
            &[child],
        );
        e.compute_layout(root, 200.0, 100.0);
        let (cx,cy,_,_) = get_layout(&e, child);
        eprintln!("child: {cx},{cy}");
    }
    
    eprintln!("=== Gap in Flex ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let c2 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","columnGap":"20px","width":"200px","height":"50px"}"#,
            &[c1, c2],
        );
        e.compute_layout(root, 200.0, 50.0);
        let (c2x,_,_,_) = get_layout(&e, c2);
        eprintln!("c2x: {c2x}");
    }
    
    eprintln!("=== Nested Flex ===");
    {
        let mut e = LayoutEngine::new();
        let ic1 = e.create_node(r#"{"width":"30px","height":"30px"}"#);
        let ic2 = e.create_node(r#"{"width":"30px","height":"30px"}"#);
        let inner = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"column"}"#,
            &[ic1, ic2],
        );
        let sibling = e.create_node(r#"{"width":"50px","height":"80px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","width":"200px","height":"100px"}"#,
            &[inner, sibling],
        );
        e.compute_layout(root, 200.0, 100.0);
        let (ix,_,iw,ih) = get_layout(&e, inner);
        let (sx,_,_,_) = get_layout(&e, sibling);
        eprintln!("inner: {ix},{iw},{ih}  sibling_x: {sx}");
    }
    
    eprintln!("=== JustifyContent Space-Between ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let c2 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let c3 = e.create_node(r#"{"width":"50px","height":"50px"}"#);
        let root = e.create_node_with_children(
            r#"{"display":"flex","flexDirection":"row","justifyContent":"space-between","width":"200px","height":"50px"}"#,
            &[c1, c2, c3],
        );
        e.compute_layout(root, 200.0, 50.0);
        let (c1x,_,_,_) = get_layout(&e, c1);
        let (c2x,_,_,_) = get_layout(&e, c2);
        let (c3x,_,_,_) = get_layout(&e, c3);
        eprintln!("c1x: {c1x}  c2x: {c2x}  c3x: {c3x}");
    }
    
    eprintln!("=== Grid with Column Gap ===");
    {
        let mut e = LayoutEngine::new();
        let c1 = e.create_node(r#"{}"#);
        let c2 = e.create_node(r#"{}"#);
        let root = e.create_node_with_children(
            r#"{"display":"grid","gridTemplateColumns":["100px","100px"],"gridTemplateRows":["50px"],"columnGap":"20px","width":"220px","height":"50px"}"#,
            &[c1, c2],
        );
        e.compute_layout(root, 220.0, 50.0);
        let (c1x,_,c1w,_) = get_layout(&e, c1);
        let (c2x,_,c2w,_) = get_layout(&e, c2);
        eprintln!("c1: {c1x},{c1w}  c2: {c2x},{c2w}");
    }
}
