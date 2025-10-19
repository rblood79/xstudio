---
applyTo: "src/builder/inspector/**"
---
# Inspector / Style Management
- Manage inline styles via React style prop (NOT CSS variables).
- Style priority: inline > computed > default value.
- Bidirectional sync: Inspector ↔ Builder via useSyncWithBuilder.
- History integration: Track all style changes for undo/redo.
- Flexbox: Auto-enable display:flex when using alignment buttons.
- Mutually exclusive: 3x3 grid vs spacing buttons (space-around/between/evenly).
- flex-direction aware: Grid mapping changes between row/column.
- Use ToggleButtonGroup with selectedKeys for controlled state.
- Prevent duplicate history by comparing JSON before sync.
