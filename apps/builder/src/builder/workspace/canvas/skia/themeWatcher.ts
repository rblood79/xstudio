/**
 * Theme Watcher Service (ADR-035 Phase 6)
 *
 * 빌더 테마 변경(data-builder-theme 속성 + OS 다크모드)을 감지하여
 * Skia 캔버스 배경색을 동기화한다.
 *
 * SkiaOverlay에서 추출된 독립 서비스.
 *
 * @see docs/RENDERING_ARCHITECTURE.md §5.7
 */

/**
 * DOM 요소에서 CSS --bg 변수를 resolved sRGB hex로 읽는다.
 * Canvas 2D fillStyle로 oklch/lab 등 모든 CSS 색공간을 sRGB 변환.
 */
export function readCssBgColor(el: HTMLElement): number | null {
  const tmp = document.createElement("div");
  tmp.style.backgroundColor = "var(--bg)";
  tmp.style.display = "none";
  el.appendChild(tmp);
  const resolved = getComputedStyle(tmp).backgroundColor;
  el.removeChild(tmp);
  if (
    !resolved ||
    resolved === "transparent" ||
    resolved === "rgba(0, 0, 0, 0)"
  )
    return null;
  const cvs = document.createElement("canvas");
  cvs.width = 1;
  cvs.height = 1;
  const ctx = cvs.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r << 16) | (g << 8) | b;
}

/**
 * CSS hex → [r, g, b] (0..1) 변환
 */
export function hexToColor4fChannels(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return [r, g, b];
}

export interface ThemeWatcherCallbacks {
  onThemeChange: (hex: number) => void;
}

export interface ThemeWatcherHandle {
  disconnect: () => void;
}

/**
 * 빌더 테마 변경 감지를 설정한다.
 *
 * @param containerEl - CSS --bg 변수를 읽을 DOM 컨테이너
 * @param callbacks - 테마 변경 시 호출할 콜백
 * @returns disconnect 핸들
 */
export function setupThemeWatcher(
  containerEl: HTMLElement,
  callbacks: ThemeWatcherCallbacks,
): ThemeWatcherHandle {
  const syncBgColor = () => {
    requestAnimationFrame(() => {
      const hex = readCssBgColor(containerEl);
      if (hex == null) return;
      callbacks.onThemeChange(hex);
    });
  };

  // data-builder-theme 속성 변경 감지
  const themeObserver = new MutationObserver(syncBgColor);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-builder-theme"],
  });

  // OS 다크모드 전환 감지 (빌더 테마 "system" 모드)
  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkModeQuery.addEventListener("change", syncBgColor);

  return {
    disconnect: () => {
      themeObserver.disconnect();
      darkModeQuery.removeEventListener("change", syncBgColor);
    },
  };
}
