/// <reference types="vite/client" />

// @pixi/react JSX 타입 확장
import type { Graphics } from 'pixi.js';
import type { ReactNode } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      pixiContainer: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        alpha?: number;
        visible?: boolean;
        interactive?: boolean;
        layout?: Record<string, unknown>;
        onLayout?: (layout: unknown) => void;
        cursor?: string;
        pointerdown?: (e: unknown) => void;
        pointerup?: (e: unknown) => void;
        pointerover?: (e: unknown) => void;
        pointerout?: (e: unknown) => void;
        children?: ReactNode;
      };
      pixiGraphics: {
        draw?: (g: Graphics) => void;
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
      };
      pixiText: {
        text?: string;
        style?: object;
        anchor?: number | { x: number; y: number };
        x?: number;
        y?: number;
        alpha?: number;
        visible?: boolean;
        layout?: Record<string, unknown>;
      };
      pixiSprite: {
        texture?: unknown;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        alpha?: number;
        visible?: boolean;
      };
      Text: {
        text?: string;
        style?: object;
        anchor?: number | { x: number; y: number };
        x?: number;
        y?: number;
        alpha?: number;
        visible?: boolean;
      };
      Container: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        alpha?: number;
        visible?: boolean;
        children?: ReactNode;
      };
      Graphics: {
        draw?: (g: Graphics) => void;
        x?: number;
        y?: number;
      };
      Sprite: {
        texture?: unknown;
        x?: number;
        y?: number;
      };
    }
  }
}

/**
 * Vite 환경변수 타입 정의
 *
 * @see https://vitejs.dev/guide/env-and-mode.html
 */
interface ImportMetaEnv {
  /** Supabase 프로젝트 URL */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase Anonymous Key */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** API 기본 URL */
  readonly VITE_API_URL?: string;
  /** 디버그 로그 활성화 */
  readonly VITE_ENABLE_DEBUG_LOGS?: string;
  /** 🚀 Phase 10: WebGL Canvas 활성화 Feature Flag */
  readonly VITE_USE_WEBGL_CANVAS?: string;
  /** 캔버스 비교 모드 (iframe + PixiJS 동시 표시) */
  readonly VITE_CANVAS_COMPARE_MODE?: string;
  /** WASM SpatialIndex 가속 */
  readonly VITE_WASM_SPATIAL?: string;
  /** WASM Layout Engine 가속 */
  readonly VITE_WASM_LAYOUT?: string;
  /** WASM Layout Worker (비동기) */
  readonly VITE_WASM_LAYOUT_WORKER?: string;
  /** 렌더 모드: pixi | skia | hybrid */
  readonly VITE_RENDER_MODE?: string;
  /** Skia 이중 Surface 캐싱 */
  readonly VITE_SKIA_DUAL_SURFACE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
