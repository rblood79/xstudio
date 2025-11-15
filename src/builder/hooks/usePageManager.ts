import { useState, useRef } from 'react';
import { useListData } from 'react-stately';
import { Element } from '../../types/core/store.types';
import { pagesApi, type Page as ApiPage } from '../../services/api/PagesApiService';
import { elementsApi } from '../../services/api/ElementsApiService';
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

export interface UsePageManagerReturn {
    pages: ApiPage[];
    selectedPageId: string | null;
    setSelectedPageId: (id: string | null) => void;
    fetchElements: (pageId: string) => Promise<ApiResult<Element[]>>;
    addPage: (projectId: string, addElement: (element: Element) => void) => Promise<ApiResult<ApiPage>>;
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
 * useCallback 0개: 모두 일반 함수로 처리
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
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const fetchElements = async (pageId: string): Promise<ApiResult<Element[]>> => {
        if (!pageId) {
            return { success: false, error: new Error('pageId is required') };
        }

        try {
            const elementsData = await elementsApi.getElementsByPageId(pageId);
            const { setElements, setSelectedElement, isTracking } = useStore.getState() as unknown as {
                setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
                setSelectedElement: (elementId: string | null) => void;
                isTracking: boolean;
            };

            // 히스토리 추적이 일시정지된 경우에도 페이지 로드는 허용
            if (!isTracking) {
                console.log('⚠️ 히스토리 추적 일시정지됨 - 페이지 요소 로드 계속 진행');
            }

            // 페이지 선택 시 order_num이 0인 요소(body) 찾기
            const bodyElement = elementsData.find(el => el.order_num === 0);

            // 🎯 CRITICAL: setElements 전에 auto-select 예약 (race condition 방지)
            if (bodyElement && requestAutoSelectAfterUpdate) {
                requestAutoSelectAfterUpdate(bodyElement.id);
            }

            // 항상 히스토리 기록하지 않음 (useEffect → UPDATE_ELEMENTS → ACK → auto-select 실행)
            setElements(elementsData, { skipHistory: true });

            // 페이지 변경 시 현재 페이지 ID 업데이트
            setCurrentPageId(pageId);
            setSelectedPageId(pageId);

            // body 요소 자동 선택
            if (bodyElement) {
                setSelectedElement(bodyElement.id);
            }

            console.log('📄 페이지 요소 로드 완료:', {
                pageId,
                elementCount: elementsData.length,
            });

            return { success: true, data: elementsData };
        } catch (error) {
            console.error('요소 로드 에러:', error);
            return { success: false, error: error as Error };
        }
    };

    /**
     * addPage - 새 페이지 추가
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const addPage = async (
        projectId: string,
        addElement: (element: Element) => void
    ): Promise<ApiResult<ApiPage>> => {
        try {
            // Zustand store의 pages를 사용하여 최대 order_num을 찾기
            const currentPages = useStore.getState().pages;

            console.log('🔍 현재 페이지들:', {
                pageListItems: pageList.items.length,
                storePages: currentPages.length,
                storePagesData: currentPages.map(p => ({ id: p.id, name: p.name, order_num: p.order_num }))
            });

            // 현재 페이지들의 최대 order_num을 찾아서 +1
            const maxOrderNum = currentPages.reduce((max, page) =>
                Math.max(max, page.order_num || 0), -1
            );
            const nextOrderNum = maxOrderNum + 1;

            console.log('📊 order_num 계산:', {
                maxOrderNum,
                nextOrderNum,
                pageTitle: `Page ${nextOrderNum + 1}`
            });

            const newPage = await pagesApi.createPage({
                project_id: projectId,
                title: `Page ${nextOrderNum + 1}`,
                slug: `page-${nextOrderNum + 1}`,
                order_num: nextOrderNum,
            });

            // useListData에 추가
            pageList.append(newPage);
            setSelectedPageId(newPage.id);
            setCurrentPageId(newPage.id);

            // Zustand store 업데이트 (현재 store의 pages에 새 페이지 추가)
            // ApiPage를 store의 Page 타입으로 변환 (title → name, parent_id 추가)
            const storePage = {
                id: newPage.id,
                name: newPage.title,
                slug: newPage.slug,
                parent_id: null,
                order_num: newPage.order_num
            };
            setPages([...currentPages, storePage]);

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

            // DB에 직접 저장 (store 업데이트 건너뛰기)
            // store를 업데이트하면 이전 페이지의 모든 요소가 함께 Preview에 전송되므로
            // DB에만 저장하고 fetchElements로 새 페이지의 요소만 로드
            await elementsApi.createElement(bodyElement);

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
     * initializeProject - 프로젝트 초기화
     *
     * @returns ApiResult (성공 시 data, 실패 시 error)
     */
    const initializeProject = async (projectId: string): Promise<ApiResult<ApiPage[]>> => {
        // 중복 호출 방지: 같은 프로젝트가 이미 초기화 중이면 스킵
        if (initializingRef.current === projectId) {
            console.warn('⚠️ 프로젝트가 이미 초기화 중입니다:', projectId);
            return { success: false, error: new Error('프로젝트가 이미 초기화 중입니다') };
        }

        try {
            initializingRef.current = projectId;
            console.log('🔄 프로젝트 초기화 시작 (usePageManager):', projectId);

            // 1. 프로젝트의 페이지들 로드
            const projectPages = await pagesApi.getPagesByProjectId(projectId);

            // 2. 기존 페이지 제거 후 새로 추가
            const existingKeys = pageList.items.map((p) => p.id);
            if (existingKeys.length > 0) {
                pageList.remove(...existingKeys);
            }
            projectPages.forEach((page) => pageList.append(page));

            // 3. Zustand store에도 저장 (NodesPanel이 접근할 수 있도록)
            // ApiPage[]를 store의 Page 타입으로 변환 (title → name, parent_id 추가)
            const storePages = projectPages.map(p => ({
                id: p.id,
                name: p.title,
                slug: p.slug,
                parent_id: null,
                order_num: p.order_num
            }));
            setPages(storePages);

            // 4. order_num이 0인 페이지(Home)를 우선 선택, 없으면 첫 번째 페이지 선택
            if (projectPages.length > 0) {
                const homePage = projectPages.find(p => p.order_num === 0);
                const pageToSelect = homePage || projectPages[0];

                setCurrentPageId(pageToSelect.id);
                console.log('✅ 기본 페이지 선택:', pageToSelect.title, '(order_num:', pageToSelect.order_num, ')');

                const result = await fetchElements(pageToSelect.id);
                if (!result.success) {
                    initializingRef.current = null;
                    return { success: false, error: result.error };
                }
            }

            console.log('✅ 프로젝트 초기화 완료 (usePageManager):', projectPages.length, 'pages');
            initializingRef.current = null;
            return { success: true, data: projectPages };
        } catch (error) {
            console.error('프로젝트 초기화 에러:', error);
            initializingRef.current = null;
            return { success: false, error: error as Error };
        }
    };

    return {
        pages: pageList.items,
        selectedPageId,
        setSelectedPageId,
        fetchElements,
        addPage,
        initializeProject,
        pageList, // 직접 접근 (필요시)
    };
};
