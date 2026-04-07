/**
 * Implicit Style Injection — 공유 모듈
 *
 * BuilderCanvas의 createContainerChildRenderer에서 인라인으로 적용되던
 * 태그별 implicit style 규칙을 순수 함수로 추출.
 *
 * fullTreeLayout.ts의 DFS 순회와 BuilderCanvas 양쪽에서 재사용하여
 * 레이아웃 결과의 일관성을 보장한다.
 *
 * @since 2026-02-28 Phase 1 — Full-Tree WASM Layout 통합
 */

import type { Element } from "../../../../../types/core/store.types";
import {
  parsePadding,
  PHANTOM_INDICATOR_CONFIGS,
  measureTextWidth,
  TABS_BAR_HEIGHT,
  TABS_PANEL_PADDING,
} from "./utils";
import { InlineAlertSpec } from "@xstudio/specs";
import { getNecessityIndicatorSuffix } from "@xstudio/shared/components";

// ─── 인터페이스 ──────────────────────────────────────────────────────

export interface ImplicitStyleResult {
  /** 스타일이 주입된 부모 요소 (원본 또는 변환본) */
  effectiveParent: Element;
  /** 필터링 + 스타일 주입된 자식 배열 */
  filteredChildren: Element[];
}

// ─── 공유 유틸 ──────────────────────────────────────────────────────

/** ProgressBar/Meter value → 포맷된 텍스트 (implicitStyles + ElementSprite 공유) */
export function formatProgressValue(
  value: number,
  min: number,
  max: number,
  formatOptions?: Record<string, unknown> | null,
): string {
  if (!formatOptions?.style || formatOptions.style === "percent") {
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
    return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
  }
  // currency/unit style에 필수값 없으면 decimal fallback
  const style = formatOptions.style as Intl.NumberFormatOptions["style"];
  if (style === "currency" && !formatOptions.currency) {
    return String(Math.round(value));
  }
  if (style === "unit" && !formatOptions.unit) {
    return String(Math.round(value));
  }
  try {
    const opts: Intl.NumberFormatOptions = { style };
    if (formatOptions.currency) opts.currency = String(formatOptions.currency);
    if (formatOptions.unit) opts.unit = String(formatOptions.unit);
    if (formatOptions.notation)
      opts.notation =
        formatOptions.notation as Intl.NumberFormatOptions["notation"];
    return new Intl.NumberFormat(undefined, opts).format(value);
  } catch {
    return String(Math.round(value));
  }
}

// ─── 내부 상수 ──────────────────────────────────────────────────────

/**
 * ComboBox/Select/SelectTrigger/ComboBoxWrapper 공통 spec padding
 * @sync Select.css / ComboBox.css size variants
 * CSS padding: top right bottom left — right = top (paddingY), left = paddingLeft
 */
const SPEC_PADDING: Record<string, { left: number; right: number; y: number }> =
  {
    xs: { left: 4, right: 1, y: 1 },
    sm: { left: 8, right: 2, y: 2 },
    md: { left: 12, right: 4, y: 4 },
    lg: { left: 16, right: 8, y: 8 },
    xl: { left: 24, right: 12, y: 12 },
  };

/** SelectIcon / ComboBoxTrigger icon 크기 — SelectIconSpec.sizes.iconSize 동기 */
const SPEC_ICON_SIZE: Record<string, number> = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
};

/** ComboBoxInput / SelectValue font size — NumberField.css --nf-input-font-size 동기 */
const SPEC_INPUT_FONT_SIZE: Record<string, number> = {
  xs: 10, // text-2xs
  sm: 12, // text-xs
  md: 14, // text-sm
  lg: 16, // text-base
  xl: 18, // text-lg
};

/** SelectTrigger / ComboBoxWrapper 높이 — SelectTriggerSpec.sizes.height 동기 */
const SPEC_TRIGGER_HEIGHT: Record<string, number> = {
  xs: 20,
  sm: 22,
  md: 30,
  lg: 42,
  xl: 54,
};

/** Checkbox/Radio indicator 크기 (spec shapes 렌더링, Taffy 트리 밖) */
const INDICATOR_SIZES: Record<string, { box: number; gap: number }> = {
  sm: { box: 16, gap: 6 },
  md: { box: 20, gap: 8 },
  lg: { box: 24, gap: 10 },
};

/** ProgressBar/Meter — CSS: row-gap: var(--spacing-xs)=4px, column-gap: var(--spacing-md)=12px */
const PROGRESSBAR_ROW_GAP = 4;
const PROGRESSBAR_COL_GAP = 12;

/** ProgressBar/Meter 사이즈별 barHeight (PROGRESSBAR_DIMENSIONS 동기) */
const PROGRESSBAR_BAR_HEIGHT: Record<string, number> = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

/** ProgressBar/Meter 사이즈별 fontSize (ProgressBarSpec.sizes.fontSize resolved) */
const PROGRESSBAR_FONT_SIZE: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

/** 사이즈별 lineHeight (CSS --text-*--line-height 동기, ProgressBar/Meter/Slider 공통) */
const SIZE_LINE_HEIGHT: Record<string, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

/** ProgressBar/Meter 태그 집합 */
const PROGRESSBAR_TAGS = new Set([
  "progressbar",
  "progress",
  "loadingbar",
  "meter",
  "gauge",
]);

/** Slider 태그 집합 */
const SLIDER_TAGS = new Set(["slider"]);
/** DatePicker/DateRangePicker 내 Popover로 표시되는 자식 — Taffy 레이아웃 제외 */
const POPOVER_CHILDREN_TAGS = new Set(["Calendar", "RangeCalendar"]);

/** Slider — CSS: row-gap: var(--spacing-xs)=4px, column-gap: S2 S/M=16px, L=20px */
const SLIDER_ROW_GAP = 4;
const SLIDER_COL_GAP: Record<string, number> = {
  sm: 16,
  md: 16,
  lg: 20,
  xl: 20,
};

/** Slider 사이즈별 레이아웃 높이 = thumbSize (시각적 trackHeight 4/8/12가 아님, thumb 수용 목적) */
const SLIDER_TRACK_LAYOUT_HEIGHT: Record<string, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 26,
};

/** Slider 사이즈별 fontSize (SliderSpec.sizes.fontSize resolved) */
const SLIDER_FONT_SIZE: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

/** Synthetic Label을 생성하는 태그 */
const SYNTHETIC_LABEL_TAGS = new Set([
  "radio",
  "checkbox",
  "switch",
  "toggle",
  "progressbar",
  "progress",
  "loadingbar",
  "meter",
  "gauge",
]);

/** Necessity Indicator 지원 태그 — Label 자식에 suffix 주입 대상 */
const NECESSITY_INDICATOR_TAGS = new Set([
  "textfield",
  "textarea",
  "numberfield",
  "searchfield",
  "select",
  "combobox",
  "datefield",
  "timefield",
  "colorfield",
  "checkboxgroup",
  "radiogroup",
  "taggroup",
]);

const FORM_SIDE_LABEL_WIDTH = 176;
const FORM_SIDE_LABEL_GAP = 16;

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────

/**
 * labelPosition prop → flexDirection 변환.
 * labelPosition이 명시되면 강제 적용, 없으면 fallback(기존 flexDirection) 사용.
 */
function resolveLabelFlexDir(
  labelPos: string | undefined,
  fallback: string | undefined,
  defaultDir = "column",
): string {
  if (labelPos) return labelPos === "side" ? "row" : "column";
  return fallback ?? defaultDir;
}

