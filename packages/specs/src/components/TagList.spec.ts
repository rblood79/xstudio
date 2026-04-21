/**
 * TagList Component Spec
 *
 * ADR-093 Phase 1 — TagList 중간 컨테이너의 layout primitive (display/flexDirection/flexWrap/gap)
 * SSOT 신설.
 *
 * - composition 자체 추상화: RAC `<TagList>` 에 대응하지만, 이 spec 은 composition
 *   builder 에서 TagGroup > TagList > Tag 3단 구조의 중간 컨테이너 레이어.
 * - CSS 자동 생성: skipCSSGeneration: true — 부모 TagGroupSpec.childSpecs 경로로
 *   부모 TagGroup generated CSS 내부에 inline emit (ADR-078/090/092 패턴 재사용).
 * - Skia consumer: ADR-094 `expandChildSpecs` 자동 등록 → `TAG_SPEC_MAP` /
 *   `LOWERCASE_TAG_SPEC_MAP` / `tagToElement.ts` 모든 소비처 자동 혜택.
 * - render.shapes: () => [] — TagList 자체 시각 없음. Tag 자식이 각자 렌더링.
 *
 * containerStyles: `implicitStyles.ts:574-582` TagList 분기의 display/flexDirection/
 *   flexWrap/gap base primitive 를 Spec SSOT 로 리프팅.
 *   Hard Constraint #2: TagGroup 에는 `orientation` prop 없음 (TagGroup.spec.ts:35 /
 *   GroupComponents.ts:403 확인) → 기본값은 row + wrap (현재 implicitStyles.ts:577 동작 일치).
 *
 * sizes: TagList 는 size prop 없음 (Soft Constraint) → sizes.md only.
 *   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
 *
 * runtime fork (implicitStyles 잔존):
 *   - `labelPosition === "side"` 시 flex:1/minWidth:0 주입
 *   - Tag 자식 whiteSpace:"nowrap" 주입
 *   - maxRows 근사 계산 (자식 Element 조작, spec 커버 영역 아님 — ADR-093 HC#4)
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import type { StoredTagItem } from "../types/taggroup-items";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { measureSpecTextWidth } from "../renderers/utils/measureText";

/**
 * TagList Props
 *
 * TagList 는 TagGroup 내부의 중간 컨테이너로 composition 이 자동 생성하는 element.
 * size prop 없음 — 부모 TagGroup.size 를 propagation 으로 수신.
 */
