import { memo, useMemo } from "react";
import { Tag } from 'lucide-react';
import { PropertyInput, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { useStore } from '../../../stores';

export const NavEditor = memo(function NavEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="nav_1"
        />
      </PropertySection>

      {/* Accessibility */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label="aria-label"
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => onUpdate({ ...currentProps, "aria-label": value || undefined })}
          placeholder="Main navigation"
          icon={Tag}
        />
      </PropertySection>
    </>
  );
});
