import { useStore } from '../../../stores';
import { PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { Table, Grid } from 'lucide-react';

interface TableBodyElementProps {
    variant?: 'default' | 'striped' | 'bordered' | 'hover';
    selectable?: boolean;
}

// interface TableBodyEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function TableBodyEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                TableBody 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<TableBodyElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    // 현재 테이블 바디의 행들 찾기
    const rows = elements.filter(el =>
        el.parent_id === element.id && el.tag === 'Row'
    ).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // 총 셀 개수 계산
    const totalCells = rows.reduce((total, row) => {
        const rowCells = elements.filter(el =>
            el.parent_id === row.id && el.tag === 'Cell'
        );
        return total + rowCells.length;
    }, 0);

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Table Body Properties</legend>

                {/* Body Info */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total rows: {rows.length || 0} | Total cells: {totalCells || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Configure table body appearance and row behavior
                    </p>
                </div>

                {/* Body Variant */}
                <PropertySelect
                    label="바디 스타일"
                    value={(currentProps as TableBodyElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'striped', label: '줄무늬' },
                        { value: 'bordered', label: '테두리' },
                        { value: 'hover', label: '호버 효과' },
                    ]}
                    onChange={(key) => updateProps({ variant: key as 'default' | 'striped' | 'bordered' | 'hover' })}
                    icon={Table}
                />

                {/* Row Selection */}
                <PropertySelect
                    label="행 선택"
                    value={(currentProps as TableBodyElementProps)?.selectable ? 'true' : 'false'}
                    options={[
                        { value: 'false', label: '선택 불가' },
                        { value: 'true', label: '선택 가능' },
                    ]}
                    onChange={(key) => updateProps({ selectable: key === 'true' })}
                    icon={Grid}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Row Overview</legend>

                {/* 행 목록 */}
                {rows.length > 0 && (
                    <div className='tabs-list'>
                        {rows.map((row, index) => {
                            const rowCells = elements.filter(el =>
                                el.parent_id === row.id && el.tag === 'Cell'
                            );

                            return (
                                <div key={row.id} className='tab-list-item'>
                                    <span className='tab-title'>
                                        Row {index + 1} ({rowCells.length} cells)
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                        ID: {row.id.slice(0, 8)}...
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {rows.length === 0 && (
                    <div className='tab-overview'>
                        <p className='tab-overview-help'>
                            행이 없습니다. Table 편집기에서 행을 추가하세요.
                        </p>
                    </div>
                )}
            </fieldset>
        </div>
    );
}
