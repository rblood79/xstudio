import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경
import styles from "./index.module.css";
import { CSSProperties } from "react";
//import "./index.css";

interface Element {
  id: string;
  tag: string;
  props: Record<string, string | number | boolean | CSSProperties | undefined>;
  parent_id?: string | null;
  order_num?: number;
}

function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore((state) => state.elements);
  const { setElements } = useStore();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements || []);
      }
      if (event.data.type === "REQUEST_UPDATE") {
        window.parent.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
      }
    },
    [elements, setElements]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  document.documentElement.classList.add(styles.root);

  const renderElement = (el: Element): React.ReactNode => {
    // body 태그인 경우 자식 요소들만 렌더링하고 실제 body에 속성들 추가
    if (el.tag === "body") {
      const children = elements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // 실제 body 태그에 data-element-id, props, onClick 이벤트 추가
      document.body.setAttribute("data-element-id", el.id);

      // props 적용
      if (el.props.style) {
        Object.assign(document.body.style, el.props.style);
      }

      // 다른 props들도 적용 (style 제외)
      Object.entries(el.props).forEach(([key, value]) => {
        if (key !== 'style' && key !== 'text') {
          document.body.setAttribute(key, String(value));
        }
      });

      document.body.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        window.parent.postMessage({
          type: "ELEMENT_SELECTED",
          elementId: el.id,
          payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: el.props, tag: el.tag },
        }, window.location.origin);
      };

      return children.map((child) => renderElement(child));
    }

    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        window.parent.postMessage({
          type: "ELEMENT_SELECTED",
          elementId: el.id,
          payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: el.props, tag: el.tag },
        }, window.location.origin);
      },
    };

    return React.createElement(
      el.tag,
      newProps,
      <>
        {String(el.props.text)}
        {children.map((child) => renderElement(child))}
      </>
    );
  };

  const renderElementsTree = (): React.ReactNode => {
    const sortedRootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return sortedRootElements.map((el) => renderElement(el));
  };

  return (
    <div className="main" id={projectId || undefined}>
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
    </div>
  );
}

export default Preview;