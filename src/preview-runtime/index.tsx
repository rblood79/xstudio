/**
 * Preview Runtime Entry Point
 *
 * srcdoc iframe 내에서 독립적으로 실행되는 Preview Runtime의 진입점입니다.
 * Builder의 main.tsx와 완전히 분리된 별도의 React 앱입니다.
 */

import { createRoot } from 'react-dom/client';
import { PreviewApp } from './PreviewApp';

// ============================================
// Styles (인라인으로 포함되거나 별도 CSS 파일)
// ============================================

const injectBaseStyles = () => {
  const style = document.createElement('style');
  style.id = 'preview-base-styles';
  style.textContent = `
    * {
      box-sizing: border-box;
    }

    html, body, #preview-root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.5;
      color: var(--text-color, #1a1a1a);
      background: var(--background-color, #ffffff);
    }

    .preview-container {
      width: 100%;
      min-height: 100%;
    }

    .preview-body {
      width: 100%;
      min-height: 100%;
    }

    .preview-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      font-size: 14px;
    }

    .preview-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-size: 14px;
    }

    /* Lasso Selection Box */
    .lasso-selection-box {
      position: fixed;
      border: 2px dashed var(--action-primary-bg, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 9999;
    }

    /* Slot Container */
    .slot-container {
      min-height: 40px;
    }
  `;
  document.head.appendChild(style);
};

// ============================================
// Initialize Preview Runtime
// ============================================

function initPreviewRuntime() {
  // 기본 스타일 주입
  injectBaseStyles();

  // Preview 마커 설정
  document.body.setAttribute('data-preview', 'true');
  document.body.setAttribute('data-preview-runtime', 'true');

  // Root 엘리먼트 찾기 또는 생성
  let root = document.getElementById('preview-root');

  if (!root) {
    root = document.createElement('div');
    root.id = 'preview-root';
    document.body.appendChild(root);
  }

  // React 앱 렌더링
  const reactRoot = createRoot(root);
  reactRoot.render(<PreviewApp />);

  console.log('[Preview Runtime] Initialized');
}

// ============================================
// Auto-initialize when DOM is ready
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreviewRuntime);
} else {
  initPreviewRuntime();
}

// ============================================
// Exports (번들 시 사용)
// ============================================

export { PreviewApp } from './PreviewApp';
export { getPreviewStore, usePreviewStore } from './store';
export { navigateInPreview } from './router';
export { messageSender } from './messaging';
