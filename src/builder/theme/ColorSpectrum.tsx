import { ColorValue } from '../../types/designTokens';

interface ThemeColors {
    accent: ColorValue;
    gray: ColorValue;
    background: ColorValue;
}

// 새로운 인터페이스 추가
interface ScaleColor {
    scale: number;
    value: ColorValue;
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

interface ColorSpectrumProps {
    colors: ThemeColors;
    mode: 'light' | 'dark';
    colorScales?: ThemeColorScales; // 새로운 prop 추가
}

type ScaleStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface ColorScaleMap {
    [key: number]: ColorValue;
}

interface ColorUsage {
    [key: number]: string;
}

interface Section {
    title: string;
    description: string;
    scale: ColorScaleMap;
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

function generateColorScale(baseColor: ColorValue, mode: 'light' | 'dark', colorType: keyof ThemeColors): ColorScaleMap {
    const scale: ColorScaleMap = {};
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

// colorScales에서 ColorScaleMap으로 변환하는 유틸리티 함수
function convertToColorScaleMap(colorScale: ColorScale | undefined, mode: 'light' | 'dark', colorType: keyof ThemeColors, baseColor: ColorValue): ColorScaleMap {
    // colorScale이 없거나 steps가 비어있으면 기존 방식으로 생성
    if (!colorScale || colorScale.steps.length === 0) {
        return generateColorScale(baseColor, mode, colorType);
    }

    const scaleMap: ColorScaleMap = {};

    // steps를 ColorScaleMap 형식으로 변환
    colorScale.steps.forEach(step => {
        if (step.scale >= 1 && step.scale <= 12) {
            scaleMap[step.scale] = step.value;
        }
    });

    // 빠진 스텝이 있으면 기본 생성 로직으로 채움
    const defaultScale = generateColorScale(baseColor, mode, colorType);
    for (let i = 1; i <= 12; i++) {
        const step = i as ScaleStep;
        if (!scaleMap[step]) {
            scaleMap[step] = defaultScale[step];
        }
    }

    return scaleMap;
}

function colorToHsl(color: ColorValue): string {
    return `hsl(${color.h}deg ${color.s}% ${color.l}% / ${color.a})`;
}

export function ColorSpectrum({ colors, mode, colorScales }: ColorSpectrumProps) {
    // 색상 스케일 생성 또는 변환
    const accentScale = convertToColorScaleMap(colorScales?.accent, mode, 'accent', colors.accent);
    const grayScale = convertToColorScaleMap(colorScales?.gray, mode, 'gray', colors.gray);
    const backgroundScale = convertToColorScaleMap(colorScales?.background, mode, 'background', colors.background);

    // 배경색-액센트 관계를 강조하는 CSS 변수 추가
    const relationshipStyle = {
        '--background-color': colorToHsl(colors.background),
        '--accent-color': colorToHsl(colors.accent),
        '--text-color': colorToHsl(colors.gray)
    };

    const sections: Section[] = [
        {
            title: 'Backgrounds',
            description: 'App background, subtle background, hover states',
            scale: backgroundScale,
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
            scale: accentScale,
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
            scale: grayScale,
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
        <div
            className="color-spectrum flex flex-col gap-8"
            style={relationshipStyle as React.CSSProperties}
        >
            {/* 배경색과 액센트 관계를 보여주는 미리보기 섹션 추가 */}
            <div className="relationship-preview p-6 rounded-lg" style={{
                backgroundColor: `var(--background-color)`,
                color: `var(--text-color)`,
                border: '1px solid #ddd'
            }}>
                <h4 className="mb-4 font-medium" style={{
                    color: mode === 'light' ? '#000' : '#fff'
                }}>
                    Color Relationship Preview
                </h4>
                <div className="flex gap-4">
                    <button className="px-4 py-2 rounded" style={{
                        backgroundColor: `var(--accent-color)`,
                        color: colors.accent.l < 50 ? 'white' : 'black'
                    }}>
                        Primary Button
                    </button>
                    <button className="px-4 py-2 rounded" style={{
                        backgroundColor: 'transparent',
                        border: `2px solid ${colorToHsl(colors.accent)}`,
                        color: `var(--accent-color)`
                    }}>
                        Secondary Button
                    </button>
                </div>
            </div>

            <div className="flex flex-row gap-16">
                {sections.map(section => (
                    <div key={section.title} className="spectrum-section flex-1">
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
                                            className="w-24 h-24 flex items-center justify-center text-xs"
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
        </div>
    );
}