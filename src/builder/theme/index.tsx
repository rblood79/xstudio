/**/
import './index.css';

import { useParams } from 'react-router-dom';
import ThemeEditor from './ThemeEditor';
import { ThemeInitializer } from './ThemeInitializer';

export default function Theme() {
    const { projectId } = useParams<{ projectId: string }>();

    return (
        <div className="sidebar-content">
            {!projectId ? (
                <p className="text-red-500">Project ID is required</p>
            ) : (
                <>
                    <ThemeInitializer projectId={projectId} />
                    <ThemeEditor projectId={projectId} />
                </>
            )}
        </div>
    );
}