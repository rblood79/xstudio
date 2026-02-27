use wasm_bindgen::prelude::*;

pub mod spatial_index;
pub mod block_layout;
pub mod grid_layout;
pub mod taffy_bridge;
pub mod binary_protocol;

pub use spatial_index::SpatialIndex;
pub use taffy_bridge::TaffyLayoutEngine;

/// Minimal ping/pong test to verify WASM pipeline works.
#[wasm_bindgen]
pub fn ping() -> String {
    "pong".to_string()
}

/// Simple addition for WASM pipeline verification.
#[wasm_bindgen]
pub fn add(a: u32, b: u32) -> u32 {
    a + b
}
