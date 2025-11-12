

import ComponentList from './ComponentList';

import './index.css';

interface ComponentsProps {
    handleAddElement: (tag: string, parentId?: string) => Promise<void>;
    selectedElementId?: string | null;
}

function Components({ handleAddElement, selectedElementId }: ComponentsProps) {
    return (
        <ComponentList
            handleAddElement={handleAddElement}
            selectedElementId={selectedElementId}
        />
    );
}

export default Components;
export { ComponentList };
export { Pagination } from './Pagination';
export { Button } from './Button';
export { ToggleButton } from './ToggleButton';
export { ToggleButtonGroup } from './ToggleButtonGroup';