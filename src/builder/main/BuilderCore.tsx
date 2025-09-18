import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Key } from 'react-aria-components';

import { useStore } from '../stores';
//import { Element as StoreElement } from '../stores/elements'; // 스토어 Element 타입
import { Element } from '../../types/store'; // 훅들이 기대하는 Element 타입

import { BuilderHeader, Breakpoint } from './BuilderHeader';
import { BuilderWorkspace } from './BuilderWorkspace';
import { BuilderViewport } from './BuilderViewport';
import Inspector from '../inspector';
import Sidebar from '../sidebar';
import SelectionOverlay from '../overlay';

import { useErrorHandler } from '../hooks/useErrorHandler';
import { useElementCreator } from '../hooks/useElementCreator';
import { usePageManager } from '../hooks/usePageManager';
import { useIframeMessenger } from '../hooks/useIframeMessenger';
import { useThemeManager } from '../hooks/useThemeManager';
import { useValidation } from '../hooks/useValidation';

import './index.css';
import { MessageService } from '../../utils/messaging';

export const BuilderCore: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Store 상태
    const elements = useStore((state) => state.elements);
    const currentPageId = useStore((state) => state.currentPageId);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const setSelectedElement = useStore((state) => state.setSelectedElement);

    // 새로운 히스토리 시스템 - 직접 상태 접근으로 무한 루프 방지
    const snapshots = useStore((state) => state.snapshots || []);
    const currentIndex = useStore((state) => state.currentIndex ?? -1);

    // Zundo 패턴: 히스토리 정보 계산 개선
    const historyInfo = {
        current: snapshots.length > 0 ? (currentIndex >= 0 ? currentIndex + 1 : 0) : 0,
        total: snapshots.length
    };

    // 디버깅을 위한 로그 추가
    console.log('🔍 히스토리 정보 계산:', {
        snapshotsLength: snapshots.length,
        currentIndex,
        calculatedCurrent: snapshots.length > 0 ? currentIndex + 1 : 0,
        calculatedTotal: snapshots.length,
        historyInfo,
        rawCurrentIndex: useStore.getState().currentIndex
    });

    // Zundo 패턴: Undo/Redo 조건 개선
    const canUndo = snapshots.length > 0;
    const canRedo = currentIndex < snapshots.length - 1;

    // 훅 사용
    const { error, isLoading, setError, setIsLoading, handleError, clearError } = useErrorHandler();
    const { handleAddElement } = useElementCreator();
    const {
        pages,
        selectedPageId,
        setPages,
        fetchElements,
        handleAddPage: createPage,
        initializeProject
    } = usePageManager();
    const {
        handleIframeLoad,
        handleMessage,
        handleUndo,
        handleRedo,
        sendElementsToIframe,
        updateElementProps,
        iframeReadyState
    } = useIframeMessenger();
    const { applyThemeTokens, loadProjectTheme } = useThemeManager();
    const { validateOrderNumbers } = useValidation();

    // Local 상태
    const [breakpoint, setBreakpoint] = useState(new Set<Key>(['screen']));

    const [breakpoints] = useState<Breakpoint[]>([
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        { id: 'desktop', label: 'Desktop', max_width: 1280, max_height: 1080 },
        { id: 'tablet', label: 'Tablet', max_width: 1024, max_height: 800 },
        { id: 'mobile', label: 'Mobile', max_width: 390, max_height: 844 }
    ]);

    // 프로젝트 초기화
    useEffect(() => {
        if (projectId) {
            initializeProject(projectId, setIsLoading, setError);
            loadProjectTheme(projectId);
        }
    }, [projectId, initializeProject, setIsLoading, setError, loadProjectTheme]);

    // 프로젝트 초기화 후 프리뷰에 요소 전송
    useEffect(() => {
        if (projectId && elements.length > 0 && iframeReadyState === 'ready') {
            console.log('🚀 프로젝트 초기화 후 프리뷰 전송:', {
                projectId,
                elementCount: elements.length,
                elementIds: elements.map(el => el.id)
            });
            sendElementsToIframe(elements);
        }
    }, [projectId, elements, iframeReadyState, sendElementsToIframe]);

    // 테마 토큰 적용
    useEffect(() => {
        applyThemeTokens();
    }, [applyThemeTokens]);

    // order_num 검증
    useEffect(() => {
        if (elements.length > 0) {
            validateOrderNumbers(elements);
        }
    }, [elements, validateOrderNumbers]);

    // 페이지 추가 핸들러
    const handleAddPage = useCallback(async () => {
        if (!projectId) return;
        try {
            // 타입 변환을 통해 호환성 확보
            const addElement = useStore.getState().addElement as (element: Element) => void;
            await createPage(projectId, addElement);
        } catch (error) {
            handleError(error, '페이지 생성');
        }
    }, [projectId, createPage, handleError]);

    // 요소 추가 핸들러
    const handleAddElementWrapper = useCallback(async (tag: string, parentId?: string) => {
        if (!currentPageId) return;
        try {
            // 타입 변환을 통해 호환성 확보
            const addElement = useStore.getState().addElement as (element: Element) => void;
            await handleAddElement(
                tag,
                currentPageId,
                parentId || selectedElementId, // parentId가 있으면 사용, 없으면 selectedElementId 사용
                elements,
                addElement,
                sendElementsToIframe
            );
        } catch (error) {
            handleError(error, '요소 생성');
        }
    }, [currentPageId, selectedElementId, elements, handleAddElement, sendElementsToIframe, handleError]);

    // 요소 로드 핸들러
    const fetchElementsWrapper = useCallback(async (pageId: string) => {
        try {
            await fetchElements(pageId);
        } catch (error) {
            handleError(error, '요소 로드');
        }
    }, [fetchElements, handleError]);

    // 프리뷰 관련 핸들러들
    const handlePreview = useCallback(() => {
        console.log('Preview clicked');
    }, []);

    const handlePlay = useCallback(() => {
        console.log('Play clicked');
    }, []);

    const handlePublish = useCallback(() => {
        console.log('Publish clicked');
    }, []);

    // 클릭 외부 감지
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // UI 요소들을 클릭한 경우는 무시
            if (target.closest('.selection-overlay') ||
                target.closest('.sidebar') ||
                target.closest('.inspector') ||
                target.closest('.header') ||
                target.closest('.footer') ||
                target.closest('#previewFrame')
            ) {
                return;
            }

            // workspace나 bg 클래스를 가진 요소를 클릭했을 때만 선택 해제
            const isWorkspaceBackground = target.classList.contains('workspace') || target.classList.contains('bg');
            if (isWorkspaceBackground) {
                setSelectedElement(null);
                MessageService.clearOverlay();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setSelectedElement]);

    return (
        <div className="app">
            {/* 에러 표시 */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={clearError}>×</button>
                </div>
            )}

            {/* 로딩 표시 */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">Loading...</div>
                </div>
            )}

            <BuilderViewport>
                <BuilderHeader
                    projectId={projectId}
                    breakpoint={breakpoint}
                    breakpoints={breakpoints}
                    onBreakpointChange={(value) => setBreakpoint(new Set<Key>([value]))}
                    currentPageId={currentPageId}
                    historyInfo={historyInfo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onPreview={handlePreview}
                    onPlay={handlePlay}
                    onPublish={handlePublish}
                />

                <BuilderWorkspace
                    projectId={projectId}
                    breakpoint={new Set(Array.from(breakpoint).map(String))}
                    breakpoints={breakpoints}
                    onIframeLoad={handleIframeLoad}
                    onMessage={handleMessage}
                >
                    <SelectionOverlay />
                </BuilderWorkspace>

                <Sidebar
                    pages={pages}
                    setPages={setPages}
                    handleAddPage={handleAddPage}
                    handleAddElement={handleAddElementWrapper}
                    fetchElements={fetchElementsWrapper}
                    selectedPageId={selectedPageId}
                />

                <aside className="inspector">
                    <Inspector />
                </aside>

                <footer className="footer">footer</footer>
            </BuilderViewport>
        </div>
    );
};