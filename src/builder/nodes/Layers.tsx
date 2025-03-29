import { Layers2 } from 'lucide-react';
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
}

export function Layers({
    elements,
    setElements,
    selectedElementId,
    setSelectedElement,
    renderTree,
    sendElementSelectedMessage
}: LayersProps) {
    return (
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
    );
} 