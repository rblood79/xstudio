/**
 * PixiJS Setup
 *
 * @pixi/react와 @pixi/layout 컴포넌트 카탈로그를 정의합니다.
 * useExtend() 훅과 함께 사용하여 메모이제이션된 컴포넌트 등록을 수행합니다.
 *
 * @example
 * // 컴포넌트 파일에서
 * import { useExtend } from '@pixi/react';
 * import { PIXI_COMPONENTS } from './pixiSetup';
 *
 * function MyComponent() {
 *   useExtend(PIXI_COMPONENTS); // 메모이제이션됨
 *   return <pixiContainer>...</pixiContainer>;
 * }
 *
 * @since 2025-12-12
 * @updated 2025-12-13 P4: useExtend 훅 도입
 */

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
import { FancyButton } from '@pixi/ui';

/**
 * PixiJS 컴포넌트 카탈로그
 *
 * useExtend() 훅과 함께 사용합니다.
 * NOTE: TextStyle은 DisplayObject가 아니므로 제외 (직접 import하여 사용)
 * NOTE: LayoutGraphics, LayoutSprite는 미사용으로 제거됨
 */
export const PIXI_COMPONENTS = {
  // 기본 PixiJS 컴포넌트 (DisplayObjects만)
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  // @pixi/layout 컴포넌트 (layoutContainer, layoutText 등 JSX 태그로 사용)
  LayoutContainer,
  LayoutText,
  // @pixi/ui 컴포넌트 (fancyButton 등 JSX 태그로 사용)
  FancyButton,
};

// Re-export for convenience
export { extend, useExtend } from '@pixi/react';
