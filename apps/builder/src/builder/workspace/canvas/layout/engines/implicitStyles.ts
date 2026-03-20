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
import { parsePadding, PHANTOM_INDICATOR_CONFIGS } from "./utils";
import { InlineAlertSpec } from "@xstudio/specs";

// ─── 인터페이스 ──────────────────────────────────────────────────────

export interface ImplicitStyleResult {
  /** 스타일이 주입된 부모 요소 (원본 또는 변환본) */
  effectiveParent: Element;
  /** 필터링 + 스타일 주입된 자식 배열 */
  filteredChildren: Element[];
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

/** ProgressBar/Meter 사이즈별 gap (ProgressBarSpec.sizes.gap 동기) */
const PROGRESSBAR_GAP: Record<string, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};

/** ProgressBar/Meter 사이즈별 barHeight (PROGRESSBAR_DIMENSIONS 동기) */
const PROGRESSBAR_BAR_HEIGHT: Record<string, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

/** ProgressBar/Meter 사이즈별 fontSize (ProgressBarSpec.sizes.fontSize resolved) */
const PROGRESSBAR_FONT_SIZE: Record<string, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

/** ProgressBar/Meter 태그 집합 */
const PROGRESSBAR_TAGS = new Set([
  "progressbar",
  "progress",
  "loadingbar",
  "meter",
  "gauge",
]);

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

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────

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

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: hasTagList ? "column" : "row",
      flexWrap: hasTagList ? undefined : "wrap",
      gap: 4,
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

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
      flexWrap: orientation === "vertical" ? undefined : "wrap",
      gap: parentStyle.gap ?? 4,
    });
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

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: "flex",
      flexDirection: "column",
      gap: 4,
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
    const tabBarHeight = sizeName === "sm" ? 25 : sizeName === "lg" ? 35 : 30;
    const tabPanelPadding = 16;

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
              gap: cs.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
              ...withSpecPadding(cs, sizeName),
            },
          },
        } as Element;
      }
      return child;
    });

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: parentStyle.flexDirection ?? "column",
      gap: parentStyle.gap ?? 4, // CSS: gap: var(--spacing-xs) = 4px
    });
  }

  // ── NumberField ──────────────────────────────────────────────────────
  // @sync ComboBox: flex-column + gap, Group에 ComboBoxWrapper 동일 스타일
  if (containerTag === "numberfield") {
    const hasLabel = !!containerProps?.label;
    filteredChildren = children.filter(
      (c) =>
        (c.tag === "Label" ? hasLabel : false) ||
        c.tag === "Group" ||
        c.tag === "FieldError",
    );

    // Group에 ComboBoxWrapper 동일 스타일 주입
    const sizeName = getDelegatedSize(containerEl, elementById);
    filteredChildren = filteredChildren.map((child) => {
      if (child.tag === "Group") {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              display: cs.display ?? "flex",
              flexDirection: cs.flexDirection ?? "row",
              alignItems: cs.alignItems ?? "center",
              gap: cs.gap ?? 4,
              // @sync ComboBox.css .combobox-container
              // backgroundColor/borderColor는 factory가 Group style에 직접 설정
              borderWidth: cs.borderWidth ?? 1,
              height:
                cs.height ??
                SPEC_TRIGGER_HEIGHT[sizeName] ??
                SPEC_TRIGGER_HEIGHT.md,
              ...withSpecPadding(cs, sizeName),
            },
          },
        } as Element;
      }
      return child;
    });

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? "flex",
      flexDirection: parentStyle.flexDirection ?? "column",
      gap: parentStyle.gap ?? 4,
    });
  }

  // ── NumberField > Group ────────────────────────────────────────────
  // Group 자식(Input + Button×2) 스타일 주입 — @sync ComboBoxWrapper
  if (
    containerTag === "group" &&
    containerEl.parent_id &&
    elementById.get(containerEl.parent_id)?.tag === "NumberField"
  ) {
    const sizeName = getDelegatedSize(containerEl, elementById);
    const iconSz = SPEC_ICON_SIZE[sizeName] ?? SPEC_ICON_SIZE.md;
    filteredChildren = filteredChildren.map((child) => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === "Input") {
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
        } as Element;
      }
      if (child.tag === "Button") {
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
    const showValue = containerProps?.showValue !== false;
    const sizeName = (containerProps?.size as string) ?? "md";
    const specGap = PROGRESSBAR_GAP[sizeName] ?? PROGRESSBAR_GAP.md;

    // Label/Output 필터: hasLabel이 false면 Label 제외, showValue false면 Output 제외
    filteredChildren = children.filter((c) => {
      if (c.tag === "Label") return hasLabel;
      if (c.tag === "ProgressBarValue" || c.tag === "MeterValue")
        return showValue;
      return true;
    });

    // Label: flex:1로 나머지 공간 차지, Output: width:fit-content로 오른쪽 배치
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
            style: { ...cs, flex: cs.flex ?? 1, fontSize: labelFontSize },
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
        return {
          ...child,
          props: {
            ...child.props,
            size: sizeName,
            style: { ...cs, fontSize: valueFontSize },
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
      gap: parentStyle.gap ?? specGap,
    });
  }

  // ── Card ────────────────────────────────────────────────────────────
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
      InlineAlertSpec.sizes[InlineAlertSpec.defaultSize]) as Record<
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

  return { effectiveParent, filteredChildren };
}
