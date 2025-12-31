/**
 * Sprites Index
 *
 * 🚀 Phase 10 B1.2: 스프라이트 모듈 내보내기
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

// Style Converter
export { convertStyle, cssColorToHex, cssColorToAlpha, parseCSSSize } from './styleConverter';
export type {
  CSSStyle,
  PixiTransform,
  PixiFillStyle,
  PixiStrokeStyle,
  PixiTextStyle,
  ConvertedStyle,
} from './styleConverter';

// Sprites
export { BoxSprite } from './BoxSprite';
export type { BoxSpriteProps } from './BoxSprite';

export { TextSprite } from './TextSprite';
export type { TextSpriteProps } from './TextSprite';

export { ImageSprite } from './ImageSprite';
export type { ImageSpriteProps } from './ImageSprite';

// Main Element Sprite (to be created)
export { ElementSprite } from './ElementSprite';
export type { ElementSpriteProps } from './ElementSprite';
