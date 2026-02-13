import {
  CUSTOM_FONT_STORAGE_KEY,
  buildCustomFontFaceCss,
  inferFontFormatFromName,
  stripExtension,
  type CustomFontAsset,
} from '@xstudio/shared/utils';

const STYLE_ID = 'xstudio-custom-fonts';

export function getCustomFonts(): CustomFontAsset[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(CUSTOM_FONT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomFontAsset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((font) => font?.family && font?.source);
  } catch {
    return [];
  }
}

export function saveCustomFonts(fonts: CustomFontAsset[]): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CUSTOM_FONT_STORAGE_KEY, JSON.stringify(fonts));
  injectCustomFontStyle(fonts);
  window.dispatchEvent(new CustomEvent('xstudio:custom-fonts-updated'));
}

export function injectCustomFontStyle(fonts = getCustomFonts(), targetDoc: Document = document): void {
  const css = buildCustomFontFaceCss(fonts);

  const existing = targetDoc.getElementById(STYLE_ID);
  if (!css) {
    existing?.remove();
    return;
  }

  const styleEl = existing ?? targetDoc.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = css;

  if (!existing) {
    targetDoc.head.appendChild(styleEl);
  }
}

export async function createCustomFontFromFile(file: File, family?: string): Promise<CustomFontAsset> {
  const source = await readFileAsDataUrl(file);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    family: (family || stripExtension(file.name)).trim(),
    source,
    format: inferFontFormatFromName(file.name),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('폰트 파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

export const DEFAULT_FONT_OPTIONS = [
  { value: 'reset', label: 'Reset' },
  { value: 'Pretendard', label: 'Pretendard' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
];
