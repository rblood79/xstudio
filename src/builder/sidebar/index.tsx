import "./index.css";
import React from "react";
import { Settings2, Trash, ChevronRight, Box, Folder, File, X } from 'lucide-react';
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
import { Radio, RadioGroup, Tree, TreeItem } from 'react-aria-components';

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
    const selectedTab = useStore((state) => state.selectedTab);
    const { setElements: storeSetElements, setSelectedElement, selectTabElement } = useStore();
    // 활성 탭을 단일 값에서 Set으로 변경
    const [activeTabs, setActiveTabs] = React.useState<Set<Tab>>(new Set(['nodes']));
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

    // 탭 토글 함수 추가
    const toggleTab = (tab: Tab) => {
        setActiveTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tab)) {
                newSet.delete(tab);
            } else {
                newSet.add(tab);
            }
            return newSet;
        });
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
            .filter((item) => {
                // 기본 parent_id 필터링
                const matchesParent = item.parent_id === parentId || (parentId === null && item.parent_id === undefined);
                if (!matchesParent) return false;

                // 부모가 Tabs이고 현재 아이템이 Panel인 경우 제외 (TabPanels 가상 노드에서 렌더링됨)
                if (parentId) {
                    const parentItem = items.find(p => p.id === parentId);
                    if (parentItem && 'tag' in parentItem && (parentItem as any).tag === 'Tabs' &&
                        'tag' in item && (item as any).tag === 'Panel') {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        if (filteredItems.length === 0) return null;
        return (
            <>
                {filteredItems.map((item) => {
                    const hasChildNodes = hasChildren(items, item.id);
                    const isExpanded = expandedItems.has(item.id);

                    // Tabs 컴포넌트의 경우 가상 자식 노드 추가 (TabList, TabPanels)
                    const hasTabsChildren = 'tag' in item && (item as any).tag === 'Tabs' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // ToggleButtonGroup 컴포넌트의 경우 가상 자식 노드 추가 (개별 ToggleButton들)
                    const hasToggleChildren = 'tag' in item && (item as any).tag === 'ToggleButtonGroup' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // CheckboxGroup 컴포넌트의 경우 가상 자식 노드 추가 (개별 Checkbox들)
                    const hasCheckboxChildren = 'tag' in item && (item as any).tag === 'CheckboxGroup' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // RadioGroup 컴포넌트의 경우 가상 자식 노드 추가 (개별 Radio들)
                    const hasRadioChildren = 'tag' in item && (item as any).tag === 'RadioGroup' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // ListBox 컴포넌트의 경우 가상 자식 노드 추가 (개별 ListBoxItem들)
                    const hasListBoxChildren = 'tag' in item && (item as any).tag === 'ListBox' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // GridList 컴포넌트의 경우 가상 자식 노드 추가 (개별 GridListItem들)
                    const hasGridListChildren = 'tag' in item && (item as any).tag === 'GridList' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // Select 컴포넌트의 경우 가상 자식 노드 추가 (개별 SelectItem들)
                    const hasSelectChildren = 'tag' in item && (item as any).tag === 'Select' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // ComboBox 컴포넌트의 경우 가상 자식 노드 추가 (개별 ComboBoxItem들)
                    const hasComboBoxChildren = 'tag' in item && (item as any).tag === 'ComboBox' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    // Tree 컴포넌트의 경우 가상 자식 노드 추가 (개별 TreeItem들)
                    const hasTreeChildren = 'tag' in item && (item as any).tag === 'Tree' &&
                        'props' in item && (item as any).props?.children?.length > 0;

                    const hasAnyChildren = hasChildNodes || hasTabsChildren || hasToggleChildren || hasCheckboxChildren || hasRadioChildren || hasListBoxChildren || hasGridListChildren || hasSelectChildren || hasComboBoxChildren || hasTreeChildren;

                    return (
                        <div
                            key={item.id}
                            data-depth={depth}
                            data-has-children={hasAnyChildren}
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
                                </div>
                                <div
                                    className="elementItemIcon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (hasAnyChildren) {
                                            toggleExpand(item.id);
                                        }
                                    }}
                                >
                                    {hasAnyChildren ? (
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
                            {isExpanded && (
                                <>
                                    {/* 일반 자식 노드들 렌더링 */}
                                    {hasChildNodes && renderTree(items, getLabel, onClick, onDelete, item.id, depth + 1)}

                                    {/* Tabs 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasTabsChildren && 'props' in item && (
                                        <>
                                            {/* TabList 가상 노드 */}
                                            <div
                                                key={`${item.id}-tablist`}
                                                data-depth={depth + 1}
                                                data-has-children={true}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(`${item.id}-tablist`);
                                                }}
                                                className="element"
                                            >
                                                <div className="elementItem">
                                                    <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                    </div>
                                                    <div className="elementItemIcon">
                                                        <ChevronRight
                                                            color={iconEditProps.color}
                                                            strokeWidth={iconEditProps.stroke}
                                                            size={iconEditProps.size}
                                                            style={{
                                                                transform: expandedItems.has(`${item.id}-tablist`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="elementItemLabel">TabList</div>
                                                    <div className="elementItemActions">
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TabList가 확장되었을 때 개별 Tab들 */}
                                            {expandedItems.has(`${item.id}-tablist`) && (item as any).props?.children?.map((tab: any, index: number) => (
                                                <div
                                                    key={`${item.id}-tab-${index}`}
                                                    data-depth={depth + 2}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Tab을 클릭했을 때는 해당 Tab을 선택
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 2) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {tab.title || `Tab ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* TabPanels 가상 노드 */}
                                            <div
                                                key={`${item.id}-tabpanels`}
                                                data-depth={depth + 1}
                                                data-has-children={true}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(`${item.id}-tabpanels`);
                                                }}
                                                className="element"
                                            >
                                                <div className="elementItem">
                                                    <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                    </div>
                                                    <div className="elementItemIcon">
                                                        <ChevronRight
                                                            color={iconEditProps.color}
                                                            strokeWidth={iconEditProps.stroke}
                                                            size={iconEditProps.size}
                                                            style={{
                                                                transform: expandedItems.has(`${item.id}-tabpanels`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="elementItemLabel">TabPanels</div>
                                                    <div className="elementItemActions">
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TabPanels가 확장되었을 때 실제 Panel 컴포넌트들 렌더링 */}
                                            {expandedItems.has(`${item.id}-tabpanels`) && (() => {
                                                const panelChildren = items.filter(child =>
                                                    child.parent_id === item.id &&
                                                    'tag' in child &&
                                                    (child as any).tag === 'Panel'
                                                );

                                                // Panel들을 직접 매핑하여 렌더링 (renderTree의 구조를 따라하되 필터링 우회)
                                                return panelChildren.map((panel) => {
                                                    const panelHasChildren = items.some(child => child.parent_id === panel.id);
                                                    const isPanelExpanded = expandedItems.has(panel.id);

                                                    return (
                                                        <React.Fragment key={panel.id}>
                                                            <div
                                                                data-depth={depth + 2}
                                                                data-has-children={panelHasChildren}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (panelHasChildren) {
                                                                        toggleExpand(panel.id);
                                                                    }
                                                                    onClick(panel);
                                                                }}
                                                                className="element"
                                                            >
                                                                <div className={`elementItem ${selectedElementId === panel.id ? 'active' : ''}`}>
                                                                    <div className="elementItemIndent" style={{ width: `${((depth + 2) * 8) + 0}px` }}></div>
                                                                    <div className="elementItemIcon">
                                                                        {panelHasChildren ? (
                                                                            <ChevronRight
                                                                                color={iconEditProps.color}
                                                                                strokeWidth={iconEditProps.stroke}
                                                                                size={iconEditProps.size}
                                                                                style={{
                                                                                    transform: isPanelExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
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
                                                                    <div className="elementItemLabel">{getLabel(panel)}</div>
                                                                    <div className="elementItemActions">
                                                                        <button onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await onDelete(panel);
                                                                        }} className="iconButton">
                                                                            <X
                                                                                color={iconEditProps.color}
                                                                                strokeWidth={iconEditProps.stroke}
                                                                                size={iconEditProps.size}
                                                                            />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Panel의 자식들 렌더링 */}
                                                            {isPanelExpanded && panelHasChildren &&
                                                                renderTree(items, getLabel, onClick, onDelete, panel.id, depth + 3)
                                                            }
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </>
                                    )}

                                    {/* ToggleButtonGroup 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasToggleChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((button: any, index: number) => (
                                                <div
                                                    key={`${item.id}-toggle-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // ToggleButton을 클릭했을 때는 해당 Button을 선택
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {button.title || `Button ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* CheckboxGroup 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasCheckboxChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((checkbox: any, index: number) => (
                                                <div
                                                    key={`${item.id}-checkbox-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Checkbox를 클릭했을 때는 해당 Checkbox를 선택
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {checkbox.label || `Option ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* RadioGroup 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasRadioChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((radio: any, index: number) => (
                                                <div
                                                    key={`${item.id}-radio-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Radio를 클릭했을 때는 해당 Radio를 선택
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {radio.label || `Option ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ListBox 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasListBoxChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((listItem: any, index: number) => (
                                                <div
                                                    key={`${item.id}-listitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {listItem.label || `Item ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* GridList 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasGridListChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((gridItem: any, index: number) => (
                                                <div
                                                    key={`${item.id}-griditem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {gridItem.label || `Item ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Select 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasSelectChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((selectItem: any, index: number) => (
                                                <div
                                                    key={`${item.id}-selectitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {selectItem.label || `Option ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ComboBox 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasComboBoxChildren && 'props' in item && (
                                        <>
                                            {(item as any).props?.children?.map((comboItem: any, index: number) => (
                                                <div
                                                    key={`${item.id}-comboitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id, (item as any).props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            <Box
                                                                color={iconEditProps.color}
                                                                strokeWidth={iconEditProps.stroke}
                                                                size={iconEditProps.size}
                                                                style={{ padding: '2px' }}
                                                            />
                                                        </div>
                                                        <div className="elementItemLabel">
                                                            {comboItem.label || `Option ${index + 1}`}
                                                        </div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Tree 컴포넌트의 가상 자식 노드들 렌더링 */}
                                    {hasTreeChildren && 'props' in item && (
                                        <>
                                            {(() => {
                                                const flatItems = (item as any).props?.children || [];

                                                // 플랫 구조를 계층 구조로 변환하여 표시
                                                const buildHierarchy = (items: any[]): any[] => {
                                                    const itemMap = new Map();
                                                    const rootItems: any[] = [];

                                                    // 모든 아이템을 맵에 저장
                                                    items.forEach((treeItem, originalIndex) => {
                                                        itemMap.set(treeItem.id, { ...treeItem, children: [], originalIndex });
                                                    });

                                                    // 계층 구조 구축
                                                    items.forEach((treeItem, originalIndex) => {
                                                        const itemWithChildren = itemMap.get(treeItem.id);
                                                        if (treeItem.parent_id === null || treeItem.parent_id === undefined) {
                                                            rootItems.push(itemWithChildren);
                                                        } else {
                                                            const parent = itemMap.get(treeItem.parent_id);
                                                            if (parent) {
                                                                parent.children.push(itemWithChildren);
                                                            }
                                                        }
                                                    });

                                                    return rootItems;
                                                };

                                                const renderTreeItem = (treeItemData: any, itemDepth: number): React.ReactNode => {
                                                    return (
                                                        <React.Fragment key={`${item.id}-treeitem-${treeItemData.id}`}>
                                                            <div
                                                                data-depth={itemDepth}
                                                                data-has-children={treeItemData.children && treeItemData.children.length > 0}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    selectTabElement(item.id, (item as any).props, treeItemData.originalIndex);
                                                                }}
                                                                className="element"
                                                            >
                                                                <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === treeItemData.originalIndex ? 'active' : ''}`}>
                                                                    <div className="elementItemIndent" style={{ width: `${(itemDepth * 8) + 0}px` }}>
                                                                    </div>
                                                                    <div className="elementItemIcon">
                                                                        {treeItemData.type === 'folder' ? (
                                                                            <Folder
                                                                                color={iconEditProps.color}
                                                                                strokeWidth={iconEditProps.stroke}
                                                                                size={iconEditProps.size}
                                                                                style={{ padding: '2px' }}
                                                                            />
                                                                        ) : (
                                                                            <File
                                                                                color={iconEditProps.color}
                                                                                strokeWidth={iconEditProps.stroke}
                                                                                size={iconEditProps.size}
                                                                                style={{ padding: '2px' }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="elementItemLabel">
                                                                        {treeItemData.title || `Item ${treeItemData.originalIndex + 1}`}
                                                                    </div>
                                                                    <div className="elementItemActions">
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* 자식 아이템들 렌더링 */}
                                                            {treeItemData.children && treeItemData.children.map((childItem: any) =>
                                                                renderTreeItem(childItem, itemDepth + 1)
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                };

                                                const hierarchicalData = buildHierarchy(flatItems);
                                                return hierarchicalData.map(treeItem => renderTreeItem(treeItem, depth + 1));
                                            })()}
                                        </>
                                    )}
                                </>
                            )}
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

    // 모든 트리 아이템 접기 함수 추가
    const collapseAllTreeItems = () => {
        setExpandedItems(new Set());
    };

    // 변경된 renderContent 함수
    const renderContent = () => {
        // 활성화된 모든 탭에 대한 콘텐츠를 배열로 반환
        const contents = [];

        if (activeTabs.has('nodes')) {
            contents.push(
                <div key="nodes" className="sidebar-section nodes">
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
                        collapseAllTreeItems={collapseAllTreeItems} // 새 prop 전달
                    />
                </div>
            );
        }

        if (activeTabs.has('components')) {
            contents.push(
                <div key="components" className="sidebar-section components">
                    <Components handleAddElement={handleAddElement} />
                </div>
            );
        }

        if (activeTabs.has('library')) {
            contents.push(
                <div key="library" className="sidebar-section library">
                    <Library />
                </div>
            );
        }

        if (activeTabs.has('dataset')) {
            contents.push(
                <div key="dataset" className="sidebar-section dataset">
                    <Dataset />
                </div>
            );
        }

        if (activeTabs.has('theme')) {
            contents.push(
                <div key="theme" className="sidebar-section theme">
                    <Theme />
                </div>
            );
        }

        if (activeTabs.has('ai')) {
            contents.push(
                <div key="ai" className="sidebar-section ai">
                    <AI />
                </div>
            );
        }

        if (activeTabs.has('user')) {
            contents.push(
                <div key="user" className="sidebar-section user">
                    <User />
                </div>
            );
        }

        if (activeTabs.has('settings')) {
            contents.push(
                <div key="settings" className="sidebar-section settings settings">
                    <Setting />
                </div>
            );
        }

        return contents.length > 0 ? contents : <div className="sidebar-empty-state"></div>;
    };

    return (
        <aside className="sidebar">
            <SidebarNav activeTabs={activeTabs} onTabChange={toggleTab} />
            <div className="sidebar-container">
                {renderContent()}
            </div>
            {children}
        </aside>
    );
}