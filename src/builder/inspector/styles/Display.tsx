import { ChevronUp } from 'lucide-react';
import { iconProps } from '../../constants';
import { ToggleButton, ToggleButtonGroup, Button } from '../../components/list.ts';

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
                        <legend className='position-legend'>Alignment</legend>
                        <div className='position-horizontal'>
                            <ToggleButtonGroup>
                                <ToggleButton>L</ToggleButton>
                                <ToggleButton>M</ToggleButton>
                                <ToggleButton>R</ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                        <div className='position-vertical'>
                            <ToggleButtonGroup>
                                <ToggleButton>T</ToggleButton>
                                <ToggleButton>C</ToggleButton>
                                <ToggleButton>B</ToggleButton>
                            </ToggleButtonGroup>
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
                <div>
                    <fieldset>
                        <legend className='legend'>Display Settings</legend>
                    </fieldset>
                    <div className="display-options">
                        <label htmlFor="option1">Option 1</label>
                        <input type="checkbox" id="option1" />
                        <label htmlFor="option2">Option 2</label>
                        <input type="checkbox" id="option2" />
                    </div>
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