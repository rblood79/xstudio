/**
 * @pixi/react 타입 확장
 *
 * @pixi/layout의 onLayout 콜백을 @pixi/react 타입에 추가합니다.
 */

import 'pixi.js';
import '@pixi/react';

// LayoutCallback 타입
interface LayoutCallback {
  computedLayout?: { width?: number; height?: number };
}

// @pixi/react의 Container 타입 확장
declare module '@pixi/react' {
  // Container의 추가 props
  interface PixiReactContainerProps {
    onLayout?: (layout: LayoutCallback) => void;
  }
}

// pixi.js Container 확장 (@pixi/layout)
declare module 'pixi.js' {
  interface Container {
    onLayout?: (layout: LayoutCallback) => void;
  }
}
