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
                        <div className="prop-group">
                            <label className="prop-label">Text</label>
                            <input
                                className="prop-input"
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
                        <div className="prop-group">
                            <label className="prop-label">Selected</label>
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
                        </div>
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
                                <legend className='fieldset-legend'>Selected Button: {currentButton.title || `Button ${selectedTab.tabIndex + 1}`}</legend>

                                <div className='tab-content-editor'>
                                    <div className='control-group'>
                                        <label className='control-label'>Title</label>
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

                                    <div className='control-group'>
                                        <label className='control-label'>
                                            <input
                                                type="checkbox"
                                                checked={currentButton.isSelected || false}
                                                onChange={async (e) => {
                                                    const updatedChildren = [...(selectedElementProps.children || [])];
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
                                                }}
                                            />
                                            Selected
                                        </label>
                                    </div>
                                </div>

                                <div className='tab-actions-section'>
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
                            <legend className='fieldset-legend'>Selection Mode</legend>
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
                            <legend className='fieldset-legend'>Button Management</legend>

                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total buttons: {selectedElementProps.children?.length || 0}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual
                                </p>
                            </div>

                            {/* 새 탭 추가 버튼 */}
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
                                            children: [...(selectedElementProps.children || []), newButton],
                                            // 첫 번째 탭이면 기본 선택으로 설정
                                            defaultSelectedKey: selectedElementProps.children?.length === 0 ? newButtonId : selectedElementProps.defaultSelectedKey
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

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>State</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
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
                                    Disabled
                                </label>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'TextField':
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
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Description</legend>
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
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Validation</legend>
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
                            <div className='control-group'>
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
                        <div className="prop-group">
                            <label className="prop-label">Value</label>
                            <input
                                className="prop-input"
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
                        <div className="prop-group">
                            <label className="prop-label">Placeholder</label>
                            <input
                                className="prop-input"
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
                        <div className="prop-group">
                            <label className="prop-label">Type</label>
                            <Select
                                items={[
                                    { id: 'text', name: 'text' },
                                    { id: 'password', name: 'password' },
                                    { id: 'email', name: 'email' },
                                    { id: 'number', name: 'number' }
                                ]}
                                selectedKey={selectedElementProps.type || 'text'}
                                onSelectionChange={async (selected) => {
                                    const updatedProps = {
                                        ...selectedElementProps,
                                        type: selected
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
                                {(item) => <SelectItem>{item.name}</SelectItem>}
                            </Select>
                        </div>
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
                            <legend className='fieldset-legend'>Selection</legend>
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
                            <div className="tabs-management">
                                <div className="tabs-header">
                                    <span className="tabs-count">Total Items: {listBoxChildren.length}</span>
                                    <Button
                                        className="add-tab-btn"
                                        onPress={async () => {
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
                                        <SquarePlus size={16} />
                                        Add Item
                                    </Button>
                                </div>

                                <div className="tabs-list">
                                    {listBoxChildren.map((item: any, index: number) => (
                                        <div key={item.id} className="tab-item">
                                            <div className="tab-header">
                                                <span className="tab-number">#{index + 1}</span>
                                                <div className="tab-controls">
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === 0}
                                                        onPress={async () => {
                                                            if (index > 0) {
                                                                const newChildren = [...listBoxChildren];
                                                                [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronUp size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === listBoxChildren.length - 1}
                                                        onPress={async () => {
                                                            if (index < listBoxChildren.length - 1) {
                                                                const newChildren = [...listBoxChildren];
                                                                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronDown size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn delete-btn"
                                                        onPress={async () => {
                                                            const updatedChildren = listBoxChildren.filter((_, i) => i !== index);
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
                                                        <Trash size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="tab-content">
                                                <div className="form-group">
                                                    <label>Label</label>
                                                    <input
                                                        type="text"
                                                        value={item.label || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = listBoxChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, label: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Value</label>
                                                    <input
                                                        type="text"
                                                        value={item.value || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = listBoxChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, value: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>
                                                        <Checkbox
                                                            isSelected={item.isDisabled || false}
                                                            onChange={async (isSelected) => {
                                                                const updatedChildren = listBoxChildren.map((child: any, i: number) =>
                                                                    i === index ? { ...child, isDisabled: isSelected } : child
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
                                                                } catch (err) {
                                                                    console.error('Update error:', err);
                                                                }
                                                            }}
                                                        >
                                                            Disabled
                                                        </Checkbox>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'GridList':
                const gridListChildren = selectedElementProps.children || [];
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
                            <legend className='fieldset-legend'>Selection</legend>
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
                            <div className="tabs-management">
                                <div className="tabs-header">
                                    <span className="tabs-count">Total Items: {gridListChildren.length}</span>
                                    <Button
                                        className="add-tab-btn"
                                        onPress={async () => {
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
                                        <SquarePlus size={16} />
                                        Add Item
                                    </Button>
                                </div>

                                <div className="tabs-list">
                                    {gridListChildren.map((item: any, index: number) => (
                                        <div key={item.id} className="tab-item">
                                            <div className="tab-header">
                                                <span className="tab-number">#{index + 1}</span>
                                                <div className="tab-controls">
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === 0}
                                                        onPress={async () => {
                                                            if (index > 0) {
                                                                const newChildren = [...gridListChildren];
                                                                [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronUp size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === gridListChildren.length - 1}
                                                        onPress={async () => {
                                                            if (index < gridListChildren.length - 1) {
                                                                const newChildren = [...gridListChildren];
                                                                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronDown size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn delete-btn"
                                                        onPress={async () => {
                                                            const updatedChildren = gridListChildren.filter((_, i) => i !== index);
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
                                                        <Trash size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="tab-content">
                                                <div className="form-group">
                                                    <label>Label</label>
                                                    <input
                                                        type="text"
                                                        value={item.label || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = gridListChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, label: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Value</label>
                                                    <input
                                                        type="text"
                                                        value={item.value || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = gridListChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, value: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>
                                                        <Checkbox
                                                            isSelected={item.isDisabled || false}
                                                            onChange={async (isSelected) => {
                                                                const updatedChildren = gridListChildren.map((child: any, i: number) =>
                                                                    i === index ? { ...child, isDisabled: isSelected } : child
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
                                                                } catch (err) {
                                                                    console.error('Update error:', err);
                                                                }
                                                            }}
                                                        >
                                                            Disabled
                                                        </Checkbox>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Select':
                const selectChildren = selectedElementProps.children || [];
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
                            <legend className='fieldset-legend'>Options Management</legend>
                            <div className="tabs-management">
                                <div className="tabs-header">
                                    <span className="tabs-count">Total Options: {selectChildren.length}</span>
                                    <Button
                                        className="add-tab-btn"
                                        onPress={async () => {
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
                                        <SquarePlus size={16} />
                                        Add Option
                                    </Button>
                                </div>

                                <div className="tabs-list">
                                    {selectChildren.map((option: any, index: number) => (
                                        <div key={option.id} className="tab-item">
                                            <div className="tab-header">
                                                <span className="tab-number">#{index + 1}</span>
                                                <div className="tab-controls">
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === 0}
                                                        onPress={async () => {
                                                            if (index > 0) {
                                                                const newChildren = [...selectChildren];
                                                                [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronUp size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === selectChildren.length - 1}
                                                        onPress={async () => {
                                                            if (index < selectChildren.length - 1) {
                                                                const newChildren = [...selectChildren];
                                                                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronDown size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn delete-btn"
                                                        onPress={async () => {
                                                            const updatedChildren = selectChildren.filter((_, i) => i !== index);
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
                                                        <Trash size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="tab-content">
                                                <div className="form-group">
                                                    <label>Label</label>
                                                    <input
                                                        type="text"
                                                        value={option.label || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = selectChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, label: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Value</label>
                                                    <input
                                                        type="text"
                                                        value={option.value || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = selectChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, value: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>
                                                        <Checkbox
                                                            isSelected={option.isDisabled || false}
                                                            onChange={async (isSelected) => {
                                                                const updatedChildren = selectChildren.map((child: any, i: number) =>
                                                                    i === index ? { ...child, isDisabled: isSelected } : child
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
                                                                } catch (err) {
                                                                    console.error('Update error:', err);
                                                                }
                                                            }}
                                                        >
                                                            Disabled
                                                        </Checkbox>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'ComboBox':
                const comboBoxChildren = selectedElementProps.children || [];
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
                            <legend className='fieldset-legend'>Options Management</legend>
                            <div className="tabs-management">
                                <div className="tabs-header">
                                    <span className="tabs-count">Total Options: {comboBoxChildren.length}</span>
                                    <Button
                                        className="add-tab-btn"
                                        onPress={async () => {
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
                                        <SquarePlus size={16} />
                                        Add Option
                                    </Button>
                                </div>

                                <div className="tabs-list">
                                    {comboBoxChildren.map((option: any, index: number) => (
                                        <div key={option.id} className="tab-item">
                                            <div className="tab-header">
                                                <span className="tab-number">#{index + 1}</span>
                                                <div className="tab-controls">
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === 0}
                                                        onPress={async () => {
                                                            if (index > 0) {
                                                                const newChildren = [...comboBoxChildren];
                                                                [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronUp size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn"
                                                        isDisabled={index === comboBoxChildren.length - 1}
                                                        onPress={async () => {
                                                            if (index < comboBoxChildren.length - 1) {
                                                                const newChildren = [...comboBoxChildren];
                                                                [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                                                                const updatedProps = {
                                                                    ...selectedElementProps,
                                                                    children: newChildren
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
                                                    >
                                                        <ChevronDown size={16} />
                                                    </Button>
                                                    <Button
                                                        className="icon-btn delete-btn"
                                                        onPress={async () => {
                                                            const updatedChildren = comboBoxChildren.filter((_, i) => i !== index);
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
                                                        <Trash size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="tab-content">
                                                <div className="form-group">
                                                    <label>Label</label>
                                                    <input
                                                        type="text"
                                                        value={option.label || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = comboBoxChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, label: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Value</label>
                                                    <input
                                                        type="text"
                                                        value={option.value || ''}
                                                        onChange={async (e) => {
                                                            const updatedChildren = comboBoxChildren.map((child: any, i: number) =>
                                                                i === index ? { ...child, value: e.target.value } : child
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
                                                            } catch (err) {
                                                                console.error('Update error:', err);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>
                                                        <Checkbox
                                                            isSelected={option.isDisabled || false}
                                                            onChange={async (isSelected) => {
                                                                const updatedChildren = comboBoxChildren.map((child: any, i: number) =>
                                                                    i === index ? { ...child, isDisabled: isSelected } : child
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
                                                                } catch (err) {
                                                                    console.error('Update error:', err);
                                                                }
                                                            }}
                                                        >
                                                            Disabled
                                                        </Checkbox>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                                <legend className='fieldset-legend'>Selected Tab: {currentTab.title || `Tab ${selectedTab.tabIndex + 1}`}</legend>

                                <div className='tab-content-editor'>
                                    <div className='control-group'>
                                        <label className='control-label'>Title</label>
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

                                    <div className='control-group'>
                                        <label className='control-label'>Content</label>
                                        <textarea
                                            className='control-input'
                                            placeholder='Tab Content'
                                            value={currentTab.content || ''}
                                            rows={5}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                updatedChildren[selectedTab.tabIndex] = {
                                                    ...updatedChildren[selectedTab.tabIndex],
                                                    content: e.target.value
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
                                </div>

                                <div className='tab-actions-section'>
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
                            <legend className='fieldset-legend'>Default Selected Tab</legend>
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
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Orientation</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <AppWindow color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
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

                            <div className='tab-overview'>
                                <p className='tab-overview-text'>
                                    Total tabs: {selectedElementProps.children?.length || 0}
                                </p>
                                <p className='tab-overview-help'>
                                    💡 Select individual tabs from the tree to edit them
                                </p>
                            </div>

                            {/* 새 탭 추가 버튼 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newTabId = `tab${Date.now()}`;
                                        const newTabIndex = selectedElementProps.children?.length || 0;
                                        const newTab = {
                                            id: newTabId,
                                            title: `Tab ${newTabIndex + 1}`,
                                            content: 'New tab content'
                                        };

                                        // 1. Tabs의 props 업데이트
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: [...(selectedElementProps.children || []), newTab],
                                            defaultSelectedKey: selectedElementProps.children?.length === 0 ? newTabId : selectedElementProps.defaultSelectedKey
                                        };

                                        // 2. 새로운 Panel 컴포넌트 생성
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
                                            // 3. Tabs props 업데이트
                                            await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);

                                            // 4. 새로운 Panel 컴포넌트 생성
                                            const { data: panelData, error: panelError } = await supabase
                                                .from('elements')
                                                .insert([newPanelElement])
                                                .select()
                                                .single();

                                            if (panelError) {
                                                console.error('Panel creation error:', panelError);
                                                return;
                                            }

                                            // 5. 상태 업데이트
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
                                    Disabled
                                </label>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Div':
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Content</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>Content</label>
                                <textarea
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = { ...selectedElementProps, children: e.target.value };
                                        await updateElementProps(selectedElementId, updatedProps);
                                    }}
                                    placeholder="Enter div content"
                                    rows={3}
                                />
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
                                <label className='control-label'>Content</label>
                                <textarea
                                    className='control-input'
                                    value={selectedElementProps.children || ''}
                                    onChange={async (e) => {
                                        const updatedProps = { ...selectedElementProps, children: e.target.value };
                                        await updateElementProps(selectedElementId, updatedProps);
                                    }}
                                    placeholder="Enter card content"
                                    rows={3}
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
                                            Delete Radio
                                        </button>
                                    </div>
                                </fieldset>
                            </>
                        ) : (
                            /* 전체 RadioGroup이 선택된 경우 */
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
                                    <legend className='fieldset-legend'>Selected Value</legend>
                                    <div className='react-aria-control react-aria-Group'>
                                        <label className='control-label'>
                                            <CheckCircle color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
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
                                    <legend className='fieldset-legend'>Radio Management</legend>

                                    <div className='tab-overview'>
                                        <p className='tab-overview-text'>
                                            Total radios: {selectedElementProps.children?.length || 0}
                                        </p>
                                        <p className='tab-overview-help'>
                                            💡 Select individual radios from tree to edit
                                        </p>
                                    </div>

                                    {/* 새 라디오버튼 추가 버튼 */}
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
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>DatePicker Settings</legend>

                            {/* Basic Properties */}
                            <div className='property-group'>
                                <label className='property-label'>Label</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.label || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        label: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Date Picker"
                                />
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Description</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.description || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        description: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Helper text"
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

                            <div className='property-group'>
                                <label className='property-label'>Placeholder</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.placeholder || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        placeholder: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Select date..."
                                />
                            </div>
                        </fieldset>

                        {/* State Properties */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>State & Behavior</legend>

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

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isRequired || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isRequired: checked
                                    })}
                                >
                                    Required
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isReadOnly || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isReadOnly: checked
                                    })}
                                >
                                    Read Only
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isInvalid || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isInvalid: checked
                                    })}
                                >
                                    Invalid
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.autoFocus || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        autoFocus: checked
                                    })}
                                >
                                    Auto Focus
                                </Checkbox>
                            </div>
                        </fieldset>

                        {/* UI Options */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>UI Options</legend>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.showCalendarIcon !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        showCalendarIcon: checked
                                    })}
                                >
                                    Show Calendar Icon
                                </Checkbox>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Icon Position</label>
                                <Select
                                    selectedKey={selectedElementProps.calendarIconPosition || 'right'}
                                    onSelectionChange={(value) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        calendarIconPosition: value
                                    })}
                                >
                                    <SelectItem id="left">Left</SelectItem>
                                    <SelectItem id="right">Right</SelectItem>
                                </Select>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.allowClear !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        allowClear: checked
                                    })}
                                >
                                    Allow Clear
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.highlightToday !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        highlightToday: checked
                                    })}
                                >
                                    Highlight Today
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.showWeekNumbers || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        showWeekNumbers: checked
                                    })}
                                >
                                    Show Week Numbers
                                </Checkbox>
                            </div>
                        </fieldset>

                        {/* Format & Behavior */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>Format & Behavior</legend>

                            <div className='property-group'>
                                <label className='property-label'>Granularity</label>
                                <Select
                                    selectedKey={
                                        ['day', 'hour', 'minute', 'second'].includes(selectedElementProps.granularity)
                                            ? selectedElementProps.granularity
                                            : 'day'
                                    }
                                    onSelectionChange={(value) => {
                                        if (['day', 'hour', 'minute', 'second'].includes(value)) { // 유효한 값만 허용
                                            updateElementProps(selectedElementId, {
                                                ...selectedElementProps,
                                                granularity: value
                                            });
                                        }
                                    }}
                                >
                                    <SelectItem id="day">Day</SelectItem>
                                    <SelectItem id="hour">Hour</SelectItem>
                                    <SelectItem id="minute">Minute</SelectItem>
                                    <SelectItem id="second">Second</SelectItem>
                                </Select>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>First Day of Week</label>
                                <Select
                                    selectedKey={String(
                                        (typeof selectedElementProps.firstDayOfWeek === 'number' &&
                                            selectedElementProps.firstDayOfWeek >= 0 &&
                                            selectedElementProps.firstDayOfWeek <= 6)
                                            ? selectedElementProps.firstDayOfWeek
                                            : 0
                                    )}
                                    onSelectionChange={(value) => {
                                        const dayNum = Number(value);
                                        if (dayNum >= 0 && dayNum <= 6) { // 안전한 범위 체크
                                            updateElementProps(selectedElementId, {
                                                ...selectedElementProps,
                                                firstDayOfWeek: dayNum
                                            });
                                        }
                                    }}
                                >
                                    <SelectItem id="0">Sunday</SelectItem>
                                    <SelectItem id="1">Monday</SelectItem>
                                    <SelectItem id="2">Tuesday</SelectItem>
                                    <SelectItem id="3">Wednesday</SelectItem>
                                    <SelectItem id="4">Thursday</SelectItem>
                                    <SelectItem id="5">Friday</SelectItem>
                                    <SelectItem id="6">Saturday</SelectItem>
                                </Select>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.shouldForceLeadingZeros !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        shouldForceLeadingZeros: checked
                                    })}
                                >
                                    Force Leading Zeros
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.shouldCloseOnSelect !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        shouldCloseOnSelect: checked
                                    })}
                                >
                                    Close on Select
                                </Checkbox>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'DateRangePicker':
                return (
                    <div className="component-props">
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>DateRangePicker Settings</legend>

                            {/* Basic Properties */}
                            <div className='property-group'>
                                <label className='property-label'>Label</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.label || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        label: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Date Range Picker"
                                />
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Description</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.description || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        description: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Helper text"
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

                            <div className='property-group'>
                                <label className='property-label'>Placeholder</label>
                                <input
                                    type="text"
                                    value={selectedElementProps.placeholder || ''}
                                    onChange={(e) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        placeholder: e.target.value
                                    })}
                                    className='property-input'
                                    placeholder="Select date range..."
                                />
                            </div>
                        </fieldset>

                        {/* State Properties */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>State & Behavior</legend>

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

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isRequired || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isRequired: checked
                                    })}
                                >
                                    Required
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isReadOnly || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isReadOnly: checked
                                    })}
                                >
                                    Read Only
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.isInvalid || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        isInvalid: checked
                                    })}
                                >
                                    Invalid
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.autoFocus || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        autoFocus: checked
                                    })}
                                >
                                    Auto Focus
                                </Checkbox>
                            </div>
                        </fieldset>

                        {/* UI Options */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>UI Options</legend>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.showCalendarIcon !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        showCalendarIcon: checked
                                    })}
                                >
                                    Show Calendar Icon
                                </Checkbox>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>Icon Position</label>
                                <Select
                                    selectedKey={selectedElementProps.calendarIconPosition || 'right'}
                                    onSelectionChange={(value) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        calendarIconPosition: value
                                    })}
                                >
                                    <SelectItem id="left">Left</SelectItem>
                                    <SelectItem id="right">Right</SelectItem>
                                </Select>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.allowClear !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        allowClear: checked
                                    })}
                                >
                                    Allow Clear
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.highlightToday !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        highlightToday: checked
                                    })}
                                >
                                    Highlight Today
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.showWeekNumbers || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        showWeekNumbers: checked
                                    })}
                                >
                                    Show Week Numbers
                                </Checkbox>
                            </div>
                        </fieldset>

                        {/* Format & Behavior */}
                        <fieldset className='property-fieldset'>
                            <legend className='fieldset-legend'>Format & Behavior</legend>

                            <div className='property-group'>
                                <label className='property-label'>Granularity</label>
                                <Select
                                    selectedKey={selectedElementProps.granularity || 'day'}
                                    onSelectionChange={(value) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        granularity: value
                                    })}
                                >
                                    <SelectItem id="day">Day</SelectItem>
                                    <SelectItem id="hour">Hour</SelectItem>
                                    <SelectItem id="minute">Minute</SelectItem>
                                    <SelectItem id="second">Second</SelectItem>
                                </Select>
                            </div>

                            <div className='property-group'>
                                <label className='property-label'>First Day of Week</label>
                                <Select
                                    selectedKey={String(selectedElementProps.firstDayOfWeek || 0)}
                                    onSelectionChange={(value) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        firstDayOfWeek: Number(value)
                                    })}
                                >
                                    <SelectItem id="0">Sunday</SelectItem>
                                    <SelectItem id="1">Monday</SelectItem>
                                    <SelectItem id="2">Tuesday</SelectItem>
                                    <SelectItem id="3">Wednesday</SelectItem>
                                    <SelectItem id="4">Thursday</SelectItem>
                                    <SelectItem id="5">Friday</SelectItem>
                                    <SelectItem id="6">Saturday</SelectItem>
                                </Select>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.shouldForceLeadingZeros !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        shouldForceLeadingZeros: checked
                                    })}
                                >
                                    Force Leading Zeros
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.shouldCloseOnSelect !== false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        shouldCloseOnSelect: checked
                                    })}
                                >
                                    Close on Select
                                </Checkbox>
                            </div>

                            <div className='property-row'>
                                <Checkbox
                                    isSelected={selectedElementProps.allowsNonContiguousRanges || false}
                                    onChange={(checked) => updateElementProps(selectedElementId, {
                                        ...selectedElementProps,
                                        allowsNonContiguousRanges: checked
                                    })}
                                >
                                    Allow Non-Contiguous Ranges
                                </Checkbox>
                            </div>
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