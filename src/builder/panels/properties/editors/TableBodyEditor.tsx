import { useStore } from '../../../stores';
import { PropertySelect, PropertyCustomId, PropertySection } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { Table, Grid } from 'lucide-react';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';

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

    // Get customId from element in store
    const customId = element?.customId || '';

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
            <PropertySection title="{PROPERTY_LABELS.TABLE_BODY_PROPERTIES}">

                {/* Custom ID */}
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    placeholder="tablebody_1"
                />

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
                    label={PROPERTY_LABELS.BODY_STYLE}
                    value={(currentProps as TableBodyElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.BODY_STYLE_DEFAULT },
                        { value: 'striped', label: PROPERTY_LABELS.BODY_STYLE_STRIPED },
                        { value: 'bordered', label: 'Bordered' },
                        { value: 'hover', label: PROPERTY_LABELS.BODY_STYLE_HOVER },
                    ]}
                    onChange={(key) => updateProps({ variant: key as 'default' | 'striped' | 'bordered' | 'hover' })}
                    icon={Table}
                />

                {/* Row Selection */}
                <PropertySelect
                    label={PROPERTY_LABELS.ROW_SELECTION}
                    value={(currentProps as TableBodyElementProps)?.selectable ? 'true' : 'false'}
                    options={[
                        { value: 'false', label: 'Not Selectable' },
                        { value: 'true', label: 'Selectable' },
                    ]}
                    onChange={(key) => updateProps({ selectable: key === 'true' })}
                    icon={Grid}
                />
            </PropertySection>

            <PropertySection title="Row Overview">

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
                            No rows found. Add rows from the Table editor.
                        </p>
                    </div>
                )}
            </PropertySection>
        </div>
    );
}
