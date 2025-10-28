import { Layout } from 'lucide-react';
import { PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function PanelGroupEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
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
