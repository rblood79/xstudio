export type EditingSemanticsRole = "origin" | "instance";
export type EditingSemanticsOverrideItem = {
  descendantPath?: string;
  fieldKey: string;
  id: string;
  label: string;
};

type EditingSemanticsElementLike = {
  componentRole?: unknown;
  componentName?: unknown;
  customId?: unknown;
  id?: unknown;
  descendants?: unknown;
  masterId?: unknown;
  metadata?: unknown;
  overrides?: unknown;
  parent_id?: unknown;
  props?: unknown;
  ref?: unknown;
  reusable?: unknown;
  slot?: unknown;
  type?: unknown;
};

function asElementLike(value: unknown): EditingSemanticsElementLike | null {
  if (!value || typeof value !== "object") return null;
  return value as EditingSemanticsElementLike;
}

export function getEditingSemanticsRole(
  element: unknown,
): EditingSemanticsRole | null {
  const candidate = asElementLike(element);
  if (!candidate) return null;

  if (
    candidate.type === "ref" ||
    candidate.componentRole === "instance" ||
    typeof candidate.masterId === "string" ||
    typeof candidate.ref === "string"
  ) {
    return "instance";
  }

  if (candidate.reusable === true || candidate.componentRole === "master") {
    return "origin";
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasSlotArray(value: unknown): boolean {
  return Array.isArray(value);
}

export function hasEditingSlotMarker(element: unknown): boolean {
  const candidate = asElementLike(element);
  if (!candidate) return false;

  const props = asRecord(candidate.props);
  if (
    props?._slotChrome === "hidden" &&
    props?._slotMarkerChrome !== "visible"
  ) {
    return false;
  }

  if (candidate.type === "Slot") return true;
  if (hasSlotArray(candidate.slot)) return true;

  const metadata = asRecord(candidate.metadata);
  return hasSlotArray(metadata?.slot);
}

export function getEditingSlotMarkerRole(
  element: unknown,
  elementsById: Map<string, unknown> = new Map(),
): EditingSemanticsRole | null {
  const candidate = asElementLike(element);
  if (!candidate || !hasEditingSlotMarker(candidate)) return null;

  const ownRole = getEditingSemanticsRole(candidate);
  if (ownRole) return ownRole;

  const visited = new Set<string>();
  let parentId =
    typeof candidate.parent_id === "string" ? candidate.parent_id : null;

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = elementsById.get(parentId);
    const role = getEditingSemanticsRole(parent);
    if (role) return role;

    const parentLike = asElementLike(parent);
    parentId =
      parentLike && typeof parentLike.parent_id === "string"
        ? parentLike.parent_id
        : null;
  }

  if (typeof candidate.id === "string" && candidate.id.includes("/")) {
    const segments = candidate.id.split("/");
    while (segments.length > 1) {
      segments.pop();
      const ancestor = elementsById.get(segments.join("/"));
      const role = getEditingSemanticsRole(ancestor);
      if (role) return role;
    }
  }

  return "origin";
}

export function getEditingSemanticsLabel(
  role: EditingSemanticsRole | null,
): string | null {
  if (role === "origin") return "Origin";
  if (role === "instance") return "Instance";
  return null;
}

export function getEditingSemanticsOriginId(element: unknown): string | null {
  const candidate = asElementLike(element);
  if (!candidate) return null;

  if (typeof candidate.ref === "string") return candidate.ref;
  if (typeof candidate.masterId === "string") return candidate.masterId;
  return null;
}

export function canDetachLegacyInstance(element: unknown): boolean {
  const candidate = asElementLike(element);
  return candidate?.componentRole === "instance";
}

export function canDetachInstance(element: unknown): boolean {
  const candidate = asElementLike(element);
  return (
    candidate?.componentRole === "instance" ||
    (candidate?.type === "ref" && typeof candidate.ref === "string")
  );
}

function getCanonicalOverrideFieldKeys(
  override: Record<string, unknown>,
): string[] {
  const metadata = asRecord(override.metadata);
  const legacyProps = asRecord(metadata?.legacyProps);
  if (legacyProps) return Object.keys(legacyProps);

  const {
    children: _children,
    descendants: _descendants,
    id: _id,
    metadata: _metadata,
    name: _name,
    ref: _ref,
    reusable: _reusable,
    type: _type,
    ...props
  } = override;
  return Object.keys(props);
}

export function getEditingSemanticsOverrideFields(element: unknown): string[] {
  const candidate = asElementLike(element);
  if (!candidate) return [];

  if (candidate.componentRole === "instance") {
    return Object.keys(asRecord(candidate.overrides) ?? {});
  }

  if (candidate.type === "ref") {
    const metadata = asRecord(candidate.metadata);
    const legacyProps = asRecord(metadata?.legacyProps);
    if (legacyProps) return Object.keys(legacyProps);
    return Object.keys(asRecord(candidate.props) ?? {});
  }

  return [];
}

export function getEditingSemanticsOverrideItems(
  element: unknown,
): EditingSemanticsOverrideItem[] {
  const candidate = asElementLike(element);
  if (!candidate) return [];

  const rootFields = getEditingSemanticsOverrideFields(candidate).map(
    (fieldKey) => ({
      fieldKey,
      id: `root:${fieldKey}`,
      label: fieldKey,
    }),
  );

  if (candidate.type !== "ref") return rootFields;

  const descendants = asRecord(candidate.descendants);
  if (!descendants) return rootFields;

  const descendantFields = Object.entries(descendants).flatMap(
    ([descendantPath, override]) => {
      const overrideRecord = asRecord(override);
      if (!overrideRecord) return [];

      return getCanonicalOverrideFieldKeys(overrideRecord).map((fieldKey) => ({
        descendantPath,
        fieldKey,
        id: `descendant:${descendantPath}:${fieldKey}`,
        label: `${descendantPath}.${fieldKey}`,
      }));
    },
  );

  return [...rootFields, ...descendantFields];
}

export function getEditingSemanticsInstanceIds(
  originId: string,
  elements: Iterable<unknown>,
): string[] {
  const instanceIds: string[] = [];

  for (const element of elements) {
    const candidate = asElementLike(element);
    if (!candidate) continue;
    if (getEditingSemanticsRole(candidate) !== "instance") continue;
    if (getEditingSemanticsOriginId(candidate) !== originId) continue;

    const id = (candidate as { id?: unknown }).id;
    if (typeof id === "string") {
      instanceIds.push(id);
    }
  }

  return instanceIds;
}

export function getEditingSemanticsImpactInstanceIds(
  originElement: unknown,
  elements: Iterable<unknown>,
): string[] {
  const origin = asElementLike(originElement);
  if (!origin) return [];

  const originKeys = new Set<string>();
  for (const value of [origin.id, origin.customId, origin.componentName]) {
    if (typeof value === "string" && value.length > 0) {
      originKeys.add(value);
    }
  }
  if (originKeys.size === 0) return [];

  const instanceIds: string[] = [];
  for (const element of elements) {
    const candidate = asElementLike(element);
    if (!candidate) continue;
    if (getEditingSemanticsRole(candidate) !== "instance") continue;
    const originId = getEditingSemanticsOriginId(candidate);
    if (!originId || !originKeys.has(originId)) continue;
    if (typeof candidate.id === "string") {
      instanceIds.push(candidate.id);
    }
  }

  return instanceIds;
}
