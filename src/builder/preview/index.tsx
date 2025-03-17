import React, { useState, useEffect } from "react";
import { useParams } from "react-router";

function Preview() {

    const { projectId } = useParams<{ projectId: string }>();

    // 상태 변수 추가: 부모로부터 전달받은 elements
    interface Element {
        id: string;
        tag: string;
        props: { [key: string]: string | number | boolean };
        parent_id?: string;
    }

    const [elements, setElements] = useState<Element[]>([]);
    
    // 부모(Builder)에서 postMessage로 전달한 데이터를 수신
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // 필요시 event.origin 검증 추가
            if (event.data.type === "UPDATE_ELEMENTS") {
                setElements(event.data.elements);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // iframe 로드시 부모에게 업데이트 요청
    useEffect(() => {
        window.parent.postMessage({ type: "REQUEST_UPDATE" }, "*");
    }, []);

    // 수정된 renderElement 함수: 클릭 시 부모로 메시지 전송
    const renderElement = (el: Element): React.ReactNode => {
        const children = elements.filter((child) => child.parent_id === el.id);
        const newProps = {
            ...el.props,
            key: el.id,
            "data-element-id": el.id, // 추가: 각 요소에 식별자 부여
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                const rect = target.getBoundingClientRect();
                window.parent.postMessage({
                    type: "ELEMENT_SELECTED",
                    elementId: el.id,
                    payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }
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

    // 추가: builder에서 보낸 ELEMENT_SELECTED 메시지 처리 (payload 없는 경우)
    useEffect(() => {
        const handleSelection = (event: MessageEvent) => {
            // payload가 없는 경우 builder에서 보낸 메시지로 간주
            if (event.data.type === "ELEMENT_SELECTED" && !event.data.payload) {
                const elementId: string = event.data.elementId;
                const domElement = document.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement | null;
                if (domElement) {
                    const rect = domElement.getBoundingClientRect();
                    // 부모(빌더)로 rect payload 전송
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

    // 최상위 요소부터 renderElementsTree 구현
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