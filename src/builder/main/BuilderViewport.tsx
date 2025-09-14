import React from 'react';

export interface BuilderViewportProps {
    children: React.ReactNode;
}

export const BuilderViewport: React.FC<BuilderViewportProps> = ({
    children
}) => {
    return (
        <div className="contents">
            {children}
        </div>
    );
};
