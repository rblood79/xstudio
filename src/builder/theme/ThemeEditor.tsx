import React from 'react';
import { TailwindColorName } from '../../types/theme';
import { ColorSpectrum } from './ColorSpectrum';

export default function ThemeEditor() {
    const [selectedColor, setSelectedColor] = React.useState<TailwindColorName | 'custom'>('blue');
    const [customColor, setCustomColor] = React.useState('#3B82F6');

    return (
        <div className="theme-editor p-6">
            <h2 className="text-2xl font-bold mb-8">Theme Editor</h2>
            <ColorSpectrum
                selectedColor={selectedColor}
                onChange={setSelectedColor}
                customColor={customColor}
                onCustomColorChange={setCustomColor}
            />
        </div>
    );
}