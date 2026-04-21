/**
 * TagGroup Component Spec
 *
 * React Aria 기반 태그 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { measureSpecTextWidth } from "../renderers/utils/measureText";
import { TagListSpec } from "./TagList.spec";
import {
  Layout,
  Rows3,
  MousePointer,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  AlertTriangle,
  PointerOff,
  PenOff,
  Trash,
  FileText,
  Tag,
  Sparkles,
  HelpCircle,
} from "lucide-react";

/**
 * TagGroup Props
 */
export interface TagGroupProps {
  variant?: "default" | "accent" | "neutral" | "negative";
  size?: "sm" | "md" | "lg";
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  label?: string;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  disallowEmptySelection?: boolean;
  necessityIndicator?: "icon" | "label";
  isInvalid?: boolean;
  allowsRemoving?: boolean;
  allowsCustomValue?: boolean;
  name?: string;
  maxRows?: number;
  groupActionLabel?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  isEmphasized?: boolean;
  contextualHelp?: string;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Tag 텍스트 배열 (Skia 렌더링용) */
  _tagItems?: { text: string }[];
}

/**
 * TagGroup Component Spec
 */
export const TagGroupSpec: ComponentSpec<TagGroupProps> = {
  name: "TagGroup",
  description: "React Aria 기반 태그 그룹 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  // ADR-087 SP6: outer TagGroup container static layout-primitive 리프팅.
  //   flexDirection 은 labelPosition + hasTagList runtime 결정, flexWrap 은 runtime 결정,
  //   gap 은 Label↔TagList 수직 간격 (spec.sizes.gap 은 inner tag-tag 간격과 별개).
  //   skipCSSGeneration:true → CSS emit 없음, 오직 Taffy resolveContainerStylesFallback 경유.
  containerStyles: {
    display: "flex",
    gap: "{spacing.xs}",
  },

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          {
            key: "variant",
            type: "variant",
          },
          {
            key: "size",
            type: "size",
          },
          {
            key: "maxRows",
            type: "number",
            label: "Max Rows",
            icon: Rows3,
          },
          {
            key: "labelPosition",
            type: "enum",
            label: "Label Position",
            icon: Layout,
            options: [
              { value: "top", label: "Top" },
              { value: "side", label: "Side" },
            ],
            defaultValue: "top",
          },
          {
            key: "labelAlign",
            type: "enum",
            label: "Label Align",
            icon: Layout,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
            defaultValue: "start",
          },
          {
            key: "isEmphasized",
            type: "boolean",
            label: "Emphasized",
            icon: Sparkles,
          },
        ],
      },
      {
        title: "Content",
        fields: [
          {
            key: "label",
            type: "string",
            label: "Label",
            icon: Tag,
            emptyToUndefined: true,
          },
          {
            key: "groupActionLabel",
            type: "string",
            label: "Action Label",
            icon: Tag,
            emptyToUndefined: true,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
            emptyToUndefined: true,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
            emptyToUndefined: true,
          },
          {
            key: "contextualHelp",
            type: "string",
            label: "Contextual Help",
            icon: HelpCircle,
            emptyToUndefined: true,
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            icon: MousePointer,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
            defaultValue: "none",
          },
          {
            key: "selectionBehavior",
            type: "enum",
            label: "Selection Behavior",
            icon: ToggleLeft,
            options: [
              { value: "toggle", label: "Toggle" },
              { value: "replace", label: "Replace" },
            ],
            defaultValue: "toggle",
          },
          {
            key: "disallowEmptySelection",
            type: "boolean",
            label: "Disallow Empty Selection",
            icon: ToggleRight,
          },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ],
            derivedUpdateFn: (value) => {
              if (value === "") {
                return {
                  isRequired: false,
                  necessityIndicator: undefined,
                };
              }

              return {
                isRequired: true,
                necessityIndicator: value as "icon" | "label",
              };
            },
          },
          {
            key: "isInvalid",
            type: "boolean",
            label: "Invalid",
            icon: AlertTriangle,
          },

          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
          {
            key: "allowsRemoving",
            type: "boolean",
            label: "Allows Removing",
            icon: Trash,
            defaultValue: true,
          },
          {
            key: "allowsCustomValue",
            type: "boolean",
            label: "Allows Custom Value",
            icon: PenOff,
          },
        ],
      },
      {
        title: "Tag Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Tags",
            childTag: "Tag",
            defaultChildProps: {
              children: "Tag",
              isDisabled: false,
            },
            labelProp: "children",
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.accent-subtle}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
    neutral: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.neutral-subtle}" as TokenRef,
    },
    negative: {
      background: "{color.negative-subtle}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 6,
    },
    md: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 16,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 10,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  // ADR-093 Phase 2: ADR-094 인프라 경유 → Skia/CSS/Taffy 자동 등록.
  //   수동 tagSpecMap.ts 등록 불필요.
  childSpecs: [TagListSpec],

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Tag", override: true },
      { parentProp: "size", childPath: "TagList", override: true },
      { parentProp: "allowsRemoving", childPath: "Tag" },
      { parentProp: "allowsRemoving", childPath: "TagList" },
      { parentProp: "size", childPath: "Label", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
    ],
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant =
        TagGroupSpec.variants![
          (props as { variant?: keyof typeof TagGroupSpec.variants }).variant ??
            TagGroupSpec.defaultVariant!
        ];
      const shapes: Shape[] = [];
      const rawTagFontSize = size.fontSize;
      const resolvedTagFs =
        typeof rawTagFontSize === "number"
          ? rawTagFontSize
          : typeof rawTagFontSize === "string" && rawTagFontSize.startsWith("{")
            ? resolveToken(rawTagFontSize as TokenRef)
            : rawTagFontSize;
      const tagFontSize =
        typeof resolvedTagFs === "number" ? resolvedTagFs : 14;
      const tagGap = size.gap || 4;
      const currentY = 0;

      // ── CSS 구조: TagGroup (column) ──
      // ├── Label       ← 자식 Label 요소가 렌더링 (spec shapes에서 제외)
      // └── TagList (row flex-wrap)
      //     ├── Tag
      //     └── Tag
      //
      // Label은 자식 요소(child Label element)로 렌더링되므로
      // spec shapes에서 중복 렌더링하지 않음 (두 줄 렌더링 방지)

      // TagList 영역: Tag chips (CSS: .react-aria-TagList > .react-aria-Tag)
      const tagItems = props._tagItems;
      if (tagItems && tagItems.length > 0) {
        const tagPaddingX = size.paddingX || 8;
        const tagPaddingY = size.paddingY || 2;
        const tagHeight = tagFontSize + tagPaddingY * 2;
        const borderRadius = (size.borderRadius as unknown as number) || 4;
        let tagX = 0;

        for (const item of tagItems) {
          // 태그 칩 너비 실측
          const textWidth = measureSpecTextWidth(
            item.text,
            tagFontSize,
            fontFamily.sans,
          );
          const chipWidth = textWidth + tagPaddingX * 2;

          // Tag 배경 (roundRect)
          shapes.push({
            id: `tag-bg-${tagX}-${currentY}`,
            type: "roundRect" as const,
            x: tagX,
            y: currentY,
            width: chipWidth,
            height: tagHeight,
            radius: borderRadius,
            fill: resolveStateColors(variant, state).background,
          });

          // Tag 테두리
          shapes.push({
            type: "border" as const,
            target: `tag-bg-${tagX}-${currentY}`,
            borderWidth: 1,
            color: variant.border || variant.text,
            radius: borderRadius,
          });

          // Tag 텍스트 — maxWidth 명시하여 specShapeConverter의
          // containerWidth - shape.x 자동 축소 방지
          shapes.push({
            type: "text" as const,
            x: tagX + tagPaddingX,
            y: currentY + tagPaddingY,
            text: item.text,
            fontSize: tagFontSize,
            fontFamily: fontFamily.sans,
            fontWeight: 400,
            fill: variant.text,
            align: "left" as const,
            baseline: "top" as const,
            maxWidth: textWidth + tagFontSize,
          });

          tagX += chipWidth + tagGap;
        }
      }

      return shapes;
    },

    react: (props) => ({
      role: "group",
      "aria-label": props.label,
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
