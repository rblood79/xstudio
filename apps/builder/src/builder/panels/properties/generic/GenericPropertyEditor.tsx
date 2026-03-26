import { memo, useMemo } from "react";
import type { ComponentSpec } from "@xstudio/specs";
import { PropertyCustomId, PropertySection } from "../../../components";
import { useStore } from "../../../stores";
import type { ComponentEditorProps } from "../../../inspector/types";
import { evaluateVisibility } from "./evaluateVisibility";
import { SpecField } from "./SpecField";

interface GenericPropertyEditorProps extends ComponentEditorProps {
  spec: ComponentSpec<Record<string, unknown>>;
  renderAfterSections?: (props: {
    elementId: string;
    currentProps: Record<string, unknown>;
    onUpdate: (updatedProps: Record<string, unknown>) => void;
  }) => React.ReactNode;
}

export const GenericPropertyEditor = memo(function GenericPropertyEditor({
  elementId,
  currentProps,
  onUpdate,
  spec,
  renderAfterSections,
}: GenericPropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateCustomId = (newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  const visibleSections = (spec.properties?.sections ?? []).filter((section) =>
    evaluateVisibility(section.visibleWhen, currentProps),
  );

  return (
    <>
      {spec.properties?.includeBasicSection !== false && (
        <PropertySection title="Basic">
          <PropertyCustomId
            label="ID"
            value={customId}
            elementId={elementId}
            onChange={updateCustomId}
            placeholder={`${spec.name.toLowerCase()}_1`}
          />
        </PropertySection>
      )}

      {visibleSections.map((section) => (
        <PropertySection key={section.title} title={section.title}>
          {section.fields
            .filter((field) =>
              evaluateVisibility(field.visibleWhen, currentProps),
            )
            .map((field, index) => (
              <SpecField
                key={`${section.title}:${"key" in field ? (field.key ?? field.type) : field.type}:${index}`}
                field={field}
                spec={spec}
                currentProps={currentProps}
                onUpdate={onUpdate}
              />
            ))}
        </PropertySection>
      ))}

      {typeof renderAfterSections === "function" &&
        renderAfterSections({
          elementId,
          currentProps,
          onUpdate,
        })}
    </>
  );
});
