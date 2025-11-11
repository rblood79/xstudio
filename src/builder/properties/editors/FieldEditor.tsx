import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
} from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { Tag, Type, Eye, EyeOff, Hash } from "lucide-react";
import { PROPERTY_LABELS } from "../../../../utils/labels";

interface FieldElementProps {
  key?: string;
  label?: string;
  type?: "string" | "number" | "boolean" | "date" | "image" | "url" | "email";
  visible?: boolean;
  [key: string]: unknown;
}

export function FieldEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const elements = useStore((state) => state.elements);

  // elementId를 사용하여 현재 Element를 찾음
  const element = elements.find((el) => el.id === elementId);

  // Get customId from element in store
  const customId = element?.customId || '';

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

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  return (
    <div className="component-props">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        onChange={updateCustomId}
        placeholder="field_1"
      />

      {/* Content Section */}
      <fieldset className="properties-group">
        <legend>Content</legend>

        <PropertyInput
          label={PROPERTY_LABELS.DATA_KEY}
          value={fieldProps?.key || ""}
          onChange={() => {}} // 읽기 전용
          placeholder={PROPERTY_LABELS.DATA_KEY}
          icon={Tag}
          disabled
        />

        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={fieldProps?.label || ""}
          onChange={(value) => updateProps({ label: value || undefined })}
          placeholder={PROPERTY_LABELS.FIELD_LABEL_PLACEHOLDER}
          icon={Type}
        />
      </fieldset>

      {/* Behavior Section */}
      <fieldset className="properties-group">
        <legend>Behavior</legend>

        <PropertySwitch
          label={PROPERTY_LABELS.VISIBLE}
          isSelected={fieldProps?.visible !== false}
          onChange={(isSelected) => updateProps({ visible: isSelected })}
          icon={fieldProps?.visible !== false ? Eye : EyeOff}
        />
      </fieldset>

      {/* Design Section */}
      <fieldset className="properties-design">
        <legend>Design</legend>

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
      </fieldset>

      {/* Accessibility Section */}
      <fieldset className="properties-group">
        <legend>Accessibility</legend>

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps['aria-label'] || '')}
          onChange={(value) => updateProps({ 'aria-label': value || undefined })}
          icon={Type}
          placeholder="Field label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps['aria-labelledby'] || '')}
          onChange={(value) => updateProps({ 'aria-labelledby': value || undefined })}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps['aria-describedby'] || '')}
          onChange={(value) => updateProps({ 'aria-describedby': value || undefined })}
          icon={Hash}
          placeholder="description-element-id"
        />
      </fieldset>
    </div>
  );
}
