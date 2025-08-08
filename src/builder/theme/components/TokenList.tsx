import React from 'react';
import { Trash2, Copy } from 'lucide-react';
import { tokenValueToCss } from '../../../utils/tokensToCss';
import type { DesignToken, TokenType, TokenValue } from '../../../types/designTokens';

interface TokenListProps {
    tokens: DesignToken[];
    category: TokenType;
    onUpdateToken: (tokenId: string, value: TokenValue) => void;
    onDeleteToken: (tokenId: string) => Promise<boolean>;
}

export function TokenList({ tokens, category, onUpdateToken, onDeleteToken }: TokenListProps) {
    const handleDeleteClick = async (tokenId: string, tokenName: string) => {
        if (!confirm(`정말로 "${tokenName}" 토큰을 삭제하시겠습니까?`)) return;

        const success = await onDeleteToken(tokenId);
        if (!success) {
            alert('토큰 삭제에 실패했습니다.');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // 간단한 피드백 (추후 toast 시스템으로 대체 가능)
            console.log('CSS 변수가 클립보드에 복사되었습니다:', text);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
        }
    };

    const renderColorPreview = (token: DesignToken) => {
        if (category !== 'color') return null;

        const cssValue = tokenValueToCss(token);
        return (
            <div
                className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: cssValue }}
                title={cssValue}
            />
        );
    };

    const renderTokenValue = (token: DesignToken) => {
        const cssValue = tokenValueToCss(token);

        return (
            <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">{token.name}</span>
                    <button
                        onClick={() => copyToClipboard(token.css_variable || `--${token.name}`)}
                        className="flex items-center space-x-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        title="CSS 변수 복사"
                    >
                        <code className="text-gray-700">{token.css_variable || `--${token.name}`}</code>
                        <Copy size={12} />
                    </button>
                </div>
                <input
                    type="text"
                    value={typeof token.value === 'string' ? token.value : cssValue}
                    onChange={(e) => onUpdateToken(token.id, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    placeholder="토큰 값"
                />
                {category === 'color' && (
                    <div className="mt-1 text-xs text-gray-500">
                        미리보기: {cssValue}
                    </div>
                )}
            </div>
        );
    };

    if (tokens.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                    </div>
                </div>
                <p className="text-gray-500 text-sm">
                    {category} 토큰이 없습니다.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                    위의 폼을 사용해 새 토큰을 추가해보세요.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                    {category} 토큰 ({tokens.length}개)
                </h3>
            </div>

            {tokens.map((token) => (
                <div
                    key={token.id}
                    className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                    {renderColorPreview(token)}
                    {renderTokenValue(token)}

                    <button
                        onClick={() => handleDeleteClick(token.id, token.name)}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title={`${token.name} 토큰 삭제`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}