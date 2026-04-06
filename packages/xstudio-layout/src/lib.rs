use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct LayoutEngine {
    initialized: bool,
}

#[wasm_bindgen]
impl LayoutEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { initialized: true }
    }

    pub fn is_ready(&self) -> bool {
        self.initialized
    }

    pub fn version(&self) -> String {
        "0.1.0-alpha".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_initializes() {
        let engine = LayoutEngine::new();
        assert!(engine.is_ready());
    }
}
