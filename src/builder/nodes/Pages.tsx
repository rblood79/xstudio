import { PanelTop, CirclePlus } from 'lucide-react';
import { iconProps } from '../../builder/constants';
import { Database } from '../../types/supabase';
import { supabase } from '../../lib/supabase';

type Page = Database['public']['Tables']['pages']['Row'];

interface PagesProps {
    pages: Page[];
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    handleAddPage: () => void;
    renderTree: (
        items: Page[],
        getLabel: (item: Page) => string,
        onSelect: (item: Page) => void,
        onDelete: (item: Page) => Promise<void>
    ) => React.ReactNode;
    fetchElements: (pageId: string) => Promise<void>;
}

export function Pages({ pages, setPages, handleAddPage, renderTree, fetchElements }: PagesProps) {
    return (
        <div className="sidebar_pages">
            <h3><PanelTop color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> Pages</h3>
            <button
                className="iconButton absolute right-0 top-0"
                aria-label="Add Page"
                onClick={handleAddPage}
            >
                <CirclePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
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
    );
} 