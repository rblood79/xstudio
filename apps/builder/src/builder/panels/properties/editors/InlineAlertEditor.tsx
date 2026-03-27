import { memo, useCallback, useRef } from "react";
import { Type, FileText, Parentheses } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

// childrenMap에서 특정 tag의 자식 { id, children } 조회 (캐싱)
function useChildElement(parentId: string, tag: string) {
  const cachedRef = useRef<{ id: string; children: string } | null>(null);

  return useStore((s) => {
    const children = s.childrenMap.get(parentId) ?? [];
    for (const el of children) {
      const latest = s.elementsMap.get(el.id);
      if (latest?.tag === tag) {
        const text = String(
          (latest.props as Record<string, unknown>)?.children ?? "",
        );
        // 값이 같으면 이전 참조 반환 (무한 루프 방지)
        if (
          cachedRef.current &&
          cachedRef.current.id === latest.id &&
          cachedRef.current.children === text
        ) {
          return cachedRef.current;
        }
        cachedRef.current = { id: latest.id, children: text };
        return cachedRef.current;
      }
    }
    cachedRef.current = null;
    return null;
  });
}

export const InlineAlertEditor = memo(function InlineAlertEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useStore(
    (s) => s.elementsMap.get(elementId)?.customId || "",
  );

  const headingEl = useChildElement(elementId, "Heading");
  const descriptionEl = useChildElement(elementId, "Description");

  const updateChildProp = useCallback(
    (childId: string, key: string, value: unknown) => {
      useStore
        .getState()
        .batchUpdateElementProps([
          { elementId: childId, props: { [key]: value } },
        ]);
    },
    [],
  );

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ [key]: value });
  };

  const headingValue = headingEl
    ? headingEl.children
    : String(currentProps.heading || "");

  const descriptionValue = descriptionEl
    ? descriptionEl.children
    : String(currentProps.children || "");

  const onHeadingChange = (value: string) => {
    if (headingEl) {
      updateChildProp(headingEl.id, "children", value);
    } else {
      updateProp("heading", value);
    }
  };

  const onDescriptionChange = (value: string) => {
    if (descriptionEl) {
      updateChildProp(descriptionEl.id, "children", value);
    } else {
      updateProp("children", value);
    }
  };

  return (
    <>
      <PropertySection title="Content">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="inline_alert_1"
        />

        <PropertyInput
          label="Heading"
          value={headingValue}
          onChange={onHeadingChange}
          icon={Type}
          placeholder="Alert heading"
        />

        <PropertyInput
          label="Description"
          value={descriptionValue}
          onChange={onDescriptionChange}
          icon={FileText}
          placeholder="Alert message"
          multiline
        />
      </PropertySection>

      <PropertySection title="Appearance">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "neutral")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "informative", label: "Informative" },
            { value: "positive", label: "Positive" },
            { value: "notice", label: "Notice" },
            { value: "negative", label: "Negative" },
          ]}
          icon={Parentheses}
        />
      </PropertySection>
    </>
  );
});
