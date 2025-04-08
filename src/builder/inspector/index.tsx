import Layout from './layout';
import './index.css';

import { FileCode } from 'lucide-react';
function Inspector() {
    return (
        <div className="inspector2">
            <h3><FileCode strokeWidth={1} size={21} />Props</h3>
            <Layout />
        </div>
    );
}

export default Inspector;