import { memo, useEffect, useMemo, useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import type { Element } from "../../../types/core/store.types";
import {
  resolveCanonicalRefMaster,
  isCanonicalRefElement,
} from "../../utils/canonicalRefResolution";
import { resolveReference } from "../../../utils/component/referenceResolution";
import { PropertySection, PropertySelect } from "../../components";
import { useStore } from "../../stores";

type SlotHostElement = Element & {
  metadata?: { slot?: unknown };
  slot?: false | string[];
};

type SlotFillElement = Element & {
  descendants?: Record<string, Record<string, unknown>>;
};

type SlotHostInfo = {
  label: string;
  path: string;
  recommendedIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getElementLabel(element: Element): string {
  return element.componentName ?? element.customId ?? element.type;
}

function getStableSegment(element: Element): string {
  return element.customId ?? element.id;
}

function getSlotValue(element: Element): string[] | null {
  const slotElement = element as SlotHostElement;
  if (Array.isArray(slotElement.slot)) return slotElement.slot;

  const metadataSlot = slotElement.metadata?.slot;
  if (Array.isArray(metadataSlot)) return metadataSlot;

  return null;
}

function getSlotFillChildren(
  instance: SlotFillElement,
  path: string,
): unknown[] {
  const override = instance.descendants?.[path];
  return override && Array.isArray(override.children) ? override.children : [];
}

function collectSlotHosts(
  parent: Element,
  childrenMap: Map<string, Element[]>,
  pathPrefix = "",
): SlotHostInfo[] {
  const slots: SlotHostInfo[] = [];
  const children = childrenMap.get(parent.id) ?? [];

  for (const child of children) {
    const segment = getStableSegment(child);
    const path = pathPrefix ? `${pathPrefix}/${segment}` : segment;
    const slot = getSlotValue(child);
    if (slot) {
      slots.push({
        label: getElementLabel(child),
        path,
        recommendedIds: slot,
      });
    }
    slots.push(...collectSlotHosts(child, childrenMap, path));
  }

  return slots;
}

function getFillCandidateOptions(
  slot: SlotHostInfo | undefined,
  elementsMap: Map<string, Element>,
): { label: string; value: string }[] {
  if (!slot) return [];

  const recommended = slot.recommendedIds
    .map((reference) => resolveReference(reference, elementsMap.values()))
    .filter((candidate): candidate is Element => Boolean(candidate))
    .filter((candidate) => candidate.reusable === true);

  const candidates =
    recommended.length > 0
      ? recommended
      : [...elementsMap.values()].filter((candidate) => candidate.reusable === true);

  return candidates
    .map((candidate) => ({
      label: getElementLabel(candidate),
      value: candidate.id,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getFilledLabel(
  children: unknown[],
  elementsMap: Map<string, Element>,
): string {
  const labels = children
    .filter(isRecord)
    .map((child) => {
      const ref = typeof child.ref === "string" ? child.ref : undefined;
      const candidate = ref ? resolveReference(ref, elementsMap.values()) : undefined;
      if (candidate) return getElementLabel(candidate);
      return typeof child.type === "string" ? child.type : "Unknown";
    });

  return labels.length > 0 ? labels.join(", ") : "Empty";
}

function getFillNodeId(candidate: Element): string {
  return candidate.customId ?? candidate.id;
}

export const ComponentSlotFillSection = memo(function ComponentSlotFillSection({
  elementId,
}: {
  elementId: string;
}) {
  const element = useStore((state) => state.elementsMap.get(elementId));
  const elementsMap = useStore((state) => state.elementsMap);
  const childrenMap = useStore((state) => state.childrenMap);
  const updateElement = useStore((state) => state.updateElement);
  const [selectedSlotPath, setSelectedSlotPath] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const master = useMemo(() => {
    if (!element || !isCanonicalRefElement(element)) return undefined;
    const ref = (element as Element & { ref?: unknown }).ref;
    return typeof ref === "string"
      ? resolveCanonicalRefMaster(ref, elementsMap.values())
      : undefined;
  }, [element, elementsMap]);

  const slots = useMemo(
    () => (master ? collectSlotHosts(master, childrenMap) : []),
    [childrenMap, master],
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.path === selectedSlotPath) ?? slots[0],
    [selectedSlotPath, slots],
  );

  const candidateOptions = useMemo(
    () => getFillCandidateOptions(selectedSlot, elementsMap),
    [elementsMap, selectedSlot],
  );

  useEffect(() => {
    if (selectedSlot && selectedSlot.path !== selectedSlotPath) {
      setSelectedSlotPath(selectedSlot.path);
    }
  }, [selectedSlot, selectedSlotPath]);

  useEffect(() => {
    if (
      selectedCandidateId &&
      candidateOptions.some((option) => option.value === selectedCandidateId)
    ) {
      return;
    }
    setSelectedCandidateId(candidateOptions[0]?.value ?? "");
  }, [candidateOptions, selectedCandidateId]);

  if (!element || !isCanonicalRefElement(element) || !selectedSlot) return null;

  const instance = element as SlotFillElement;
  const filledChildren = getSlotFillChildren(instance, selectedSlot.path);
  const filledLabel = getFilledLabel(filledChildren, elementsMap);

  const handleFillSlot = () => {
    const candidate = elementsMap.get(selectedCandidateId);
    if (!candidate || !selectedSlot) return;

    const descendants = instance.descendants ?? {};
    void updateElement(element.id, {
      descendants: {
        ...descendants,
        [selectedSlot.path]: {
          children: [
            {
              id: getFillNodeId(candidate),
              type: "ref",
              ref: candidate.id,
            },
          ],
        },
      },
    } as Partial<Element>);
  };

  const handleClearSlot = () => {
    const descendants = instance.descendants ?? {};
    const nextDescendants = { ...descendants };
    delete nextDescendants[selectedSlot.path];

    void updateElement(element.id, {
      descendants: nextDescendants,
    } as Partial<Element>);
  };

  return (
    <PropertySection title="Slot Fill" icon={Layers}>
      <div className="frame-slot-picker">
        <PropertySelect
          label="Target slot"
          value={selectedSlot.path}
          onChange={setSelectedSlotPath}
          options={slots.map((slot) => ({
            label: slot.label,
            value: slot.path,
          }))}
          icon={Layers}
          popoverWidthMode="width"
        />
      </div>

      {candidateOptions.length > 0 && (
        <div className="frame-slot-picker">
          <PropertySelect
            label="Component"
            value={selectedCandidateId}
            onChange={setSelectedCandidateId}
            options={candidateOptions}
            icon={Layers}
            popoverWidthMode="width"
          />
          <button
            aria-label="Fill slot"
            className="component-semantics-action frame-slot-action"
            disabled={!selectedCandidateId}
            onClick={handleFillSlot}
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            <span>Fill</span>
          </button>
        </div>
      )}

      <div className="frame-slot-row">
        <span className="frame-slot-name">Filled</span>
        <span className="frame-slot-value">{filledLabel}</span>
      </div>

      {filledChildren.length > 0 && (
        <button
          aria-label="Clear slot"
          className="component-semantics-action frame-slot-action"
          onClick={handleClearSlot}
          type="button"
        >
          <X aria-hidden="true" size={14} />
          <span>Clear</span>
        </button>
      )}
    </PropertySection>
  );
});
