import { useEffect, useCallback } from 'react';
import { useStore } from '../stores';

export function useKeyboardShortcuts() {
    // 🚀 직접 store에서 함수 호출 (selector 캐싱 문제 방지)
    const handleUndo = useCallback(async () => {
        console.log('[Keyboard] Undo triggered');
        const { undo } = useStore.getState();
        await undo();
    }, []);

    const handleRedo = useCallback(async () => {
        console.log('[Keyboard] Redo triggered');
        const { redo } = useStore.getState();
        await redo();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                // 캡처 단계에서 이벤트 가로채기 (브라우저 기본 동작 방지)
                e.preventDefault();
                e.stopPropagation();

                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
        };

        // capture: true로 캡처 단계에서 먼저 이벤트 처리
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [handleUndo, handleRedo]);
} 