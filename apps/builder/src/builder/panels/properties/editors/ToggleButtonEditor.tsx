import { memo, useMemo } from "react";
import {
  Tag,
  PointerOff,
  CheckSquare,
  PenOff,
  Layout,
  Focus,
  Hash,
  FileText,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const ToggleButtonEditor = memo(function ToggleButtonEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get element from store
  const element = useStore((state) => state.elementsMap.get(elementId));

  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    return element?.customId || "";
  }, [element?.customId]);

  // Check if this ToggleButton is a child of ToggleButtonGroup
  // ADR-040: elementsMap O(1) 조회
  const parentElement = useStore((state) =>
    element?.parent_id ? state.elementsMap.get(element.parent_id) : undefined,
  );
  const isChildOfToggleButtonGroup = parentElement?.tag === "ToggleButtonGroup";

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="togglebutton_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Tag}
        />
      </PropertySection>

      {/* Design Section - Only if NOT child of ToggleButtonGroup */}
      {!isChildOfToggleButtonGroup && (
        <PropertySection title="Design">
          <PropertySwitch
            label="Emphasized"
            isSelected={Boolean(currentProps.isEmphasized)}
            onChange={(checked) => updateProp("isEmphasized", checked)}
            icon={Layout}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.IS_QUIET}
            isSelected={Boolean(currentProps.isQuiet)}
            onChange={(checked) => updateProp("isQuiet", checked)}
            icon={Layout}
          />

          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={(value) => updateProp("size", value)}
            scale="5"
          />
        </PropertySection>
      )}

      {/* State Section */}
      <PropertySection title="State">
        <PropertySwitch
          label={PROPERTY_LABELS.SELECTED}
          isSelected={Boolean(currentProps.isSelected)}
          onChange={(checked) => updateProp("isSelected", checked)}
          icon={CheckSquare}
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={(checked) => updateProp("autoFocus", checked)}
          icon={Focus}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.READONLY}
          isSelected={Boolean(currentProps.isReadOnly)}
          onChange={(checked) => updateProp("isReadOnly", checked)}
          icon={PenOff}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={Tag}
          placeholder="toggle-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || "")}
          onChange={(value) => updateProp("value", value || undefined)}
          icon={Hash}
          placeholder="toggle-value"
        />

        <PropertyInput
          label={PROPERTY_LABELS.FORM}
          value={String(currentProps.form || "")}
          onChange={(value) => updateProp("form", value || undefined)}
          icon={FileText}
          placeholder="form-id"
        />
      </PropertySection>
    </>
  );
});
