import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from '../stores/elements'; // Zustand 스토어로 변경
import "./index.css";
import { CSSProperties } from "react";

interface Element {
  id: string;
  tag: string;
  props: Record<string, string | number | boolean | CSSProperties | undefined>;
  parent_id?: string | null;
}

function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore((state) => state.elements);
  const { setElements } = useStore();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements);
      }
      if (event.data.type === "REQUEST_UPDATE") {
        window.parent.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
      }
    },
    [elements, setElements] // 의존성: elements와 setElements
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]); // handleMessage에 의존

  const renderElement = (el: Element): React.ReactNode => {
    const children = elements.filter((child) => child.parent_id === el.id);
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
        {el.props.text}
        {children.map((child) => renderElement(child))}
      </>
    );
  };

  const renderElementsTree = (): React.ReactNode => {
    return elements.filter((el) => !el.parent_id).map((el) => renderElement(el));
  };

  return (
    <div className="main" id={projectId || undefined}>
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
    </div>
  );
}

export default Preview;