import React from 'react';
import './components.css';

export interface CardProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    variant?: 'default' | 'elevated' | 'outlined';
    size?: 'small' | 'medium' | 'large';
    isQuiet?: boolean;
    isSelected?: boolean;
    isDisabled?: boolean;
    isFocused?: boolean;
    onClick?: () => void;
    title?: string;
    description?: string;
}

export function Card({
    children,
    title = 'Card Title',
    description = 'This is a card description. You can edit this content.',
    ...props
}: CardProps) {
    return (
        (
            <div {...props} className='react-aria-Card'>
                {title && (
                    <div className='card-header'>
                        <div className='card-title'>
                            {title}
                        </div>
                    </div>
                )}
                <div className='card-content'>
                    {description && (
                        <div className='card-description'>
                            {description}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        )
    );
}

export { Card as MyCard };
