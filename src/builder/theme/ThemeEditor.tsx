import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

// 새로운 인터페이스 추가
interface ScaleColor {
    scale: number;
    value: ColorValue;
    alpha?: number; // Optional alpha property
}

interface ColorScale {
    base: ColorValue;
    steps: ScaleColor[];
}

interface ThemeColorScales {
    accent: ColorScale;
    gray: ColorScale;
    background: ColorScale;
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
    // UI 표시용 색상 상태 추가
    const [displayColors, setDisplayColors] = useState<ThemeColors>(defaultColors);
    const [colorScales, setColorScales] = useState<ThemeColorScales>({
        accent: { base: defaultColors.accent, steps: [] },
        gray: { base: defaultColors.gray, steps: [] },
        background: { base: defaultColors.background, steps: [] }
    });

    // 디바운싱을 위한 타이머 참조 추가
    const updateTokenTimerRef = useRef<NodeJS.Timeout | null>(null);
    // 배경색 변경 후 액센트 색상 자동 업데이트를 방지하기 위한 플래그
    const isBackgroundChangeRef = useRef<boolean>(false);

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

    // 색상 스케일 생성 함수 추가
    const generateColorScale = useCallback((baseColor: ColorValue, steps: number = 12, isDark: boolean = false): ScaleColor[] => {
        const scale: ScaleColor[] = [];

        // Radix UI 색상 스케일 로직
        // 각 단계별 용도:
        // 1: 미묘한 배경
        // 2: UI 요소 배경(카드, 입력)
        // 3: 호버 상태의 배경
        // 4: 활성/선택된 배경
        // 5: 구분선
        // 6: 미묘한 텍스트와 아이콘
        // 7: 저대비 텍스트
        // 8: 텍스트와 아이콘
        // 9: 높은 대비 텍스트
        // 10: 저채도 강조
        // 11: 강조
        // 12: 고채도 강조

        // 라이트 모드와 다크 모드에 따른 설정
        const config = isDark ? {
            // 다크 모드에서는 단계적으로 밝아짐
            lightnessStart: 10,  // 가장 어두운 단계(1)
            lightnessEnd: 95,    // 가장 밝은 단계(12)
            saturationMid: 1.5,  // 중간 단계 채도 배수
            saturationEnds: 0.7  // 시작과 끝 단계 채도 배수
        } : {
            // 라이트 모드에서는 단계적으로 어두워짐
            lightnessStart: 98,  // 가장 밝은 단계(1)
            lightnessEnd: 10,    // 가장 어두운 단계(12)
            saturationMid: 1.2,  // 중간 단계 채도 배수
            saturationEnds: 0.8  // 시작과 끝 단계 채도 배수
        };

        // 각 단계별 색상 생성
        for (let i = 1; i <= steps; i++) {
            // 밝기 계산 - 선형 보간으로 단계에 맞게 조정
            const progress = (i - 1) / (steps - 1);
            const lightness = config.lightnessStart + (config.lightnessEnd - config.lightnessStart) * progress;

            // 채도 계산 - 중간 단계에서 더 높은 채도
            const saturationCurve = Math.sin((i / steps) * Math.PI);
            const saturationMultiplier = config.saturationEnds + (config.saturationMid - config.saturationEnds) * saturationCurve;
            const saturation = Math.min(100, baseColor.s * saturationMultiplier);

            // 단계별 색상 생성
            const stepColor: ColorValue = {
                h: baseColor.h,
                s: saturation,
                l: lightness,
                a: baseColor.a
            };

            // 알파 변형 계산 (Radix에서 각 단계에 대한 알파 변형 제공)
            const alphaValue = isDark ?
                (i <= 6 ? 0.8 + (i * 0.03) : 0.9 + ((i - 6) * 0.01)) :
                (i <= 6 ? 0.1 + (i * 0.03) : 0.3 + ((i - 6) * 0.08));

            scale.push({
                scale: i,
                value: stepColor,
                alpha: alphaValue
            });
        }

        return scale;
    }, []);

    // 배경색 변경 시 액센트 색상 조정 함수
    const adjustAccentColorForBackground = useCallback((backgroundColor: ColorValue, isDark: boolean = false): ColorValue => {
        // Radix 스타일의 색상 조정

        // 배경 색상의 색조를 기반으로 액센트 색상 계산
        // 완전한 보색(180도) 대신, 조화로운 색상(30-60도 이동)으로 조정
        const hueShift = isDark ? 60 : 30;
        const harmonicHue = (backgroundColor.h + hueShift) % 360;

        // 배경이 무채색(낮은 채도)인 경우 기본 색상 사용
        const defaultHue = isDark ? 210 : 220; // 다크/라이트 모드 기본 액센트 색상
        const accentHue = backgroundColor.s < 10 ? defaultHue : harmonicHue;

        // 다크/라이트 모드에 맞는 밝기와 채도 설정
        const accentLightness = isDark ? 65 : 45;
        const accentSaturation = 85; // 항상 높은 채도 유지

        return {
            h: accentHue,
            s: accentSaturation,
            l: accentLightness,
            a: 1
        };
    }, []);

