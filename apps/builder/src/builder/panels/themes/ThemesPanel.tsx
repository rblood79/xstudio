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
// Select 옵션
// ============================================================================

const NEUTRAL_OPTIONS = [
  { value: "slate", label: "Slate" },
  { value: "gray", label: "Gray" },
  { value: "zinc", label: "Zinc" },
  { value: "neutral", label: "Neutral" },
  { value: "stone", label: "Stone" },
];

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

  const handleNeutralChange = useCallback(
    (value: string) => {
      setNeutral(value as NeutralPreset);
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

      <PropertySection title="Accent Color" id="theme-accent">
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
      </PropertySection>

      <PropertySection title="Appearance" id="theme-appearance">
        <PropertySelect
          label="Tone"
          value={neutral}
          onChange={handleNeutralChange}
          options={NEUTRAL_OPTIONS}
        />
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
