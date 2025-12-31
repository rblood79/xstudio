import { memo, useMemo } from "react";
import { Tag, PointerOff, CheckSquare, PenOff, Layout, Ruler, Focus, Hash, Type, FileText } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ToggleButtonEditor = memo(function ToggleButtonEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get element from store
    const element = useStore((state) => state.elementsMap.get(elementId));

    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
        return element?.customId || "";
    }, [element?.customId]);

    // Check if this ToggleButton is a child of ToggleButtonGroup
    const parentElement = useStore((state) =>
        state.elements.find((el) => el.id === element?.parent_id)
    );
    const isChildOfToggleButtonGroup = parentElement?.tag === 'ToggleButtonGroup';

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
                placeholder="togglebutton_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Tag}
                />
            </PropertySection>

            {/* Design Section - Only if NOT child of ToggleButtonGroup */}
            {!isChildOfToggleButtonGroup && (
                <PropertySection title="Design">

                    <PropertySelect
                        label={PROPERTY_LABELS.VARIANT}
                        value={String(currentProps.variant || 'default')}
                        onChange={(value) => updateProp('variant', value)}
                        options={[
                            { value: 'default', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_DEFAULT },
                            { value: 'primary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_PRIMARY },
                            { value: 'secondary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SECONDARY },
                            { value: 'surface', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SURFACE }
                        ]}
                        icon={Layout}
                    />

                    <PropertySelect
                        label={PROPERTY_LABELS.SIZE}
                        value={String(currentProps.size || 'md')}
                        onChange={(value) => updateProp('size', value)}
                        options={[
                            { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                            { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                            { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
                        ]}
                        icon={Ruler}
                    />
                </PropertySection>
            )}

            {/* State Section */}
            <PropertySection title="State">

                <PropertySwitch
                    label={PROPERTY_LABELS.SELECTED}
                    isSelected={Boolean(currentProps.isSelected)}
                    onChange={(checked) => updateProp('isSelected', checked)}
                    icon={CheckSquare}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />
            </PropertySection>

            {/* Form Integration Section */}
            <PropertySection title="Form Integration">

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={Tag}
                    placeholder="toggle-name"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value || undefined)}
                    icon={Hash}
                    placeholder="toggle-value"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.FORM}
                    value={String(currentProps.form || '')}
                    onChange={(value) => updateProp('form', value || undefined)}
                    icon={FileText}
                    placeholder="form-id"
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Toggle button label for screen readers"
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
});
