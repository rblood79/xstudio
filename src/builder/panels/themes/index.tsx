/**/
import './index.css';

import { useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Palette } from 'lucide-react';
import ThemeEditor from './ThemeEditor';
import { ThemeInitializer } from './ThemeInitializer';

export default function Theme() {
    const { projectId } = useParams<{ projectId: string }>();

    const handleOpenThemeStudio = () => {
        if (projectId) {
            // Open in new tab/window
            window.open(`/theme/${projectId}`, '_blank');
        }
    };

    return (
        <div className="sidebar-content">
            {!projectId ? (
                <div className="error-state">
                    <p className="error-message">Project ID is required</p>
                </div>
            ) : (
                <>
                    <div className="panel-header">
                        <h3 className="panel-title">Quick Theme Editor</h3>
                        <div className="header-actions">
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
}export { default as ThemePanel } from './ThemeStudio';
