---
applyTo: "**/*.{tsx,css}"
---
# Styles (Non-Inline TailwindCSS)
- Do **not** write Tailwind utilities in .tsx files.
- Manage styles via semantic classes (e.g., .react-aria-Button.primary, .sm) produced by tv().
- Use Tailwind only in CSS via @apply inside component layers.
- Allow runtime customization via props.className from Property Editor.
