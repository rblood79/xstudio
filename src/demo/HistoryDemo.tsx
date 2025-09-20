import React, { useState, useEffect } from 'react';
import { useStore } from '../builder/stores/elements';
import { historyManager } from '../builder/stores/history';
import { Button } from '../builder/components/list';
import { supabase } from '../env/supabase.client';

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

    // 데이터베이스 관련 상태
    const [useDatabase, setUseDatabase] = useState(false);
    const [dbStatus, setDbStatus] = useState('');

    // 페이지 초기화
    useEffect(() => {
        const demoPageId = '550e8400-e29b-41d4-a716-446655440000';
        setCurrentPageId(demoPageId);
        historyManager.setCurrentPage(demoPageId);
    }, [setCurrentPageId]);

    // 히스토리 정보 업데이트
    useEffect(() => {
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);
    }, [elements]);

    const handleAddElement = () => {
        // UUID 생성 (crypto.randomUUID() 사용 가능하면 사용, 아니면 fallback)
        const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            // Fallback UUID 생성
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        const newElement = {
            id: generateUUID(),
            tag: 'div',
            props: {
                className: 'p-4 bg-blue-100 border rounded',
                children: `요소 ${elements.length + 1}`
            },
            parent_id: null,
            page_id: '550e8400-e29b-41d4-a716-446655440000', // UUID 형식으로 변경
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
        const demoPageId = '550e8400-e29b-41d4-a716-446655440000';
        historyManager.clearPageHistory(demoPageId);
        // 히스토리 초기화 후 현재 페이지 재설정
        historyManager.setCurrentPage(demoPageId);
        const info = historyManager.getCurrentPageHistory();
        setHistoryInfo(info);

        // 사용자에게 피드백 제공
        alert('히스토리가 초기화되었습니다. 이제 새로운 작업을 시작할 수 있습니다.');
    };

    // 로컬 스토리지에 히스토리 저장 (임시 해결책)
    const saveHistoryToLocalStorage = () => {
        try {
            setDbStatus('로컬 저장 중...');

            const pageHistory = historyManager.getCurrentPageHistory();
            localStorage.setItem('demo-page-history', JSON.stringify(pageHistory));

            setDbStatus('로컬 저장 완료!');
            setTimeout(() => setDbStatus(''), 3000);
        } catch (error) {
            setDbStatus(`로컬 저장 실패: ${error}`);
            setTimeout(() => setDbStatus(''), 5000);
        }
    };

    // 로컬 스토리지에서 히스토리 로드
    const loadHistoryFromLocalStorage = () => {
        try {
            setDbStatus('로컬 로드 중...');

            const savedHistory = localStorage.getItem('demo-page-history');
            if (savedHistory) {
                const historyData = JSON.parse(savedHistory);
                console.log('로드된 히스토리 데이터:', historyData);
                setDbStatus('로컬 로드 완료!');
                setTimeout(() => setDbStatus(''), 3000);
            } else {
                setDbStatus('저장된 히스토리 없음');
                setTimeout(() => setDbStatus(''), 3000);
            }
        } catch (error) {
            setDbStatus(`로컬 로드 실패: ${error}`);
            setTimeout(() => setDbStatus(''), 5000);
        }
    };

    // elements 테이블에 히스토리 저장 (간단한 방법)
    const saveHistoryToDatabase = async () => {
        try {
            setDbStatus('저장 중...');

            const demoPageId = '550e8400-e29b-41d4-a716-446655440000';
            const pageHistory = historyManager.getCurrentPageHistory();

            // 기존 히스토리 데이터 삭제
            await supabase
                .from('elements')
                .delete()
                .eq('page_id', demoPageId)
                .eq('tag', 'history');

            // 새로운 히스토리 데이터 저장
            const { error } = await supabase
                .from('elements')
                .insert({
                    id: `history_${Date.now()}`,
                    tag: 'history',
                    props: JSON.stringify({
                        history_data: pageHistory,
                        created_at: new Date().toISOString()
                    }),
                    parent_id: null,
                    page_id: demoPageId,
                    order_num: -1
                });

            if (error) throw error;

            setDbStatus('저장 완료!');
            setTimeout(() => setDbStatus(''), 3000);
        } catch (error) {
            setDbStatus(`저장 실패: ${error}`);
            setTimeout(() => setDbStatus(''), 5000);
        }
    };

    // elements 테이블에서 히스토리 로드
    const loadHistoryFromDatabase = async () => {
        try {
            setDbStatus('로드 중...');

            const demoPageId = '550e8400-e29b-41d4-a716-446655440000';
            const { data, error } = await supabase
                .from('elements')
                .select('*')
                .eq('page_id', demoPageId)
                .eq('tag', 'history')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const props = JSON.parse(data[0].props);
                const historyData = props.history_data;
                console.log('로드된 히스토리 데이터:', historyData);
                setDbStatus('로드 완료!');
                setTimeout(() => setDbStatus(''), 3000);
            } else {
                setDbStatus('저장된 히스토리 없음');
                setTimeout(() => setDbStatus(''), 3000);
            }
        } catch (error) {
            setDbStatus(`로드 실패: ${error}`);
            setTimeout(() => setDbStatus(''), 5000);
        }
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
                    <div>현재 인덱스: {historyInfo.currentIndex} / 총 엔트리: {historyInfo.totalEntries}</div>
                    <div>Undo 가능: {historyInfo.canUndo ? 'true' : 'false'}</div>
                    <div>Redo 가능: {historyInfo.canRedo ? 'true' : 'false'}</div>
                </div>
            </div>

            {/* 로컬 스토리지 테스트 패널 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">로컬 스토리지 테스트 (권장)</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                        onPress={saveHistoryToLocalStorage}
                        children="히스토리 로컬 저장"
                    />
                    <Button
                        onPress={loadHistoryFromLocalStorage}
                        children="히스토리 로컬 로드"
                    />
                </div>
                <div className="text-sm text-gray-600">
                    <div>상태: {dbStatus || '대기 중'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        로컬 스토리지는 브라우저에 저장되며 새로고침 후에도 유지됩니다
                    </div>
                </div>
            </div>

            {/* 데이터베이스 테스트 패널 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">데이터베이스 테스트 (elements 테이블 사용)</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                        onPress={saveHistoryToDatabase}
                        children="히스토리 DB 저장"
                    />
                    <Button
                        onPress={loadHistoryFromDatabase}
                        children="히스토리 DB 로드"
                    />
                    <Button
                        onPress={() => setUseDatabase(!useDatabase)}
                        children={useDatabase ? "DB 모드 해제" : "DB 모드 활성화"}
                    />
                </div>
                <div className="text-sm text-gray-600">
                    <div>DB 모드: {useDatabase ? '활성화' : '비활성화'}</div>
                    <div>상태: {dbStatus || '대기 중'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        히스토리는 elements 테이블에 tag='history'로 저장됩니다
                    </div>
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
                    <li><strong>새로운 기능:</strong> 로컬 스토리지 또는 elements 테이블에 히스토리를 저장할 수 있습니다</li>
                </ul>
            </div>
        </div>
    );
};