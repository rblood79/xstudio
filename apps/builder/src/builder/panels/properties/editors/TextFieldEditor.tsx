import { memo, useCallback } from "react";
import { TextFieldSpec } from "@xstudio/specs";
import { PropertySection } from "../../../components";
import { PropertySizeToggle } from "../../../components/property/PropertySizeToggle";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";

const LABEL_FONT_SIZE: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export const TextFieldHybridAfterSections = memo(
  function TextFieldHybridAfterSections({
    elementId,
    currentProps,
  }: PropertyEditorProps) {
    const { buildChildUpdates } = useSyncChildProp(elementId);

    const handleSizeChange = useCallback(
      (value: string) => {
        const updatedProps = { size: value };
        const childUpdates = buildChildUpdates([
          { childTag: "Input", propKey: "size", value },
        ]);
        const { childrenMap, elementsMap } = useStore.getState();
        const children = childrenMap.get(elementId);
        const labelChild = children?.find((child) => child.tag === "Label");

        if (labelChild) {
          // childrenMap의 labelChild.props는 stale할 수 있으므로 elementsMap에서 최신 props 조회
          const freshLabelChild = elementsMap.get(labelChild.id);
          const freshProps = freshLabelChild?.props ?? labelChild.props;
          const labelStyle =
            (freshProps?.style as Record<string, unknown>) || {};
          childUpdates.push({
            elementId: labelChild.id,
            props: {
              ...freshProps,
              size: value,
              style: {
                ...labelStyle,
                fontSize: LABEL_FONT_SIZE[value] ?? 14,
              },
            },
          });
        }

        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildChildUpdates, elementId],
    );

    return (
      <PropertySection title="Size">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={handleSizeChange}
          scale="3"
        />
      </PropertySection>
    );
  },
);

export const TextFieldEditor = memo(function TextFieldEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={TextFieldSpec}
      renderAfterSections={(sectionProps) => (
        <TextFieldHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
