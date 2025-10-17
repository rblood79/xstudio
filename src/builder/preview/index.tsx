import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from "../stores";
import styles from "./index.module.css";
import { EventEngine } from "../../utils/eventEngine";
import { PreviewElement } from "./types";
import { rendererMap } from "./renderers";
import { handleMessage } from "./utils/messageHandlers";
import { cleanPropsForHTML } from "./utils/propsConverter";

function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore((state) => state.elements) as PreviewElement[];
  const { setElements, updateElementProps } = useStore();
  const eventEngine = EventEngine.getInstance();

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

  // postMessage 핸들러 (useCallback으로 메모이제이션)
  const messageHandler = useCallback(
    (event: MessageEvent) => {
      handleMessage(event, elements, setElements, updateElementProps);
    },
    [elements, setElements, updateElementProps]
  );

  useEffect(() => {
    window.addEventListener("message", messageHandler);

    // 준비 신호
    try {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    } catch {
      console.error("Error posting PREVIEW_READY message");
    }

    return () => window.removeEventListener("message", messageHandler);
  }, [messageHandler]);

  document.documentElement.classList.add(styles.root);

  /**
   * Element 렌더링 함수 (리팩토링 완료 - 렌더러 맵 사용)
   */
  const renderElement = (el: PreviewElement, key?: string): React.ReactNode => {
    // body 태그는 div로 렌더링
    const effectiveTag = el.tag === "body" ? "div" : el.tag;

    // RenderContext 생성
    const context = {
      elements,
      updateElementProps,
      setElements,
      eventEngine,
      projectId,
      renderElement,
    };

    // 렌더러 맵에서 해당 태그의 렌더러 찾기
    const renderer = rendererMap[effectiveTag];

    if (renderer) {
      return renderer(el, context);
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
  };

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

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const elementWithId = target.closest("[data-element-id]");

    if (!elementWithId) return;

    const elementId = elementWithId.getAttribute("data-element-id");
    if (!elementId) return;

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

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
