import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../env/supabase.client';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { useThemeStore } from '../stores/themeStore';
import ColorPicker from './ColorPicker';

type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border';

interface ColorValue {
    h: number; // hue (0-360)
    s: number; // saturation (0-100)
    l: number; // lightness (0-100)
    a: number; // alpha (0-1)
}

interface TypographyValue {
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
}

interface ShadowValue {
    offsetX: string;
    offsetY: string;
    blur: string;
    spread: string;
    color: string;
}

interface BorderValue {
    width: string;
    style: string;
    color: string;
}

type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | string;

interface DesignToken {
    id: string;
    project_id: string;
    name: string;
    type: TokenType;
    value: TokenValue;
    created_at: string;
}

interface ThemeEditorProps {
    projectId: string;
}

const TOKEN_TYPES = [
    'color',
    'typography',
    'spacing',
    'shadow',
    'border'
] as const;

const DEFAULT_VALUES: Record<TokenType, TokenValue> = {
    color: { h: 210, s: 100, l: 50, a: 1 }, // Default blue color
    typography: {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: 1.5
    },
    spacing: '8px',
    shadow: {
        offsetX: '0px',
        offsetY: '2px',
        blur: '4px',
        spread: '0px',
        color: 'hsla(0, 0%, 0%, 0.1)'
    },
    border: {
        width: '1px',
        style: 'solid',
        color: 'hsl(0, 0%, 0%)'
    }
};

interface TokenState {
    name: string;
    type: TokenType;
    value: TokenValue;
}

