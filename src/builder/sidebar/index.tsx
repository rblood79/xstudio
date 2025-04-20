import "./index.css";
import React from "react";
import { Settings2, Trash, ChevronRight, Box } from 'lucide-react';
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
    // 펼쳐진 항목의 ID를 추적하는 상태 추가
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

    // selectedElementId가 변경될 때 해당 요소의 부모 요소들을 펼치는 효과
    React.useEffect(() => {
        if (selectedElementId && elements.length > 0) {
            // 선택된 요소의 모든 상위 요소 찾기
            const parentIds = new Set<string>();
            let currentElement = elements.find(el => el.id === selectedElementId);

            while (currentElement?.parent_id) {
                parentIds.add(currentElement.parent_id);
                currentElement = elements.find(el => el.id === currentElement?.parent_id);
            }

            // 확장된 항목 집합에 상위 요소 추가
            setExpandedItems(prev => {
                const newSet = new Set(prev);
                parentIds.forEach(id => newSet.add(id));
                return newSet;
            });
        }
    }, [selectedElementId, elements]);

    const setElements: React.Dispatch<React.SetStateAction<Element[]>> = (elementsOrFn) => {
        if (typeof elementsOrFn === 'function') {
            storeSetElements(elementsOrFn(elements));
        } else {
            storeSetElements(elementsOrFn);
        }
    };

    const hasChildren = <T extends { id: string; parent_id?: string | null }>(
        items: T[],
        itemId: string
    ): boolean => {
        return items.some((item) => item.parent_id === itemId);
    };

    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
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
                {filteredItems.map((item) => {
                    const hasChildNodes = hasChildren(items, item.id);
                    const isExpanded = expandedItems.has(item.id);
                    return (
                        <div
                            key={item.id}
                            data-depth={depth}
                            data-has-children={hasChildNodes}
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
                                }`}>
                                <div className="elementItemIndent" style={{ width: depth > 0 ? `${(depth * 8) + 0}px` : '0px' }}>
                                    {Array.from({ length: depth }).map((_, index) => (
                                        <span key={index} className="elementItemSpacer" />
                                    ))}
                                </div>
                                <div
                                    className="elementItemIcon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (hasChildNodes) {
                                            toggleExpand(item.id);
                                        }
                                    }}
                                >
                                    {hasChildNodes ? (
                                        <ChevronRight
                                            color={iconEditProps.color}
                                            strokeWidth={iconEditProps.stroke}
                                            size={iconEditProps.size}
                                            style={{
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            color={iconEditProps.color}
                                            strokeWidth={iconEditProps.stroke}
                                            size={iconEditProps.size}
                                            style={{ padding: '2px' }}
                                        />
                                    )}
                                </div>
                                <div className="elementItemLabel">{getLabel(item)}</div>
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
                            {hasChildNodes && isExpanded && renderTree(items, getLabel, onClick, onDelete, item.id, depth + 1)}
                        </div>
                    );
                })}
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