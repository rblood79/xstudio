import React, { useRef, ReactNode } from 'react';

interface WorkspaceProps {
    children: ReactNode;
}

export const Workspace = () => {
      
    const workspaceRef = useRef<HTMLDivElement>(null);

    return (
      <>
        <div
          ref={workspaceRef}
        >
          <div>
          </div>
          <div
            data-name="canvas-tools-wrapper"
          >
          </div>
        </div>
      </>
    );
  };