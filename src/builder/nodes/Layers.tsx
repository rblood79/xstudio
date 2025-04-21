import { CopyMinus } from 'lucide-react';
import { iconProps } from '../constants';
import { Database, ElementProps } from '../../types/supabase';
import { supabase } from '../../lib/supabase';

type Element = Database['public']['Tables']['elements']['Row'];

interface LayersProps {
    elements: Element[];
    setElements: React.Dispatch<React.SetStateAction<Element[]>>;
    selectedElementId: string | null;
    setSelectedElement: (id: string | null, props?: ElementProps) => void;
    renderTree: (
        items: Element[],
        getLabel: (item: Element) => string,
        onSelect: (item: Element) => void,
        onDelete: (item: Element) => Promise<void>
    ) => React.ReactNode;
    sendElementSelectedMessage: (id: string, props: ElementProps) => void;
    collapseAllTreeItems?: () => void; // 새로운 props 추가
}

export function Layers({
    elements,
    setElements,
    selectedElementId,
    setSelectedElement,
    renderTree,
    sendElementSelectedMessage,
    collapseAllTreeItems
}: LayersProps) {
    return (
        <div className="sidebar_elements">
            <div className="panel-header">
                <h3 className='panel-title'>Layer</h3>
                <div className="header-actions">
                    <button
                        className='iconButton'
                        aria-label="collapseAll"
                        onClick={() => {
                            // collapseAllTreeItems 함수가 있으면 호출
                            if (collapseAllTreeItems) {
                                collapseAllTreeItems();
                            }
                        }}
                    >
                        <CopyMinus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                    </button>
                </div>
            </div>
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
    );
}