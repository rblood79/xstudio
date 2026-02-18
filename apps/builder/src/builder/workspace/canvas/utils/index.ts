/**
 * Canvas Utils
 *
 * PixiJS Canvas를 위한 유틸리티 모음
 *
 * @since 2025-12-15
 * @updated 2026-02-17 Phase 0: colorMath, boxCalculation, textMeasure 추가
 */

// Border-box 유틸리티
export * from './borderUtils';
export * from './graphicsUtils';

// CSS 변수 읽기
export * from './cssVariableReader';

// GPU 프로파일링
export * from './gpuProfilerCore';

// Phase 0: @pixi/ui 순수 로직 추출
export * from './colorMath';
export * from './boxCalculation';
export {
  type TextMeasurer,
  type TextMeasureResult,
  type TextMeasureStyle,
  Canvas2DTextMeasurer,
  getTextMeasurer,
  setTextMeasurer,
} from './textMeasure';
