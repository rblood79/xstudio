import { memo, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { ListBoxSpec } from "@xstudio/specs";
import { PropertyInput, PropertySection } from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";

export const ListBoxHybridAfterSections = memo(
  function ListBoxHybridAfterSections({
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const filteringSection = useMemo(
      () => (
        <PropertySection title="Filtering" icon={Filter}>
          <PropertyInput
            label="필터 텍스트"
            value={String(currentProps.filterText || "")}
            onChange={(value) => onUpdate({ filterText: value || undefined })}
            icon={Search}
            placeholder="검색어 입력..."
          />

          <PropertyInput
            label="필터 대상 필드"
            value={
              Array.isArray(currentProps.filterFields)
                ? currentProps.filterFields.join(", ")
                : ""
            }
            onChange={(value) => {
              const fields = value
                .split(",")
                .map((field) => field.trim())
                .filter((field) => field.length > 0);
              onUpdate({
                filterFields: fields.length > 0 ? fields : undefined,
              });
            }}
            icon={Filter}
            placeholder="label, name, title"
          />
        </PropertySection>
      ),
      [currentProps.filterFields, currentProps.filterText, onUpdate],
    );

    return <>{filteringSection}</>;
  },
);

export const ListBoxEditor = memo(function ListBoxEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={ListBoxSpec}
      renderAfterSections={(sectionProps) => (
        <ListBoxHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
