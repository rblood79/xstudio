import {
  type CustomFontAsset,
  inferFontFormatFromName,
  stripExtension,
} from "@xstudio/shared/utils";
import {
  loadFontRegistry,
  saveFontRegistry,
  addFontFace,
  buildRegistryFontFaceCss,
  registryToLegacyFonts,
  FONT_REGISTRY_STORAGE_KEY,
  type FontFaceAsset,
  type FontRegistryV2,
} from "@xstudio/shared";
import type { FontFormat } from "@xstudio/shared";

const STYLE_ID = "xstudio-custom-fonts";

// ============================================
// Registry-based API (v2)
// ============================================

/**
 * 레지스트리 저장 + DOM CSS 주입 + 이벤트 발생
 */
export function saveRegistryAndNotify(registry: FontRegistryV2): void {
  if (typeof window === "undefined") return;

  saveFontRegistry(registry);
  injectRegistryFontStyle();
  window.dispatchEvent(new CustomEvent("xstudio:custom-fonts-updated"));
}

/**
 * File → FontFaceAsset 변환 (v2 타입)
 */
export async function createFontFaceFromFile(
  file: File,
  family?: string,
): Promise<FontFaceAsset> {
  const source = await readFileAsDataUrl(file);
  const legacyFormat = inferFontFormatFromName(file.name);
  const format: FontFormat | undefined =
    legacyFormat === "embedded-opentype" || legacyFormat === "svg"
      ? undefined
      : legacyFormat;
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    family: (family || stripExtension(file.name)).trim(),
    format,
    display: "swap",
    source: {
      type: "data-url-temp",
      url: source,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * v2 레지스트리 기반 @font-face CSS를 DOM에 주입
 */
export function injectRegistryFontStyle(targetDoc: Document = document): void {
  const registry = loadFontRegistry();
  const css = buildRegistryFontFaceCss(registry);

  const existing = targetDoc.getElementById(STYLE_ID);
  if (!css) {
    existing?.remove();
    return;
  }

  const styleEl = existing ?? targetDoc.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = css;

  if (!existing) {
    targetDoc.head.appendChild(styleEl);
  }
}

// ============================================
// Legacy-compatible API (하위 호환)
// ============================================

/**
 * 레지스트리에서 레거시 형태로 폰트 목록 반환
 * TypographySection fontOptions 등에서 사용
 */
export function getCustomFonts(): CustomFontAsset[] {
  const registry = loadFontRegistry();
  return registryToLegacyFonts(registry);
}

// ============================================
// Internal helpers
// ============================================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("폰트 파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

// ============================================
// Re-exports (소비자 변경 최소화)
// ============================================

export { addFontFace, loadFontRegistry, FONT_REGISTRY_STORAGE_KEY };
export type { FontFaceAsset, FontRegistryV2 };

/** 기본 폰트 패밀리 — body 상속, 스타일 패널 폴백 등에서 참조 */
export const DEFAULT_FONT_FAMILY = "Pretendard";

export const DEFAULT_FONT_OPTIONS = [
  { value: "reset", label: "Reset" },
  { value: "Pretendard", label: "Pretendard" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
];
