import { CUSTOM_FONT_STORAGE_KEY } from '@xstudio/shared/utils';
import { getCustomFonts, injectCustomFontStyle } from './customFonts';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  injectCustomFontStyle(getCustomFonts());

  window.addEventListener('storage', (event) => {
    if (event.key !== CUSTOM_FONT_STORAGE_KEY) return;
    injectCustomFontStyle(getCustomFonts());
  });

  window.addEventListener('xstudio:custom-fonts-updated', () => {
    injectCustomFontStyle(getCustomFonts());
  });
}
