import { memo, useMemo } from "react";
import { Type, Layout, ToggleLeft, X, Hash } from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const PanelEditor = memo(function PanelEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  // Panel 컴포넌트가 Tabs의 자식인 경우 (tabIndex가 있는 경우) 특별한 처리
  const isTabPanel = currentProps.tabIndex !== undefined;

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="panel_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TITLE}
          value={String(currentProps.title || "")}
          onChange={(value) => updateProp("title", value)}
          icon={Type}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.STYLE}
          value={String(currentProps.variant || "card")}
          onChange={(value) =>
            updateProp(
              "variant",
              value as "tab" | "card" | "bordered" | "shadow"
            )
          }
          options={[
            { value: "tab", label: PROPERTY_LABELS.PANEL_VARIANT_TAB },
            { value: "card", label: PROPERTY_LABELS.PANEL_VARIANT_CARD },
            {
              value: "bordered",
              label: PROPERTY_LABELS.PANEL_VARIANT_BORDERED,
            },
            { value: "shadow", label: PROPERTY_LABELS.PANEL_VARIANT_SHADOW },
          ]}
          icon={Layout}
        />
      </PropertySection>

      {/* State Section (Tab Panel이 아닌 경우만) */}
      {!isTabPanel && (
        <PropertySection title="State">
          <PropertySwitch
            label={PROPERTY_LABELS.IS_OPEN}
            isSelected={Boolean(currentProps.isOpen)}
            onChange={(checked) => updateProp("isOpen", checked)}
            icon={ToggleLeft}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.IS_DISMISSABLE}
            isSelected={Boolean(currentProps.isDismissable)}
            onChange={(checked) => updateProp("isDismissable", checked)}
            icon={X}
          />
        </PropertySection>
      )}

      {/* Tab 패널인 경우 tabIndex 정보 표시 */}
      {isTabPanel && (
        <div className="tab-panel-info">
          <p className="tab-panel-note">
            This panel is part of a tab component. (Index:{" "}
            {String(currentProps.tabIndex)})
          </p>
          <p className="tab-panel-help">
            💡 You can edit tab properties from the tab component.
          </p>
        </div>
      )}
    </>
  );
});
