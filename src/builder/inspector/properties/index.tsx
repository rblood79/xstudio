import { Type, Square, SquareDashed, ChevronUp, EllipsisVertical, Frame, LayoutGrid, SquareDashedBottom, StretchHorizontal, StretchVertical, AlignHorizontalSpaceAround, GalleryHorizontal, SquareRoundCorner, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal, CheckSquare, Layout, PointerOff } from 'lucide-react';
import { useStore } from '../../stores/elements';
import { Button, Select, SelectItem } from '../../components/list';
import { supabase } from '../../../env/supabase.client';
import { EllipsisVertical } from 'lucide-react';
import { iconProps } from '../../constants';

import './index.css';

function Properties() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

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
                            <div className='aria-control aria-Group'>
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
                            <div className='aria-control aria-Group'>
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
                            <div className='aria-control aria-Group'>
                                <label className='control-label'>
                                    <CheckSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />

                                </label>
                                <Select
                                    items={[
                                        { id: 'single', name: 'Single' },
                                        { id: 'multiple', name: 'Multiple' }
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
                                    {(item) => <SelectItem>{item.name}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Layout</legend>
                            <div className='aria-control aria-Group'>
                                <label className='control-label'>
                                    <Layout color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />

                                </label>
                                <Select
                                    items={[
                                        { id: 'horizontal', name: 'Horizontal' },
                                        { id: 'vertical', name: 'Vertical' }
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
                                    {(item) => <SelectItem>{item.name}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>

                        <fieldset className="properties-aria">
                            <legend className='fieldset-legend'>Disabled</legend>
                            <div className='aria-control aria-Group'>
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
                            <div className='aria-control aria-Group'>
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
                            <div className='aria-control aria-Group'>
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
                            <div className='aria-control aria-Group'>
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