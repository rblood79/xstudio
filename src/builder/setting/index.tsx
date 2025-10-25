import './index.css';
import { Eye, Grid3x3, Magnet, Ruler, Square, Tag, Percent, Palette, ZoomIn } from 'lucide-react';
import { useStore } from '../stores';
import { PropertySwitch, PropertySelect, PropertySlider } from '../inspector/components';

function Setting() {
    const showOverlay = useStore((state) => state.showOverlay);
    const setShowOverlay = useStore((state) => state.setShowOverlay);

    const showGrid = useStore((state) => state.showGrid);
    const setShowGrid = useStore((state) => state.setShowGrid);

    const snapToGrid = useStore((state) => state.snapToGrid);
    const setSnapToGrid = useStore((state) => state.setSnapToGrid);

    const gridSize = useStore((state) => state.gridSize);
    const setGridSize = useStore((state) => state.setGridSize);

    const showElementBorders = useStore((state) => state.showElementBorders);
    const setShowElementBorders = useStore((state) => state.setShowElementBorders);

    const showElementLabels = useStore((state) => state.showElementLabels);
    const setShowElementLabels = useStore((state) => state.setShowElementLabels);

    const overlayOpacity = useStore((state) => state.overlayOpacity);
    const setOverlayOpacity = useStore((state) => state.setOverlayOpacity);

    const themeMode = useStore((state) => state.themeMode);
    const setThemeMode = useStore((state) => state.setThemeMode);

    const uiScale = useStore((state) => state.uiScale);
    const setUiScale = useStore((state) => state.setUiScale);

    const themeModeOptions = [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'auto', label: 'Auto (System)' },
    ];

    const uiScaleOptions = [
        { value: '80', label: '80%' },
        { value: '100', label: '100%' },
        { value: '120', label: '120%' },
    ];

    const gridSizeOptions = [
        { value: '8', label: '8px' },
        { value: '16', label: '16px' },
        { value: '24', label: '24px' },
    ];

    const handleGridSizeChange = (value: string) => {
        const size = parseInt(value) as 8 | 16 | 24;
        setGridSize(size);
    };

    const handleThemeModeChange = (value: string) => {
        const mode = value as 'light' | 'dark' | 'auto';
        setThemeMode(mode);
    };

    const handleUiScaleChange = (value: string) => {
        const scale = parseInt(value) as 80 | 100 | 120;
        setUiScale(scale);
    };

    return (
        <div className="sidebar-content">
            <div className="settings-container">
                {/* Preview & Overlay Section */}
                <div className="settings-section">
                    <div className="section-header">
                        <div className="section-title">Preview & Overlay</div>
                    </div>
                    <div className="section-content">
                        <div className="component-props">
                            <PropertySwitch
                                label="Show Selection Overlay"
                                isSelected={showOverlay}
                                onChange={setShowOverlay}
                                icon={Eye}
                            />
                        </div>
                    </div>
                </div>

                {/* Grid & Guides Section */}
                <div className="settings-section">
                    <div className="section-header">
                        <div className="section-title">Grid & Guides</div>
                    </div>
                    <div className="section-content">
                        <div className="component-props">
                            <PropertySwitch
                                label="Show Grid"
                                isSelected={showGrid}
                                onChange={setShowGrid}
                                icon={Grid3x3}
                            />

                            <PropertySwitch
                                label="Snap to Grid"
                                isSelected={snapToGrid}
                                onChange={setSnapToGrid}
                                icon={Magnet}
                            />

                            <PropertySelect
                                label="Grid Size"
                                value={String(gridSize)}
                                onChange={handleGridSizeChange}
                                options={gridSizeOptions}
                                icon={Ruler}
                            />
                        </div>
                    </div>
                </div>

                {/* Element Visualization Section */}
                <div className="settings-section">
                    <div className="section-header">
                        <div className="section-title">Element Visualization</div>
                    </div>
                    <div className="section-content">
                        <div className="component-props">
                            <PropertySwitch
                                label="Show Element Borders"
                                isSelected={showElementBorders}
                                onChange={setShowElementBorders}
                                icon={Square}
                            />

                            <PropertySwitch
                                label="Show Element Labels"
                                isSelected={showElementLabels}
                                onChange={setShowElementLabels}
                                icon={Tag}
                            />

                            <PropertySlider
                                label="Overlay Opacity"
                                value={overlayOpacity}
                                onChange={setOverlayOpacity}
                                min={0}
                                max={100}
                                step={5}
                                icon={Percent}
                            />
                        </div>
                    </div>
                </div>

                {/* Theme Settings Section */}
                <div className="settings-section">
                    <div className="section-header">
                        <div className="section-title">Theme & Appearance</div>
                    </div>
                    <div className="section-content">
                        <div className="component-props">
                            <PropertySelect
                                label="Theme Mode"
                                value={themeMode}
                                onChange={handleThemeModeChange}
                                options={themeModeOptions}
                                icon={Palette}
                            />

                            <PropertySelect
                                label="UI Scale"
                                value={String(uiScale)}
                                onChange={handleUiScaleChange}
                                options={uiScaleOptions}
                                icon={ZoomIn}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Setting;