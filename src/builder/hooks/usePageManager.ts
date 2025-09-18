import { useState, useCallback } from 'react';
import { Page, Element } from '../../types/store';
import { pagesApi } from '../../services/api/PagesApiService';
//import { elementsApi } from '../../services/api/ElementsApiService';
import { useStore } from '../stores';
import type { ElementProps } from '../../types/supabase';
import { ElementUtils } from '../../utils/elementUtils';

export interface UsePageManagerReturn {
    pages: Page[];
    selectedPageId: string | null;
    setPages: React.Dispatch<React.SetStateAction<Page[]>>;
    setSelectedPageId: React.Dispatch<React.SetStateAction<string | null>>;
    fetchElements: (pageId: string) => Promise<void>;
    handleAddPage: (projectId: string, addElement: (element: Element) => void) => Promise<void>;
    initializeProject: (projectId: string, setIsLoading: (loading: boolean) => void, setError: (error: string | null) => void) => Promise<void>;
}

export const usePageManager = (): UsePageManagerReturn => {
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

    const setCurrentPageId = useStore((state) => state.setCurrentPageId);

    const fetchElements = useCallback(async (pageId: string) => {
        if (!pageId) return;

        try {
            const elementsData = await ElementUtils.getElementsByPageId(pageId);
            const { setElements } = useStore.getState();
            // 페이지 로드 시에는 히스토리 기록하지 않음
            setElements(elementsData, { skipHistory: true });

            // 페이지 변경 시 현재 페이지 ID 업데이트
            setCurrentPageId(pageId);
            setSelectedPageId(pageId);

            console.log('📄 페이지 요소 로드 완료:', {
                pageId,
                elementCount: elementsData.length,
                elementIds: elementsData.map(el => el.id)
            });
        } catch (error) {
            console.error('요소 로드 에러:', error);
            throw error; // 에러를 상위로 전달
        }
    }, [setCurrentPageId]);

    const handleAddPage = useCallback(async (projectId: string, addElement: (element: Element) => void) => {
        try {
            const newPage = await pagesApi.createPage({
                project_id: projectId,
                title: `Page ${pages.length + 1}`,
                slug: `page-${pages.length + 1}`,
                order_num: pages.length
            });

            setPages(prev => [...prev, newPage]);
            setSelectedPageId(newPage.id);
            setCurrentPageId(newPage.id);

            // 새 페이지에 기본 body 요소 생성
            const bodyElement = {
                id: ElementUtils.generateId(),
                tag: 'body',
                props: {} as ElementProps,
                parent_id: null,
                page_id: newPage.id,
                order_num: 0,
            };

            const elementData = await ElementUtils.createElement(bodyElement);
            addElement(elementData);
        } catch (error) {
            console.error('페이지 생성 에러:', error);
            throw error; // 에러를 상위로 전달
        }
    }, [pages.length, setCurrentPageId]);

    const initializeProject = useCallback(async (
        projectId: string,
        setIsLoading: (loading: boolean) => void,
        setError: (error: string | null) => void
    ) => {
        try {
            setIsLoading(true);

            // 1. 프로젝트의 페이지들 로드
            const projectPages = await pagesApi.getPagesByProjectId(projectId);
            setPages(projectPages);

            // 2. 첫 번째 페이지가 있으면 선택하고 요소들 로드
            if (projectPages.length > 0) {
                const firstPage = projectPages[0];
                setSelectedPageId(firstPage.id);
                setCurrentPageId(firstPage.id);

                // 첫 번째 페이지의 요소들 로드
                await fetchElements(firstPage.id);
            }
        } catch (error) {
            console.error('프로젝트 초기화 에러:', error);
            const errorMessage = `프로젝트 로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
            setError(errorMessage);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [setCurrentPageId, fetchElements]);

    return {
        pages,
        selectedPageId,
        setPages,
        setSelectedPageId,
        fetchElements,
        handleAddPage,
        initializeProject
    };
};
