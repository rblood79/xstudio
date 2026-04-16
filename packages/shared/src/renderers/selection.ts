import type { PreviewElement } from "../types";

/**
 * Collect IDs of children whose `isSelected` prop is true.
 * Shared by CheckboxGroup/ToggleButtonGroup renderers where the group's
 * controlled value is derived from child selection state.
 */
export function getSelectedChildIds(children: PreviewElement[]): string[] {
  return children.filter((c) => Boolean(c.props.isSelected)).map((c) => c.id);
}
