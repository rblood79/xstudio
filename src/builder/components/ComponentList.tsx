import { ChevronUp, Square, Code, Text, ToggleLeft, AppWindow, InspectionPanel, SlidersHorizontal, MousePointer, Tag, Info, CalendarCheck, RectangleEllipsis, Calendar, ListTree, Menu, GroupIcon, ListIcon, Grid, TableProperties, SquareCheck, ChevronDown, Search } from 'lucide-react';
import { iconProps } from '../../builder/constants';
import './ComponentList.css';
// import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError, Checkbox, CheckboxGroup } from '../components/list';

interface ComponentListProps {
    handleAddElement: (tag: string, text: string, label?: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const basicComp = [
        { tag: 'Text', label: 'text', icon: Text },
        { tag: 'Label', label: 'label', icon: Tag },
        { tag: 'TextField', label: 'text field', icon: RectangleEllipsis },
        { tag: 'Input', label: 'input', icon: RectangleEllipsis },
        { tag: 'Button', label: 'button', icon: MousePointer },
        { tag: 'Checkbox', label: 'checkbox', icon: SquareCheck },
        { tag: 'CheckboxGroup', label: 'check GP', icon: GroupIcon },
        { tag: 'RadioGroup', label: 'radio GP', icon: GroupIcon },
        { tag: 'ToggleButton', label: 'toggle', icon: ToggleLeft },
        { tag: 'ToggleButtonGroup', label: 'toggle GP', icon: GroupIcon },
        { tag: 'Slider', label: 'slider', icon: SlidersHorizontal },
    ];

    const widgetComp = [
        { tag: 'Tabs', label: 'tabs', icon: AppWindow },
        { tag: 'Tree', label: 'tree', icon: ListTree },
        { tag: 'Table', label: 'table', icon: TableProperties },
        { tag: 'Calendar', label: 'calendar', icon: Calendar },
        { tag: 'ListBox', label: 'list box', icon: ListIcon },
        { tag: 'GridList', label: 'grid List', icon: Grid },
        { tag: 'Select', label: 'select', icon: ChevronDown },
        { tag: 'ComboBox', label: 'combo box', icon: Search },
        { tag: 'DatePicker', label: 'date picker', icon: CalendarCheck },
    ];

    const pageComp = [
        { tag: 'section', label: 'section', icon: Square },
        { tag: 'Card', label: 'card', icon: InspectionPanel },
        { tag: 'Panel', label: 'panel', icon: InspectionPanel }, // 추가
        { tag: 'Div', label: 'division', icon: Code },
        { tag: 'Nav', label: 'nav', icon: Menu },
        { tag: 'Sprit', label: 'sprit', icon: Info },
    ];



    return (
        <div className="sidebar-content components">
            <div className='component_element'>
                <div className="panel-header">
                    <h3 className='panel-title'>Element</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        >
                            <ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>

                <div className="component-list">
                    {basicComp.map((component) => (
                        <div className="component-list-item" key={component.tag}>
                            <button
                                onClick={() => handleAddElement(component.tag, component.label)}
                                title={`Add ${component.label} element`}
                            >
                                <component.icon strokeWidth={1} size={16} />
                            </button>
                            <label>{component.label}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className='component_element'>
                <div className="panel-header">
                    <h3 className='panel-title'>Widget</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>

                <div className="component-list">
                    {widgetComp.map((component) => (
                        <div className="component-list-item" key={component.tag}>
                            <button
                                onClick={() => handleAddElement(component.tag, component.label)}
                                title={`Add ${component.label} element`}
                            >
                                <component.icon strokeWidth={1} size={16} />
                            </button>
                            <label>{component.label}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className='component_element'>
                <div className="panel-header">
                    <h3 className='panel-title'>Page</h3>
                    <div className="header-actions">
                        <button
                            className='iconButton'
                            aria-label="Add Element"
                        ><ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    </div>
                </div>

                <div className="component-list">
                    {pageComp.map((component) => (
                        <div className="component-list-item" key={component.tag}>
                            <button
                                onClick={() => handleAddElement(component.tag, component.label)}
                                title={`Add ${component.label} element`}
                            >
                                <component.icon strokeWidth={1} size={16} />
                            </button>
                            <label>{component.label}</label>
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
} 