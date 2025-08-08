import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { categoryConfigs } from './CategoryTabs';
import { validateTokenValue } from '../../../utils/tokensToCss';
import type { TokenType, NewTokenInput } from '../../../types/designTokens';

interface TokenFormProps {
    category: TokenType;
    onSubmit: (token: NewTokenInput) => Promise<boolean>;
    isLoading: boolean;
}

export function TokenForm({ category, onSubmit, isLoading }: TokenFormProps) {
    const [formData, setFormData] = useState<NewTokenInput>({
        name: '',
        type: category,
        value: '',
        css_variable: ''
    });

    const config = categoryConfigs[category];

    const handleNameChange = (name: string) => {
        const cssVariable = `--${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        setFormData(prev => ({
            ...prev,
            name,
            type: category,
            css_variable: prev.css_variable || cssVariable
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.value) {
            alert('토큰 이름과 값이 필요합니다.');
            return;
        }

        if (!validateTokenValue(category, formData.value)) {
            alert(`올바른 ${config.label.toLowerCase()} 값을 입력해주세요.`);
            return;
        }

        const success = await onSubmit({
            ...formData,
            type: category
        });

        if (success) {
            setFormData({
                name: '',
                type: category,
                value: '',
                css_variable: ''
            });
        }
    };

    // 카테고리 변경 시 폼 타입 업데이트
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, type: category }));
    }, [category]);

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">새 {config.label} 토큰 추가</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                    type="text"
                    placeholder="토큰 이름"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    placeholder={config.placeholder}
                    value={formData.value as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    placeholder="CSS 변수명 (선택사항)"
                    value={formData.css_variable}
                    onChange={(e) => setFormData(prev => ({ ...prev, css_variable: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                />
            </div>
            <button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name || !formData.value}
                className="mt-3 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Plus size={16} />
                <span>{isLoading ? '추가 중...' : '토큰 추가'}</span>
            </button>
        </div>
    );
}