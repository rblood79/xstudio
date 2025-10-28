import { useMemo, useCallback, memo } from 'react';
import { AppWindowMac, SeparatorHorizontal, ChevronUp, Square, Code, Text, ToggleLeft, AppWindow, InspectionPanel, SlidersHorizontal, MousePointer, Tag, CalendarCheck, CalendarDays, RectangleEllipsis, Calendar, ListTree, Menu, GroupIcon, ListIcon, Grid, TableProperties, SquareCheck, ChevronDown, Search, ToggleRight, Hash, MessageSquare, Settings, Gauge, BarChart3, Dot, Columns2 } from 'lucide-react';
import { iconProps } from '../../utils/uiConstants';
import './styles/ComponentList.css';
// import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError, Checkbox, CheckboxGroup } from '../components/list';

interface ComponentListProps {
    handleAddElement: (tag: string, parentId?: string) => void;
    selectedElementId?: string | null;
}

// 컴포넌트 정의를 메모이제이션
const basicComp = [
    { tag: 'Text', label: 'text', icon: Text },
    { tag: 'Button', label: 'button', icon: MousePointer },
    { tag: 'TextField', label: 'text field', icon: RectangleEllipsis },
    { tag: 'NumberField', label: 'number field', icon: Hash },
    { tag: 'SearchField', label: 'search field', icon: Search },
    { tag: 'Checkbox', label: 'checkbox', icon: SquareCheck },
    { tag: 'Radio', label: 'radio', icon: GroupIcon },
    { tag: 'Select', label: 'select', icon: ChevronDown },
    { tag: 'Switch', label: 'switch', icon: ToggleRight },
    { tag: 'Slider', label: 'slider', icon: SlidersHorizontal },
    { tag: 'Calendar', label: 'calendar', icon: Calendar },
    { tag: 'DatePicker', label: 'date picker', icon: CalendarCheck },
    { tag: 'TimeField', label: 'time field', icon: ChevronDown },
    { tag: 'ComboBox', label: 'combo box', icon: ChevronDown },
    { tag: 'Menu', label: 'menu', icon: Menu },
    { tag: 'MenuItem', label: 'menu item', icon: Dot },
    { tag: 'ListBox', label: 'list box', icon: ListIcon },
    { tag: 'GridList', label: 'grid list', icon: Grid },
    { tag: 'Tree', label: 'tree', icon: ListTree },
    { tag: 'Table', label: 'table', icon: TableProperties },
    { tag: 'Tabs', label: 'tabs', icon: AppWindow },
    { tag: 'Dialog', label: 'dialog', icon: AppWindowMac },
    { tag: 'Modal', label: 'modal', icon: InspectionPanel },
    { tag: 'Popover', label: 'popover', icon: AppWindowMac },
    { tag: 'Tooltip', label: 'tooltip', icon: MessageSquare },
    { tag: 'ToggleButton', label: 'toggle button', icon: ToggleLeft },
    { tag: 'ToggleButtonGroup', label: 'toggle button group', icon: GroupIcon },
    { tag: 'TagGroup', label: 'tag group', icon: Tag },
    { tag: 'ProgressBar', label: 'progress bar', icon: BarChart3 },
    { tag: 'Meter', label: 'meter', icon: Gauge },
    { tag: 'Toolbar', label: 'toolbar', icon: Settings },
    { tag: 'Form', label: 'form', icon: GroupIcon },
    { tag: 'Field', label: 'field', icon: GroupIcon },
    { tag: 'DateField', label: 'date field', icon: CalendarCheck },
    { tag: 'DateRangePicker', label: 'date range picker', icon: CalendarDays },
    { tag: 'CheckboxGroup', label: 'checkbox group', icon: GroupIcon },
    { tag: 'RadioGroup', label: 'radio group', icon: GroupIcon },
] as const;

const widgetComp = [
    { tag: 'Card', label: 'card', icon: AppWindowMac },
    { tag: 'Panel', label: 'panel', icon: InspectionPanel },
    { tag: 'PanelGroup', label: 'resizable panels', icon: Columns2 },
    { tag: 'Nav', label: 'navigation', icon: Menu },
    { tag: 'Separator', label: 'separator', icon: SeparatorHorizontal },
] as const;

const pageComp = [
    { tag: 'section', label: 'section', icon: Square },
    { tag: 'Div', label: 'division', icon: Code },
] as const;

// 개별 컴포넌트 아이템을 메모이제이션
const ComponentItem = ({ component, onAdd, selectedElementId }: {
    component: { tag: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };
    onAdd: (tag: string, parentId?: string) => void;
    selectedElementId?: string | null;
}) => {
    const handleClick = useCallback(() => {
        onAdd(component.tag, selectedElementId || undefined);
    }, [component.tag, onAdd, selectedElementId]);

    return (
        <div className="component-list-item">
            <button
                onClick={handleClick}
                title={`Add ${component.label} element`}
            >
                <component.icon strokeWidth={1} width={16} height={16} />
            </button>
            <label>{component.label}</label>
        </div>
    );
};

ComponentItem.displayName = 'ComponentItem';

// 메인 컴포넌트
const ComponentList = memo(({ handleAddElement, selectedElementId }: ComponentListProps) => {
    // 이벤트 핸들러를 메모이제이션
    const handleComponentAdd = useCallback((tag: string, parentId?: string) => {
        handleAddElement(tag, parentId);
    }, [handleAddElement]);

    // 컴포넌트 그룹을 메모이제이션
    const componentGroups = useMemo(() => ({
        basic: basicComp,
        widget: widgetComp,
        page: pageComp
    }), []);

    return (
        <div className="sidebar-content components">
            {Object.entries(componentGroups).map(([groupName, components]) => (
                <div key={groupName} className='component_element'>
                    <div className="panel-header">
                        <h3 className='panel-title'>{groupName.charAt(0).toUpperCase() + groupName.slice(1)}</h3>
                        <div className="header-actions">
                            <button
                                className='iconButton'
                                aria-label="Add Element"
                            >
                                <ChevronUp color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        </div>
                    </div>
                    <div className="component-list">
                        {components.map((component) => (
                            <ComponentItem
                                key={component.tag}
                                component={component}
                                onAdd={handleComponentAdd}
                                selectedElementId={selectedElementId}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
});

ComponentList.displayName = 'ComponentList';

export default ComponentList; 