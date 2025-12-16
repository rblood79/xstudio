/**
 * PixiJS Setup
 *
 * @pixi/react와 @pixi/layout 컴포넌트 카탈로그를 정의합니다.
 *
 * 컴포넌트 등록 전략:
 * 1. 모듈 로드 시점에 extend() 호출 - 렌더링 전 등록 보장
 * 2. 컴포넌트 내에서 useExtend() 훅 - 추가 안전장치
 *
 * @example
 * // 컴포넌트 파일에서
 * import { useExtend } from '@pixi/react';
 * import { PIXI_COMPONENTS } from './pixiSetup';
 *
 * function MyComponent() {
 *   useExtend(PIXI_COMPONENTS); // 추가 안전장치 (이미 등록됨)
 *   return <pixiContainer>...</pixiContainer>;
 * }
 *
 * @since 2025-12-12
 * @updated 2025-12-13 P4: useExtend 훅 도입
 * @updated 2025-12-17 모듈 로드 시점 extend() 추가 + 클래스 이름 등록
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
import { extend } from '@pixi/react';

/**
 * PixiJS 컴포넌트 카탈로그
 *
 * useExtend() 훅과 함께 사용합니다.
 * NOTE: TextStyle은 DisplayObject가 아니므로 제외 (직접 import하여 사용)
 * NOTE: LayoutGraphics, LayoutSprite는 미사용으로 제거됨
 *
 * @pixi/react 공식 권장 패턴:
 * - pixi 접두사 사용으로 DOM/다른 라이브러리와 충돌 방지
 * - JSX: <pixiContainer>, <pixiGraphics>, <pixiText>, <pixiSprite>
 */
export const PIXI_COMPONENTS = {
  // 기본 PixiJS 컴포넌트 (pixi 접두사로 DOM 충돌 방지)
  pixiContainer: PixiContainer,
  pixiGraphics: PixiGraphics,
  pixiSprite: PixiSprite,
  pixiText: PixiText,
  // 클래스 이름으로도 등록 (@pixi/react 내부 lookup 지원)
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  // @pixi/layout 컴포넌트
  LayoutContainer,
  LayoutText,
  // @pixi/ui 컴포넌트
  FancyButton,
};

// 모듈 로드 시점에 즉시 등록 (컴포넌트 렌더링 전에 보장)
extend(PIXI_COMPONENTS);

// Re-export for convenience
export { extend, useExtend } from '@pixi/react';
