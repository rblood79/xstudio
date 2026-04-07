/**
 * Canvas App - Canvas Runtime 메인 컴포넌트
 *
 * srcdoc iframe 내에서 독립적으로 실행되는 Canvas 앱입니다.
 * Builder와 완전히 분리된 React 앱으로 동작합니다.
 */

import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from "react";
import { useRuntimeStore, getRuntimeStore } from "./store";
import { CanvasRouter, setGlobalNavigate } from "./router";
import { MessageHandler, messageSender } from "./messaging";
import { useNavigate } from "react-router-dom";
import { rendererMap } from "@composition/shared/renderers";
import type { RenderContext as SharedRenderContext } from "@composition/shared/types";
import type { PreviewElement, RenderContext } from "./types";
import type { RuntimeElement } from "./store/types";
import { EventEngine } from "../utils/events/eventEngine";
import { camelToKebab } from "./utils/computedStyleExtractor";

// body style 적용 상수 — useEffect 내 재생성 방지
const CSS_UNITLESS = new Set([
  "opacity",
  "fontWeight",
  "zIndex",
  "lineHeight",
  "flexGrow",
  "flexShrink",
  "order",
]);
// body color/backgroundColor는 항상 CSS 변수로 매핑 (dark mode 전환 지원)
const BODY_THEME_MAP: Record<string, string> = {
  color: "var(--fg)",
  backgroundColor: "var(--bg)",
};

// ============================================
// Module-level EventEngine Singleton
// ============================================

// ⭐ EventEngine을 모듈 레벨 싱글톤으로 관리 (App과 CanvasContent 모두 접근 가능)
let eventEngineInstance: EventEngine | null = null;

function getEventEngine(): EventEngine {
  if (!eventEngineInstance) {
    eventEngineInstance = new EventEngine();
  }
  return eventEngineInstance;
}

// ============================================
// Canvas Content Component
// ============================================

