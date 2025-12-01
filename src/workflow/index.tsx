/**
 * Workflow Visualization Entry Point
 *
 * 프로젝트 워크플로우 시각화 모듈의 진입점
 * Builder와 별도의 iframe에서 실행되거나 독립적으로 사용 가능
 */

import { createRoot } from 'react-dom/client';
import { App } from './App';

// ============================================
// Styles Injection
// ============================================

const injectBaseStyles = () => {
  const style = document.createElement('style');
  style.id = 'workflow-base-styles';
  style.textContent = `
    * {
      box-sizing: border-box;
    }

    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.5;
      color: var(--text-color, #1a1a1a);
      background: var(--background-color, #f5f5f5);
    }
  `;
  document.head.appendChild(style);
};

// ============================================
// Initialize Workflow
// ============================================

function initWorkflow() {
  // Inject base styles
  injectBaseStyles();

  // Create root element if not exists
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }

  // Mount React app
  const root = createRoot(rootElement);
  root.render(<App />);

  console.log('[Workflow] Initialized');
}

// ============================================
// Auto-initialize
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkflow);
} else {
  initWorkflow();
}

// ============================================
// Exports
// ============================================

export { App } from './App';
export { useWorkflowStore, getWorkflowStore } from './store';
export type * from './types';