    // 색상 변경 시 스케일 자동 생성
    const handleColorChange = useCallback((key: keyof ThemeColors) => (color: ColorValue) => {
        // UI 표시용 색상 상태 먼저 업데이트 (즉각적인 반응)
        setDisplayColors(prev => ({
            ...prev,
            [key]: color
        }));

        // 배경색 변경 플래그 설정
        if (key === 'background') {
            isBackgroundChangeRef.current = true;
        }

        // 디바운싱을 위해 타이머 설정
        if (updateTokenTimerRef.current) {
            clearTimeout(updateTokenTimerRef.current);
        }

        updateTokenTimerRef.current = setTimeout(() => {
            // 실제 색상 상태 업데이트 및 관련 처리
            setColors(prev => {
                const isDark = mode === 'dark';

                // 배경색이 변경된 경우, 액센트 색상도 함께 조정 (내부 상태만)
                if (key === 'background') {
                    const newAccent = adjustAccentColorForBackground(color, isDark);

                    // 새로운 색상으로 업데이트
                    const updatedColors = {
                        ...prev,
                        [key]: color,
                        accent: newAccent
                    };

                    // 새로운 색상으로 스케일 생성
                    const accentSteps = generateColorScale(newAccent, 12, isDark);
                    const backgroundSteps = generateColorScale(color, 12, isDark);
                    const graySteps = generateColorScale(prev.gray, 12, isDark);

                    setColorScales(prevScales => ({
                        ...prevScales,
                        accent: {
                            base: newAccent,
                            steps: accentSteps
                        },
                        [key]: {
                            base: color,
                            steps: backgroundSteps
                        },
                        gray: {
                            base: prev.gray,
                            steps: graySteps
                        }
                    }));

                    // 토큰 업데이트
                    try {
                        const backgroundTokenUpdates = generateTokenUpdates(key, color, backgroundSteps);
                        const accentTokenUpdates = generateTokenUpdates('accent', newAccent, accentSteps);
                        const surfaceColor = {
                            ...color,
                            l: isDark ? color.l + 3 : color.l - 3, // Surface는 배경보다 약간 다름
                        };
                        const surfaceTokenUpdate = { name: 'surface', value: surfaceColor };

                        // 특수 토큰 업데이트 (Radix 시스템 기반)
                        const specialTokens = [
                            { name: 'indicator', value: accentSteps[7].value }, // 인디케이터는 액센트8 사용
                            { name: 'track', value: graySteps[3].value },       // 트랙은 그레이4 사용
                            surfaceTokenUpdate
                        ];

                        // 모든 토큰 업데이트 실행
                        [...backgroundTokenUpdates, ...accentTokenUpdates, ...specialTokens].forEach(({ name, value }) => {
                            updateToken?.(name, { type: 'color', value });
                        });
                    } catch (err) {
                        console.error('Token update failed:', err);
                        setError('토큰 업데이트 중 오류가 발생했습니다.');
                    }

                    // UI에 표시되는 액센트 색상도 업데이트 (배경색 변경 시에만)
                    if (isBackgroundChangeRef.current) {
                        setDisplayColors(prevDisplay => ({
                            ...prevDisplay,
                            accent: newAccent
                        }));
                        isBackgroundChangeRef.current = false;
                    }

                    return updatedColors;
                }

                // 기본 케이스 (배경색이 아닌 다른 색상이 변경된 경우)
                const updatedColors = {
                    ...prev,
                    [key]: color
                };

                // 스케일 생성 및 업데이트
                try {
                    const newSteps = generateColorScale(color, 12, isDark);
                    setColorScales(prevScales => ({
                        ...prevScales,
                        [key]: {
                            base: color,
                            steps: newSteps
                        }
                    }));

                    // 토큰 업데이트
                    const tokenUpdates = generateTokenUpdates(key, color, newSteps);
                    tokenUpdates.forEach(({ name, value }) => {
                        updateToken?.(name, { type: 'color', value });
                    });
                } catch (err) {
                    console.error('Token update failed:', err);
                    setError('토큰 업데이트 중 오류가 발생했습니다.');
                }

                return updatedColors;
            });
        }, 100); // 100ms 지연
    }, [updateToken, generateColorScale, adjustAccentColorForBackground, mode]);

    // Generate token updates based on color changes
    const generateTokenUpdates = (key: keyof ThemeColors, color: ColorValue, steps: ScaleColor[] = []): TokenUpdate[] => {
        const baseTokens: Record<keyof ThemeColors, string[]> = {
            accent: ['primary', 'secondary', 'accent'],
            gray: ['gray', 'neutral', 'text'],
            background: ['background', 'surface']
        };

        const updates: TokenUpdate[] = [];

        // 기본 토큰 업데이트
        const tokenNames = baseTokens[key] || [];
        tokenNames.forEach(name => {
            updates.push({
                name,
                value: color
            });
        });

        // 스케일 토큰 업데이트
        steps.forEach(step => {
            tokenNames.forEach(name => {
                updates.push({
                    name: `${name}${step.scale}`,
                    value: step.value
                });
            });
        });

        return updates;
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
                        onChange={(color) => {
                            setNewToken(prev => ({
                                ...prev,
                                value: color
                            }));
                        }}
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
    }, [newToken.type, newToken.value]);

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

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (updateTokenTimerRef.current) {
                clearTimeout(updateTokenTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="theme-editor">
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
                            value={displayColors.accent}
                            onChange={handleColorChange('accent')}
                        />
                        <ColorPicker
                            label="Gray Scale"
                            value={displayColors.gray}
                            onChange={handleColorChange('gray')}
                        />
                        <ColorPicker
                            label="Background"
                            value={displayColors.background}
                            onChange={handleColorChange('background')}
                        />
                    </div>
                </div>

                <div className="preview-section">
                    <h3 className="text-lg font-medium mb-4">Color Preview</h3>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <ColorSpectrum
                            colors={colors}
                            colorScales={colorScales}
                            mode={mode}
                        />
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