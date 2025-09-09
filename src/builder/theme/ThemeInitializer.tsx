import { useEffect } from 'react';
import { useStore } from '../stores';

export function ThemeInitializer({ projectId }: { projectId: string }) {
    const loadTheme = useStore(s => s.loadTheme);
    useEffect(() => {
        if (projectId) {
            loadTheme(projectId);
        }
        // deps 에 loadTheme 넣지 않아 ref 변화로 재실행 방지
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);
    return null;
}