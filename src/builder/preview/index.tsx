import React, { useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router";
import styles from "./index.module.css";
import { EventEngine } from "../../utils/events/eventEngine";
import { PreviewElement } from "./types";
import { rendererMap } from "./renderers";
import { handleMessage } from "./utils/messageHandlers";
import { cleanPropsForHTML } from "./utils/propsConverter";

function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const eventEngine = EventEngine.getInstance();

  // 🔧 FIX: Preview는 오직 postMessage를 통해서만 데이터 수신 (Zustand store 사용 안 함)
  // Builder store를 참조하면 iframe 재로드 시 요소가 사라지는 문제 발생
  const [elements, setElements] = React.useState<PreviewElement[]>([]);

  // ❌ REMOVED: Builder store 동기화 (postMessage로만 업데이트)

  // Console error/warning suppression for development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        const message = String(args[0] || "");
        if (
          message.includes("cannot be a child of") ||
          message.includes("using incorrect casing") ||
          message.includes("is unrecognized in this browser") ||
          message.includes("validateDOMNesting")
        ) {
          return; // DOM 중첩 관련 경고 무시
        }
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        const message = String(args[0] || "");
        if (
          message.includes("using incorrect casing") ||
          message.includes("is unrecognized in this browser")
        ) {
          return; // 컴포넌트 케이싱 관련 경고 무시
        }
        originalWarn.apply(console, args);
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  // 로컬 updateElementProps (Builder store 수정 방지)
  const updateElementProps = useCallback((id: string, props: Record<string, unknown>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, props: { ...el.props, ...props } } : el))
    );
  }, []);

  // 🔧 FIX: Ref를 사용하여 최신 값 참조 (Race Condition 방지)
  const elementsRef = React.useRef(elements);
  const updateElementPropsRef = React.useRef(updateElementProps);

  // Ref 업데이트 (최신 값 유지)
  React.useEffect(() => {
    elementsRef.current = elements;
    updateElementPropsRef.current = updateElementProps;
  }, [elements, updateElementProps]);

  // ✅ 의존성 없는 messageHandler (한 번만 생성, 메시지 손실 방지)
  const messageHandler = useCallback((event: MessageEvent) => {
    handleMessage(
      event,
      elementsRef.current,
      setElements,
      updateElementPropsRef.current
    );
  }, []); // ✅ 빈 의존성 - 리스너 재등록 방지

  // ✅ PREVIEW_READY는 한 번만 전송 (mount 시에만)
  useEffect(() => {
    console.log('🖼️ [Preview] Mounting - registering message listener');

    window.addEventListener("message", messageHandler);

    // 준비 신호 (한 번만 전송)
    try {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
      console.log('✅ [Preview] PREVIEW_READY sent to parent');
    } catch (error) {
      console.error("❌ [Preview] Error posting PREVIEW_READY message:", error);
    }

    return () => {
      console.log('🧹 [Preview] Unmounting - removing message listener');
      window.removeEventListener("message", messageHandler);
    };
  }, [messageHandler]); // messageHandler는 변경되지 않으므로 한 번만 실행

  document.documentElement.classList.add(styles.root);

  // Context를 useMemo로 메모이제이션 (renderElement 제외)
  const baseContext = useMemo(() => ({
    elements,
    updateElementProps,
    setElements,
    eventEngine,
    projectId,
  }), [elements, updateElementProps, setElements, eventEngine, projectId]);

  /**
   * Element 렌더링 함수 (useCallback으로 메모이제이션)
   */
  const renderElement = useCallback((el: PreviewElement, key?: string): React.ReactNode => {
    // body 태그는 div로 렌더링
    const effectiveTag = el.tag === "body" ? "div" : el.tag;

    // 렌더러 맵에서 해당 태그의 렌더러 찾기
    const renderer = rendererMap[effectiveTag];

    if (renderer) {
      // fullContext는 외부에서 메모이제이션됨
      return renderer(el, fullContext);
    }

    // HTML 요소 목록
    const htmlElements = [
      "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "section", "article", "header", "footer", "nav", "main", "aside",
      "ul", "ol", "li", "a", "img", "video", "audio", "canvas",
      "table", "thead", "tbody", "tr", "td", "th",
      "form", "input", "textarea", "button", "select", "option",
      "label", "fieldset", "legend", "datalist", "output", "progress", "meter",
    ];

    // HTML 요소인지 확인
    const isHTMLElement =
      htmlElements.includes(effectiveTag.toLowerCase()) ||
      (effectiveTag &&
        typeof effectiveTag === "string" &&
        effectiveTag[0] === effectiveTag[0].toLowerCase());

    if (isHTMLElement) {
      // HTML 요소 렌더링
      const children = elements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const cleanProps = cleanPropsForHTML({
        ...el.props,
        key: key || el.id,
        "data-element-id": el.id,
        ...(el.tag === "body" ? { "data-original-tag": "body" } : {}),
      });

      const content = children.map((child) => renderElement(child, child.id));

      return React.createElement(
        effectiveTag.toLowerCase(),
        cleanProps,
        content.length > 0 ? content : undefined
      );
    }

    // 알 수 없는 컴포넌트 - fallback 렌더링
    console.warn(
      `Unknown component/element type: ${effectiveTag}. Rendering as div.`
    );

    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    const fallbackProps = {
      "data-element-id": el.id,
      "data-unknown-component": effectiveTag,
      "data-original-tag": el.tag,
      style: el.props.style,
      className: el.props.className,
      key: key || el.id,
    };

    const content = children.map((child) => renderElement(child, child.id));

    return React.createElement(
      "div",
      fallbackProps,
      content.length > 0 ? content : `Unknown: ${effectiveTag}`
    );
    // elements와 fullContext는 순환 참조를 방지하기 위해 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseContext]); // baseContext가 변경될 때만 renderElement 재생성

  // FullContext를 useMemo로 메모이제이션 (baseContext + renderElement)
  const fullContext = useMemo(() => ({
    ...baseContext,
    renderElement,
  }), [baseContext, renderElement]);

  const renderElementsTree = (): React.ReactNode => {
    // body 태그 확인
    const bodyElement = elements.find((el) => el.tag === "body");

    if (bodyElement) {
      // body가 있는 경우, body의 직접 자식 요소들만 렌더링
      const bodyChildren = elements
        .filter((el) => el.parent_id === bodyElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // body의 자식들을 렌더링 (body 자체는 Preview 컴포넌트의 루트에서 처리)
      return bodyChildren.map((el) => renderElement(el, el.id));
    } else {
      // body가 없는 경우 루트 요소들 렌더링
      const rootElements = elements
        .filter((el) => !el.parent_id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return rootElements.map((el) => renderElement(el, el.id));
    }
  };

  /**
   * Collect computed styles from element
   */
  const collectComputedStyle = (domElement: Element): Record<string, string> => {
    const computed = window.getComputedStyle(domElement);

    // 주요 CSS 속성들만 수집 (string으로 반환)
    return {
      // Layout
      display: computed.display,
      width: computed.width,
      height: computed.height,
      position: computed.position,
      top: computed.top,
      left: computed.left,
      right: computed.right,
      bottom: computed.bottom,

      // Flexbox
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,

      // Spacing
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,

      // Border
      borderColor: computed.borderColor,
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderRadius: computed.borderRadius,

      // Background
      backgroundColor: computed.backgroundColor,

      // Typography
      color: computed.color,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      textDecoration: computed.textDecoration,
      textTransform: computed.textTransform,
    };
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const elementWithId = target.closest("[data-element-id]");

    if (!elementWithId) return;

    const elementId = elementWithId.getAttribute("data-element-id");
    if (!elementId) return;

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

    // Collect computed styles
    const computedStyle = collectComputedStyle(elementWithId);

    const rect = elementWithId.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: "ELEMENT_SELECTED",
        elementId: elementId,
        payload: {
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          props: element.props,
          tag: element.tag,
          style: element.props?.style || {},
          computedStyle,
        },
      },
      window.location.origin
    );
  };

  // body 요소 확인
  const bodyElement = elements.find((el) => el.tag === "body");
  //const rootElement = bodyElement || { tag: 'div', props: {} as ElementProps };

  // 루트 컨테이너는 항상 div로 렌더링 (실제 body는 HTML 문서의 body)
  const containerProps = {
    className: styles.main,
    id: projectId || "preview-container",
    "data-element-id": bodyElement?.id,
    onMouseUp: handleGlobalClick,
    //onMouseDown: handleGlobalClick,
    // body 요소의 스타일만 적용 (다른 props는 제외)
    style: bodyElement?.props?.style || {},
    // body였다면 원래 태그 정보 기록
    ...(bodyElement ? { "data-original-tag": "body" } : {}),
  };

  return React.createElement(
    "div",
    containerProps,
    elements.length === 0 ? "No elements available" : renderElementsTree()
  );
}

export default Preview;
