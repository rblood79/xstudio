const LABEL_OVERRIDES: Record<string, string> = {
  autoFocus: "Auto Focus",
  colorSpace: "Color Space",
  errorMessage: "Error Message",
  isDisabled: "Disabled",
  isDismissible: "Dismissible",
  isInvalid: "Invalid",
  isQuiet: "Quiet",
  isReadOnly: "Read Only",
  isRequired: "Required",
  labelAlign: "Label Alignment",
  labelPosition: "Label Position",
  staticColor: "Static Color",
  validationBehavior: "Validation Behavior",
};

export function inferLabel(key: string): string {
  const override = LABEL_OVERRIDES[key];
  if (override) return override;

  const normalized =
    key.startsWith("is") && key.length > 2 ? key.slice(2) : key;

  return normalized
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
