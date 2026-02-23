import { memo } from "react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { Tag, Type, Eye, EyeOff, Hash, Tags } from "lucide-react";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";

interface FieldElementProps {
  key?: string;
  label?: string;
  type?: "string" | "number" | "boolean" | "date" | "image" | "url" | "email";
  visible?: boolean;
  showLabel?: boolean;
  [key: string]: unknown;
}

export const FieldEditor = memo(function FieldEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const elements = useStore((state) => state.elements);

  // elementId를 사용하여 현재 Element를 찾음
  const element = elements.find((el) => el.id === elementId);

  // Get customId from element in store
  const customId = element?.customId || "";

  if (!element || !element.id) {
    return (
      <div className="p-4 text-center text-gray-500">
        Field 요소를 선택하세요
      </div>
    );
  }

  const fieldProps = currentProps as FieldElementProps;

  const updateProps = (newProps: Partial<FieldElementProps>) => {
    const merged = { ...currentProps, ...newProps };
    onUpdate(merged);
  };

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="field_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.DATA_KEY}
          value={fieldProps?.key || ""}
          onChange={(value) => updateProps({ key: value || undefined })}
          placeholder="id, name, email..."
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={fieldProps?.label || ""}
          onChange={(value) => updateProps({ label: value || undefined })}
          placeholder={PROPERTY_LABELS.FIELD_LABEL_PLACEHOLDER}
          icon={Type}
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.VISIBLE}
          isSelected={fieldProps?.visible !== false}
          onChange={(isSelected) => updateProps({ visible: isSelected })}
          icon={fieldProps?.visible !== false ? Eye : EyeOff}
        />

        <PropertySwitch
          label="Show Label"
          isSelected={fieldProps?.showLabel !== false}
          onChange={(isSelected) => updateProps({ showLabel: isSelected })}
          icon={Tags}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.TYPE}
          value={fieldProps?.type || "string"}
          options={[
            { value: "string", label: PROPERTY_LABELS.STRING },
            { value: "number", label: PROPERTY_LABELS.NUMBER },
            { value: "email", label: PROPERTY_LABELS.EMAIL },
            { value: "url", label: PROPERTY_LABELS.URL },
            { value: "date", label: PROPERTY_LABELS.DATE },
            { value: "boolean", label: PROPERTY_LABELS.BOOLEAN },
            { value: "image", label: PROPERTY_LABELS.IMAGE },
          ]}
          onChange={(key) =>
            updateProps({ type: key as FieldElementProps["type"] })
          }
          icon={Type}
        />
      </PropertySection>
    </>
  );
});
