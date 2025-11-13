/**
 * ThemesPanel - 테마 관리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Quick Theme Editor와 Theme Studio 접근 제공
 */

import './index.css';
import { useParams } from 'react-router-dom';
import type { PanelProps } from '../core/types';
import { Button } from '../../components/Button';
import { Palette } from 'lucide-react';
import ThemeEditor from './ThemeEditor';
import { ThemeInitializer } from './ThemeInitializer';

function ThemesContent() {
    const { projectId } = useParams<{ projectId: string }>();

    const handleOpenThemeStudio = () => {
        if (projectId) {
            // Open in new tab/window
            window.open(`/theme/${projectId}`, '_blank');
        }
    };

    return (
        <div className="themes-panel">
            {!projectId ? (
                <div className="panel-empty-state">
                    <p className="empty-message">Project ID is required</p>
                </div>
            ) : (
                <>
                    <div className="panel-header">
                        <h3 className="panel-title">Quick Theme Editor</h3>
                        <div className="panel-actions">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleOpenThemeStudio}
                                className="theme-studio-button"
                            >
                                <Palette size={14} />
                                Open Theme Studio
                            </Button>
                        </div>
                    </div>

                    <ThemeInitializer projectId={projectId} />
                    <ThemeEditor projectId={projectId} />
                </>
            )}
        </div>
    );
}

export function ThemesPanel({ isActive }: PanelProps) {
    // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
    if (!isActive) {
        return null;
    }

    return <ThemesContent />;
}
