import { Square, Code, Text, Link, ToggleLeft, MousePointer } from 'lucide-react';
import './ComponentList.css';
//import ToggleButton from './ToggleButton';

interface ComponentListProps {
    handleAddElement: (tag: string, text: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const components = [
        { tag: 'section', text: 'section', icon: Square },
        { tag: 'div', text: 'div', icon: Code },
        { tag: 'p', text: 'p', icon: Text },
        { tag: 'input', text: 'input', icon: Text },
        { tag: 'a', text: 'a', icon: Link },
        { tag: 'Button', text: 'Button', icon: MousePointer },
        { tag: 'ToggleButton', text: 'ToggleButton', icon: ToggleLeft },
        { tag: 'ToggleButtonGroup', text: 'ToggleButtonGroup', icon: ToggleLeft },
    ];

    return (
        <div className="component-list">
            {components.map((component) => (
                <div className="component-list-item" key={component.tag}>
                    <button
                        onClick={() => handleAddElement(component.tag, component.text)}
                        title={`Add ${component.text} element`}
                    >
                        <component.icon strokeWidth={1} size={16} />
                    </button>
                    <span>{component.text}</span>
                </div>
            ))}
        </div>
    );
} 