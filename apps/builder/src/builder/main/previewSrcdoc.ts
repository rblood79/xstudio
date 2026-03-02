/**
 * Preview Srcdoc Generator
 *
 * Preview Runtime을 srcdoc로 생성합니다.
 * 개발 모드와 프로덕션 모드에서 다른 방식을 사용합니다.
 */

import { CUSTOM_FONT_STORAGE_KEY, buildCustomFontFaceCss, type CustomFontAsset } from '@xstudio/shared/utils';

// ============================================
// Base HTML Template
// ============================================

const BASE_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
  /* ⭐ body가 React 루트이자 body element로 사용됨 (DOM/데이터 트리 일치) */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
  }
  .preview-empty, .preview-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
  }
`;

function getCustomFontStyleTag(): string {
  if (typeof window === 'undefined') return '';

  try {
    const raw = localStorage.getItem(CUSTOM_FONT_STORAGE_KEY);
    if (!raw) return '';

    const fonts = JSON.parse(raw) as CustomFontAsset[];
    if (!Array.isArray(fonts)) return '';

    const css = buildCustomFontFaceCss(fonts);
    return css ? `<style>${css}</style>` : '';
  } catch {
    return '';
  }
}

// ============================================
// Development Mode: Load from URL
// ============================================

/**
 * 개발 모드용 srcdoc 생성
 * preview 모듈을 동적으로 import합니다.
 *
 * 중요: Vite React SWC 플러그인은 React Refresh preamble이 필요합니다.
 * srcdoc iframe에서는 이를 수동으로 로드해야 합니다.
 */
export function generateDevSrcdoc(projectId: string, bootstrapNonce: string): string {
  const customFontStyleTag = getCustomFontStyleTag();
  // 개발 모드에서는 ESM import를 사용하여 HMR 지원
  // React Refresh preamble 전역 변수를 먼저 설정해야 함
  // ⭐ React가 document.body에 직접 마운트됨 (DOM/데이터 트리 일치)
  // ⭐ <base> 태그로 부모 창의 origin을 기준으로 상대 경로 해석
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}/" />
  <title>XStudio Preview</title>
  <style>${BASE_STYLES}</style>
  ${customFontStyleTag}
</head>
<body data-preview="true" data-project-id="${projectId}">
  <div class="preview-loading">Loading Preview Runtime...</div>
  <script>window.__bootstrapNonce = '${bootstrapNonce}';</script>
  <script>
    // React Refresh preamble 전역 변수 설정 (모듈 로드 전에 필요)
    // @vitejs/plugin-react-swc가 이 변수들을 확인함
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>
  <script type="module">
    // 개발 모드: Vite client와 preview 로드
    async function loadPreviewRuntime() {
      try {
        // 1. Vite client 로드 (HMR 지원)
        await import('/@vite/client');

        // 2. React Refresh 모듈 로드 (실제 HMR 기능)
        try {
          await import('/@react-refresh');
        } catch (e) {
          console.warn('[Preview] React Refresh not available:', e.message);
        }

        // 3. preview runtime 로드 (React가 body에 직접 마운트됨)
        await import('/src/preview/index.tsx');

        console.log('[Preview] Runtime loaded successfully');
      } catch (err) {
        console.error('[Preview] Failed to load preview:', err);
        document.body.innerHTML =
          '<div class="preview-loading">Failed to load Preview Runtime: ' + err.message + '</div>';
      }
    }

    loadPreviewRuntime();
  </script>
</body>
</html>
`;
}

// ============================================
// Production Mode: Inline Bundle
// ============================================

// 빌드된 preview 번들 (빌드 시 주입됨)
let previewBundle: string | null = null;
let previewCSS: string | null = null;

/**
 * 프로덕션 빌드된 번들 설정
 * 빌드 프로세스에서 호출됩니다.
 */
export function setPreviewBundle(js: string, css?: string): void {
  previewBundle = js;
  previewCSS = css || null;
}

/**
 * 프로덕션 모드용 srcdoc 생성
 * 빌드된 번들을 인라인으로 포함합니다.
 */
export function generateProdSrcdoc(projectId: string, bootstrapNonce: string): string {
  if (!previewBundle) {
    console.warn('[Preview] Production bundle not available, falling back to dev mode');
    return generateDevSrcdoc(projectId, bootstrapNonce);
  }

  const customFontStyleTag = getCustomFontStyleTag();


  // ⭐ React가 document.body에 직접 마운트됨 (DOM/데이터 트리 일치)
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XStudio Preview</title>
  <style>${BASE_STYLES}</style>
  ${customFontStyleTag}
  ${previewCSS ? `<style>${previewCSS}</style>` : ''}
</head>
<body data-preview="true" data-project-id="${projectId}">
  <script>window.__bootstrapNonce = '${bootstrapNonce}';</script>
  <script>${previewBundle}</script>
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
export function generatePreviewSrcdoc(projectId: string, bootstrapNonce: string): string {
  if (import.meta.env.DEV) {
    return generateDevSrcdoc(projectId, bootstrapNonce);
  }
  return generateProdSrcdoc(projectId, bootstrapNonce);
}

/**
 * Preview iframe이 srcdoc 모드를 사용해야 하는지 여부
 *
 * 테스트 방법 (한 번만 설정하면 유지됨):
 * - 활성화: localStorage.setItem('USE_SRCDOC', 'true')
 * - 비활성화: localStorage.removeItem('USE_SRCDOC')
 * - 또는 URL 파라미터: ?srcdoc=true
 */
export function shouldUseSrcdoc(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL 파라미터 체크 (?srcdoc=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('srcdoc') === 'true') {
    return true;
  }

  // 2. localStorage 체크 (한 번 설정하면 브라우저 닫아도 유지)
  try {
    if (localStorage.getItem('USE_SRCDOC') === 'true') {
      return true;
    }
  } catch {
    // localStorage 접근 불가 시 무시
  }

  // 3. 전역 변수 체크 (레거시 지원)
  if ((window as unknown as { __USE_SRCDOC__?: boolean }).__USE_SRCDOC__) {
    return true;
  }

  // Phase 1 완료 - srcdoc 기본 활성화
  return true;
}
