import { ChevronUp, StretchHorizontal, StretchVertical, FoldHorizontal, FoldVertical, LaptopMinimal, SquareSquare, Scan, AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button } from '../../components/list';

import './index.css';

function Display() {
    return (
        <div>
            <div className="inspect_page">
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
                            <ToggleButtonGroup>
                                <ToggleButton><Scan color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><StretchVertical color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><StretchHorizontal color={iconProps.color} size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
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
                    <h3 className='panel-title'>Shape</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
                <div className='panel-content'>
                    <fieldset className='padding'>
                        <legend className='space-legend'>Background</legend>
                        <div className='position-top'>
                            <label className='position-label'>T</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-right'>
                            <label className='position-label'>R</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-bottom'>
                            <label className='position-label'>B</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='position-left'>
                            <label className='position-label'>L</label>
                            <input className='position-input'></input>
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
            </div>


        </div>
    );
}

export default Display;