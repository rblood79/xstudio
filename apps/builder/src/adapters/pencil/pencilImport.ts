import type {
  CompositionDocument,
  PencilDocument,
  PencilDocumentImportOptions,
  PencilNode,
} from "@composition/shared";
import {
  pencilDocumentToCompositionDocument,
  pencilNodeToCompositionDocument,
} from "@composition/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPencilNodePayload(value: unknown): value is PencilNode {
  return isRecord(value) && typeof value.id === "string";
}

export function importPencilDocument(
  payload: PencilDocument | PencilNode,
  options: PencilDocumentImportOptions = {},
): CompositionDocument {
  if (isPencilNodePayload(payload)) {
    return pencilNodeToCompositionDocument(payload, options);
  }

  return pencilDocumentToCompositionDocument(payload, options);
}
