/**
 * Preview Runtime Entry Point
 *
 * preview.html에서 로드되는 독립 React 앱입니다.
 * Builder의 main.tsx와 완전히 분리됩니다.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";

// React Aria 컴포넌트 스타일
import "@composition/shared/components/styles/index.css";

// Pretendard 폰트 (Preview iframe은 별도 컨텍스트이므로 독립 로드 필요)
import "pretendard/dist/web/static/pretendard.css";

// 폰트 유틸리티
import { loadFontRegistry, buildRegistryFontFaceCss } from "@composition/shared";
import { injectBuiltinFontStyle } from "../fonts/builtinFonts";

// ============================================
// Styles
// ============================================

/**
 * Preview iframe 전체 CSS reset + canvas 전용 스타일의 단일 소스.
 */
const injectBaseStyles = () => {
  if (document.getElementById("canvas-base-styles")) return;

  const style = document.createElement("style");
  style.id = "canvas-base-styles";
  style.textContent = `
    /* ── CSS Reset ── */
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    p { margin: 0; }
    h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    button, input, select, textarea { font-family: inherit; font-feature-settings: inherit; }

    /* ── Body 기본 스타일 (React 루트이자 body element) ── */
    body {
      font-family: "Pretendard", "Inter Variable", monospace, system-ui, sans-serif;
      font-feature-settings: "cv02", "cv03", "cv04", "cv11";
      line-height: 1.5;
      color: var(--fg, #1a1a1a);
      background: var(--bg, #ffffff);
    }

    /* ── Canvas 전용 스타일 ── */
    .canvas-empty, .preview-empty {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #999; font-size: 14px;
    }
    .canvas-loading, .preview-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: #666; font-size: 14px;
    }
    .lasso-selection-box {
      position: fixed;
      border: 2px dashed var(--action-primary-bg, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 9999;
    }
    .slot-container { min-height: 40px; }
  `;
  document.head.appendChild(style);
};

/**
 * 커스텀 폰트 @font-face CSS를 DOM에 주입합니다.
 * localStorage의 FontRegistry에서 읽어옵니다.
 */
const injectCustomFonts = () => {
  try {
    const registry = loadFontRegistry();
    const css = buildRegistryFontFaceCss(registry);
    if (!css) return;

    const style = document.createElement("style");
    style.id = "preview-custom-fonts";
    style.textContent = css;
    document.head.appendChild(style);
  } catch {
    // FontRegistry 없으면 무시
  }
};

// ============================================
// Initialize Preview Runtime
// ============================================

function initPreviewRuntime() {
  injectBuiltinFontStyle();
  injectBaseStyles();
  injectCustomFonts();

  // Canvas 마커 설정
  document.body.setAttribute("data-canvas", "true");
  document.body.setAttribute("data-preview", "true");

  // React를 document.body에 직접 마운트
  // - DOM 트리와 데이터 트리가 완벽히 일치
  // - body element가 실제 <body> 태그와 1:1 매핑
  const reactRoot = createRoot(document.body);
  reactRoot.render(<App />);
}

// ============================================
// Auto-initialize when DOM is ready
// ============================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPreviewRuntime);
} else {
  initPreviewRuntime();
}
