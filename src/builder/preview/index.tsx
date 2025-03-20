import React, { useEffect } from "react";
import { useParams } from "react-router";
import { useStore } from '@nanostores/react';
import { elementsStore, setElements, Element } from '../stores/elements';

import "./index.css";

function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore(elementsStore);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements);
      }
      if (event.data.type === "REQUEST_UPDATE") {
        window.parent.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [elements]);

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
            //console.log("Preview rect:", rect);
            window.parent.postMessage({
                type: "ELEMENT_SELECTED",
                elementId: el.id,
                payload: {
                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                    props: el.props,
                    tag: el.tag, // tag 추가
                }
            }, window.location.origin);
        }
    };
    return React.createElement(
        el.tag,
        newProps,
        <>
            {el.props.text}
            {children.map(child => renderElement(child))}
        </>
    );
};

  const renderElementsTree = (): React.ReactNode => {
    return elements.filter((el) => !el.parent_id).map(el => renderElement(el));
  };

  return (
    <div className="main" id={projectId || undefined}>
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
    </div>
  );
}

export default Preview;