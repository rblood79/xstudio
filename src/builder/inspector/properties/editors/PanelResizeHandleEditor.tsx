import { GripVertical } from 'lucide-react';
import { PropertyEditorProps } from '../types/editorTypes';

export function PanelResizeHandleEditor({ }: PropertyEditorProps) {
    return (
        <div className="component-props">
            <div className="panel-resize-handle-info">
                <div className="info-icon">
                    <GripVertical size={32} />
                </div>
                <p className="info-note">
                    💡 PanelResizeHandle은 패널 사이의 드래그 가능한 구분선입니다.
                </p>
                <p className="info-help">
                    • 두 ResizablePanel 사이에 배치하세요<br />
                    • 드래그하면 인접 패널의 크기가 조정됩니다<br />
                    • 키보드(방향키)로도 조절 가능합니다
                </p>
            </div>
        </div>
    );
}
