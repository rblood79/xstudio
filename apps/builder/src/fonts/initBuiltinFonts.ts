import { injectBuiltinFontStyle } from "./builtinFonts";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  injectBuiltinFontStyle();
}
