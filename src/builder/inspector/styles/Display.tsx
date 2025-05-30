import { Square, SquareDashed, ChevronUp, StretchHorizontal, StretchVertical, FoldHorizontal, FoldVertical, LaptopMinimal, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button, Select, SelectItem } from '../../components/list';
import { useStore } from '../../stores/elements';
import { ElementProps } from '../../../types/supabase';
import { supabase } from '../../../env/supabase.client';

import './index.css';


function Display() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

    // 선택된 요소가 없을 때의 처리
    if (!selectedElementId) {
        return <div>요소를 선택해주세요</div>;
    }

    return (
        <div>
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
                    <fieldset>
                        <legend className='alignment-legend'>Alignment</legend>
                        <div className='alignment-horizontal'>
                            <ToggleButtonGroup>
                                <ToggleButton><AlignStartVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignHorizontalJustifyCenter color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-vertical'>
                            <ToggleButtonGroup>
                                <ToggleButton><AlignStartHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignVerticalJustifyCenter color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-distribution'>
                            <Button>:</Button>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className='position-legend'>Size</legend>
                        <div className='position-width'>
                            <label className='position-label'>W</label>
                            <input
                                className='position-input'
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
                                    { id: 'auto', name: 'auto' },
                                    { id: 'px', name: 'px' },
                                    { id: '%', name: '%' },
                                    { id: 'vw', name: 'vw' }
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
                                {(item) => <SelectItem>{item.name}</SelectItem>}
                            </Select>
                        </div>
                        <div className='position-height'>
                            <label className='position-label'>H</label>
                            <input
                                className='position-input'
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
                                    { id: 'auto', name: 'auto' },
                                    { id: 'px', name: 'px' },
                                    { id: '%', name: '%' },
                                    { id: 'vh', name: 'vh' }
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
                                {(item) => <SelectItem>{item.name}</SelectItem>}
                            </Select>
                        </div>
                        <div className='position-distribution'>
                            <Button>:</Button>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className='position-legend'>Position</legend>
                        <div className='position-x'>
                            <label className='position-label'>X</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-y'>
                            <label className='position-label'>Y</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-distribution'>
                            <Button>:</Button>
                        </div>
                    </fieldset>
                </div>
            </div>

            <div className="inspect_display">
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
                    <fieldset className='direction'>
                        <legend className='alignment-legend'>Direction</legend>
                        <div className='alignment-horizontal'>
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
                                    <Scan color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="row">
                                    <StretchVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                                <ToggleButton id="column">
                                    <StretchHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} />
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='direction-alignment'>
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
                                <ToggleButton id="leftTop"><span className='brit' /></ToggleButton>
                                <ToggleButton id="centerTop"><span className='brit' /></ToggleButton>
                                <ToggleButton id="rightTop"><span className='brit' /></ToggleButton>
                                <ToggleButton id="leftCenter"><span className='brit' /></ToggleButton>
                                <ToggleButton id="centerCenter"><span className='brit' /></ToggleButton>
                                <ToggleButton id="rightCenter"><span className='brit' /></ToggleButton>
                                <ToggleButton id="leftBottom"><span className='brit' /></ToggleButton>
                                <ToggleButton id="centerBottom"><span className='brit' /></ToggleButton>
                                <ToggleButton id="rightBottom"><span className='brit' /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-distribution'>
                            <Button>:</Button>
                        </div>
                        <div className='direction-gap-horizontal'>
                            <label className='position-label'><FoldHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                        <div className='direction-gap-vertical'>
                            <label className='position-label'><FoldVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                    </fieldset>
                    <div className='space-distribution'>
                        <fieldset className='padding'>
                            <legend className='legend'>Padding</legend>
                            <div className='position-padding'>
                                <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <input className='position-input'></input>
                            </div>
                        </fieldset>
                        <fieldset className='margin'>
                            <legend className='legend'>Margin</legend>

                            <div className='position-margin'>
                                <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                                <input className='position-input'></input>
                            </div>
                        </fieldset>
                        <div className='position-distribution'>
                            <Button><SquareSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
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
                    <fieldset className='background'>
                        <legend className='space-legend'>Background</legend>
                        <div className='input-color'>
                            <label className='position-label'>
                                <Square fill={selectedElementProps.style?.backgroundColor || '#ffffff'} size={18} strokeWidth={0} />
                            </label>
                            <input
                                className='position-input'
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
                        <div className='position-distribution'>
                            <Button>:</Button>
                        </div>
                    </fieldset>

                    <fieldset className='borders'>
                        <legend className='space-legend'>Border</legend>
                        <div className='input-color'>
                            <label className='position-label'>
                                <Square fill={selectedElementProps.style?.borderColor || '#cccccc'} size={18} strokeWidth={0} />
                            </label>
                            <input
                                className='position-input'
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
                        <div className='input-width'>
                            <label className='position-label'>
                                <SquareDashed color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </label>
                            <input
                                className='position-input'
                                value={selectedElementProps.style?.borderWidth || '1px'}
                                onChange={(e) => {
                                    const updatedProps = {
                                        ...selectedElementProps,
                                        style: {
                                            ...selectedElementProps.style,
                                            borderWidth: e.target.value
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
                        <div className='position-distribution'>
                            <Button>:</Button>
                        </div>
                    </fieldset>

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
                    <fieldset>
                        <legend className='space-legend'>Font</legend>
                        <div className='input-select'>
                            <Select
                                items={[
                                    { id: 'Arial', name: 'Arial' },
                                    { id: 'Helvetica', name: 'Helvetica' },
                                    { id: 'Times New Roman', name: 'Times New Roman' },
                                    { id: 'Georgia', name: 'Georgia' },
                                    { id: 'Courier New', name: 'Courier New' },
                                    { id: 'Verdana', name: 'Verdana' }
                                ]}>
                                {(item) => <SelectItem>{item.name}</SelectItem>}
                            </Select>
                        </div>
                    </fieldset>
                </div>
            </div>


        </div>
    );
}

export default Display;