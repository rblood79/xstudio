import { memo, useCallback, useMemo } from "react";
import { FileText, Search, SpellCheck2, Tag } from "lucide-react";
import { SearchFieldSpec } from "@xstudio/specs";
import { PropertyInput, PropertySection } from "../../../components";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";

export const SearchFieldHybridAfterSections = memo(
  function SearchFieldHybridAfterSections({
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

    const handleValueChange = useCallback(
      (value: string) => {
        onUpdate({ value });
      },
      [onUpdate],
    );

    const handleDescriptionChange = useCallback(
      (value: string) => {
        onUpdate({ description: value });
      },
      [onUpdate],
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
            value={String(currentProps.value || "")}
            onChange={handleValueChange}
            icon={Search}
          />

          <PropertyInput
            label={PROPERTY_LABELS.PLACEHOLDER}
            value={String(currentProps.placeholder || "")}
            onChange={handlePlaceholderChange}
            icon={SpellCheck2}
            placeholder="Search..."
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

    return <>{contentSection}</>;
  },
);

export const SearchFieldEditor = memo(function SearchFieldEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={SearchFieldSpec}
      renderAfterSections={(sectionProps) => (
        <SearchFieldHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
