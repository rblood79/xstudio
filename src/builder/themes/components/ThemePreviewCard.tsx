/**
 * ThemePreviewCard - Visual preview card for builder themes
 *
 * Shows a mini preview of what the builder will look like with a given theme,
 * including header, sidebar, and editor background colors.
 */

import { tv } from "tailwind-variants";
import type { BuilderThemeMetadata } from "../types";

const cardStyles = tv({
  slots: {
    container: "theme-preview-card",
    preview: "theme-preview-card__preview",
    header: "theme-preview-card__header",
    sidebar: "theme-preview-card__sidebar",
    editor: "theme-preview-card__editor",
    info: "theme-preview-card__info",
    name: "theme-preview-card__name",
    type: "theme-preview-card__type",
    check: "theme-preview-card__check",
  },
  variants: {
    selected: {
      true: {
        container: "selected",
      },
    },
  },
});

interface ThemePreviewCardProps {
  theme: BuilderThemeMetadata;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThemePreviewCard({
  theme,
  isSelected,
  onSelect,
}: ThemePreviewCardProps) {
  const styles = cardStyles({ selected: isSelected });

  const { background, foreground, accent } = theme.preview;

  return (
    <button
      type="button"
      className={styles.container()}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`Select ${theme.name} theme`}
    >
      {/* Mini Preview */}
      <div className={styles.preview()}>
        {/* Header bar */}
        <div
          className={styles.header()}
          style={{ backgroundColor: accent }}
        />
        {/* Sidebar */}
        <div
          className={styles.sidebar()}
          style={{
            backgroundColor: theme.type === "dark"
              ? `color-mix(in srgb, ${background} 90%, white)`
              : `color-mix(in srgb, ${background} 95%, black)`,
          }}
        />
        {/* Editor area */}
        <div
          className={styles.editor()}
          style={{
            backgroundColor: background,
            color: foreground,
          }}
        >
          <span style={{ fontSize: "6px", opacity: 0.5 }}>Aa</span>
        </div>
      </div>

      {/* Theme Info */}
      <div className={styles.info()}>
        <span className={styles.name()}>{theme.name}</span>
        <span className={styles.type()}>
          {theme.type === "dark" ? "🌙" : "☀️"}
        </span>
      </div>

      {/* Selection Check */}
      {isSelected && (
        <div className={styles.check()}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  );
}
