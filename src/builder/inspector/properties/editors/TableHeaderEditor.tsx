import { useState } from 'react';
import { ColumnElementProps, Element } from '../../../../types/store';
import { useStore } from '../../../stores';
import { PropertySelect, PropertyInput } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { Table, Pin, SquarePlus, Trash, Tag } from 'lucide-react';
import { supabase } from '../../../../env/supabase.client';
import { ElementUtils } from '../../../../utils/elementUtils';

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
    const { addElement, removeElement } = useStore();
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnLabel, setNewColumnLabel] = useState('');

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

    // 테이블 요소 찾기 (헤더의 부모)
    const tableElement = elements.find(el => el.id === element.parent_id);

    // 컬럼 추가 함수
    const addColumn = async () => {
        if (!newColumnLabel.trim() || !tableElement) return;

        try {
            const newOrderNum = columns.length + 1;
            const columnId = ElementUtils.generateId();

            // 먼저 모든 새 요소들을 준비
            const newColumnElement: Element = {
                id: columnId,
                tag: 'Column',
                props: {
                    children: newColumnLabel,
                    isRowHeader: false
                },
                parent_id: elementId, // TableHeader ID
                page_id: element.page_id!,
                order_num: newOrderNum,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // TableBody의 모든 Row 찾기
            const tableBodyElement = elements.find(el =>
                el.parent_id === tableElement.id && el.tag === 'TableBody'
            );

            const newCellElements: Element[] = [];
            if (tableBodyElement) {
                const rows = elements.filter(el =>
                    el.parent_id === tableBodyElement.id && el.tag === 'Row'
                );

                for (const row of rows) {
                    const cellId = ElementUtils.generateId();
                    const newCellElement: Element = {
                        id: cellId,
                        tag: 'Cell',
                        props: {
                            children: ''
                        },
                        parent_id: row.id,
                        page_id: element.page_id!,
                        order_num: newOrderNum, // 동일한 order_num 사용
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    newCellElements.push(newCellElement);
                }
            }

            // 모든 요소를 한 번에 데이터베이스에 추가
            const allNewElements = [newColumnElement, ...newCellElements];
            const { error } = await supabase
                .from('elements')
                .insert(allNewElements);

            if (error) {
                console.error('컬럼 추가 실패:', error);
                return;
            }

            // 스토어에 모든 요소 추가
            allNewElements.forEach(element => addElement(element));

            // 폼 초기화
            setNewColumnLabel('');
            setIsAddingColumn(false);

            console.log('✅ 헤더에서 컬럼 추가 완료:', newColumnLabel, `(컬럼 1개 + 셀 ${newCellElements.length}개)`);
        } catch (error) {
            console.error('컬럼 추가 중 오류:', error);
        }
    };

    // 컬럼 삭제 함수
    const deleteColumn = async (columnId: string) => {
        try {
            await removeElement(columnId);
            console.log('✅ 헤더에서 컬럼 삭제 완료:', columnId);
        } catch (error) {
            console.error('컬럼 삭제 중 오류:', error);
        }
    };

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
                <legend className='fieldset-legend'>Column Management</legend>

                {/* 컬럼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total columns: {columns.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Add, edit, and manage table columns
                    </p>
                </div>

                {/* 컬럼 입력 필드 */}
                {isAddingColumn && (
                    <PropertyInput
                        label="컬럼 이름"
                        value={newColumnLabel}
                        onChange={setNewColumnLabel}
                        placeholder="컬럼 이름을 입력하세요"
                        icon={Tag}
                    />
                )}

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
                                <button
                                    className='control-button delete'
                                    onClick={() => deleteColumn(column.id)}
                                >
                                    <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 컬럼 관리 버튼들 */}
                <div className='tab-actions'>
                    {isAddingColumn ? (
                        <>
                            <button
                                className='control-button add'
                                onClick={addColumn}
                            >
                                <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                Add Column
                            </button>
                            <button
                                className='control-button secondary'
                                onClick={() => {
                                    setIsAddingColumn(false);
                                    setNewColumnLabel('');
                                }}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            className='control-button add'
                            onClick={() => setIsAddingColumn(true)}
                        >
                            <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Add Column
                        </button>
                    )}
                </div>
            </fieldset>
        </div>
    );
}

