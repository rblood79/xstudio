
import { ColorValue } from '../../types/designTokens';

interface ColorPickerProps {
    label: string;
    value: ColorValue;
    onChange: (color: ColorValue) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
    const handleChange = (property: keyof ColorValue, newValue: number) => {
        onChange({
            ...value,
            [property]: newValue
        });
    };

    return (
        <div className="color-picker flex-1">
            <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">{label}</label>
                <div className="text-xs font-mono text-gray-500">
                    {`hsl(${value.h}deg ${value.s}% ${value.l}% / ${value.a})`}
                </div>
            </div>
            <div className="flex gap-4 items-start">
                <div className="relative">
                    <div
                        className="w-16 h-16 rounded-lg shadow-sm border border-gray-200"
                        style={{
                            backgroundColor: `hsl(${value.h}deg ${value.s}% ${value.l}% / ${value.a})`
                        }}
                    />
                    <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5" />
                </div>
                <div className="flex-1 grid gap-4">
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs text-gray-600">Hue</label>
                            <span className="text-xs text-gray-500">{value.h}°</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={value.h}
                            onChange={(e) => handleChange('h', Number(e.target.value))}
                            className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-red-500 rounded-full appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs text-gray-600">Saturation</label>
                            <span className="text-xs text-gray-500">{value.s}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={value.s}
                            onChange={(e) => handleChange('s', Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, 
                                    hsl(${value.h}deg 0% ${value.l}%), 
                                    hsl(${value.h}deg 100% ${value.l}%))`
                            }}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs text-gray-600">Lightness</label>
                            <span className="text-xs text-gray-500">{value.l}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={value.l}
                            onChange={(e) => handleChange('l', Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, 
                                    hsl(${value.h}deg ${value.s}% 0%), 
                                    hsl(${value.h}deg ${value.s}% 50%), 
                                    hsl(${value.h}deg ${value.s}% 100%))`
                            }}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs text-gray-600">Alpha</label>
                            <span className="text-xs text-gray-500">{(value.a * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={value.a}
                            onChange={(e) => handleChange('a', Number(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, 
                                    hsla(${value.h}deg ${value.s}% ${value.l}% / 0), 
                                    hsla(${value.h}deg ${value.s}% ${value.l}% / 1))`
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 