import React from "react";
import { PanelTop, Layers2, File, SquarePlus, LibraryBig, Database, Users, Settings, CirclePlus, Trash, Palette, WandSparkles, Settings2 } from 'lucide-react';
import { supabase } from "../../env/supabase.client";
import { useStore } from '../stores/elements';
import "./index.css";

interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
}

interface SidebarProps {
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    handleAddPage: () => Promise<void>;
    handleAddElement: (tag: string, text: string) => Promise<void>;
    fetchElements: (pageId: string) => Promise<void>;
}

export default function Sidebar({ pages, setPages, handleAddPage, handleAddElement, fetchElements }: SidebarProps) {
    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const { setElements, setSelectedElement } = useStore();
    const [iconProps] = React.useState({ color: "#171717", stroke: 1, size: 21 });
    const [iconEditProps] = React.useState({ color: "#171717", stroke: 1, size: 16 });

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
                        <div className={`elementItem ${selectedElementId === item.id ? 'active' : ''}`} style={{
                            paddingLeft: `${(depth * 16) + 16}px`
                        }}>
                            <span>{getLabel(item)}</span>
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

    const sendElementSelectedMessage = (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => {
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

    return (
        <aside className="sidebar">
            <div className="sidebar_nav">
                <div className="sidebar_group">
                    <button aria-label="Add File"><File color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Add Square"><SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Library"><LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Database"><Database color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Palette"><Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Magic Wand"><WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                </div>
                <div className="sidebar_group">
                    <button aria-label="Users"><Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                    <button aria-label="Settings"><Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                </div>
            </div>
            <div className="sidebar_content">
                <div className="sidebar_pages">
                    <h3><PanelTop color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> Pages</h3>
                    <button
                        className="iconButton absolute right-0 top-0"
                        aria-label="Add Page"
                        onClick={handleAddPage}
                    >
                        <CirclePlus color={iconEditProps.color} strokeWidth={iconEditProps.stroke} size={iconEditProps.size} />
                    </button>
                    <div className="elements">
                        {pages.length === 0 ? (
                            <p className="no_element">No pages available</p>
                        ) : (
                            renderTree(
                                pages,
                                (page) => page.title,
                                (page) => fetchElements(page.id),
                                async (page) => {
                                    const { error } = await supabase.from("pages").delete().eq("id", page.id);
                                    if (error) console.error("페이지 삭제 에러:", error);
                                    else setPages((prev) => prev.filter((p) => p.id !== page.id));
                                }
                            )
                        )}
                    </div>
                </div>
                <div className="sidebar_elements">
                    <h3><Layers2 color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> Layers</h3>
                    <div className="elements">
                        {elements.length === 0 ? (
                            <p className="no_element">No element available</p>
                        ) : (
                            renderTree(
                                elements,
                                (el) => el.tag,
                                (el) => {
                                    setSelectedElement(el.id, el.props);
                                    requestAnimationFrame(() => sendElementSelectedMessage(el.id, el.props));
                                },
                                async (el) => {
                                    const { error } = await supabase.from("elements").delete().eq("id", el.id);
                                    if (error) console.error("요소 삭제 에러:", error);
                                    else {
                                        if (el.id === selectedElementId) {
                                            setSelectedElement(null);
                                            window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
                                        }
                                        setElements(elements.filter((e) => e.id !== el.id));
                                    }
                                }
                            )
                        )}
                    </div>
                </div>
            </div>
            <div className="sidebar_components">
                <button aria-label="Add Div" onClick={() => handleAddElement("div", "")}>D</button>
                <button aria-label="Add span" onClick={() => handleAddElement("span", "")}>T</button>
                <button aria-label="Add Section" onClick={() => handleAddElement("section", "")}>S</button>
                <button aria-label="Add Button" onClick={() => handleAddElement("button", "btn")}>B</button>
                <button aria-label="Add Table" onClick={() => handleAddElement("table", "")}>TL</button>
            </div>
        </aside>
    );
} 