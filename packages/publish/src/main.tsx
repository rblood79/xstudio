/**
 * Publish App Entry Point
 *
 * 🚀 Phase 10 B2.3: Publish 앱 엔트리포인트
 *
 * @since 2025-12-11 Phase 10 B2.3
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
