import React, { useRef, useEffect } from 'react';
import SelectionOverlay from '../overlay';
import { Breakpoint } from './BuilderHeader';

export interface BuilderWorkspaceProps {
    projectId?: string;
    breakpoint: Set<string>;
    breakpoints: Breakpoint[];
    onIframeLoad: () => void;
    onMessage: (event: MessageEvent) => void;
}

export const BuilderWorkspace: React.FC<BuilderWorkspaceProps> = ({
    projectId,
    breakpoint,
    breakpoints,
    onIframeLoad,
    onMessage
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            onMessage(event);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onMessage]);

    const currentBreakpoint = breakpoints.find(bp => bp.id === Array.from(breakpoint)[0]);
    const isScreen = currentBreakpoint?.id === 'screen';

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
                    max-width={currentBreakpoint?.max_width}
                    style={{
                        width: currentBreakpoint?.max_width || '100%',
                        height: currentBreakpoint?.max_height || '100%',
                        borderWidth: isScreen ? '0px' : '1px'
                    }}
                >
                    <iframe
                        ref={iframeRef}
                        id="previewFrame"
                        src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                        style={{ width: "100%", height: "100%", border: "none" }}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        onLoad={onIframeLoad}
                    />
                    <SelectionOverlay />
                </div>
            </div>
        </main>
    );
};
