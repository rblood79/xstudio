use wasm_bindgen::prelude::*;

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
