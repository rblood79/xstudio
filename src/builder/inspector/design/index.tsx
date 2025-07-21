import { Square, SquareDashed, ChevronUp, EllipsisVertical, Frame, LayoutGrid, SquareDashedBottom, StretchHorizontal, StretchVertical, AlignHorizontalSpaceAround, GalleryHorizontal, SquareRoundCorner, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button, Select, SelectItem } from '../../components/list';
import { useStore } from '../../stores/elements';
import { ElementProps } from '../../../types/supabase';
import { supabase } from '../../../env/supabase.client';

import './index.css';


function Design() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

    // 선택된 요소가 없을 때의 처리
    if (!selectedElementId) {
        return <div>요소를 선택해주세요</div>;
    }

    return (
        <div className='design-container'>
            <div className="inspect_page">
                <div className='tag'>{selectedElementProps.tag || 'No tag'}</div>
                <div className='testID'>testID: {selectedElementId}</div>
                <div className="panel-header">
                    <h3 className='panel-title'>Transform</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className='panel-content'>
                    <fieldset className="transform-alignment">
                        <legend className='fieldset-legend'>Alignment</legend>
                        <div className='alignment-controls-horizontal'>
                            <ToggleButtonGroup>
                                <ToggleButton><AlignStartVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignHorizontalJustifyCenter color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-controls-vertical'>
                            <ToggleButtonGroup>
                                <ToggleButton><AlignStartHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignVerticalJustifyCenter color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>

                    <fieldset className="transform-size">
                        <legend className='fieldset-legend'>Size</legend>
                        <div className='size-control-width react-aria-Group'>
                            <label className='control-label'>W</label>
                            <input
                                className='control-input'
                                type="text"
                                value={(() => {
                                    const width = selectedElementProps.style?.width || '';
                                    if (width === 'auto' || !width) return '';
                                    const match = String(width).match(/^(\d*\.?\d*)/);
                                    return match ? match[1] : '';
                                })()}
                                onChange={async (e) => {
                                    const numericValue = e.target.value;

                                    if (!selectedElementId) {
                                        console.error('No selected element ID');
                                        return;
                                    }

                                    let updatedProps;
                                    if (!numericValue) {
                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                width: 'auto'
                                            }
                                        };
                                    } else {
                                        // 현재 단위 추출 (기본값: px)
                                        const currentWidth = selectedElementProps.style?.width || '';
                                        let unit = 'px';
                                        if (currentWidth && currentWidth !== 'auto') {
                                            const unitMatch = String(currentWidth).match(/[a-z%]+$/i);
                                            if (unitMatch) unit = unitMatch[0];
                                        }

                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                width: `${numericValue}${unit}` as string
                                            }
                                        };
                                    }

                                    console.log('Updating element:', selectedElementId);
                                    console.log('Current props:', selectedElementProps);
                                    console.log('Updated props:', updatedProps);

                                    // Store 업데이트
                                    updateElementProps(selectedElementId, updatedProps);

                                    // Supabase 업데이트
                                    try {
                                        const { data, error } = await supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);

                                        if (error) {
                                            console.error('Supabase update error:', error);
                                            console.error('Error details:', error.details);
                                            console.error('Error hint:', error.hint);
                                        } else {
                                            console.log('Supabase update successful:', data);
                                        }
                                    } catch (err) {
                                        console.error('Unexpected error during Supabase update:', err);
                                    }
                                }}
                                placeholder="auto"
                            />
                            <Select
                                items={[
                                    { id: 'auto', label: 'auto' },
                                    { id: 'px', label: 'px' },
                                    { id: '%', label: '%' },
                                    { id: 'vw', label: 'vw' }
                                ]}
                                selectedKey={(() => {
                                    const width = selectedElementProps.style?.width || '';
                                    if (!width || width === 'auto') return 'auto';
                                    const unitMatch = String(width).match(/[a-z%]+$/i);
                                    return unitMatch ? unitMatch[0] : 'px';
                                })()}
                                onSelectionChange={async (key) => {
                                    const selectedUnit = key as string;

                                    if (!selectedElementId) {
                                        console.error('No selected element ID');
                                        return;
                                    }

                                    let updatedProps;
                                    if (selectedUnit === 'auto') {
                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                width: 'auto'
                                            }
                                        };
                                    } else {
                                        // 현재 숫자 값 추출
                                        const currentWidth = selectedElementProps.style?.width || '';
                                        let numericValue = '100'; // 기본값

                                        if (currentWidth && currentWidth !== 'auto') {
                                            const match = String(currentWidth).match(/^(\d*\.?\d*)/);
                                            if (match && match[1]) {
                                                numericValue = match[1];
                                            }
                                        }

                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                width: `${numericValue}${selectedUnit}` as string
                                            }
                                        };
                                    }

                                    console.log('Updating element:', selectedElementId);
                                    console.log('Current props:', selectedElementProps);
                                    console.log('Updated props:', updatedProps);

                                    // Store 업데이트
                                    updateElementProps(selectedElementId, updatedProps);

                                    // Supabase 업데이트
                                    try {
                                        const { data, error } = await supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);

                                        if (error) {
                                            console.error('Supabase update error:', error);
                                            console.error('Error details:', error.details);
                                            console.error('Error hint:', error.hint);
                                        } else {
                                            console.log('Supabase update successful:', data);
                                        }
                                    } catch (err) {
                                        console.error('Unexpected error during Supabase update:', err);
                                    }
                                }}
                            >
                                {(item) => <SelectItem>{item.label}</SelectItem>}
                            </Select>
                        </div>
                        <div className='size-control-height react-aria-Group'>
                            <label className='control-label'>H</label>
                            <input
                                className='control-input'
                                type="text"
                                value={(() => {
                                    const height = selectedElementProps.style?.height || '';
                                    if (height === 'auto' || !height) return '';
                                    const match = String(height).match(/^(\d*\.?\d*)/);
                                    return match ? match[1] : '';
                                })()}
                                onChange={async (e) => {
                                    const numericValue = e.target.value;

                                    if (!numericValue) {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                height: 'auto'
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                        return;
                                    }

                                    // 현재 단위 추출 (기본값: px)
                                    const currentHeight = selectedElementProps.style?.height || '';
                                    let unit = 'px';
                                    if (currentHeight && currentHeight !== 'auto') {
                                        const unitMatch = String(currentHeight).match(/[a-z%]+$/i);
                                        if (unitMatch) unit = unitMatch[0];
                                    }

                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            height: `${numericValue}${unit}`
                                        }
                                    };
                                    updateElementProps(selectedElementId, updatedProps);
                                    supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                }}
                                placeholder="auto"
                            />
                            <Select
                                items={[
                                    { id: 'auto', label: 'auto' },
                                    { id: 'px', label: 'px' },
                                    { id: '%', label: '%' },
                                    { id: 'vh', label: 'vh' }
                                ]}
                                selectedKey={(() => {
                                    const height = selectedElementProps.style?.height || '';
                                    if (!height || height === 'auto') return 'auto';
                                    const unitMatch = String(height).match(/[a-z%]+$/i);
                                    return unitMatch ? unitMatch[0] : 'px';
                                })()}
                                onSelectionChange={async (key) => {
                                    const selectedUnit = key as string;

                                    if (!selectedElementId) {
                                        console.error('No selected element ID');
                                        return;
                                    }

                                    let updatedProps;
                                    if (selectedUnit === 'auto') {
                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                height: 'auto'
                                            }
                                        };
                                    } else {
                                        // 현재 숫자 값 추출
                                        const currentHeight = selectedElementProps.style?.height || '';
                                        let numericValue = '100'; // 기본값

                                        if (currentHeight && currentHeight !== 'auto') {
                                            const match = String(currentHeight).match(/^(\d*\.?\d*)/);
                                            if (match && match[1]) {
                                                numericValue = match[1];
                                            }
                                        }

                                        updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                height: `${numericValue}${selectedUnit}` as string
                                            }
                                        };
                                    }

                                    console.log('Updating element:', selectedElementId);
                                    console.log('Current props:', selectedElementProps);
                                    console.log('Updated props:', updatedProps);

                                    // Store 업데이트
                                    updateElementProps(selectedElementId, updatedProps);

                                    // Supabase 업데이트
                                    try {
                                        const { data, error } = await supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);

                                        if (error) {
                                            console.error('Supabase update error:', error);
                                            console.error('Error details:', error.details);
                                            console.error('Error hint:', error.hint);
                                        } else {
                                            console.log('Supabase update successful:', data);
                                        }
                                    } catch (err) {
                                        console.error('Unexpected error during Supabase update:', err);
                                    }
                                }}
                            >
                                {(item) => <SelectItem>{item.label}</SelectItem>}
                            </Select>
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>

                    <fieldset className="transform-position">
                        <legend className='fieldset-legend'>Position</legend>
                        <div className='position-control-x react-aria-Group'>
                            <label className='control-label'>X</label>
                            <input className='control-input'></input>
                        </div>
                        <div className='position-control-y react-aria-Group'>
                            <label className='control-label'>Y</label>
                            <input className='control-input'></input>
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>
                </div>
            </div>

            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Layout</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className='panel-content'>
                    <fieldset className="layout-direction">
                        <legend className='fieldset-legend'>Direction</legend>
                        <div className='direction-controls'>
                            <ToggleButtonGroup
                                aria-label="Flex direction"
                                onSelectionChange={(selectedKey) => {
                                    if (!selectedElementId) return;
                                    const key = Array.from(selectedKey)[0] as string;

                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            ...(key === 'reset'
                                                ? { display: undefined, flexDirection: undefined }
                                                : {
                                                    display: 'flex',
                                                    flexDirection: key as 'row' | 'column'
                                                }
                                            )
                                        }
                                    };

                                    // Store 업데이트
                                    updateElementProps(selectedElementId, updatedProps);

                                    // Supabase 업데이트
                                    supabase
                                        .from("elements")
                                        .update({ props: updatedProps })
                                        .eq("id", selectedElementId)
                                        .then(({ error }) => {
                                            if (error) {
                                                console.error("Supabase update error:", error);
                                            }
                                        });
                                }}
                                selectedKeys={new Set([
                                    selectedElementProps.style?.display === 'flex'
                                        ? selectedElementProps.style?.flexDirection || 'row'
                                        : 'reset'
                                ])}
                            >
                                <ToggleButton id="reset">
                                    <Square color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="row">
                                    <StretchVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="column">
                                    <StretchHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='direction-alignment-grid'>
                            <ToggleButtonGroup
                                aria-label="Flex alignment"
                                onSelectionChange={(selectedKey) => {
                                    if (!selectedElementId) return;
                                    const key = Array.from(selectedKey)[0] as string;

                                    const isColumn = selectedElementProps.style?.flexDirection === 'column';
                                    const alignmentMap: Record<string, { alignItems: string, justifyContent: string }> = {
                                        'leftTop': {
                                            alignItems: isColumn ? 'flex-start' : 'flex-start',
                                            justifyContent: isColumn ? 'flex-start' : 'flex-start'
                                        },
                                        'centerTop': {
                                            alignItems: isColumn ? 'center' : 'flex-start',
                                            justifyContent: isColumn ? 'flex-start' : 'center'
                                        },
                                        'rightTop': {
                                            alignItems: isColumn ? 'flex-end' : 'flex-start',
                                            justifyContent: isColumn ? 'flex-start' : 'flex-end'
                                        },
                                        'leftCenter': {
                                            alignItems: isColumn ? 'flex-start' : 'center',
                                            justifyContent: isColumn ? 'center' : 'flex-start'
                                        },
                                        'centerCenter': {
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        },
                                        'rightCenter': {
                                            alignItems: isColumn ? 'flex-end' : 'center',
                                            justifyContent: isColumn ? 'center' : 'flex-end'
                                        },
                                        'leftBottom': {
                                            alignItems: isColumn ? 'flex-start' : 'flex-end',
                                            justifyContent: isColumn ? 'flex-end' : 'flex-start'
                                        },
                                        'centerBottom': {
                                            alignItems: isColumn ? 'center' : 'flex-end',
                                            justifyContent: isColumn ? 'flex-end' : 'center'
                                        },
                                        'rightBottom': {
                                            alignItems: isColumn ? 'flex-end' : 'flex-end',
                                            justifyContent: isColumn ? 'flex-end' : 'flex-end'
                                        }
                                    };

                                    const alignment = alignmentMap[key];
                                    if (!alignment) return;

                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            display: 'flex',
                                            alignItems: alignment.alignItems,
                                            justifyContent: alignment.justifyContent
                                        }
                                    };

                                    // Store 업데이트
                                    updateElementProps(selectedElementId, updatedProps);

                                    // Supabase 업데이트
                                    supabase
                                        .from("elements")
                                        .update({ props: updatedProps })
                                        .eq("id", selectedElementId)
                                        .then(({ error }) => {
                                            if (error) {
                                                console.error("Supabase update error:", error);
                                            }
                                        });
                                }}
                                selectedKeys={(() => {
                                    if (selectedElementProps.style?.display !== 'flex') return new Set(['centerCenter']);

                                    const isColumn = selectedElementProps.style?.flexDirection === 'column';
                                    const alignItems = selectedElementProps.style?.alignItems || 'center';
                                    const justifyContent = selectedElementProps.style?.justifyContent || 'center';

                                    const getPositionKey = (align: string, justify: string) => {
                                        if (isColumn) {
                                            // column일 때는 alignItems가 수평, justifyContent가 수직
                                            const horizontal = align === 'flex-start' ? 'left' : align === 'flex-end' ? 'right' : 'center';
                                            const vertical = justify === 'flex-start' ? 'top' : justify === 'flex-end' ? 'bottom' : 'center';
                                            return `${horizontal}${vertical.charAt(0).toUpperCase() + vertical.slice(1)}`;
                                        } else {
                                            // row일 때는 justifyContent가 수평, alignItems가 수직
                                            const horizontal = justify === 'flex-start' ? 'left' : justify === 'flex-end' ? 'right' : 'center';
                                            const vertical = align === 'flex-start' ? 'top' : align === 'flex-end' ? 'bottom' : 'center';
                                            return `${horizontal}${vertical.charAt(0).toUpperCase() + vertical.slice(1)}`;
                                        }
                                    };

                                    return new Set([getPositionKey(alignItems, justifyContent)]);
                                })()}
                            >
                                <ToggleButton id="leftTop"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="centerTop"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="rightTop"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="leftCenter"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="centerCenter"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="rightCenter"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="leftBottom"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="centerBottom"><span className='alignment-dot' /></ToggleButton>
                                <ToggleButton id="rightBottom"><span className='alignment-dot' /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                        <div className='justify-control'>
                            <ToggleButtonGroup
                                aria-label="Justify content alignment"
                                onSelectionChange={(selected) => {
                                    if (!selectedElementId) return;
                                    const key = Array.from(selected)[0] as string;
                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            display: 'flex',
                                            ...(key === 'class' ? { justifyContent: undefined } : { justifyContent: key })
                                        }
                                    };
                                    updateElementProps(selectedElementId, updatedProps);
                                    supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                }}
                                selectedKeys={new Set([
                                    selectedElementProps.style?.display === 'flex'
                                        ? selectedElementProps.style?.justifyContent || 'class'
                                        : 'class'
                                ])}
                            >
                                <ToggleButton id="space-around">
                                    <AlignHorizontalSpaceAround color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="space-between">
                                    <GalleryHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="space-evenly">
                                    <AlignHorizontalSpaceAround color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='gap-control react-aria-Group'>
                            <label className='control-label'><LayoutGrid color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='control-input'></input>
                            <Select
                                items={[
                                    { id: 'class', label: 'class' },
                                    { id: '0', label: '0' },
                                    { id: '2', label: '2' },
                                    { id: '4', label: '4' },
                                ]}
                                selectedKey={(() => {
                                    const gap = selectedElementProps.style?.gap || '0px';
                                    return gap.replace('px', '');
                                })()}
                                aria-label="Gap value selector"
                                onSelectionChange={(selected) => {
                                    if (!selectedElementId) return;
                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            ...(selected === 'class' ? { gap: undefined } : { gap: `${selected}px` })
                                        }
                                    };
                                    updateElementProps(selectedElementId, updatedProps);
                                    supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                }}
                            >
                                {(item) => <SelectItem>{item.label}</SelectItem>}
                            </Select>
                        </div>
                    </fieldset>

                    <div className='spacing-controls-container'>
                        <fieldset className='spacing-padding'>
                            <legend className='fieldset-legend'>Padding</legend>
                            <div className='spacing-control react-aria-Group'>
                                <label className='control-label'><SquareSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <input
                                    className='control-input'
                                    value={(() => {
                                        const padding = selectedElementProps.style?.padding || '0px';
                                        return padding.replace('px', '');
                                    })()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(value === 'class' ? { padding: undefined } : { padding: `${value}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                                <Select
                                    items={[
                                        { id: 'class', label: 'class' },
                                        { id: '0', label: '0' },
                                        { id: '2', label: '2' },
                                        { id: '4', label: '4' },
                                        { id: '8', label: '8' },
                                        { id: '16', label: '16' },
                                        { id: '32', label: '32' },
                                        { id: '64', label: '64' },
                                    ]}
                                    selectedKey={(() => {
                                        const padding = selectedElementProps.style?.padding || '0px';
                                        const paddingValue = padding.replace('px', '');
                                        if (isNaN(Number(paddingValue))) return 'class';
                                        return paddingValue;
                                    })()}
                                    aria-label="Padding value selector"
                                    onSelectionChange={(selected) => {
                                        if (!selectedElementId) return;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(selected === 'class' ? { padding: undefined } : { padding: `${selected}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                        <fieldset className='spacing-margin'>
                            <legend className='fieldset-legend'>Margin</legend>
                            <div className='spacing-control react-aria-Group'>
                                <label className='control-label'><Frame color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <input
                                    className='control-input'
                                    value={(() => {
                                        const margin = selectedElementProps.style?.margin || '0px';
                                        return margin.replace('px', '');
                                    })()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(value === 'class' ? { margin: undefined } : { margin: `${value}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                                <Select
                                    items={[
                                        { id: 'class', label: 'class' },
                                        { id: '0', label: '0' },
                                        { id: '2', label: '2' },
                                        { id: '4', label: '4' },
                                        { id: '8', label: '8' },
                                        { id: '16', label: '16' },
                                        { id: '32', label: '32' },
                                        { id: '64', label: '64' },
                                    ]}
                                    selectedKey={(() => {
                                        const margin = selectedElementProps.style?.margin || '0px';
                                        const marginValue = margin.replace('px', '');
                                        if (isNaN(Number(marginValue))) return 'class';
                                        return marginValue;
                                    })()}
                                    aria-label="Margin value selector"
                                    onSelectionChange={(selected) => {
                                        if (!selectedElementId) return;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(selected === 'class' ? { margin: undefined } : { margin: `${selected}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Style</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className='panel-content'>
                    <fieldset className='style-background'>
                        <legend className='fieldset-legend'>Background</legend>
                        <div className='color-control react-aria-Group'>
                            <label className='control-label'>
                                <Square fill={selectedElementProps.style?.backgroundColor || '#ffffff'} size={18} strokeWidth={0} />
                            </label>
                            <input
                                className='control-input'
                                value={selectedElementProps.style?.backgroundColor || '#ffffff'}
                                onChange={(e) => {
                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            backgroundColor: e.target.value
                                        }
                                    };
                                    updateElementProps(selectedElementId, updatedProps);
                                    supabase
                                        .from('elements')
                                        .update({ props: updatedProps })
                                        .eq('id', selectedElementId);
                                }}
                            />
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>
                    <div className='border-controls-container'>
                        <fieldset className='style-border'>
                            <legend className='fieldset-legend'>Border Color</legend>
                            <div className='color-control react-aria-Group'>
                                <label className='control-label'>
                                    <Square fill={selectedElementProps.style?.borderColor || '#cccccc'} size={18} strokeWidth={0} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.style?.borderColor || '#cccccc'}
                                    onChange={(e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                borderColor: e.target.value
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                            </div>

                        </fieldset>
                        <fieldset className='style-border-width'>
                            <legend className='fieldset-legend'>Border Width</legend>

                            <div className='border-width-control react-aria-Group'>
                                <label className='control-label'>
                                    <SquareDashed color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </label>
                                <input
                                    className='control-input'
                                    value={(() => {
                                        const borderWidth = selectedElementProps.style?.borderWidth || '0px';
                                        return borderWidth.replace('px', '');
                                    })()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(value === 'class' ? { borderWidth: undefined } : { borderWidth: `${value}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                                <Select
                                    items={[
                                        { id: 'class', label: 'class' },
                                        { id: '0', label: '0' },
                                        { id: '1', label: '1' },
                                        { id: '2', label: '2' },
                                        { id: '4', label: '4' },
                                        { id: '8', label: '8' },
                                        { id: '16', label: '16' }
                                    ]}
                                    selectedKey={(() => {
                                        const borderWidth = selectedElementProps.style?.borderWidth || '0px';
                                        const borderValue = borderWidth.replace('px', '');
                                        if (isNaN(Number(borderValue))) return 'class';
                                        return borderValue;
                                    })()}
                                    aria-label="Border width selector"
                                    onSelectionChange={(selected) => {
                                        if (selected) {
                                            const updatedProps = {
                                                ...selectedElementProps,
                                                style: {
                                                    ...selectedElementProps.style,
                                                    ...(selected === 'class' ? { borderWidth: undefined } : { borderWidth: `${selected}px` })
                                                }
                                            };
                                            updateElementProps(selectedElementId, updatedProps);
                                            supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                        <fieldset className='style-border-radius'>
                            <legend className='fieldset-legend'>Border Radius</legend>
                            <div className='border-radius-control react-aria-Group'>
                                <label className='control-label'>
                                    <SquareRoundCorner color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.style?.borderRadius || '0px'}
                                    onChange={(e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                borderRadius: e.target.value
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                                <Select
                                    items={[
                                        { id: 'class', label: 'class' },
                                        { id: '0', label: '0' },
                                        { id: '2', label: '2' },
                                        { id: '4', label: '4' },
                                        { id: '8', label: '8' },
                                        { id: '16', label: '16' }
                                    ]}
                                    selectedKey={(() => {
                                        const borderRadius = selectedElementProps.style?.borderRadius || '0px';
                                        const radiusValue = borderRadius.replace('px', '');
                                        if (isNaN(Number(radiusValue))) return 'class';
                                        return radiusValue;
                                    })()}
                                    aria-label="Border radius selector"
                                    onSelectionChange={async (selected) => {
                                        if (!selectedElementId) return;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(selected === 'class' ? { borderRadius: undefined } : { borderRadius: `${selected}px` })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            const { error } = await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                            if (error) {
                                                console.error('Supabase update error:', error);
                                            }
                                        } catch (err) {
                                            console.error('Unexpected error during Supabase update:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                        <fieldset className='style-border-style'>
                            <legend className='fieldset-legend'>Border Style</legend>
                            <div className='border-style-control react-aria-Group'>
                                <label className='control-label'>
                                    <SquareDashedBottom color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                                </label>
                                <input
                                    className='control-input'
                                    value={selectedElementProps.style?.borderStyle || 'solid'}
                                    onChange={(e) => {
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                borderStyle: e.target.value
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        supabase
                                            .from('elements')
                                            .update({ props: updatedProps })
                                            .eq('id', selectedElementId);
                                    }}
                                />
                                <Select
                                    items={[
                                        { id: 'class', label: 'class' },
                                        { id: 'solid', label: 'solid' },
                                        { id: 'dashed', label: 'dashed' },
                                        { id: 'dotted', label: 'dotted' },
                                        { id: 'double', label: 'double' }
                                    ]}
                                    selectedKey={selectedElementProps.style?.borderStyle || 'class'}
                                    aria-label="Border style selector"
                                    onSelectionChange={async (selected) => {
                                        if (!selectedElementId) return;
                                        const updatedProps = {
                                            ...selectedElementProps,
                                            style: {
                                                ...selectedElementProps.style,
                                                ...(selected === 'class' ? { borderStyle: undefined } : { borderStyle: selected })
                                            }
                                        };
                                        updateElementProps(selectedElementId, updatedProps);
                                        try {
                                            const { error } = await supabase
                                                .from('elements')
                                                .update({ props: updatedProps })
                                                .eq('id', selectedElementId);
                                            if (error) {
                                                console.error('Supabase update error:', error);
                                            }
                                        } catch (err) {
                                            console.error('Unexpected error during Supabase update:', err);
                                        }
                                    }}
                                >
                                    {(item) => <SelectItem>{item.label}</SelectItem>}
                                </Select>
                            </div>
                        </fieldset>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </div>


                </div>
            </div>

            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Text</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className='panel-content'>
                    <fieldset className="typography-font">
                        <legend className='fieldset-legend'>Font</legend>
                        <div className='font-select-control react-aria-Group'>
                            <Select
                                items={[
                                    { id: 'Arial', label: 'Arial' },
                                    { id: 'Helvetica', label: 'Helvetica' },
                                    { id: 'Times New Roman', label: 'Times New Roman' },
                                    { id: 'Georgia', label: 'Georgia' },
                                    { id: 'Courier New', label: 'Courier New' },
                                    { id: 'Verdana', label: 'Verdana' }
                                ]}>
                                {(item) => <SelectItem>{item.label}</SelectItem>}
                            </Select>
                        </div>
                        <div className='fieldset-actions'>
                            <Button><EllipsisVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>
                </div>
            </div>


        </div>
    );
}

export default Design;