import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../stores/elements';
import { historyManager } from '../stores/history';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { MessageService } from '../../utils/messaging';
import { BuilderHeader } from './BuilderHeader';
import { BuilderViewport } from './BuilderViewport';
import { BuilderWorkspace } from './BuilderWorkspace';
import './index.css';

export const BuilderCore: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Store 상태
    const elements = useStore((state) => state.elements);
    const currentPageId = useStore((state) => state.currentPageId);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const setSelectedElement = useStore((state) => state.setSelectedElement);

    // 새로운 히스토리 시스템 사용
    const [historyInfo, setHistoryInfo] = useState({
        canUndo: false,
        canRedo: false,
        totalEntries: 0,
        currentIndex: -1
    });

    // 브레이크포인트 상태
    const [breakpoint, setBreakpoint] = useState<Set<string>>(new Set(['desktop']));
    const breakpoints = [
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        { id: 'desktop', label: 'Desktop', max_width: 1440, max_height: 900 },
        { id: 'tablet', label: 'Tablet', max_width: 768, max_height: 1024 },
        { id: 'mobile', label: 'Mobile', max_width: 375, max_height: 667 }
    ];

    // 히스토리 정보 업데이트
    useEffect(() => {
        if (currentPageId) {
            const info = historyManager.getCurrentPageHistory();
            setHistoryInfo(info);
        }
    }, [currentPageId, elements]);

    // Undo/Redo 핸들러
    const handleUndo = useCallback(() => {
        if (import.meta.env.DEV) {
            console.log('🔄 BuilderCore Undo 실행');
        }
        const { undo } = useStore.getState();
        undo();

        // 히스토리 정보 업데이트
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);

        if (import.meta.env.DEV) {
            console.log('✅ BuilderCore Undo 완료', info);
        }
    }, []);

    const handleRedo = useCallback(() => {
        if (import.meta.env.DEV) {
            console.log('🔄 BuilderCore Redo 실행');
        }
        const { redo } = useStore.getState();
        redo();

        // 히스토리 정보 업데이트
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);

        if (import.meta.env.DEV) {
            console.log('✅ BuilderCore Redo 완료', info);
        }
    }, []);

    // 훅 사용
    const { error, isLoading, setError, setIsLoading, handleError, clearError } = useErrorHandler();

    // 키보드 단축키 처리
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl+Z 또는 Cmd+Z (Undo)
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                if (historyInfo.canUndo) {
                    handleUndo();
                }
            }
            // Ctrl+Y 또는 Cmd+Shift+Z (Redo)
            else if (
                ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')
            ) {
                event.preventDefault();
                if (historyInfo.canRedo) {
                    handleRedo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, historyInfo.canUndo, historyInfo.canRedo]);

    // 메시지 서비스 초기화
    useEffect(() => {
        const messageService = new MessageService();

        // 메시지 리스너 등록
        const handleMessage = (event: MessageEvent) => {
            messageService.handleMessage(event, {
                projectId: projectId || '',
                setElements: useStore.getState().setElements,
                setSelectedElement: useStore.getState().setSelectedElement,
                addElement: useStore.getState().addElement,
                updateElementProps: useStore.getState().updateElementProps,
                removeElement: useStore.getState().removeElement,
                setError,
                setIsLoading
            });
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [projectId, setError, setIsLoading]);

    // 브레이크포인트 변경 핸들러
    const handleBreakpointChange = useCallback((value: string) => {
        setBreakpoint(new Set([value]));
    }, []);

    // iframe 로드 핸들러
    const handleIframeLoad = useCallback(() => {
        console.log('Preview iframe loaded');
    }, []);

    // 메시지 핸들러
    const handleMessage = useCallback((event: MessageEvent) => {
        console.log('Message received:', event.data);
    }, []);

    // 액션 핸들러들
    const handlePreview = useCallback(() => {
        console.log('Preview clicked');
    }, []);

    const handlePlay = useCallback(() => {
        console.log('Play clicked');
    }, []);

    const handlePublish = useCallback(() => {
        console.log('Publish clicked');
    }, []);

    // 로딩 상태 표시
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">로딩 중...</div>
            </div>
        );
    }

    // 에러 상태 표시
    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-red-500 text-lg mb-4">오류가 발생했습니다</div>
                    <div className="text-gray-600 mb-4">{error}</div>
                    <button
                        onClick={clearError}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BuilderViewport>
            <div className="app">
                <div className="contents">
                    <BuilderHeader
                        projectId={projectId}
                        breakpoint={breakpoint}
                        breakpoints={breakpoints}
                        onBreakpointChange={handleBreakpointChange}
                        historyInfo={{
                            current: historyInfo.currentIndex + 1,
                            total: historyInfo.totalEntries
                        }}
                        canUndo={historyInfo.canUndo}
                        canRedo={historyInfo.canRedo}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onPreview={handlePreview}
                        onPlay={handlePlay}
                        onPublish={handlePublish}
                    />

                    <BuilderWorkspace
                        projectId={projectId}
                        breakpoint={breakpoint}
                        breakpoints={breakpoints}
                        onIframeLoad={handleIframeLoad}
                        onMessage={handleMessage}
                    />
                </div>
            </div>
        </BuilderViewport>
    );
};
