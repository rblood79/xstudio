---
applyTo: "**/*.{tsx,css}"
---
# Styles (Non-Inline TailwindCSS)
- **NEVER write Tailwind utilities in .tsx files.**
- Manage styles via semantic classes (e.g., .react-aria-Button, .primary) produced by tv().
- Use Tailwind only in CSS via @apply inside component layers.
- Allow runtime customization via props.className from Property Editor.

## React Aria CSS Naming
- Always use `react-aria-*` prefix (e.g., `react-aria-Button`, `react-aria-ComboBox`).
- Check `src/builder/components/components.css` before creating new CSS.
- Reuse existing wrapper classes (e.g., `combobox-container`, `control-label`).
- Only add variant classes if needed (e.g., `react-aria-UnitComboBox`).
