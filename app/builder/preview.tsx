import React, { useState, useEffect } from "react";

interface PreviewProps {
    projectId: string | undefined;
}
function Preview({ projectId }: PreviewProps) {
    // 상태 변수 추가: 부모로부터 전달받은 elements
    const [elements, setElements] = useState<any[]>([]);
    
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

    // 수정된 renderElement 함수: 클릭 시 부모로 메시지 전송
    const renderElement = (el: any): React.ReactNode => {
        const children = elements.filter((child) => child.parent_id === el.id);
        const newProps = {
            ...el.props,
            key: el.id,
            onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                window.parent.postMessage({ type: "ELEMENT_SELECTED", elementId: el.id }, "*");
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

    // 최상위 요소부터 renderElementsTree 구현
    const renderElementsTree = (): React.ReactNode => {
        return elements.filter((el) => !el.parent_id).map(el => renderElement(el));
    };

    return (
        <div>
            {/* 기존 projectId 정보도 표시 가능 */}
            <div>{projectId ? `Project ID: ${projectId}` : "No project ID provided"}</div>
            {/* 전달받은 요소 트리 렌더링 */}
            <div className="workspace">
                {elements.length === 0 ? "No elements available" : renderElementsTree()}
            </div>
        </div>
    );
}

export default Preview;