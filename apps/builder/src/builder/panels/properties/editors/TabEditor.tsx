import { memo, useMemo } from "react";
import { AppWindow, Type, Menu, PointerOff, Hash } from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

// 상수 정의
const TAB_VARIANTS = [
  { value: "default", label: PROPERTY_LABELS.TAB_VARIANT_DEFAULT },
  { value: "bordered", label: PROPERTY_LABELS.TAB_VARIANT_BORDERED },
  { value: "underlined", label: PROPERTY_LABELS.TAB_VARIANT_UNDERLINED },
  { value: "pill", label: PROPERTY_LABELS.TAB_VARIANT_PILL },
];

const TAB_APPEARANCES = [
  { value: "light", label: PROPERTY_LABELS.TAB_APPEARANCE_LIGHT },
  { value: "dark", label: PROPERTY_LABELS.TAB_APPEARANCE_DARK },
  { value: "solid", label: PROPERTY_LABELS.TAB_APPEARANCE_SOLID },
  { value: "bordered", label: PROPERTY_LABELS.TAB_APPEARANCE_BORDERED },
];

export const TabEditor = memo(function TabEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="tab_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TAB_TITLE}
          value={String(currentProps.title || "")}
          onChange={(value) => updateProp("title", value || undefined)}
          icon={Type}
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "default")}
          onChange={(value) => updateProp("variant", value)}
          options={TAB_VARIANTS}
          icon={Menu}
        />

        <PropertySelect
          label={PROPERTY_LABELS.APPEARANCE}
          value={String(currentProps.appearance || "light")}
          onChange={(value) => updateProp("appearance", value)}
          options={TAB_APPEARANCES}
          icon={AppWindow}
        />
      </PropertySection>
    </>
  );
});
