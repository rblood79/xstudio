import { useState, useRef, useCallback } from 'react';
import { useListData } from 'react-stately';
import { Element } from '../../types/core/store.types';
import { type Page as ApiPage } from '../../services/api/PagesApiService';
import { getDB } from '../../lib/db';
import { useStore } from '../stores';
import type { ElementProps } from '../../types/integrations/supabase.types';
import { ElementUtils } from '../../utils/element/elementUtils';

/**
 * API 응답 타입 (에러를 throw하지 않고 return)
 */
export interface ApiResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}

/**
 * ⭐ Nested Routes & Slug System: 페이지 생성 파라미터
 */
export interface AddPageParams {
    projectId: string;
    title: string;
    slug: string;
    layoutId?: string | null;
    parentId?: string | null;
}

export interface UsePageManagerReturn {
    pages: ApiPage[];
    selectedPageId: string | null;
    setSelectedPageId: (id: string | null) => void;
    fetchElements: (pageId: string) => Promise<ApiResult<Element[]>>;
    addPage: (projectId: string) => Promise<ApiResult<ApiPage>>;
    addPageWithParams: (params: AddPageParams) => Promise<ApiResult<ApiPage>>;
    initializeProject: (projectId: string) => Promise<ApiResult<ApiPage[]>>;
    // 직접 접근 (필요시)
    pageList: ReturnType<typeof useListData<ApiPage>>;
}

export interface UsePageManagerProps {
    requestAutoSelectAfterUpdate?: (elementId: string) => void;
}

/**
 * usePageManager - React Stately useListData 기반 페이지 관리
 *
 * wrapper 함수 불필요: 모든 함수가 에러를 return으로 처리
 * useCallback 사용: fetchElements, initializeProject는 메모이제이션됨 (무한 재렌더 방지)
 *
 * @param props - requestAutoSelectAfterUpdate 함수 (iframe messenger에서)
 * @example
 * ```tsx
 * const { requestAutoSelectAfterUpdate } = useIframeMessenger();
 * const { pages, selectedPageId, fetchElements, addPage, initializeProject } = usePageManager({ requestAutoSelectAfterUpdate });
 *
 * // wrapper 없이 직접 사용
 * const result = await fetchElements(pageId);
 * if (!result.success) {
 *   console.error('에러:', result.error);
 * }
 * ```
 */
