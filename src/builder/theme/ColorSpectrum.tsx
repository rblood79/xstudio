import React from 'react';
import { TailwindColorName } from '../../types/theme';

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
        const hsl = hexToHSL(color);

        // Generate 11 shades (50-950)
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

        // Create or update style element
        let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = STYLE_ELEMENT_ID;
            document.head.appendChild(styleEl);
        }

        const cssVariables = shades
            .map(({ name, l }) =>
                `  --color-custom-${name}: hsl(${hsl.h} ${hsl.s}% ${l * 100}%);`
            )
            .join('\n');

        styleEl.textContent = `:root {\n${cssVariables}\n}`;
    }, []);

    React.useEffect(() => {
        if (selectedColor === 'custom' && customColor) {
            updateCustomProperties(customColor);
        }
    }, [selectedColor, customColor, updateCustomProperties]);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium mb-4">Theme Color</h3>
                <div className="grid grid-cols-8 gap-4 mb-4">
                    {COLORS.map((color) => {
                        const classes = colorClasses[color];
                        return (
                            <div key={color} className="flex flex-col items-center gap-2">
                                {color === 'custom' ? (
                                    <div className="relative">
                                        <button
                                            onClick={() => onChange(color)}
                                            className={`w-8 h-8 rounded-lg shadow-sm transition-all ${classes.bg} ${classes.hover} ${selectedColor === color ? 'ring-2 ring-offset-2 ' + classes.ring : ''}`}
                                            style={{
                                                backgroundColor: customColor
                                            }}
                                        />
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => {
                                                onCustomColorChange?.(e.target.value);
                                                onChange('custom');
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onChange(color)}
                                        className={`w-8 h-8 rounded-lg shadow-sm transition-all ${classes.bg} ${classes.hover} ${selectedColor === color ? 'ring-2 ring-offset-2 ' + classes.ring : ''}`}
                                    />
                                )}
                                <span className="text-xs text-gray-600 capitalize">{color}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium mb-6">UI Preview</h3>
                <div className="space-y-8">
                    <div>
                        <h4 className="text-sm font-medium mb-3">Buttons</h4>
                        <div className="flex gap-4">
                            <button className={`px-4 py-2 rounded-md transition-colors ${colorClasses[selectedColor].bg} ${colorClasses[selectedColor].hover} text-white`}>
                                Primary Button
                            </button>
                            <button className={`px-4 py-2 rounded-md transition-colors border-2 ${colorClasses[selectedColor].border} ${colorClasses[selectedColor].text} ${colorClasses[selectedColor].bgLight}`}>
                                Secondary Button
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">Cards</h4>
                        <div className="flex gap-4">
                            <div className={`p-4 rounded-lg border transition-shadow hover:shadow-md ${colorClasses[selectedColor].borderLight}`}>
                                <h5 className={colorClasses[selectedColor].text}>
                                    Card Title
                                </h5>
                                <p className="mt-2 text-sm text-gray-600">
                                    This is a sample card with theme color applied.
                                </p>
                            </div>
                            <div className={`p-4 rounded-lg transition-shadow hover:shadow-md ${colorClasses[selectedColor].bgLight} border ${colorClasses[selectedColor].borderLight}`}>
                                <h5 className={colorClasses[selectedColor].textDark}>
                                    Themed Card
                                </h5>
                                <p className={`mt-2 text-sm ${colorClasses[selectedColor].text}`}>
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