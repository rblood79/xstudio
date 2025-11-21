import { useCallback, useMemo } from 'react';
import { CirclePlus, Layout, X } from 'lucide-react';
import { iconProps } from '../../utils/ui/uiConstants';
import { pagesApi } from '../../services/api/PagesApiService';
import { useStore } from '../stores';
import { useLayoutsStore } from '../stores/layouts';
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

/**
 * PageLayoutBadge - Page 항목에 Layout 선택 기능 표시
 */
function PageLayoutBadge({ pageId }: { pageId: string }) {
    const pages = useStore((state) => state.pages);
    const setPages = useStore((state) => state.setPages);
    const layouts = useLayoutsStore((state) => state.layouts);

    const page = useMemo(() => pages.find((p) => p.id === pageId), [pages, pageId]);
    const currentLayout = useMemo(
        () => layouts.find((l) => l.id === page?.layout_id),
        [layouts, page?.layout_id]
    );

    const handleLayoutChange = useCallback(async (layoutId: string | null) => {
        try {
            // 1. Update store
            const updatedPages = pages.map((p) =>
                p.id === pageId ? { ...p, layout_id: layoutId } : p
            );
            setPages(updatedPages);

            // 2. Save to IndexedDB
            const db = await getDB();
            await db.pages.update(pageId, { layout_id: layoutId });

            console.log(`📐 [Pages] Layout changed for page ${pageId}:`, layoutId || 'None');
        } catch (error) {
            console.error('❌ [Pages] Failed to update page layout:', error);
        }
    }, [pageId, pages, setPages]);

    if (layouts.length === 0) {
        return null;
    }

    return (
        <div className="page-layout-badge" onClick={(e) => e.stopPropagation()}>
            <select
                className="page-layout-select"
                value={page?.layout_id || ''}
                onChange={(e) => handleLayoutChange(e.target.value || null)}
                title="Select layout for this page"
            >
                <option value="">No Layout</option>
                {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                        {layout.name}
                    </option>
                ))}
            </select>
            {currentLayout && (
                <button
                    className="page-layout-clear-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleLayoutChange(null);
                    }}
                    title="Remove layout"
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
}

export function Pages({ pages, pageList, handleAddPage, renderTree, fetchElements }: PagesProps) {
    const setPages = useStore((state) => state.setPages);

    const handleDeletePage = async (page: UnifiedPage) => {
        // 1. DB에서 삭제 (✅ 최적화된 API Service 사용 - 자동 캐시 무효화)
        try {
            await pagesApi.deletePage(page.id);
        } catch (error) {
            console.error("페이지 삭제 에러:", error);
            return;
        }

        // 2. pageList에서 제거
        pageList.remove(page.id);

        // 3. 남은 페이지 목록 계산
        const remainingPages = pages.filter(p => p.id !== page.id);

        // 4. Zustand store에서도 제거
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

        // 5. 남은 페이지가 있으면 자동으로 선택
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
                    <div className="pages-list">
                        {pages.map((page) => (
                            <div
                                key={page.id}
                                className="page-item"
                                onClick={() => fetchElements(page.id)}
                            >
                                <span className="page-name">{page.title}</span>
                                <PageLayoutBadge pageId={page.id} />
                                <button
                                    className="iconButton delete-btn"
                                    aria-label={`Delete ${page.title}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePage(page);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 