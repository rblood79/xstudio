import React from 'react';
import { LegacyThemeColors } from '../../types/theme';
import { ColorSpectrum } from './ColorSpectrum';

const defaultColors: LegacyThemeColors = {
    accent: { h: 220, s: 90, l: 50, a: 1 },
};

export default function ThemeEditor() {
    const [colors, setColors] = React.useState<LegacyThemeColors>(defaultColors);

    return (
        <div className="theme-editor p-6">
            <h2 className="text-2xl font-bold mb-8">Theme Editor</h2>
            <ColorSpectrum
                colors={colors}
                onChange={setColors}
            />
        </div>
    );
}