export const usePageManager = ({ requestAutoSelectAfterUpdate }: UsePageManagerProps = {}): UsePageManagerReturn => {
    // 1. pages 관리: useListData (append/remove 자동)
    const pageList = useListData<ApiPage>({
        initialItems: [],
        getKey: (page) => page.id,
    });

    // 2. selectedPageId: 단순 state
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    // 3. 중복 초기화 방지
    const initializingRef = useRef<string | null>(null);

    const setCurrentPageId = useStore((state) => state.setCurrentPageId);
    const setPages = useStore((state) => state.setPages);

    /**
     * fetchElements - 페이지 요소 로드
     * useCallback으로 래핑하여 불필요한 재생성 방지
     * 
     * NOTE: Zustand의 setCurrentPageId는 안정적인 함수 참조이므로 dependency에서 제외 가능
     * 
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const fetchElements = useCallback(async (pageId: string): Promise<ApiResult<Element[]>> => {
        if (!pageId) {
            return { success: false, error: new Error('pageId is required') };
        }

        try {
            // IndexedDB에서 페이지 요소 로드 (빠름! 10-50ms)
            const db = await getDB();
            const elementsData = await db.elements.getByPage(pageId);

            // ⭐ Layout/Slot System: 페이지에 적용된 Layout의 요소들도 함께 로드
            const { pages } = useStore.getState();
            const currentPage = pages.find(p => p.id === pageId);
            const allElements = [...elementsData];

            if (currentPage?.layout_id) {
                const layoutElements = await db.elements.getByLayout(currentPage.layout_id);
                console.log(`📥 [fetchElements] Layout ${currentPage.layout_id.slice(0, 8)} 요소 ${layoutElements.length}개 함께 로드`);
                // Layout 요소들 추가 (중복 제거)
                const existingIds = new Set(allElements.map(el => el.id));
                layoutElements.forEach(el => {
                    if (!existingIds.has(el.id)) {
                        allElements.push(el);
                    }
                });
            }

            const { setElements, setSelectedElement } = useStore.getState() as unknown as {
                setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
                setSelectedElement: (elementId: string | null) => void;
            };

            // 히스토리 추적이 일시정지된 경우에도 페이지 로드는 허용

            // 페이지 선택 시 order_num이 0인 요소(body) 찾기
            const bodyElement = elementsData.find(el => el.order_num === 0);

            // 🎯 CRITICAL: setElements 전에 auto-select 예약 (race condition 방지)
            if (bodyElement && requestAutoSelectAfterUpdate) {
                requestAutoSelectAfterUpdate(bodyElement.id);
            }

            // 항상 히스토리 기록하지 않음 (useEffect → UPDATE_ELEMENTS → ACK → auto-select 실행)
            setElements(allElements, { skipHistory: true });

            // 페이지 변경 시 현재 페이지 ID 업데이트
            setCurrentPageId(pageId);
            setSelectedPageId(pageId);

            // body 요소 자동 선택
            if (bodyElement) {
                setSelectedElement(bodyElement.id);
            }

            return { success: true, data: allElements };
        } catch (error) {
            console.error('요소 로드 에러:', error);
            return { success: false, error: error as Error };
        }
        // setCurrentPageId is stable function from store
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestAutoSelectAfterUpdate]);

    /**
     * addPage - 새 페이지 추가
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const addPage = async (
        projectId: string
    ): Promise<ApiResult<ApiPage>> => {
        try {
            // Zustand store의 pages를 사용하여 최대 order_num을 찾기
            const currentPages = useStore.getState().pages;

            // 현재 페이지들의 최대 order_num을 찾아서 +1
            const maxOrderNum = currentPages.reduce((max, page) =>
                Math.max(max, page.order_num || 0), -1
            );
            const nextOrderNum = maxOrderNum + 1;

            // IndexedDB에 새 페이지 저장
            const db = await getDB();
            const newPageData = {
                id: ElementUtils.generateId(),
                project_id: projectId,
                name: `Page ${nextOrderNum + 1}`,
                slug: `/page-${nextOrderNum + 1}`,
                parent_id: null,
                order_num: nextOrderNum,
                layout_id: null, // ⭐ Layout/Slot System: 페이지 생성 시 layout_id 초기화
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const newPage = await db.pages.insert(newPageData);

            // useListData에 추가 (ApiPage 타입으로 변환)
            const apiPage: ApiPage = {
                id: newPage.id,
                project_id: newPage.project_id,
                title: newPage.name, // name → title
                slug: newPage.slug,
                parent_id: newPage.parent_id,
                order_num: newPage.order_num,
                created_at: newPage.created_at,
                updated_at: newPage.updated_at
            };
            pageList.append(apiPage);
            setSelectedPageId(newPage.id);
            setCurrentPageId(newPage.id);

            // Zustand store 업데이트 (현재 store의 pages에 새 페이지 추가)
            setPages([...currentPages, newPage]);

            // 새 페이지에 기본 body 요소 생성
            const bodyElement: Element = {
                id: ElementUtils.generateId(),
                tag: 'body',
                props: {} as ElementProps,
                parent_id: null,
                page_id: newPage.id,
                order_num: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // IndexedDB에 저장 (store 업데이트 건너뛰기)
            // store를 업데이트하면 이전 페이지의 모든 요소가 함께 Preview에 전송되므로
            // DB에만 저장하고 fetchElements로 새 페이지의 요소만 로드
            await db.elements.insert(bodyElement);
            console.log('✅ [IndexedDB] body 요소 생성:', bodyElement.id);

            // 새 페이지의 요소들을 로드 (Preview 업데이트 + body 자동 선택)
            await fetchElements(newPage.id);

            console.log('✅ 페이지 추가 완료:', newPage.title);
            return { success: true, data: newPage };
        } catch (error) {
            console.error('페이지 생성 에러:', error);
            return { success: false, error: error as Error };
        }
    };

    /**
     * addPageWithParams - 파라미터를 받아서 새 페이지 추가
     * ⭐ Nested Routes & Slug System: title, slug, layoutId, parentId를 지정하여 생성
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const addPageWithParams = async (
        params: AddPageParams
    ): Promise<ApiResult<ApiPage>> => {
        const { projectId, title, slug, layoutId = null, parentId = null } = params;

        try {
            // Zustand store의 pages를 사용하여 최대 order_num을 찾기
            const currentPages = useStore.getState().pages;

            // 현재 페이지들의 최대 order_num을 찾아서 +1
            const maxOrderNum = currentPages.reduce((max, page) =>
                Math.max(max, page.order_num || 0), -1
            );
            const nextOrderNum = maxOrderNum + 1;

            // IndexedDB에 새 페이지 저장
            const db = await getDB();
            const newPageData = {
                id: ElementUtils.generateId(),
                project_id: projectId,
                name: title,
                slug: slug,
                parent_id: parentId,
                order_num: nextOrderNum,
                layout_id: layoutId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const newPage = await db.pages.insert(newPageData);

            // useListData에 추가 (ApiPage 타입으로 변환)
            const apiPage: ApiPage = {
                id: newPage.id,
                project_id: newPage.project_id,
                title: newPage.name,
                slug: newPage.slug,
                parent_id: newPage.parent_id,
                order_num: newPage.order_num,
                created_at: newPage.created_at,
                updated_at: newPage.updated_at
            };
            pageList.append(apiPage);
            setSelectedPageId(newPage.id);
            setCurrentPageId(newPage.id);

            // Zustand store 업데이트 (현재 store의 pages에 새 페이지 추가)
            setPages([...currentPages, newPage]);

            // 새 페이지에 기본 body 요소 생성
            const bodyElement: Element = {
                id: ElementUtils.generateId(),
                tag: 'body',
                props: {} as ElementProps,
                parent_id: null,
                page_id: newPage.id,
                order_num: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // IndexedDB에 저장
            await db.elements.insert(bodyElement);
            console.log('✅ [IndexedDB] body 요소 생성:', bodyElement.id);

            // 새 페이지의 요소들을 로드 (Preview 업데이트 + body 자동 선택)
            await fetchElements(newPage.id);

            console.log('✅ 페이지 추가 완료 (with params):', newPage.name, 'slug:', newPage.slug);
            return { success: true, data: apiPage };
        } catch (error) {
            console.error('페이지 생성 에러 (with params):', error);
            return { success: false, error: error as Error };
        }
    };

    /**
     * initializeProject - 프로젝트 초기화
     * useCallback으로 래핑하여 불필요한 재생성 방지
     * 
     * NOTE: pageList는 useListData의 결과로 매 렌더마다 새 객체를 반환하므로 
     *       dependency에 포함하면 무한 루프 발생. 함수 내에서 직접 접근.
     *       Zustand 함수들(setPages, setCurrentPageId)은 안정적이므로 제외 가능.
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const initializeProject = useCallback(async (projectId: string): Promise<ApiResult<ApiPage[]>> => {
        // 중복 호출 방지: 같은 프로젝트가 이미 초기화 중이면 스킵
        if (initializingRef.current === projectId) {
            return { success: false, error: new Error('프로젝트가 이미 초기화 중입니다') };
        }

        try {
            initializingRef.current = projectId;

            // 1. IndexedDB에서 프로젝트의 페이지들 로드
            const db = await getDB();
            const allPages = await db.pages.getAll();
            const projectPages = allPages.filter(p => p.project_id === projectId);

            // 2. 기존 페이지 제거 후 새로 추가
            const existingKeys = pageList.items.map((p) => p.id);
            if (existingKeys.length > 0) {
                pageList.remove(...existingKeys);
            }

            // IndexedDB Page를 ApiPage로 변환
            // IndexedDB에 title 또는 name 필드가 있을 수 있음 (Supabase 동기화 이슈)
            const apiPages: ApiPage[] = projectPages.map(p => ({
                id: p.id,
                project_id: p.project_id,
                title: (p as unknown as { title?: string }).title || p.name || 'Untitled', // title 또는 name 필드 지원
                slug: p.slug,
                parent_id: p.parent_id,
                order_num: p.order_num,
                created_at: p.created_at || new Date().toISOString(),
                updated_at: p.updated_at || new Date().toISOString()
            }));

            apiPages.forEach((page) => pageList.append(page));

            // 3. Zustand store에도 저장 (NodesPanel이 접근할 수 있도록)
            // ApiPage → store Page 변환 (title → name)
            // ⭐ Layout/Slot System: layout_id도 함께 저장
            const storePages = apiPages.map(p => {
                // IndexedDB의 원본 페이지에서 layout_id 가져오기
                const originalPage = projectPages.find(pp => pp.id === p.id);
                return {
                    id: p.id,
                    name: p.title, // title → name
                    slug: p.slug,
                    parent_id: p.parent_id,
                    order_num: p.order_num,
                    layout_id: (originalPage as { layout_id?: string | null })?.layout_id || null
                };
            });
            setPages(storePages);

            // 4. order_num이 0인 페이지(Home)를 우선 선택, 없으면 첫 번째 페이지 선택
            if (apiPages.length > 0) {
                const homePage = apiPages.find(p => p.order_num === 0);
                const pageToSelect = homePage || apiPages[0];

                setCurrentPageId(pageToSelect.id);

                const result = await fetchElements(pageToSelect.id);
                if (!result.success) {
                    initializingRef.current = null;
                    return { success: false, error: result.error };
                }
            }

            initializingRef.current = null;
            return { success: true, data: apiPages };
        } catch (error) {
            console.error('프로젝트 초기화 에러:', error);
            initializingRef.current = null;
            return { success: false, error: error as Error };
        }
        // pageList, setCurrentPageId, setPages are stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchElements]);

    return {
        pages: pageList.items,
        selectedPageId,
        setSelectedPageId,
        fetchElements,
        addPage,
        addPageWithParams,
        initializeProject,
        pageList, // 직접 접근 (필요시)
    };
};
