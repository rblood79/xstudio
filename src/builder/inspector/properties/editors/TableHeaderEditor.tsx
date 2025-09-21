import { Element, TableHeaderElementProps, ColumnElementProps } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertySelect } from '../components';
import { Label } from 'react-aria-components';
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import

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
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">테이블 헤더 속성</h3>

            {/* Header Info */}
            <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                    <div>컬럼 개수: {columns.length}개</div>
                    <div>태그: &lt;thead&gt;</div>
                </div>
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
            />

            {/* 컬럼 목록 */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">컬럼 목록</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {columns.map((column, index) => (
                        <div key={column.id} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                            <span>
                                {index + 1}. {(column.props as ColumnElementProps)?.children as string || '제목 없음'}
                                {(column.props as ColumnElementProps)?.isRowHeader && (
                                    <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                                        헤더
                                    </span>
                                )}
                            </span>
                            <span className="text-gray-400 text-xs">
                                {column.id.slice(0, 8)}...
                            </span>
                        </div>
                    ))}
                    {columns.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                            컬럼이 없습니다
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
