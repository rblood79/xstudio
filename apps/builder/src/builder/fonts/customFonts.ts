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
 *
 * family 이름 결정 우선순위:
 * 1. 호출자가 명시적으로 지정한 family
 * 2. 폰트 바이너리 내부 이름 (CanvasKit name 테이블 추출)
 * 3. 파일명에서 확장자 제거
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

  // 폰트 바이너리 내부 이름 추출 (CanvasKit 초기화 상태에서만)
  const resolvedFamily =
    family ||
    (await extractEmbeddedFontName(source)) ||
    stripExtension(file.name);

  // 파일명에서 weight/style 추론 (예: "NanumGothic-Bold.woff2" → "700")
  const { weight, style } = inferWeightStyleFromFileName(file.name);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    family: resolvedFamily.trim(),
    weight,
    style,
    format,
    display: "swap",
    source: {
      type: "data-url-temp",
      url: source,
      originalFileName: file.name,
      mimeType: file.type || undefined,
      byteSize: file.size,
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

/**
 * 폰트 바이너리에서 내장 패밀리 이름을 추출한다.
 * CanvasKit FontMgr.FromData()는 바이너리 name 테이블의 이름을 사용하므로
 * 이 이름을 처음부터 사용하면 CSS ↔ CanvasKit 간 이름 불일치가 발생하지 않는다.
 *
 * CanvasKit 미초기화 시 null 반환 → 파일명 fallback.
 */
async function extractEmbeddedFontName(
  dataUrl: string,
): Promise<string | null> {
  try {
    // 지연 import — customFonts.ts가 CanvasKit에 직접 의존하지 않도록
    const { isCanvasKitInitialized, getCanvasKit } =
      await import("../workspace/canvas/skia/initCanvasKit");
    if (!isCanvasKitInitialized()) return null;

    const ck = getCanvasKit();
    const response = await fetch(dataUrl);
    const buffer = await response.arrayBuffer();
    const tempMgr = ck.FontMgr.FromData(buffer);
    if (!tempMgr || tempMgr.countFamilies() === 0) {
      tempMgr?.delete();
      return null;
    }
    const name = tempMgr.getFamilyName(0);
    tempMgr.delete();
    return name || null;
  } catch {
    return null;
  }
}

/**
 * 파일명에서 font-weight / font-style 추론.
 * 예: "NanumGothic-Bold.woff2" → weight: "700"
 *     "Roboto-LightItalic.ttf" → weight: "300", style: "italic"
 */
function inferWeightStyleFromFileName(fileName: string): {
  weight?: string;
  style?: "normal" | "italic";
} {
  const base = stripExtension(fileName).toLowerCase();

  const weightMap: Record<string, string> = {
    thin: "100",
    hairline: "100",
    extralight: "200",
    ultralight: "200",
    light: "300",
    regular: "400",
    normal: "400",
    medium: "500",
    semibold: "600",
    demibold: "600",
    bold: "700",
    extrabold: "800",
    ultrabold: "800",
    black: "900",
    heavy: "900",
  };

  let weight: string | undefined;
  let style: "normal" | "italic" | undefined;

  // italic 검출
  if (base.includes("italic")) {
    style = "italic";
  }

  // weight 검출 (가장 긴 매치 우선)
  const sortedKeys = Object.keys(weightMap).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (base.includes(keyword)) {
      weight = weightMap[keyword];
      break;
    }
  }

  return { weight, style };
}

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
