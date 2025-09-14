import React, { useEffect } from 'react';

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
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        onLoad={onIframeLoad}
                    />
                    {children}
                </div>
            </div>
        </main>
    );
};
