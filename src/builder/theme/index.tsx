/**/
import './index.css';

import { useParams } from 'react-router-dom';
import { Button } from '../components/list';
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
                <p className="text-red-500">Project ID is required</p>
            ) : (
                <>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--spacing-md)',
                        paddingBottom: 'var(--spacing-sm)',
                        borderBottom: '1px solid var(--border-color)'
                    }}>
                        <h3 style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            margin: 0
                        }}>
                            Quick Theme Editor
                        </h3>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleOpenThemeStudio}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}
                        >
                            <Palette size={14} />
                            Open Theme Studio
                        </Button>
                    </div>

                    <ThemeInitializer projectId={projectId} />
                    <ThemeEditor projectId={projectId} />
                </>
            )}
        </div>
    );
}