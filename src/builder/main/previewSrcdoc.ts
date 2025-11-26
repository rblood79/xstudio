/**
 * Preview Srcdoc Generator
 *
 * Preview Runtime을 srcdoc로 생성합니다.
 * 개발 모드와 프로덕션 모드에서 다른 방식을 사용합니다.
 */

// ============================================
// Base HTML Template
// ============================================

const BASE_STYLES = `
  * { box-sizing: border-box; }
  html, body, #preview-root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
  }
  .preview-container { width: 100%; min-height: 100%; }
  .preview-body { width: 100%; min-height: 100%; }
  .preview-empty, .preview-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
  }
`;

// ============================================
// Development Mode: Load from URL
// ============================================

/**
 * 개발 모드용 srcdoc 생성
 * preview-runtime 모듈을 동적으로 import합니다.
 */
export function generateDevSrcdoc(projectId: string): string {
  // 개발 모드에서는 ESM import를 사용하여 HMR 지원
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XStudio Preview</title>
  <style>${BASE_STYLES}</style>
</head>
<body data-preview="true" data-project-id="${projectId}">
  <div id="preview-root">
    <div class="preview-loading">Loading Preview Runtime...</div>
  </div>
  <script type="module">
    // 개발 모드: preview-runtime을 동적 import
    import('/src/preview-runtime/index.tsx').catch(err => {
      console.error('[Preview] Failed to load preview-runtime:', err);
      document.getElementById('preview-root').innerHTML =
        '<div class="preview-loading">Failed to load Preview Runtime</div>';
    });
  </script>
</body>
</html>
`;
}

// ============================================
// Production Mode: Inline Bundle
// ============================================

// 빌드된 preview-runtime 번들 (빌드 시 주입됨)
let previewRuntimeBundle: string | null = null;
let previewRuntimeCSS: string | null = null;

/**
 * 프로덕션 빌드된 번들 설정
 * 빌드 프로세스에서 호출됩니다.
 */
export function setPreviewRuntimeBundle(js: string, css?: string): void {
  previewRuntimeBundle = js;
  previewRuntimeCSS = css || null;
}

/**
 * 프로덕션 모드용 srcdoc 생성
 * 빌드된 번들을 인라인으로 포함합니다.
 */
export function generateProdSrcdoc(projectId: string): string {
  if (!previewRuntimeBundle) {
    console.warn('[Preview] Production bundle not available, falling back to dev mode');
    return generateDevSrcdoc(projectId);
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XStudio Preview</title>
  <style>${BASE_STYLES}</style>
  ${previewRuntimeCSS ? `<style>${previewRuntimeCSS}</style>` : ''}
</head>
<body data-preview="true" data-project-id="${projectId}">
  <div id="preview-root"></div>
  <script>${previewRuntimeBundle}</script>
</body>
</html>
`;
}

// ============================================
// Main Export
// ============================================

/**
 * 환경에 따른 srcdoc 생성
 */
export function generatePreviewSrcdoc(projectId: string): string {
  if (import.meta.env.DEV) {
    return generateDevSrcdoc(projectId);
  }
  return generateProdSrcdoc(projectId);
}

/**
 * Preview iframe이 srcdoc 모드를 사용해야 하는지 여부
 *
 * 테스트 방법:
 * 1. 브라우저 콘솔에서: window.__USE_SRCDOC__ = true
 * 2. 또는 이 함수에서 직접 return true
 *
 * 현재는 false로 설정하여 기존 src 방식 유지
 */
export function shouldUseSrcdoc(): boolean {
  // 브라우저 콘솔에서 테스트: window.__USE_SRCDOC__ = true
  if (typeof window !== 'undefined' && (window as unknown as { __USE_SRCDOC__?: boolean }).__USE_SRCDOC__) {
    return true;
  }

  // TODO: Phase 1 완료 후 true로 변경
  return false;
}
