import React from 'react';
import { Pages } from './Pages';
import { Layers } from './Layers';
import { ElementProps } from '../../types/supabase';
import { Page, Element } from '../../types/store'; // 통합된 타입 사용
import './index.css';

interface NodesProps {
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    handleAddPage: () => void;
    renderTree: <T extends { id: string; parent_id?: string | null; order_num?: number; }>(
        items: T[],
        getLabel: (item: T) => string,
        onClick: (item: T) => void,
        onDelete: (item: T) => Promise<void>,
        parentId?: string | null,
        depth?: number
    ) => React.ReactNode;
    fetchElements: (pageId: string) => Promise<void>;
    elements: Element[];
    setElements: React.Dispatch<React.SetStateAction<Element[]>>;
    selectedElementId: string | null;
    setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
    sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
    collapseAllTreeItems?: () => void; // 새 prop 추가
}

export function Nodes({
    pages,
    setPages,
    handleAddPage,
    renderTree,
    fetchElements,
    elements,
    setElements,
    selectedElementId,
    setSelectedElement,
    sendElementSelectedMessage,
    collapseAllTreeItems
}: NodesProps) {
    return (
        <div className="sidebar-content nodes">
            <Pages
                pages={pages}
                setPages={setPages}
                handleAddPage={handleAddPage}
                renderTree={renderTree}
                fetchElements={fetchElements}
            />
            <Layers
                elements={elements}
                setElements={setElements}
                selectedElementId={selectedElementId}
                setSelectedElement={setSelectedElement}
                renderTree={renderTree}
                sendElementSelectedMessage={sendElementSelectedMessage}
                collapseAllTreeItems={collapseAllTreeItems} // Layers 컴포넌트로 prop 전달
            />
        </div>
    );
}