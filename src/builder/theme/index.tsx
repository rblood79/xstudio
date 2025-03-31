/**/
import './index.css';

import { useParams } from 'react-router-dom';
import ThemeEditor from './ThemeEditor';

export default function Theme() {
    const { projectId } = useParams<{ projectId: string }>();

    if (!projectId) {
        return (
            <div className="sidebar-content theme">
                <p className="text-red-500">Project ID is required</p>
            </div>
        );
    }

    return <ThemeEditor projectId={projectId} />;
}