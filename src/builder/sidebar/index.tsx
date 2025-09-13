import "./index.css";
import React from "react";
import { Settings2, Trash, ChevronRight, Box, Folder, File } from 'lucide-react';
import { useStore } from '../stores';
import { Database, ElementProps } from '../../types/supabase';
import { Page } from '../stores/elements';
import { Nodes } from '../nodes';
import Components from '../components';
import Library from '../library';
import Dataset from '../dataset';
import Theme from '../theme';
import AI from '../ai';
import User from '../user';
import Setting from '../setting';
import { SidebarNav, Tab } from './SidebarNav';

type Element = Database['public']['Tables']['elements']['Row'];

interface SidebarProps {
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    handleAddPage: () => Promise<void>;
    handleAddElement: (tag: string) => Promise<void>;
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

    type ButtonItem = { id: string; title: string; isSelected?: boolean };
    type CheckboxItem = { id: string; label: string; isSelected?: boolean };
    type RadioItem = { id: string; label: string; value: string };
    type ListItem = { id: string; label: string; value?: string; isDisabled?: boolean };
    type TreeItem = { id: string; title: string; type: 'folder' | 'file'; parent_id: string | null; originalIndex: number; children: TreeItem[] };

    type WithTag = { tag: string };
    type WithProps = { props: ElementProps };

    const hasTag = (x: unknown): x is WithTag =>
        typeof x === 'object' && x !== null && 'tag' in x && typeof (x as Record<string, unknown>)['tag'] === 'string';

    const hasProps = (x: unknown): x is WithProps => {
        if (typeof x !== 'object' || x === null || !('props' in x)) return false;
        const p = (x as { props?: unknown }).props;
        return typeof p === 'object' && p !== null;
    };

    const childrenAs = <C,>(v: unknown): C[] => (Array.isArray(v) ? (v as C[]) : []);

