---
applyTo: "src/builder/components/**, src/builder/inspector/**"
---
# React Aria Components
- All UI components must use React Aria for accessibility.
- Proper ARIA attributes, roles, and keyboard interactions.
- Use tv() from tailwind-variants for semantic class generation.
- Ship with .stories.tsx and .test.tsx for every new component.

## CSS Class Naming (CRITICAL)
- **Always use `react-aria-*` prefix** (e.g., `react-aria-Button`).
- Check `src/builder/components/components.css` before creating new CSS.
- Reuse existing wrapper classes (e.g., `combobox-container`).
- Only add variant classes if needed (e.g., `react-aria-UnitComboBox`).

## Workflow for new Inspector components
1. Find closest React Aria component (ComboBox, Select, Input).
2. Read implementation in `src/builder/components/`.
3. Copy className structure exactly.
4. Reuse existing CSS - avoid creating new CSS files.
