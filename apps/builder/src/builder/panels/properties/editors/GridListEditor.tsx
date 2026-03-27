import { memo, useMemo } from "react";
import { FileText, Search } from "lucide-react";
import { GridListSpec } from "@xstudio/specs";
import { PropertyInput, PropertySection } from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";

export const GridListHybridAfterSections = memo(
  function GridListHybridAfterSections({
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const filteringSection = useMemo(
      () => (
        <PropertySection title="Filtering">
          <PropertyInput
            label="Filter Text"
            value={String(currentProps.filterText || "")}
            onChange={(value) => onUpdate({ filterText: value || undefined })}
            placeholder="Search..."
            icon={Search}
          />

          <PropertyInput
            label="Filter Fields"
            value={String(
              ((currentProps.filterFields as string[]) || []).join(", "),
            )}
            onChange={(value) => {
              const fields = value
                .split(",")
                .map((field) => field.trim())
                .filter(Boolean);
              onUpdate({
                filterFields: fields.length > 0 ? fields : undefined,
              });
            }}
            placeholder="label, name, title"
            icon={FileText}
          />
          <p className="property-help">쉼표로 구분하여 검색할 필드 지정</p>
        </PropertySection>
      ),
      [currentProps.filterFields, currentProps.filterText, onUpdate],
    );

    return <>{filteringSection}</>;
  },
);

export const GridListEditor = memo(function GridListEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={GridListSpec}
      renderAfterSections={(sectionProps) => (
        <GridListHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
