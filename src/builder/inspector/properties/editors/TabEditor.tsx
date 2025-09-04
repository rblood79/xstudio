import { AppWindow, Layout, Type } from 'lucide-react';
import { PropertyInput, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

// 상수 정의
const TAB_VARIANTS = [
    { id: 'default', label: 'Default' },
    { id: 'bordered', label: 'Bordered' },
    { id: 'underlined', label: 'Underlined' },
    { id: 'pill', label: 'Pill' }
];

const TAB_APPEARANCES = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'solid', label: 'Solid' },
    { id: 'bordered', label: 'Bordered' }
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
                <legend className='fieldset-legend'>Tab Properties</legend>

                <PropertyInput
                    label="Tab Title"
                    value={String(currentProps.title || '')}
                    onChange={(value) => updateProp('title', value)}
                    icon={Type}
                />

                <PropertySelect
                    label="Variant"
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={TAB_VARIANTS}
                    icon={Layout}
                />

                <PropertySelect
                    label="Appearance"
                    value={String(currentProps.appearance || 'light')}
                    onChange={(value) => updateProp('appearance', value)}
                    options={TAB_APPEARANCES}
                    icon={AppWindow}
                />

                <PropertyInput
                    label="Disabled"
                    value={String(currentProps.isDisabled || false)}
                    onChange={(value) => updateProp('isDisabled', value === 'true')}
                    icon={AppWindow}
                />
            </fieldset>
        </div>
    );
}
