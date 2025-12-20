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

  // Helper functions
  getStyleValueFromAtoms,

  // Transform section atoms (4 properties)
  widthAtom,
  heightAtom,
  topAtom,
  leftAtom,
  transformValuesAtom,

  // Layout section atoms (16 properties)
  displayAtom,
  flexDirectionAtom,
  alignItemsAtom,
  justifyContentAtom,
  gapAtom,
  flexWrapAtom,
  paddingAtom,
  paddingTopAtom,
  paddingRightAtom,
  paddingBottomAtom,
  paddingLeftAtom,
  marginAtom,
  marginTopAtom,
  marginRightAtom,
  marginBottomAtom,
  marginLeftAtom,
  layoutValuesAtom,

  // Layout alignment keys atoms (ToggleButtonGroup용)
  flexDirectionKeysAtom,
  flexAlignmentKeysAtom,
  justifyContentSpacingKeysAtom,
  flexWrapKeysAtom,

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
} from './styleAtoms';
