import { ListTodo, Type, RotateCwSquare, Binary, TriangleRight, Square, SquareDashed, ChevronUp, EllipsisVertical, Frame, LayoutGrid, SquareDashedBottom, StretchHorizontal, StretchVertical, AlignHorizontalSpaceAround, GalleryHorizontal, SquareRoundCorner, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal, CheckSquare, Layout, PointerOff, AppWindow } from 'lucide-react';
import { useStore } from '../../stores/elements';
import { Button, Select, SelectItem } from '../../components/list';
import { supabase } from '../../../env/supabase.client';
import { EllipsisVertical } from 'lucide-react';
import { iconProps } from '../../constants';
import { useState, useRef, useEffect } from 'react';

import './index.css';

function Properties() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

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
                return (
                    <div className="component-props">
                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Selection</legend>
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
                            <legend className='fieldset-legend'>Layout</legend>
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
                    </div>
                );

            case 'TextField':
                return (
                    <div className="component-props">
                        <div className="prop-group">
                            <label className="prop-label">Label</label>
                            <input
                                className="prop-input"
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
                        <div className="prop-group">
                            <label className="prop-label">Disabled</label>
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

            case 'ListBox':
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
                            <legend className='fieldset-legend'>Orientation</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'>
                                    <RotateCwSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
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
                            <legend className='fieldset-legend'>Layout</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <Select
                                    items={[
                                        { id: 'default', label: 'Default' },
                                        { id: 'compact', label: 'Compact' },
                                        { id: 'detailed', label: 'Detailed' },
                                        { id: 'grid', label: 'Grid' }
                                    ]}
                                    selectedKey={selectedElementProps.itemLayout || 'default'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            itemLayout: selected
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
                            <legend className='fieldset-legend'>Items</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><ListTodo color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <div className="json-input-container">
                                    <textarea
                                        className={`control-input ${jsonError ? 'json-error' : ''}`}
                                        rows={10}
                                        value={jsonInputValue}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setJsonInputValue(value);

                                            if (!value.trim()) {
                                                setJsonError(null);
                                                return;
                                            }

                                            try {
                                                const parsed = JSON.parse(value);
                                                setJsonError(null);

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    items: parsed
                                                };
                                                updateElementProps(selectedElementId, updatedProps);

                                                clearTimeout(jsonUpdateTimeout.current);
                                                jsonUpdateTimeout.current = setTimeout(async () => {
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('DB Update error:', err);
                                                    }
                                                }, 1000);

                                            } catch (err) {
                                                setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
                                            }
                                        }}
                                        onBlur={async () => {
                                            if (!jsonError && jsonInputValue.trim()) {
                                                try {
                                                    const parsed = JSON.parse(jsonInputValue);
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        items: parsed
                                                    };

                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Final save error:', err);
                                                }
                                            }
                                        }}
                                        placeholder={`[
  {
    "id": "1",
    "type": "simple",
    "text": "Item 1"
  },
  {
    "id": "2", 
    "type": "complex",
    "label": "Item 2",
    "description": "Description here"
  }
]`}
                                    />
                                    {jsonError && (
                                        <div className="json-error-message">
                                            <span className="error-icon">⚠️</span>
                                            {jsonError}
                                        </div>
                                    )}
                                    <div className="json-help">
                                        <small>
                                            유효한 JSON 배열을 입력하세요. 각 item은 id가 필요합니다.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'GridList':
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
                            <legend className='fieldset-legend'>Layout</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <Select
                                    items={[
                                        { id: 'default', label: 'Default' },
                                        { id: 'compact', label: 'Compact' },
                                        { id: 'detailed', label: 'Detailed' },
                                        { id: 'grid', label: 'Grid' }
                                    ]}
                                    selectedKey={selectedElementProps.itemLayout || 'default'}
                                    onSelectionChange={async (selected) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            itemLayout: selected
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
                            <legend className='fieldset-legend'>Items</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><ListTodo color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <div className="json-input-container">
                                    <textarea
                                        className={`control-input ${jsonError ? 'json-error' : ''}`}
                                        rows={10}
                                        value={jsonInputValue}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setJsonInputValue(value);

                                            if (!value.trim()) {
                                                setJsonError(null);
                                                return;
                                            }

                                            try {
                                                const parsed = JSON.parse(value);
                                                setJsonError(null);

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    items: parsed
                                                };
                                                updateElementProps(selectedElementId, updatedProps);

                                                clearTimeout(jsonUpdateTimeout.current);
                                                jsonUpdateTimeout.current = setTimeout(async () => {
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('DB Update error:', err);
                                                    }
                                                }, 1000);

                                            } catch (err) {
                                                setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
                                            }
                                        }}
                                        onBlur={async () => {
                                            if (!jsonError && jsonInputValue.trim()) {
                                                try {
                                                    const parsed = JSON.parse(jsonInputValue);
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        items: parsed
                                                    };

                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Final save error:', err);
                                                }
                                            }
                                        }}
                                        placeholder={`[
  {
    "id": "1",
    "type": "simple",
    "text": "Item 1"
  },
  {
    "id": "2", 
    "type": "complex",
    "label": "Item 2",
    "description": "Description here"
  }
]`}
                                    />
                                    {jsonError && (
                                        <div className="json-error-message">
                                            <span className="error-icon">⚠️</span>
                                            {jsonError}
                                        </div>
                                    )}
                                    <div className="json-help">
                                        <small>
                                            유효한 JSON 배열을 입력하세요. 각 item은 id가 필요합니다.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'Select':
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
                            <legend className='fieldset-legend'>Items</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><ListTodo color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <div className="json-input-container">
                                    <textarea
                                        className={`control-input ${jsonError ? 'json-error' : ''}`}
                                        rows={10}
                                        value={jsonInputValue}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setJsonInputValue(value);

                                            if (!value.trim()) {
                                                setJsonError(null);
                                                return;
                                            }

                                            try {
                                                const parsed = JSON.parse(value);
                                                setJsonError(null);

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    items: parsed
                                                };
                                                updateElementProps(selectedElementId, updatedProps);

                                                clearTimeout(jsonUpdateTimeout.current);
                                                jsonUpdateTimeout.current = setTimeout(async () => {
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('DB Update error:', err);
                                                    }
                                                }, 1000);

                                            } catch (err) {
                                                setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
                                            }
                                        }}
                                        onBlur={async () => {
                                            if (!jsonError && jsonInputValue.trim()) {
                                                try {
                                                    const parsed = JSON.parse(jsonInputValue);
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        items: parsed
                                                    };

                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Final save error:', err);
                                                }
                                            }
                                        }}
                                        placeholder={`[
  {
    "id": "1",
    "type": "simple",
    "text": "Option 1"
  },
  {
    "id": "2", 
    "type": "complex",
    "label": "Option 2",
    "description": "Description here"
  }
]`}
                                    />
                                    {jsonError && (
                                        <div className="json-error-message">
                                            <span className="error-icon">⚠️</span>
                                            {jsonError}
                                        </div>
                                    )}
                                    <div className="json-help">
                                        <small>
                                            유효한 JSON 배열을 입력하세요. 각 item은 id가 필요합니다.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                );

            case 'ComboBox':
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
                            <legend className='fieldset-legend'>Items</legend>
                            <div className='react-aria-control react-aria-Group'>
                                <label className='control-label'><ListTodo color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <div className="json-input-container">
                                    <textarea
                                        className={`control-input ${jsonError ? 'json-error' : ''}`}
                                        rows={10}
                                        value={jsonInputValue}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setJsonInputValue(value);

                                            if (!value.trim()) {
                                                setJsonError(null);
                                                return;
                                            }

                                            try {
                                                const parsed = JSON.parse(value);
                                                setJsonError(null);

                                                const updatedProps = {
                                                    ...selectedElementProps,
                                                    items: parsed
                                                };
                                                updateElementProps(selectedElementId, updatedProps);

                                                clearTimeout(jsonUpdateTimeout.current);
                                                jsonUpdateTimeout.current = setTimeout(async () => {
                                                    try {
                                                        await supabase
                                                            .from('elements')
                                                            .update({ props: updatedProps })
                                                            .eq('id', selectedElementId);
                                                    } catch (err) {
                                                        console.error('DB Update error:', err);
                                                    }
                                                }, 1000);

                                            } catch (err) {
                                                setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
                                            }
                                        }}
                                        onBlur={async () => {
                                            if (!jsonError && jsonInputValue.trim()) {
                                                try {
                                                    const parsed = JSON.parse(jsonInputValue);
                                                    const updatedProps = {
                                                        ...selectedElementProps,
                                                        items: parsed
                                                    };

                                                    await supabase
                                                        .from('elements')
                                                        .update({ props: updatedProps })
                                                        .eq('id', selectedElementId);
                                                } catch (err) {
                                                    console.error('Final save error:', err);
                                                }
                                            }
                                        }}
                                        placeholder={`[
  {
    "id": "1",
    "type": "simple",
    "text": "Option 1"
  },
  {
    "id": "2", 
    "type": "complex",
    "label": "Option 2",
    "description": "Description here"
  }
]`}
                                    />
                                    {jsonError && (
                                        <div className="json-error-message">
                                            <span className="error-icon">⚠️</span>
                                            {jsonError}
                                        </div>
                                    )}
                                    <div className="json-help">
                                        <small>
                                            유효한 JSON 배열을 입력하세요. 각 item은 id가 필요합니다.
                                        </small>
                                    </div>
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

                            {/* 탭 목록 표시 */}
                            <div className='tab-list-manager'>
                                {selectedElementProps.children?.map((tab: any, index: number) => (
                                    <div key={tab.id} className='tab-item'>
                                        <input
                                            className='control-input'
                                            placeholder='Tab Title'
                                            value={tab.title || ''}
                                            onChange={async (e) => {
                                                const updatedChildren = [...(selectedElementProps.children || [])];
                                                updatedChildren[index] = {
                                                    ...updatedChildren[index],
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
                                        <button
                                            className='control-button delete'
                                            onClick={async () => {
                                                const updatedChildren = selectedElementProps.children?.filter((_: any, i: number) => i !== index) || [];
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
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* 새 탭 추가 버튼 */}
                            <div className='react-aria-control react-aria-Group'>
                                <button
                                    className='control-button add'
                                    onClick={async () => {
                                        const newTabId = `tab${Date.now()}`;
                                        const newTab = {
                                            id: newTabId,
                                            title: `New Tab`,
                                            content: 'New tab content'
                                        };
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            children: [...(selectedElementProps.children || []), newTab]
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
                                    Add New Tab
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