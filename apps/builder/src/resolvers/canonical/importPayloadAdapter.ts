import type { CanonicalNode, CompositionDocument } from "@composition/shared";
import type {
  PencilNode,
  PencilPrimitiveType,
  PencilStructureType,
} from "@composition/shared";

type PencilPayloadDocument = {
  version?: unknown;
  children: unknown[];
};

const COMPOSITION_DOCUMENT_VERSION_PREFIX = "composition-";
const DEFAULT_IMPORTED_DOCUMENT_VERSION = "composition-1.0";
const PENCIL_NODE_FIELDS = new Set([
  "id",
  "type",
  "children",
  "metadata",
  "reusable",
  "ref",
  "slot",
  "name",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, source: string): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw new Error(
    `[ADR-916] Invalid import payload from ${source}: expected object payload`,
  );
}

function isCompositionDocumentPayload(
  value: unknown,
): value is CompositionDocument {
  return (
    isRecord(value) &&
    typeof value.version === "string" &&
    value.version.startsWith(COMPOSITION_DOCUMENT_VERSION_PREFIX) &&
    Array.isArray(value.children)
  );
}

function isPencilPayloadDocument(
  value: unknown,
): value is PencilPayloadDocument {
  return isRecord(value) && Array.isArray(value.children);
}

function assertPencilNode(value: unknown, source: string): PencilNode {
  const node = assertRecord(value, source);
  if (typeof node.id !== "string" || node.id.length === 0) {
    throw new Error(
      `[ADR-916] Invalid Pencil import node from ${source}: expected non-empty id`,
    );
  }
  if (node.id.includes("/")) {
    throw new Error(
      `[ADR-916] Invalid Pencil import node ${node.id}: slash is not allowed in canonical ids`,
    );
  }
  if (typeof node.type !== "string" || node.type.length === 0) {
    throw new Error(
      `[ADR-916] Invalid Pencil import node ${node.id}: expected type`,
    );
  }
  if ("children" in node && node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      throw new Error(
        `[ADR-916] Invalid Pencil import node ${node.id}: children must be an array`,
      );
    }
  }

  return node as PencilNode;
}

function toCanonicalType(
  pencilType: PencilPrimitiveType | PencilStructureType,
): CanonicalNode["type"] {
  switch (pencilType) {
    case "ref":
      return "ref";
    case "frame":
    case "group":
    case "rectangle":
    case "ellipse":
    case "line":
    case "polygon":
    case "path":
      return "frame";
    case "text":
      return "Text";
    case "icon_font":
      return "Icon";
    case "note":
    case "prompt":
    case "context":
      return "Text";
    default:
      return "frame";
  }
}

function collectPencilProps(
  node: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (PENCIL_NODE_FIELDS.has(key)) continue;
    props[key] = value;
  }
  return Object.keys(props).length > 0 ? props : undefined;
}

function collectMetadata(
  node: Record<string, unknown>,
  pencilType: string,
): CanonicalNode["metadata"] {
  const metadata = isRecord(node.metadata) ? { ...node.metadata } : {};
  return {
    ...metadata,
    type: typeof metadata.type === "string" ? metadata.type : pencilType,
    pencilType,
  };
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function pencilNodeToCanonical(
  value: unknown,
  source: string,
  forceReusable: boolean,
): CanonicalNode {
  const node = assertPencilNode(value, source);
  const record = node as Record<string, unknown>;
  const canonicalType = toCanonicalType(node.type);
  const children = node.children?.map((child) =>
    pencilNodeToCanonical(child, source, false),
  );
  const props = collectPencilProps(record);

  const canonicalNode: CanonicalNode = {
    id: node.id,
    type: canonicalType,
    metadata: collectMetadata(record, node.type),
  };

  if (typeof node.name === "string") canonicalNode.name = node.name;
  if (forceReusable) {
    canonicalNode.reusable = true;
  } else if (typeof node.reusable === "boolean") {
    canonicalNode.reusable = node.reusable;
  }
  if (children && children.length > 0) canonicalNode.children = children;
  if (props) canonicalNode.props = props;
  if (node.slot === false || isStringArray(node.slot)) {
    canonicalNode.slot = node.slot;
  }

  if (canonicalType === "ref") {
    const ref = record.ref;
    if (typeof ref !== "string" || ref.length === 0) {
      throw new Error(
        `[ADR-916] Invalid Pencil import ref ${node.id}: expected ref`,
      );
    }
    return { ...canonicalNode, type: "ref", ref };
  }

  return canonicalNode;
}

export function normalizeCompositionImportPayload(
  payload: unknown,
  source: string,
): CompositionDocument {
  if (isCompositionDocumentPayload(payload)) {
    return payload;
  }

  if (isPencilPayloadDocument(payload)) {
    return {
      version: DEFAULT_IMPORTED_DOCUMENT_VERSION,
      children: payload.children.map((child) =>
        pencilNodeToCanonical(child, source, true),
      ),
      _meta: { schemaVersion: "canonical-primary-1.0" },
    };
  }

  if (isRecord(payload) && typeof payload.id === "string") {
    return {
      version: DEFAULT_IMPORTED_DOCUMENT_VERSION,
      children: [pencilNodeToCanonical(payload, source, true)],
      _meta: { schemaVersion: "canonical-primary-1.0" },
    };
  }

  throw new Error(
    `[ADR-916] Invalid import payload from ${source}: expected CompositionDocument or Pencil-style node tree`,
  );
}
