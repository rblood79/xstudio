import { Square, SquareDashed, ChevronUp, StretchHorizontal, StretchVertical, FoldHorizontal, FoldVertical, LaptopMinimal, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button, Select, SelectItem } from '../../components/list';
import { useStore } from '../../stores/elements';
import { ElementProps } from '../../../types/supabase';
import { supabase } from '../../../env/supabase.client';

import './index.css';

function Display() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

    // 스타일 업데이트 핸들러
    const handleStyleUpdate = (styleKey: keyof ElementProps['style'], value: string | number) => {
        if (!selectedElementId) return;

        const updatedProps = {
            ...selectedElementProps,
            style: {
                ...selectedElementProps.style,
                [styleKey]: value
            }
        };

        updateElementProps(selectedElementId, updatedProps);

        // Supabase 업데이트 추가
        supabase
            .from("elements")
            .update({ props: updatedProps })
            .eq("id", selectedElementId)
            .then(({ error }) => {
                if (error) {
                    console.error("Supabase update error:", error);
                }
            });
    };

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
                        <div className='position-x'>
                            <label className='position-label'>W</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-y'>
                            <label className='position-label'>H</label>
                            <input className='position-input'></input>
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

                                    updateElementProps(selectedElementId, updatedProps);
                                    supabase
                                        .from("elements")
                                        .update({ props: updatedProps })
                                        .eq("id", selectedElementId);
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
                            <ToggleButtonGroup>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
                                <ToggleButton><span className='brit' /></ToggleButton>
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
                    <fieldset className='padding'>
                        <legend className='space-legend'>Padding</legend>
                        <div className='position-top'>
                            <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-right'>
                            <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-bottom'>
                            <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-left'>
                            <label className='position-label'><LaptopMinimal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-distribution'>
                            <Button><SquareSquare color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></Button>
                        </div>
                    </fieldset>
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
                                onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
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
                                onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                            />
                        </div>
                        <div className='input-width'>
                            <label className='position-label'>
                                <SquareDashed color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            </label>
                            <input
                                className='position-input'
                                value={selectedElementProps.style?.borderWidth || '1px'}
                                onChange={(e) => handleStyleUpdate('borderWidth', e.target.value)}
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