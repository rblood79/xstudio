import { Table, Settings, CheckSquare, Square } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

// 상수 정의
const SELECTION_MODES = [
    { id: 'none', label: 'None' },
    { id: 'single', label: 'Single' },
    { id: 'multiple', label: 'Multiple' }
] as const;

const SELECTION_BEHAVIORS = [
    { id: 'toggle', label: 'Toggle' },
    { id: 'replace', label: 'Replace' }
] as const;

export function TableEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                <legend className='fieldset-legend'>Table Properties</legend>

                <PropertySelect
                    label="Selection Mode"
                    value={String(currentProps.selectionMode || 'none')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={SELECTION_MODES}
                    icon={CheckSquare}
                />

                <PropertySelect
                    label="Selection Behavior"
                    value={String(currentProps.selectionBehavior || 'toggle')}
                    onChange={(value) => updateProp('selectionBehavior', value)}
                    options={SELECTION_BEHAVIORS}
                    icon={Settings}
                />

                <PropertyCheckbox
                    label="Allow Dragging"
                    checked={Boolean(currentProps.allowsDragging)}
                    onChange={(checked) => updateProp('allowsDragging', checked)}
                    icon={Square}
                />
            </fieldset>
        </div>
    );
}
