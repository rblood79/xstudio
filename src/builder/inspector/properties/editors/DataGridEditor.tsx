
import { PropertyInput, PropertySelect } from '../components';
import { Table } from 'lucide-react'; // 아이콘 추가
import { DataGridElementProps } from '../../../../types/unified'; // DataGridElementProps 임포트

interface DataGridEditorProps {
    element: DataGridElementProps;
    onChange: (props: Partial<DataGridElementProps>) => void;
}

const selectionModeOptions = [
    { id: 'none', value: 'none', label: '선택 불가' },
    { id: 'single', value: 'single', label: '단일 선택' },
    { id: 'multiple', value: 'multiple', label: '다중 선택' }
];

export function DataGridEditor({ element, onChange }: DataGridEditorProps) {
    const currentSelectionMode = element.selectionMode || 'none';

    return (
        <div className="component-props">
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Table className="legend-icon" />
                    DataGrid Properties
                </legend>

                <PropertySelect
                    icon={Table}
                    label="선택 모드"
                    value={currentSelectionMode}
                    options={selectionModeOptions}
                    //itemKey="value"
                    onChange={(selectionMode) => onChange({ selectionMode: selectionMode as 'none' | 'single' | 'multiple' })}
                />

                <PropertyInput
                    icon={Table}
                    label="아이템 템플릿"
                    value={element.itemTemplate || ''}
                    onChange={(itemTemplate) => onChange({ itemTemplate: itemTemplate as string })}
                    placeholder="예: {{name}} - {{email}}"
                />

                <PropertyInput
                    icon={Table}
                    label="최대 행 수"
                    type="number"
                    value={element.maxRows || 100}
                    onChange={(maxRows) => onChange({ maxRows: Number(maxRows) as number })}
                    placeholder="가상화를 위한 최대 행 수"
                />
            </fieldset>

            {/* 컬럼 관리 UI 추가 예정 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Table className="legend-icon" />
                    Column Management
                </legend>
                <p className="text-gray-500 text-sm">컬럼 추가/삭제 기능은 추후 구현됩니다.</p>
            </fieldset>
        </div>
    );
}
