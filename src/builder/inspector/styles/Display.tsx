import { ChevronUp, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button } from '../../components/list';

import './index.css';

function Display() {
    return (
        <div>
            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Position</h3>
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
                                <ToggleButton><AlignStartVertical size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignCenterVertical size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndVertical size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-vertical'>
                            <ToggleButtonGroup>
                                <ToggleButton><AlignStartHorizontal size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignCenterHorizontal size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                                <ToggleButton><AlignEndHorizontal size={iconProps.size} strokeWidth={iconProps.stroke} /></ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-distribution'>
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
                    <h3 className='panel-title'>Display</h3>
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
                                <ToggleButton>D</ToggleButton>
                                <ToggleButton>L</ToggleButton>
                                <ToggleButton>R</ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='direction-alignment'>
                            <ToggleButtonGroup>
                                <ToggleButton>1</ToggleButton>
                                <ToggleButton>2</ToggleButton>
                                <ToggleButton>3</ToggleButton>
                                <ToggleButton>4</ToggleButton>
                                <ToggleButton>5</ToggleButton>
                                <ToggleButton>6</ToggleButton>
                                <ToggleButton>7</ToggleButton>
                                <ToggleButton>8</ToggleButton>
                                <ToggleButton>9</ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='alignment-distribution'>
                            <Button>:</Button>
                        </div>
                        <div className='direction-gap-horizontal'>
                            <label className='position-label'>G</label>
                            <input className='position-input'></input>
                        </div>
                        <div className='direction-gap-vertical'>
                            <label className='position-label'>G</label>
                            <input className='position-input'></input>
                        </div>

                    </fieldset>
                </div>
            </div>

            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Space</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>
            </div>

            <div className="inspect_page">
                <div className="panel-header">
                    <h3 className='panel-title'>Size</h3>
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