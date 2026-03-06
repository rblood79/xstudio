import {
  Button as RACButton,
  type ButtonProps as RACButtonProps,
  Tooltip,
  TooltipTrigger,
  OverlayArrow,
} from "react-aria-components";
import {
  SHORTCUT_DEFINITIONS,
  type ShortcutId,
} from "../../config/keyboardShortcuts";
import { formatShortcut } from "@/builder/hooks";
import "./ActionIconButton.css";

export interface ActionIconButtonProps extends Omit<
  RACButtonProps,
  "className"
> {
  /** Plain tooltip text (no shortcut) */
  tooltip?: string;
  /** Shortcut ID — shows description + key combo in tooltip */
  shortcutId?: ShortcutId;
  /** Tooltip placement */
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
  /** Additional CSS class */
  className?: string;
}

export function ActionIconButton({
  tooltip,
  shortcutId,
  tooltipPlacement = "bottom",
  className,
  children,
  ...props
}: ActionIconButtonProps) {
  const shortcutDef = shortcutId ? SHORTCUT_DEFINITIONS[shortcutId] : undefined;
  const tooltipLabel =
    tooltip || shortcutDef?.i18n?.ko || shortcutDef?.description;
  const shortcutDisplay = shortcutDef
    ? formatShortcut({ key: shortcutDef.key, modifier: shortcutDef.modifier })
    : undefined;

  const button = (
    <RACButton
      {...props}
      className={
        className ? `action-icon-button ${className}` : "action-icon-button"
      }
    >
      {children}
    </RACButton>
  );

  if (!tooltipLabel) {
    return button;
  }

  return (
    <TooltipTrigger delay={700}>
      {button}
      <Tooltip placement={tooltipPlacement} className="action-tooltip">
        <OverlayArrow>
          <svg width={8} height={8} viewBox="0 0 8 8">
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
        <span className="action-tooltip-label">{tooltipLabel}</span>
        {shortcutDisplay && (
          <kbd className="action-tooltip-kbd">{shortcutDisplay}</kbd>
        )}
      </Tooltip>
    </TooltipTrigger>
  );
}
