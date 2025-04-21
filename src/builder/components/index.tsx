

import ComponentList from './ComponentList';

import './index.css';

interface ComponentsProps {
    handleAddElement: (tag: string, text: string) => Promise<void>;
}

function Components({ handleAddElement }: ComponentsProps) {
    return (
        <ComponentList handleAddElement={handleAddElement} />
    );
}

export default Components;
export { ComponentList };