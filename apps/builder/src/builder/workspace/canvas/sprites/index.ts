/**
 * Sprites Index (ADR-100 Phase 9: PixiJS Sprite 제거 후)
 *
 * styleConverter, tagSpecMap, paddingUtils만 유지.
 * BoxSprite, TextSprite, ImageSprite, ElementSprite는 삭제됨
 * → buildBoxNodeData, buildImageNodeData, buildSpecNodeData가 대체.
 * (ADR-058 Phase 4: buildTextNodeData도 폐지되어 buildSpecNodeData로 통합됨)
 */

// Style Converter
export {
  convertStyle,
  cssColorToHex,
  cssColorToAlpha,
  parseCSSSize,
} from "./styleConverter";
export type {
  CSSStyle,
  PixiTransform,
  PixiFillStyle,
  PixiStrokeStyle,
  PixiTextStyle,
  ConvertedStyle,
} from "./styleConverter";
