import React from 'react';
import { ColorValue } from '../../types/designTokens';

interface ThemeColors {
    accent: ColorValue;
    gray: ColorValue;
    background: ColorValue;
}

interface ColorSpectrumProps {
    colors: ThemeColors;
    mode: 'light' | 'dark';
}

type ScaleStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface ColorScale {
    [key: number]: ColorValue;
}

interface ColorUsage {
    [key: number]: string;
}

interface Section {
    title: string;
    description: string;
    scale: ColorScale;
    usage: ColorUsage;
}

const LIGHTNESS_MAP = {
    light: {
        1: 98,   // Lightest background
        2: 95,   // Hover background
        3: 90,   // Active background
        4: 85,   // Subtle borders
        5: 80,   // UI element background
        6: 70,   // Low-contrast text
        7: 60,   // Medium-contrast text
        8: 50,   // High-contrast text
        9: 40,   // Emphasized UI elements
        10: 30,  // High-emphasis text
        11: 20,  // Bold text
        12: 10,  // Maximum contrast text
    },
    dark: {
        1: 10,   // Darkest background
        2: 15,   // Hover background
        3: 20,   // Active background
        4: 25,   // Subtle borders
        5: 30,   // UI element background
        6: 40,   // Low-contrast text
        7: 50,   // Medium-contrast text
        8: 60,   // High-contrast text
        9: 70,   // Emphasized UI elements
        10: 80,  // High-emphasis text
        11: 90,  // Bold text
        12: 95,  // Maximum contrast text
    }
};

const SATURATION_MAP = {
    accent: {
        1: 95,
        2: 90,
        3: 85,
        4: 80,
        5: 75,
        6: 70,
        7: 65,
        8: 60,
        9: 55,
        10: 50,
        11: 45,
        12: 40,
    },
    gray: {
        1: 5,
        2: 5,
        3: 6,
        4: 7,
        5: 8,
        6: 9,
        7: 10,
        8: 11,
        9: 12,
        10: 13,
        11: 14,
        12: 15,
    },
    background: {
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 6,
        6: 7,
        7: 8,
        8: 9,
        9: 10,
        10: 11,
        11: 12,
        12: 13,
    }
};

function generateColorScale(baseColor: ColorValue, mode: 'light' | 'dark', colorType: keyof ThemeColors): ColorScale {
    const scale: ColorScale = {};
    const lightnessValues = LIGHTNESS_MAP[mode];
    const saturationValues = SATURATION_MAP[colorType];

    for (let i = 1; i <= 12; i++) {
        const step = i as ScaleStep;
        scale[step] = {
            ...baseColor,
            l: lightnessValues[step],
            s: saturationValues[step]
        };
    }

    return scale;
}

function colorToHsl(color: ColorValue): string {
    return `hsl(${color.h}deg ${color.s}% ${color.l}% / ${color.a})`;
}

export function ColorSpectrum({ colors, mode }: ColorSpectrumProps) {
    const sections: Section[] = [
        {
            title: 'Backgrounds',
            description: 'App background, subtle background, hover states',
            scale: generateColorScale(colors.background, mode, 'background'),
            usage: {
                1: 'App background',
                2: 'Subtle background',
                3: 'UI element background',
                4: 'Hovered UI element background',
                5: 'Active / Selected UI element',
                6: 'Subtle borders and separators',
                7: 'UI element border and focus rings',
                8: 'Hovered UI element border',
                9: 'Solid backgrounds',
                10: 'Hovered solid backgrounds',
                11: 'Low-contrast text',
                12: 'High-contrast text'
            }
        },
        {
            title: 'Interactive Elements',
            description: 'Buttons, links, inputs, focus states',
            scale: generateColorScale(colors.accent, mode, 'accent'),
            usage: {
                1: 'Subtle background',
                2: 'Button background hover',
                3: 'Button background active',
                4: 'Selected background',
                5: 'Button border',
                6: 'Button border hover',
                7: 'Solid button background',
                8: 'Solid button hover',
                9: 'Solid button active',
                10: 'Text contrast',
                11: 'Focus ring',
                12: 'High contrast'
            }
        },
        {
            title: 'Text & Icons',
            description: 'Typography, icons, borders',
            scale: generateColorScale(colors.gray, mode, 'gray'),
            usage: {
                1: 'Subtle text background',
                2: 'Input background',
                3: 'Input hover background',
                4: 'Input border',
                5: 'Input border hover',
                6: 'Low-contrast text',
                7: 'Medium-contrast text',
                8: 'High-contrast text',
                9: 'Critical text',
                10: 'Critical text hover',
                11: 'Critical solid',
                12: 'Critical solid hover'
            }
        }
    ];

    return (
        <div className="color-spectrum grid gap-8">
            {sections.map(section => (
                <div key={section.title} className="spectrum-section">
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">{section.title}</h3>
                        <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                    <div className="grid gap-2">
                        {Object.entries(section.scale).map(([step, color]) => {
                            const scaleStep = Number(step) as ScaleStep;
                            return (
                                <div
                                    key={step}
                                    className="flex items-center gap-4"
                                >
                                    <div
                                        className="w-12 h-12 rounded-md flex items-center justify-center text-xs"
                                        style={{
                                            backgroundColor: colorToHsl(color),
                                            color: color.l < 50 ? 'white' : 'black'
                                        }}
                                    >
                                        {step}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Step {step}</div>
                                        <div className="text-xs text-gray-600">{section.usage[scaleStep]}</div>
                                    </div>
                                    <div className="text-xs font-mono text-gray-500">
                                        {colorToHsl(color)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
} 