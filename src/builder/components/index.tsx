

import ComponentList from './ComponentList';

import './index.css';

interface ComponentsProps {
    handleAddElement: (tag: string, text: string) => Promise<void>;
}

function Components({ handleAddElement }: ComponentsProps) {
    return (
        <div className="sidebar_components">
            <ComponentList handleAddElement={handleAddElement} />
        </div>
    );
}

export default Components;
export { ComponentList };