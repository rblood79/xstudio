import './index.css';
import { Eye, Grid3x3, Magnet, Ruler } from 'lucide-react';
import { useStore } from '../stores';
import { PropertySwitch, PropertySelect } from '../inspector/components';

function Setting() {
    const showOverlay = useStore((state) => state.showOverlay);
    const setShowOverlay = useStore((state) => state.setShowOverlay);

    const showGrid = useStore((state) => state.showGrid);
    const setShowGrid = useStore((state) => state.setShowGrid);

    const snapToGrid = useStore((state) => state.snapToGrid);
    const setSnapToGrid = useStore((state) => state.setSnapToGrid);

    const gridSize = useStore((state) => state.gridSize);
    const setGridSize = useStore((state) => state.setGridSize);

    const gridSizeOptions = [
        { value: '8', label: '8px' },
        { value: '16', label: '16px' },
        { value: '24', label: '24px' },
    ];

    const handleGridSizeChange = (value: string) => {
        const size = parseInt(value) as 8 | 16 | 24;
        setGridSize(size);
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
            </div>
        </div>
    );
}

export default Setting;