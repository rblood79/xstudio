/**
 * AI Panel - ChatInterface Integration
 *
 * This component renders the ChatInterface within the Sidebar's AI tab.
 * ChatInterface handles AI-powered builder interactions using Groq service.
 */

import './index.css';
import { ChatInterface } from './ChatInterface';

function AI() {
    return (
        <div className="sidebar-section-ai">
            <ChatInterface />
        </div>
    );
}

export default AI;