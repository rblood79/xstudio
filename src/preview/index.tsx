/**
 * Preview Runtime Entry Point
 *
 * srcdoc iframe 내에서 독립적으로 실행되는 Preview Runtime의 진입점입니다.
 * Builder의 main.tsx와 완전히 분리된 별도의 React 앱입니다.
 */

import { createRoot } from 'react-dom/client';
import { App } from './App';

// React Aria 컴포넌트 스타일 (srcdoc에서 필요)
import '../shared/components/styles/index.css';

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

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }

    /* ⭐ body가 React 루트이자 body element로 사용됨 */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.5;
      color: var(--text-color, #1a1a1a);
      background: var(--background-color, #ffffff);
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

  // ⭐ 원천적 해결: React를 document.body에 직접 마운트
  // - DOM 트리와 데이터 트리가 완벽히 일치
  // - body element가 실제 <body> 태그와 1:1 매핑
  // - 에디터 Overlay는 Builder 측(iframe 바깥)에서 처리되므로 충돌 없음
  const reactRoot = createRoot(document.body);
  reactRoot.render(<App />);

  console.log('[Preview Runtime] Initialized - React mounted directly on document.body');
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

export { App } from './App';
export { getPreviewStore, usePreviewStore } from './store';
export { navigateInPreview } from './router';
export { messageSender } from './messaging';
