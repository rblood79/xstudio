import React from 'react';
import { TailwindColorName } from '../../types/theme';

import { Button, ToggleButton, ToggleButtonGroup } from 'react-aria-components';

interface ColorSpectrumProps {
    selectedColor: TailwindColorName | 'custom';
    onChange: (colorName: TailwindColorName | 'custom') => void;
    onCustomColorChange?: (color: string) => void;
    customColor?: string;
}

const COLORS: (TailwindColorName | 'custom')[] = [
    'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
    'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
    'fuchsia', 'pink', 'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone',
    'custom'
];

const colorScale: Record<string, string> = {
    'slate-50': '#f8fafc',
    'slate-100': '#f1f5f9',
    'slate-200': '#e2e8f0',
    'slate-300': '#cbd5e1',
    'slate-400': '#94a3b8',
    'slate-500': '#64748b',
    'slate-600': '#475569',
    'slate-700': '#334155',
    'slate-800': '#1e293b',
    'slate-900': '#0f172a',
    'slate-950': '#020617',
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'gray-200': '#e5e7eb',
    'gray-300': '#d1d5db',
    'gray-400': '#9ca3af',
    'gray-500': '#6b7280',
    'gray-600': '#4b5563',
    'gray-700': '#374151',
    'gray-800': '#1f2937',
    'gray-900': '#111827',
    'gray-950': '#030712',
    'zinc-50': '#fafafa',
    'zinc-100': '#f4f4f5',
    'zinc-200': '#e4e4e7',
    'zinc-300': '#d4d4d8',
    'zinc-400': '#a1a1aa',
    'zinc-500': '#71717a',
    'zinc-600': '#52525b',
    'zinc-700': '#3f3f46',
    'zinc-800': '#27272a',
    'zinc-900': '#18181b',
    'zinc-950': '#09090b',
    'neutral-50': '#fafafa',
    'neutral-100': '#f5f5f5',
    'neutral-200': '#e5e5e5',
    'neutral-300': '#d4d4d4',
    'neutral-400': '#a3a3a3',
    'neutral-500': '#737373',
    'neutral-600': '#525252',
    'neutral-700': '#404040',
    'neutral-800': '#262626',
    'neutral-900': '#171717',
    'neutral-950': '#0a0a0a',
    'stone-50': '#fafaf9',
    'stone-100': '#f5f5f4',
    'stone-200': '#e7e5e4',
    'stone-300': '#d6d3d1',
    'stone-400': '#a8a29e',
    'stone-500': '#78716c',
    'stone-600': '#57534e',
    'stone-700': '#44403c',
    'stone-800': '#292524',
    'stone-900': '#1c1917',
    'stone-950': '#0c0a09',
    'red-50': '#fef2f2',
    'red-100': '#fee2e2',
    'red-200': '#fecaca',
    'red-300': '#fca5a5',
    'red-400': '#f87171',
    'red-500': '#ef4444',
    'red-600': '#dc2626',
    'red-700': '#b91c1c',
    'red-800': '#991b1b',
    'red-900': '#7f1d1d',
    'red-950': '#450a0a',
    'orange-50': '#fff7ed',
    'orange-100': '#ffedd5',
    'orange-200': '#fed7aa',
    'orange-300': '#fdba74',
    'orange-400': '#fb923c',
    'orange-500': '#f97316',
    'orange-600': '#ea580c',
    'orange-700': '#c2410c',
    'orange-800': '#9a3412',
    'orange-900': '#7c2d12',
    'orange-950': '#431407',
    'amber-50': '#fffbeb',
    'amber-100': '#fef3c7',
    'amber-200': '#fde68a',
    'amber-300': '#fcd34d',
    'amber-400': '#fbbf24',
    'amber-500': '#f59e0b',
    'amber-600': '#d97706',
    'amber-700': '#b45309',
    'amber-800': '#92400e',
    'amber-900': '#78350f',
    'amber-950': '#451a03',
    'yellow-50': '#fefce8',
    'yellow-100': '#fef9c3',
    'yellow-200': '#fef08a',
    'yellow-300': '#fde047',
    'yellow-400': '#facc15',
    'yellow-500': '#eab308',
    'yellow-600': '#ca8a04',
    'yellow-700': '#a16207',
    'yellow-800': '#854d0e',
    'yellow-900': '#713f12',
    'yellow-950': '#422006',
    'lime-50': '#f7fee7',
    'lime-100': '#ecfccb',
    'lime-200': '#d9f99d',
    'lime-300': '#bef264',
    'lime-400': '#a3e635',
    'lime-500': '#84cc16',
    'lime-600': '#65a30d',
    'lime-700': '#4d7c0f',
    'lime-800': '#3f6212',
    'lime-900': '#365314',
    'lime-950': '#1a2e05',
    'green-50': '#f0fdf4',
    'green-100': '#dcfce7',
    'green-200': '#bbf7d0',
    'green-300': '#86efac',
    'green-400': '#4ade80',
    'green-500': '#22c55e',
    'green-600': '#16a34a',
    'green-700': '#15803d',
    'green-800': '#166534',
    'green-900': '#14532d',
    'green-950': '#052e16',
    'emerald-50': '#ecfdf5',
    'emerald-100': '#d1fae5',
    'emerald-200': '#a7f3d0',
    'emerald-300': '#6ee7b7',
    'emerald-400': '#34d399',
    'emerald-500': '#10b981',
    'emerald-600': '#059669',
    'emerald-700': '#047857',
    'emerald-800': '#065f46',
    'emerald-900': '#064e3b',
    'emerald-950': '#022c22',
    'teal-50': '#f0fdfa',
    'teal-100': '#ccfbf1',
    'teal-200': '#99f6e4',
    'teal-300': '#5eead4',
    'teal-400': '#2dd4bf',
    'teal-500': '#14b8a6',
    'teal-600': '#0d9488',
    'teal-700': '#0f766e',
    'teal-800': '#115e59',
    'teal-900': '#134e4a',
    'teal-950': '#042f2e',
    'cyan-50': '#ecfeff',
    'cyan-100': '#cffafe',
    'cyan-200': '#a5f3fc',
    'cyan-300': '#67e8f9',
    'cyan-400': '#22d3ee',
    'cyan-500': '#06b6d4',
    'cyan-600': '#0891b2',
    'cyan-700': '#0e7490',
    'cyan-800': '#155e75',
    'cyan-900': '#164e63',
    'cyan-950': '#083344',
    'sky-50': '#f0f9ff',
    'sky-100': '#e0f2fe',
    'sky-200': '#bae6fd',
    'sky-300': '#7dd3fc',
    'sky-400': '#38bdf8',
    'sky-500': '#0ea5e9',
    'sky-600': '#0284c7',
    'sky-700': '#0369a1',
    'sky-800': '#075985',
    'sky-900': '#0c4a6e',
    'sky-950': '#082f49',
    'blue-50': '#eff6ff',
    'blue-100': '#dbeafe',
    'blue-200': '#bfdbfe',
    'blue-300': '#93c5fd',
    'blue-400': '#60a5fa',
    'blue-500': '#3b82f6',
    'blue-600': '#2563eb',
    'blue-700': '#1d4ed8',
    'blue-800': '#1e40af',
    'blue-900': '#1e3a8a',
    'blue-950': '#172554',
    'indigo-50': '#eef2ff',
    'indigo-100': '#e0e7ff',
    'indigo-200': '#c7d2fe',
    'indigo-300': '#a5b4fc',
    'indigo-400': '#818cf8',
    'indigo-500': '#6366f1',
    'indigo-600': '#4f46e5',
    'indigo-700': '#4338ca',
    'indigo-800': '#3730a3',
    'indigo-900': '#312e81',
    'indigo-950': '#1e1b4b',
    'violet-50': '#f5f3ff',
    'violet-100': '#ede9fe',
    'violet-200': '#ddd6fe',
    'violet-300': '#c4b5fd',
    'violet-400': '#a78bfa',
    'violet-500': '#8b5cf6',
    'violet-600': '#7c3aed',
    'violet-700': '#6d28d9',
    'violet-800': '#5b21b6',
    'violet-900': '#4c1d95',
    'violet-950': '#2e1065',
    'purple-50': '#faf5ff',
    'purple-100': '#f3e8ff',
    'purple-200': '#e9d5ff',
    'purple-300': '#d8b4fe',
    'purple-400': '#c084fc',
    'purple-500': '#a855f7',
    'purple-600': '#9333ea',
    'purple-700': '#7e22ce',
    'purple-800': '#6b21a8',
    'purple-900': '#581c87',
    'purple-950': '#3b0764',
    'fuchsia-50': '#fdf4ff',
    'fuchsia-100': '#fae8ff',
    'fuchsia-200': '#f5d0fe',
    'fuchsia-300': '#f0abfc',
    'fuchsia-400': '#e879f9',
    'fuchsia-500': '#d946ef',
    'fuchsia-600': '#c026d3',
    'fuchsia-700': '#a21caf',
    'fuchsia-800': '#86198f',
    'fuchsia-900': '#701a75',
    'fuchsia-950': '#4a044e',
    'pink-50': '#fdf2f8',
    'pink-100': '#fce7f3',
    'pink-200': '#fbcfe8',
    'pink-300': '#f9a8d4',
    'pink-400': '#f472b6',
    'pink-500': '#ec4899',
    'pink-600': '#db2777',
    'pink-700': '#be185d',
    'pink-800': '#9d174d',
    'pink-900': '#831843',
    'pink-950': '#500724',
    'rose-50': '#fff1f2',
    'rose-100': '#ffe4e6',
    'rose-200': '#fecdd3',
    'rose-300': '#fda4af',
    'rose-400': '#fb7185',
    'rose-500': '#f43f5e',
    'rose-600': '#e11d48',
    'rose-700': '#be123c',
    'rose-800': '#9f1239',
    'rose-900': '#881337',
    'rose-950': '#4c0519'
};

