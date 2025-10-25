import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
} from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { Tag, Type, Eye, EyeOff } from "lucide-react";
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

  if (!element || !element.id) {
    return (
      <div className="p-4 text-center text-gray-500">
        Field 요소를 선택하세요
      </div>
    );
  }

  const fieldProps = currentProps as FieldElementProps;

  const updateProps = (newProps: Partial<FieldElementProps>) => {
    console.log("🔧 FieldEditor updateProps:", {
      elementId,
      currentProps,
      newProps,
      merged: { ...currentProps, ...newProps }
    });
    onUpdate({
      ...currentProps,
      ...newProps,
    });
  };

  return (
    <div className="component-props">
      <fieldset className="properties-aria">
        {/* Data Key (읽기 전용) */}
        <PropertyInput
          label={PROPERTY_LABELS.DATA_KEY}
          value={fieldProps?.key || ""}
          onChange={() => {}} // 읽기 전용
          placeholder={PROPERTY_LABELS.DATA_KEY}
          icon={Tag}
          disabled
        />

        {/* Label */}
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={fieldProps?.label || ""}
          onChange={(value) => updateProps({ label: value })}
          placeholder={PROPERTY_LABELS.FIELD_LABEL_PLACEHOLDER}
          icon={Type}
        />

        {/* Field Type */}
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

      <fieldset className="properties-aria">
        {/* Visible Toggle */}
        <PropertySwitch
          label={PROPERTY_LABELS.VISIBLE}
          isSelected={fieldProps?.visible !== false}
          onChange={(isSelected) => updateProps({ visible: isSelected })}
          icon={fieldProps?.visible !== false ? Eye : EyeOff}
        />
      </fieldset>
    </div>
  );
}
