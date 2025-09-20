import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../stores/elements-new';
import { historyManager } from '../stores/history';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { MessageService } from '../../utils/messaging';

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

    // 디버깅을 위한 로그 추가
    if (import.meta.env.DEV) {
        console.log('🔍 히스토리 정보:', {
            historyInfo,
            currentPageId,
            elementsCount: elements.length
        });
    }

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
        <div className="h-screen flex flex-col">
            {/* BuilderHeader는 별도 컴포넌트로 분리 */}
            <div className="flex-1 flex">
                {/* 사이드바 영역 */}
                <div className="w-64 bg-gray-100 border-r">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4">컴포넌트</h2>
                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    const newElement = {
                                        id: `element_${Date.now()}`,
                                        tag: 'div',
                                        props: { className: 'p-4 bg-blue-100' },
                                        parent_id: null,
                                        page_id: currentPageId || '',
                                        order_num: elements.length
                                    };
                                    useStore.getState().addElement(newElement);
                                }}
                                className="w-full p-2 text-left bg-white border rounded hover:bg-gray-50"
                            >
                                Div 추가
                            </button>
                        </div>
                    </div>
                </div>

                {/* 메인 콘텐츠 영역 */}
                <div className="flex-1 flex flex-col">
                    {/* 툴바 */}
                    <div className="h-12 bg-white border-b flex items-center px-4 space-x-2">
                        <button
                            onClick={handleUndo}
                            disabled={!historyInfo.canUndo}
                            className={`px-3 py-1 rounded text-sm ${historyInfo.canUndo
                                    ? 'bg-gray-200 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Undo
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={!historyInfo.canRedo}
                            className={`px-3 py-1 rounded text-sm ${historyInfo.canRedo
                                    ? 'bg-gray-200 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Redo
                        </button>
                        <div className="text-sm text-gray-500 ml-4">
                            히스토리: {historyInfo.currentIndex + 1}/{historyInfo.totalEntries}
                        </div>
                    </div>

                    {/* 캔버스 영역 */}
                    <div className="flex-1 bg-gray-50 p-4">
                        <div className="bg-white border rounded-lg p-4 min-h-full">
                            <h3 className="text-lg font-semibold mb-4">페이지 캔버스</h3>
                            <div className="space-y-2">
                                {elements.map((element) => (
                                    <div
                                        key={element.id}
                                        className={`p-2 border rounded cursor-pointer ${selectedElementId === element.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => setSelectedElement(element.id)}
                                    >
                                        <div className="text-sm font-medium">{element.tag}</div>
                                        <div className="text-xs text-gray-500">
                                            ID: {element.id}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 속성 패널 */}
                <div className="w-80 bg-white border-l">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4">속성</h2>
                        {selectedElementId ? (
                            <div>
                                <div className="text-sm text-gray-600 mb-2">
                                    선택된 요소: {selectedElementId}
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">
                                        클래스명
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedElementId ? elements.find(el => el.id === selectedElementId)?.props?.className || '' : ''}
                                        onChange={(e) => {
                                            if (selectedElementId) {
                                                useStore.getState().updateElementProps(selectedElementId, {
                                                    className: e.target.value
                                                });
                                            }
                                        }}
                                        className="w-full p-2 border rounded"
                                        placeholder="클래스명 입력"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">요소를 선택하세요</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
