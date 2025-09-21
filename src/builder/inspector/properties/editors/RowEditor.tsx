import { RowElementProps, CellElementProps } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertyInput, PropertySelect } from '../components';
import { Label } from 'react-aria-components';
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import

// interface RowEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function RowEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Row 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<RowElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    // 현재 행의 셀들 찾기
    const rowCells = elements.filter(el =>
        el.parent_id === element.id && el.tag === 'Cell'
    ).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    return (
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">행 속성</h3>

            {/* Row Info */}
            <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                    <div>셀 개수: {rowCells.length}개</div>
                    <div>순서: {(element.order_num || 0) + 1}번째</div>
                </div>
            </div>

            {/* Row Height */}
            <PropertyInput
                label="행 높이"
                value={(currentProps as RowElementProps)?.height || ''}
                onChange={(value) => updateProps({ height: value })}
                placeholder="예: 40px, auto"
            />

            {/* Background Color */}
            <PropertyInput
                label="배경색"
                type="color"
                value={(currentProps as RowElementProps)?.backgroundColor || '#ffffff'}
                onChange={(value) => updateProps({ backgroundColor: value })}
            />

            {/* Row Variant */}
            <PropertySelect
                label="행 스타일"
                value={(currentProps as RowElementProps)?.variant || 'default'}
                options={[
                    { value: 'default', label: '기본' },
                    { value: 'striped', label: '줄무늬' },
                    { value: 'hover', label: '호버 효과' },
                ]}
                onChange={(key) => updateProps({ variant: key as 'default' | 'striped' | 'hover' })}
            />

            {/* 셀 목록 */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">셀 목록</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {rowCells.map((cell, index) => (
                        <div key={cell.id} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                            <span>
                                {index + 1}. {(cell.props as CellElementProps)?.children as string || '내용 없음'}
                            </span>
                            <span className="text-gray-400 text-xs">
                                {cell.id.slice(0, 8)}...
                            </span>
                        </div>
                    ))}
                    {rowCells.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-2">
                            셀이 없습니다
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
