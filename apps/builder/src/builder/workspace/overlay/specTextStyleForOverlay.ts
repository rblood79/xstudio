/**
 * Spec shapes에서 TextEditOverlay용 전체 텍스트 스타일 추출
 *
 * CSS Preview와 동일한 소스(Spec)에서 폰트 스타일을 추출하여
 * 편집 오버레이의 폰트가 웹 화면과 일치하도록 한다.
 *
 * @see specTextStyle.ts (레이아웃 측정용 — fontSize/fontWeight/fontFamily만)
 */

import type { ComponentSpec, TextShape, Shape } from "@composition/specs";
import {
  ButtonSpec,
  BadgeSpec,
  ToggleButtonSpec,
  LinkSpec,
  CheckboxSpec,
  RadioSpec,
  SwitchSpec,
  InputSpec,
  resolveColor,
} from "@composition/specs";
import type { TextStyleConfig } from "./TextEditOverlay";

const TEXT_BEARING_SPECS: Record<
  string,
  { spec: ComponentSpec<Record<string, unknown>>; defaultSize: string }
> = {
  button: { spec: ButtonSpec, defaultSize: "md" },
  submitbutton: { spec: ButtonSpec, defaultSize: "md" },
  fancybutton: { spec: ButtonSpec, defaultSize: "md" },
  badge: { spec: BadgeSpec, defaultSize: "sm" },
  type: { spec: BadgeSpec, defaultSize: "sm" },
  chip: { spec: BadgeSpec, defaultSize: "sm" },
  togglebutton: { spec: ToggleButtonSpec, defaultSize: "md" },
  a: { spec: LinkSpec, defaultSize: "md" },
  checkbox: { spec: CheckboxSpec, defaultSize: "md" },
  radio: { spec: RadioSpec, defaultSize: "md" },
  switch: { spec: SwitchSpec, defaultSize: "md" },
  input: { spec: InputSpec, defaultSize: "sm" },
};

/**
 * Spec shapes에서 TextEditOverlay에 필요한 전체 텍스트 스타일을 추출한다.
 * CSS Preview와 동일한 소스(Spec)를 사용하므로 폰트가 정확히 일치한다.
 *
 * @returns TextStyleConfig 또는 null (Spec 미등록 태그)
 */
export function extractFullSpecTextStyle(
  type: string,
  props?: Record<string, unknown>,
  theme: "light" | "dark" = "light",
): TextStyleConfig | null {
  const entry = TEXT_BEARING_SPECS[type.toLowerCase()];
  if (!entry) return null;

  const { spec } = entry;
  const sizeName = (props?.size as string) ?? entry.defaultSize;
  const size = spec.sizes[sizeName] ?? spec.sizes[spec.defaultSize];
  if (!size) return null;

  const shapes = spec.render.shapes(props ?? {}, size, "default");

  const textShape = shapes.find(
    (s): s is TextShape & { type: "text" } => s.type === "text",
  );
  if (!textShape) return null;

  // BoxShape에서 컨테이너 크기 추출 (padding 계산용)
  const boxShape = shapes.find(
    (s): s is Shape & { type: "rect" } => s.type === "rect",
  );

  // fontWeight 정규화
  const fw = textShape.fontWeight;
  const fontWeight =
    typeof fw === "number"
      ? fw
      : typeof fw === "string"
        ? parseInt(fw, 10) || 400
        : 400;

  // color: TokenRef → hex string
  let color = "#000000";
  if (textShape.fill) {
    const resolved = resolveColor(textShape.fill, theme);
    if (typeof resolved === "string") {
      color = resolved;
    } else if (typeof resolved === "number") {
      // number → hex (0xRRGGBB)
      color = `#${(resolved & 0xffffff).toString(16).padStart(6, "0")}`;
    }
  }

  // padding: textShape의 x 위치 = paddingLeft
  const padding = textShape.x ?? 0;
  const paddingTop = textShape.y ?? 0;

  // lineHeight: Spec TextShape의 lineHeight (배수)를 px로 변환
  let lineHeight: number | undefined;
  if (textShape.lineHeight != null) {
    // Spec lineHeight는 배수(예: 1.4) → fontSize * lineHeight = px
    lineHeight = textShape.fontSize * textShape.lineHeight;
  }

  return {
    fontFamily: textShape.fontFamily,
    fontSize: textShape.fontSize,
    fontWeight,
    color,
    textAlign: textShape.align ?? (boxShape ? "center" : "left"),
    lineHeight,
    letterSpacing: textShape.letterSpacing,
    padding,
    paddingTop,
    // baseline: "middle" → 수직 중앙 정렬 (Button, Badge 등)
    verticalAlign: textShape.baseline === "middle" ? "center" : undefined,
  };
}
