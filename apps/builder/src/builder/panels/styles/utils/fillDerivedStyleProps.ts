export const FILL_DERIVED_STYLE_PROPS = [
  "backgroundColor",
  "backgroundImage",
  "backgroundSize",
] as const;

export function isFillDerivedStyleProp(property: string): boolean {
  return (FILL_DERIVED_STYLE_PROPS as readonly string[]).includes(property);
}

export function sanitizeFillDerivedStylePatch(
  styles: Record<string, string>,
  fillV2Enabled: boolean,
): Record<string, string> {
  if (!fillV2Enabled) return styles;

  return Object.fromEntries(
    Object.entries(styles).filter(([key]) => !isFillDerivedStyleProp(key)),
  );
}
