import { SquarePlus, Trash, Type, Binary, TriangleRight, ChevronUp, ChevronDown, CheckSquare, Layout, PointerOff, AppWindow, CheckCircle, Hash } from 'lucide-react';
import { useStore } from '../../stores/elements';
import { Button, Select, SelectItem, Checkbox } from '../../components/list';
import { supabase } from '../../../env/supabase.client';
import { iconProps } from '../../constants';
import { useState, useRef, useEffect } from 'react';

import './index.css';

function Properties() {
    const {
        selectedElementId,
        selectedElementProps,
        selectedTab,
        updateElementProps,
        addElement,        // 추가
        currentPageId      // 추가
    } = useStore();

    // JSON 입력 관련 상태
    const [jsonInputValue, setJsonInputValue] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const jsonUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

    // selectedElementProps가 변경될 때 JSON 입력값 동기화
    useEffect(() => {
        if (selectedElementProps?.items) {
            try {
                setJsonInputValue(JSON.stringify(selectedElementProps.items, null, 2));
                setJsonError(null);
            } catch (err) {
                setJsonInputValue('');
                setJsonError('Failed to stringify items');
            }
        } else {
            setJsonInputValue('');
            setJsonError(null);
        }
    }, [selectedElementProps?.items]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (jsonUpdateTimeout.current) {
                clearTimeout(jsonUpdateTimeout.current);
            }
        };
    }, []);

    if (!selectedElementId) {
        return <div>요소를 선택해주세요</div>;
    }

    const renderComponentProps = () => {
        switch (selectedElementProps.tag) {
            case 'Button':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Disabled</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isDisabled || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            case 'ToggleButton':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Button text"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isSelected || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isSelected: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Selected</span>
                            </div>

                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isDisabled || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Disabled</span>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'ToggleButtonGroup':
                // 선택된 ToggleButton이 있고, 현재 ToggleButtonGroup의 버튼인 경우 개별 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentButton = selectedElementProps.children?.[selectedTab.tabIndex];
                    if (!currentButton) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Button Properties</legend>

                                {/* 버튼 제목 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Button Title'
                                        value={currentButton.title || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...(selectedElementProps.children || [])];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                title: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 선택 상태 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Checkbox
                                        isSelected={currentButton.isSelected || false}
                                        onChange={async (isSelected) => {
                                            const updatedChildren = [...(selectedElementProps.children || [])];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                isSelected: isSelected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        Selected
                                    </Checkbox>
                                </div>

                                {/* 버튼 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = selectedElementProps.children?.filter((_: any, i: number) => i !== selectedTab.tabIndex) || [];
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Button
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // ToggleButtonGroup 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Group Settings</legend>

                            {/* 선택 모드 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'single', label: 'Single' },
                                        { id: 'multiple', label: 'Multiple' }
                                    ]}
                                    selectedKey={selectedElementProps.selectionMode || 'single'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectionMode: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>

                            {/* 방향 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'horizontal', label: 'Horizontal' },
                                        { id: 'vertical', label: 'Vertical' }
                                    ]}
                                    selectedKey={selectedElementProps.orientation || 'horizontal'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            orientation: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Button Management</legend>

                            {/* 버튼 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total buttons: {selectedElementProps.children?.length || 0}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual buttons from tree to edit
                                </p>
                            </div>

                            {/* 새 버튼 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newButtonId = `button${Date.now()}`;
                                        const newButton = {
                                            id: newButtonId,
                                            title: `Button ${(selectedElementProps.children?.length || 0) + 1}`,
                                            isSelected: false
                                        };
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: [...(selectedElementProps.children || []), newButton]
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Button
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'TextField':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Text Field Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 설명 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Help text (optional)'
                                    value={selectedElementProps.description || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            description: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 에러 메시지 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Error message (optional)'
                                    value={selectedElementProps.errorMessage || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            errorMessage: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isDisabled || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Disabled
                                </Checkbox>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Input':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.placeholder || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            placeholder: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Input placeholder"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isDisabled || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Disabled</span>
                            </div>

                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isReadOnly || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isReadOnly: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Read Only</span>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Checkbox':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Checkbox label"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isSelected || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isSelected: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Selected</span>
                            </div>

                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isDisabled || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Disabled</span>
                            </div>

                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isIndeterminate || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isIndeterminate: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                                <span>Indeterminate</span>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'CheckboxGroup':
                return (
                    <div className="component-props">
                        {/* 개별 체크박스가 선택된 경우 */}
                        {selectedTab?.parentId === selectedElementId ? (
                            <>
                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Checkbox Properties</legend>

                                    {/* 체크박스 제목 편집 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder="Checkbox Label"
                                            value={selectedElementProps.children?.[selectedTab.tabIndex]?.label || ''}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                if (updatedChildren[selectedTab.tabIndex]) {
                                                    updatedChildren[selectedTab.tabIndex] = {
                                                        ...updatedChildren[selectedTab.tabIndex],
                                                        label: e.target.value
                                                    };
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };
                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 체크박스 선택 상태 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <CheckCircle color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            type="checkbox"
                                            className='control-checkbox'
                                            checked={selectedElementProps.children?.[selectedTab.tabIndex]?.isSelected || false}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                if (updatedChildren[selectedTab.tabIndex]) {
                                                    updatedChildren[selectedTab.tabIndex] = {
                                                        ...updatedChildren[selectedTab.tabIndex],
                                                        isSelected: e.target.checked
                                                    };
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };
                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 체크박스 삭제 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <button
                                            className='control-button'
                                            onClick={async () => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                updatedChildren.splice(selectedTab.tabIndex, 1);
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: updatedChildren
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                            Delete Checkbox
                                        </button>
                                    </div>
                                </fieldset>
                            </>
                        ) : (
                            /* 전체 CheckboxGroup이 선택된 경우 */
                            <>
                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Label</legend>
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            value={selectedElementProps.label || ''}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    label: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>
                                </fieldset>

                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Orientation</legend>
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <Select
                                            items={[
                                                { id: 'horizontal', label: 'Horizontal' },
                                                { id: 'vertical', label: 'Vertical' }
                                            ]}
                                            selectedKey={selectedElementProps.orientation || 'vertical'}
                                            onSelectionChange={async (selected) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    orientation: selected
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            {(item) => <SelectItem>{item.label}</SelectItem>}
                                        </Select>
                                    </div>
                                </fieldset>

                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Checkbox Management</legend>

                                    <div className='tab-overview'>
                                        <p className='tab-overview-text'>
                                            Total checkboxes: {selectedElementProps.children?.length || 0}
                                        </p>
                                        <p className='tab-overview-help'>
                                            💡 Select individual checkboxes from tree to edit
                                        </p>
                                    </div>

                                    {/* 새 체크박스 추가 버튼 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <button
                                            className='control-button add'
                                            onClick={async () => {
                                                const newCheckboxId = `checkbox${Date.now()}`;
                                                const newCheckbox = {
                                                    id: newCheckboxId,
                                                    label: `Option ${(selectedElementProps.children?.length || 0) + 1}`,
                                                    isSelected: false
                                                };
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: [...(selectedElementProps.children || []), newCheckbox]
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                            Add Checkbox
                                        </button>
                                    </div>
                                </fieldset>
                            </>
                        )}
                    </div>
                );

            case 'ListBox':
                const listBoxChildren = selectedElementProps.children || [];

                // 선택된 ListBoxItem이 있고, 현재 ListBox 컴포넌트의 item인 경우 개별 item 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentItem = listBoxChildren[selectedTab.tabIndex];
                    if (!currentItem) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Item Properties</legend>

                                {/* 아이템 라벨 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Item Label'
                                        value={currentItem.label || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...listBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                label: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 아이템 값 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Hash color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Item Value'
                                        value={currentItem.value || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...listBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                value: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 아이템 비활성화 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Checkbox
                                        isSelected={currentItem.isDisabled || false}
                                        onChange={async (isSelected) => {
                                            const updatedChildren = [...listBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                isDisabled: isSelected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        Disabled
                                    </Checkbox>
                                </div>

                                {/* 아이템 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = listBoxChildren.filter((_: any, i: number) => i !== selectedTab.tabIndex);
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Item
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // ListBox 컴포넌트 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>ListBox Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='ListBox Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 선택 모드 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'none', label: 'None' },
                                        { id: 'single', label: 'Single' },
                                        { id: 'multiple', label: 'Multiple' }
                                    ]}
                                    selectedKey={selectedElementProps.selectionMode || 'none'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectionMode: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Items Management</legend>

                            {/* 아이템 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total items: {listBoxChildren.length}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual items from tree to edit
                                </p>
                            </div>

                            {/* 새 아이템 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newItem = {
                                            id: crypto.randomUUID(),
                                            type: 'ListBoxItem',
                                            label: `Item ${listBoxChildren.length + 1}`,
                                            value: `item${listBoxChildren.length + 1}`,
                                            isDisabled: false
                                        };
                                        const updatedChildren = [...listBoxChildren, newItem];
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: updatedChildren
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Item
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'GridList':
                const gridListChildren = selectedElementProps.children || [];

                // 선택된 GridListItem이 있고, 현재 GridList 컴포넌트의 item인 경우 개별 item 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentItem = gridListChildren[selectedTab.tabIndex];
                    if (!currentItem) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Item Properties</legend>

                                {/* 아이템 라벨 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Item Label'
                                        value={currentItem.label || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...gridListChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                label: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 아이템 값 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Hash color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Item Value'
                                        value={currentItem.value || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...gridListChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                value: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 아이템 비활성화 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Checkbox
                                        isSelected={currentItem.isDisabled || false}
                                        onChange={async (isSelected) => {
                                            const updatedChildren = [...gridListChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                isDisabled: isSelected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        Disabled
                                    </Checkbox>
                                </div>

                                {/* 아이템 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = gridListChildren.filter((_: any, i: number) => i !== selectedTab.tabIndex);
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Item
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // GridList 컴포넌트 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>GridList Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='GridList Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 선택 모드 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'none', label: 'None' },
                                        { id: 'single', label: 'Single' },
                                        { id: 'multiple', label: 'Multiple' }
                                    ]}
                                    selectedKey={selectedElementProps.selectionMode || 'none'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectionMode: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Items Management</legend>

                            {/* 아이템 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total items: {gridListChildren.length}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual items from tree to edit
                                </p>
                            </div>

                            {/* 새 아이템 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newItem = {
                                            id: crypto.randomUUID(),
                                            type: 'GridListItem',
                                            label: `Item ${gridListChildren.length + 1}`,
                                            value: `item${gridListChildren.length + 1}`,
                                            isDisabled: false
                                        };
                                        const updatedChildren = [...gridListChildren, newItem];
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: updatedChildren
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Item
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Select':
                const selectChildren = selectedElementProps.children || [];

                // 선택된 SelectItem이 있고, 현재 Select 컴포넌트의 item인 경우 개별 option 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentOption = selectChildren[selectedTab.tabIndex];
                    if (!currentOption) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Option Properties</legend>

                                {/* 옵션 라벨 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Option Label'
                                        value={currentOption.label || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...selectChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                label: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 옵션 값 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Hash color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Option Value'
                                        value={currentOption.value || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...selectChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                value: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 옵션 비활성화 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Checkbox
                                        isSelected={currentOption.isDisabled || false}
                                        onChange={async (isSelected) => {
                                            const updatedChildren = [...selectChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                isDisabled: isSelected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        Disabled
                                    </Checkbox>
                                </div>

                                {/* 옵션 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = selectChildren.filter((_: any, i: number) => i !== selectedTab.tabIndex);
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Option
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // Select 컴포넌트 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Select Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Select Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 선택된 값 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckCircle color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Selected Value'
                                    value={selectedElementProps.selectedKey || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectedKey: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Options Management</legend>

                            {/* 옵션 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total options: {selectChildren.length}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual options from tree to edit
                                </p>
                            </div>

                            {/* 새 옵션 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newOption = {
                                            id: crypto.randomUUID(),
                                            type: 'SelectItem',
                                            label: `Option ${selectChildren.length + 1}`,
                                            value: `option${selectChildren.length + 1}`,
                                            isDisabled: false
                                        };
                                        const updatedChildren = [...selectChildren, newOption];
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: updatedChildren
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Option
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'ComboBox':
                const comboBoxChildren = selectedElementProps.children || [];

                // 선택된 ComboBoxItem이 있고, 현재 ComboBox 컴포넌트의 item인 경우 개별 option 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentOption = comboBoxChildren[selectedTab.tabIndex];
                    if (!currentOption) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Option Properties</legend>

                                {/* 옵션 라벨 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Option Label'
                                        value={currentOption.label || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...comboBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                label: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 옵션 값 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Hash color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Option Value'
                                        value={currentOption.value || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...comboBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                value: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 옵션 비활성화 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Checkbox
                                        isSelected={currentOption.isDisabled || false}
                                        onChange={async (isSelected) => {
                                            const updatedChildren = [...comboBoxChildren];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                isDisabled: isSelected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        Disabled
                                    </Checkbox>
                                </div>

                                {/* 옵션 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = comboBoxChildren.filter((_: any, i: number) => i !== selectedTab.tabIndex);
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Option
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // ComboBox 컴포넌트 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>ComboBox Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='ComboBox Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 선택된 값 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckCircle color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Selected Value'
                                    value={selectedElementProps.selectedKey || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectedKey: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Options Management</legend>

                            {/* 옵션 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total options: {comboBoxChildren.length}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual options from tree to edit
                                </p>
                            </div>

                            {/* 새 옵션 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newOption = {
                                            id: crypto.randomUUID(),
                                            type: 'ComboBoxItem',
                                            label: `Option ${comboBoxChildren.length + 1}`,
                                            value: `option${comboBoxChildren.length + 1}`,
                                            isDisabled: false
                                        };
                                        const updatedChildren = [...comboBoxChildren, newOption];
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: updatedChildren
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Option
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Text':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Text</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Tag</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>Tag</label>
                                <Select
                                    items={[
                                        { id: 'p', label: '본문(p)' },
                                        { id: 'h1', label: '제목1(h1)' },
                                        { id: 'h2', label: '제목2(h2)' },
                                        { id: 'h3', label: '제목3(h3)' },
                                        { id: 'h4', label: '제목4(h4)' },
                                        { id: 'h5', label: '제목5(h5)' },
                                        { id: 'h6', label: '제목6(h6)' },
                                    ]}
                                    selectedKey={selectedElementProps.as || 'p'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            as: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Slider':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Label</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Default Value</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Binary color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.value || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            value: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Min Value</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Binary color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.minValue || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            minValue: Number(e.target.value) || 0
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Max Value</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Binary color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.maxValue || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            maxValue: Number(e.target.value) || 100
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Step</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <TriangleRight color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.step || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            step: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Orientation</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'horizontal', label: 'Horizontal' },
                                        { id: 'vertical', label: 'Vertical' }
                                    ]}
                                    selectedKey={selectedElementProps.orientation || 'horizontal'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            orientation: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Disabled</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    type="checkbox"
                                    checked={selectedElementProps.isDisabled || false}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: e.target.checked
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Form</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>Name</label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.name || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            name: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Tabs':
                // 선택된 Tab이 있고, 현재 Tabs 컴포넌트의 Tab인 경우 개별 Tab 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const currentTab = selectedElementProps.children?.[selectedTab.tabIndex];
                    if (!currentTab) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Tab Properties</legend>

                                {/* 탭 제목 편집 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <input
                                        className='control-input'
                                        placeholder='Tab Title'
                                        value={currentTab.title || ''}
                                        onChange={async (e) => {
                                            const updatedChildren = [...(selectedElementProps.children || [])];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                title: e.target.value
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    />
                                </div>

                                {/* 탭 variant 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Select
                                        items={[
                                            { id: 'default', label: 'Default' },
                                            { id: 'bordered', label: 'Bordered' },
                                            { id: 'underlined', label: 'Underlined' },
                                            { id: 'pill', label: 'Pill' }
                                        ]}
                                        selectedKey={currentTab.variant || 'default'}
                                        onSelectionChange={async (selected) => {
                                            const updatedChildren = [...(selectedElementProps.children || [])];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                variant: selected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        {(item) => <SelectItem>{item.label}</SelectItem>}
                                    </Select>
                                </div>

                                {/* 탭 appearance 설정 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <label className='control-label'>
                                        <AppWindow color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                    </label>
                                    <Select
                                        items={[
                                            { id: 'light', label: 'Light' },
                                            { id: 'dark', label: 'Dark' },
                                            { id: 'solid', label: 'Solid' },
                                            { id: 'bordered', label: 'Bordered' }
                                        ]}
                                        selectedKey={currentTab.appearance || 'light'}
                                        onSelectionChange={async (selected) => {
                                            const updatedChildren = [...(selectedElementProps.children || [])];
                                            updatedChildren[selectedTab.tabIndex] = {
                                                ...updatedChildren[selectedTab.tabIndex],
                                                appearance: selected
                                            };
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        {(item) => <SelectItem>{item.label}</SelectItem>}
                                    </Select>
                                </div>

                                {/* 탭 삭제 */}
                                <div className='react-aria-control react-aria-Group'>
                                    <button
                                        className='control-button delete'
                                        onClick={async () => {
                                            const updatedChildren = selectedElementProps.children?.filter((_: any, i: number) => i !== selectedTab.tabIndex) || [];
                                            let updatedDefaultKey = selectedElementProps.defaultSelectedKey;

                                            // 삭제되는 탭이 기본 선택 탭이면 첫 번째 탭으로 변경
                                            if (updatedDefaultKey === currentTab.id && updatedChildren.length > 0) {
                                                updatedDefaultKey = updatedChildren[0].id;
                                            }

                                            const updatedProps = {
                                                ...selectedElementProps,
                                                children: updatedChildren,
                                                defaultSelectedKey: updatedDefaultKey
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            try {
                                                await supabase
                                                    .from('elements')
                                                    .update({ props: updatedProps })
                                                    .eq('id', selectedElementId);
                                            } catch (err) {
                                                console.error('Update error:', err);
                                            }
                                        }}
                                    >
                                        <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                        Delete This Tab
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    );
                }

                // Tabs 컴포넌트 전체 설정 UI
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Tab Settings</legend>

                            {/* 기본 선택 탭 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <AppWindow color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={selectedElementProps.children?.map((tab: any) => ({
                                        id: tab.id,
                                        label: tab.title
                                    })) || []}
                                    selectedKey={selectedElementProps.defaultSelectedKey}
                                    onSelectionChange={async (key) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            defaultSelectedKey: key
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>

                            {/* 방향 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'horizontal', label: 'Horizontal' },
                                        { id: 'vertical', label: 'Vertical' }
                                    ]}
                                    selectedKey={selectedElementProps.orientation || 'horizontal'}
                                    onSelectionChange={async (key) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            orientation: key
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Tab Management</legend>

                            {/* 탭 개수 표시 */}
                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total tabs: {selectedElementProps.children?.length || 0}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual tabs from tree to edit title, variant, and appearance
                                </p>
                            </div>

                            {/* 새 탭 추가 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newTabId = `tab${Date.now()}`;
                                        const newTabIndex = selectedElementProps.children?.length || 0;
                                        const newTab = {
                                            id: newTabId,
                                            title: `Tab ${newTabIndex + 1}`,
                                            variant: 'default',
                                            appearance: 'light'
                                        };

                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: [...(selectedElementProps.children || []), newTab],
                                            defaultSelectedKey: selectedElementProps.children?.length === 0 ? newTabId : selectedElementProps.defaultSelectedKey
                                        };

                                        // 새로운 Panel 컴포넌트 생성
                                        const newPanelElement = {
                                            id: crypto.randomUUID(),
                                            page_id: currentPageId,
                                            tag: 'Panel',
                                            props: {
                                                variant: 'tab',
                                                title: newTab.title,
                                                tabIndex: newTabIndex,
                                                style: {},
                                                className: '',
                                            },
                                            parent_id: selectedElementId,
                                            order_num: newTabIndex + 1,
                                        };

                                        try {
                                            // Tabs props 업데이트
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);

                                            // 새로운 Panel 컴포넌트 생성
                                            const { data: panelData, error: panelError } = await supabase
                                                .from('elements')
                                                .insert([newPanelElement])
                                                .select()
                                                .single();

                                            if (panelError) {
                                                console.error('Panel creation error:', panelError);
                                                return;
                                            }

                                            // 상태 업데이트
                                            updateElementProps(selectedElementId, updatedProps);
                                            if (panelData) {
                                                addElement(panelData);
                                            }

                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Tab
                                </button>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isDisabled || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Disabled
                                </Checkbox>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Card':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Content</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <textarea
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Enter card content"
                                    rows={3}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Appearance</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <AppWindow color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.className || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            className: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="CSS classes"
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            case 'RadioGroup':
                return (
                    <div className="component-props">
                        {/* 개별 라디오버튼이 선택된 경우 */}
                        {selectedTab?.parentId === selectedElementId ? (
                            <>
                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Radio Properties</legend>

                                    {/* 라디오버튼 제목 편집 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder="Radio Label"
                                            value={selectedElementProps.children?.[selectedTab.tabIndex]?.label || ''}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                if (updatedChildren[selectedTab.tabIndex]) {
                                                    updatedChildren[selectedTab.tabIndex] = {
                                                        ...updatedChildren[selectedTab.tabIndex],
                                                        label: e.target.value
                                                    };
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };
                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 라디오버튼 값 편집 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Hash color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder="Radio Value"
                                            value={selectedElementProps.children?.[selectedTab.tabIndex]?.value || ''}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                if (updatedChildren[selectedTab.tabIndex]) {
                                                    updatedChildren[selectedTab.tabIndex] = {
                                                        ...updatedChildren[selectedTab.tabIndex],
                                                        value: e.target.value
                                                    };
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };
                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 라디오버튼 삭제 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <button
                                            className='control-button delete'
                                            onClick={async () => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                updatedChildren.splice(selectedTab.tabIndex, 1);
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: updatedChildren
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                            Delete Radio
                                        </button>
                                    </div>
                                </fieldset>
                            </>
                        ) : (
                            /* 전체 RadioGroup이 선택된 경우 */
                            <>
                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Group Settings</legend>

                                    {/* 라벨 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder="Group Label"
                                            value={selectedElementProps.label || ''}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    label: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 선택된 값 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <CheckCircle color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder="Selected Value"
                                            value={selectedElementProps.value || ''}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    value: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 방향 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <Select
                                            items={[
                                                { id: 'horizontal', label: 'Horizontal' },
                                                { id: 'vertical', label: 'Vertical' }
                                            ]}
                                            selectedKey={selectedElementProps.orientation || 'vertical'}
                                            onSelectionChange={async (selected) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    orientation: selected
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            {(item) => <SelectItem>{item.label}</SelectItem>}
                                        </Select>
                                    </div>
                                </fieldset>

                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Radio Management</legend>

                                    {/* 라디오 개수 표시 */}
                                    <div className='tab-overview'>
                                        <p className='tab-overview-text'>
                                            Total radios: {selectedElementProps.children?.length || 0}
                                        </p>
                                        <p className='tab-overview-help'>
                                            💡 Select individual radios from tree to edit
                                        </p>
                                    </div>

                                    {/* 새 라디오버튼 추가 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <button
                                            className='control-button add'
                                            onClick={async () => {
                                                const newRadioId = `radio${Date.now()}`;
                                                const newRadio = {
                                                    id: newRadioId,
                                                    label: `Option ${(selectedElementProps.children?.length || 0) + 1}`,
                                                    value: `option${(selectedElementProps.children?.length || 0) + 1}`
                                                };
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: [...(selectedElementProps.children || []), newRadio]
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                            Add Radio
                                        </button>
                                    </div>
                                </fieldset>
                            </>
                        )}
                    </div>
                );

            case 'Tree':
                // 선택된 TreeItem이 있고, 현재 Tree 컴포넌트의 item인 경우 개별 TreeItem 편집 UI 표시
                if (selectedTab && selectedTab.parentId === selectedElementId) {
                    const flatItems = selectedElementProps.children || [];
                    const currentItem = flatItems.find((item: any, index: number) => index === selectedTab.tabIndex);
                    if (!currentItem) return null;

                    return (
                        <div className="component-props">
                            <fieldset className="properties-aria">
                                <legend className='fieldset-legend'>Selected Item: {currentItem.title || `Item ${selectedTab.tabIndex + 1}`}</legend>

                                <div className='tab-content-editor'>
                                    <div className='control-group'>
                                        <label className='control-label'>Title</label>
                                        <input
                                            className='control-input'
                                            placeholder='Item Title'
                                            value={currentItem.title || ''}
                                            onChange={async (e) => {
                                                const updatedChildren = [...flatItems];
                                                updatedChildren[selectedTab.tabIndex] = {
                                                    ...currentItem,
                                                    title: e.target.value
                                                };

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: updatedChildren
                                                };

                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div className='control-group'>
                                        <label className='control-label'>Type</label>
                                        <Select
                                            items={[
                                                { id: 'folder', label: 'Folder' },
                                                { id: 'file', label: 'File' }
                                            ]}
                                            selectedKey={currentItem.type || 'file'}
                                            onSelectionChange={async (selected) => {
                                                const updatedChildren = [...flatItems];
                                                updatedChildren[selectedTab.tabIndex] = {
                                                    ...currentItem,
                                                    type: selected as string
                                                };

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: updatedChildren
                                                };

                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            {(item) => <SelectItem>{item.label}</SelectItem>}
                                        </Select>
                                    </div>

                                    <div className='control-group'>
                                        <label className='control-label'>Parent</label>
                                        <Select
                                            items={[
                                                { id: 'root', label: 'Root (No Parent)' },
                                                ...flatItems
                                                    .filter((item: any) => item.type === 'folder' && item.id !== currentItem.id)
                                                    .map((item: any) => ({ id: item.id, label: item.title }))
                                            ]}
                                            selectedKey={currentItem.parent_id || 'root'}
                                            onSelectionChange={async (selected) => {
                                                const newParentId = selected === 'root' ? null : selected as string;
                                                const updatedChildren = [...flatItems];
                                                updatedChildren[selectedTab.tabIndex] = {
                                                    ...currentItem,
                                                    parent_id: newParentId
                                                };

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    children: updatedChildren
                                                };

                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            {(item) => <SelectItem>{item.label}</SelectItem>}
                                        </Select>
                                    </div>
                                </div>

                                {/* 자식 추가 기능 (폴더인 경우만) */}
                                {currentItem.type === 'folder' && (
                                    <fieldset className="properties-aria">
                                        <legend className='fieldset-legend'>Add Child Item</legend>
                                        <div className='tab-management-controls'>
                                            <button
                                                className='add-tab-button'
                                                onClick={async () => {
                                                    const newChild = {
                                                        id: crypto.randomUUID(),
                                                        title: `New Item ${flatItems.length + 1}`,
                                                        type: 'file',
                                                        parent_id: currentItem.id
                                                    };

                                                    const updatedChildren = [...flatItems, newChild];

                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };

                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }}
                                            >
                                                <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                                Add Child
                                            </button>
                                        </div>
                                    </fieldset>
                                )}

                                {/* 개별 아이템 삭제 */}
                                <fieldset className="properties-aria">
                                    <legend className='fieldset-legend'>Item Actions</legend>
                                    <div className='tab-management-controls'>
                                        <button
                                            className='delete-tab-button'
                                            onClick={async () => {
                                                if (window.confirm(`Are you sure you want to delete "${currentItem.title}"?`)) {
                                                    // 자식 아이템들도 함께 삭제 (플랫 구조에서)
                                                    const updatedChildren = flatItems.filter((item: any) =>
                                                        item.id !== currentItem.id && item.parent_id !== currentItem.id
                                                    );

                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        children: updatedChildren
                                                    };

                                                    updateElementProps(selectedElementId, updatedProps);
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);

                                                        // 선택된 아이템이 삭제되었으므로 선택 해제
                                                        setSelectedElement(selectedElementId, selectedElementProps);
                                                    } catch (err) {
                                                        console.error('Update error:', err);
                                                    }
                                                }
                                            }}
                                        >
                                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                            Delete Item
                                        </button>
                                    </div>
                                </fieldset>
                            </fieldset>
                        </div>
                    );
                }

                // Tree 컴포넌트 전체 설정 UI
                const flatItems = selectedElementProps.children || [];
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Selection</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <PointerOff color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'none', label: 'None' },
                                        { id: 'single', label: 'Single' },
                                        { id: 'multiple', label: 'Multiple' }
                                    ]}
                                    selectedKey={selectedElementProps.selectionMode || 'single'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectionMode: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Behavior</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'replace', label: 'Replace' },
                                        { id: 'toggle', label: 'Toggle' }
                                    ]}
                                    selectedKey={selectedElementProps.selectionBehavior || 'replace'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            selectionBehavior: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Features</legend>
                            <div className='control-group'>
                                <Checkbox
                                    isSelected={selectedElementProps.allowsDragging || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            allowsDragging: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Allow Dragging
                                </Checkbox>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Tree Items Management</legend>

                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total items: {flatItems.length}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual items from tree to edit
                                </p>
                            </div>

                            <div className='tab-management-controls'>
                                <button
                                    className='add-tab-button'
                                    onClick={async () => {
                                        const newItem = {
                                            id: crypto.randomUUID(),
                                            title: `New Item ${flatItems.length + 1}`,
                                            type: 'file',
                                            parent_id: null
                                        };

                                        const updatedChildren = [...flatItems, newItem];

                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: updatedChildren
                                        };

                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                    Add Root Item
                                </button>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'DatePicker':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>DatePicker Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Date Picker Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 설명 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Helper text'
                                    value={selectedElementProps.description || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            description: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 에러 메시지 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Error text'
                                    value={selectedElementProps.errorMessage || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            errorMessage: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 플레이스홀더 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Select date...'
                                    value={selectedElementProps.placeholder || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            placeholder: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State & Behavior</legend>

                            {/* 비활성화 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isDisabled || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Disabled
                                </Checkbox>
                            </div>

                            {/* 필수 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isRequired || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isRequired: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Required
                                </Checkbox>
                            </div>

                            {/* 읽기 전용 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isReadOnly || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isReadOnly: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Read Only
                                </Checkbox>
                            </div>

                            {/* 유효하지 않음 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isInvalid || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isInvalid: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Invalid
                                </Checkbox>
                            </div>

                            {/* 자동 포커스 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.autoFocus || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            autoFocus: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Auto Focus
                                </Checkbox>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>UI Options</legend>

                            {/* 캘린더 아이콘 표시 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.showCalendarIcon !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            showCalendarIcon: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Show Calendar Icon
                                </Checkbox>
                            </div>

                            {/* 아이콘 위치 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    selectedKey={selectedElementProps.calendarIconPosition || 'right'}
                                    onSelectionChange={async (value) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            calendarIconPosition: value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SelectItem id="left">Left</SelectItem>
                                    <SelectItem id="right">Right</SelectItem>
                                </Select>
                            </div>

                            {/* 클리어 허용 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.allowClear !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            allowClear: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Allow Clear
                                </Checkbox>
                            </div>

                            {/* 오늘 하이라이트 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.highlightToday !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            highlightToday: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Highlight Today
                                </Checkbox>
                            </div>

                            {/* 주차 번호 표시 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.showWeekNumbers || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            showWeekNumbers: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Show Week Numbers
                                </Checkbox>
                            </div>

                            {/* 시간 선택 포함 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.includeTime || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            includeTime: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Include Time Selection
                                </Checkbox>
                            </div>

                            {/* includeTime이 true일 때만 시간 관련 옵션들 표시 */}
                            {selectedElementProps.includeTime && (
                                <>
                                    {/* 시간 형식 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <Select
                                            selectedKey={selectedElementProps.timeFormat || '24h'}
                                            onSelectionChange={async (value) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    timeFormat: value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <SelectItem id="12h">12 Hour</SelectItem>
                                            <SelectItem id="24h">24 Hour</SelectItem>
                                        </Select>
                                    </div>

                                    {/* 시간 라벨 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder='Time Label'
                                            value={selectedElementProps.timeLabel || 'Time'}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    timeLabel: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </fieldset>
                    </div>
                );

            case 'DateRangePicker':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>DateRangePicker Settings</legend>

                            {/* 라벨 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Date Range Picker Label'
                                    value={selectedElementProps.label || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            label: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 설명 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Helper text'
                                    value={selectedElementProps.description || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            description: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 에러 메시지 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Error text'
                                    value={selectedElementProps.errorMessage || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            errorMessage: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>

                            {/* 플레이스홀더 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    placeholder='Select date range...'
                                    value={selectedElementProps.placeholder || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            placeholder: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State & Behavior</legend>

                            {/* 비활성화 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isDisabled || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isDisabled: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Disabled
                                </Checkbox>
                            </div>

                            {/* 필수 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isRequired || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isRequired: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Required
                                </Checkbox>
                            </div>

                            {/* 읽기 전용 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isReadOnly || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isReadOnly: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Read Only
                                </Checkbox>
                            </div>

                            {/* 유효하지 않음 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.isInvalid || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            isInvalid: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Invalid
                                </Checkbox>
                            </div>

                            {/* 자동 포커스 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.autoFocus || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            autoFocus: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Auto Focus
                                </Checkbox>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>UI Options</legend>

                            {/* 캘린더 아이콘 표시 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.showCalendarIcon !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            showCalendarIcon: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Show Calendar Icon
                                </Checkbox>
                            </div>

                            {/* 아이콘 위치 설정 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    selectedKey={selectedElementProps.calendarIconPosition || 'right'}
                                    onSelectionChange={async (value) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            calendarIconPosition: value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    <SelectItem id="left">Left</SelectItem>
                                    <SelectItem id="right">Right</SelectItem>
                                </Select>
                            </div>

                            {/* 클리어 허용 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.allowClear !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            allowClear: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Allow Clear
                                </Checkbox>
                            </div>

                            {/* 오늘 하이라이트 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.highlightToday !== false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            highlightToday: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Highlight Today
                                </Checkbox>
                            </div>

                            {/* 주차 번호 표시 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.showWeekNumbers || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            showWeekNumbers: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Show Week Numbers
                                </Checkbox>
                            </div>

                            {/* 시간 선택 포함 */}
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Checkbox
                                    isSelected={selectedElementProps.includeTime || false}
                                    onChange={async (isSelected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            includeTime: isSelected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    Include Time Selection
                                </Checkbox>
                            </div>

                            {/* includeTime이 true일 때만 시간 관련 옵션들 표시 */}
                            {selectedElementProps.includeTime && (
                                <>
                                    {/* 시간 형식 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <Select
                                            selectedKey={selectedElementProps.timeFormat || '24h'}
                                            onSelectionChange={async (value) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    timeFormat: value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        >
                                            <SelectItem id="12h">12 Hour</SelectItem>
                                            <SelectItem id="24h">24 Hour</SelectItem>
                                        </Select>
                                    </div>

                                    {/* 시작 시간 라벨 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder='Start Time Label'
                                            value={selectedElementProps.startTimeLabel || 'Start Time'}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    startTimeLabel: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* 종료 시간 라벨 설정 */}
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                        </label>
                                        <input
                                            className='control-input'
                                            placeholder='End Time Label'
                                            value={selectedElementProps.endTimeLabel || 'End Time'}
                                            onChange={async (e) => {
                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    endTimeLabel: e.target.value
                                                };
                                                updateElementProps(selectedElementId, updatedProps);
                                                try {
                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Update error:', err);
                                                }
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </fieldset>
                    </div>
                );

            case 'Calendar':
                return (
                    <div className="component-props">
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>Calendar Settings</legend>

                            <div className='property-group'>
                                <label className='property-label'>ARIA Label</label>
                                <input
                                    type="text"
                                    value={selectedElementProps['aria-label'] || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        'aria-label': e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Calendar"
                                />
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Error Message</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.errorMessage || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        errorMessage: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Error text"
                                />
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isDisabled || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isDisabled: checked
                                    })}
                                >
                                    Disabled
                                </Checkbox>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Visible Months</label>
                                <Select
                                    selectedKey={String(
                                        (typeof selectedElementProps.visibleDuration === 'object' &&
                                            selectedElementProps.visibleDuration !== null &&
                                            'months' in selectedElementProps.visibleDuration)
                                            ? selectedElementProps.visibleDuration.months
                                            : 1
                                    )}
                                    onSelectionChange={(value) => {
                                        const months = Number(value);
                                        if (months >= 1 && months <= 12) { // 안전한 범위 체크
                                            updateElementProps(selectedElementId, {
                                                ...selectedElementProps,
                                                visibleDuration: { months: months }
                                            });
                                        }
                                    }}
                                >
                                    <SelectItem id="1">1 Month</SelectItem>
                                    <SelectItem id="2">2 Months</SelectItem>
                                    <SelectItem id="3">3 Months</SelectItem>
                                </Select>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Page Behavior</label>
                                <Select
                                    selectedKey={selectedElementProps.pageBehavior || 'visible'}
                                    onSelectionChange={(value) => {
                                        if (value === 'visible' || value === 'single') { // 유효한 값만 허용
                                            updateElementProps(selectedElementId, {
                                                ...selectedElementProps,
                                                pageBehavior: value
                                            });
                                        }
                                    }}
                                >
                                    <SelectItem id="visible">Visible</SelectItem>
                                    <SelectItem id="single">Single</SelectItem>
                                </Select>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Panel':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Title</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.title || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            title: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Panel title"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Variant</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <AppWindow color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <Select
                                    items={[
                                        { id: 'default', label: 'Default' },
                                        { id: 'tab', label: 'Tab' },
                                        { id: 'sidebar', label: 'Sidebar' },
                                        { id: 'card', label: 'Card' },
                                        { id: 'modal', label: 'Modal' }
                                    ]}
                                    selectedKey={selectedElementProps.variant || 'default'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            variant: selected
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Appearance</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.className || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            className: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="CSS classes"
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Nav':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Navigation</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps['aria-label'] || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            'aria-label': e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Navigation label"
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Appearance</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.className || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            className: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="CSS classes"
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            case 'section':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Content</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Type color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <textarea
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="Enter section content"
                                    rows={3}
                                />
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Layout</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.className || ''}
                                    onChange={async (e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            className: e.target.value
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        } catch (err) {
                                            console.error('Update error:', err);
                                        }
                                    }}
                                    placeholder="CSS classes"
                                />
                            </div>
                        </fieldset>
                    </div>
                );

            default:
                return <div>지원하지 않는 컴포넌트입니다.</div>;
        }
    };

    return (
        <div className='properties-container'>
            <div className="properties-page">
                <div className="panel-header">
                    <h3 className='panel-title'>Properties</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className="panel-content">
                    {renderComponentProps()}
                </div>
            </div>
        </div>
    );
}

export default Properties; 