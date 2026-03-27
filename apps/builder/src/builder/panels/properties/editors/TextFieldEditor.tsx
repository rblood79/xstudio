import { memo, useCallback, useMemo } from "react";
import { Binary, FileText, Layout, SpellCheck2, Tag } from "lucide-react";
import { TextFieldSpec } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySection,
  PropertySelect,
} from "../../../components";
import { PropertySizeToggle } from "../../../components/property/PropertySizeToggle";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { LABEL_POSITION_OPTIONS } from "./editorUtils";

const LABEL_FONT_SIZE: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export const TextFieldHybridAfterSections = memo(
  function TextFieldHybridAfterSections({
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
        onUpdate({ value });
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

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={handleSizeChange}
            scale="3"
          />

          <PropertySelect
            label={PROPERTY_LABELS.LABEL_POSITION}
            value={String(currentProps.labelPosition || "top")}
            options={LABEL_POSITION_OPTIONS}
            onChange={handleLabelPositionChange}
            icon={Layout}
          />
        </PropertySection>
      ),
      [
        currentProps.labelPosition,
        currentProps.size,
        handleLabelPositionChange,
        handleSizeChange,
      ],
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
            icon={Binary}
          />

          <PropertyInput
            label={PROPERTY_LABELS.PLACEHOLDER}
            value={String(currentProps.placeholder || "")}
            onChange={handlePlaceholderChange}
            icon={SpellCheck2}
            placeholder="Enter text..."
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
