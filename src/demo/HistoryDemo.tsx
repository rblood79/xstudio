import React, { useState, useEffect } from 'react';
import { useStore } from '../builder/stores/elements';
import { historyManager } from '../builder/stores/history';
import { Button } from '../builder/components/list';

/**
 * 새로운 History 시스템 데모 컴포넌트
 * 실제 사용법을 보여주는 예제
 */
export const HistoryDemo: React.FC = () => {
    const elements = useStore((state) => state.elements);
    const addElement = useStore((state) => state.addElement);
    const updateElementProps = useStore((state) => state.updateElementProps);
    const removeElement = useStore((state) => state.removeElement);
    const undo = useStore((state) => state.undo);
    const redo = useStore((state) => state.redo);
    const setCurrentPageId = useStore((state) => state.setCurrentPageId);

    const [historyInfo, setHistoryInfo] = useState({
        canUndo: false,
        canRedo: false,
        totalEntries: 0,
        currentIndex: -1
    });

    // 페이지 초기화
    useEffect(() => {
        setCurrentPageId('demo-page');
        historyManager.setCurrentPage('demo-page');
    }, [setCurrentPageId]);

    // 히스토리 정보 업데이트
    useEffect(() => {
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);
    }, [elements]);

    const handleAddElement = () => {
        const newElement = {
            id: `element_${Date.now()}`,
            tag: 'div',
            props: {
                className: 'p-4 bg-blue-100 border rounded',
                children: `요소 ${elements.length + 1}`
            },
            parent_id: null,
            page_id: 'demo-page',
            order_num: elements.length
        };
        addElement(newElement);
    };

    const handleUpdateElement = (elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (element) {
            const currentContent = (element.props as Record<string, unknown>).content || (element.props as Record<string, unknown>).children || '요소';
            updateElementProps(elementId, {
                ...element.props,
                className: `p-4 bg-${Math.random() > 0.5 ? 'green' : 'yellow'}-100 border rounded`,
                children: `${currentContent} (업데이트됨)`
            } as Record<string, unknown>);
        }
    };

    const handleRemoveElement = (elementId: string) => {
        removeElement(elementId);
    };

    const handleUndo = () => {
        undo();
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);
    };

    const handleRedo = () => {
        redo();
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);
    };

    const handleClearHistory = () => {
        historyManager.clearPageHistory('demo-page');
        // 히스토리 초기화 후 현재 페이지 재설정
        historyManager.setCurrentPage('demo-page');
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);

        // 사용자에게 피드백 제공
        alert('히스토리가 초기화되었습니다. 이제 새로운 작업을 시작할 수 있습니다.');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">새로운 History 시스템 데모</h1>

            {/* 컨트롤 패널 */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-4">컨트롤</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                        onPress={handleAddElement}
                        children="요소 추가"
                    />
                    <Button
                        onPress={handleUndo}
                        children="Undo"
                        isDisabled={!historyInfo.canUndo}
                    />
                    <Button
                        onPress={handleRedo}
                        isDisabled={!historyInfo.canRedo}
                        children="Redo"
                    />
                    <Button
                        onPress={handleClearHistory}
                        children="히스토리 초기화"
                    />
                </div>

                {/* 히스토리 정보 */}
                <div className="text-sm text-gray-600">
                    <div>현재 인덱스: {historyInfo.currentIndex + 1} / 총 엔트리: {historyInfo.totalEntries}</div>
                    <div>Undo 가능: {historyInfo.canUndo ? 'true' : 'false'}</div>
                    <div>Redo 가능: {historyInfo.canRedo ? 'true' : 'false'}</div>
                </div>
            </div>

            {/* 요소 목록 */}
            <div className="bg-white border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">요소 목록 ({elements.length}개)</h2>
                {elements.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        요소가 없습니다. "요소 추가" 버튼을 클릭하세요.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {elements.map((element, index) => (
                            <div
                                key={element.id}
                                className="flex items-center justify-between p-3 border rounded bg-gray-50"
                            >
                                <div className="flex-1">
                                    <div className="font-medium">
                                        {index + 1}. {element.tag} (ID: {element.id})
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        클래스: {element.props.className || '없음'}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        내용: {String((element.props as Record<string, unknown>).content || (element.props as Record<string, unknown>).children || '없음')}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onPress={() => handleUpdateElement(element.id)}
                                        children="업데이트"
                                    />
                                    <Button
                                        onPress={() => handleRemoveElement(element.id)}
                                        children="삭제"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 사용법 안내 */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">사용법</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>요소를 추가하고 수정/삭제해보세요</li>
                    <li>Undo/Redo 버튼으로 변경사항을 되돌리거나 다시 적용할 수 있습니다</li>
                    <li>키보드 단축키: Ctrl+Z (Undo), Ctrl+Y (Redo)</li>
                    <li>각 페이지별로 독립적인 히스토리가 관리됩니다</li>
                    <li>최대 50개의 히스토리 엔트리가 유지됩니다</li>
                </ul>
            </div>
        </div>
    );
};
