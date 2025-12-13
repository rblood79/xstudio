/**
 * PixiJS Setup
 *
 * @pixi/react와 @pixi/layout 컴포넌트를 PIXI namespace에 등록합니다.
 * 이 파일을 import하면 모든 @pixi/layout JSX 컴포넌트를 사용할 수 있습니다.
 *
 * @example
 * // 컴포넌트 파일에서
 * import '../pixiSetup'; // extend() 실행 보장
 * import '@pixi/layout/react'; // TypeScript 타입
 *
 * @since 2025-12-12
 */

import { extend } from '@pixi/react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Text as PixiText,
} from 'pixi.js';
import {
  LayoutContainer,
  LayoutText,
} from '@pixi/layout/components';

// Extend PixiJS with all required components
// extend()는 여러 번 호출해도 안전합니다 (이미 등록된 컴포넌트는 무시됨)
// NOTE: TextStyle은 DisplayObject가 아니므로 extend() 불필요 (직접 import하여 사용)
// NOTE: LayoutGraphics, LayoutSprite는 미사용으로 제거됨
extend({
  // 기본 PixiJS 컴포넌트 (DisplayObjects만)
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  // @pixi/layout 컴포넌트 (layoutContainer, layoutText 등 JSX 태그로 사용)
  LayoutContainer,
  LayoutText,
});

// Re-export for convenience
export { extend } from '@pixi/react';
