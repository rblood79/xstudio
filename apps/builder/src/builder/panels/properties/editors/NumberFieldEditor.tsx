import { memo, useCallback, useMemo } from "react";
import { FileText, Hash, Layout, SpellCheck2, Tag } from "lucide-react";
import { NumberFieldSpec } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySection,
  PropertySelect,
} from "../../../components";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { LABEL_POSITION_OPTIONS } from "./editorUtils";

export const NumberFieldHybridAfterSections = memo(
  function NumberFieldHybridAfterSections({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const { buildChildUpdates } = useSyncChildProp(elementId);

    const handleLabelChange = useCallback(
      (value: string) => {
        const updatedProps = { label: value };
        const childUpdates = buildChildUpdates([
          { childTag: "Label", propKey: "children", value },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildChildUpdates],
    );

    const handleValueChange = useCallback(
      (value: string) => {
        onUpdate({ value: value ? Number(value) : undefined });
      },
      [onUpdate],
    );

    const handlePlaceholderChange = useCallback(
      (value: string) => {
        const updatedProps = { placeholder: value };
        const childUpdates = buildChildUpdates([
          { childTag: "Input", propKey: "placeholder", value },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildChildUpdates],
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        onUpdate({ description: value });
      },
      [onUpdate],
    );

    const handleLabelPositionChange = useCallback(
      (value: string) => {
        onUpdate({ labelPosition: value });
      },
      [onUpdate],
    );

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySelect
            label={PROPERTY_LABELS.LABEL_POSITION}
            value={String(currentProps.labelPosition || "top")}
            options={LABEL_POSITION_OPTIONS}
            onChange={handleLabelPositionChange}
            icon={Layout}
          />
        </PropertySection>
      ),
      [currentProps.labelPosition, handleLabelPositionChange],
    );

    const contentSection = useMemo(
      () => (
        <PropertySection title="Content">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(currentProps.label || "")}
            onChange={handleLabelChange}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.value ?? "")}
            onChange={handleValueChange}
            icon={Hash}
          />

          <PropertyInput
            label={PROPERTY_LABELS.PLACEHOLDER}
            value={String(currentProps.placeholder || "")}
            onChange={handlePlaceholderChange}
            icon={SpellCheck2}
            placeholder="Enter number..."
          />

          <PropertyInput
            label={PROPERTY_LABELS.DESCRIPTION}
            value={String(currentProps.description || "")}
            onChange={handleDescriptionChange}
            icon={FileText}
          />
        </PropertySection>
      ),
      [
        currentProps.description,
        currentProps.label,
        currentProps.placeholder,
        currentProps.value,
        handleDescriptionChange,
        handleLabelChange,
        handlePlaceholderChange,
        handleValueChange,
      ],
    );

    return (
      <>
        {designSection}
        {contentSection}
      </>
    );
  },
);

export const NumberFieldEditor = memo(function NumberFieldEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={NumberFieldSpec}
      renderAfterSections={(sectionProps) => (
        <NumberFieldHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
