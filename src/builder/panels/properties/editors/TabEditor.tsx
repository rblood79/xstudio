import { memo, useCallback, useMemo } from "react";
import { AppWindow, Type, Menu, PointerOff, Hash } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

// 상수 정의
const TAB_VARIANTS = [
    { value: 'default', label: PROPERTY_LABELS.TAB_VARIANT_DEFAULT },
    { value: 'bordered', label: PROPERTY_LABELS.TAB_VARIANT_BORDERED },
    { value: 'underlined', label: PROPERTY_LABELS.TAB_VARIANT_UNDERLINED },
    { value: 'pill', label: PROPERTY_LABELS.TAB_VARIANT_PILL }
];

const TAB_APPEARANCES = [
    { value: 'light', label: PROPERTY_LABELS.TAB_APPEARANCE_LIGHT },
    { value: 'dark', label: PROPERTY_LABELS.TAB_APPEARANCE_DARK },
    { value: 'solid', label: PROPERTY_LABELS.TAB_APPEARANCE_SOLID },
    { value: 'bordered', label: PROPERTY_LABELS.TAB_APPEARANCE_BORDERED }
];

export const TabEditor = memo(function TabEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="tab_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.TAB_TITLE}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value || undefined)}
                    icon={Type}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={TAB_VARIANTS}
                    icon={Menu}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.APPEARANCE}
                    value={String(currentProps.appearance || 'light')}
                    onChange={(value) => updateProp('appearance', value)}
                    options={TAB_APPEARANCES}
                    icon={AppWindow}
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Tab label for screen readers"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </PropertySection>
        </>
    );
}
