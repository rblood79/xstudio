import { memo, useMemo } from "react";
import { Layout, ToggleLeft, Columns } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const TableViewEditor = memo(function TableViewEditor({
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

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="tableview_1"
        />
      </PropertySection>

      <PropertySection title="Design">
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

        <PropertySelect
          label="Overflow Mode"
          value={String(currentProps.overflowMode || "truncate")}
          onChange={(value) => updateProp("overflowMode", value)}
          options={[
            { value: "truncate", label: "Truncate" },
            { value: "wrap", label: "Wrap" },
          ]}
          icon={Layout}
        />

        <PropertySwitch
          label="Quiet"
          isSelected={Boolean(currentProps.isQuiet)}
          onChange={(checked) => updateProp("isQuiet", checked)}
          icon={ToggleLeft}
        />

        <PropertySwitch
          label="Striped"
          isSelected={Boolean(currentProps.isStriped)}
          onChange={(checked) => updateProp("isStriped", checked)}
          icon={ToggleLeft}
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
      </PropertySection>

      <PropertySection title="Features">
        <PropertySwitch
          label="Allow Sorting"
          isSelected={Boolean(currentProps.allowsSorting)}
          onChange={(checked) => updateProp("allowsSorting", checked)}
          icon={ToggleLeft}
        />

        <PropertySwitch
          label="Allow Column Resize"
          isSelected={Boolean(currentProps.allowsResizingColumns)}
          onChange={(checked) => updateProp("allowsResizingColumns", checked)}
          icon={ToggleLeft}
        />
      </PropertySection>
    </>
  );
});
