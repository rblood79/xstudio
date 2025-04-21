

import ComponentList from './ComponentList';

import './index.css';

interface ComponentsProps {
    handleAddElement: (tag: string, text: string) => Promise<void>;
}

function Components({ handleAddElement }: ComponentsProps) {
    return (
        <div>
            <div className="panel-header">
                <h3 className='panel-title'>Basic</h3>
                <div className="header-actions">
                    <button
                        className='iconButton'
                        aria-label="Add Element"
                    ></button>
                </div>
            </div>
            <ComponentList handleAddElement={handleAddElement} />
            <div className="panel-header">
                <h3 className='panel-title'>Widget</h3>
                <div className="header-actions">
                    <button
                        className='iconButton'
                        aria-label="Add Element"
                    ></button>
                </div>
            </div>
        </div>
    );
}

export default Components;
export { ComponentList };