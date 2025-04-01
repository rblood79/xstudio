import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../env/supabase.client';
import { useDesignTokens } from '../../hooks/useDesignTokens';
import { useThemeStore } from '../stores/themeStore';
import { ColorPicker } from './ColorPicker';
import { ColorSpectrum } from './ColorSpectrum';
import { ColorValue, TokenType, TokenValue, DesignToken } from '../../types/designTokens';

interface TokenState {
    name: string;
    type: TokenType;
    value: TokenValue;
}

interface ThemeColors {
    accent: ColorValue;
    gray: ColorValue;
    background: ColorValue;
}

interface TokenUpdate {
    name: string;
    value: ColorValue;
}

const defaultColors: ThemeColors = {
    accent: { h: 220, s: 90, l: 50, a: 1 },
    gray: { h: 220, s: 10, l: 50, a: 1 },
    background: { h: 0, s: 0, l: 100, a: 1 }
};

const TOKEN_TYPES = [
    'color',
    'typography',
    'spacing',
    'shadow',
    'border'
] as const;

const DEFAULT_VALUES: Record<TokenType, TokenValue> = {
    color: { h: 210, s: 100, l: 50, a: 1 },
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

interface ThemeEditorProps {
    projectId: string;
}

export default function ThemeEditor({ projectId }: ThemeEditorProps) {
    const { tokens = [], updateToken } = useDesignTokens(projectId) || {};
    const { updateIframeStyles, setProjectId, fetchTokens } = useThemeStore();
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
    const [mode, setMode] = useState<'light' | 'dark'>('light');
    const [colors, setColors] = useState<ThemeColors>(defaultColors);

    // Memoize fetchTokens call
    const fetchTokensForProject = useCallback(() => {
        if (projectId) {
            fetchTokens(projectId);
        }
    }, [projectId, fetchTokens]);

    // Memoize project ID setting
    const initializeProject = useCallback(() => {
        if (projectId) {
            setProjectId(projectId);
            fetchTokensForProject();
        }
    }, [projectId, setProjectId, fetchTokensForProject]);

    // Initialize project only once when mounted or when project ID changes
    useEffect(() => {
        initializeProject();
    }, [initializeProject]);

    // Memoize styles update
    const updateStyles = useCallback(() => {
        if (tokens && tokens.length > 0) {
            updateIframeStyles();
        }
    }, [tokens, updateIframeStyles]);

    // Update styles when tokens change
    useEffect(() => {
        updateStyles();
    }, [updateStyles]);

    const handleTypeChange = (type: TokenType) => {
        setNewToken({
            name: '',
            type,
            value: DEFAULT_VALUES[type]
        });
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

    const handleColorChange = useCallback((key: keyof ThemeColors) => (color: ColorValue) => {
        setColors(prev => ({
            ...prev,
            [key]: color
        }));

        // Update corresponding design tokens
        const tokenUpdates = generateTokenUpdates(key, color);
        tokenUpdates.forEach(({ name, value }) => {
            updateToken?.(name, { type: 'color', value });
        });
    }, [updateToken]);

    // Generate token updates based on color changes
    const generateTokenUpdates = (key: keyof ThemeColors, color: ColorValue): TokenUpdate[] => {
        const baseTokens: Record<keyof ThemeColors, string[]> = {
            accent: ['primary', 'secondary', 'accent'],
            gray: ['gray', 'neutral', 'text'],
            background: ['background', 'surface']
        };

        const tokenNames = baseTokens[key] || [];
        return tokenNames.map(name => ({
            name,
            value: color
        }));
    };

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

            await fetchTokens(projectId);
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
        if (!projectId) return;

        const { error } = await supabase
            .from('design_tokens')
            .delete()
            .eq('id', tokenId);

        if (error) {
            console.error('Error deleting token:', error);
            return;
        }

        await fetchTokens(projectId);
    };

    const renderTokenEditor = useCallback(() => {
        switch (newToken.type) {
            case 'color':
                return (
                    <ColorPicker
                        label="Color"
                        value={newToken.value as ColorValue}
                        onChange={handleColorChange(newToken.type as keyof ThemeColors)}
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
                        className="w-8 h-8 rounded color-preview"
                        data-h={`${colorValue.h}deg`}
                        data-s={`${colorValue.s}%`}
                        data-l={`${colorValue.l}%`}
                        data-a={colorValue.a}
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
        <div className="theme-editor theme">
            <h2 className="text-2xl font-semibold mb-4">Theme Editor</h2>

            <div className="flex gap-4 mb-8">
                <button
                    className={`px-4 py-2 rounded-md transition-colors ${mode === 'light'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    onClick={() => setMode('light')}
                >
                    Light Mode
                </button>
                <button
                    className={`px-4 py-2 rounded-md transition-colors ${mode === 'dark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    onClick={() => setMode('dark')}
                >
                    Dark Mode
                </button>
            </div>

            <div className="grid gap-8 mb-8">
                <div className="color-section">
                    <h3 className="text-lg font-medium mb-4">Primary Colors</h3>
                    <div className="flex flex-row gap-8">
                        <ColorPicker
                            label="Accent Color"
                            value={colors.accent}
                            onChange={handleColorChange('accent')}
                        />
                        <ColorPicker
                            label="Gray Scale"
                            value={colors.gray}
                            onChange={handleColorChange('gray')}
                        />
                        <ColorPicker
                            label="Background"
                            value={colors.background}
                            onChange={handleColorChange('background')}
                        />
                    </div>
                </div>

                <div className="preview-section">
                    <h3 className="text-lg font-medium mb-4">Color Preview</h3>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <ColorSpectrum colors={colors} mode={mode} />
                    </div>
                </div>
            </div>

            <div className="tokens-section">
                <h3 className="text-xl font-bold mb-4">Design Tokens</h3>

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
                                aria-label="Filter token type"
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
                                        aria-label="Token name"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2">Token Type</label>
                                    <select
                                        value={newToken.type}
                                        onChange={(e) => handleTypeChange(e.target.value as TokenType)}
                                        className="w-full p-2 border rounded"
                                        disabled={isEditing}
                                        aria-label="Token type"
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
        </div>
    );
} 