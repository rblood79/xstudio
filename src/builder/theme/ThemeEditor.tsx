import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { CategoryTabs } from './components/CategoryTabs';
import { TokenForm } from './components/TokenForm';
import { TokenList } from './components/TokenList';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import type { TokenType } from '../../types/designTokens';

export default function ThemeEditor() {
    const { projectId } = useParams<{ projectId: string }>();
    const [selectedCategory, setSelectedCategory] = useState<TokenType>('color');

    const {
        tokens,
        isLoading,
        isSaving,
        error,
        handleUpdateToken,
        handleAddToken,
        handleDeleteToken,
        getTokensByType,
        clearError
    } = useDesignTokens(projectId);

    const filteredTokens = getTokensByType(selectedCategory);

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <div className="text-gray-600">토큰을 로드하는 중...</div>
            </div>
        );
    }

    return (
        <div className="theme-editor p-4">
            {/* 헤더 */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">테마 편집기</h2>
                <p className="text-sm text-gray-600">프로젝트의 디자인 토큰을 관리하세요</p>
            </div>

            {/* 에러 표시 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-red-700 text-sm">{error}</span>
                    <button
                        onClick={clearError}
                        className="ml-auto text-red-600 hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* 카테고리 탭 */}
            <div className="mb-4">
                <CategoryTabs
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                />
            </div>

            {/* 토큰 추가 폼 */}
            <div className="mb-6">
                <TokenForm
                    category={selectedCategory}
                    onSubmit={handleAddToken}
                    isLoading={isSaving}
                />
            </div>

            {/* 토큰 목록 */}
            <TokenList
                tokens={filteredTokens}
                category={selectedCategory}
                onUpdateToken={handleUpdateToken}
                onDeleteToken={handleDeleteToken}
            />
        </div>
    );
}