/**
 * 사용자 padding이 설정되어 있는지 확인.
 * shorthand(padding) 또는 개별(paddingTop 등) 중 하나라도 있으면 true.
 */
function hasUserPadding(style: Record<string, unknown>): boolean {
  return (
    style.padding !== undefined ||
    style.paddingTop !== undefined ||
    style.paddingBottom !== undefined ||
    style.paddingLeft !== undefined ||
    style.paddingRight !== undefined
  );
}

/**
 * spec size에 따른 padding을 주입한 스타일 반환.
 * 사용자 padding이 있으면 parsePadding으로 해석, 없으면 spec 기본값.
 */
function withSpecPadding(
  style: Record<string, unknown>,
  sizeName: string,
): Record<string, unknown> {
  const specPad = SPEC_PADDING[sizeName] ?? SPEC_PADDING.md;
  const userPad = hasUserPadding(style) ? parsePadding(style) : null;
  return {
    ...style,
    paddingLeft: userPad ? userPad.left : specPad.left,
    paddingRight: userPad ? userPad.right : specPad.right,
    paddingTop: userPad ? userPad.top : specPad.y,
    paddingBottom: userPad ? userPad.bottom : specPad.y,
  };
}

/**
 * 부모 요소의 style을 변경한 새 Element를 반환.
 */
function withParentStyle(el: Element, style: Record<string, unknown>): Element {
  return {
    ...el,
    props: { ...el.props, style },
  };
}

/** GridListItem/ListBoxItem 자식 Text/Description에 CSS 정합성 fontSize/fontWeight/width 주입 */
function injectCollectionItemFontStyles(children: Element[]): Element[] {
  return children.map((child) => {
    const cs = (child.props?.style as Record<string, unknown>) || {};
    if (child.tag === "Text") {
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            fontSize: cs.fontSize ?? 14,
            fontWeight: cs.fontWeight ?? 600,
            width: cs.width ?? "100%",
          },
        },
      };
    }
    if (child.tag === "Description") {
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            fontSize: cs.fontSize ?? 12,
            width: cs.width ?? "100%",
          },
        },
      };
    }
    return child;
  });
}

function applySideLabelChildStyles(
  children: Element[],
  labelPos: string | undefined,
): Element[] {
  if (labelPos !== "side") return children;

  return children.map((child) => {
    const cs = (child.props?.style || {}) as Record<string, unknown>;

    if (child.tag === "Label") {
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            width: cs.width ?? FORM_SIDE_LABEL_WIDTH,
            flexShrink: cs.flexShrink ?? 0,
            alignSelf: cs.alignSelf ?? "flex-start",
          },
        },
      };
    }

    if (child.tag === "FieldError" || child.tag === "Description") {
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            width: cs.width ?? "100%",
            marginLeft:
              cs.marginLeft ?? FORM_SIDE_LABEL_WIDTH + FORM_SIDE_LABEL_GAP,
          },
        },
      };
    }

    return {
      ...child,
      props: {
        ...child.props,
        style: {
          ...cs,
          flex: cs.flex ?? 1,
          minWidth: cs.minWidth ?? 0,
        },
      },
    };
  });
}

function getSideLabelParentStyle(
  parentStyle: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...parentStyle,
    display: parentStyle.display ?? "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: parentStyle.gap ?? 4,
  };
}

function getDelegatedSize(
  el: Element,
  elementById: Map<string, Element>,
): string {
  const ownSize = (el.props as Record<string, unknown> | undefined)?.size;
  if (typeof ownSize === "string" && ownSize.trim()) {
    return ownSize;
  }

  const parent = el.parent_id ? elementById.get(el.parent_id) : undefined;
  const parentSize = (parent?.props as Record<string, unknown> | undefined)
    ?.size;
  if (typeof parentSize === "string" && parentSize.trim()) {
    return parentSize;
  }

  const grandParent = parent?.parent_id
    ? elementById.get(parent.parent_id)
    : undefined;
  const grandParentSize = (
    grandParent?.props as Record<string, unknown> | undefined
  )?.size;
  if (typeof grandParentSize === "string" && grandParentSize.trim()) {
    return grandParentSize;
  }

  return "md";
}

// ─── 공개 API ────────────────────────────────────────────────────────

/**
 * 컨테이너 태그에 따라 implicit style을 부모/자식에 주입하고,
 * 렌더링 대상 자식을 필터링한다.
 *
 * 이 함수는 레이아웃 전처리만 담당한다.
 * 렌더링 시점 로직(Card props 동기화, backgroundColor 방어 등)은 포함하지 않는다.
 *
 * @param containerEl   - 컨테이너 요소
 * @param children      - 원본 자식 배열
 * @param getChildElements - 자식 Element 배열 accessor (Tabs dual lookup용)
 * @param elementById   - 전역 요소 맵 (ComboBoxWrapper → 부모 ComboBox 조회용)
 */
