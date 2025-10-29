import { Layout } from 'lucide-react';
import { PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function PanelGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="panelgroup_1"
            />

            {/* Direction 설정 */}
            <PropertySelect
                label={PROPERTY_LABELS.DIRECTION || 'Direction'}
                value={String(currentProps.direction || 'horizontal')}
                onChange={(value) => updateProp('direction', value)}
                options={[
                    { value: 'horizontal', label: 'Horizontal (가로)' },
                    { value: 'vertical', label: 'Vertical (세로)' }
                ]}
                icon={Layout}
            />

            <div className="panel-group-info">
                <p className="info-note">
                    💡 PanelGroup은 크기 조정 가능한 패널들의 컨테이너입니다.
                </p>
                <p className="info-help">
                    자식으로 ResizablePanel과 PanelResizeHandle을 추가하세요.
                </p>
            </div>
        </div>
    );
}
