
import { PropertyInput, PropertySelect } from '../components';
import type { CellElementProps } from '../../../../types/store';
import { PropertyEditorProps } from '../types/editorTypes'; // PropertyEditorProps import
import { useStore } from '../../../stores'; // useStore import

// interface CellEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function CellEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const elements = useStore(state => state.elements);

    // elementId를 사용하여 현재 Element를 찾음
    const element = elements.find(el => el.id === elementId);

    if (!element || !element.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Cell 요소를 선택하세요
            </div>
        );
    }

    const updateProps = (newProps: Partial<CellElementProps>) => {
        onUpdate({
            ...currentProps,
            ...newProps
        });
    };

    return (
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">셀 속성</h3>

            {/* Cell Content */}
            <PropertyInput
                label="셀 내용"
                value={(currentProps as CellElementProps)?.children as string || ''}
                onChange={(value) => updateProps({ children: value })}
                placeholder="셀 내용을 입력하세요"
            />

            {/* Text Alignment */}
            <PropertySelect
                label="텍스트 정렬"
                value={(currentProps as CellElementProps)?.textAlign || 'left'}
                options={[
                    { value: 'left', label: '왼쪽' },
                    { value: 'center', label: '가운데' },
                    { value: 'right', label: '오른쪽' },
                ]}
                onChange={(key) => updateProps({ textAlign: key as 'left' | 'center' | 'right' })}
            />

            {/* Vertical Alignment */}
            <PropertySelect
                label="수직 정렬"
                value={(currentProps as CellElementProps)?.verticalAlign || 'middle'}
                options={[
                    { value: 'top', label: '위' },
                    { value: 'middle', label: '가운데' },
                    { value: 'bottom', label: '아래' },
                ]}
                onChange={(key) => updateProps({ verticalAlign: key as 'top' | 'middle' | 'bottom' })}
            />

            {/* Background Color */}
            <PropertyInput
                label="배경색"
                type="color"
                value={(currentProps as CellElementProps)?.backgroundColor || '#ffffff'}
                onChange={(value) => updateProps({ backgroundColor: value })}
            />

            {/* Text Color */}
            <PropertyInput
                label="텍스트 색상"
                type="color"
                value={(currentProps as CellElementProps)?.color || '#000000'}
                onChange={(value) => updateProps({ color: value })}
            />
        </div>
    );
}
