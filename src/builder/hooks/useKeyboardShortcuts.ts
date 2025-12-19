import { useEffect } from 'react';
import { useStore } from '../stores';

export function useKeyboardShortcuts() {
    // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
    const undo = useStore((state) => state.undo);
    const redo = useStore((state) => state.redo);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);
} 