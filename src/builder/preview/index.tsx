import React, { useState, useEffect } from "react";
import { useParams } from "react-router";

function Preview() {
    const { projectId } = useParams<{ projectId: string }>();

    interface Element {
        id: string;
        tag: string;
        props: { [key: string]: string | number | boolean | React.CSSProperties };
        parent_id?: string;
    }

    const [elements, setElements] = useState<Element[]>([]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === "UPDATE_ELEMENTS") {
                console.log("Preview received elements:", event.data.elements); // 디버깅 로그 추가
                setElements(event.data.elements);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    useEffect(() => {
        window.parent.postMessage({ type: "REQUEST_UPDATE" }, "*");
    }, []);

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
                    payload: {
                        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                        props: el.props
                    }
                }, "*");
            }
        };
        return React.createElement(
            el.tag,
            newProps,
            <>
                <span>{el.tag} - {el.id}</span>
                {children.map(child => renderElement(child))}
            </>
        );
    };

    useEffect(() => {
        const handleSelection = (event: MessageEvent) => {
            if (event.data.type === "ELEMENT_SELECTED") {
                const elementId: string = event.data.elementId;
                const domElement = document.querySelector(
                    `[data-element-id="${elementId}"]`
                ) as HTMLElement | null;
                if (domElement) {
                    const rect = domElement.getBoundingClientRect();
                    window.parent.postMessage({
                        type: "ELEMENT_SELECTED",
                        elementId,
                        payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }
                    }, "*");
                }
            }
        };
        window.addEventListener("message", handleSelection);
        return () => window.removeEventListener("message", handleSelection);
    }, []);

    const renderElementsTree = (): React.ReactNode => {
        return elements.filter((el) => !el.parent_id).map(el => renderElement(el));
    };

    return (
        <div className="main" id={projectId ? projectId : undefined}>
            {elements.length === 0 ? "No elements available" : renderElementsTree()}
        </div>
    );
}

export default Preview;