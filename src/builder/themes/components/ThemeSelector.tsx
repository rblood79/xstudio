/**
 * ThemeSelector - Grid-based theme selector for builder themes
 *
 * Shows all available themes in a visual grid with preview cards.
 * Themes are grouped by type (dark/light).
 */

import { useMemo } from "react";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { useBuilderThemeStore, useBuilderThemeList } from "../builderThemeStore";
import "./ThemeSelector.css";

interface ThemeSelectorProps {
  /** Show theme groups (dark/light) separately */
  grouped?: boolean;
  /** Compact mode with smaller cards */
  compact?: boolean;
}

export function ThemeSelector({
  grouped = true,
  compact = false,
}: ThemeSelectorProps) {
  const activeThemeId = useBuilderThemeStore((state) => state.activeThemeId);
  const setTheme = useBuilderThemeStore((state) => state.setTheme);
  const themes = useBuilderThemeList();

  const { darkThemes, lightThemes } = useMemo(() => {
    const dark = themes.filter((t) => t.type === "dark");
    const light = themes.filter((t) => t.type === "light");
    return { darkThemes: dark, lightThemes: light };
  }, [themes]);

  if (!grouped) {
    return (
      <div className={`theme-selector ${compact ? "compact" : ""}`}>
        <div className="theme-selector__grid">
          {themes.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              isSelected={theme.id === activeThemeId}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-selector ${compact ? "compact" : ""}`}>
      {/* Dark Themes */}
      <div className="theme-selector__group">
        <div className="theme-selector__group-header">
          <span className="theme-selector__group-icon">🌙</span>
          <span className="theme-selector__group-title">Dark</span>
          <span className="theme-selector__group-count">{darkThemes.length}</span>
        </div>
        <div className="theme-selector__grid">
          {darkThemes.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              isSelected={theme.id === activeThemeId}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      {/* Light Themes */}
      <div className="theme-selector__group">
        <div className="theme-selector__group-header">
          <span className="theme-selector__group-icon">☀️</span>
          <span className="theme-selector__group-title">Light</span>
          <span className="theme-selector__group-count">{lightThemes.length}</span>
        </div>
        <div className="theme-selector__grid">
          {lightThemes.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              isSelected={theme.id === activeThemeId}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
