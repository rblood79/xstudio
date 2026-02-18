/**
 * Style to Layout Converter (DEPRECATED)
 *
 * 이 모듈은 Phase 11에서 @pixi/layout(Yoga) 제거 후 dead code가 되었습니다.
 * 레이아웃 변환은 각 엔진(TaffyFlexEngine, TaffyGridEngine, DropflowBlockEngine)이
 * 직접 수행합니다.
 *
 * - CSS 값 파싱: engines/cssValueParser.ts (resolveCSSSizeValue)
 * - 태그별 크기 계산: engines/utils.ts (calculateContentHeight, getButtonSizeConfig 등)
 * - 텍스트 측정: utils/textMeasure.ts (measureWrappedTextHeight)
 *
 * @since 2025-01-06 Phase 4
 * @deprecated 2026-02-19 Wave 3 - 호출부 0건 확인, 전체 코드 제거
 */