const colorClasses: Record<TailwindColorName | 'custom', {
    bg: string;
    hover: string;
    ring: string;
    text: string;
    border: string;
    bgLight: string;
    borderLight: string;
    textDark: string;
}> = {
    red: {
        bg: 'bg-red-500',
        hover: 'hover:bg-red-600',
        ring: 'ring-red-200',
        text: 'text-red-600',
        border: 'border-red-500',
        bgLight: 'bg-red-50',
        borderLight: 'border-red-200',
        textDark: 'text-red-700'
    },
    orange: {
        bg: 'bg-orange-500',
        hover: 'hover:bg-orange-600',
        ring: 'ring-orange-200',
        text: 'text-orange-600',
        border: 'border-orange-500',
        bgLight: 'bg-orange-50',
        borderLight: 'border-orange-200',
        textDark: 'text-orange-700'
    },
    amber: {
        bg: 'bg-amber-500',
        hover: 'hover:bg-amber-600',
        ring: 'ring-amber-200',
        text: 'text-amber-600',
        border: 'border-amber-500',
        bgLight: 'bg-amber-50',
        borderLight: 'border-amber-200',
        textDark: 'text-amber-700'
    },
    yellow: {
        bg: 'bg-yellow-500',
        hover: 'hover:bg-yellow-600',
        ring: 'ring-yellow-200',
        text: 'text-yellow-600',
        border: 'border-yellow-500',
        bgLight: 'bg-yellow-50',
        borderLight: 'border-yellow-200',
        textDark: 'text-yellow-700'
    },
    lime: {
        bg: 'bg-lime-500',
        hover: 'hover:bg-lime-600',
        ring: 'ring-lime-200',
        text: 'text-lime-600',
        border: 'border-lime-500',
        bgLight: 'bg-lime-50',
        borderLight: 'border-lime-200',
        textDark: 'text-lime-700'
    },
    green: {
        bg: 'bg-green-500',
        hover: 'hover:bg-green-600',
        ring: 'ring-green-200',
        text: 'text-green-600',
        border: 'border-green-500',
        bgLight: 'bg-green-50',
        borderLight: 'border-green-200',
        textDark: 'text-green-700'
    },
    emerald: {
        bg: 'bg-emerald-500',
        hover: 'hover:bg-emerald-600',
        ring: 'ring-emerald-200',
        text: 'text-emerald-600',
        border: 'border-emerald-500',
        bgLight: 'bg-emerald-50',
        borderLight: 'border-emerald-200',
        textDark: 'text-emerald-700'
    },
    teal: {
        bg: 'bg-teal-500',
        hover: 'hover:bg-teal-600',
        ring: 'ring-teal-200',
        text: 'text-teal-600',
        border: 'border-teal-500',
        bgLight: 'bg-teal-50',
        borderLight: 'border-teal-200',
        textDark: 'text-teal-700'
    },
    cyan: {
        bg: 'bg-cyan-500',
        hover: 'hover:bg-cyan-600',
        ring: 'ring-cyan-200',
        text: 'text-cyan-600',
        border: 'border-cyan-500',
        bgLight: 'bg-cyan-50',
        borderLight: 'border-cyan-200',
        textDark: 'text-cyan-700'
    },
    sky: {
        bg: 'bg-sky-500',
        hover: 'hover:bg-sky-600',
        ring: 'ring-sky-200',
        text: 'text-sky-600',
        border: 'border-sky-500',
        bgLight: 'bg-sky-50',
        borderLight: 'border-sky-200',
        textDark: 'text-sky-700'
    },
    blue: {
        bg: 'bg-blue-500',
        hover: 'hover:bg-blue-600',
        ring: 'ring-blue-200',
        text: 'text-blue-600',
        border: 'border-blue-500',
        bgLight: 'bg-blue-50',
        borderLight: 'border-blue-200',
        textDark: 'text-blue-700'
    },
    indigo: {
        bg: 'bg-indigo-500',
        hover: 'hover:bg-indigo-600',
        ring: 'ring-indigo-200',
        text: 'text-indigo-600',
        border: 'border-indigo-500',
        bgLight: 'bg-indigo-50',
        borderLight: 'border-indigo-200',
        textDark: 'text-indigo-700'
    },
    violet: {
        bg: 'bg-violet-500',
        hover: 'hover:bg-violet-600',
        ring: 'ring-violet-200',
        text: 'text-violet-600',
        border: 'border-violet-500',
        bgLight: 'bg-violet-50',
        borderLight: 'border-violet-200',
        textDark: 'text-violet-700'
    },
    purple: {
        bg: 'bg-purple-500',
        hover: 'hover:bg-purple-600',
        ring: 'ring-purple-200',
        text: 'text-purple-600',
        border: 'border-purple-500',
        bgLight: 'bg-purple-50',
        borderLight: 'border-purple-200',
        textDark: 'text-purple-700'
    },
    fuchsia: {
        bg: 'bg-fuchsia-500',
        hover: 'hover:bg-fuchsia-600',
        ring: 'ring-fuchsia-200',
        text: 'text-fuchsia-600',
        border: 'border-fuchsia-500',
        bgLight: 'bg-fuchsia-50',
        borderLight: 'border-fuchsia-200',
        textDark: 'text-fuchsia-700'
    },
    pink: {
        bg: 'bg-pink-500',
        hover: 'hover:bg-pink-600',
        ring: 'ring-pink-200',
        text: 'text-pink-600',
        border: 'border-pink-500',
        bgLight: 'bg-pink-50',
        borderLight: 'border-pink-200',
        textDark: 'text-pink-700'
    },
    rose: {
        bg: 'bg-rose-500',
        hover: 'hover:bg-rose-600',
        ring: 'ring-rose-200',
        text: 'text-rose-600',
        border: 'border-rose-500',
        bgLight: 'bg-rose-50',
        borderLight: 'border-rose-200',
        textDark: 'text-rose-700'
    },
    slate: {
        bg: 'bg-slate-500',
        hover: 'hover:bg-slate-600',
        ring: 'ring-slate-200',
        text: 'text-slate-600',
        border: 'border-slate-500',
        bgLight: 'bg-slate-50',
        borderLight: 'border-slate-200',
        textDark: 'text-slate-700'
    },
    gray: {
        bg: 'bg-gray-500',
        hover: 'hover:bg-gray-600',
        ring: 'ring-gray-200',
        text: 'text-gray-600',
        border: 'border-gray-500',
        bgLight: 'bg-gray-50',
        borderLight: 'border-gray-200',
        textDark: 'text-gray-700'
    },
    zinc: {
        bg: 'bg-zinc-500',
        hover: 'hover:bg-zinc-600',
        ring: 'ring-zinc-200',
        text: 'text-zinc-600',
        border: 'border-zinc-500',
        bgLight: 'bg-zinc-50',
        borderLight: 'border-zinc-200',
        textDark: 'text-zinc-700'
    },
    neutral: {
        bg: 'bg-neutral-500',
        hover: 'hover:bg-neutral-600',
        ring: 'ring-neutral-200',
        text: 'text-neutral-600',
        border: 'border-neutral-500',
        bgLight: 'bg-neutral-50',
        borderLight: 'border-neutral-200',
        textDark: 'text-neutral-700'
    },
    stone: {
        bg: 'bg-stone-500',
        hover: 'hover:bg-stone-600',
        ring: 'ring-stone-200',
        text: 'text-stone-600',
        border: 'border-stone-500',
        bgLight: 'bg-stone-50',
        borderLight: 'border-stone-200',
        textDark: 'text-stone-700'
    },
    custom: {
        bg: 'bg-custom-500',
        hover: 'hover:bg-custom-600',
        ring: 'ring-custom-200',
        text: 'text-custom-600',
        border: 'border-custom-500',
        bgLight: 'bg-custom-50',
        borderLight: 'border-custom-200',
        textDark: 'text-custom-700'
    }
};

