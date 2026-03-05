/**
 * ThemesPanel - 인라인 테마 설정 패널 (ADR-021 Phase A+B)
 *
 * Tint 프리셋 선택 + Dark Mode 토글 + Neutral Tone + Radius Scale + 미니 프리뷰.
 * 기존 PropertySection/PanelHeader 패턴 준수.
 */

import { memo, useCallback } from "react";
import { SwatchBook, Check, Sun, Moon } from "lucide-react";
import {
  Button,
  ToggleButton as RAToggleButton,
  parseColor,
} from "react-aria-components";
import { ColorSwatch } from "@xstudio/shared/components/ColorSwatch";
import { iconProps } from "../../../utils/ui/uiConstants";
import type { PanelProps } from "../core/types";
import {
  useThemeConfigStore,
  useThemeConfigTint,
  useThemeConfigDarkMode,
  useThemeConfigNeutral,
  useThemeConfigRadiusScale,
} from "../../../stores/themeConfigStore";
import type { TintPreset } from "../../../utils/theme/tintToSkiaColors";
import { TINT_PRESETS } from "../../../utils/theme/tintToSkiaColors";
import type { NeutralPreset } from "../../../utils/theme/neutralToSkiaColors";
import { NEUTRAL_PALETTES } from "../../../utils/theme/neutralToSkiaColors";
import type { RadiusScale } from "../../../stores/themeConfigStore";
import { oklchToHex } from "../../../utils/theme/oklchToHex";
import { PanelHeader, PropertySection, PropertySelect } from "../../components";
import { MiniThemePreview } from "./MiniThemePreview";
import "./ThemesPanel.css";

// ============================================================================
// TintGrid — 10색 ColorSwatch 프리셋 버튼
// ============================================================================

/** Tint 프리셋 표시 순서 */
const TINT_ORDER: TintPreset[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "turquoise",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
];

/** 프리셋별 미리보기 hex (55% lightness = highlight-background 기준) */
const TINT_HEX_MAP: Record<TintPreset, string> = Object.fromEntries(
  TINT_ORDER.map((key) => {
    const { h, c } = TINT_PRESETS[key];
    return [key, oklchToHex(0.55, c, h)];
  }),
) as Record<TintPreset, string>;

/** Tint 프리셋 한글 라벨 */
const TINT_LABELS: Record<TintPreset, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  turquoise: "Turquoise",
  cyan: "Cyan",
  blue: "Blue",
  indigo: "Indigo",
  purple: "Purple",
  pink: "Pink",
};

interface TintSwatchProps {
  tint: TintPreset;
  selected: boolean;
  onSelect: (tint: TintPreset) => void;
}

const TintSwatch = memo(
  function TintSwatch({ tint, selected, onSelect }: TintSwatchProps) {
    const handlePress = useCallback(() => onSelect(tint), [tint, onSelect]);
    const color = parseColor(TINT_HEX_MAP[tint]);

    return (
      <Button
        className="react-aria-Group color-swatch-button tint-swatch"
        aria-label={TINT_LABELS[tint]}
        data-selected={selected || undefined}
        onPress={handlePress}
      >
        <ColorSwatch color={color} />
        {selected && (
          <Check
            size={14}
            strokeWidth={3}
            color="#fff"
            className="tint-swatch-check"
          />
        )}
      </Button>
    );
  },
  (prev, next) =>
    prev.tint === next.tint &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect,
);

// ============================================================================
// NeutralGrid — 5색 Neutral 프리셋 스와치
// ============================================================================

/** Neutral 프리셋 표시 순서 */
const NEUTRAL_ORDER: NeutralPreset[] = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];

/** 프리셋별 대표 hex (step 500 = 중간 밝기) */
const NEUTRAL_HEX_MAP: Record<NeutralPreset, string> = {
  slate: NEUTRAL_PALETTES.slate[500],
  gray: NEUTRAL_PALETTES.gray[500],
  zinc: NEUTRAL_PALETTES.zinc[500],
  neutral: NEUTRAL_PALETTES.neutral[500],
  stone: NEUTRAL_PALETTES.stone[500],
};

