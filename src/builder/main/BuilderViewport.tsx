import React from 'react';

export interface BuilderViewportProps {
    children: React.ReactNode;
    className?: string;
}

export const BuilderViewport: React.FC<BuilderViewportProps> = ({
    children,
    className = 'app'
}) => {
    return (
        <div className={className}>
            {children}
        </div>
    );
};
