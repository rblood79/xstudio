/**
 * CanvasKit 기본 폰트 로딩
 *
 * CanvasKit은 CSS @font-face를 사용할 수 없으므로
 * 폰트 바이너리를 직접 fetch하여 SkiaFontManager에 등록해야 한다.
 *
 * 전략:
 * 1. document.styleSheets에서 이미 파싱된 @font-face src URL을 추출
 *    → Vite가 dev/prod 모두에서 올바른 URL로 해석한 결과를 그대로 사용
 * 2. @font-face 탐색 실패 시 /fonts/ 폴백 경로에서 로드 시도
 *
 * @see docs/WASM.md §5.7 폰트 관리
 */

import { skiaFontManager } from './fontManager';

/** 로드할 폰트 웨이트 목록 (프로젝트 typography 기준) */
const TARGET_WEIGHTS = [400, 500, 600, 700] as const;

/** 웨이트 → 폴백 파일명 매핑 */
const WEIGHT_FILE_MAP: Record<number, string> = {
  400: 'Pretendard-Regular.woff2',
  500: 'Pretendard-Medium.woff2',
  600: 'Pretendard-SemiBold.woff2',
  700: 'Pretendard-Bold.woff2',
};

let loaded = false;

/**
 * CanvasKit 텍스트 렌더링에 필요한 기본 폰트를 로드한다.
 *
 * initAllWasm() 완료 후, SkiaOverlay가 ready 되기 전에 호출한다.
 * 폰트 로드 실패는 치명적이지 않다 — 텍스트만 안 보이고 나머지는 정상 동작.
 */
export async function loadSkiaFonts(): Promise<void> {
  if (loaded) return;

  const fontUrlMap = resolveFontUrlsFromCSS('Pretendard');

  const tasks = TARGET_WEIGHTS.map(async (weight) => {
    const url = fontUrlMap.get(weight)
      ?? `/fonts/${WEIGHT_FILE_MAP[weight]}`;

    try {
      await skiaFontManager.loadFont('Pretendard', url);
    } catch (err) {
      console.warn(
        `[loadSkiaFonts] Pretendard weight ${weight} 로드 실패 (${url}):`,
        err,
      );
    }
  });

  await Promise.allSettled(tasks);

  const families = skiaFontManager.getFamilies();
  if (families.length > 0) {
    if (import.meta.env.DEV) {
      console.log(
        '[loadSkiaFonts] 폰트 로드 완료:',
        families,
        `(${skiaFontManager.getFamilies().length} families)`,
      );
    }
  } else {
    console.warn(
      '[loadSkiaFonts] 폰트를 로드하지 못했습니다. ' +
      'CanvasKit 텍스트 렌더링이 비활성화됩니다.',
    );
  }

  loaded = true;
}

/**
 * document.styleSheets의 @font-face 규칙에서 폰트 URL을 추출한다.
 *
 * Vite가 CSS @import를 처리할 때 @font-face의 src URL을
 * dev/prod 환경에 맞게 변환한다 (예: /@fs/... 또는 /assets/...).
 * 이미 변환된 URL을 그대로 사용하므로 환경에 무관하게 동작한다.
 *
 * @returns Map<fontWeight, url> — 웨이트별 woff2 URL
 */
function resolveFontUrlsFromCSS(family: string): Map<number, string> {
  const result = new Map<number, string>();

  try {
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin 스타일시트는 cssRules 접근 시 SecurityError
        continue;
      }

      for (const rule of rules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;

        const ff = rule.style
          .getPropertyValue('font-family')
          .replace(/['"]/g, '')
          .trim();
        if (ff !== family) continue;

        const fw = parseInt(
          rule.style.getPropertyValue('font-weight') || '400',
          10,
        );
        if (isNaN(fw)) continue;

        // src에서 woff2 URL 추출
        const src = rule.style.getPropertyValue('src');
        const match = src.match(/url\(["']?([^"')]+\.woff2[^"')]*?)["']?\)/);
        if (match) {
          result.set(fw, match[1]);
        }
      }
    }
  } catch (err) {
    // 스타일시트 파싱 실패 시 폴백 경로 사용
    if (import.meta.env.DEV) {
      console.warn('[loadSkiaFonts] CSS @font-face 탐색 실패:', err);
    }
  }

  return result;
}
