/**
 * MiniThemePreview - CSS 변수 기반 경량 미니 프리뷰 (ADR-021 Phase B)
 *
 * tint/neutral/radius 변경을 CSS 변수 인라인 오버라이드로 즉시 반영.
 * Builder DOM의 CSS 변수에 의존하지 않고, store 값에서 직접 계산.
 */

import { memo, useMemo } from "react";
import {
  useThemeConfigTint,
  useThemeConfigNeutral,
  useThemeConfigRadiusScale,
} from "../../../stores/themeConfigStore";
import { NEUTRAL_PALETTES } from "../../../utils/theme/neutralToSkiaColors";
import { TINT_PRESETS } from "../../../utils/theme/tintToSkiaColors";
import { oklchToHex } from "../../../utils/theme/oklchToHex";

export const MiniThemePreview = memo(function MiniThemePreview() {
  const tint = useThemeConfigTint();
  const neutral = useThemeConfigNeutral();
  const radiusScale = useThemeConfigRadiusScale();

  const vars = useMemo(() => {
    const palette = NEUTRAL_PALETTES[neutral];
    const { h, c } = TINT_PRESETS[tint];
    const highlightBg = oklchToHex(0.55, c, h);

    const radiusMap: Record<string, number> = {
      none: 0,
      sm: 0.5,
      md: 1,
      lg: 1.5,
      xl: 2,
    };
    const rf = radiusMap[radiusScale];
    const radius = `${6 * rf}px`;

    return {
      "--mp-highlight-bg": highlightBg,
      "--mp-bg": palette[50],
      "--mp-bg-200": palette[200],
      "--mp-border": palette[300],
      "--mp-text": palette[900],
      "--mp-text-sub": palette[600],
      "--mp-placeholder": palette[500],
      "--mp-overlay": palette[100],
      "--mp-link": highlightBg,
      "--mp-radius": radius,
    } as React.CSSProperties;
  }, [tint, neutral, radiusScale]);

  return (
    <div className="mini-preview" style={vars}>
      {/* Neutral 스와치 — tone 차이 시각 확인용 */}
      <div className="mini-preview__swatches">
        {[50, 200, 400, 600, 800, 950].map((step) => (
          <div
            key={step}
            className="mini-preview__swatch"
            style={{ background: NEUTRAL_PALETTES[neutral][step] }}
            title={`${neutral}-${step}`}
          />
        ))}
      </div>

      <div className="mini-preview__row">
        <div className="mini-preview__button">Button</div>
        <div className="mini-preview__input">Input text</div>
      </div>
      <div className="mini-preview__row">
        <span className="mini-preview__link">Link</span>
        <div className="mini-preview__card">
          <div className="mini-preview__card-title">Card Title</div>
          <div className="mini-preview__card-text">Description text</div>
        </div>
      </div>
    </div>
  );
});