const STYLE_ELEMENT_ID = 'theme-tokens';

export const ColorSpectrum: React.FC<ColorSpectrumProps> = ({
    selectedColor,
    onChange,
    onCustomColorChange,
    customColor = '#3B82F6' // default to blue-500
}) => {
    const updateCustomProperties = React.useCallback((color: string) => {
        // Get or create style element
        let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ELEMENT_ID;
            document.head.appendChild(styleEl);
        }

        if (color === 'custom') {
            const hsl = hexToHSL(customColor);
            const shades = [
                { name: '50', l: 0.97 },
                { name: '100', l: 0.94 },
                { name: '200', l: 0.86 },
                { name: '300', l: 0.76 },
                { name: '400', l: 0.66 },
                { name: '500', l: 0.56 },
                { name: '600', l: 0.46 },
                { name: '700', l: 0.36 },
                { name: '800', l: 0.26 },
                { name: '900', l: 0.16 },
                { name: '950', l: 0.11 },
            ];

            const cssVariables = shades
                .map(({ name, l }) =>
                    `  --color-primary-${name}: hsl(${hsl.h} ${hsl.s}% ${l * 100}%);`
                )
                .join('\n');

            styleEl.textContent = `:root {\n${cssVariables}\n}\n.theme-editor {\n${cssVariables}\n}`;
        } else {
            // Get the selected color's HEX value
            const colorName = color.split('-')[0];
            const colorValue = color.split('-')[1] || '500';
            const selectedColorHex = colorScale[`${colorName}-${colorValue}`] || colorScale[`${colorName}-500`] || '#3B82F6';

            if (!selectedColorHex) {
                console.error(`Color not found: ${colorName}-${colorValue}`);
                return;
            }

            const hsl = hexToHSL(selectedColorHex);

            const shades = [
                { name: '50', l: 0.97 },
                { name: '100', l: 0.94 },
                { name: '200', l: 0.86 },
                { name: '300', l: 0.76 },
                { name: '400', l: 0.66 },
                { name: '500', l: 0.56 },
                { name: '600', l: 0.46 },
                { name: '700', l: 0.36 },
                { name: '800', l: 0.26 },
                { name: '900', l: 0.16 },
                { name: '950', l: 0.11 },
            ];

            const cssVariables = shades
                .map(({ name, l }) =>
                    `  --color-primary-${name}: hsl(${hsl.h} ${hsl.s}% ${l * 100}%);`
                )
                .join('\n');

            styleEl.textContent = `:root {\n${cssVariables}\n}\n.theme-editor {\n${cssVariables}\n}`;
        }
    }, [customColor]);

    React.useEffect(() => {
        updateCustomProperties(selectedColor);
    }, [selectedColor, customColor, updateCustomProperties]);

    return (
        <div className="space-y-8">
            <div className="preview-container">
                <h3 className="preview-title">Theme Color</h3>
                <div className="preview-content">
                    <div className="category-container">
                        <h4 className="category-title">Theme Color</h4>
                        <div className="category-content color-content">
                            {COLORS.map((color) => {
                                const classes = colorClasses[color];
                                return (
                                    <div key={color} className="flex flex-col items-center gap-2 relative">
                                        {color === 'custom' ? (
                                            <>
                                                <Button
                                                    onPress={() => onChange(color)}
                                                    className={`w-8 h-8 rounded-lg shadow-sm transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-primary-200' : ''}`}
                                                    style={{
                                                        backgroundColor: customColor
                                                    }}
                                                    aria-label="Select Primary color"
                                                />
                                                <input
                                                    type="color"
                                                    value={customColor}
                                                    onChange={(e) => {
                                                        onCustomColorChange?.(e.target.value);
                                                        onChange('custom');
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    title="Primary color picker"
                                                    aria-label="Primary color picker"
                                                />
                                            </>
                                        ) : (
                                            <Button
                                                onPress={() => onChange(color)}
                                                className={`w-8 h-8 rounded-lg shadow-sm transition-all ${classes.bg} ${classes.hover} ${selectedColor === color ? 'ring-2 ring-offset-2 ' + classes.ring : ''}`}
                                                aria-label={`Select ${color} color`}
                                            />
                                        )}
                                        <span className="text-xs text-gray-600 capitalize">{color === 'custom' ? 'Primary' : color}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="preview-container">
                <h3 className="preview-title">UI Preview</h3>
                <div className="preview-content">

                    <div className="category-container">
                        <h4 className="category-title">Buttons</h4>
                        <div className="category-content">
                            <Button className={`button`}>Primary Button</Button>
                            <Button className={`button-line`}>Secondary Button</Button>

                            <ToggleButton className="toggle">
                                ToggleButton
                            </ToggleButton>

                            <ToggleButtonGroup aria-label="Text style" className="toggleGroup">
                                <ToggleButton id="bold" className="toggle">
                                    Bold
                                </ToggleButton>
                                <ToggleButton id="italic" className="toggle">
                                    Italic
                                </ToggleButton>
                                <ToggleButton id="underline" className="toggle">
                                    Underline
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </div>
                    </div>

                    <div className="category-container">
                        <h4 className="category-title">Cards</h4>
                        <div className="category-content">
                            <div
                                className={`p-4 rounded-lg border transition-shadow hover:shadow-md ${selectedColor === 'custom' ? 'border-primary-200' : colorClasses[selectedColor].borderLight}`}
                            >
                                <h5
                                    className={selectedColor === 'custom' ? 'text-primary-600' : colorClasses[selectedColor].text}
                                >
                                    Card Title
                                </h5>
                                <p className="mt-2 text-sm text-gray-600">
                                    This is a sample card with theme color applied.
                                </p>
                            </div>
                            <div
                                className={`p-4 rounded-lg ${selectedColor === 'custom' ? 'bg-primary-50' : colorClasses[selectedColor].bgLight} border ${selectedColor === 'custom' ? 'border-primary-200' : colorClasses[selectedColor].borderLight}`}
                            >
                                <h5
                                    className={selectedColor === 'custom' ? 'text-primary-700' : colorClasses[selectedColor].textDark}
                                >
                                    Themed Card
                                </h5>
                                <p
                                    className={`mt-2 text-sm ${selectedColor === 'custom' ? 'text-primary-600' : colorClasses[selectedColor].text}`}
                                >
                                    This card uses different shades of the theme color.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Utility function to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Remove the hash if it exists
    hex = hex.replace(/^#/, '');

    // Parse the hex values
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h *= 60;
    }

    return { h, s: s * 100, l: l };
}