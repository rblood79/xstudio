import { Element, TableBodyElementProps, CellElementProps, RowElementProps } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertySelect } from '../components';
import { Label } from 'react-aria-components';
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import

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
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">테이블 바디 속성</h3>

            {/* Body Info */}
            <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                    <div>행 개수: {rows.length}개</div>
                    <div>총 셀 개수: {totalCells}개</div>
                    <div>태그: &lt;tbody&gt;</div>
                </div>
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
            />

            {/* 행 목록 */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">행 목록</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {rows.map((row, index) => {
                        const rowCells = elements.filter(el =>
                            el.parent_id === row.id && el.tag === 'Cell'
                        );

                        return (
                            <div key={row.id} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                                <div>
                                    <span className="font-medium">행 {index + 1}</span>
                                    <span className="ml-2 text-gray-500">
                                        ({rowCells.length}개 셀)
                                    </span>
                                </div>
                                <span className="text-gray-400 text-xs">
                                    {row.id.slice(0, 8)}...
                                </span>
                            </div>
                        );
                    })}
                    {rows.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                            행이 없습니다
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
