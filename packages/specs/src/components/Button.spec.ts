/**
 * Button Component Spec
 *
 * React Aria 기반 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Button Props
 */
export interface ButtonProps {
  variant?:
    | "accent"
    | "primary"
    | "secondary"
    | "negative"
    | "premium"
    | "genai";
  fillStyle?: "fill" | "outline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: string;
  text?: string;
  label?: string;
  /** Lucide 아이콘 이름 (예: "arrow-right", "plus") */
  iconName?: string;
  /** 아이콘 위치: start(텍스트 왼쪽) / end(텍스트 오른쪽) */
  iconPosition?: "start" | "end";
  /** 아이콘 선 두께 (기본: 2) */
  iconStrokeWidth?: number;
  isDisabled?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Button Component Spec
 */
export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: "Button",
  description: "React Aria 기반 버튼 컴포넌트",
  element: "button",

  defaultVariant: "primary",
  defaultSize: "md",

  variants: {
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent-hover}" as TokenRef,
      backgroundPressed: "{color.accent-pressed}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
      borderHover: "{color.accent-hover}" as TokenRef,
    },
    primary: {
      background: "{color.neutral}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.white}" as TokenRef,
      border: "{color.neutral}" as TokenRef,
      borderHover: "{color.neutral-hover}" as TokenRef,
    },
    secondary: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    negative: {
      background: "{color.negative}" as TokenRef,
      backgroundHover: "{color.negative-hover}" as TokenRef,
      backgroundPressed: "{color.negative-pressed}" as TokenRef,
      text: "{color.on-negative}" as TokenRef,
      border: "{color.negative}" as TokenRef,
      borderHover: "{color.negative-hover}" as TokenRef,
    },
    premium: {
      background: "{color.purple}" as TokenRef,
      backgroundHover: "{color.purple-hover}" as TokenRef,
      backgroundPressed: "{color.purple-pressed}" as TokenRef,
      text: "{color.white}" as TokenRef,
      border: "{color.purple}" as TokenRef,
      borderHover: "{color.purple-hover}" as TokenRef,
    },
    genai: {
      background: "{color.purple}" as TokenRef,
      backgroundHover: "{color.purple-hover}" as TokenRef,
      backgroundPressed: "{color.purple-pressed}" as TokenRef,
      text: "{color.white}" as TokenRef,
      border: "{color.purple}" as TokenRef,
      borderHover: "{color.purple-hover}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 20,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 12,
      gap: 4,
    },
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 20,
      gap: 10,
    },
    xl: {
      height: 54,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 24,
      gap: 12,
    },
  },

  states: {
    hover: {
      // variant별 hover 색상은 variants에서 정의
    },
    pressed: {
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
    },
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      // props.style.width를 직접 사용하면 bgBox 추출이 실패하고 렌더링이 깨짐
      const width = "auto" as const;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;
      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const isOutline = props.fillStyle === "outline";

      // outline 시 variant별 텍스트 색상 매핑 (CSS `[data-fill-style="outline"]` 정합)
      const outlineTextMap: Record<string, TokenRef | string> = {
        accent: "{color.accent}" as TokenRef,
        primary: "{color.neutral}" as TokenRef,
        secondary: "{color.neutral}" as TokenRef,
        negative: "{color.negative}" as TokenRef,
        premium: "{color.purple}" as TokenRef,
        genai: "{color.purple}" as TokenRef,
      };

      // 상태에 따른 배경색 선택 (사용자 스타일 우선)
      const bgColor = isOutline
        ? (props.style?.backgroundColor ?? ("{color.transparent}" as TokenRef))
        : (props.style?.backgroundColor ??
          (state === "hover"
            ? variant.backgroundHover
            : state === "pressed"
              ? variant.backgroundPressed
              : variant.background));

      // 상태에 따른 텍스트색 선택 (사용자 스타일 우선)
      const textColor = isOutline
        ? (props.style?.color ??
          outlineTextMap[props.variant ?? "primary"] ??
          variant.text)
        : (props.style?.color ??
          (state === "hover" && variant.textHover
            ? variant.textHover
            : variant.text));

      // 상태에 따른 테두리색 선택 (사용자 스타일 우선)
      const borderColor = isOutline
        ? (props.style?.borderColor ?? ("{color.border-hover}" as TokenRef))
        : (props.style?.borderColor ??
          (state === "hover" && variant.borderHover
            ? variant.borderHover
            : variant.border));

      const shapes: Shape[] = [
        // 배경 (height: 'auto' → 실제 레이아웃 높이에 맞춤)
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height: "auto" as unknown as number,
          radius: borderRadius as unknown as number, // TokenRef를 나중에 resolve
          fill: bgColor,
          fillAlpha: variant.backgroundAlpha ?? 1,
        },
      ];

      // 테두리 (있는 경우)
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 아이콘 + 텍스트 렌더링
      const iconName = props.iconName;
      const iconPos = props.iconPosition ?? "start";
      const iconSize = (size as unknown as { iconSize: number }).iconSize ?? 16;
      // 사용자 스타일 gap 우선, 없으면 spec 기본값
      const styleGap = props.style?.gap;
      const gap =
        styleGap != null
          ? typeof styleGap === "number"
            ? styleGap
            : parseFloat(String(styleGap)) || 0
          : (size.gap ?? 8);
      const text = props.children || props.text || props.label;

      // 사용자 스타일 padding 우선, 없으면 spec 기본값
      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const iconSw = props.iconStrokeWidth ?? 2;

      // fontSize 오버라이드 시 iconSize도 동일하게 적용
      const effectiveIconSize =
        props.style?.fontSize != null ? fontSize : iconSize;

      // Icon-only 모드: 아이콘만, 텍스트 없음 → 컨테이너 중앙 배치
      if (iconName && !text) {
        shapes.push({
          type: "icon_font" as const,
          iconName,
          x: 0,
          y: 0,
          fontSize: effectiveIconSize,
          fill: textColor,
          strokeWidth: iconSw,
          align: "center" as const,
          baseline: "middle" as const,
        });
        return shapes;
      }

      // Icon + Text 모드
      if (iconName && text) {
        if (iconPos === "end") {
          // Text → Icon: 텍스트 좌측, 아이콘 우측
          shapes.push({
            type: "text" as const,
            x: paddingX,
            y: 0,
            text,
            fontSize,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: "left" as const,
            baseline: "middle" as const,
          });
          // 아이콘: 음수 x = 우측에서 오프셋 (specShapeConverter 처리)
          shapes.push({
            type: "icon_font" as const,
            iconName,
            x: -(paddingX + effectiveIconSize / 2),
            y: 0,
            fontSize: effectiveIconSize,
            fill: textColor,
            strokeWidth: iconSw,
            baseline: "middle" as const,
          });
        } else {
          // Icon → Text (기본: start)
          shapes.push({
            type: "icon_font" as const,
            iconName,
            x: paddingX + effectiveIconSize / 2,
            y: 0,
            fontSize: effectiveIconSize,
            fill: textColor,
            strokeWidth: iconSw,
            baseline: "middle" as const,
          });
          shapes.push({
            type: "text" as const,
            x: paddingX + effectiveIconSize + gap,
            y: 0,
            text,
            fontSize,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: "left" as const,
            baseline: "middle" as const,
          });
        }
        return shapes;
      }

      // Text-only 모드 (기존)
      if (text) {
        const textAlign =
          (props.style?.textAlign as "left" | "center" | "right") || "center";

        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-loading": props.isLoading || undefined,
      "aria-busy": props.isLoading || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static",
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
