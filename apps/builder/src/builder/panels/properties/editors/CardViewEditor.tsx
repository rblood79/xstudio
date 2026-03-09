import { memo, useMemo } from "react";
import { Layout, Grid, Hash, Columns } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySelect,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const CardViewEditor = memo(function CardViewEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ ...currentProps, [key]: value });
  };

  const updateNumberProp = (key: string, value: string) => {
    const num = value === "" ? undefined : Number(value);
    if (value === "" || (!isNaN(num!) && num! > 0)) {
      updateProp(key, num);
    }
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="cardview_1"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label="Layout"
          value={String(currentProps.layout || "grid")}
          onChange={(value) => updateProp("layout", value)}
          options={[
            { value: "grid", label: "Grid" },
            { value: "waterfall", label: "Waterfall" },
          ]}
          icon={Grid}
        />

        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "primary")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
            { value: "tertiary", label: "Tertiary" },
            { value: "quiet", label: "Quiet" },
          ]}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label="Density"
          value={String(currentProps.density || "regular")}
          onChange={(value) => updateProp("density", value)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "regular", label: "Regular" },
            { value: "spacious", label: "Spacious" },
          ]}
          icon={Columns}
        />

        <PropertyInput
          label="Columns"
          value={String(currentProps.columns ?? "")}
          onChange={(value) => updateNumberProp("columns", value)}
          icon={Hash}
          placeholder="Auto"
        />

        <PropertyInput
          label="Gap"
          value={String(currentProps.gap ?? "")}
          onChange={(value) => updateNumberProp("gap", value)}
          icon={Hash}
          placeholder="16"
        />
      </PropertySection>

      <PropertySection title="Selection">
        <PropertySelect
          label="Selection Mode"
          value={String(currentProps.selectionMode || "none")}
          onChange={(value) => updateProp("selectionMode", value)}
          options={[
            { value: "none", label: "None" },
            { value: "single", label: "Single" },
            { value: "multiple", label: "Multiple" },
          ]}
          icon={Layout}
        />

        <PropertySelect
          label="Selection Style"
          value={String(currentProps.selectionStyle || "checkbox")}
          onChange={(value) => updateProp("selectionStyle", value)}
          options={[
            { value: "checkbox", label: "Checkbox" },
            { value: "highlight", label: "Highlight" },
          ]}
          icon={Layout}
        />
      </PropertySection>
    </>
  );
});
