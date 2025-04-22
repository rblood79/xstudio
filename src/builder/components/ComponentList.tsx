import { Square, Code, Text, ToggleLeft, AppWindow, InspectionPanel, SlidersHorizontal, MousePointer, Tag, Info, Clock, RectangleEllipsis, Calendar, ListTree, Menu, GroupIcon, ListIcon, Grid, TableProperties } from 'lucide-react';
import './ComponentList.css';
//import ToggleButton from './ToggleButton';

interface ComponentListProps {
    handleAddElement: (tag: string, text: string, label?: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const components = [
        { tag: 'Label', label: 'label', icon: Tag },
        { tag: 'Text', label: 'text', icon: Text },
        { tag: 'Description', label: 'description', icon: Info },
        { tag: 'Input', label: 'input', icon: RectangleEllipsis },
        { tag: 'Button', label: 'button', icon: MousePointer },
        { tag: 'Toggle', label: 'toggle', icon: ToggleLeft },
        { tag: 'ToggleGroup', label: 'toggleGroup', icon: GroupIcon },
        { tag: 'Slider', label: 'slider', icon: SlidersHorizontal },
    ];

    const widgetComp = [
        { tag: 'Tab', label: 'tab', icon: AppWindow },
        { tag: 'Tree', label: 'tree', icon: ListTree },
        { tag: 'Table', label: 'table', icon: TableProperties },
        { tag: 'Calendar', label: 'calendar', icon: Calendar },
        { tag: 'ListBox', label: 'list Box', icon: ListIcon },
        { tag: 'GridList', label: 'grid List', icon: Grid },
        { tag: 'Date', label: 'date', icon: Clock },
    ];

    const pageComp = [
        { tag: 'Section', label: 'section', icon: Square },
        { tag: 'Card', label: 'card', icon: InspectionPanel },
        { tag: 'Div', label: 'division', icon: Code },
        { tag: 'Nav', label: 'navigation', icon: Menu },
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
                        ></button>
                    </div>
                </div>

                <div className="component-list">
                    {components.map((component) => (
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
                        ></button>
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
                        ></button>
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