
import { PropertyInput, PropertySelect, PropertyCustomId } from '../../components';
import type { CellElementProps } from '../../../../types/core/store.types';
import { PropertyEditorProps } from '../types/editorTypes';
import { useStore } from '../../../stores';
import { Type, AlignLeft, Palette, Grid } from 'lucide-react';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';

// interface CellEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function CellEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);
    const customId = element?.customId || '';

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Cell 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<CellElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="cell_1"
            />

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.CELL_CONTENT}</legend>

                {/* Cell Content */}
                <PropertyInput
                    label={PROPERTY_LABELS.CHILDREN}
                    value={(currentProps as CellElementProps)?.children as string || ''}
                    onChange={(value) => updateProps({ children: value })}
                    placeholder="Enter cell content"
                    icon={Type}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.TEXT_ALIGNMENT}</legend>

                {/* Text Alignment */}
                <PropertySelect
                    label={PROPERTY_LABELS.TEXT_ALIGNMENT}
                    value={(currentProps as CellElementProps)?.textAlign || 'left'}
                    options={[
                        { value: 'left', label: PROPERTY_LABELS.ALIGN_LEFT },
                        { value: 'center', label: PROPERTY_LABELS.ALIGN_CENTER },
                        { value: 'right', label: PROPERTY_LABELS.ALIGN_RIGHT },
                    ]}
                    onChange={(key) => updateProps({ textAlign: key as 'left' | 'center' | 'right' })}
                    icon={AlignLeft}
                />

                {/* Vertical Alignment */}
                <PropertySelect
                    label={PROPERTY_LABELS.VERTICAL_ALIGNMENT}
                    value={(currentProps as CellElementProps)?.verticalAlign || 'middle'}
                    options={[
                        { value: 'top', label: PROPERTY_LABELS.ALIGN_TOP },
                        { value: 'middle', label: PROPERTY_LABELS.ALIGN_MIDDLE },
                        { value: 'bottom', label: PROPERTY_LABELS.ALIGN_BOTTOM },
                    ]}
                    onChange={(key) => updateProps({ verticalAlign: key as 'top' | 'middle' | 'bottom' })}
                    icon={Grid}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.STYLING}</legend>

                {/* Background Color */}
                <PropertyInput
                    label={PROPERTY_LABELS.BACKGROUND_COLOR}
                    type="color"
                    value={(currentProps as CellElementProps)?.backgroundColor || '#ffffff'}
                    onChange={(value) => updateProps({ backgroundColor: value })}
                    icon={Palette}
                />

                {/* Text Color */}
                <PropertyInput
                    label={PROPERTY_LABELS.TEXT_COLOR}
                    type="color"
                    value={(currentProps as CellElementProps)?.color || '#000000'}
                    onChange={(value) => updateProps({ color: value })}
                    icon={Palette}
                />
            </fieldset>
        </div>
    );
}
