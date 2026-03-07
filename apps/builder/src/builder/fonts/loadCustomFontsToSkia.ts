/**
 * FontRegistryV2 ↔ SkiaFontManager 브릿지 모듈
 *
 * Phase A+B에서 구축한 FontRegistryV2 데이터를
 * Skia Canvas 렌더링에 반영하는 Phase C 핵심 로직.
 *
 * 동일 패밀리의 여러 weight/style 변형을 개별 로드한다.
 */

import { loadFontRegistry, type FontFaceAsset } from "@xstudio/shared";
import { skiaFontManager } from "../workspace/canvas/skia/fontManager";
import { GOOGLE_FONT_DEFS, getFontsourceUrl } from "./customFonts";

/** 기본 폰트 + Google Fonts — unloadFont 대상에서 제외 */
const PROTECTED_FAMILIES = new Set([
  "Pretendard",
  ...GOOGLE_FONT_DEFS.map((d) => d.family),
]);

/**
 * data URL → ArrayBuffer 변환.
 * 브라우저 fetch API가 data: URI를 지원한다.
 */
async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

/**
 * 단일 FontFaceAsset을 SkiaFontManager에 로드.
 * weight/style 정보를 포함하여 같은 family의 여러 변형을 개별 등록한다.
 * @returns 로드 성공 여부
 */
async function loadSingleFontToSkia(face: FontFaceAsset): Promise<boolean> {
  const family = face.family.trim();
  if (!family) return false;

  const weight = face.weight;
  const style = face.style;

  // 같은 family+weight+style 변형이 이미 있으면 스킵
  if (skiaFontManager.hasFont(family, weight, style)) return true;

  try {
    if (face.source.type === "data-url-temp") {
      const buffer = await dataUrlToArrayBuffer(face.source.url);
      skiaFontManager.loadFontFromBuffer(family, buffer, weight, style);
    } else {
      // project-asset, remote-url
      await skiaFontManager.loadFont(family, face.source.url, weight, style);
    }
    return true;
  } catch (e) {
    console.warn(`[loadCustomFontsToSkia] 폰트 로드 실패 (${family}):`, e);
    return false;
  }
}

/**
 * FontRegistryV2의 모든 커스텀 폰트를 SkiaFontManager에 로드.
 * 이미 로드된 변형은 hasFont(family, weight, style) 체크로 스킵.
 * @returns 로드된 폰트 수
 */
export async function loadAllCustomFontsToSkia(): Promise<number> {
  const registry = loadFontRegistry();
  if (registry.faces.length === 0) return 0;

  let loaded = 0;
  for (const face of registry.faces) {
    const ok = await loadSingleFontToSkia(face);
    if (ok) loaded++;
  }
  return loaded;
}

/**
 * 레지스트리와 SkiaFontManager를 동기화한다.
 * - 레지스트리에 없는 폰트 → Skia에서 제거 (Pretendard 제외)
 * - 레지스트리에 있지만 Skia에 없는 폰트 → 로드
 * @returns 새로 로드된 폰트 수
 */
export async function syncCustomFontsWithSkia(): Promise<number> {
  const registry = loadFontRegistry();
  const registryFamilies = new Set(registry.faces.map((f) => f.family.trim()));

  // Skia에 있지만 레지스트리에 없는 폰트 제거
  for (const family of skiaFontManager.getFamilies()) {
    if (PROTECTED_FAMILIES.has(family)) continue;
    if (!registryFamilies.has(family)) {
      skiaFontManager.unloadFont(family);
    }
  }

  // 레지스트리에 있지만 Skia에 없는 변형 로드
  let loaded = 0;
  for (const face of registry.faces) {
    const ok = await loadSingleFontToSkia(face);
    if (ok) loaded++;
  }
  return loaded;
}

// ============================================
// Google Fonts → Skia 로드
// ============================================

/**
 * GOOGLE_FONT_DEFS에 정의된 모든 Google Fonts를 SkiaFontManager에 로드한다.
 *
 * fontsource CDN(jsdelivr)에서 각 weight의 latin woff2를 직접 가져온다.
 * 각 weight당 하나의 완전한 woff2 파일 — subset 파싱 불필요.
 * CJK 글리프는 Pretendard fallback으로 처리.
 *
 * @returns 로드된 font face 수
 */
export async function loadGoogleFontsToSkia(): Promise<number> {
  let totalLoaded = 0;

  for (const def of GOOGLE_FONT_DEFS) {
    // 이미 모든 weight가 로드되었으면 스킵
    const allLoaded = def.weights.every((w) =>
      skiaFontManager.hasFont(def.family, w),
    );
    if (allLoaded) continue;

    for (const weight of def.weights) {
      if (skiaFontManager.hasFont(def.family, weight)) continue;

      const url = getFontsourceUrl(def.family, weight);
      try {
        await skiaFontManager.loadFont(def.family, url, weight);
        totalLoaded++;
      } catch (e) {
        console.warn(
          `[loadGoogleFontsToSkia] ${def.family} ${weight} 로드 실패:`,
          e,
        );
      }
    }
  }

  return totalLoaded;
}
