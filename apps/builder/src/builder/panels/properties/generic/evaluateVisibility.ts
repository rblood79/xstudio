import type { VisibilityCondition } from "@xstudio/specs";

export function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  currentProps: Record<string, unknown>,
  parentTag?: string,
): boolean {
  if (!condition) return true;

  const value = condition.key
    ? condition.key.includes(".")
      ? condition.key
          .split(".")
          .reduce<unknown>(
            (obj, k) =>
              obj && typeof obj === "object"
                ? (obj as Record<string, unknown>)[k]
                : undefined,
            currentProps,
          )
      : currentProps[condition.key]
    : undefined;

  if (condition.equals !== undefined && value !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && value === condition.notEquals) {
    return false;
  }

  if (condition.oneOf && !condition.oneOf.includes(value as never)) {
    return false;
  }

  if (condition.truthy === true && !value) {
    return false;
  }

  if (condition.truthy === false && Boolean(value)) {
    return false;
  }

  if (condition.parentTag !== undefined && parentTag !== condition.parentTag) {
    return false;
  }

  if (
    condition.parentTagNot !== undefined &&
    parentTag === condition.parentTagNot
  ) {
    return false;
  }

  return true;
}
