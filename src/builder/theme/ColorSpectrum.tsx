import React, { CSSProperties } from 'react';
import { ColorValue } from '../../types/designTokens';
import { LegacyThemeColors, TailwindColorName } from '../../types/theme';

interface ExtendedCSSProperties extends CSSProperties {
    '--tw-ring-color'?: string;
}

interface ColorSpectrumProps {
    colors: LegacyThemeColors;
    onChange: (colors: LegacyThemeColors) => void;
}

// Tailwind 색상 정의 (-500 기준색)
const TAILWIND_COLORS: Record<TailwindColorName, ColorValue> = {

    red: { h: 0, s: 84, l: 60, a: 1 },
    orange: { h: 24, s: 95, l: 53, a: 1 },
    amber: { h: 38, s: 92, l: 50, a: 1 },
    yellow: { h: 48, s: 96, l: 48, a: 1 },
    lime: { h: 84, s: 86, l: 44, a: 1 },
    green: { h: 142, s: 76, l: 36, a: 1 },
    emerald: { h: 160, s: 84, l: 39, a: 1 },
    teal: { h: 172, s: 66, l: 45, a: 1 },
    cyan: { h: 186, s: 94, l: 41, a: 1 },
    sky: { h: 199, s: 89, l: 48, a: 1 },
    blue: { h: 217, s: 91, l: 60, a: 1 },
    indigo: { h: 234, s: 89, l: 74, a: 1 },
    violet: { h: 250, s: 89, l: 65, a: 1 },
    purple: { h: 271, s: 91, l: 65, a: 1 },
    fuchsia: { h: 292, s: 84, l: 60, a: 1 },
    pink: { h: 330, s: 81, l: 60, a: 1 },
    rose: { h: 350, s: 89, l: 60, a: 1 },
    slate: { h: 215, s: 16, l: 47, a: 1 },
    gray: { h: 220, s: 9, l: 46, a: 1 },
    zinc: { h: 240, s: 5, l: 46, a: 1 },
    neutral: { h: 0, s: 0, l: 46, a: 1 },
    stone: { h: 25, s: 5, l: 45, a: 1 }
};

function colorToHsl(color: ColorValue): string {
    return `hsl(${color.h}deg ${color.s}% ${color.l}% / ${color.a})`;
}

export const ColorSpectrum: React.FC<ColorSpectrumProps> = ({ colors, onChange }) => {
    const handleColorChange = (color: ColorValue) => {
        onChange({
            accent: color,
        });
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        // Convert hex to HSL
        const r = parseInt(color.substr(1, 2), 16) / 255;
        const g = parseInt(color.substr(3, 2), 16) / 255;
        const b = parseInt(color.substr(5, 2), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        handleColorChange({
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
            a: 1
        });
    };

    const hslToHex = (h: number, s: number, l: number): string => {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
        const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
        const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    };

    const themeColor = colorToHsl(colors.accent);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium mb-4">Theme Color</h3>
                <div className="grid grid-cols-8 gap-4 mb-4">
                    {Object.entries(TAILWIND_COLORS).map(([name, color]) => (
                        <div key={name} className="flex flex-col items-center gap-2">
                            <button
                                className="w-8 h-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                style={{
                                    backgroundColor: `hsl(${color.h}deg ${color.s}% ${color.l}% / ${color.a})`,
                                }}
                                onClick={() => handleColorChange(color)}
                                title={name}
                            />
                            <span className="text-xs text-gray-600 capitalize">{name}</span>
                        </div>
                    ))}
                    <div className="flex flex-col items-center gap-2">
                        <input
                            type="color"
                            className="w-8 h-8 rounded-lg cursor-pointer"
                            onChange={handleCustomColorChange}
                            value={hslToHex(colors.accent.h, colors.accent.s, colors.accent.l)}
                        />
                        <span className="text-xs text-gray-600">Custom</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium mb-6">UI Preview</h3>
                <div className="space-y-8">
                    {/* 버튼 섹션 */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">Buttons</h4>
                        <div className="flex gap-4">
                            <button
                                className="px-4 py-2 rounded-md transition-all duration-200"
                                style={{
                                    backgroundColor: themeColor,
                                    color: 'white',
                                }}
                            >
                                Primary Button
                            </button>
                            <button
                                className="px-4 py-2 rounded-md border-2 transition-all duration-200"
                                style={{
                                    borderColor: themeColor,
                                    color: themeColor,
                                }}
                            >
                                Secondary Button
                            </button>
                        </div>
                    </div>

                    {/* 카드 섹션 */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">Cards</h4>
                        <div className="flex gap-4">
                            <div className="p-4 rounded-lg border border-gray-200 transition-shadow hover:shadow-md">
                                <h5 className="font-medium" style={{ color: themeColor }}>
                                    Card Title
                                </h5>
                                <p className="mt-2 text-sm text-gray-600">
                                    This is a sample card with theme color applied to its title.
                                </p>
                            </div>
                            <div
                                className="p-4 rounded-lg transition-shadow hover:shadow-md"
                                style={{
                                    backgroundColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 95% / ${colors.accent.a})`,
                                    borderColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 85% / ${colors.accent.a})`,
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                }}
                            >
                                <h5 className="font-medium" style={{ color: themeColor }}>
                                    Themed Card
                                </h5>
                                <p className="mt-2 text-sm" style={{ color: `hsl(${colors.accent.h}deg ${colors.accent.s}% 40% / ${colors.accent.a})` }}>
                                    This card uses different shades of the theme color.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 폼 요소 섹션 */}
                    <div>
                        <h4 className="text-sm font-medium mb-3">Form Elements</h4>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded"
                                    style={{
                                        accentColor: themeColor,
                                    }}
                                />
                                <input
                                    type="radio"
                                    className="w-4 h-4"
                                    style={{
                                        accentColor: themeColor,
                                    }}
                                />
                                <div className="flex-1">
                                    <input
                                        type="range"
                                        className="w-full"
                                        style={{
                                            accentColor: themeColor,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Text Input</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-md border transition-colors"
                                    placeholder="Enter text..."
                                    style={{
                                        borderColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 85% / ${colors.accent.a})`,
                                        '--tw-ring-color': themeColor,
                                    } as ExtendedCSSProperties}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Textarea</label>
                                <textarea
                                    className="w-full px-3 py-2 rounded-md border transition-colors"
                                    placeholder="Enter text..."
                                    rows={3}
                                    style={{
                                        borderColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 85% / ${colors.accent.a})`,
                                        '--tw-ring-color': themeColor,
                                    } as ExtendedCSSProperties}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Select</label>
                                <select
                                    className="w-full px-3 py-2 rounded-md border transition-colors appearance-none bg-white"
                                    style={{
                                        borderColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 85% / ${colors.accent.a})`,
                                        '--tw-ring-color': themeColor,
                                    } as ExtendedCSSProperties}
                                >
                                    <option>Option 1</option>
                                    <option>Option 2</option>
                                    <option>Option 3</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div
                                        className="w-11 h-6 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                                        style={{
                                            backgroundColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 90% / ${colors.accent.a})`,
                                        }}
                                    />
                                </label>
                                <span className="text-sm">Toggle Switch</span>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Progress</label>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            width: '60%',
                                            backgroundColor: themeColor,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Tags</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Tag 1', 'Tag 2', 'Tag 3'].map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-0.5 rounded-full text-sm"
                                            style={{
                                                backgroundColor: `hsl(${colors.accent.h}deg ${colors.accent.s}% 95% / ${colors.accent.a})`,
                                                color: `hsl(${colors.accent.h}deg ${colors.accent.s}% 40% / ${colors.accent.a})`,
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};