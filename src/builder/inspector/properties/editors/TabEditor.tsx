import { AppWindow, Type, Menu } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

// 상수 정의
const TAB_VARIANTS = [
    { id: 'default', value: 'default', label: PROPERTY_LABELS.TAB_VARIANT_DEFAULT },
    { id: 'bordered', value: 'bordered', label: PROPERTY_LABELS.TAB_VARIANT_BORDERED },
    { id: 'underlined', value: 'underlined', label: PROPERTY_LABELS.TAB_VARIANT_UNDERLINED },
    { id: 'pill', value: 'pill', label: PROPERTY_LABELS.TAB_VARIANT_PILL }
];

const TAB_APPEARANCES = [
    { id: 'light', value: 'light', label: PROPERTY_LABELS.TAB_APPEARANCE_LIGHT },
    { id: 'dark', value: 'dark', label: PROPERTY_LABELS.TAB_APPEARANCE_DARK },
    { id: 'solid', value: 'solid', label: PROPERTY_LABELS.TAB_APPEARANCE_SOLID },
    { id: 'bordered', value: 'bordered', label: PROPERTY_LABELS.TAB_APPEARANCE_BORDERED }
];

export function TabEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
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
