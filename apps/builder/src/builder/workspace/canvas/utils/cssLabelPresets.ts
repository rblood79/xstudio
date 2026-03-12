/**
 * CSS Label & Description Presets (ADR-035 Phase 6)
 *
 * .react-aria-Label, [slot="description"], .react-aria-FieldError
 * 클래스에서 공통 스타일을 읽는 프리셋.
 * cssVariableReader.ts에서 추출.
 */

import { cssColorToHex } from "./cssVariableCore";

// ============================================
// Common Label Style (.react-aria-Label)
// ============================================

/**
 * Label 스타일 프리셋
 */
export interface LabelStylePreset {
  fontSize: number;
  fontWeight: string;
  color: number;
  fontFamily: string;
}

const LABEL_STYLE_FALLBACKS: Record<string, LabelStylePreset> = {
  S: {
    fontSize: 12,
    fontWeight: "500",
    color: 0x374151,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  M: {
    fontSize: 14,
    fontWeight: "500",
    color: 0x374151,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  L: {
    fontSize: 16,
    fontWeight: "500",
    color: 0x374151,
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

/**
 * .react-aria-Label 클래스에서 스타일 읽기
 * 모든 Form 컴포넌트에서 공통 사용
 */
export function getLabelStylePreset(size: string = "M"): LabelStylePreset {
  const fallback = LABEL_STYLE_FALLBACKS[size] || LABEL_STYLE_FALLBACKS.M;

  try {
    const label = document.createElement("label");
    label.className = "react-aria-Label";
    label.style.position = "absolute";
    label.style.visibility = "hidden";
    label.style.pointerEvents = "none";

    document.body.appendChild(label);

    const labelStyle = getComputedStyle(label);

    const fontSize = parseFloat(labelStyle.fontSize) || fallback.fontSize;
    const fontWeight = labelStyle.fontWeight || fallback.fontWeight;
    const color = cssColorToHex(labelStyle.color, fallback.color);
    const fontFamily = labelStyle.fontFamily || fallback.fontFamily;

    document.body.removeChild(label);

    return { fontSize, fontWeight, color, fontFamily };
  } catch {
    return fallback;
  }
}

// ============================================
// Description / FieldError Style
// ============================================

/**
 * Description/FieldError 스타일 프리셋
 */
export interface DescriptionStylePreset {
  fontSize: number;
  color: number;
  errorColor: number;
  fontFamily: string;
}

const DESCRIPTION_STYLE_FALLBACKS: Record<string, DescriptionStylePreset> = {
  S: {
    fontSize: 11,
    color: 0x6b7280,
    errorColor: 0xef4444,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  M: {
    fontSize: 12,
    color: 0x6b7280,
    errorColor: 0xef4444,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  L: {
    fontSize: 14,
    color: 0x6b7280,
    errorColor: 0xef4444,
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

/**
 * Description / FieldError 스타일 읽기
 */
export function getDescriptionStylePreset(
  size: string = "M",
): DescriptionStylePreset {
  const fallback =
    DESCRIPTION_STYLE_FALLBACKS[size] || DESCRIPTION_STYLE_FALLBACKS.M;

  try {
    const textField = document.createElement("div");
    textField.className = "react-aria-TextField";
    textField.style.position = "absolute";
    textField.style.visibility = "hidden";
    textField.style.pointerEvents = "none";

    const description = document.createElement("div");
    description.slot = "description";
    textField.appendChild(description);

    const fieldError = document.createElement("div");
    fieldError.className = "react-aria-FieldError";
    textField.appendChild(fieldError);

    document.body.appendChild(textField);

    const descStyle = getComputedStyle(description);
    const errorStyle = getComputedStyle(fieldError);

    const fontSize = parseFloat(descStyle.fontSize) || fallback.fontSize;
    const color = cssColorToHex(descStyle.color, fallback.color);
    const errorColor = cssColorToHex(errorStyle.color, fallback.errorColor);
    const fontFamily = descStyle.fontFamily || fallback.fontFamily;

    document.body.removeChild(textField);

    return { fontSize, color, errorColor, fontFamily };
  } catch {
    return fallback;
  }
}
