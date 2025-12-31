/**
 * @pixi/react JSX 타입 확장
 *
 * PixiJS 컴포넌트들의 JSX IntrinsicElements 타입을 선언합니다.
 */

declare namespace JSX {
  interface IntrinsicElements {
    pixiContainer: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      alpha?: number;
      visible?: boolean;
      interactive?: boolean;
      cursor?: string;
      pointerdown?: (e: unknown) => void;
      pointerup?: (e: unknown) => void;
      pointerover?: (e: unknown) => void;
      pointerout?: (e: unknown) => void;
      children?: React.ReactNode;
      key?: string | number;
    };
    pixiGraphics: {
      draw?: (g: unknown) => void;
      x?: number;
      y?: number;
      alpha?: number;
      visible?: boolean;
      interactive?: boolean;
      cursor?: string;
      pointerdown?: (e: unknown) => void;
      pointerup?: (e: unknown) => void;
      pointerover?: (e: unknown) => void;
      pointerout?: (e: unknown) => void;
      key?: string | number;
    };
    pixiText: {
      text?: string;
      style?: object;
      anchor?: number | { x: number; y: number };
      x?: number;
      y?: number;
      alpha?: number;
      visible?: boolean;
      key?: string | number;
    };
    pixiSprite: {
      texture?: unknown;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      alpha?: number;
      visible?: boolean;
      key?: string | number;
    };
    Text: {
      text?: string;
      style?: object;
      anchor?: number | { x: number; y: number };
      x?: number;
      y?: number;
      alpha?: number;
      visible?: boolean;
      key?: string | number;
    };
    Container: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      alpha?: number;
      visible?: boolean;
      children?: React.ReactNode;
      key?: string | number;
    };
    Graphics: {
      draw?: (g: unknown) => void;
      x?: number;
      y?: number;
      key?: string | number;
    };
    Sprite: {
      texture?: unknown;
      x?: number;
      y?: number;
      key?: string | number;
    };
  }
}
