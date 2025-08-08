import React from 'react';
import { Palette, Type, Ruler, Square, Zap } from 'lucide-react';
import type { TokenType, CategoryConfig } from '../../../types/designTokens';

export const categoryConfigs: Record<TokenType, CategoryConfig> = {
    color: {
        icon: Palette,
        label: 'Color',
        placeholder: '#000000'
    },
    typography: {
        icon: Type,
        label: 'Typography',
        placeholder: '16px'
    },
    spacing: {
        icon: Ruler,
        label: 'Spacing',
        placeholder: '8px'
    },
    border: {
        icon: Square,
        label: 'Border',
        placeholder: '1px solid'
    },
    shadow: {
        icon: Zap,
        label: 'Shadow',
        placeholder: '0 2px 4px rgba(0,0,0,0.1)'
    }
};

interface CategoryTabsProps {
    selectedCategory: TokenType;
    onCategoryChange: (category: TokenType) => void;
}

export function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
    return (
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {Object.entries(categoryConfigs).map(([category, config]) => {
                const Icon = config.icon;
                return (
                    <button
                        key={category}
                        onClick={() => onCategoryChange(category as TokenType)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === category
                            ? 'bg-white shadow-sm font-medium'
                            : 'hover:bg-gray-200 text-gray-600'
                            }`}
                    >
                        <Icon size={16} />
                        <span>{config.label}</span>
                    </button>
                );
            })}
        </div>
    );
}