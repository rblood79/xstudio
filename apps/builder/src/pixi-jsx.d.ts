/**
 * @pixi/react JSX 타입 확장
 *
 * PixiJS 컴포넌트들의 JSX IntrinsicElements 타입을 선언합니다.
 * @pixi/layout의 onLayout 콜백도 포함합니다.
 */

import type { LayoutOptions } from '@pixi/layout';
import type { FederatedPointerEvent, Graphics, TextStyle } from 'pixi.js';

// @pixi/layout onLayout 콜백 타입
interface LayoutCallback {
  computedLayout?: { width?: number; height?: number };
}

// 공통 이벤트 핸들러
interface PixiEventHandlers {
  onPointerDown?: (e: FederatedPointerEvent) => void;
  onPointerUp?: (e: FederatedPointerEvent) => void;
  onPointerOver?: (e: FederatedPointerEvent) => void;
  onPointerOut?: (e: FederatedPointerEvent) => void;
  onPointerEnter?: (e: FederatedPointerEvent) => void;
  onPointerLeave?: (e: FederatedPointerEvent) => void;
  onPointerMove?: (e: FederatedPointerEvent) => void;
  onPointerTap?: (e: FederatedPointerEvent) => void;
  onGlobalPointerMove?: (e: FederatedPointerEvent) => void;
  onPointerUpOutside?: (e: FederatedPointerEvent) => void;
}

// 공통 속성
interface PixiBaseProps {
  x?: number;
  y?: number;
  alpha?: number;
  visible?: boolean;
  eventMode?: 'none' | 'passive' | 'auto' | 'static' | 'dynamic';
  cursor?: string;
  ref?: React.Ref<unknown>;
  key?: string | number;
}

// 컨테이너 props
interface PixiContainerProps extends PixiBaseProps, PixiEventHandlers {
  width?: number;
  height?: number;
  layout?: Omit<LayoutOptions, 'target'> | boolean | null;
  onLayout?: (layout: LayoutCallback) => void;
  label?: string;
  interactiveChildren?: boolean;
  children?: React.ReactNode;
}

// 그래픽스 props
interface PixiGraphicsProps extends PixiBaseProps, PixiEventHandlers {
  draw?: (g: Graphics) => void;
  layout?: Omit<LayoutOptions, 'target'> | boolean | null;
}

// 텍스트 props
interface PixiTextProps extends PixiBaseProps, PixiEventHandlers {
  text?: string;
  style?: Partial<TextStyle>;
  anchor?: number | { x: number; y: number };
  layout?: Omit<LayoutOptions, 'target'> | boolean | null;
}

// 스프라이트 props
interface PixiSpriteProps extends PixiBaseProps, PixiEventHandlers {
  texture?: unknown;
  width?: number;
  height?: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      pixiContainer: PixiContainerProps;
      pixiGraphics: PixiGraphicsProps;
      pixiText: PixiTextProps;
      pixiSprite: PixiSpriteProps;
      // 대문자 버전 (호환성)
      Container: PixiContainerProps;
      Graphics: PixiGraphicsProps;
      Text: PixiTextProps;
      Sprite: PixiSpriteProps;
    }
  }
}

export {};