    const renderTree = <T extends { id: string; parent_id?: string | null; order_num?: number }>(
        items: T[],
        getLabel: (item: T) => string,
        onClick: (item: T) => void,
        onDelete: (item: T) => Promise<void>,
        parentId: string | null = null,
        depth: number = 0
    ): React.ReactNode => {
        let filteredItems = items
            .filter((item) => {
                // 기본 parent_id 필터링
                const matchesParent = item.parent_id === parentId || (parentId === null && item.parent_id === undefined);
                if (!matchesParent) return false;

                return true;
            });

        // Tabs 하위의 Tab과 Panel을 쌍으로 그룹화
        if (parentId) {
            const parentItem = items.find(p => p.id === parentId);
            if (parentItem && hasTag(parentItem) && parentItem.tag === 'Tabs') {
                const tabs = filteredItems.filter(item => hasTag(item) && item.tag === 'Tab')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
                const panels = filteredItems.filter(item => hasTag(item) && item.tag === 'Panel')
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

                // Tab과 Panel을 쌍으로 결합
                const pairedItems: T[] = [];
                for (let i = 0; i < Math.max(tabs.length, panels.length); i++) {
                    if (tabs[i]) pairedItems.push(tabs[i]);
                    if (panels[i]) pairedItems.push(panels[i]);
                }

                filteredItems = pairedItems;
            } else {
                // 일반적인 정렬
                filteredItems = filteredItems.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
            }
        } else {
            // 일반적인 정렬
            filteredItems = filteredItems.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        }

        // 디버깅 로그 추가
        /*if (parentId) {
            const parentItem = items.find(p => p.id === parentId);
            if (parentItem && hasTag(parentItem) && parentItem.tag === 'Tabs') {
                console.log(' Tabs 하위 아이템들:', {
                    parentId,
                    filteredItems: filteredItems.map(item => ({ id: item.id, tag: item.tag, title: hasProps(item) ? item.props.title : 'N/A' })),
                    allItems: items.filter(item => item.parent_id === parentId).map(item => ({ id: item.id, tag: item.tag, title: hasProps(item) ? item.props.title : 'N/A' }))
                });
            }
        }*/

        if (filteredItems.length === 0) return null;

        return (
            <>
                {filteredItems.map((item) => {
                    const hasChildNodes = hasChildren(items, item.id);
                    const isExpanded = expandedItems.has(item.id);

                    // Tabs 컴포넌트의 경우 실제 Tab과 Panel 자식 노드만 확인 (가상 자식 제거)
                    const hasTabsChildren = hasTag(item) && item.tag === 'Tabs' && hasChildNodes;

                    // 다른 컴포넌트들의 가상 자식 노드들 (기존 구조 유지)
                    const hasToggleChildren = hasTag(item) && item.tag === 'ToggleButtonGroup' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasCheckboxChildren = hasTag(item) && item.tag === 'CheckboxGroup' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasRadioChildren = hasTag(item) && item.tag === 'RadioGroup' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasListBoxChildren = hasTag(item) && item.tag === 'ListBox' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasGridListChildren = hasTag(item) && item.tag === 'GridList' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasSelectChildren = hasTag(item) && item.tag === 'Select' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasComboBoxChildren = hasTag(item) && item.tag === 'ComboBox' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;
                    const hasTreeChildren = hasTag(item) && item.tag === 'Tree' && hasProps(item) && Array.isArray(item.props.children) && item.props.children.length > 0;

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
                                <div className="elementItemLabel">
                                    {/* Tab과 Panel의 경우 더 명확한 라벨 표시 */}
                                    {hasTag(item) && item.tag === 'Tab' && hasProps(item) ?
                                        `Tab: ${item.props.title || 'Untitled'}` :
                                        hasTag(item) && item.tag === 'Panel' && hasProps(item) ?
                                            `Panel: ${item.props.title || 'Untitled'}` :
                                            getLabel(item)
                                    }
                                </div>
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
                                    {/* 일반 자식 노드들 렌더링 (Tab과 Panel 포함) */}
                                    {hasChildNodes && renderTree(items, getLabel, onClick, onDelete, item.id, depth + 1)}

                                    {/* Tabs 컴포넌트의 경우 가상 자식 노드 제거 - 실제 Tab과 Panel이 위에서 렌더링됨 */}

                                    {/* 다른 컴포넌트들의 가상 자식 노드들 (기존 구조 유지) */}
                                    {hasToggleChildren && (
                                        <>
                                            {/* ToggleButtonGroup 가상 자식 노드들 */}
                                            {childrenAs<ButtonItem>(item.props.children).map((button, index) => (
                                                <div
                                                    key={`${item.id}-toggle-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // ToggleButton을 클릭했을 때는 해당 버튼을 선택
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{button.title || `Button ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* CheckboxGroup 가상 자식 노드들 */}
                                    {hasCheckboxChildren && (
                                        <>
                                            {childrenAs<CheckboxItem>(item.props.children).map((checkbox, index) => (
                                                <div
                                                    key={`${item.id}-checkbox-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{checkbox.label || `Checkbox ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* RadioGroup 가상 자식 노드들 */}
                                    {hasRadioChildren && (
                                        <>
                                            {childrenAs<RadioItem>(item.props.children).map((radio, index) => (
                                                <div
                                                    key={`${item.id}-radio-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{radio.label || `Radio ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ListBox 가상 자식 노드들 */}
                                    {hasListBoxChildren && (
                                        <>
                                            {childrenAs<ListItem>(item.props.children).map((listItem, index) => (
                                                <div
                                                    key={`${item.id}-listitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{listItem.label || `Item ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* GridList 가상 자식 노드들 */}
                                    {hasGridListChildren && (
                                        <>
                                            {childrenAs<ListItem>(item.props.children).map((gridItem, index) => (
                                                <div
                                                    key={`${item.id}-griditem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{gridItem.label || `Item ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Select 가상 자식 노드들 */}
                                    {hasSelectChildren && (
                                        <>
                                            {childrenAs<ListItem>(item.props.children).map((selectItem, index) => (
                                                <div
                                                    key={`${item.id}-selectitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{selectItem.label || `Option ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* ComboBox 가상 자식 노드들 */}
                                    {hasComboBoxChildren && (
                                        <>
                                            {childrenAs<ListItem>(item.props.children).map((comboItem, index) => (
                                                <div
                                                    key={`${item.id}-comboitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={false}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
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
                                                        <div className="elementItemLabel">{comboItem.label || `Option ${index + 1}`}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* Tree 가상 자식 노드들 */}
                                    {hasTreeChildren && (
                                        <>
                                            {childrenAs<TreeItem>(item.props.children).map((treeItem, index) => (
                                                <div
                                                    key={`${item.id}-treeitem-${index}`}
                                                    data-depth={depth + 1}
                                                    data-has-children={treeItem.children && treeItem.children.length > 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectTabElement(item.id as string, item.props, index);
                                                    }}
                                                    className="element"
                                                >
                                                    <div className={`elementItem ${selectedTab?.parentId === item.id && selectedTab?.tabIndex === index ? 'active' : ''}`}>
                                                        <div className="elementItemIndent" style={{ width: `${((depth + 1) * 8) + 0}px` }}>
                                                        </div>
                                                        <div className="elementItemIcon">
                                                            {treeItem.children && treeItem.children.length > 0 ? (
                                                                <Folder
                                                                    color={iconEditProps.color}
                                                                    strokeWidth={iconEditProps.stroke}
                                                                    size={iconEditProps.size}
                                                                />
                                                            ) : (
                                                                <File
                                                                    color={iconEditProps.color}
                                                                    strokeWidth={iconEditProps.stroke}
                                                                    size={iconEditProps.size}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="elementItemLabel">{treeItem.title}</div>
                                                        <div className="elementItemActions">
                                                        </div>
                                                    </div>
                                                    {/* Tree 아이템의 하위 자식들 재귀적으로 렌더링 */}
                                                    {treeItem.children && treeItem.children.length > 0 && (
                                                        <>
                                                            {treeItem.children.map((child, childIndex) => (
                                                                <div
                                                                    key={`${item.id}-treeitem-${index}-child-${childIndex}`}
                                                                    data-depth={depth + 2}
                                                                    data-has-children={false}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        selectTabElement(item.id as string, item.props, index);
                                                                    }}
                                                                    className="element"
                                                                >
                                                                    <div className="elementItem">
                                                                        <div className="elementItemIndent" style={{ width: `${((depth + 2) * 8) + 0}px` }}>
                                                                        </div>
                                                                        <div className="elementItemIcon">
                                                                            <File
                                                                                color={iconEditProps.color}
                                                                                strokeWidth={iconEditProps.stroke}
                                                                                size={iconEditProps.size}
                                                                            />
                                                                        </div>
                                                                        <div className="elementItemLabel">{child.title}</div>
                                                                        <div className="elementItemActions">
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            ))}
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
                    <Components handleAddElement={handleAddElement} selectedElementId={selectedElementId} />
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

    // 드롭 위치나 추가 위치에 따라 position 계산
    const handleComponentAdd = (componentType: string, parentId?: string) => {
        // 현재 부모의 자식 요소 개수 확인
        const siblings = elements.filter(el => el.parent_id === parentId);
        const nextPosition = siblings.length + 1; // 마지막 위치에 추가

        // position을 명시적으로 전달
        handleAddElement(componentType, parentId, nextPosition);
    };

    // 드래그 앤 드롭 처리 부분

    const handleDrop = (event: DragEvent, targetParentId?: string, insertIndex?: number) => {
        event.preventDefault();
        const componentType = event.dataTransfer?.getData('text/plain');

        if (componentType) {
            // insertIndex가 있으면 사용, 없으면 자동 계산
            const position = insertIndex !== undefined
                ? insertIndex + 1 // 0-based index를 1-based order_num으로 변환
                : undefined; // 자동 계산하도록 undefined 전달

            handleAddElement(componentType, targetParentId, position);
        }
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