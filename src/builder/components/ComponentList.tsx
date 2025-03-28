import { Square, Code, Text, Link } from 'lucide-react';
import './ComponentList.css';
interface ComponentListProps {
    handleAddElement: (tag: string, text: string) => Promise<void>;
}

export default function ComponentList({ handleAddElement }: ComponentListProps) {
    const components = [
        { tag: 'section', text: 'section', icon: Square },
        { tag: 'div', text: 'div', icon: Code },
        { tag: 'p', text: 'p', icon: Text },
        { tag: 'button', text: 'button', icon: Square },
        { tag: 'input', text: 'input', icon: Text },
        { tag: 'a', text: 'a', icon: Link },
    ];

    return (
        <div className="component-list">
            {components.map((component) => (
                <button
                    key={component.tag}
                    onClick={() => handleAddElement(component.tag, component.text)}
                >
                    <component.icon strokeWidth={1} size={16} />
                </button>
            ))}
        </div>
    );
} 