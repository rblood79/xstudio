import { Square, Code, Text, ToggleLeft, MousePointer, Tag, Info, RectangleEllipsis } from 'lucide-react';
import './ComponentList.css';
//import ToggleButton from './ToggleButton';

interface ComponentListProps {
    handleAddElement: (tag: string, text: string, label?: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const components = [
        { tag: 'section', text: 'section', icon: Square },
        { tag: 'div', text: 'div', icon: Code },
        { tag: 'Label', text: 'label', icon: Tag },
        { tag: 'Description', text: 'description', icon: Info },
        { tag: 'Input', text: 'input', icon: RectangleEllipsis },
        { tag: 'TextField', text: 'TextField', icon: Text, label: 'TextField' },
        { tag: 'Button', text: 'Button', icon: MousePointer },
        { tag: 'ToggleButton', text: 'Toggle', icon: ToggleLeft },
        { tag: 'ToggleButtonGroup', text: 'ToggleGroup', icon: ToggleLeft },
    ];

    return (
        <div className="component-list">
            {components.map((component) => (
                <div className="component-list-item" key={component.tag}>
                    <button
                        onClick={() => handleAddElement(component.tag, component.text, component.label)}
                        title={`Add ${component.text} element`}
                    >
                        <component.icon strokeWidth={1} size={16} />
                    </button>
                    <label>{component.text}</label>
                </div>
            ))}
        </div>
    );
} 