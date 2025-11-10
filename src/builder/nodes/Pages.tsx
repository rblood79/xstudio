import { CirclePlus } from 'lucide-react';
import { iconProps } from '../../utils/uiConstants';
import { Database } from '../../types/supabase';
import { supabase } from '../../env/supabase.client';

type Page = Database['public']['Tables']['pages']['Row'];

interface PagesProps {
    pages: Page[];
    pageList: { remove: (...keys: string[]) => void };
    handleAddPage: () => void;
    renderTree: (
        items: Page[],
        getLabel: (item: Page) => string,
        onSelect: (item: Page) => void,
        onDelete: (item: Page) => Promise<void>
    ) => React.ReactNode;
    fetchElements: (pageId: string) => Promise<void>;
}

export function Pages({ pages, pageList, handleAddPage, renderTree, fetchElements }: PagesProps) {
    return (
        <div className="sidebar_pages">
            <div className="panel-header">
                <h3 className='panel-title'>Pages</h3>
                <div className="header-actions">
                    <button
                        className='iconButton'
                        aria-label="Add Page"
                        onClick={handleAddPage}
                    >
                        <CirclePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                    </button>
                </div>
            </div>

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
                            else pageList.remove(page.id);
                        }
                    )
                )}
            </div>
        </div>
    );
} 