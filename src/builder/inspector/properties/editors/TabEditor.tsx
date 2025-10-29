import { AppWindow, Type, Menu } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
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

export function TabEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

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
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="tab_1"
            />

            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.TAB_TITLE}
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={Type}
                />

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

                <PropertyInput
                    label={PROPERTY_LABELS.DISABLED}
                    value={String(currentProps.isDisabled || false)}
                    onChange={(value) => updateProp('isDisabled', value === 'true')}
                    icon={AppWindow}
                />
            </fieldset>
        </div>
    );
}
