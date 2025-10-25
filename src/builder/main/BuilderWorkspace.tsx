import React, { useEffect } from 'react';
import { useStore } from '../stores';

export interface BuilderWorkspaceProps {
    projectId?: string;
    breakpoint: Set<string>;
    breakpoints: Array<{
        id: string;
        label: string;
        max_width: string | number;
        max_height: string | number;
    }>;
    onIframeLoad: () => void;
    onMessage: (event: MessageEvent) => void;
    children?: React.ReactNode;
}

export const BuilderWorkspace: React.FC<BuilderWorkspaceProps> = ({
    projectId,
    breakpoint,
    breakpoints,
    onIframeLoad,
    onMessage,
    children
}) => {
    const currentBreakpoint = breakpoints.find(bp => bp.id === Array.from(breakpoint)[0]);
    const showElementBorders = useStore((state) => state.showElementBorders);
    const showElementLabels = useStore((state) => state.showElementLabels);

    // 메시지 이벤트 리스너 등록
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            onMessage(event);
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [onMessage]);

    // Element Borders 및 Labels 시각화
    useEffect(() => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if (!iframe || !iframe.contentDocument) return;

        const iframeDoc = iframe.contentDocument;
        let styleElement = iframeDoc.getElementById('element-visualization-styles') as HTMLStyleElement;

        // 스타일 엘리먼트가 없으면 생성
        if (!styleElement) {
            styleElement = iframeDoc.createElement('style');
            styleElement.id = 'element-visualization-styles';
            iframeDoc.head.appendChild(styleElement);
        }

        // CSS 내용 생성
        let css = '';

        if (showElementBorders) {
            css += `
                [data-element-id] {
                    outline: 1px dashed rgba(59, 130, 246, 0.5) !important;
                    outline-offset: -1px !important;
                }
            `;
        }

        if (showElementLabels) {
            css += `
                [data-element-id]::before {
                    content: attr(data-element-id);
                    position: absolute;
                    top: 0;
                    left: 0;
                    background: rgba(59, 130, 246, 0.9);
                    color: white;
                    font-size: 10px;
                    padding: 2px 4px;
                    border-radius: 2px;
                    z-index: 10000;
                    pointer-events: none;
                    font-family: monospace;
                }
            `;
        }

        styleElement.textContent = css;
    }, [showElementBorders, showElementLabels]);

    return (
        <main>
            <div
                className="bg"
                style={{
                    backgroundSize: `${Math.round(Number(currentBreakpoint?.max_width) || 0)}px ${Math.round(Number(currentBreakpoint?.max_height) || 0)}px`
                }}
            >
                <div
                    className="workspace"
                    style={{
                        width: currentBreakpoint?.max_width || '100%',
                        height: currentBreakpoint?.max_height || '100%',
                        borderWidth: currentBreakpoint?.id === 'screen' ? '0px' : '1px'
                    }}
                >
                    <iframe
                        id="previewFrame"
                        src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                        style={{ width: "100%", height: "100%", border: "none" }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        title="XStudio Preview"
                        onLoad={onIframeLoad}
                    />
                    {children}
                </div>
            </div>
        </main>
    );
};
