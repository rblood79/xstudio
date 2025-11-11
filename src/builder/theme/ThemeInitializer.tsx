import { useEffect } from 'react';
import { useUnifiedThemeStore } from '../../stores/themeStore';

export function ThemeInitializer({ projectId }: { projectId: string }) {
    const loadActiveTheme = useUnifiedThemeStore(s => s.loadActiveTheme);
    useEffect(() => {
        if (projectId) {
            loadActiveTheme(projectId);
        }
        // deps 에 loadActiveTheme 넣지 않아 ref 변화로 재실행 방지
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);
    return null;
}