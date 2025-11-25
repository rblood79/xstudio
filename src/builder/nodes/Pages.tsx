import { CirclePlus } from 'lucide-react';
import { iconProps } from '../../utils/ui/uiConstants';
import { pagesApi } from '../../services/api/PagesApiService';
import { useStore } from '../stores';
import { getDB } from '../../lib/db';
import type { Page as UnifiedPage } from '../../types/builder/unified.types';

interface PagesProps {
    pages: UnifiedPage[];
    pageList: { remove: (...keys: string[]) => void };
    handleAddPage: () => void;
    renderTree: (
        items: UnifiedPage[],
        getLabel: (item: UnifiedPage) => string,
        onSelect: (item: UnifiedPage) => void,
        onDelete: (item: UnifiedPage) => Promise<void>
    ) => React.ReactNode;
    fetchElements: (pageId: string) => Promise<void>;
}

export function Pages({ pages, pageList, handleAddPage, renderTree, fetchElements }: PagesProps) {
    const setPages = useStore((state) => state.setPages);

    const handleDeletePage = async (page: UnifiedPage) => {
        try {
            // 1. IndexedDB에서 해당 페이지의 모든 요소 조회 및 삭제
            const db = await getDB();
            const pageElements = await db.elements.getByPage(page.id);
            const elementIds = pageElements.map(el => el.id);

            console.log(`🗑️ Page "${page.title}" 삭제 시작: ${elementIds.length}개 요소 포함`);

            // 2. IndexedDB에서 요소들 삭제
            if (elementIds.length > 0) {
                await db.elements.deleteMany(elementIds);
                console.log(`✅ [IndexedDB] ${elementIds.length}개 요소 삭제 완료`);
            }

            // 3. IndexedDB에서 페이지 삭제
            await db.pages.delete(page.id);
            console.log(`✅ [IndexedDB] Page "${page.title}" 삭제 완료`);

            // 4. Supabase에서 삭제 (캐시 무효화 포함)
            await pagesApi.deletePage(page.id);
            console.log(`✅ [Supabase] Page "${page.title}" 삭제 완료`);

        } catch (error) {
            console.error("페이지 삭제 에러:", error);
            return;
        }

        // 5. pageList에서 제거
        pageList.remove(page.id);

        // 6. 남은 페이지 목록 계산
        const remainingPages = pages.filter(p => p.id !== page.id);

        // 7. Zustand store에서도 제거
        // UnifiedPage 타입을 store Page 타입으로 변환 (title → name)
        const updatedPages = remainingPages.map(p => ({
            id: p.id,
            name: p.title, // UnifiedPage.title → store Page.name
            slug: p.slug,
            parent_id: p.parent_id,
            order_num: p.order_num
        }));
        setPages(updatedPages);

        console.log('✅ 페이지 삭제 완료:', page.title);

        // 8. 남은 페이지가 있으면 자동으로 선택
        if (remainingPages.length > 0) {
            // order_num이 0인 페이지(Home)를 우선 선택, 없으면 첫 번째 페이지 선택
            const homePage = remainingPages.find(p => p.order_num === 0);
            const pageToSelect = homePage || remainingPages[0];

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