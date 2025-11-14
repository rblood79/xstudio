import { CirclePlus } from 'lucide-react';
import { iconProps } from '../../utils/ui/uiConstants';
import { Database } from '../../types/integrations/supabase.types';
import { supabase } from '../../env/supabase.client';
import { useStore } from '../stores';

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
    const setPages = useStore((state) => state.setPages);

    console.log('[Pages] Rendering:', {
        pagesCount: pages.length,
        pages: pages.map(p => ({ id: p.id, title: p.title })),
        renderTree: typeof renderTree
    });

    const handleDeletePage = async (page: Page) => {
        // 1. DB에서 삭제
        const { error } = await supabase.from("pages").delete().eq("id", page.id);
        if (error) {
            console.error("페이지 삭제 에러:", error);
            return;
        }

        // 2. pageList에서 제거
        pageList.remove(page.id);

        // 3. 남은 페이지 목록 계산
        const remainingPages = pages.filter(p => p.id !== page.id);

        // 4. Zustand store에서도 제거
        // Database Page 타입을 store Page 타입으로 변환 (title → name)
        const updatedPages = remainingPages.map(p => ({
            id: p.id,
            name: p.title,
            slug: p.slug,
            parent_id: p.parent_id,
            order_num: p.order_num
        }));
        setPages(updatedPages);

        console.log('✅ 페이지 삭제 완료:', page.title);

        // 5. 남은 페이지가 있으면 자동으로 선택
        if (remainingPages.length > 0) {
            // order_num이 0인 페이지(Home)를 우선 선택, 없으면 첫 번째 페이지 선택
            const homePage = remainingPages.find(p => p.order_num === 0);
            const pageToSelect = homePage || remainingPages[0];

            console.log('🔄 삭제 후 자동 페이지 선택:', pageToSelect.title);
            await fetchElements(pageToSelect.id);
        }
    };

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
                        handleDeletePage
                    )
                )}
            </div>
        </div>
    );
} 