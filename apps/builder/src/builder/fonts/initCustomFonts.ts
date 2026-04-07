import {
  FONT_REGISTRY_STORAGE_KEY,
  injectRegistryFontStyle,
} from "./customFonts";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  injectRegistryFontStyle();

  window.addEventListener("storage", (event) => {
    if (event.key !== FONT_REGISTRY_STORAGE_KEY) return;
    injectRegistryFontStyle();
  });

  window.addEventListener("composition:custom-fonts-updated", () => {
    injectRegistryFontStyle();
  });
}
