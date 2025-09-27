
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { Grid, Settings, Database, Columns, Rows } from 'lucide-react';
import { DataGridElementProps } from '../../../../types/unified';
import { useState, useCallback } from 'react';

interface DataGridEditorProps {
    element: DataGridElementProps;
    onChange: (props: Partial<DataGridElementProps>) => void;
}

const selectionModeOptions = [
    { id: 'none', value: 'none', label: '선택 불가' },
    { id: 'single', value: 'single', label: '단일 선택' },
    { id: 'multiple', value: 'multiple', label: '다중 선택' }
];

const sizeOptions = [
    { id: 'sm', value: 'sm', label: '작은 크기' },
    { id: 'md', value: 'md', label: '보통 크기' },
    { id: 'lg', value: 'lg', label: '큰 크기' }
];

const variantOptions = [
    { id: 'default', value: 'default', label: '기본' },
    { id: 'striped', value: 'striped', label: '줄무늬' },
    { id: 'bordered', value: 'bordered', label: '테두리' }
];

// 기본 컬럼 정의
const defaultColumns = [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'name', label: '이름', width: 150 },
    { key: 'email', label: '이메일', width: 200 },
    { key: 'jobTitle', label: '직책', width: 150 },
    { key: 'phone', label: '전화번호', width: 150 },
    { key: 'address', label: '주소', width: 200 }
];

export function DataGridEditor({ element, onChange }: DataGridEditorProps) {
    const [showColumnManager, setShowColumnManager] = useState(false);

    // element가 없거나 columns가 없는 경우를 대비한 안전한 접근
    const currentColumns = element?.columns || defaultColumns;

    // 컬럼 추가
    const addColumn = useCallback(() => {
        const newColumn = {
            key: `column_${Date.now()}`,
            label: '새 컬럼',
            width: 150
        };
        onChange({ columns: [...currentColumns, newColumn] });
    }, [currentColumns, onChange]);

    // 컬럼 삭제
    const removeColumn = useCallback((index: number) => {
        const newColumns = currentColumns.filter((_, i) => i !== index);
        onChange({ columns: newColumns });
    }, [currentColumns, onChange]);

    // 컬럼 속성 변경
    const updateColumn = useCallback((index: number, field: string, value: string | number) => {
        const newColumns = [...currentColumns];
        newColumns[index] = { ...newColumns[index], [field]: value };
        onChange({ columns: newColumns });
    }, [currentColumns, onChange]);

    // element가 없는 경우 조기 반환
    if (!element) {
        return (
            <div className="component-props">
                <div className="text-center text-gray-500 p-4">
                    DataGrid 요소를 선택해주세요.
                </div>
            </div>
        );
    }

    return (
        <div className="component-props">
            {/* 기본 속성 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Grid className="legend-icon" />
                    DataGrid Properties
                </legend>

                <PropertySelect
                    icon={Grid}
                    label="선택 모드"
                    value={element?.selectionMode || 'none'}
                    options={selectionModeOptions}
                    onChange={(selectionMode) => onChange({ selectionMode: selectionMode as 'none' | 'single' | 'multiple' })}
                />

                <PropertySelect
                    icon={Settings}
                    label="크기"
                    value={element?.size || 'md'}
                    options={sizeOptions}
                    onChange={(size) => onChange({ size: size as 'sm' | 'md' | 'lg' })}
                />

                <PropertySelect
                    icon={Settings}
                    label="스타일 변형"
                    value={element?.variant || 'default'}
                    options={variantOptions}
                    onChange={(variant) => onChange({ variant: variant as 'default' | 'striped' | 'bordered' })}
                />

                <PropertyInput
                    icon={Database}
                    label="아이템 템플릿"
                    value={element?.itemTemplate || ''}
                    onChange={(itemTemplate) => onChange({ itemTemplate })}
                    placeholder="예: {{name}} - {{email}}"
                />

                <PropertyInput
                    icon={Rows}
                    label="최대 행 수"
                    type="number"
                    value={element?.maxRows || 100}
                    onChange={(maxRows) => onChange({ maxRows: Number(maxRows) })}
                    placeholder="가상화를 위한 최대 행 수"
                />

                <PropertyInput
                    icon={Rows}
                    label="행 높이"
                    type="number"
                    value={element?.rowHeight || 35}
                    onChange={(rowHeight) => onChange({ rowHeight: Number(rowHeight) })}
                    placeholder="행의 높이 (px)"
                />

                <PropertyInput
                    icon={Columns}
                    label="컬럼 너비"
                    type="number"
                    value={element?.columnWidth || 150}
                    onChange={(columnWidth) => onChange({ columnWidth: Number(columnWidth) })}
                    placeholder="기본 컬럼 너비 (px)"
                />

                <PropertyInput
                    icon={Grid}
                    label="그리드 높이"
                    type="number"
                    value={element?.height || 400}
                    onChange={(height) => onChange({ height: Number(height) })}
                    placeholder="DataGrid 전체 높이 (px)"
                />

                <PropertyCheckbox
                    icon={Database}
                    label="무한 스크롤"
                    isSelected={element?.enableInfiniteScroll !== false}
                    onChange={(enableInfiniteScroll) => onChange({ enableInfiniteScroll })}
                />
            </fieldset>

            {/* 컬럼 관리 */}
            <fieldset className="component-fieldset">
                <legend className="component-legend">
                    <Columns className="legend-icon" />
                    Column Management
                </legend>

                <div className="tab-overview">
                    <span>Total columns: {currentColumns.length}</span>
                    <span className="help-text">관리 중인 DataGrid 컬럼</span>
                </div>

                <div className="column-actions mb-4">
                    <button
                        type="button"
                        onClick={addColumn}
                        className="btn btn-sm btn-primary"
                    >
                        <Columns className="w-4 h-4 mr-1" />
                        Add Column
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowColumnManager(!showColumnManager)}
                        className="btn btn-sm btn-secondary ml-2"
                    >
                        <Settings className="w-4 h-4 mr-1" />
                        {showColumnManager ? 'Hide' : 'Show'} Manager
                    </button>
                </div>

                {showColumnManager && (
                    <div className="column-manager">
                        {currentColumns.map((column, index) => (
                            <div key={index} className="column-item border rounded p-3 mb-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">Column {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeColumn(index)}
                                        className="btn btn-sm btn-danger"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Key</label>
                                        <input
                                            type="text"
                                            value={column.key}
                                            onChange={(e) => updateColumn(index, 'key', e.target.value)}
                                            className="input input-sm w-full"
                                            placeholder="column_key"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Label</label>
                                        <input
                                            type="text"
                                            value={column.label}
                                            onChange={(e) => updateColumn(index, 'label', e.target.value)}
                                            className="input input-sm w-full"
                                            placeholder="Column Label"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Width</label>
                                        <input
                                            type="number"
                                            value={column.width || 150}
                                            onChange={(e) => updateColumn(index, 'width', Number(e.target.value))}
                                            className="input input-sm w-full"
                                            placeholder="150"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Min Width</label>
                                        <input
                                            type="number"
                                            value={(column as { minWidth?: number }).minWidth || 100}
                                            onChange={(e) => updateColumn(index, 'minWidth', Number(e.target.value))}
                                            className="input input-sm w-full"
                                            placeholder="100"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </fieldset>
        </div>
    );
}
