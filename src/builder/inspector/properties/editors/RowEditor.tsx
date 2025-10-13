import { CellElementProps } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertyInput, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { Ruler, Palette, Grid } from 'lucide-react';

interface RowElementProps {
    height?: string;
    backgroundColor?: string;
    variant?: 'default' | 'striped' | 'hover';
}

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
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Row Information</legend>

                {/* Row Info */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Cells: {rowCells.length || 0} | Position: #{(element.order_num || 0) + 1}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Configure row appearance and dimensions
                    </p>
                </div>

                {/* Row Height */}
                <PropertyInput
                    label="행 높이"
                    value={(currentProps as RowElementProps)?.height || ''}
                    onChange={(value) => updateProps({ height: value })}
                    placeholder="예: 40px, auto"
                    icon={Ruler}
                />

                {/* Background Color */}
                <PropertyInput
                    label="배경색"
                    type="color"
                    value={(currentProps as RowElementProps)?.backgroundColor || '#ffffff'}
                    onChange={(value) => updateProps({ backgroundColor: value })}
                    icon={Palette}
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
                    icon={Grid}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Cell Overview</legend>

                {/* 셀 목록 */}
                {rowCells.length > 0 && (
                    <div className='tabs-list'>
                        {rowCells.map((cell, index) => (
                            <div key={cell.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    Cell {index + 1}: {(cell.props as CellElementProps)?.children as string || '내용 없음'}
                                </span>
                                <span className="text-gray-400 text-xs">
                                    ID: {cell.id.slice(0, 8)}...
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {rowCells.length === 0 && (
                    <div className='tab-overview'>
                        <p className='tab-overview-help'>
                            셀이 없습니다. Table 편집기에서 컬럼을 추가하세요.
                        </p>
                    </div>
                )}
            </fieldset>
        </div>
    );
}