/** Neutral 프리셋 라벨 */
const NEUTRAL_LABELS: Record<NeutralPreset, string> = {
  slate: "Slate",
  gray: "Gray",
  zinc: "Zinc",
  neutral: "Neutral",
  stone: "Stone",
};

interface NeutralSwatchProps {
  preset: NeutralPreset;
  selected: boolean;
  onSelect: (preset: NeutralPreset) => void;
}

const NeutralSwatch = memo(
  function NeutralSwatch({ preset, selected, onSelect }: NeutralSwatchProps) {
    const handlePress = useCallback(() => onSelect(preset), [preset, onSelect]);
    const color = parseColor(NEUTRAL_HEX_MAP[preset]);

    return (
      <Button
        className="react-aria-Group color-swatch-button tint-swatch"
        aria-label={NEUTRAL_LABELS[preset]}
        data-selected={selected || undefined}
        onPress={handlePress}
      >
        <ColorSwatch color={color} />
        {selected && (
          <Check
            size={14}
            strokeWidth={3}
            color="#fff"
            className="tint-swatch-check"
          />
        )}
      </Button>
    );
  },
  (prev, next) =>
    prev.preset === next.preset &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect,
);

// ============================================================================
// Select 옵션
// ============================================================================

const RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
];

// ============================================================================
// ThemesContent
// ============================================================================

function ThemesContent() {
  const currentTint = useThemeConfigTint();
  const darkMode = useThemeConfigDarkMode();
  const neutral = useThemeConfigNeutral();
  const radiusScale = useThemeConfigRadiusScale();
  const setTint = useThemeConfigStore((s) => s.setTint);
  const setDarkMode = useThemeConfigStore((s) => s.setDarkMode);
  const setNeutral = useThemeConfigStore((s) => s.setNeutral);
  const setRadiusScale = useThemeConfigStore((s) => s.setRadiusScale);

  const isDark = darkMode === "dark";

  const handleDarkModeToggle = useCallback(
    (isSelected: boolean) => {
      setDarkMode(isSelected ? "dark" : "light");
    },
    [setDarkMode],
  );

  const handleTintSelect = useCallback(
    (tint: TintPreset) => {
      setTint(tint);
    },
    [setTint],
  );

  const handleNeutralSelect = useCallback(
    (preset: NeutralPreset) => {
      setNeutral(preset);
    },
    [setNeutral],
  );

  const handleRadiusChange = useCallback(
    (value: string) => {
      setRadiusScale(value as RadiusScale);
    },
    [setRadiusScale],
  );

  return (
    <div className="themes-panel">
      <PanelHeader
        icon={<SwatchBook size={iconProps.size} />}
        title="Theme"
        actions={
          <RAToggleButton
            className="iconButton"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            isSelected={isDark}
            onChange={handleDarkModeToggle}
          >
            {isDark ? (
              <Sun size={iconProps.size} strokeWidth={iconProps.strokeWidth} />
            ) : (
              <Moon size={iconProps.size} strokeWidth={iconProps.strokeWidth} />
            )}
          </RAToggleButton>
        }
      />

      <PropertySection title="Colors" id="theme-colors">
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Accent</legend>
          <div className="tint-grid">
            {TINT_ORDER.map((tint) => (
              <TintSwatch
                key={tint}
                tint={tint}
                selected={currentTint === tint}
                onSelect={handleTintSelect}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Tone</legend>
          <div className="tint-grid">
            {NEUTRAL_ORDER.map((preset) => (
              <NeutralSwatch
                key={preset}
                preset={preset}
                selected={neutral === preset}
                onSelect={handleNeutralSelect}
              />
            ))}
          </div>
        </fieldset>
      </PropertySection>

      <PropertySection title="Appearance" id="theme-appearance">
        <PropertySelect
          label="Radius"
          value={radiusScale}
          onChange={handleRadiusChange}
          options={RADIUS_OPTIONS}
        />
      </PropertySection>

      <PropertySection title="Preview" id="theme-preview">
        <MiniThemePreview />
      </PropertySection>
    </div>
  );
}

// ============================================================================
// ThemesPanel (Gateway)
// ============================================================================

export function ThemesPanel({ isActive }: PanelProps) {
  if (!isActive) return null;
  return <ThemesContent />;
}