export function applyImplicitStyles(
  containerEl: Element,
  children: Element[],
  getChildElements: (id: string) => Element[],
  elementById: Map<string, Element>,
  /** 현재 노드에 사용 가능한 너비 (px) — maxRows 행 시뮬레이션용 */
  availableWidth?: number,
): ImplicitStyleResult {
  const containerTag = (containerEl.tag ?? "").toLowerCase();
  const parentStyle = (containerEl.props?.style || {}) as Record<
    string,
    unknown
  >;
  const containerProps = containerEl.props as
    | Record<string, unknown>
    | undefined;

  let effectiveParent = containerEl;
  let filteredChildren = children;

  // ── Menu ──────────────────────────────────────────────────────────
  // Menu는 트리거 버튼만 캔버스에 렌더링 — MenuItem 자식은 Popover이므로 Taffy 레이아웃 제외
  if (containerTag === "menu") {
    filteredChildren = [];
    return { effectiveParent, filteredChildren };
  }

  // ── TagGroup ───────────────────────────────────────────────────────
  // CSS 구조: TagGroup(column) > Label + TagList(row wrap) > Tags
  // TagList가 있으면 column 통과, 없으면(레거시) row wrap으로 보정
  if (containerTag === "taggroup") {
    const hasTagList = children.some((c) => c.tag === "TagList");

    // Compositional Label: whiteSpace nowrap 주입 (줄바꿈 방지)
    filteredChildren = children.map((child) => {
      if (child.tag === "Label") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              whiteSpace: cs.whiteSpace ?? "nowrap",
            },
          },
        } as Element;
      }
      return child;
    });

    const tgLabelPos = containerProps?.labelPosition as unknown as
      | string
      | undefined;
    const tgDefaultDir = hasTagList ? "column" : "row";
    const tgFlexDir = resolveLabelFlexDir(
      tgLabelPos,
      parentStyle.flexDirection as string | undefined,
      tgDefaultDir,
    );
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: tgFlexDir,
      flexWrap: hasTagList && tgLabelPos !== "side" ? undefined : "wrap",
      gap: parentStyle.gap ?? 4,
    });
  }

  // ── TagList ──────────────────────────────────────────────────────
  // TagGroup 내부 TagList: 부모 orientation에 따라 row/column 전환
  // width: 100% — 부모 TagGroup 전체 너비를 사용하여 Tag들이 가로 배치
  if (containerTag === "taglist") {
    const parentEl = containerEl.parent_id
      ? elementById.get(containerEl.parent_id)
      : undefined;
    const parentProps = parentEl?.props as Record<string, unknown> | undefined;
    const orientation = parentProps?.orientation as string | undefined;
    const parentLabelPos = parentProps?.labelPosition as string | undefined;

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
      flexWrap: orientation === "vertical" ? undefined : "wrap",
      gap: parentStyle.gap ?? 4,
      // labelPosition: "side" 시 flex:1로 남은 공간 차지 (Label 옆 배치)
      ...(parentLabelPos === "side" ? { flex: 1, minWidth: 0 } : {}),
    });

    // Tag 자식: white-space: nowrap (CSS .react-aria-Tag 동기화)
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag !== "Tag") return child;
      const childStyle = (child.props?.style ?? {}) as Record<string, unknown>;
      if (childStyle.whiteSpace) return child;
      return {
        ...child,
        props: {
          ...child.props,
          style: { ...childStyle, whiteSpace: "nowrap" },
        },
      };
    });

    // maxRows: 초과 Tag를 filteredChildren에서 제거 (S2 패턴)
    // Canvas에서는 행 위치를 사전에 알 수 없으므로, 부모 폭과 Tag 예상 폭으로 근사 계산
    const maxRows =
      typeof parentProps?.maxRows === "number" ? parentProps.maxRows : 0;
    const gap = 4;
    if (maxRows > 0) {
      const tagChildren = filteredChildren.filter((c) => c.tag === "Tag");
      if (tagChildren.length > 0) {
        // 부모 폭: DFS에서 전달된 availableWidth 사용
        // labelPosition: "side" 시 Label 폭을 빼서 TagList 실제 사용 가능 폭 계산
        let parentWidth = availableWidth || 350;
        if (parentLabelPos === "side") {
          const labelChild = filteredChildren.find((c) => c.tag === "Label");
          if (labelChild) {
            const labelText = String(
              (labelChild.props as Record<string, unknown>)?.children || "",
            );
            const labelFontSize =
              parseFloat(
                String(
                  (
                    (labelChild.props as Record<string, unknown>)
                      ?.style as Record<string, unknown>
                  )?.fontSize ?? 14,
                ),
              ) || 14;
            const labelWidth =
              measureTextWidth(labelText, labelFontSize, "Pretendard", 500) +
              gap;
            parentWidth = Math.max(parentWidth - labelWidth, 50);
          }
        }
        const sizeName = (parentProps?.size as string) || "md";
        const tagPaddingX =
          sizeName === "xs"
            ? 4
            : sizeName === "sm"
              ? 8
              : sizeName === "lg"
                ? 16
                : sizeName === "xl"
                  ? 24
                  : 12;
        const tagFontSize =
          sizeName === "xs"
            ? 10
            : sizeName === "sm"
              ? 12
              : sizeName === "lg"
                ? 16
                : sizeName === "xl"
                  ? 18
                  : 14;
        const borderWidth = 1;

        // 각 Tag의 실측 폭으로 행 배치 시뮬레이션
        let currentRowWidth = 0;
        let rowCount = 1;
        let visibleCount = tagChildren.length;
        for (let i = 0; i < tagChildren.length; i++) {
          const text = String(
            (tagChildren[i].props as Record<string, unknown>)?.children || "",
          );
          const textWidth = measureTextWidth(
            text,
            tagFontSize,
            "Pretendard",
            400,
          );
          const tagWidth = tagPaddingX * 2 + borderWidth * 2 + textWidth;
          if (
            currentRowWidth + tagWidth + (i > 0 ? gap : 0) > parentWidth &&
            i > 0
          ) {
            rowCount++;
            currentRowWidth = tagWidth;
          } else {
            currentRowWidth += tagWidth + (i > 0 ? gap : 0);
          }
          if (rowCount > maxRows) {
            visibleCount = i;
            break;
          }
        }
        if (visibleCount < tagChildren.length) {
          const visibleIds = new Set(
            tagChildren.slice(0, visibleCount).map((c) => c.id),
          );
          filteredChildren = filteredChildren.filter(
            (c) => c.tag !== "Tag" || visibleIds.has(c.id),
          );

          // Synthetic "Show all" Tag: maxRows 초과 시 표시하는 가상 Tag
          // fullTreeLayout의 synthetic handler가 Taffy 트리에 자동 추가
          const showAllTag: Element = {
            id: `${containerEl.id}__showAll`,
            tag: "Tag",
            props: {
              children: "Show all",
              style: {
                whiteSpace: "nowrap",
                backgroundColor: "transparent",
                borderColor: "transparent",
                color: "{color.accent}",
              },
            },
            parent_id: containerEl.id,
            page_id: containerEl.page_id,
            order_num: visibleCount + 1,
          } as Element;
          filteredChildren.push(showAllTag);
        }
      }
    }
  }

  // ── ListBox ──────────────────────────────────────────────────────────
  // CSS: display:flex column, padding, gap, border
  if (containerTag === "listbox") {
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: "column",
      gap: parentStyle.gap ?? 4,
      paddingTop: parentStyle.paddingTop ?? 6,
      paddingBottom: parentStyle.paddingBottom ?? 6,
      paddingLeft: parentStyle.paddingLeft ?? 6,
      paddingRight: parentStyle.paddingRight ?? 6,
    });
  }

  // ── GridList ─────────────────────────────────────────────────────────
  // layout: "stack" → display:flex column, "grid" → display:grid with columns
  if (containerTag === "gridlist") {
    const layout = containerProps?.layout as string | undefined;
    const columns = (containerProps?.columns as number) || 2;
    const gap = 12;

    if (layout === "grid") {
      effectiveParent = withParentStyle(containerEl, {
        ...parentStyle,
        display: "grid",
        gridTemplateColumns: Array(columns).fill("1fr"),
        gap: parentStyle.gap ?? gap,
        overflow: parentStyle.overflow ?? "hidden",
      });
    } else {
      effectiveParent = withParentStyle(containerEl, {
        ...parentStyle,
        display: "flex",
        flexDirection: "column",
        gap: parentStyle.gap ?? gap,
      });
    }
  }

  // ── GridListItem ────────────────────────────────────────────────
  // Composition 패턴: 자식 Text/Description Element를 column 방향으로 배치
  // CSS 동기화: .react-aria-GridListItem { padding: var(--spacing-md) var(--spacing-lg), gap: var(--spacing-2xs), border(1px) }
  // --spacing-md = 12px, --spacing-lg = 16px, --spacing-2xs = 2px
  if (containerTag === "gridlistitem") {
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: "column",
      // CSS grid 1fr 트랙 내에서 축소되도록 minWidth: 0 (CSS minmax(0, 1fr) 동기화)
      minWidth: parentStyle.minWidth ?? 0,
      gap: parentStyle.gap ?? 2,
      paddingTop: parentStyle.paddingTop ?? 12,
      paddingBottom: parentStyle.paddingBottom ?? 12,
      paddingLeft: parentStyle.paddingLeft ?? 16,
      paddingRight: parentStyle.paddingRight ?? 16,
      borderWidth: parentStyle.borderWidth ?? 1,
    });
    filteredChildren = injectCollectionItemFontStyles(filteredChildren);
  }

  // ── ListBoxItem ───────────────────────────────────────────────
  // Composition 패턴: CSS .react-aria-ListBoxItem { padding: 4px 12px } 동기화
  if (containerTag === "listboxitem") {
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: "column",
      gap: parentStyle.gap ?? 2,
      paddingTop: parentStyle.paddingTop ?? 4,
      paddingBottom: parentStyle.paddingBottom ?? 4,
      paddingLeft: parentStyle.paddingLeft ?? 12,
      paddingRight: parentStyle.paddingRight ?? 12,
    });
    filteredChildren = injectCollectionItemFontStyles(filteredChildren);
  }

  // ── ToggleButtonGroup ─────────────────────────────────────────────
  if (containerTag === "togglebuttongroup") {
    const orientation = containerProps?.orientation as string | undefined;
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
      alignItems: "center",
    });
  }

  // ── Toolbar ──────────────────────────────────────────────────────────
  if (containerTag === "toolbar") {
    const orientation = containerProps?.orientation as string | undefined;
    const sizeName = (containerProps?.size as string) ?? "md";
    const gap = sizeName === "sm" ? 4 : sizeName === "lg" ? 10 : 8;
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
      alignItems: "center",
      gap: parentStyle.gap ?? gap,
      width: parentStyle.width ?? "fit-content",
    });
    // 자식 Button/ToggleButton: 축소 방지 + 텍스트 줄바꿈 방지
    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            flexShrink: cs.flexShrink ?? 0,
            whiteSpace: cs.whiteSpace ?? "nowrap",
          },
        },
      } as Element;
    });
  }

  // ── CheckboxGroup / RadioGroup ─────────────────────────────────────
  // CSS 구조: RadioGroup(column) > Label + RadioItems(row/column) > Radios
  // RadioItems가 있으면 column 통과, 없으면(레거시) column 보정
  if (containerTag === "checkboxgroup" || containerTag === "radiogroup") {
    const hasLabel = !!containerProps?.label;
    // Label 필터링 + whiteSpace nowrap 주입
    filteredChildren = children
      .filter((child) => (child.tag === "Label" ? hasLabel : true))
      .map((child) => {
        if (child.tag === "Label") {
          const cs = (child.props?.style || {}) as Record<string, unknown>;
          return {
            ...child,
            props: {
              ...child.props,
              style: {
                ...cs,
                whiteSpace: cs.whiteSpace ?? "nowrap",
              },
            },
          } as Element;
        }
        return child;
      });

    const labelPos = containerProps?.labelPosition as unknown as
      | string
      | undefined;
    const flexDir = resolveLabelFlexDir(
      labelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: flexDir,
      gap: parentStyle.gap ?? 4,
    });
  }

  // ── RadioItems / CheckboxItems ────────────────────────────────────
  // RadioGroup 내부 RadioItems: 부모 orientation에 따라 row/column 전환
  if (containerTag === "radioitems" || containerTag === "checkboxitems") {
    const parentEl = containerEl.parent_id
      ? elementById.get(containerEl.parent_id)
      : undefined;
    const parentProps = parentEl?.props as Record<string, unknown> | undefined;
    const orientation = parentProps?.orientation as string | undefined;
    const sizeName = (parentProps?.size as string) ?? "md";
    const gap = sizeName === "sm" ? 8 : sizeName === "lg" ? 16 : 12;

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: orientation === "horizontal" ? "row" : "column",
      alignItems: orientation === "horizontal" ? "center" : undefined,
      gap,
    });
  }

  // ── Breadcrumbs ────────────────────────────────────────────────────
  if (containerTag === "breadcrumbs") {
    filteredChildren = [];
  }

  // ── Tabs ───────────────────────────────────────────────────────────
  if (containerTag === "tabs") {
    const sizeName = (containerProps?.size as string) ?? "md";
    const tabBarHeight = TABS_BAR_HEIGHT[sizeName] ?? TABS_BAR_HEIGHT.md;
    const tabPanelPadding =
      TABS_PANEL_PADDING[sizeName] ?? TABS_PANEL_PADDING.md;

    // Dual Lookup: 직속 Panel 또는 TabPanels 내부 Panel
    let panelChildren = children.filter((c) => c.tag === "Panel");
    if (panelChildren.length === 0) {
      const tabPanelsEl = children.find((c) => c.tag === "TabPanels");
      if (tabPanelsEl) {
        panelChildren = getChildElements(tabPanelsEl.id).filter(
          (c) => c.tag === "Panel",
        );
      }
    }
    const activePanel = panelChildren[0];
    filteredChildren = activePanel ? [activePanel] : [];

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: "column",
      paddingTop: tabBarHeight + tabPanelPadding,
      paddingLeft: tabPanelPadding,
      paddingRight: tabPanelPadding,
      paddingBottom: tabPanelPadding,
    });
  }

  // ── ComboBox / Select / SearchField ───────────────────────────────
  if (
    containerTag === "combobox" ||
    containerTag === "select" ||
    containerTag === "searchfield"
  ) {
    const hasLabel = !!containerProps?.label;
    const WRAPPER_TAGS = new Set([
      "SelectTrigger",
      "ComboBoxWrapper",
      "SearchFieldWrapper",
    ]);
    filteredChildren = children.filter(
      (c) => (c.tag === "Label" ? hasLabel : false) || WRAPPER_TAGS.has(c.tag),
    );

    // Wrapper에 padding + gap 주입
    const wrapperChildTag =
      containerTag === "select"
        ? "SelectTrigger"
        : containerTag === "searchfield"
          ? "SearchFieldWrapper"
          : "ComboBoxWrapper";
    const labelPos = containerProps?.labelPosition as string | undefined;
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === wrapperChildTag) {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        const sizeName = getDelegatedSize(containerEl, elementById);
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              display: cs.display ?? "flex",
              flexDirection: cs.flexDirection ?? "row",
              width: labelPos === "side" ? cs.width : (cs.width ?? "100%"),
              flex: labelPos === "side" ? (cs.flex ?? 1) : cs.flex,
              minWidth: labelPos === "side" ? (cs.minWidth ?? 0) : cs.minWidth,
              gap: cs.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
              ...withSpecPadding(cs, sizeName),
            },
          },
        } as Element;
      }
      return child;
    });

    filteredChildren = applySideLabelChildStyles(filteredChildren, labelPos);
    const flexDir = resolveLabelFlexDir(
      labelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(
      containerEl,
      labelPos === "side"
        ? getSideLabelParentStyle(parentStyle)
        : {
            ...parentStyle,
            display: parentStyle.display ?? "flex",
            flexDirection: flexDir,
            gap: parentStyle.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
          },
    );
  }

  // ── NumberField ──────────────────────────────────────────────────────
  // ComboBox와 동일한 자식 태그(ComboBoxWrapper/Input/Trigger) 재사용
  // → 기존 ComboBox implicitStyles 처리가 자동 적용됨
  if (containerTag === "numberfield") {
    const hasLabel = !!containerProps?.label;
    const WRAPPER_TAGS = new Set(["ComboBoxWrapper"]);
    filteredChildren = children.filter(
      (c) =>
        (c.tag === "Label" ? hasLabel : false) ||
        WRAPPER_TAGS.has(c.tag) ||
        c.tag === "FieldError",
    );
    const nfLabelPos = containerProps?.labelPosition as string | undefined;

    // Wrapper에 padding + gap 주입 (ComboBox 분기와 동일)
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "ComboBoxWrapper") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        const sizeName = getDelegatedSize(containerEl, elementById);
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              display: cs.display ?? "flex",
              flexDirection: cs.flexDirection ?? "row",
              width: nfLabelPos === "side" ? cs.width : (cs.width ?? "100%"),
              flex: nfLabelPos === "side" ? (cs.flex ?? 1) : cs.flex,
              minWidth:
                nfLabelPos === "side" ? (cs.minWidth ?? 0) : cs.minWidth,
              gap: cs.gap ?? 4,
              ...withSpecPadding(cs, sizeName),
            },
          },
        } as Element;
      }
      return child;
    });

    filteredChildren = applySideLabelChildStyles(filteredChildren, nfLabelPos);
    const nfFlexDir = resolveLabelFlexDir(
      nfLabelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(
      containerEl,
      nfLabelPos === "side"
        ? getSideLabelParentStyle(parentStyle)
        : {
            ...parentStyle,
            display: parentStyle.display ?? "flex",
            flexDirection: nfFlexDir,
            gap: parentStyle.gap ?? 4,
          },
    );
  }

  // ── SelectTrigger ──────────────────────────────────────────────────
  if (containerTag === "selecttrigger") {
    const sizeName = getDelegatedSize(containerEl, elementById);
    effectiveParent = withParentStyle(
      containerEl,
      withSpecPadding(
        {
          ...parentStyle,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: parentStyle.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
          // CSS .react-aria-Button: border: 1px solid
          borderWidth: parentStyle.borderWidth ?? 1,
          // Spec height로 CSS와 정확히 일치 (Taffy auto 계산 시 ceil로 1px 오차 방지)
          height:
            parentStyle.height ??
            SPEC_TRIGGER_HEIGHT[sizeName] ??
            SPEC_TRIGGER_HEIGHT.md,
        },
        sizeName,
      ),
    );

    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "SelectValue") {
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              flex: cs.flex ?? 1,
              minWidth: cs.minWidth ?? 0,
              fontSize:
                cs.fontSize ??
                SPEC_INPUT_FONT_SIZE[sizeName] ??
                SPEC_INPUT_FONT_SIZE.md,
              whiteSpace: cs.whiteSpace ?? "nowrap",
              overflow: cs.overflow ?? "hidden",
              textOverflow: cs.textOverflow ?? "ellipsis",
            },
          },
        } as Element;
      }
      if (child.tag === "SelectIcon") {
        // Select → SelectTrigger → SelectIcon: 조부모(Select)의 iconName 전파
        const selectEl = elementById.get(containerEl.parent_id ?? "");
        const selectProps = selectEl?.props as
          | Record<string, unknown>
          | undefined;
        const iconName =
          (child.props as Record<string, unknown> | undefined)?.iconName ??
          selectProps?.iconName;
        const iconSz = SPEC_ICON_SIZE[sizeName] ?? SPEC_ICON_SIZE.md;
        return {
          ...child,
          props: {
            ...child.props,
            ...(iconName != null ? { iconName } : {}),
            style: {
              ...cs,
              width: iconSz,
              height: iconSz,
              flexShrink: cs.flexShrink ?? 0,
            },
          },
        } as Element;
      }
      return child;
    });
  }

  // ── ComboBoxWrapper ────────────────────────────────────────────────
  if (containerTag === "comboboxwrapper") {
    const sizeName = getDelegatedSize(containerEl, elementById);
    effectiveParent = withParentStyle(
      containerEl,
      withSpecPadding(
        {
          ...parentStyle,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: parentStyle.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
          // CSS .combobox-container: border: 1px solid
          borderWidth: parentStyle.borderWidth ?? 1,
          // Spec height로 CSS와 정확히 일치
          height:
            parentStyle.height ??
            SPEC_TRIGGER_HEIGHT[sizeName] ??
            SPEC_TRIGGER_HEIGHT.md,
        },
        sizeName,
      ),
    );

    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "ComboBoxInput") {
        const comboBoxEl = elementById.get(containerEl.parent_id ?? "");
        const comboBoxProps = comboBoxEl?.props as
          | Record<string, unknown>
          | undefined;
        const placeholder =
          comboBoxProps?.placeholder ?? child.props?.placeholder;
        return {
          ...child,
          props: {
            ...child.props,
            placeholder,
            style: {
              ...cs,
              flex: cs.flex ?? 1,
              minWidth: cs.minWidth ?? 0,
              fontSize:
                cs.fontSize ??
                SPEC_INPUT_FONT_SIZE[sizeName] ??
                SPEC_INPUT_FONT_SIZE.md,
              whiteSpace: cs.whiteSpace ?? "nowrap",
              overflow: cs.overflow ?? "hidden",
              textOverflow: cs.textOverflow ?? "ellipsis",
            },
          },
        } as Element;
      }
      if (child.tag === "ComboBoxTrigger") {
        // ComboBox → ComboBoxWrapper → ComboBoxTrigger: 조부모(ComboBox)의 iconName 전파
        const comboBoxEl = elementById.get(containerEl.parent_id ?? "");
        const comboBoxProps = comboBoxEl?.props as
          | Record<string, unknown>
          | undefined;
        const iconName =
          (child.props as Record<string, unknown> | undefined)?.iconName ??
          comboBoxProps?.iconName;
        const iconSz = SPEC_ICON_SIZE[sizeName] ?? SPEC_ICON_SIZE.md;
        return {
          ...child,
          props: {
            ...child.props,
            ...(iconName != null ? { iconName } : {}),
            style: {
              ...cs,
              width: iconSz,
              height: iconSz,
              flexShrink: cs.flexShrink ?? 0,
            },
          },
        } as Element;
      }
      return child;
    });
  }

  // ── TextField / TextArea ──────────────────────────────────────────────
  // Label + Input + FieldError 구조. column 레이아웃 보장.
  if (containerTag === "textfield" || containerTag === "textarea") {
    const hasLabel = !!containerProps?.label;
    filteredChildren = children.filter(
      (c) =>
        (c.tag === "Label" ? hasLabel : false) ||
        c.tag === "Input" ||
        c.tag === "FieldError",
    );

    const tfLabelPos = containerProps?.labelPosition as string | undefined;
    filteredChildren = applySideLabelChildStyles(filteredChildren, tfLabelPos);
    const tfFlexDir = resolveLabelFlexDir(
      tfLabelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(
      containerEl,
      tfLabelPos === "side"
        ? getSideLabelParentStyle(parentStyle)
        : {
            ...parentStyle,
            display: parentStyle.display ?? "flex",
            flexDirection: tfFlexDir,
            gap: parentStyle.gap ?? 4,
          },
    );
  }

  // ── DateField / TimeField ────────────────────────────────────────────
  // Label + DateInput(입력 영역) + FieldError. DateInput에 부모 props 주입.
  if (containerTag === "datefield" || containerTag === "timefield") {
    const hasLabel = !!containerProps?.label;
    const sizeName = (containerProps?.size as string) ?? "md";
    const inputHeight = SPEC_TRIGGER_HEIGHT[sizeName] ?? SPEC_TRIGGER_HEIGHT.md;

    filteredChildren = children.filter(
      (c) =>
        (c.tag === "Label" ? hasLabel : false) ||
        c.tag === "DateInput" ||
        c.tag === "FieldError",
    );

    // DateInput에 부모 props 주입 (Spec shapes에서 세그먼트 텍스트 생성용)
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "DateInput") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        return {
          ...child,
          props: {
            ...child.props,
            size: sizeName,
            _parentTag:
              containerTag === "datefield" ? "DateField" : "TimeField",
            _granularity: containerProps?.granularity,
            _hourCycle: containerProps?.hourCycle,
            _locale: containerProps?.locale,
            style: {
              ...cs,
              width: cs.width ?? "100%",
              height: inputHeight,
            },
          },
        } as Element;
      }
      return child;
    });

    const dfLabelPos = containerProps?.labelPosition as string | undefined;
    const dfFlexDir = resolveLabelFlexDir(
      dfLabelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: dfFlexDir,
      gap: parentStyle.gap ?? 4,
    });
  }

  // ── SearchFieldWrapper ────────────────────────────────────────────────
  // ComboBoxWrapper와 동일 패턴: border + height + padding + 자식 스타일 주입
  if (containerTag === "searchfieldwrapper") {
    const sizeName = getDelegatedSize(containerEl, elementById);
    effectiveParent = withParentStyle(
      containerEl,
      withSpecPadding(
        {
          ...parentStyle,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: parentStyle.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
          borderWidth: parentStyle.borderWidth ?? 1,
          height:
            parentStyle.height ??
            SPEC_TRIGGER_HEIGHT[sizeName] ??
            SPEC_TRIGGER_HEIGHT.md,
        },
        sizeName,
      ),
    );

    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "SearchInput") {
        const searchEl = elementById.get(containerEl.parent_id ?? "");
        const searchProps = searchEl?.props as
          | Record<string, unknown>
          | undefined;
        const placeholder =
          searchProps?.placeholder ?? child.props?.placeholder;
        return {
          ...child,
          props: {
            ...child.props,
            placeholder,
            style: {
              ...cs,
              flex: cs.flex ?? 1,
              minWidth: cs.minWidth ?? 0,
              fontSize:
                cs.fontSize ??
                SPEC_INPUT_FONT_SIZE[sizeName] ??
                SPEC_INPUT_FONT_SIZE.md,
              whiteSpace: cs.whiteSpace ?? "nowrap",
              overflow: cs.overflow ?? "hidden",
              textOverflow: cs.textOverflow ?? "ellipsis",
            },
          },
        } as Element;
      }
      if (child.tag === "SearchIcon" || child.tag === "SearchClearButton") {
        const iconSz = SPEC_ICON_SIZE[sizeName] ?? SPEC_ICON_SIZE.md;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              width: iconSz,
              height: iconSz,
              flexShrink: cs.flexShrink ?? 0,
            },
          },
        } as Element;
      }
      return child;
    });
  }

  // ── ProgressBar / Meter ───────────────────────────────────────────────
  // 완전 compositional: Label + ProgressBarValue + ProgressBarTrack이 child Element.
  // flex row wrap: Label(flex:1) + Output(auto) → 1행, Track(width:100%) → 2행(강제 줄바꿈)
  if (PROGRESSBAR_TAGS.has(containerTag)) {
    const hasLabel = !!containerProps?.label;
    const showValueLabel = containerProps?.showValueLabel !== false;
    const sizeName = (containerProps?.size as string) ?? "md";

    // layout 엔진이 Skia 렌더링과 동일한 텍스트로 fit-content width를 측정해야 함
    const autoFormattedValue = formatProgressValue(
      Number(containerProps?.value ?? 0),
      Number(containerProps?.minValue ?? 0),
      Number(containerProps?.maxValue ?? 100),
      containerProps?.formatOptions &&
        typeof containerProps.formatOptions === "object"
        ? (containerProps.formatOptions as Record<string, unknown>)
        : null,
    );
    const formattedValue =
      (containerProps?.valueLabel as string | undefined) ?? autoFormattedValue;

    // Label/Output 필터: hasLabel이 false면 Label 제외, showValueLabel false면 Output 제외
    filteredChildren = children.filter((c) => {
      if (c.tag === "Label") return hasLabel;
      if (c.tag === "ProgressBarValue" || c.tag === "MeterValue")
        return showValueLabel;
      return true;
    });

    // Label: width:0 + flexGrow:1 = CSS grid 1fr 에뮬레이션
    // basis=0 → Label+Value가 항상 1행에 배치 (fit-content basis 시 flex wrap 발생)
    // flexShrink:1 명시 → 후처리 flexShrink:0 일괄주입 방지
    // Track: width:100%로 2행 강제
    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "Label") {
        const labelFontSize =
          PROGRESSBAR_FONT_SIZE[sizeName] ?? PROGRESSBAR_FONT_SIZE.md;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              fontSize: labelFontSize,
              width: 0,
              flexGrow: cs.flexGrow ?? 1,
              flexShrink: cs.flexShrink ?? 1,
              minWidth: 0,
              whiteSpace: cs.whiteSpace ?? "nowrap",
            },
          },
        } as Element;
      }
      if (child.tag === "ProgressBarTrack" || child.tag === "MeterTrack") {
        const barHeight =
          PROGRESSBAR_BAR_HEIGHT[sizeName] ?? PROGRESSBAR_BAR_HEIGHT.md;
        return {
          ...child,
          props: {
            ...child.props,
            size: sizeName,
            style: {
              ...cs,
              width: cs.width ?? "100%",
              height: barHeight,
            },
          },
        } as Element;
      }
      if (child.tag === "ProgressBarValue" || child.tag === "MeterValue") {
        const valueFontSize =
          PROGRESSBAR_FONT_SIZE[sizeName] ?? PROGRESSBAR_FONT_SIZE.md;
        const valueLineHeight =
          SIZE_LINE_HEIGHT[sizeName] ?? SIZE_LINE_HEIGHT.md;
        return {
          ...child,
          props: {
            ...child.props,
            children: showValueLabel ? formattedValue : "",
            size: sizeName,
            style: {
              ...cs,
              fontSize: valueFontSize,
              lineHeight: `${valueLineHeight}px`,
              flexShrink: cs.flexShrink ?? 0,
              whiteSpace: cs.whiteSpace ?? "nowrap",
            },
          },
        } as Element;
      }
      return child;
    });

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: parentStyle.flexDirection ?? "row",
      flexWrap: parentStyle.flexWrap ?? "wrap",
      justifyContent: parentStyle.justifyContent ?? "space-between",
      rowGap: parentStyle.rowGap ?? PROGRESSBAR_ROW_GAP,
      columnGap: parentStyle.columnGap ?? PROGRESSBAR_COL_GAP,
    });
  }

  // ── Slider ──────────────────────────────────────────────────────────
  // ProgressBar와 동일 구조: Label(좌상) + SliderOutput(우상) → 1행, SliderTrack(전폭) → 2행
  // display: flex row wrap 패턴 (Label flex:1 + Output auto → Track width:100% 강제 줄바꿈)
  if (SLIDER_TAGS.has(containerTag)) {
    const hasLabel = !!containerProps?.label;
    const showValue = containerProps?.showValue !== false;
    const sizeName = (containerProps?.size as string) ?? "md";
    const sliderColGap = SLIDER_COL_GAP[sizeName] ?? SLIDER_COL_GAP.md;

    // value → 포맷된 텍스트 계산 (ElementSprite 미러링)
    const sliderValue = containerProps?.value;
    const sliderMin = Number(containerProps?.minValue ?? 0);
    let sliderFormattedValue = "";
    if (showValue) {
      if (Array.isArray(sliderValue)) {
        sliderFormattedValue = (sliderValue as number[])
          .map((v) => String(Math.round(Number(v))))
          .join(" – ");
      } else {
        sliderFormattedValue = String(
          Math.round(Number(sliderValue ?? sliderMin)),
        );
      }
    }

    // Label/Output 필터
    filteredChildren = children.filter((c) => {
      if (c.tag === "Label") return hasLabel;
      if (c.tag === "SliderOutput") return showValue;
      return true;
    });

    // Label: width:0 + flexGrow:1 = CSS grid 1fr 에뮬레이션
    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "Label") {
        const labelFontSize = SLIDER_FONT_SIZE[sizeName] ?? SLIDER_FONT_SIZE.md;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              fontSize: labelFontSize,
              width: 0,
              flexGrow: cs.flexGrow ?? 1,
              flexShrink: cs.flexShrink ?? 1,
              minWidth: 0,
              whiteSpace: cs.whiteSpace ?? "nowrap",
            },
          },
        } as Element;
      }
      if (child.tag === "SliderTrack") {
        const trackHeight =
          SLIDER_TRACK_LAYOUT_HEIGHT[sizeName] ?? SLIDER_TRACK_LAYOUT_HEIGHT.md;
        return {
          ...child,
          props: {
            ...child.props,
            size: sizeName,
            value: containerProps?.value,
            minValue: containerProps?.minValue,
            maxValue: containerProps?.maxValue,
            variant: containerProps?.variant,
            style: {
              ...cs,
              width: cs.width ?? "100%",
              height: trackHeight,
            },
          },
        } as Element;
      }
      if (child.tag === "SliderOutput") {
        const valueFontSize = SLIDER_FONT_SIZE[sizeName] ?? SLIDER_FONT_SIZE.md;
        const valueLineHeight =
          SIZE_LINE_HEIGHT[sizeName] ?? SIZE_LINE_HEIGHT.md;
        return {
          ...child,
          props: {
            ...child.props,
            children: sliderFormattedValue,
            size: sizeName,
            style: {
              ...cs,
              fontSize: valueFontSize,
              lineHeight: `${valueLineHeight}px`,
              flexShrink: cs.flexShrink ?? 0,
              whiteSpace: cs.whiteSpace ?? "nowrap",
            },
          },
        } as Element;
      }
      return child;
    });

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: parentStyle.flexDirection ?? "row",
      flexWrap: parentStyle.flexWrap ?? "wrap",
      justifyContent: parentStyle.justifyContent ?? "space-between",
      rowGap: parentStyle.rowGap ?? SLIDER_ROW_GAP,
      columnGap: parentStyle.columnGap ?? sliderColGap,
    });
  }

  // ── SliderTrack (Thumb 배치) ─────────────────────────────────────────
  // 시각적 thumb은 SliderTrack spec shapes가 렌더링.
  // SliderThumb element는 selection bounds + 이벤트 히트 영역용으로 올바른 크기/위치 주입.
  if (containerTag === "slidertrack") {
    const sliderId = containerEl.parent_id;
    const sliderEl = sliderId ? elementById.get(sliderId) : null;
    const sliderProps = sliderEl?.props as Record<string, unknown> | undefined;
    const rawValue = sliderProps?.value ?? 50;
    const values = Array.isArray(rawValue)
      ? (rawValue as number[])
      : [Number(rawValue) || 50];
    const min = Number(sliderProps?.minValue ?? 0);
    const max = Number(sliderProps?.maxValue ?? 100);
    const range = max - min || 1;
    const sizeName = (sliderProps?.size as string) ?? "md";
    const dims = { sm: 14, md: 18, lg: 22 };
    const thumbSize = dims[sizeName as keyof typeof dims] ?? 18;

    // SliderTrack에 position:relative 설정
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      position: "relative",
    });

    let thumbIdx = 0;
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag !== "SliderThumb") return child;
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      const val = values[thumbIdx] ?? values[0] ?? 50;
      thumbIdx++;
      const percent = Math.max(0, Math.min(100, ((val - min) / range) * 100));
      // absolute + left(percent) + marginLeft(-half) — selection bounds 용
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            position: "absolute",
            left: `${percent}%`,
            top: 0,
            width: thumbSize,
            height: thumbSize,
            marginLeft: -(thumbSize / 2),
          },
        },
      } as Element;
    });
  }

  // ── Card ────────────────────────────────────────────────────────────
  // ── DatePicker / DateRangePicker — flex column + gap + Label 필터링 + labelPosition ─────
  if (containerTag === "datepicker" || containerTag === "daterangepicker") {
    const hasLabel = !!containerProps?.label;
    filteredChildren = children.filter((c) => {
      if (c.tag === "Label") return hasLabel;
      return !POPOVER_CHILDREN_TAGS.has(c.tag);
    });

    const dpLabelPos = containerProps?.labelPosition as string | undefined;
    const dpFlexDir = resolveLabelFlexDir(
      dpLabelPos,
      parentStyle.flexDirection as string | undefined,
    );
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: dpFlexDir,
      gap: parentStyle.gap ?? 4,
    });

    filteredChildren = applySideLabelChildStyles(filteredChildren, dpLabelPos);
  }

  // ── Calendar — padding/gap/display 주입 (Generated CSS 동기) ─────
  if (containerTag === "calendar" || containerTag === "rangecalendar") {
    const calSize = (containerEl.props?.size as string) || "md";
    const calPadGap: Record<string, { pad: number; gap: number }> = {
      sm: { pad: 4, gap: 4 },
      md: { pad: 8, gap: 6 },
      lg: { pad: 12, gap: 8 },
    };
    const { pad, gap: calGap } = calPadGap[calSize] ?? calPadGap.md;
    const ps = parentStyle;
    effectiveParent = {
      ...effectiveParent,
      props: {
        ...effectiveParent.props,
        style: {
          ...(effectiveParent.props?.style as Record<string, unknown>),
          width: ps.width ?? "fit-content",
          display: ps.display ?? "flex",
          flexDirection: ps.flexDirection ?? "column",
          paddingTop: ps.paddingTop ?? pad,
          paddingRight: ps.paddingRight ?? pad,
          paddingBottom: ps.paddingBottom ?? pad,
          paddingLeft: ps.paddingLeft ?? pad,
          gap: ps.gap ?? calGap,
        },
      },
    } as Element;

    // CalendarHeader/CalendarGrid 자식에 width: 100% + whiteSpace: nowrap 주입
    // whiteSpace: nowrap → ElementSprite 다중 줄 보정 로직 우회 (폰트 메트릭 기반 Y 이탈 방지)
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "CalendarHeader" || child.tag === "CalendarGrid") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              width: cs.width || "100%",
              whiteSpace: "nowrap",
            },
          },
        } as Element;
      }
      return child;
    });
  }

  // ── Card ──────────────────────────────────────────────────────────
  if (containerTag === "card") {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "CardHeader" || child.tag === "CardContent") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (!cs.width) {
          return {
            ...child,
            props: { ...child.props, style: { ...cs, width: "100%" } },
          } as Element;
        }
      }
      return child;
    });
  }

  // ── CardHeader ──────────────────────────────────────────────────────
  if (containerTag === "cardheader") {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "Heading") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (cs.flex === undefined && cs.flexGrow === undefined && !cs.width) {
          return {
            ...child,
            props: { ...child.props, style: { ...cs, flex: 1 } },
          } as Element;
        }
      }
      return child;
    });
  }

  // ── CardContent ─────────────────────────────────────────────────────
  if (containerTag === "cardcontent") {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "Description") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (!cs.width && cs.flex === undefined) {
          return {
            ...child,
            props: { ...child.props, style: { ...cs, width: "100%" } },
          } as Element;
        }
      }
      return child;
    });
  }

  // ── Checkbox / Radio / Switch — indicator 공간 확보 ────────────────
  // Indicator는 spec shapes로 렌더링 (Taffy 트리 밖).
  // Label 자식에 marginLeft = indicatorWidth + gap을 주입하여 indicator와 겹치지 않도록 한다.
  // gap은 사용자가 스타일 패널에서 변경 가능 → parentStyle.gap 우선 사용.
  if (
    containerTag === "checkbox" ||
    containerTag === "radio" ||
    containerTag === "switch"
  ) {
    const sizeName = (containerProps?.size as string) ?? "md";
    const s = sizeName as "sm" | "md" | "lg";
    const phantomConfig = PHANTOM_INDICATOR_CONFIGS[containerTag];
    const indicatorWidth =
      phantomConfig?.widths[s] ?? INDICATOR_SIZES[sizeName]?.box ?? 20;
    const defaultGap =
      phantomConfig?.gaps[s] ?? INDICATOR_SIZES[sizeName]?.gap ?? 8;
    const parsedGap = parseFloat(String(parentStyle.gap ?? ""));
    const userGap = !isNaN(parsedGap) ? parsedGap : defaultGap;
    const indicatorOffset = indicatorWidth + userGap;

    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            marginLeft:
              (cs.marginLeft as number | undefined) ?? indicatorOffset,
            whiteSpace: cs.whiteSpace ?? "nowrap",
          },
        },
      } as Element;
    });
  }

  // ── Synthetic Label (Radio/Checkbox/Switch/Toggle) ──────────────────
  if (SYNTHETIC_LABEL_TAGS.has(containerTag)) {
    if (filteredChildren.length === 0) {
      const labelText = containerProps?.children ?? containerProps?.label;
      if (typeof labelText === "string" && labelText.trim().length > 0) {
        // Checkbox/Radio/Switch: indicator 공간만큼 marginLeft 주입 (gap은 사용자 값 우선)
        const isIndicatorTag =
          containerTag === "checkbox" ||
          containerTag === "radio" ||
          containerTag === "switch";
        let synLabelMargin = 0;
        if (isIndicatorTag) {
          const sn = ((containerProps?.size as string) ?? "md") as
            | "sm"
            | "md"
            | "lg";
          const pc = PHANTOM_INDICATOR_CONFIGS[containerTag];
          const indWidth = pc?.widths[sn] ?? INDICATOR_SIZES[sn]?.box ?? 20;
          const indGap = pc?.gaps[sn] ?? INDICATOR_SIZES[sn]?.gap ?? 8;
          const pg = parseFloat(String(parentStyle.gap ?? ""));
          const gap = !isNaN(pg) ? pg : indGap;
          synLabelMargin = indWidth + gap;
        }

        const syntheticLabel: Element = {
          id: `${containerEl.id}__synlabel`,
          tag: "Label",
          props: {
            children: labelText,
            style: {
              fontSize: 14,
              backgroundColor: "transparent",
              whiteSpace: "nowrap",
              ...(synLabelMargin > 0 ? { marginLeft: synLabelMargin } : {}),
            },
          },
          parent_id: containerEl.id,
          page_id: containerEl.page_id,
          order_num: 1,
        } as Element;
        filteredChildren = [syntheticLabel];
      }
    }
  }

  // ── InlineAlert: spec size → padding/gap/자식 font 주입 (Taffy는 CSS 못 읽음) ──
  if (containerTag === "inlinealert") {
    const sizeName = (containerProps?.size as string) ?? "md";
    const specSize = (InlineAlertSpec.sizes[sizeName] ??
      InlineAlertSpec.sizes[InlineAlertSpec.defaultSize]) as unknown as Record<
      string,
      unknown
    >;
    const s = {
      px: (specSize.paddingX as number) ?? 16,
      py: (specSize.paddingY as number) ?? 16,
      gap: (specSize.gap as number) ?? 12,
      headingFontSize: (specSize.headingFontSize as number) ?? 16,
      headingFontWeight: (specSize.headingFontWeight as number) ?? 700,
      descFontSize: (specSize.descFontSize as number) ?? 14,
      descFontWeight: (specSize.descFontWeight as number) ?? 400,
    };
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: parentStyle.flexDirection ?? "column",
      paddingTop: parentStyle.paddingTop ?? s.py,
      paddingBottom: parentStyle.paddingBottom ?? s.py,
      paddingLeft: parentStyle.paddingLeft ?? s.px,
      paddingRight: parentStyle.paddingRight ?? s.px,
      gap: parentStyle.gap ?? s.gap,
      width: parentStyle.width ?? "100%",
    });

    // 자식 Heading/Description에 spec 기반 font 스타일 주입
    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "Heading") {
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              fontSize: cs.fontSize ?? s.headingFontSize,
              fontWeight: cs.fontWeight ?? s.headingFontWeight,
            },
          },
        } as Element;
      }
      if (child.tag === "Description") {
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              width: cs.width ?? "100%",
              fontSize: cs.fontSize ?? s.descFontSize,
              fontWeight: cs.fontWeight ?? s.descFontWeight,
            },
          },
        } as Element;
      }
      return child;
    });
  }

  // ── Separator: size → margin 주입 (Taffy는 CSS data-size 못 읽음) ──
  if (filteredChildren.some((c) => c.tag === "Separator" || c.tag === "Hr")) {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag !== "Separator" && child.tag !== "Hr") return child;
      const childProps = child.props as Record<string, unknown> | undefined;
      const childStyle = (childProps?.style || {}) as Record<string, unknown>;
      // 이미 인라인 margin이 있으면 스킵
      if (childStyle.marginTop != null || childStyle.marginBottom != null)
        return child;
      const sep_size = (childProps?.size as string) ?? "md";
      const sep_margin = sep_size === "sm" ? 4 : sep_size === "lg" ? 16 : 8;
      return {
        ...child,
        props: {
          ...childProps,
          style: {
            ...childStyle,
            marginTop: sep_margin,
            marginBottom: sep_margin,
          },
        },
      } as Element;
    });
  }

  // ── Label necessity indicator 공통 주입 ────────────────────────────
  // 부모 field의 necessityIndicator/isRequired → Label children 텍스트에 직접 반영
  // (레이아웃 측정 + Spec shapes 양쪽에서 동일한 텍스트를 사용하기 위함)
  const parentNecessity = containerProps?.necessityIndicator as
    | string
    | undefined;
  const parentRequired = containerProps?.isRequired as boolean | undefined;

  if (parentNecessity && NECESSITY_INDICATOR_TAGS.has(containerTag)) {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "Label") {
        const originalText =
          (child.props?.children as string) ||
          (child.props?.label as string) ||
          "";
        const indicatorText = getNecessityIndicatorSuffix(
          parentNecessity,
          parentRequired ?? false,
        );
        if (indicatorText) {
          return {
            ...child,
            props: {
              ...child.props,
              children: originalText + indicatorText,
            },
          } as Element;
        }
      }
      return child;
    });
  }

  // ── Label flexShrink 공통 주입 ────────────────────────────────────
  // flex row 전환 시 Label이 축소되지 않도록 flexShrink: 0 보장
  if (filteredChildren.some((c) => c.tag === "Label")) {
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag !== "Label") return child;
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (cs.flexShrink == null) {
        return {
          ...child,
          props: {
            ...child.props,
            style: { ...cs, flexShrink: 0 },
          },
        } as Element;
      }
      return child;
    });
  }

  return {
    effectiveParent,
    filteredChildren,
  };
}
