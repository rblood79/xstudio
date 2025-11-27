/**
 * KeyboardShortcutsHelp - Keyboard shortcuts help panel
 *
 * Sprint 3: Keyboard Shortcuts Enhancement
 * Shows all available keyboard shortcuts organized by category
 */

import { useState } from "react";
import { Button } from "../../../shared/components";
import { Keyboard, X, ChevronDown, ChevronRight } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";

export interface KeyboardShortcut {
  key: string;
  modifier?: "cmd" | "cmdShift" | "cmdAlt" | "cmdAltShift" | "shift" | "none";
  description: string;
  category: string;
}

export interface KeyboardShortcutsHelpProps {
  /** Whether help panel is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * All available keyboard shortcuts organized by category
 */
const SHORTCUTS: KeyboardShortcut[] = [
  // Properties
  { key: "C", modifier: "cmdShift", description: "Copy Properties", category: "Properties" },
  { key: "V", modifier: "cmdShift", description: "Paste Properties", category: "Properties" },

  // Multi-Element Editing
  { key: "C", modifier: "cmd", description: "Copy All Elements", category: "Editing" },
  { key: "V", modifier: "cmd", description: "Paste Elements", category: "Editing" },
  { key: "D", modifier: "cmd", description: "Duplicate Selection", category: "Editing" },
  { key: "Backspace", modifier: "none", description: "Delete Selected", category: "Editing" },

  // Selection
  { key: "A", modifier: "cmd", description: "Select All", category: "Selection" },
  { key: "Esc", modifier: "none", description: "Clear Selection", category: "Selection" },
  { key: "Tab", modifier: "none", description: "Next Element", category: "Selection" },
  { key: "Tab", modifier: "shift", description: "Previous Element", category: "Selection" },

  // Grouping
  { key: "G", modifier: "cmd", description: "Group Selection", category: "Grouping" },
  { key: "G", modifier: "cmdShift", description: "Ungroup Selection", category: "Grouping" },

  // Alignment
  { key: "L", modifier: "cmdShift", description: "Align Left", category: "Alignment" },
  { key: "H", modifier: "cmdShift", description: "Align Horizontal Center", category: "Alignment" },
  { key: "R", modifier: "cmdShift", description: "Align Right", category: "Alignment" },
  { key: "T", modifier: "cmdShift", description: "Align Top", category: "Alignment" },
  { key: "M", modifier: "cmdShift", description: "Align Vertical Middle", category: "Alignment" },
  { key: "B", modifier: "cmdShift", description: "Align Bottom", category: "Alignment" },

  // Distribution
  { key: "D", modifier: "cmdShift", description: "Distribute Horizontally", category: "Distribution" },
  { key: "V", modifier: "cmdAltShift", description: "Distribute Vertically", category: "Distribution" },

  // General
  { key: "Z", modifier: "cmd", description: "Undo", category: "General" },
  { key: "Z", modifier: "cmdShift", description: "Redo", category: "General" },
  { key: "S", modifier: "cmd", description: "Save", category: "General" },
  { key: "?", modifier: "cmd", description: "Show This Help", category: "General" },
];

/**
 * Format modifier key for display
 */
function formatModifier(modifier?: string): string {
  if (!modifier || modifier === "none") return "";

  const isMac = navigator.platform.toLowerCase().includes("mac");
  const cmdKey = isMac ? "⌘" : "Ctrl";
  const altKey = isMac ? "⌥" : "Alt";
  const shiftKey = "⇧";

  switch (modifier) {
    case "cmd":
      return cmdKey;
    case "cmdShift":
      return `${cmdKey}${shiftKey}`;
    case "cmdAlt":
      return `${cmdKey}${altKey}`;
    case "cmdAltShift":
      return `${cmdKey}${altKey}${shiftKey}`;
    case "shift":
      return shiftKey;
    default:
      return "";
  }
}

/**
 * Keyboard Shortcuts Help Panel
 *
 * @example
 * ```tsx
 * const [showHelp, setShowHelp] = useState(false);
 *
 * <KeyboardShortcutsHelp
 *   isOpen={showHelp}
 *   onClose={() => setShowHelp(false)}
 * />
 * ```
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  className = "",
}: KeyboardShortcutsHelpProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryOrder = ["General", "Selection", "Editing", "Properties", "Grouping", "Alignment", "Distribution"];

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className={`keyboard-shortcuts-help ${className}`.trim()}>
      <div className="shortcuts-overlay" onClick={onClose} />

      <div className="shortcuts-panel">
        {/* Header */}
        <div className="shortcuts-header">
          <div className="shortcuts-title">
            <Keyboard
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            <X
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>

        {/* Content */}
        <div className="shortcuts-content">
          {categoryOrder.map((category) => {
            const shortcuts = categories[category];
            if (!shortcuts) return null;

            const isCollapsed = collapsedCategories.has(category);

            return (
              <div key={category} className="shortcuts-category">
                <button
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={2} />
                  )}
                  <h3>{category}</h3>
                  <span className="category-count">({shortcuts.length})</span>
                </button>

                {!isCollapsed && (
                  <div className="shortcuts-list">
                    {shortcuts.map((shortcut, index) => (
                      <div key={`${category}-${index}`} className="shortcut-item">
                        <span className="shortcut-description">{shortcut.description}</span>
                        <kbd className="shortcut-keys">
                          {formatModifier(shortcut.modifier)}
                          {formatModifier(shortcut.modifier) && <span className="key-separator">+</span>}
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shortcuts-footer">
          <p className="shortcuts-hint">
            💡 Press <kbd>⌘?</kbd> anytime to toggle this help panel
          </p>
        </div>
      </div>
    </div>
  );
}
