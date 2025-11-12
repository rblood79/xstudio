import { Settings, Type, Grid, Pin } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { ColumnGroupElementProps } from '../../../../types/builder/unified.types';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function ColumnGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    const updateGroupProps = (newProps: Partial<ColumnGroupElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
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
                placeholder="columngroup_1"
            />

            {/* 첫 번째 그룹: 기본 속성 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Grid className="legend-icon" />
                    {PROPERTY_LABELS.COLUMN_GROUP_PROPERTIES}
                </legend>

                <PropertyInput
                    icon={Type}
                    label={PROPERTY_LABELS.GROUP_LABEL}
                    value={(currentProps as ColumnGroupElementProps)?.label || ''}
                    onChange={(label) => updateGroupProps({ label })}
                />

                <PropertyInput
                    icon={Grid}
                    label={PROPERTY_LABELS.COLUMN_SPAN}
                    value={(currentProps as ColumnGroupElementProps)?.span || 2}
                    onChange={(span) => updateGroupProps({ span: parseInt(span) || 2 })}
                    type="number"
                />
            </fieldset>

            {/* 두 번째 그룹: 스타일 및 정렬 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Settings className="legend-icon" />
                    {PROPERTY_LABELS.STYLE_AND_ALIGNMENT}
                </legend>

                <PropertySelect
                    icon={Pin}
                    label={PROPERTY_LABELS.ALIGNMENT}
                    value={(currentProps as ColumnGroupElementProps)?.align || 'center'}
                    options={[
                        { value: 'left', label: PROPERTY_LABELS.ALIGN_LEFT },
                        { value: 'center', label: PROPERTY_LABELS.ALIGN_CENTER },
                        { value: 'right', label: PROPERTY_LABELS.ALIGN_RIGHT },
                    ]}
                    onChange={(align) => updateGroupProps({ align: align as 'left' | 'center' | 'right' })}
                />

                <PropertySelect
                    icon={Settings}
                    label={PROPERTY_LABELS.STYLE_VARIANT}
                    value={(currentProps as ColumnGroupElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.TAB_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.VARIANT_SECONDARY },
                    ]}
                    onChange={(variant) => updateGroupProps({ variant: variant as 'default' | 'primary' | 'secondary' })}
                />
            </fieldset>

            {/* 세 번째 그룹: 고급 설정 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Pin className="legend-icon" />
                    {PROPERTY_LABELS.ADVANCED_SETTINGS}
                </legend>

                <PropertySwitch
                    icon={Pin}
                    label={PROPERTY_LABELS.STICKY_HEADER}
                    isSelected={(currentProps as ColumnGroupElementProps)?.sticky || false}
                    onChange={(sticky) => updateGroupProps({ sticky })}
                />

                <div className="tab-overview">
                    <span className="help-text">
                        💡 Column Group visually groups related columns for clearer table structure.
                    </span>
                </div>
            </fieldset>
        </div>
    );
}
