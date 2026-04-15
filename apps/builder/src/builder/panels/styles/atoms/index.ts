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

  // Appearance section atoms (5 properties)
  backgroundColorAtom,
  borderColorAtom,
  borderWidthAtom,
  borderRadiusAtom,
  borderStyleAtom,
  appearanceValuesAtom,

  // Typography section atoms (11 properties)
  fontFamilyAtom,
  fontSizeAtom,
  fontWeightAtom,
  fontStyleAtom,
  lineHeightAtom,
  letterSpacingAtom,
  colorAtom,
  textAlignAtom,
  textDecorationAtom,
  textTransformAtom,
  verticalAlignAtom,
  typographyValuesAtom,

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
