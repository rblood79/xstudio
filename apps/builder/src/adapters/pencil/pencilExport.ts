import type {
  CompositionDocument,
  PencilDocument,
  PencilExportOptions,
  PencilNode,
} from "@composition/shared";
import {
  componentToPencilTree,
  compositionDocumentToPencilDocument,
} from "@composition/shared";

type JsonComparable =
  | null
  | string
  | number
  | boolean
  | JsonComparable[]
  | { [key: string]: JsonComparable };

function normalizeValue(value: unknown): JsonComparable | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(normalizeValue)
      .filter((item): item is JsonComparable => item !== undefined);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const result: Record<string, JsonComparable> = {};
    for (const key of Object.keys(record).sort()) {
      const normalized = normalizeValue(record[key]);
      if (normalized !== undefined) result[key] = normalized;
    }
    return result;
  }

  return undefined;
}

export function exportPencilNode(
  node: CompositionDocument["children"][number],
): PencilNode {
  return componentToPencilTree(node);
}

export function exportPencilDocument(
  document: CompositionDocument,
  options: PencilExportOptions = {},
): PencilDocument {
  return compositionDocumentToPencilDocument(document, options);
}

export function normalizePencilDocumentForSchemaCompare(
  document: PencilDocument,
): JsonComparable {
  return normalizeValue(document) ?? {};
}