export interface TagListProps {
  // 부모 TagGroup 으로부터 propagation 수신 전용
  size?: "sm" | "md" | "lg";
  allowsRemoving?: boolean;
  /**
   * ADR-097 Phase 4A — TagGroup.items SSOT 를 propagation 으로 수신.
   * TagList spec shapes 가 items 기반 chip 을 self-render (ListBox 선례 대칭).
   */
  items?: StoredTagItem[];
  /** 부모 TagGroup 의 variant 전파 — chip 색상 결정 */
  variant?: "default" | "accent" | "neutral" | "negative";
  /** CONTAINER_DIMENSION_TAGS 경유 주입 — chip layout 계산용 */
  _containerWidth?: number;
  _containerHeight?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * TagList Component Spec
 *
 * archetype: "simple" — SHELL_ONLY_CONTAINER_TAGS 판정 대상 아님 (부모 TagGroup 이 해당).
 * skipCSSGeneration: true — 독립 CSS 파일 emit 중단.
 *   부모 TagGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
 * render.shapes: () => [] — Skia shapes 없음 (container shell).
 *
 * containerStyles: ADR-093 — TagList 분기 base primitive 리프팅.
 *   Hard Constraint #2: TagGroup orientation prop 없음 → row+wrap 기본 (현재 runtime 동작 일치).
 *   ADR-094 `expandChildSpecs` 를 통해 `resolveContainerStylesFallback` /
 *   `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
 */
/**
 * ADR-097 Phase 4A — TagList variants 복제 (TagGroupSpec.variants 1:1).
 *
 * 본래 TagGroupSpec 이 단일 소스이지만 순환 import 회피를 위해 복제.
 * Phase 4B 이후 공유 primitive 로 추출 고려 (variant SSOT 통합).
 */
const TAG_LIST_VARIANTS = {
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
} as const;

/**
 * ADR-097 Phase 4A — size 별 chip 치수 (TagGroupSpec.sizes 1:1 복제).
 * TagList 는 size prop 직접 미수신이지만 TagGroup.propagation 으로 size 전파 후
 * shapes 함수의 `size` 매개변수는 TagList 본인 sizes (md only) 가 되므로, 부모
 * TagGroup size 를 별도로 해석하기 위해 본 상수 사용. props.size 참조.
 */
const TAG_CHIP_SIZES = {
  sm: {
    paddingX: 8,
    paddingY: 2,
    fontSize: 12,
    borderRadius: 4,
    gap: 6,
  },
  md: {
    paddingX: 12,
    paddingY: 4,
    fontSize: 14,
    borderRadius: 6,
    gap: 8,
  },
  lg: {
    paddingX: 16,
    paddingY: 6,
    fontSize: 16,
    borderRadius: 6,
    gap: 10,
  },
} as const;

export const TagListSpec: ComponentSpec<TagListProps> = {
  name: "TagList",
  description:
    "TagGroup 내부 중간 컨테이너 — display:flex row+wrap (TagGroup orientation prop 없음 반영)",
  archetype: "simple",
  element: "div",
  // ADR-093: 독립 CSS 파일 emit 중단.
  //   부모 TagGroupSpec.childSpecs 경로로 부모 generated CSS 에만 inline emit.
  skipCSSGeneration: true,

  // ADR-093 Phase 1: implicitStyles.ts TagList 분기(display/flexDirection/flexWrap/gap base)
  //   를 Spec SSOT 로 리프팅. ADR-094 `expandChildSpecs` 를 통해
  //   `resolveContainerStylesFallback` / `LOWERCASE_TAG_SPEC_MAP` 자동 주입.
  //   Hard Constraint #2: TagGroup 에는 orientation prop 없음 → row+wrap 기본값.
  //   runtime fork (labelPosition="side" 시 flex:1/minWidth:0, maxRows, whiteSpace injection)
  //   는 implicitStyles.ts 잔존 (Hard Constraint #4).
  containerStyles: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: TAG_LIST_VARIANTS,

  // sizes: TagList 는 size prop 없음 → sizes.md only (gap 4 = implicitStyles.ts:579 기존값 일치).
  //   borderRadius: "{radius.none}" — CSS Generator undefined 출력 방지 (ADR-092 실수 방지).
  //   ADR-097 Phase 4A: height = 32 (md chip height 근사, single-row 가정).
  //     Phase 4B 에서 items-based row-wrap intrinsic height 계산으로 대체.
  sizes: {
    md: {
      height: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 4,
    },
  },

  states: {
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    /**
     * ADR-097 Phase 4A — items 기반 chip self-render (ListBox 선례 대칭).
     *
     * Taffy 자식 0개 상태 (migration 후 Tag element orphan 처리됨) 에서도 TagGroup.
     * items → TagList.items propagation 경로로 chip 시각이 보존된다.
     *
     * Phase 4A 범위:
     *   - Single-row chip 배치 (wrap 없음, maxRows 없음 — Phase 4B)
     *   - allowsRemoving X 아이콘 없음 (Phase 4B)
     *   - per-item isDisabled opacity 적용
     */
    shapes: (props, _size, state = "default") => {
      const shapes: Shape[] = [];
      const items = props.items;
      if (!items || items.length === 0) return shapes;

      // 부모 TagGroup 으로부터 propagation 수신한 size/variant 해석
      const sizeName = (props.size as keyof typeof TAG_CHIP_SIZES) ?? "md";
      const chipSize = TAG_CHIP_SIZES[sizeName] ?? TAG_CHIP_SIZES.md;
      const variantKey =
        (props.variant as keyof typeof TAG_LIST_VARIANTS) ?? "default";
      const variant =
        TAG_LIST_VARIANTS[variantKey] ?? TAG_LIST_VARIANTS.default;

      // fontSize: props.style.fontSize override 지원, 없으면 chipSize.fontSize
      const styleFs = props.style?.fontSize;
      const rawFs =
        typeof styleFs === "number"
          ? styleFs
          : typeof styleFs === "string" && styleFs.startsWith("{")
            ? resolveToken(styleFs as TokenRef)
            : chipSize.fontSize;
      const fontSize = typeof rawFs === "number" ? rawFs : chipSize.fontSize;

      const tagPaddingX = chipSize.paddingX;
      const tagPaddingY = chipSize.paddingY;
      const tagHeight = fontSize + tagPaddingY * 2;
      const borderRadius = chipSize.borderRadius;
      const gap = chipSize.gap;

      let tagX = 0;
      const currentY = 0;
      const stateColors = resolveStateColors(variant, state);

      // Phase 4A: 기본 chip 렌더 (single-row, wrap 없음).
      //   per-item isDisabled 시각 상태는 Phase 4B 에서 alpha-blended 색상
      //   fallback (bg-muted 계열) 으로 처리 — ShapeBase 가 opacity 필드 미지원.
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const label = item.label || `Tag ${i + 1}`;

        const textWidth = measureSpecTextWidth(
          label,
          fontSize,
          fontFamily.sans,
        );
        const chipWidth = textWidth + tagPaddingX * 2;
        const bgId = `tag-bg-${i}`;

        shapes.push({
          id: bgId,
          type: "roundRect" as const,
          x: tagX,
          y: currentY,
          width: chipWidth,
          height: tagHeight,
          radius: borderRadius,
          fill: stateColors.background,
        });

        shapes.push({
          type: "border" as const,
          target: bgId,
          borderWidth: 1,
          color: variant.border || variant.text,
          radius: borderRadius,
        });

        shapes.push({
          type: "text" as const,
          x: tagX + tagPaddingX,
          y: currentY + tagPaddingY,
          text: label,
          fontSize,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: variant.text,
          align: "left" as const,
          baseline: "top" as const,
          maxWidth: textWidth + fontSize,
        });

        tagX += chipWidth + gap;
      }

      return shapes;
    },
    react: () => ({}),
  },
};