export default function ThemeEditor({ projectId }: ThemeEditorProps) {
    const [tokens, setTokens] = useState<DesignToken[]>([]);
    const [newToken, setNewToken] = useState<TokenState>({
        name: '',
        type: 'color',
        value: DEFAULT_VALUES.color
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<TokenType | 'all'>('all');
    const [editingToken, setEditingToken] = useState<DesignToken | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const setThemeTokens = useThemeStore(state => state.setTokens);
    const setThemeProjectId = useThemeStore(state => state.setProjectId);

    // Apply design tokens as CSS variables
    useDesignTokens(projectId);

    const fetchTokens = useCallback(async () => {
        if (!projectId) return;

        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from('design_tokens')
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching tokens:', error);
            setError('Failed to fetch tokens');
            setTokens([]);
            setThemeTokens([]);
        } else {
            setTokens(data || []);
            setThemeTokens(data || []);
            setError(null);
        }

        setIsLoading(false);
    }, [projectId, setThemeTokens]);

    useEffect(() => {
        if (!projectId) {
            setError('Project ID is required');
            return;
        }
        setThemeProjectId(projectId);
        fetchTokens();
    }, [projectId, fetchTokens, setThemeProjectId]);

    const handleTypeChange = (type: TokenType) => {
        setNewToken(prev => ({
            ...prev,
            type,
            value: DEFAULT_VALUES[type]
        }));
    };

    const handleEditToken = (token: DesignToken) => {
        setEditingToken(token);
        setNewToken({
            name: token.name,
            type: token.type,
            value: token.value
        });
        setIsEditing(true);
    };

    const handleDuplicateToken = (token: DesignToken) => {
        setNewToken({
            name: `${token.name} (copy)`,
            type: token.type,
            value: token.value
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateIframeStyles = useCallback((tokens: DesignToken[]) => {
        const styleObject: Record<string, string> = {};

        requestAnimationFrame(() => {
            tokens.forEach(token => {
                const value = token.value;
                if (token.type === 'color' && typeof value === 'object' && 'h' in value) {
                    const colorValue = value as ColorValue;
                    styleObject[`--color-${token.name}`] = `hsl(${colorValue.h}deg ${colorValue.s}% ${colorValue.l}% / ${colorValue.a})`;
                } else if (token.type === 'typography' && typeof value === 'object' && 'fontFamily' in value) {
                    const typographyValue = value as TypographyValue;
                    styleObject[`--typography-${token.name}-family`] = typographyValue.fontFamily;
                    styleObject[`--typography-${token.name}-size`] = typographyValue.fontSize;
                    styleObject[`--typography-${token.name}-weight`] = String(typographyValue.fontWeight);
                    styleObject[`--typography-${token.name}-line-height`] = String(typographyValue.lineHeight);
                } else if (token.type === 'spacing' && typeof value === 'string') {
                    styleObject[`--spacing-${token.name}`] = value;
                } else if (token.type === 'shadow' && typeof value === 'object' && 'offsetX' in value) {
                    const shadowValue = value as ShadowValue;
                    styleObject[`--shadow-${token.name}`] = `${shadowValue.offsetX} ${shadowValue.offsetY} ${shadowValue.blur} ${shadowValue.spread} ${shadowValue.color}`;
                } else if (token.type === 'border' && typeof value === 'object' && 'width' in value) {
                    const borderValue = value as BorderValue;
                    styleObject[`--border-${token.name}-width`] = borderValue.width;
                    styleObject[`--border-${token.name}-style`] = borderValue.style;
                    styleObject[`--border-${token.name}-color`] = borderValue.color;
                }
            });

            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage(
                        { type: 'UPDATE_THEME_TOKENS', styles: styleObject },
                        window.location.origin
                    );
                }
            });
        });
    }, []);

    useEffect(() => {
        updateIframeStyles(tokens);
    }, [tokens, updateIframeStyles]);

    const handleColorChange = useCallback((color: ColorValue) => {
        setNewToken(prev => ({
            ...prev,
            value: color
        }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!projectId) {
            setError('Project ID is required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const tokenData = {
                project_id: projectId,
                name: newToken.name,
                type: newToken.type,
                value: newToken.value
            };

            if (isEditing && editingToken) {
                const { error } = await supabase
                    .from('design_tokens')
                    .update(tokenData)
                    .eq('id', editingToken.id);

                if (error) throw error;

                setIsEditing(false);
                setEditingToken(null);
            } else {
                const { error } = await supabase
                    .from('design_tokens')
                    .insert([tokenData]);

                if (error) throw error;
            }

            await fetchTokens();
            setNewToken({
                name: '',
                type: 'color',
                value: DEFAULT_VALUES.color
            });
        } catch (error) {
            console.error('Error saving token:', error);
            setError('Failed to save token');
        }

        setIsLoading(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingToken(null);
        setNewToken({
            name: '',
            type: 'color',
            value: DEFAULT_VALUES.color
        });
    };

    const handleDeleteToken = async (tokenId: string) => {
        const { error } = await supabase
            .from('design_tokens')
            .delete()
            .eq('id', tokenId);

        if (error) {
            console.error('Error deleting token:', error);
            return;
        }

        fetchTokens();
    };

    const renderTokenEditor = useCallback(() => {
        switch (newToken.type) {
            case 'color':
                return (
                    <ColorPicker
                        value={newToken.value as ColorValue}
                        onChange={handleColorChange}
                    />
                );
            case 'typography':
                // ... typography editor ...
                break;
            case 'spacing':
                // ... spacing editor ...
                break;
            case 'shadow':
                // ... shadow editor ...
                break;
            case 'border':
                // ... border editor ...
                break;
            default:
                return null;
        }
    }, [newToken.type, newToken.value, handleColorChange]);

    const renderTokenPreview = (token: DesignToken) => {
        switch (token.type) {
            case 'color': {
                const colorValue = token.value as ColorValue;
                return (
                    <div
                        className="w-8 h-8 rounded"
                        style={{
                            backgroundColor: `hsl(${colorValue.h}deg ${colorValue.s}% ${colorValue.l}% / ${colorValue.a})`
                        }}
                    />
                );
            }
            // ... other cases for typography, spacing, shadow, and border ...
            default:
                return null;
        }
    };

    const filteredTokens = useMemo(() => {
        return tokens.filter(token => {
            const matchesSearch = token.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || token.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [tokens, searchQuery, filterType]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterType(e.target.value as TokenType | 'all');
    }, []);

    return (
        <div className="sidebar-content theme">
            <h2 className="text-xl font-bold mb-4">Theme Editor</h2>

            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            {!projectId ? (
                <div className="text-center p-8">
                    <p className="text-gray-500">Project ID is required to manage design tokens.</p>
                </div>
            ) : (
                <>
                    <div className="mb-4 flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search tokens..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={handleFilterChange}
                            className="p-2 border rounded"
                        >
                            <option value="all">All Types</option>
                            {TOKEN_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <form onSubmit={handleSubmit} className="mb-8">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    {isEditing ? 'Edit Token' : 'Add New Token'}
                                </h3>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block mb-2">Token Name</label>
                                <input
                                    type="text"
                                    value={newToken.name}
                                    onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-2">Token Type</label>
                                <select
                                    value={newToken.type}
                                    onChange={(e) => handleTypeChange(e.target.value as TokenType)}
                                    className="w-full p-2 border rounded"
                                    disabled={isEditing}
                                >
                                    {TOKEN_TYPES.map(type => (
                                        <option key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {renderTokenEditor()}

                            <button
                                type="submit"
                                className="add-token px-4 py-2 rounded disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Processing...' : isEditing ? 'Update Token' : 'Add Token'}
                            </button>
                        </div>
                    </form>

                    {isLoading ? (
                        <div className="text-center p-8">
                            <p className="text-gray-500">Loading tokens...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredTokens.map(token => (
                                <div key={token.id} className="border p-4 rounded">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold">{token.name}</h3>
                                            <p className="text-sm text-gray-600">{token.type}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditToken(token)}
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDuplicateToken(token)}
                                                className="text-green-500 hover:text-green-700"
                                            >
                                                Duplicate
                                            </button>
                                            <button
                                                onClick={() => handleDeleteToken(token.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-2">
                                        {renderTokenPreview(token)}
                                    </div>
                                    <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
                                        {JSON.stringify(token.value, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 