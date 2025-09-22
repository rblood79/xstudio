import { ColumnElementProps } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { Table, Pin } from 'lucide-react';

interface TableHeaderElementProps {
    variant?: 'default' | 'dark' | 'light' | 'bordered';
    sticky?: boolean;
}

// interface TableHeaderEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function TableHeaderEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                TableHeader 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<TableHeaderElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    // 현재 테이블 헤더의 컬럼들 찾기
    const columns = elements.filter(el =>
        el.parent_id === element.id && el.tag === 'Column'
    ).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Table Header Properties</legend>

                {/* Header Info */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total columns: {columns.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Configure table header appearance and behavior
                    </p>
                </div>

                {/* Header Variant */}
                <PropertySelect
                    label="헤더 스타일"
                    value={(currentProps as TableHeaderElementProps)?.variant || 'default'}
                    options={[
                        { value: 'default', label: '기본' },
                        { value: 'dark', label: '어두운 테마' },
                        { value: 'light', label: '밝은 테마' },
                        { value: 'bordered', label: '테두리' },
                    ]}
                    onChange={(key) => updateProps({ variant: key as 'default' | 'dark' | 'light' | 'bordered' })}
                    icon={Table}
                />

                {/* Sticky Header */}
                <PropertySelect
                    label="헤더 고정"
                    value={(currentProps as TableHeaderElementProps)?.sticky ? 'true' : 'false'}
                    options={[
                        { value: 'false', label: '일반' },
                        { value: 'true', label: '상단 고정' },
                    ]}
                    onChange={(key) => updateProps({ sticky: key === 'true' })}
                    icon={Pin}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Column Overview</legend>

                {/* 컬럼 목록 */}
                {columns.length > 0 && (
                    <div className='tabs-list'>
                        {columns.map((column, index) => (
                            <div key={column.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {index + 1}. {(column.props as ColumnElementProps)?.children as string || '제목 없음'}
                                    {(column.props as ColumnElementProps)?.isRowHeader && (
                                        <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                                            헤더
                                        </span>
                                    )}
                                </span>
                                <span className="text-gray-400 text-xs">
                                    ID: {column.id.slice(0, 8)}...
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {columns.length === 0 && (
                    <div className='tab-overview'>
                        <p className='tab-overview-help'>
                            컬럼이 없습니다. Table 편집기에서 컬럼을 추가하세요.
                        </p>
                    </div>
                )}
            </fieldset>
        </div>
    );
}
