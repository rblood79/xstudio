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
 * ADR-097 Phase 4A — size 별 chip 치수 (TagSpec.sizes sm/md/lg 와 1:1 정합).
 *
 * TagList 는 size prop 을 직접 수신하지 않지만 TagGroup.propagation 으로 size 를
 * 전파받는다. shapes 함수의 `size` 매개변수는 TagList 본인 sizes (md only) 이므로
 * 부모 TagGroup size 를 별도로 해석하기 위해 본 상수 사용.
 *
 * 치수 공식 (TagSpec 참조):
 *   `height = lineHeight + paddingY * 2`
 *   텍스트 렌더 시 `y = chip.y + paddingY`, 세로 공간 = lineHeight
 *   → top-baseline + lineHeight 수직 중앙 정렬 보장.
 *
 * TagSpec sm/md/lg 값과 완전 동일 (chip=button sizing 의도).
 */
export const TAG_CHIP_SIZES = {
  sm: {
    paddingX: 8,
    paddingY: 2,
    fontSize: 12,
    lineHeight: 16,
    borderRadius: 4,
    gap: 4,
  },
  md: {
    paddingX: 12,
    paddingY: 4,
    fontSize: 14,
    lineHeight: 20,
    borderRadius: 6,
    gap: 4,
  },
  lg: {
    paddingX: 16,
    paddingY: 8,
    fontSize: 16,
    lineHeight: 24,
    borderRadius: 8,
    gap: 6,
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
     * ADR-097 Phase 4A/4B — items 기반 chip self-render (ListBox 선례 대칭).
     *
     * Taffy 자식 0개 상태 (migration 후 Tag element orphan 처리됨) 에서도 TagGroup.
     * items → TagList.items propagation 경로로 chip 시각이 보존된다.
     *
     * Phase 4B 기능 (이식됨):
     *   - Row-wrap 시뮬레이션 (_containerWidth 기반 각 chip 폭 누적 → row 판정)
     *   - maxRows > 0 시 초과 chip skip + "Show all" chip (투명 배경, accent 텍스트)
     *   - allowsRemoving 시 각 chip 오른쪽에 X icon_font shape
     *   - per-item isDisabled 시각: variant.background/text → neutral-subtle/neutral-subdued
     *     (ShapeBase opacity 미지원 → 색상 fallback 방식)
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
      // Tag spec 정식 치수 공식: height = lineHeight + paddingY*2.
      // fontSize 가 style 로 override 되어도 lineHeight 는 size 토큰 기준을 유지
      // (CSS line-height 와 Canvas chip 높이 정합성 보장).
      const lineHeight = chipSize.lineHeight;
      const tagHeight = lineHeight + tagPaddingY * 2;
      const borderRadius = chipSize.borderRadius;
      const gap = chipSize.gap;
      const rowGap = gap;

      // CONTAINER_DIMENSION 주입. 컨테이너 폭 미지정 시 350 fallback
      // (implicitStyles 기존 로직 availableWidth fallback 과 동일).
      const containerWidth =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : 350;

      const allowsRemoving = Boolean(props.allowsRemoving);
      // Tag.spec.ts 관례: allowsRemoving 시 우측 padding 을 paddingY 로 축소
      //   → text 와 X 아이콘 모두 수용하면서 chip 폭을 과도하게 키우지 않음.
      const tagPaddingRight = allowsRemoving ? tagPaddingY : tagPaddingX;
      // X 아이콘 예약 폭: text ↔ icon gap(4) + icon 폭(fontSize)
      //   chip layout: [paddingX][text][gap=4][icon=fontSize][paddingRight]
      const iconGap = 4;
      const removeExtraWidth = allowsRemoving ? iconGap + fontSize : 0;

      const maxRowsRaw = (props as Record<string, unknown>).maxRows;
      const maxRows = typeof maxRowsRaw === "number" ? maxRowsRaw : 0;

      const stateColors = resolveStateColors(variant, state);

      // Phase 1: wrap/maxRows 시뮬레이션 — 각 chip 폭 계산 + 행 배치 결정
      interface ChipLayout {
        label: string;
        textWidth: number;
        chipWidth: number;
        x: number;
        y: number;
        isDisabled: boolean;
      }
      const placed: ChipLayout[] = [];
      let currentRowWidth = 0;
      let rowIndex = 0;
      let shouldShowAll = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const label = item.label || `Tag ${i + 1}`;
        const textWidth = measureSpecTextWidth(
          label,
          fontSize,
          fontFamily.sans,
        );
        const chipWidth =
          textWidth + tagPaddingX + tagPaddingRight + removeExtraWidth;
        const gapBefore = i > 0 && currentRowWidth > 0 ? gap : 0;

        // 행 넘침 판정 (i > 0 만 wrap — 첫 chip 은 무조건 row 0)
        if (i > 0 && currentRowWidth + gapBefore + chipWidth > containerWidth) {
          rowIndex++;
          currentRowWidth = 0;
        }

        // maxRows 초과 — Show all chip 표시 후 순회 종료
        if (maxRows > 0 && rowIndex >= maxRows) {
          shouldShowAll = true;
          break;
        }

        const x = currentRowWidth === 0 ? 0 : currentRowWidth + gap;
        placed.push({
          label,
          textWidth,
          chipWidth,
          x,
          y: rowIndex * (tagHeight + rowGap),
          isDisabled: Boolean(item.isDisabled),
        });
        currentRowWidth = x + chipWidth;
      }

      // Phase 2: placed chip shapes emit
      const DISABLED_BG = "{color.neutral-subtle}" as TokenRef;
      const DISABLED_TEXT = "{color.neutral-subdued}" as TokenRef;
      const DISABLED_BORDER = "{color.neutral-subtle}" as TokenRef;

      for (let i = 0; i < placed.length; i++) {
        const chip = placed[i];
        const bgId = `tag-bg-${i}`;
        const chipBg = chip.isDisabled ? DISABLED_BG : stateColors.background;
        const chipBorder = chip.isDisabled
          ? DISABLED_BORDER
          : variant.border || variant.text;
        const chipTextColor = chip.isDisabled ? DISABLED_TEXT : variant.text;

        shapes.push({
          id: bgId,
          type: "roundRect" as const,
          x: chip.x,
          y: chip.y,
          width: chip.chipWidth,
          height: tagHeight,
          radius: borderRadius,
          fill: chipBg,
        });

        shapes.push({
          type: "border" as const,
          target: bgId,
          borderWidth: 1,
          color: chipBorder,
          radius: borderRadius,
        });

        shapes.push({
          type: "text" as const,
          x: chip.x + tagPaddingX,
          y: chip.y + tagHeight / 2,
          text: chip.label,
          fontSize,
          // lineHeight 명시: specShapeConverter 의 paddingTop 계산 (lineHeightPx 기준)
          // 과 CanvasKit Paragraph 내부 line-height 를 동일 값(chipSize.lineHeight)
          // 으로 맞춰 수직 중앙 정렬의 위·아래 여백 대칭 보장.
          lineHeight,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: chipTextColor,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: chip.textWidth + fontSize,
        });

        if (allowsRemoving) {
          // X 아이콘 — chip 오른쪽 안쪽에 중앙 배치.
          // specShapeConverter.ts:446-452 에서 icon_font 의 shape.x 는 icon 중심
          // 좌표(cx)로 해석되므로, 우측 padding(tagPaddingRight) 안쪽에서
          // iconSize/2 만큼 당긴 위치를 center 로 지정.
          //   layout: [paddingX][text][gap=4][icon=fontSize][paddingRight=paddingY]
          shapes.push({
            type: "icon_font" as const,
            iconName: "x",
            x: chip.x + chip.chipWidth - tagPaddingRight - fontSize / 2,
            y: chip.y + tagHeight / 2,
            fontSize,
            fill: chipTextColor,
            strokeWidth: 2,
          });
        }
      }

      // Phase 3: Show all chip (maxRows 초과 시)
      if (shouldShowAll && placed.length > 0) {
        const lastChip = placed[placed.length - 1];
        const showAllLabel = "Show all";
        const showAllWidth =
          measureSpecTextWidth(showAllLabel, fontSize, fontFamily.sans) +
          tagPaddingX * 2;
        const showAllX = lastChip.x + lastChip.chipWidth + gap;
        // Show all 도 같은 행에 두어 visual layout 유지
        // (원본 implicitStyles 도 lastChip 이후 push 하고 filteredChildren 재정렬 없음)

        shapes.push({
          id: "tag-show-all-bg",
          type: "roundRect" as const,
          x: showAllX,
          y: lastChip.y,
          width: showAllWidth,
          height: tagHeight,
          radius: borderRadius,
          fill: "{color.transparent}" as TokenRef,
        });

        shapes.push({
          type: "text" as const,
          x: showAllX + tagPaddingX,
          y: lastChip.y + tagHeight / 2,
          text: showAllLabel,
          fontSize,
          lineHeight,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: "{color.accent}" as TokenRef,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: showAllWidth,
        });
      }

      return shapes;
    },
    react: () => ({}),
  },
};
