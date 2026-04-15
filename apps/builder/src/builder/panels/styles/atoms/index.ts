/**
 * Style Atoms - Public API
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - 모든 스타일 atom 및 파생 atom 내보내기
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

export {
  // Base atoms
  selectedElementAtom,
  inlineStyleAtom,
  computedStyleAtom,
  syntheticComputedStyleAtom,

  // Helper functions
  getStyleValueFromAtoms,

  // Transform section atoms (4 properties)
  widthAtom,
  heightAtom,
  topAtom,
  leftAtom,

  // Layout section atoms — REMOVED (ADR-067 Phase 2, migrated to useLayoutValues/useLayoutAuxiliary)

  // Appearance section atoms — REMOVED (ADR-067 Phase 4, migrated to useAppearanceValues)

  // Typography section atoms — REMOVED (ADR-067 Phase 3, migrated to useTypographyValues)

  // StylesPanel용 atoms
  hasSelectedElementAtom,
  selectedStyleAtom,
  modifiedCountAtom,
  isCopyDisabledAtom,
} from "./styleAtoms";

// Fill section atoms (Color Picker Phase 1)
export {
  fillsAtom,
  activeFillIndexAtom,
  activeFillAtom,
  colorInputModeAtom,
} from "./fillAtoms";

// Component State Preview atom (Phase A)
export { previewComponentStateAtom } from "./componentStateAtom";
