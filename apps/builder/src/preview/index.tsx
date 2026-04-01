/**
 * Canvas Runtime Entry Point
 *
 * srcdoc iframe 내에서 독립적으로 실행되는 Canvas Runtime의 진입점입니다.
 * Builder의 main.tsx와 완전히 분리된 별도의 React 앱입니다.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";

// React Aria 컴포넌트 스타일 (srcdoc에서 필요)
// ⭐ 모노레포 구조에서는 @xstudio/shared alias 사용
import "@xstudio/shared/components/styles/index.css";

// Pretendard 폰트 (Preview iframe은 별도 컨텍스트이므로 독립 로드 필요)
import "pretendard/dist/web/static/pretendard.css";

// ============================================
// Styles (인라인으로 포함되거나 별도 CSS 파일)
// ============================================

const injectBaseStyles = () => {
  const style = document.createElement("style");
  style.id = "canvas-base-styles";
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
    

    .canvas-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
      font-size: 14px;
    }

    .canvas-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-size: 14px;
    }

    /* Legacy class names for backward compatibility */
    .preview-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px; }
    .preview-loading { display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px; }

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
// Initialize Canvas Runtime
// ============================================

function initCanvasRuntime() {
  // 기본 스타일 주입
  injectBaseStyles();

  // Canvas 마커 설정 (legacy: data-preview도 유지)
  document.body.setAttribute("data-canvas", "true");
  document.body.setAttribute("data-preview", "true");

  // ⭐ 원천적 해결: React를 document.body에 직접 마운트
  // - DOM 트리와 데이터 트리가 완벽히 일치
  // - body element가 실제 <body> 태그와 1:1 매핑
  // - 에디터 Overlay는 Builder 측(iframe 바깥)에서 처리되므로 충돌 없음
  const reactRoot = createRoot(document.body);
  reactRoot.render(<App />);
}

// ============================================
// Auto-initialize when DOM is ready
// ============================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanvasRuntime);
} else {
  initCanvasRuntime();
}
