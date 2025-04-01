import React, { useCallback, useMemo } from 'react';

interface ColorValue {
    h: number; // hue (0-360)
    s: number; // saturation (0-100)
    l: number; // lightness (0-100)
    a: number; // alpha (0-1)
}

interface ColorPickerProps {
    value: ColorValue;
    onChange: (color: ColorValue) => void;
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
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

    return [
        Math.round(h),
        Math.round(s * 100),
        Math.round(l * 100)
    ];
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
    const updateSingleValue = useCallback((key: keyof ColorValue, newValue: number) => {
        onChange({
            ...value,
            [key]: newValue
        });
    }, [onChange, value]);

    // Memoize color conversions
    const [r, g, b] = useMemo(() => hslToRgb(value.h, value.s, value.l), [value.h, value.s, value.l]);
    const hex = useMemo(() => '#' + [r, g, b]
        .map(x => x.toString(16).padStart(2, '0'))
        .join(''), [r, g, b]);

    const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        if (hex.length === 7) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const [h, s, l] = rgbToHsl(r, g, b);
            onChange({ h, s, l, a: value.a });
        }
    }, [onChange, value.a]);

    const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateSingleValue('h', Number(e.target.value));
    }, [updateSingleValue]);

    const handleSaturationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateSingleValue('s', Number(e.target.value));
    }, [updateSingleValue]);

    const handleLightnessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateSingleValue('l', Number(e.target.value));
    }, [updateSingleValue]);

    const handleAlphaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateSingleValue('a', Number(e.target.value) / 100);
    }, [updateSingleValue]);

    const colorStyle = useMemo(() => ({
        backgroundColor: `hsl(${value.h}deg ${value.s}% ${value.l}% / ${value.a})`
    }), [value.h, value.s, value.l, value.a]);

    const inputRanges = useMemo(() => [
        { label: 'Hue', key: 'h', min: 0, max: 360, value: value.h, onChange: handleHueChange, suffix: '°' },
        { label: 'Saturation', key: 's', min: 0, max: 100, value: value.s, onChange: handleSaturationChange, suffix: '%' },
        { label: 'Lightness', key: 'l', min: 0, max: 100, value: value.l, onChange: handleLightnessChange, suffix: '%' },
        { label: 'Alpha', key: 'a', min: 0, max: 100, value: value.a * 100, onChange: handleAlphaChange, suffix: '%' }
    ], [value.h, value.s, value.l, value.a, handleHueChange, handleSaturationChange, handleLightnessChange, handleAlphaChange]);

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded border"
                    style={colorStyle}
                />
                <input
                    type="color"
                    value={hex}
                    onChange={handleHexChange}
                    className="w-24"
                />
            </div>
            <div className="grid gap-2">
                {inputRanges.map(({ label, key, min, max, value: inputValue, onChange, suffix }) => (
                    <label key={key} className="flex items-center justify-between">
                        <span>{label}</span>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            value={inputValue}
                            onChange={onChange}
                            className="w-48"
                        />
                        <span>{Math.round(inputValue)}{suffix}</span>
                    </label>
                ))}
            </div>
        </div>
    );
} 