function CanvasContent() {
  const elements = useRuntimeStore((s) => s.elements) as PreviewElement[];
  const updateElementProps = useRuntimeStore((s) => s.updateElementProps);
  const setElements = useRuntimeStore((s) => s.setElements);
  const currentLayoutId = useRuntimeStore((s) => s.currentLayoutId);
  const currentPageId = useRuntimeStore((s) => s.currentPageId);
  const navigate = useNavigate();

  // ⭐ 모듈 레벨 싱글톤 EventEngine 사용
  const eventEngine = getEventEngine();

  // ⭐ 순환 의존성 해결을 위한 render 함수 refs
  const renderElementInternalRef = useRef<
    (el: PreviewElement, key?: string) => React.ReactNode
  >(() => null);
  const renderLayoutElementRef = useRef<
    (
      el: PreviewElement,
      layoutElements: PreviewElement[],
      pageElements: PreviewElement[],
    ) => React.ReactNode
  >(() => null);
  const renderPageElementWithChildrenRef = useRef<
    (el: PreviewElement, allPageElements: PreviewElement[]) => React.ReactNode
  >(() => null);

  // navigate 함수를 전역으로 설정 (EventEngine에서 사용)
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  // ⭐ 이전에 적용된 body 스타일 키들을 추적
  const appliedStyleKeysRef = useRef<Set<string>>(new Set());
  const appliedClassNameRef = useRef<string>("");

  // ⭐ 실제 <body> 태그에 body element의 속성 적용 (가짜 body div 제거)
  useEffect(() => {
    // ⭐ 이전 스타일 제거 (Layout 변경 시 이전 Layout의 스타일 정리)
    appliedStyleKeysRef.current.forEach((key) => {
      document.body.style.removeProperty(key);
    });
    appliedStyleKeysRef.current.clear();

    // ⭐ 이전 className 제거
    if (appliedClassNameRef.current) {
      const currentClasses = document.body.className.split(" ");
      const classesToRemove = appliedClassNameRef.current.split(" ");
      document.body.className = currentClasses
        .filter((cls) => !classesToRemove.includes(cls))
        .join(" ")
        .trim();
      appliedClassNameRef.current = "";
    }

    // body element 찾기 (Layout body 또는 Page body)
    let bodyElement: PreviewElement | undefined;

    if (currentLayoutId && currentPageId) {
      // Layout 모드: Layout의 body 사용
      bodyElement = elements.find(
        (el) =>
          el.tag === "body" &&
          el.layout_id === currentLayoutId &&
          !el.parent_id,
      );
    } else if (currentLayoutId && !currentPageId) {
      // Layout 편집 모드: Layout의 body 사용
      bodyElement = elements.find(
        (el) =>
          el.tag === "body" &&
          el.layout_id === currentLayoutId &&
          !el.parent_id,
      );
    } else {
      // Page 모드: Page의 body 사용 (Layout 없음)
      bodyElement = elements.find(
        (el) => el.tag === "body" && !el.parent_id && !el.layout_id,
      );
    }

    if (bodyElement) {
      // 실제 <body> 태그에 data-element-id 설정
      document.body.setAttribute("data-element-id", bodyElement.id);
      document.body.setAttribute("data-original-tag", "body");

      // body element의 style 적용 및 추적
      if (bodyElement.props?.style) {
        const style = bodyElement.props.style as Record<
          string,
          string | number
        >;
        Object.entries(style).forEach(([key, value]) => {
          const cssKey = camelToKebab(key);
          // body color/bg는 CSS 변수로 대체 — DB 하드코딩 값 대신 테마 반영
          const cssValue =
            key in BODY_THEME_MAP
              ? BODY_THEME_MAP[key]
              : typeof value === "number" && !CSS_UNITLESS.has(key)
                ? `${value}px`
                : String(value);
          document.body.style.setProperty(cssKey, cssValue);
          appliedStyleKeysRef.current.add(cssKey);
        });
      }

      // body element의 className 적용 및 추적
      if (bodyElement.props?.className) {
        const newClassName = bodyElement.props.className as string;
        document.body.className =
          `${document.body.className} ${newClassName}`.trim();
        appliedClassNameRef.current = newClassName;
      }
    } else {
      // body element가 없으면 data-element-id 제거
      document.body.removeAttribute("data-element-id");
      document.body.removeAttribute("data-original-tag");
    }

    // ⭐ Cleanup용 로컬 변수 (ref가 변경되기 전 값 캡처)
    const styleKeysToClean = new Set(appliedStyleKeysRef.current);
    const classNameToClean = appliedClassNameRef.current;

    // Cleanup: 컴포넌트 언마운트 시 정리
    return () => {
      document.body.removeAttribute("data-element-id");
      document.body.removeAttribute("data-original-tag");
      // ⭐ 스타일과 className도 정리
      styleKeysToClean.forEach((key) => {
        document.body.style.removeProperty(key);
      });
      // ref를 직접 clear 대신 로컬 변수만 사용하여 ESLint warning 방지
      // (appliedStyleKeysRef.current.clear()는 effect 시작 시 이미 수행됨)
      if (classNameToClean) {
        const currentClasses = document.body.className.split(" ");
        const classesToRemove = classNameToClean.split(" ");
        document.body.className = currentClasses
          .filter((cls) => !classesToRemove.includes(cls))
          .join(" ")
          .trim();
        // ref 초기화는 effect 시작 시 수행됨
      }
    };
  }, [elements, currentLayoutId, currentPageId]);

  // Computed style 수집 (Inspector에서 필요한 속성들)
  // 성능 최적화: getComputedStyle 1회 호출 후 필요한 속성만 추출
  const collectComputedStyle = useCallback(
    (domElement: Element): Record<string, string> => {
      const computed = window.getComputedStyle(domElement);
      return {
        // Layout (필수)
        display: computed.display,
        position: computed.position,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: computed.gap,
        // Spacing (Inspector LayoutSection에서 사용)
        padding: computed.padding,
        margin: computed.margin,
        // Appearance (Inspector AppearanceSection에서 사용)
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        // Typography (Inspector TypographySection에서 사용)
        color: computed.color,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
      };
    },
    [],
  );

  // 클릭 핸들러 (capture 단계에서 실행)
  // ⭐ 실제 <body> 태그 클릭도 처리
  const handleElementSelection = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // ⭐ body 클릭 처리: target이 body이거나 closest로 body를 찾음
      let elementWithId = target.closest("[data-element-id]");

      // target이 body인 경우 (body의 빈 영역 클릭)
      if (
        !elementWithId &&
        target === document.body &&
        document.body.hasAttribute("data-element-id")
      ) {
        elementWithId = document.body;
      }

      if (!elementWithId) return;

      const elementId = elementWithId.getAttribute("data-element-id");
      if (!elementId) return;

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      const isMultiSelect = e.metaKey || e.ctrlKey;
      const rect = elementWithId.getBoundingClientRect();

      // 선택 알림 전송
      messageSender.sendElementSelected(
        elementId,
        {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        {
          isMultiSelect,
          props: element.props,
          style: element.props?.style as Record<string, unknown>,
        },
      );

      // Computed style 전송 (RAF로 지연)
      requestAnimationFrame(() => {
        const computedStyle = collectComputedStyle(elementWithId!);
        messageSender.sendComputedStyle(elementId, computedStyle);
      });
    },
    [elements, collectComputedStyle],
  );

  // 요소 선택을 위한 capture 단계 클릭 리스너
  // ⭐ document에 등록하여 body 클릭도 캡처
  // React Aria 컴포넌트가 이벤트를 가로채기 전에 선택을 처리
  useEffect(() => {
    // document에 등록하여 body 클릭도 캡처 가능
    document.addEventListener("click", handleElementSelection, true); // capture: true
    return () => {
      document.removeEventListener("click", handleElementSelection, true);
    };
  }, [handleElementSelection]);

  // 링크 클릭 가로채기
  const handleLinkClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // target="_blank"는 기본 동작 허용
      if (anchor.getAttribute("target") === "_blank") return;

      // 앵커 링크는 기본 동작 허용
      if (href.startsWith("#")) return;

      // 외부 URL 패턴
      const externalUrlPattern =
        /^(https?:\/\/|\/\/|mailto:|tel:|javascript:)/i;
      const isExternal = externalUrlPattern.test(href);

      e.preventDefault();
      e.stopPropagation();

      if (isExternal) {
        // 외부 링크: 새 탭에서 열기
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        // 내부 링크: MemoryRouter로 직접 네비게이션
        navigate(href);
      }
    },
    [navigate],
  );

  // 링크 클릭 리스너 등록
  useEffect(() => {
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [handleLinkClick]);

  // RenderContext 생성
  const renderContext: RenderContext = useMemo(
    () => ({
      elements,
      updateElementProps,
      setElements: (newElements: PreviewElement[]) => {
        setElements(newElements as RuntimeElement[]);
      },
      eventEngine,
      renderElement: (el: PreviewElement, key?: string) =>
        renderElementInternalRef.current(el, key),
    }),
    [elements, updateElementProps, setElements, eventEngine],
  );

  // Element 렌더링 함수 (내부)
  const renderElementInternal = useCallback(
    (el: PreviewElement, key?: string): React.ReactNode => {
      // ⭐ body 태그는 실제 <body>에서 처리되므로 여기에 도달하면 일반 요소임
      // (body는 renderElementsTree에서 자식만 렌더링하도록 처리됨)

      // rendererMap에서 해당 태그의 렌더러 찾기
      const renderer = rendererMap[el.tag];
      if (renderer) {
        return renderer(el, renderContext as unknown as SharedRenderContext);
      }

      // 렌더러가 없으면 기본 HTML 렌더링

      // 자식 요소 찾기
      const children = elements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // Props 정리
      const cleanProps: Record<string, unknown> = {
        key: key || el.id,
        "data-element-id": el.id,
        style: el.props?.style,
        className: el.props?.className,
      };

      // 자식 콘텐츠
      const content =
        children.length > 0
          ? children.map((child) =>
              renderElementInternalRef.current(child, child.id),
            )
          : el.props?.children;

      // 커스텀 태그 → HTML 요소 매핑 (복합 컴포넌트 자식 태그용)
      const resolveHtmlTag = (
        tag: string,
        props?: Record<string, unknown>,
      ): string => {
        switch (tag) {
          case "Heading": {
            const level = Number(props?.level) || 3;
            return `h${Math.min(Math.max(level, 1), 6)}`;
          }
          case "Description":
            return "p";
          // Overlay 복합 컴포넌트
          case "DialogFooter":
            return "footer";
          case "Toast":
            return "div";
          case "Popover":
            return "div";
          // Navigation 복합 컴포넌트
          case "Disclosure":
            return "div";
          case "DisclosureGroup":
            return "div";
          case "DisclosureHeader": {
            const hl = Number(props?.headingLevel) || 3;
            return `h${Math.min(Math.max(hl, 1), 6)}`;
          }
          case "DisclosureContent":
            return "div";
          // Form 복합 컴포넌트
          case "FormField":
            return "div";
          case "Group":
            return "div";
          case "FieldError":
            return "span";
          // Collection 자식 태그
          case "Tab":
            return "button";
          case "TabList":
            return "div";
          case "TabPanels":
            return "div";
          case "TagList":
            return "div";
          case "SelectItem":
            return "div";
          case "ComboBoxItem":
            return "div";
          // Calendar 자식 태그
          case "CalendarHeader":
            return "div";
          case "CalendarGrid":
            return "div";
          // Date/Time 자식 태그
          case "DateSegment":
          case "TimeSegment":
            return "span";
          // Icon 컴포넌트
          case "Icon":
            return "span";
          // Color 복합 컴포넌트 (rendererMap 미등록)
          case "ColorPicker":
            return "div";
          case "ColorField":
            return "div";
          // Color 자식 태그
          case "ColorSwatch":
            return "div";
          case "ColorArea":
            return "div";
          case "ColorSlider":
            return "div";
          default:
            return tag.toLowerCase();
        }
      };

      // HTML 요소로 렌더링
      return React.createElement(
        resolveHtmlTag(el.tag, el.props),
        cleanProps,
        content,
      );
    },
    [elements, renderContext],
  );

  // ⭐ ref 업데이트 (순환 의존성 해결)
  // eslint-disable-next-line react-hooks/refs -- 순환 의존성 해결 패턴
  renderElementInternalRef.current = renderElementInternal;

  // 외부에서 사용할 renderElement (context 포함)
  const renderElement = useCallback(
    (el: PreviewElement, key?: string): React.ReactNode => {
      return renderElementInternal(el, key);
    },
    [renderElementInternal],
  );

  // ⭐ Layout 기반 렌더링: Slot을 Page elements로 교체
  const renderLayoutElement = useCallback(
    (
      el: PreviewElement,
      layoutElements: PreviewElement[],
      pageElements: PreviewElement[],
    ): React.ReactNode => {
      // Slot인 경우: Page elements로 교체
      if (el.tag === "Slot") {
        const slotName = (el.props as { name?: string })?.name || "content";

        // ⭐ Page의 body 찾기 (body는 렌더링하지 않고 자식만 사용)
        const pageBody = pageElements.find(
          (pe) => pe.tag === "body" && !pe.parent_id,
        );

        // ⭐ Slot에 들어갈 실제 콘텐츠: slot_name이 일치하는 요소들만
        // body는 렌더링하지 않음 - body 스타일은 Layout의 body가 document.body에 적용됨
        let slotContent: PreviewElement[];

        if (pageBody) {
          // ⭐ FIX: Page body의 자식들 중 slot_name이 일치하는 것만 배치
          // slot_name이 없는 요소는 'content' 슬롯에 배치
          slotContent = pageElements
            .filter((pe) => {
              if (pe.parent_id !== pageBody.id) return false;
              const peSlotName =
                (pe.props as { slot_name?: string })?.slot_name || "content";
              return peSlotName === slotName;
            })
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        } else {
          // body가 없으면 기존 로직 (slot_name으로 찾기, body 제외)
          slotContent = pageElements
            .filter((pe) => {
              if (pe.tag === "body") return false; // body는 제외
              const peSlotName =
                (pe.props as { slot_name?: string })?.slot_name || "content";
              return peSlotName === slotName && !pe.parent_id;
            })
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        }

        // Slot 자체를 div로 렌더링하고 내부에 Page elements 배치
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            data-slot-name={slotName}
            style={el.props?.style as React.CSSProperties}
            className="preview-slot"
          >
            {slotContent.length > 0
              ? slotContent.map((child) =>
                  renderPageElementWithChildrenRef.current(child, pageElements),
                )
              : null}
          </div>
        );
      }

      // ⭐ body 태그는 실제 <body>에서 처리되므로 자식만 렌더링 (이미 renderElementsTree에서 처리됨)
      // 여기에 도달하면 body가 아닌 일반 요소임

      // 일반 Layout element: 자식 재귀 렌더링
      const children = layoutElements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // rendererMap에서 렌더러가 있으면 사용
      const renderer = rendererMap[el.tag];
      if (renderer) {
        return renderer(el, renderContext as unknown as SharedRenderContext);
      }

      return React.createElement(
        el.tag.toLowerCase(),
        {
          key: el.id,
          "data-element-id": el.id,
          style: el.props?.style as React.CSSProperties,
          className: el.props?.className,
        },
        children.length > 0
          ? children.map((child) =>
              renderLayoutElementRef.current(
                child,
                layoutElements,
                pageElements,
              ),
            )
          : el.props?.children,
      );
    },
    [renderContext],
  );

  // Page element와 자식들 렌더링 (Layout 모드용)
  // ⭐ 주의: body 요소는 이 함수에 전달되지 않음 (renderLayoutElement에서 body의 자식만 전달)
  const renderPageElementWithChildren = useCallback(
    (
      el: PreviewElement,
      allPageElements: PreviewElement[],
    ): React.ReactNode => {
      const children = allPageElements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // rendererMap에서 렌더러가 있으면 사용
      const renderer = rendererMap[el.tag];
      if (renderer) {
        return renderer(el, renderContext as unknown as SharedRenderContext);
      }

      return React.createElement(
        el.tag.toLowerCase(),
        {
          key: el.id,
          "data-element-id": el.id,
          style: el.props?.style as React.CSSProperties,
          className: el.props?.className,
        },
        children.length > 0
          ? children.map((child) =>
              renderPageElementWithChildrenRef.current(child, allPageElements),
            )
          : el.props?.children,
      );
    },
    [renderContext],
  );

  // ⭐ ref 업데이트 (순환 의존성 해결)
  // eslint-disable-next-line react-hooks/refs -- 순환 의존성 해결 패턴
  renderLayoutElementRef.current = renderLayoutElement;
  // eslint-disable-next-line react-hooks/refs -- 순환 의존성 해결 패턴
  renderPageElementWithChildrenRef.current = renderPageElementWithChildren;

  // Elements 트리 렌더링
  // ⭐ 실제 <body> 태그를 사용하므로 body element를 div로 렌더링하지 않고 자식만 렌더링
  const renderElementsTree = useCallback(() => {
    // ⭐ Page 모드에서 Layout이 적용된 경우: Layout 기반 렌더링
    // (currentPageId가 있고 currentLayoutId가 있을 때만 - Layout 모드에서는 currentPageId가 null)
    if (currentLayoutId && currentPageId) {
      const layoutElements = elements.filter(
        (el) => el.layout_id === currentLayoutId,
      );
      const pageElements = elements.filter(
        (el) => el.page_id === currentPageId && !el.layout_id,
      );

      // Layout의 root element (body) 찾기
      const layoutBody = layoutElements.find(
        (el) => el.tag === "body" && !el.parent_id,
      );

      if (layoutBody) {
        // ⭐ body를 div로 렌더링하지 않고 자식들만 직접 렌더링
        // body의 속성은 useEffect에서 실제 <body> 태그에 적용됨
        const bodyChildren = layoutElements
          .filter((el) => el.parent_id === layoutBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <>
            {bodyChildren.map((el) =>
              renderLayoutElement(el, layoutElements, pageElements),
            )}
          </>
        );
      }
    }

    // ⭐ Layout 편집 모드 (currentLayoutId만 있고 currentPageId 없음)
    if (currentLayoutId && !currentPageId) {
      const layoutElements = elements.filter(
        (el) => el.layout_id === currentLayoutId,
      );
      const layoutBody = layoutElements.find(
        (el) => el.tag === "body" && !el.parent_id,
      );

      if (layoutBody) {
        const bodyChildren = layoutElements
          .filter((el) => el.parent_id === layoutBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return <>{bodyChildren.map((el) => renderElement(el, el.id))}</>;
      }
    }

    // ⭐ Layout이 없는 경우 (Page만 있음)
    const bodyElement = elements.find(
      (el) => el.tag === "body" && !el.parent_id,
    );

    if (bodyElement) {
      // ⭐ body를 div로 렌더링하지 않고 자식들만 직접 렌더링
      // body의 속성은 useEffect에서 실제 <body> 태그에 적용됨
      const bodyChildren = elements
        .filter((el) => el.parent_id === bodyElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return <>{bodyChildren.map((el) => renderElement(el, el.id))}</>;
    }

    // body가 없으면 루트 요소들 렌더링
    const rootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    return rootElements.map((el) => renderElement(el, el.id));
  }, [
    elements,
    renderElement,
    currentLayoutId,
    currentPageId,
    renderLayoutElement,
  ]);

  // ⭐ React가 document.body에 직접 마운트되므로 preview-container 불필요
  // body element의 자식들이 직접 <body> 안에 렌더링됨
  /* eslint-disable react-hooks/refs -- renderElementsTree 내부에서 의도적인 ref 접근 */
  return (
    <>
      {elements.length === 0 ? (
        <div className="preview-empty">No elements available</div>
      ) : (
        renderElementsTree()
      )}
    </>
  );
  /* eslint-enable react-hooks/refs */
}

// ============================================
// Preview App Component
// ============================================

export function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  // 스토어에서 필요한 함수들 가져오기
  const store = getRuntimeStore();

  // MessageHandler 초기화
  useEffect(() => {
    const storeState = store.getState();

    messageHandlerRef.current = new MessageHandler(
      {
        setElements: storeState.setElements,
        updateElementProps: storeState.updateElementProps,
        setThemeVars: storeState.setThemeVars,
        setDarkMode: storeState.setDarkMode,
        setCurrentPageId: storeState.setCurrentPageId,
        setCurrentLayoutId: storeState.setCurrentLayoutId,
        setPages: storeState.setPages,
        setLayouts: storeState.setLayouts,
        setDataSources: storeState.setDataSources,
        setDataTables: storeState.setDataTables,
        setApiEndpoints: storeState.setApiEndpoints,
        setVariables: storeState.setVariables,
        setAuthToken: storeState.setAuthToken,
        setReady: storeState.setReady,
      },
      {
        // Variables 업데이트 시 EventEngine에 동기화
        onVariablesUpdated: (variables) => {
          const engine = getEventEngine();
          engine.syncVariables(variables);
        },
      },
    );

    // postMessage 리스너 등록
    const handleMessage = (event: MessageEvent) => {
      messageHandlerRef.current?.handle(event);
    };

    window.addEventListener("message", handleMessage);

    // Preview 준비 완료 알림
    messageSender.sendReady();
    // ⭐ queueMicrotask로 감싸서 cascading render 방지
    queueMicrotask(() => {
      setIsInitialized(true);
    });

    // ⭐ runtimeStore variables 변경 구독 → EventEngine 동기화
    let prevVariablesLength = 0;
    const unsubscribeVariables = store.subscribe((state) => {
      const variables = state.variables;
      if (variables.length > 0 && variables.length !== prevVariablesLength) {
        prevVariablesLength = variables.length;
        const engine = getEventEngine();
        engine.syncVariables(variables);
      }
    });

    return () => {
      window.removeEventListener("message", handleMessage);
      unsubscribeVariables();
    };
  }, [store]);

  // 렌더링 함수 (CanvasRouter에 전달)
  const renderElements = useCallback(() => {
    return <CanvasContent />;
  }, []);

  if (!isInitialized) {
    return <div className="preview-loading">Initializing Preview...</div>;
  }

  return (
    <CanvasRouter renderElements={renderElements}>
      {/* 추가 오버레이나 UI 요소는 여기에 */}
    </CanvasRouter>
  );
}

export default App;
