import { AppWindowMac, SeparatorHorizontal, ChevronUp, Square, Code, Text, ToggleLeft, AppWindow, InspectionPanel, SlidersHorizontal, MousePointer, Tag, CalendarCheck, CalendarDays, RectangleEllipsis, Calendar, ListTree, Menu, GroupIcon, ListIcon, Grid, TableProperties, SquareCheck, ChevronDown, Search, ToggleRight } from 'lucide-react';
import { iconProps } from '../../utils/uiConstants';
import './ComponentList.css';
// import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError, Checkbox, CheckboxGroup } from '../components/list';

interface ComponentListProps {
    handleAddElement: (tag: string, text: string, label?: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const basicComp = [
        { tag: 'Text', label: 'text', icon: Text },
        { tag: 'Label', label: 'label', icon: Tag },
        { tag: 'Input', label: 'input', icon: RectangleEllipsis },
        { tag: 'Button', label: 'button', icon: MousePointer },
        { tag: 'Checkbox', label: 'checkbox', icon: SquareCheck },
        { tag: 'ToggleButton', label: 'toggle', icon: ToggleLeft },
        { tag: 'Switch', label: 'switch', icon: ToggleRight }, // Switch 추가
        { tag: 'Slider', label: 'slider', icon: SlidersHorizontal },
    ];

    const widgetComp = [
        { tag: 'TextField', label: 'text field', icon: RectangleEllipsis },
        // 그룹 컴포넌트들을 Widget으로 이동
        { tag: 'CheckboxGroup', label: 'check group', icon: GroupIcon },
        { tag: 'RadioGroup', label: 'radio group', icon: GroupIcon },
        { tag: 'ToggleButtonGroup', label: 'toggle group', icon: GroupIcon },
        // 기존 위젯들
        { tag: 'Select', label: 'select', icon: ChevronDown },
        { tag: 'ComboBox', label: 'combo box', icon: Search },
        { tag: 'DatePicker', label: 'date picker', icon: CalendarCheck },
        { tag: 'DateRangePicker', label: 'date range', icon: CalendarDays },
        { tag: 'Calendar', label: 'calendar', icon: Calendar },
        { tag: 'ListBox', label: 'list box', icon: ListIcon },
        { tag: 'GridList', label: 'grid list', icon: Grid },
        { tag: 'Tabs', label: 'tabs', icon: AppWindow },
        { tag: 'Tree', label: 'tree', icon: ListTree },
        { tag: 'Table', label: 'table', icon: TableProperties },
    ];

    const pageComp = [
        { tag: 'section', label: 'section', icon: Square },
        { tag: 'Div', label: 'division', icon: Code },
        { tag: 'Card', label: 'card', icon: AppWindowMac },
        { tag: 'Panel', label: 'panel', icon: InspectionPanel },
        { tag: 'Nav', label: 'navigation', icon: Menu },
        // Sprit -> Separator로 수정하거나 용도 확인 필요
        { tag: 'Separator', label: 'separator', icon: SeparatorHorizontal }, // 또는 제거
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