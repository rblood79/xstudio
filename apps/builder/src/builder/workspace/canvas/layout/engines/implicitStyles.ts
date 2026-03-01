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

import type { Element } from '../../../../../types/core/store.types';
import { parsePadding } from './utils';

// ─── 인터페이스 ──────────────────────────────────────────────────────

export interface ImplicitStyleResult {
  /** 스타일이 주입된 부모 요소 (원본 또는 변환본) */
  effectiveParent: Element;
  /** 필터링 + 스타일 주입된 자식 배열 */
  filteredChildren: Element[];
}

// ─── 내부 상수 ──────────────────────────────────────────────────────

/** ComboBox/Select/SelectTrigger/ComboBoxWrapper 공통 spec padding */
const SPEC_PADDING: Record<string, { x: number; y: number }> = {
  sm: { x: 10, y: 4 },
  md: { x: 14, y: 8 },
  lg: { x: 16, y: 12 },
};

/** Checkbox/Radio indicator 크기 (spec shapes 렌더링, Taffy 트리 밖) */
const INDICATOR_SIZES: Record<string, { box: number; gap: number }> = {
  sm: { box: 16, gap: 6 },
  md: { box: 20, gap: 8 },
  lg: { box: 24, gap: 10 },
};

/** Synthetic Label을 생성하는 태그 */
const SYNTHETIC_LABEL_TAGS = new Set(['radio', 'checkbox', 'switch', 'toggle']);

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
    paddingLeft: userPad ? userPad.left : specPad.x,
    paddingRight: userPad ? userPad.right : specPad.x,
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
  const containerTag = (containerEl.tag ?? '').toLowerCase();
  const parentStyle = (containerEl.props?.style || {}) as Record<string, unknown>;
  const containerProps = containerEl.props as Record<string, unknown> | undefined;

  let effectiveParent = containerEl;
  let filteredChildren = children;

  // ── TagGroup ───────────────────────────────────────────────────────
  if (containerTag === 'taggroup') {
    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    });
  }

  // ── CheckboxGroup / RadioGroup ─────────────────────────────────────
  if (containerTag === 'checkboxgroup' || containerTag === 'radiogroup') {
    const sizeName = (containerProps?.size as string) ?? 'md';
    const gap = sizeName === 'sm' ? 8 : sizeName === 'lg' ? 16 : 12;
    const labelFontSize = sizeName === 'sm' ? 14 : sizeName === 'lg' ? 18 : 16;
    const labelOffset = containerProps?.label ? labelFontSize + 8 : 0;
    const orientation = containerProps?.orientation as string | undefined;

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: 'flex',
      flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      gap,
      paddingTop: labelOffset,
    });
  }

  // ── Breadcrumbs ────────────────────────────────────────────────────
  if (containerTag === 'breadcrumbs') {
    filteredChildren = [];
  }

  // ── Tabs ───────────────────────────────────────────────────────────
  if (containerTag === 'tabs') {
    const sizeName = (containerProps?.size as string) ?? 'md';
    const tabBarHeight = sizeName === 'sm' ? 25 : sizeName === 'lg' ? 35 : 30;
    const tabPanelPadding = 16;

    // Dual Lookup: 직속 Panel 또는 TabPanels 내부 Panel
    let panelChildren = children.filter(c => c.tag === 'Panel');
    if (panelChildren.length === 0) {
      const tabPanelsEl = children.find(c => c.tag === 'TabPanels');
      if (tabPanelsEl) {
        panelChildren = getChildElements(tabPanelsEl.id).filter(c => c.tag === 'Panel');
      }
    }
    const activePanel = panelChildren[0];
    filteredChildren = activePanel ? [activePanel] : [];

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: 'flex',
      flexDirection: 'column',
      paddingTop: tabBarHeight + tabPanelPadding,
      paddingLeft: tabPanelPadding,
      paddingRight: tabPanelPadding,
      paddingBottom: tabPanelPadding,
    });
  }

  // ── ComboBox / Select ──────────────────────────────────────────────
  if (containerTag === 'combobox' || containerTag === 'select') {
    const hasLabel = !!(containerProps?.label);
    filteredChildren = children.filter(c =>
      (c.tag === 'Label' ? hasLabel : false) || c.tag === 'SelectTrigger' || c.tag === 'ComboBoxWrapper'
    );

    // SelectTrigger/ComboBoxWrapper에 padding 주입
    const wrapperChildTag = containerTag === 'select' ? 'SelectTrigger' : 'ComboBoxWrapper';
    filteredChildren = filteredChildren.map(child => {
      if (child.tag === wrapperChildTag) {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        const wrapperProps = child.props as Record<string, unknown> | undefined;
        const sizeName = (wrapperProps?.size as string) ?? 'md';
        return {
          ...child,
          props: {
            ...child.props,
            style: {
              ...cs,
              display: cs.display ?? 'flex',
              flexDirection: cs.flexDirection ?? 'row',
              ...withSpecPadding(cs, sizeName),
            },
          },
        } as Element;
      }
      return child;
    });

    effectiveParent = withParentStyle(containerEl, {
      ...parentStyle,
      display: parentStyle.display ?? 'flex',
      flexDirection: parentStyle.flexDirection ?? 'column',
      gap: parentStyle.gap ?? 8,
    });
  }

  // ── SelectTrigger ──────────────────────────────────────────────────
  if (containerTag === 'selecttrigger') {
    const sizeName = (containerProps?.size as string) ?? 'md';
    effectiveParent = withParentStyle(containerEl, withSpecPadding({
      ...parentStyle,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    }, sizeName));

    filteredChildren = filteredChildren.map(child => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === 'SelectValue') {
        return { ...child, props: { ...child.props, style: { ...cs, flex: cs.flex ?? 1 } } } as Element;
      }
      if (child.tag === 'SelectIcon') {
        return { ...child, props: { ...child.props, style: { ...cs, width: cs.width ?? 18, height: cs.height ?? 18, flexShrink: cs.flexShrink ?? 0 } } } as Element;
      }
      return child;
    });
  }

  // ── ComboBoxWrapper ────────────────────────────────────────────────
  if (containerTag === 'comboboxwrapper') {
    const sizeName = (containerProps?.size as string) ?? 'md';
    effectiveParent = withParentStyle(containerEl, withSpecPadding({
      ...parentStyle,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    }, sizeName));

    filteredChildren = filteredChildren.map(child => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      if (child.tag === 'ComboBoxInput') {
        const comboBoxEl = elementById.get(containerEl.parent_id ?? '');
        const comboBoxProps = comboBoxEl?.props as Record<string, unknown> | undefined;
        const placeholder = comboBoxProps?.placeholder ?? child.props?.placeholder;
        return { ...child, props: { ...child.props, placeholder, style: { ...cs, flex: cs.flex ?? 1 } } } as Element;
      }
      if (child.tag === 'ComboBoxTrigger') {
        return { ...child, props: { ...child.props, style: { ...cs, width: cs.width ?? 18, height: cs.height ?? 18, flexShrink: cs.flexShrink ?? 0 } } } as Element;
      }
      return child;
    });
  }

  // ── Card ────────────────────────────────────────────────────────────
  if (containerTag === 'card') {
    filteredChildren = filteredChildren.map(child => {
      if (child.tag === 'CardHeader' || child.tag === 'CardContent') {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (!cs.width) {
          return { ...child, props: { ...child.props, style: { ...cs, width: '100%' } } } as Element;
        }
      }
      return child;
    });
  }

  // ── CardHeader ──────────────────────────────────────────────────────
  if (containerTag === 'cardheader') {
    filteredChildren = filteredChildren.map(child => {
      if (child.tag === 'Heading') {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (cs.flex === undefined && cs.flexGrow === undefined && !cs.width) {
          return { ...child, props: { ...child.props, style: { ...cs, flex: 1 } } } as Element;
        }
      }
      return child;
    });
  }

  // ── CardContent ─────────────────────────────────────────────────────
  if (containerTag === 'cardcontent') {
    filteredChildren = filteredChildren.map(child => {
      if (child.tag === 'Description') {
        const cs = (child.props?.style || {}) as Record<string, unknown>;
        if (!cs.width && cs.flex === undefined) {
          return { ...child, props: { ...child.props, style: { ...cs, width: '100%' } } } as Element;
        }
      }
      return child;
    });
  }

  // ── Checkbox / Radio — indicator 공간 확보 ─────────────────────────
  // Indicator는 spec shapes로 렌더링 (Taffy 트리 밖).
  // Label 자식에 marginLeft = indicatorBox + gap을 주입하여 indicator와 겹치지 않도록 한다.
  // gap은 사용자가 스타일 패널에서 변경 가능 → parentStyle.gap 우선 사용.
  if (containerTag === 'checkbox' || containerTag === 'radio') {
    const sizeName = (containerProps?.size as string) ?? 'md';
    const indicator = INDICATOR_SIZES[sizeName] ?? INDICATOR_SIZES.md;
    const parsedGap = parseFloat(String(parentStyle.gap ?? ''));
    const userGap = !isNaN(parsedGap) ? parsedGap : indicator.gap;
    const indicatorOffset = indicator.box + userGap;

    filteredChildren = filteredChildren.map(child => {
      const cs = (child.props?.style || {}) as Record<string, unknown>;
      return {
        ...child,
        props: {
          ...child.props,
          style: {
            ...cs,
            marginLeft: (cs.marginLeft as number | undefined) ?? indicatorOffset,
          },
        },
      } as Element;
    });
  }

  // ── Synthetic Label (Radio/Checkbox/Switch/Toggle) ──────────────────
  if (SYNTHETIC_LABEL_TAGS.has(containerTag)) {
    if (filteredChildren.length === 0) {
      const labelText = containerProps?.children ?? containerProps?.label;
      if (typeof labelText === 'string' && labelText.trim().length > 0) {
        // Checkbox/Radio: indicator 공간만큼 marginLeft 주입 (gap은 사용자 값 우선)
        const isIndicatorTag = containerTag === 'checkbox' || containerTag === 'radio';
        let synLabelMargin = 0;
        if (isIndicatorTag) {
          const ind = INDICATOR_SIZES[(containerProps?.size as string) ?? 'md'] ?? INDICATOR_SIZES.md;
          const pg = parseFloat(String(parentStyle.gap ?? ''));
          const gap = !isNaN(pg) ? pg : ind.gap;
          synLabelMargin = ind.box + gap;
        }

        const syntheticLabel: Element = {
          id: `${containerEl.id}__synlabel`,
          tag: 'Label',
          props: {
            children: labelText,
            style: {
              fontSize: 14,
              backgroundColor: 'transparent',
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

  return { effectiveParent, filteredChildren };
}
