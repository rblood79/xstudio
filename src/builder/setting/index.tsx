import './index.css';
import { Eye } from 'lucide-react';
import { useStore } from '../stores';
import { PropertySwitch } from '../inspector/components';

function Setting() {
    const showOverlay = useStore((state) => state.showOverlay);
    const setShowOverlay = useStore((state) => state.setShowOverlay);

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

                {/* 추가 설정 섹션들이 여기에 추가될 예정 */}
            </div>
        </div>
    );
}

export default Setting;