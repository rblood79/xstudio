import "./index.css";
import React from "react";
import { Settings2, Trash } from 'lucide-react';
import { useStore } from '../stores/elements';
import { Database, ElementProps } from '../../types/supabase';
import { Nodes } from '../nodes';
import Components from '../components';
import Library from '../library';
import Dataset from '../dataset';
import Theme from '../theme';
import AI from '../ai';
import User from '../user';
import Setting from '../setting';
import { SidebarNav, Tab } from './SidebarNav';

type Page = Database['public']['Tables']['pages']['Row'];
type Element = Database['public']['Tables']['elements']['Row'];

interface SidebarProps {
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    handleAddPage: () => Promise<void>;
    handleAddElement: (tag: string, text: string) => Promise<void>;
    fetchElements: (pageId: string) => Promise<void>;
    selectedPageId: string | null;
    children?: React.ReactNode;
}

export default function Sidebar({ pages, setPages, handleAddPage, handleAddElement, fetchElements, selectedPageId, children }: SidebarProps) {
    const elements = useStore((state) => state.elements) as Element[];
    const selectedElementId = useStore((state) => state.selectedElementId);
    const { setElements: storeSetElements, setSelectedElement } = useStore();
    const [activeTab, setActiveTab] = React.useState<Tab>('nodes');
    const [iconEditProps] = React.useState({ color: "#171717", stroke: 1, size: 16 });

    const setElements: React.Dispatch<React.SetStateAction<Element[]>> = (elementsOrFn) => {
        if (typeof elementsOrFn === 'function') {
            storeSetElements(elementsOrFn(elements));
        } else {
            storeSetElements(elementsOrFn);
        }
    };

    const renderTree = <T extends { id: string; parent_id?: string | null; order_num?: number }>(
        items: T[],
        getLabel: (item: T) => string,
        onClick: (item: T) => void,
        onDelete: (item: T) => Promise<void>,
        parentId: string | null = null,
        depth: number = 0
    ): React.ReactNode => {
        const filteredItems = items
            .filter((item) => item.parent_id === parentId || (parentId === null && item.parent_id === undefined))
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        if (filteredItems.length === 0) return null;
        return (
            <>
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        data-depth={depth}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(item);
                        }}
                        className="element"
                    >
                        <div className={`elementItem ${('title' in item && selectedPageId === item.id) ||
                            ('tag' in item && selectedElementId === item.id)
                            ? 'active'
                            : ''
                            }`} style={{
                                paddingLeft: `${(depth * 16) + 16}px`
                            }}>
                            <span className="elementItemIcon"></span>
                            <span className="elementItemLabel">{getLabel(item)}</span>
                            <div className="elementItemActions">
                                <button className="iconButton" aria-label="Settings">
                                    <Settings2 color={iconEditProps.color} strokeWidth={iconEditProps.stroke} size={iconEditProps.size} />
                                </button>
                                <button
                                    className="iconButton"
                                    aria-label={`Delete ${getLabel(item)}`}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await onDelete(item);
                                    }}
                                >
                                    <Trash color={iconEditProps.color} strokeWidth={iconEditProps.stroke} size={iconEditProps.size} />
                                </button>
                            </div>
                        </div>
                        {renderTree(items, getLabel, onClick, onDelete, item.id, depth + 1)}
                    </div>
                ))}
            </>
        );
    };

    const sendElementSelectedMessage = (elementId: string, props: ElementProps) => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        if (iframe?.contentDocument) {
            const element = iframe.contentDocument.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement;
            if (element) {
                const selectedElement = elements.find((el) => el.id === elementId);
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                const adjustedRect = {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: parseFloat(computedStyle.width) || rect.width,
                    height: parseFloat(computedStyle.height) || rect.height,
                };
                const message = {
                    type: "ELEMENT_SELECTED",
                    elementId,
                    payload: { rect: adjustedRect, tag: selectedElement?.tag || "Unknown", props },
                    source: "builder",
                };
                window.postMessage(message, window.location.origin);
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage(message, window.location.origin);
                }
            }
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'nodes':
                return (
                    <Nodes
                        pages={pages}
                        setPages={setPages}
                        handleAddPage={handleAddPage}
                        renderTree={renderTree}
                        fetchElements={fetchElements}
                        elements={elements}
                        setElements={setElements}
                        selectedElementId={selectedElementId}
                        setSelectedElement={setSelectedElement}
                        sendElementSelectedMessage={sendElementSelectedMessage}
                    />
                );
            case 'components':
                return <Components handleAddElement={handleAddElement} />;
            case 'library':
                return <Library />;
            case 'dataset':
                return <Dataset />;
            case 'theme':
                return <Theme />;
            case 'ai':
                return <AI />;
            case 'user':
                return <User />;
            case 'settings':
                return <Setting />;
            default:
                return null;
        }
    };

    return (
        <aside className="sidebar">
            <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
            {renderContent()}
            {children}
        </aside>
    );
} 