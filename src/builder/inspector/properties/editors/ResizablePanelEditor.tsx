import { Maximize2, Minimize2, Move } from 'lucide-react';
import { PropertyInput } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function ResizablePanelEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            {/* Default Size 설정 */}
            <PropertyInput
                label={PROPERTY_LABELS.DEFAULT_SIZE || 'Default Size (%)'}
                value={String(currentProps.defaultSize || '50')}
                onChange={(value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateProp('defaultSize', numValue);
                    }
                }}
                type="number"
                icon={Move}
            />

            {/* Min Size 설정 */}
            <PropertyInput
                label={PROPERTY_LABELS.MIN_SIZE || 'Min Size (%)'}
                value={String(currentProps.minSize || '10')}
                onChange={(value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateProp('minSize', numValue);
                    }
                }}
                type="number"
                icon={Minimize2}
            />

            {/* Max Size 설정 */}
            <PropertyInput
                label={PROPERTY_LABELS.MAX_SIZE || 'Max Size (%)'}
                value={String(currentProps.maxSize || '90')}
                onChange={(value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        updateProp('maxSize', numValue);
                    }
                }}
                type="number"
                icon={Maximize2}
            />

            <div className="resizable-panel-info">
                <p className="info-note">
                    💡 크기 값은 퍼센트(%)로 설정됩니다.
                </p>
                <p className="info-help">
                    • Default: 초기 크기<br />
                    • Min: 최소 크기 (드래그 제한)<br />
                    • Max: 최대 크기 (드래그 제한)
                </p>
            </div>
        </div>
    );
}
