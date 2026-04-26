/**
 * Element Slot Selector
 *
 * Page Element가 어떤 Slot에 들어갈지 선택하는 UI.
 * Layout이 적용된 Page의 root Element Inspector에 표시.
 */

import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import { PropertySelect, PropertySection } from "../../../components";
import { useStore } from "../../../stores";
import { selectCanonicalDocument } from "../../../stores/elements";
import { useLayoutsStore } from "../../../stores/layouts";
import { belongsToLegacyLayout } from "../../../../adapters/canonical";
import type { SlotInfo } from "../../../../types/builder/layout.types";

interface ElementSlotSelectorProps {
  elementId: string;
  currentSlotName: string | null | undefined;
  onSlotChange: (slotName: string) => void;
}

export const ElementSlotSelector = memo(function ElementSlotSelector({
  elementId,
  currentSlotName,
  onSlotChange,
}: ElementSlotSelectorProps) {
  // ADR-040: elementsMap O(1) 조회
  const element = useStore((state) => state.elementsMap.get(elementId));
  const elementsMap = useStore((state) => state.elementsMap);
  const pages = useStore((state) => state.pages);
  // ADR-903 P3-E E-6 후속: layout slot 검색에 canonical document 필요
  // (write-through 후 element.layout_id null → frame descendants 매칭으로 변경)
  const canonicalDoc = useStore((state) =>
    selectCanonicalDocument(
      state,
      state.pages,
      useLayoutsStore.getState().layouts,
    ),
  );

  // Element의 Page → Layout → Slots 찾기
  const slots = useMemo((): SlotInfo[] => {
    if (!element?.page_id) return [];

    const page = pages.find((p) => p.id === element.page_id);
    if (!page?.layout_id) return [];

    // Layout의 Slot elements 찾기 (canonical reusable frame descendants + tag === "Slot")
    const slotElements: (typeof element)[] = [];
    elementsMap.forEach((el) => {
      if (
        el.tag === "Slot" &&
        belongsToLegacyLayout(el, page.layout_id, canonicalDoc)
      ) {
        slotElements.push(el);
      }
    });

    return slotElements.map((el) => {
      const slotName = (el.props as { name?: string })?.name;
      return {
        // 이름 없는 Slot은 elementId를 접미사로 사용하여 고유성 보장
        name: slotName || `slot_${el.id.slice(0, 8)}`,
        displayName: slotName || "unnamed",
        required: (el.props as { required?: boolean })?.required || false,
        description: (el.props as { description?: string })?.description,
        elementId: el.id,
      };
    });
  }, [element, elementsMap, pages, canonicalDoc]);

  // ⭐ React Hook 규칙: useMemo는 조기 리턴 전에 호출해야 함
  // Root element만 Slot 선택 가능
  // (parent_id가 null이거나 parent가 Page element가 아닌 경우)
  const isRootElement = useMemo(() => {
    if (!element?.parent_id) return true;
    // parent가 Page element인지 확인 (elementsMap O(1))
    const parent = elementsMap.get(element.parent_id);
    const parentIsPageElement = parent
      ? parent.page_id === element.page_id
      : false;
    return !parentIsPageElement;
  }, [element, elementsMap]);

  // Layout이 없거나 Slot이 없으면 표시 안함
  if (slots.length === 0) return null;

  if (!isRootElement) return null;

  // Default slot (required가 있으면 그것, 없으면 첫 번째)
  const defaultSlot = slots.find((s) => s.required) || slots[0];

  // Slot options - name은 고유 식별자, displayName은 UI 표시용
  const slotOptions = slots.map((slot) => ({
    value: slot.name,
    label: `${slot.displayName}${slot.required ? " *" : ""}`,
  }));

  return (
    <PropertySection title="Slot Assignment" icon={Layers}>
      <PropertySelect
        label="Target Slot"
        value={currentSlotName || defaultSlot?.name || "content"}
        onChange={onSlotChange}
        options={slotOptions}
        icon={Layers}
        description="Choose which slot this element fills in the layout"
      />

      {/* Slot description if available */}
      {currentSlotName && (
        <div className="slot-selector-info">
          {slots.find((s) => s.name === currentSlotName)?.description && (
            <p className="slot-selector-description">
              {slots.find((s) => s.name === currentSlotName)?.description}
            </p>
          )}
        </div>
      )}
    </PropertySection>
  );
});

export default ElementSlotSelector;
