/**
 * useCrispText Hook
 *
 * 줌 레벨에 따른 동적 폰트 크기 조절로 텍스트 선명도 유지
 * Figma와 유사한 방식: 줌 시 텍스트를 재래스터라이즈
 *
 * 원리:
 * - 줌 인 시: fontSize를 높이고, scale을 낮춰 시각적 크기 유지
 * - 결과: 텍스트가 높은 해상도로 렌더링되어 선명함
 *
 * @since 2025-12-15
 */

import { useMemo } from 'react';
import { useCanvasSyncStore } from '../canvasSync';

/**
 * 선명한 텍스트를 위한 렌더링 설정
 */
export interface CrispTextConfig {
  /** 실제 렌더링할 폰트 크기 (baseFontSize * multiplier) */
  renderFontSize: number;
  /** 텍스트 스케일 (1 / multiplier) - 시각적 크기 유지용 */
  textScale: number;
  /** 해상도 배율 */
  multiplier: number;
  /** 현재 줌 레벨 */
  zoom: number;
}

/**
 * 줌 레벨에 따른 해상도 배율 계산
 *
 * 핵심 원리:
 * - 텍스트는 Camera 줌에 의해 스케일됨
 * - 그 상태에서 선명하게 보이려면, 줌 비율만큼 높은 해상도로 렌더링
 * - fontSize × multiplier로 렌더링 후, 1/multiplier로 스케일 → Camera 줌이 다시 적용
 *
 * 배율 = ceil(zoom) (정수 단위로 올림하여 항상 선명하게)
 * - zoom 0.5: multiplier = 1
 * - zoom 1.0: multiplier = 1
 * - zoom 1.5: multiplier = 2
 * - zoom 2.5: multiplier = 3
 * - zoom 4.0: multiplier = 4 (최대)
 *
 * @param zoom 현재 줌 레벨
 * @returns 해상도 배율 (1~4)
 */
function calculateMultiplier(_zoom: number): number {
  // 비활성화: scale 적용 문제로 인해 1x로 고정
  // roundPixels + resolution 2x 설정으로 기본 선명도 확보
  return 1;
}

/**
 * 선명한 텍스트 렌더링을 위한 hook
 *
 * @param baseFontSize 기본 폰트 크기 (CSS에서 지정된 값)
 * @returns CrispTextConfig
 *
 * @example
 * const { renderFontSize, textScale } = useCrispText(16);
 *
 * // TextStyle에 renderFontSize 사용
 * const style = new TextStyle({ fontSize: renderFontSize });
 *
 * // pixiText에 scale 적용
 * <pixiText style={style} scale={textScale} />
 */
export function useCrispText(baseFontSize: number): CrispTextConfig {
  const zoom = useCanvasSyncStore((state) => state.zoom);

  return useMemo(() => {
    const multiplier = calculateMultiplier(zoom);
    const renderFontSize = baseFontSize * multiplier;
    const textScale = 1 / multiplier;

    return {
      renderFontSize,
      textScale,
      multiplier,
      zoom,
    };
  }, [baseFontSize, zoom]);
}

/**
 * 여러 텍스트 스타일 속성에 배율 적용
 *
 * @param config 원본 텍스트 스타일 설정
 * @param multiplier 해상도 배율
 * @returns 배율이 적용된 설정
 */
export function scaledTextStyle(
  config: {
    fontSize: number;
    letterSpacing?: number;
    leading?: number;
    wordWrapWidth?: number;
  },
  multiplier: number
): {
  fontSize: number;
  letterSpacing: number;
  leading: number;
  wordWrapWidth: number | undefined;
} {
  return {
    fontSize: config.fontSize * multiplier,
    letterSpacing: (config.letterSpacing || 0) * multiplier,
    leading: (config.leading || 0) * multiplier,
    wordWrapWidth: config.wordWrapWidth ? config.wordWrapWidth * multiplier : undefined,
  };
}

export default useCrispText;
